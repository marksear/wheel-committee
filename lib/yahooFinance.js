import YahooFinance from 'yahoo-finance2'

const yf = new YahooFinance({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    dir: () => {},
  },
  suppressNotices: ['yahooSurvey'],
})

/**
 * Calculate calendar-day DTE from an expiration date.
 * Strips the time component so the result is stable regardless
 * of what hour the server processes the request.
 */
function calendarDTE(expirationDate) {
  const exp = new Date(expirationDate)
  const now = new Date()
  const expDay = Date.UTC(exp.getFullYear(), exp.getMonth(), exp.getDate())
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((expDay - today) / (1000 * 60 * 60 * 24)))
}

/**
 * Fetch current price, IV, and basic stock info for a ticker.
 * Returns null fields gracefully on failure.
 */
export async function getStockData(ticker) {
  try {
    const quote = await yf.quote(ticker)
    return {
      ticker: quote.symbol,
      name: quote.longName || quote.shortName || ticker,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      fiftyDayAverage: quote.fiftyDayAverage,
      twoHundredDayAverage: quote.twoHundredDayAverage,
      dividendYield: quote.dividendYield,
      trailingPE: quote.trailingPE,
      forwardPE: quote.forwardPE,
      beta: quote.beta,
      bid: quote.bid,
      ask: quote.ask,
      error: null,
    }
  } catch (error) {
    console.error(`Failed to fetch stock data for ${ticker}:`, error.message)
    return {
      ticker,
      name: null,
      price: null,
      error: error.message,
    }
  }
}

/**
 * Fetch the full options chain for a ticker.
 * Returns all available expirations with calls/puts including
 * strike, premium, bid/ask, delta (estimated via IV), DTE, OI, and IV.
 */
export async function getOptionsChain(ticker) {
  try {
    const data = await yf.options(ticker)
    const currentPrice = data.quote?.regularMarketPrice

    const expirations = data.expirationDates || []
    const chains = []

    // Process the default expiration returned
    if (data.options && data.options.length > 0) {
      for (const opt of data.options) {
        const expDate = opt.expirationDate
        const dte = calendarDTE(expDate)

        chains.push({
          expirationDate: expDate,
          dte,
          calls: (opt.calls || []).map(c => formatContract(c, currentPrice, dte)),
          puts: (opt.puts || []).map(p => formatContract(p, currentPrice, dte)),
        })
      }
    }

    // Fetch 1 additional expiration beyond the default (2 total per ticker)
    // This covers the nearest + next expiry, sufficient for 1-14 DTE targets
    const fetchedDate = chains.length > 0 ? chains[0].expirationDate : null
    const additionalDates = expirations
      .filter(d => {
        if (!fetchedDate) return true
        return new Date(d).getTime() !== new Date(fetchedDate).getTime()
      })
      .slice(0, 1)

    for (const expDate of additionalDates) {
      try {
        const expData = await yf.options(ticker, { date: expDate })
        if (expData.options && expData.options.length > 0) {
          const opt = expData.options[0]
          const dte = calendarDTE(opt.expirationDate)
          chains.push({
            expirationDate: opt.expirationDate,
            dte,
            calls: (opt.calls || []).map(c => formatContract(c, currentPrice, dte)),
            puts: (opt.puts || []).map(p => formatContract(p, currentPrice, dte)),
          })
        }
      } catch {
        // Skip expirations that fail
      }
    }

    // Sort by DTE
    chains.sort((a, b) => a.dte - b.dte)

    return {
      ticker,
      currentPrice,
      expirationDates: expirations,
      totalExpirations: expirations.length,
      chains,
      error: null,
    }
  } catch (error) {
    console.error(`Failed to fetch options chain for ${ticker}:`, error.message)
    return {
      ticker,
      currentPrice: null,
      expirationDates: [],
      totalExpirations: 0,
      chains: [],
      error: error.message,
    }
  }
}

function formatContract(contract, currentPrice, dte) {
  const bid = contract.bid ?? 0
  const ask = contract.ask ?? 0
  const hasBidAsk = bid > 0 && ask > 0

  // Use MID = (bid+ask)/2 when both sides are live.
  // Fall back to lastPrice when bid/ask are 0 (market closed, illiquid).
  let mid = null
  let midSource = null
  if (hasBidAsk) {
    mid = +((bid + ask) / 2).toFixed(2)
    midSource = 'mid'
  } else if (contract.lastPrice != null && contract.lastPrice > 0) {
    mid = +contract.lastPrice.toFixed(2)
    midSource = 'last'
  }

  return {
    contractSymbol: contract.contractSymbol,
    strike: contract.strike,
    lastPrice: contract.lastPrice,
    bid: bid || null,
    ask: ask || null,
    mid,
    midSource,
    change: contract.change,
    volume: contract.volume ?? 0,
    openInterest: contract.openInterest ?? 0,
    impliedVolatility: contract.impliedVolatility != null
      ? +(contract.impliedVolatility * 100).toFixed(2)
      : null,
    inTheMoney: contract.inTheMoney,
  }
}

/**
 * Calculate IV Rank and IV Percentile for a ticker.
 * IV Rank = (Current IV - 52wk Low IV) / (52wk High IV - 52wk Low IV)
 * IV Percentile = % of trading days where IV was lower than current
 *
 * Uses ATM implied volatility from the nearest expiration options chain
 * and estimates historical IV from realized volatility of daily returns.
 */
export async function getIVRank(ticker) {
  try {
    // 1. Get current ATM IV from options chain
    const optionsData = await yf.options(ticker)
    const currentPrice = optionsData.quote?.regularMarketPrice
    if (!currentPrice || !optionsData.options?.length) {
      return { ticker, currentIV: null, ivRank: null, ivPercentile: null, error: 'No options data' }
    }

    // Find ATM options (closest strike to current price) from nearest expiration
    const nearestChain = optionsData.options[0]
    const allContracts = [...(nearestChain.calls || []), ...(nearestChain.puts || [])]
    const atmContracts = allContracts
      .filter(c => c.impliedVolatility != null && c.impliedVolatility > 0)
      .sort((a, b) => Math.abs(a.strike - currentPrice) - Math.abs(b.strike - currentPrice))
      .slice(0, 4) // Closest 4 contracts to ATM

    if (atmContracts.length === 0) {
      return { ticker, currentIV: null, ivRank: null, ivPercentile: null, error: 'No IV data' }
    }

    const currentIV = +(
      (atmContracts.reduce((sum, c) => sum + c.impliedVolatility, 0) / atmContracts.length) * 100
    ).toFixed(1)

    // 2. Get 52 weeks of historical daily prices to compute rolling realized volatility
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const history = await yf.chart(ticker, {
      period1: oneYearAgo,
      interval: '1d',
    })

    const quotes = history?.quotes || []
    if (quotes.length < 30) {
      // Not enough data — return current IV only
      return { ticker, currentIV, ivRank: null, ivPercentile: null, error: 'Insufficient history' }
    }

    // 3. Compute rolling 21-day realized volatility (annualized) for each trading day
    const rollingWindow = 21
    const dailyIVs = []
    for (let i = rollingWindow; i < quotes.length; i++) {
      const window = quotes.slice(i - rollingWindow, i)
      const returns = []
      for (let j = 1; j < window.length; j++) {
        if (window[j].close && window[j - 1].close && window[j - 1].close > 0) {
          returns.push(Math.log(window[j].close / window[j - 1].close))
        }
      }
      if (returns.length > 5) {
        const mean = returns.reduce((s, r) => s + r, 0) / returns.length
        const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1)
        const annualizedVol = Math.sqrt(variance * 252) * 100
        dailyIVs.push(annualizedVol)
      }
    }

    if (dailyIVs.length === 0) {
      return { ticker, currentIV, ivRank: null, ivPercentile: null, error: 'Could not compute HV' }
    }

    // 4. Calculate IV Rank and IV Percentile
    const minIV = Math.min(...dailyIVs)
    const maxIV = Math.max(...dailyIVs)
    const ivRank = maxIV > minIV
      ? +((currentIV - minIV) / (maxIV - minIV) * 100).toFixed(0)
      : 50
    const ivPercentile = +(
      (dailyIVs.filter(iv => iv < currentIV).length / dailyIVs.length) * 100
    ).toFixed(0)

    return {
      ticker,
      currentIV,
      ivRank: Math.max(0, Math.min(100, ivRank)),
      ivPercentile: Math.max(0, Math.min(100, ivPercentile)),
      iv52wkHigh: +Math.max(...dailyIVs).toFixed(1),
      iv52wkLow: +Math.min(...dailyIVs).toFixed(1),
      error: null,
    }
  } catch (error) {
    console.error(`Failed to fetch IV rank for ${ticker}:`, error.message)
    return { ticker, currentIV: null, ivRank: null, ivPercentile: null, error: error.message }
  }
}

/**
 * Fetch IV rank for multiple tickers in parallel.
 */
export async function fetchIVRanks(tickers) {
  const results = {}
  await Promise.all(
    tickers.map(async (ticker) => {
      results[ticker] = await getIVRank(ticker)
    })
  )
  return results
}

/**
 * Fetch just stock quotes for multiple tickers (lightweight, no options).
 */
export async function fetchQuotes(tickers) {
  const results = {}
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const quote = await yf.quote(ticker)
        results[ticker] = {
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          error: null,
        }
      } catch (err) {
        results[ticker] = { price: null, error: err.message }
      }
    })
  )
  return results
}

/**
 * Fetch stock data + options chain for multiple tickers in parallel.
 * Returns a map of ticker -> { stock, options } with graceful fallbacks.
 */
export async function fetchAllMarketData(tickers) {
  const results = {}

  await Promise.all(
    tickers.map(async (ticker) => {
      const [stock, options] = await Promise.all([
        getStockData(ticker),
        getOptionsChain(ticker),
      ])
      results[ticker] = { stock, options }
    })
  )

  return results
}

/**
 * Format market data into a text block for injection into a Claude prompt.
 */
export function formatMarketDataForPrompt(marketData) {
  const sections = []

  for (const [ticker, data] of Object.entries(marketData)) {
    const { stock, options } = data

    if (stock.error && options.error) {
      sections.push(`### ${ticker} — DATA UNAVAILABLE\nFailed to fetch live data: ${stock.error}. Use your best estimates.\n`)
      continue
    }

    let section = `### ${ticker}`
    if (stock.name) section += ` — ${stock.name}`
    section += '\n'

    // Stock info
    if (stock.price != null) {
      section += `**Current Price:** $${stock.price}`
      if (stock.change != null) {
        section += ` (${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}, ${stock.changePercent?.toFixed(2) ?? '?'}%)`
      }
      section += '\n'
    }
    if (stock.fiftyTwoWeekHigh != null) {
      section += `**52-Week Range:** $${stock.fiftyTwoWeekLow} — $${stock.fiftyTwoWeekHigh}\n`
    }
    if (stock.fiftyDayAverage != null) {
      section += `**50-Day Avg:** $${stock.fiftyDayAverage.toFixed(2)} | **200-Day Avg:** $${stock.twoHundredDayAverage?.toFixed(2) ?? 'N/A'}\n`
    }
    if (stock.dividendYield != null) {
      section += `**Dividend Yield:** ${(stock.dividendYield * 100).toFixed(2)}%\n`
    }
    if (stock.marketCap != null) {
      section += `**Market Cap:** $${(stock.marketCap / 1e9).toFixed(1)}B\n`
    }
    if (stock.beta != null) {
      section += `**Beta:** ${stock.beta.toFixed(2)}\n`
    }
    if (stock.trailingPE != null) {
      section += `**P/E (TTM):** ${stock.trailingPE.toFixed(1)} | **Forward P/E:** ${stock.forwardPE?.toFixed(1) ?? 'N/A'}\n`
    }

    // Options chain
    if (options.chains && options.chains.length > 0) {
      section += `\n**Options Chain** (${options.totalExpirations} expirations available):\n`

      // Detect if most contracts have no live bid/ask (market closed)
      const allPuts = options.chains.flatMap(c => c.puts)
      const allCalls = options.chains.flatMap(c => c.calls)
      const allContracts = [...allPuts, ...allCalls].filter(c => c.mid != null)
      const lastPriceCount = allContracts.filter(c => c.midSource === 'last').length
      const usingLastPrices = allContracts.length > 0 && lastPriceCount / allContracts.length > 0.5

      if (usingLastPrices) {
        section += `\n⚠️ **Market appears closed — bid/ask unavailable. Showing last-traded prices as premium estimates. These are approximate — verify during market hours.**\n`
      }

      for (const chain of options.chains) {
        const expLabel = new Date(chain.expirationDate).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        })
        section += `\n**Expiry: ${expLabel} (${chain.dte} DTE)**\n`

        // Show OTM puts for Wheel strategy (strikes at or below current price)
        // Sorted by strike desc so closest-to-ATM appears first
        // Require mid > 0 (has either live bid/ask or a lastPrice)
        const relevantPuts = chain.puts
          .filter(p => p.mid != null && p.mid > 0)
          .filter(p => p.openInterest > 0 || p.volume > 0 || p.midSource === 'last')
          .filter(p => stock.price != null ? p.strike <= stock.price * 1.02 && p.strike >= stock.price * 0.85 : true)
          .sort((a, b) => b.strike - a.strike)
          .slice(0, 10)

        if (relevantPuts.length > 0) {
          const midLabel = usingLastPrices ? '**Last**' : '**Mid**'
          section += `OTM PUTS (for cash-secured puts) — USE the ${midLabel} column as the premium:\n`
          section += `| Strike | Bid | Ask | ${midLabel} | IV% | OI | Vol |\n`
          section += `|--------|-----|-----|---------|-----|-----|-----|\n`
          for (const p of relevantPuts) {
            section += `| $${p.strike} | $${p.bid ?? '—'} | $${p.ask ?? '—'} | **$${p.mid ?? '—'}** | ${p.impliedVolatility ?? '—'}% | ${p.openInterest} | ${p.volume} |\n`
          }
        }

        // Show OTM calls for covered call strategy (strikes at or above current price)
        // Sorted by strike asc so closest-to-ATM appears first
        const relevantCalls = chain.calls
          .filter(c => c.mid != null && c.mid > 0)
          .filter(c => c.openInterest > 0 || c.volume > 0 || c.midSource === 'last')
          .filter(c => stock.price != null ? c.strike >= stock.price * 0.98 && c.strike <= stock.price * 1.15 : true)
          .sort((a, b) => a.strike - b.strike)
          .slice(0, 10)

        if (relevantCalls.length > 0) {
          const midLabel = usingLastPrices ? '**Last**' : '**Mid**'
          section += `OTM CALLS (for covered calls) — USE the ${midLabel} column as the premium:\n`
          section += `| Strike | Bid | Ask | ${midLabel} | IV% | OI | Vol |\n`
          section += `|--------|-----|-----|---------|-----|-----|-----|\n`
          for (const c of relevantCalls) {
            section += `| $${c.strike} | $${c.bid ?? '—'} | $${c.ask ?? '—'} | **$${c.mid ?? '—'}** | ${c.impliedVolatility ?? '—'}% | ${c.openInterest} | ${c.volume} |\n`
          }
        }
      }
    } else if (options.error) {
      section += `\n**Options Chain:** Unavailable (${options.error})\n`
    }

    sections.push(section)
  }

  return sections.join('\n---\n\n')
}

/**
 * Format market data specifically for PMCC analysis.
 * Shows deep ITM calls (for LEAPS) and OTM calls (for short leg).
 */
export function formatMarketDataForPmccPrompt(marketData) {
  const sections = []

  for (const [ticker, data] of Object.entries(marketData)) {
    const { stock, options } = data

    if (stock.error && options.error) {
      sections.push(`### ${ticker} — DATA UNAVAILABLE\nFailed to fetch live data: ${stock.error}. Use your best estimates.\n`)
      continue
    }

    let section = `### ${ticker}`
    if (stock.name) section += ` — ${stock.name}`
    section += '\n'

    if (stock.price != null) {
      section += `**Current Price:** $${stock.price}\n`
    }
    if (stock.fiftyTwoWeekHigh != null) {
      section += `**52-Week Range:** $${stock.fiftyTwoWeekLow} — $${stock.fiftyTwoWeekHigh}\n`
    }
    if (stock.dividendYield != null) {
      section += `**Dividend Yield:** ${(stock.dividendYield * 100).toFixed(2)}%\n`
    }
    if (stock.marketCap != null) {
      section += `**Market Cap:** $${(stock.marketCap / 1e9).toFixed(1)}B\n`
    }
    section += `**Cost of 100 Shares:** $${stock.price != null ? (stock.price * 100).toLocaleString() : 'N/A'}\n`

    if (options.chains && options.chains.length > 0) {
      // LEAPS: show long-dated deep ITM calls (DTE > 300)
      const leapsChains = options.chains.filter(c => c.dte > 300)
      if (leapsChains.length > 0) {
        section += `\n**LEAPS Calls (DTE > 300) — For Long Leg:**\n`
        for (const chain of leapsChains) {
          const expLabel = new Date(chain.expirationDate).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
          })
          section += `\nExpiry: ${expLabel} (${chain.dte} DTE)\n`

          // Deep ITM calls — strikes well below current price
          const deepItmCalls = chain.calls
            .filter(c => c.inTheMoney && stock.price != null && c.strike <= stock.price * 0.90)
            .sort((a, b) => b.strike - a.strike)
            .slice(0, 10)

          if (deepItmCalls.length > 0) {
            section += `| Strike | Bid | Ask | **Mid** | IV% | OI |\n`
            section += `|--------|-----|-----|---------|-----|-----|\n`
            for (const c of deepItmCalls) {
              section += `| $${c.strike} | $${c.bid ?? '—'} | $${c.ask ?? '—'} | **$${c.mid ?? '—'}** | ${c.impliedVolatility ?? '—'}% | ${c.openInterest} |\n`
            }
          } else {
            section += `(No deep ITM calls found for this expiry)\n`
          }
        }
      } else {
        section += `\n**LEAPS:** No expirations with DTE > 300 found in the fetched data. Use estimates based on typical LEAPS pricing.\n`
      }

      // Short calls: show near-term OTM calls (DTE 20-60)
      const shortTermChains = options.chains.filter(c => c.dte >= 20 && c.dte <= 60)
      if (shortTermChains.length > 0) {
        section += `\n**Short-Term Calls (20-60 DTE) — For Short Leg:**\n`
        for (const chain of shortTermChains) {
          const expLabel = new Date(chain.expirationDate).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
          })
          section += `\nExpiry: ${expLabel} (${chain.dte} DTE)\n`

          const otmCalls = chain.calls
            .filter(c => !c.inTheMoney && (c.openInterest > 0 || c.volume > 0))
            .sort((a, b) => a.strike - b.strike)
            .slice(0, 10)

          if (otmCalls.length > 0) {
            section += `| Strike | Bid | Ask | **Mid** | IV% | OI | Vol |\n`
            section += `|--------|-----|-----|---------|-----|-----|-----|\n`
            for (const c of otmCalls) {
              section += `| $${c.strike} | $${c.bid ?? '—'} | $${c.ask ?? '—'} | **$${c.mid ?? '—'}** | ${c.impliedVolatility ?? '—'}% | ${c.openInterest} | ${c.volume} |\n`
            }
          }
        }
      }
    } else if (options.error) {
      section += `\n**Options Chain:** Unavailable (${options.error}). Use estimates.\n`
    }

    sections.push(section)
  }

  return sections.join('\n---\n\n')
}

/**
 * Format market data specifically for Spreads analysis.
 * Shows near-money OTM puts (for bull put spreads), near-money OTM calls (for bear call spreads),
 * and both together (for iron condors) at 20-60 DTE.
 */
export function formatMarketDataForSpreadsPrompt(marketData) {
  const sections = []

  for (const [ticker, data] of Object.entries(marketData)) {
    const { stock, options } = data

    if (stock.error && options.error) {
      sections.push(`### ${ticker} — DATA UNAVAILABLE\nFailed to fetch live data: ${stock.error}. Use your best estimates.\n`)
      continue
    }

    let section = `### ${ticker}`
    if (stock.name) section += ` — ${stock.name}`
    section += '\n'

    if (stock.price != null) {
      section += `**Current Price:** $${stock.price}`
      if (stock.change != null) {
        section += ` (${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}, ${stock.changePercent?.toFixed(2) ?? '?'}%)`
      }
      section += '\n'
    }
    if (stock.fiftyTwoWeekHigh != null) {
      section += `**52-Week Range:** $${stock.fiftyTwoWeekLow} — $${stock.fiftyTwoWeekHigh}\n`
    }
    if (stock.fiftyDayAverage != null) {
      section += `**50-Day Avg:** $${stock.fiftyDayAverage.toFixed(2)} | **200-Day Avg:** $${stock.twoHundredDayAverage?.toFixed(2) ?? 'N/A'}\n`
    }
    if (stock.beta != null) {
      section += `**Beta:** ${stock.beta.toFixed(2)}\n`
    }
    if (stock.marketCap != null) {
      section += `**Market Cap:** $${(stock.marketCap / 1e9).toFixed(1)}B\n`
    }

    if (options.chains && options.chains.length > 0) {
      // Focus on 20-60 DTE chains for credit spreads
      const spreadChains = options.chains.filter(c => c.dte >= 20 && c.dte <= 60)
      if (spreadChains.length > 0) {
        section += `\n**Options Chains (20-60 DTE) — For Credit Spreads:**\n`
        for (const chain of spreadChains) {
          const expLabel = new Date(chain.expirationDate).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
          })
          section += `\n**Expiry: ${expLabel} (${chain.dte} DTE)**\n`

          // OTM Puts — for Bull Put Spreads (below current price)
          const otmPuts = chain.puts
            .filter(p => !p.inTheMoney && (p.openInterest > 0 || p.volume > 0))
            .filter(p => stock.price != null ? p.strike >= stock.price * 0.85 : true)
            .sort((a, b) => b.strike - a.strike)
            .slice(0, 10)

          if (otmPuts.length > 0) {
            section += `\nPUTS (OTM — for Bull Put Spreads) — USE the **Mid** column as the premium:\n`
            section += `| Strike | Bid | Ask | **Mid** | IV% | OI | Vol |\n`
            section += `|--------|-----|-----|---------|-----|-----|-----|\n`
            for (const p of otmPuts) {
              section += `| $${p.strike} | $${p.bid ?? '—'} | $${p.ask ?? '—'} | **$${p.mid ?? '—'}** | ${p.impliedVolatility ?? '—'}% | ${p.openInterest} | ${p.volume} |\n`
            }
          }

          // OTM Calls — for Bear Call Spreads (above current price)
          const otmCalls = chain.calls
            .filter(c => !c.inTheMoney && (c.openInterest > 0 || c.volume > 0))
            .filter(c => stock.price != null ? c.strike <= stock.price * 1.15 : true)
            .sort((a, b) => a.strike - b.strike)
            .slice(0, 10)

          if (otmCalls.length > 0) {
            section += `\nCALLS (OTM — for Bear Call Spreads) — USE the **Mid** column as the premium:\n`
            section += `| Strike | Bid | Ask | **Mid** | IV% | OI | Vol |\n`
            section += `|--------|-----|-----|---------|-----|-----|-----|\n`
            for (const c of otmCalls) {
              section += `| $${c.strike} | $${c.bid ?? '—'} | $${c.ask ?? '—'} | **$${c.mid ?? '—'}** | ${c.impliedVolatility ?? '—'}% | ${c.openInterest} | ${c.volume} |\n`
            }
          }
        }
      } else {
        section += `\n**Options Chains:** No expirations in the 20-60 DTE window found. Available DTEs: ${options.chains.map(c => c.dte).join(', ')}. Use closest available.\n`
      }
    } else if (options.error) {
      section += `\n**Options Chain:** Unavailable (${options.error}). Use estimates.\n`
    }

    sections.push(section)
  }

  return sections.join('\n---\n\n')
}
