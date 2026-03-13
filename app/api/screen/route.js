import { NextResponse } from 'next/server'
import yf from 'yahoo-finance2'
import { readFileSync } from 'fs'
import { join } from 'path'

const INDEX_FILES = {
  sp500: 'sp500.json',
  nasdaq100: 'nasdaq100.json',
  russell2000: 'russell2000.json',
}

function loadIndex(index) {
  const filePath = join(process.cwd(), 'lib', 'indices', INDEX_FILES[index])
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

const BATCH_SIZE = 50

export async function POST(request) {
  try {
    const { index, filters } = await request.json()

    if (!INDEX_FILES[index]) {
      return NextResponse.json({ error: 'Invalid index' }, { status: 400 })
    }

    const tickers = loadIndex(index)
    const {
      priceMin = 0,
      priceMax = 999999,
      volumeMin = 0,
      ivMin = 0,
      ivMax = 999,
      perfMin = -999,
    } = filters || {}

    // Batch fetch quotes
    const results = []
    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      const batch = tickers.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(
        batch.map(async (ticker) => {
          try {
            const quote = await yf.quote(ticker)
            const price = quote.regularMarketPrice
            const volume = quote.regularMarketVolume
            const name = quote.shortName || quote.longName || ticker

            // Calculate approximate 90-day performance using 50-day and current price
            // Yahoo doesn't give exact 90-day, but we can use regularMarketPrice vs fiftyDayAverage as proxy
            // For a better approximation, we use the quote's built-in fields
            let perf90d = null
            if (quote.fiftyDayAverage && price) {
              // Rough approximation - not exact 90 days but useful for filtering
              perf90d = ((price - quote.fiftyDayAverage) / quote.fiftyDayAverage) * 100
            }

            // Get implied volatility from options if available
            let iv = null
            try {
              const optData = await yf.options(ticker)
              if (optData.options?.[0]?.puts?.length > 0) {
                // Use ATM put IV as representative IV
                const puts = optData.options[0].puts
                const atm = puts.reduce((closest, p) =>
                  Math.abs(p.strike - price) < Math.abs(closest.strike - price) ? p : closest
                )
                iv = atm.impliedVolatility ? (atm.impliedVolatility * 100) : null
              }
            } catch {
              // Options data unavailable — stock not optionable
              iv = null
            }

            return {
              ticker,
              name,
              price,
              volume,
              iv,
              perf90d: perf90d !== null ? Math.round(perf90d * 100) / 100 : null,
              marketCap: quote.marketCap,
            }
          } catch {
            return null
          }
        })
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          const stock = result.value

          // Apply filters
          if (stock.price == null) continue
          if (stock.price < priceMin || stock.price > priceMax) continue
          if (stock.volume != null && stock.volume < volumeMin) continue
          if (filters?.ivMin != null && (stock.iv == null || stock.iv < ivMin)) continue
          if (filters?.ivMax != null && stock.iv != null && stock.iv > ivMax) continue
          if (filters?.perfMin != null && (stock.perf90d == null || stock.perf90d < perfMin)) continue

          results.push(stock)
        }
      }
    }

    // Sort by volume descending (most liquid first)
    results.sort((a, b) => (b.volume || 0) - (a.volume || 0))

    return NextResponse.json({
      total: tickers.length,
      filtered: results.length,
      stocks: results,
    })
  } catch (error) {
    console.error('Screen error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
