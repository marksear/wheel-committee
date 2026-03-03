import Anthropic from '@anthropic-ai/sdk'
import { fetchAllMarketData, formatMarketDataForPrompt } from '@/lib/yahooFinance'

// Allow up to 5 minutes for the full analysis (market data + Claude generation)
export const maxDuration = 300

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  const { formData } = await request.json()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        // Extract tickers from watchlist
        const tickers = formData.watchlist
          ? formData.watchlist.split('\n').map(t => t.trim().toUpperCase()).filter(t => t.length >= 1 && t.length <= 5 && /^[A-Z]+$/.test(t))
          : []

        send({ type: 'step', index: 0 }) // Scanning watchlist

        // Fetch live market data for all tickers in parallel
        let marketData = {}
        let marketDataText = ''
        if (tickers.length > 0) {
          send({ type: 'step', index: 1 }) // Fetching live prices
          try {
            marketData = await fetchAllMarketData(tickers)
            marketDataText = formatMarketDataForPrompt(marketData)
          } catch (err) {
            console.error('Market data fetch failed, continuing without live data:', err.message)
            marketDataText = '**Live market data unavailable.** Use your best estimates based on recent knowledge.\n'
          }
        }

        send({ type: 'step', index: 2 }) // Loading options chains

        // Build the full Wheel Committee prompt with live data
        const prompt = buildFullPrompt(formData, marketDataText)

        send({ type: 'step', index: 3 }) // Screening IV Rank

        // Stream Claude API response to keep connection alive
        let responseText = ''
        let tokenCount = 0

        const claudeStream = client.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })

        // Step indices: 4=Selecting strikes, 5=Calculating premiums, 6=Running ACT, 7=Ranking, 8=Generating
        const tokenSteps = [
          { tokens: 500, index: 4 },   // Selecting optimal strikes
          { tokens: 2000, index: 5 },   // Calculating premiums
          { tokens: 4000, index: 6 },   // Running Assignment Comfort Test
          { tokens: 7000, index: 7 },   // Ranking opportunities
          { tokens: 10000, index: 8 },  // Generating recommendations
        ]
        let nextStepIdx = 0

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            responseText += event.delta.text
            tokenCount += event.delta.text.length / 4 // rough token estimate

            // Advance progress steps based on token count
            while (nextStepIdx < tokenSteps.length && tokenCount >= tokenSteps[nextStepIdx].tokens) {
              send({ type: 'step', index: tokenSteps[nextStepIdx].index })
              nextStepIdx++
            }
          }
        }

        // Parse the response - pass formData for watchlist extraction
        const result = parseResponse(responseText, formData)

        send({ type: 'result', data: result })
        controller.close()

      } catch (error) {
        console.error('Analysis error:', error)
        send({ type: 'error', message: error.message || 'Analysis failed' })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

function buildFullPrompt(formData, marketDataText = '') {
  const hasWatchlist = formData.watchlist && formData.watchlist.trim().length > 0
  const hasPositions = formData.currentPositions && formData.currentPositions.trim().length > 0

  return `# The Wheel Committee — Options Income Scanner
## Analyze watchlist stocks for cash-secured put and covered call opportunities.

**Education-only. Not regulated advice. Options involve substantial risk. US markets only. User makes all final decisions.**

---

# WHEEL SCORE™ — Scoring Weights (1-10 scale, weighted average)

| Factor | Weight | Top Score (9-10) | Poor Score (1-2) |
|--------|--------|------------------|------------------|
| **Options Liquidity** | 20% | Bid-ask <$0.05, OI >5000 | Bid-ask >$0.50, OI <100 |
| **IV Rank** | 15% | 50-80% (elevated premium) | <10% (too low) |
| **Stock Quality** | 20% | Blue chip, profitable, moat | Speculative, unprofitable |
| **Price Range** | 15% | $30-$100 sweet spot | >$300 or <$10 |
| **Dividend Yield** | 10% | 2-4% sustainable | 0% or >8% |
| **Earnings Predictability** | 10% | Beats/meets 8/8 quarters | Highly unpredictable |
| **Sector Stability** | 10% | Staples, Utilities, Healthcare | Meme stocks, SPACs |

**Score interpretation:** 8.5-10 = ⭐⭐⭐⭐⭐ Excellent | 7.0-8.4 = ⭐⭐⭐⭐ Very Good | 5.5-6.9 = ⭐⭐⭐ Acceptable | 4.0-5.4 = ⭐⭐ Below Average | <4.0 = ⭐ Poor

---

# KEY RULES

**Strike selection:** Default 0.16-0.20 delta (80-84% probability OTM). Use live chain data to pick the best OTM strike.

**DTE preference:** Prefer 0-7 DTE for stocks with Mon/Wed/Fri expirations (maximum theta decay). Use 21-30 DTE for stocks with monthly-only options.

**Daily return target:** ≥0.30%/day. Formula: breakeven = strike - premium, then dailyReturn = (premium / breakeven) / DTE × 100. Skip trades below 0.20%/day.

**Earnings rule:** Do NOT open positions if earnings <21 days away. Flag the earnings date and risk level.

**Position sizing (cash-secured):** Max single position = based on account size (50% for $20k, 30% for $100k). Max single sector = 40%.

**Assignment Comfort Test:** Only recommend stocks the user would happily own at the strike price for 6+ months.

**Management:** Close at 50%+ profit if early. Only roll for net credit. Accept assignment — that's the Wheel working.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SESSION INPUTS FOR THIS ANALYSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ACCOUNT SETTINGS

| Setting | Value |
|---------|-------|
| Account Size | $${formData.accountSize} |
| Cash Available | $${formData.cashAvailable} |
${formData.mode === 'margin' ? `| Buying Power | $${formData.buyingPower} |` : ''}
| Mode | ${formData.mode === 'cash_secured' ? 'Cash-Secured' : 'Margin'} |
| Experience Level | ${formData.experienceLevel} |
| Options Approval Level | ${formData.optionsLevel} |
| Margin Approved | ${formData.marginApproved ? 'Yes' : 'No'} |

## RISK SETTINGS

| Setting | Value |
|---------|-------|
| Max Single Position | ${formData.maxSinglePosition}% |
| Max Sector Exposure | ${formData.maxSectorExposure}% |
| Min Wheel Score | ${formData.minWheelScore} |
| Target Monthly Income | $${formData.targetMonthlyIncome} |

## SESSION SETTINGS

| Setting | Value |
|---------|-------|
| Session Type | ${formData.sessionType} |
| Target Delta | ${formData.targetDelta} |
| Target DTE | ${formData.targetDte} days |
| Market Outlook | ${formData.marketOutlook} |

---

${hasPositions ? `## CURRENT OPEN POSITIONS

\`\`\`
${formData.currentPositions}
\`\`\`

**Format:** Type, Ticker, Strike, Expiry, Premium, Opened

---` : '## CURRENT OPEN POSITIONS\n\nNo open positions entered.\n\n---'}

${hasWatchlist ? `## WATCHLIST TO ANALYZE

\`\`\`
${formData.watchlist}
\`\`\`

---` : ''}

${marketDataText ? `# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LIVE MARKET DATA (from Yahoo Finance)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**IMPORTANT: Use the live data below for your analysis. These are real-time prices, IV, and options chain data. Do NOT estimate values that are provided here — use the actual numbers. When selecting a strike, use the MID price (average of Bid and Ask columns) from the matching strike row as the premium value in your JSON output. Do NOT inflate or aggregate premiums. If data for a ticker is marked as unavailable, use your best estimates and note it.**

${marketDataText}

---` : ''}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REQUIRED OUTPUT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**IMPORTANT: Be concise in Parts A-F. Keep each to 2-5 sentences max. The JSON in Part G is the primary output — spend your effort getting the numbers right.**

## PART A — ACCOUNT SNAPSHOT
Brief summary: account size, available capital, capacity for new trades, diversification concerns.

${hasPositions ? `## PART B — POSITION REVIEW
For each open position: P&L status, DTE remaining, recommendation (HOLD/CLOSE/ROLL).
` : ''}
${hasWatchlist ? `## PART C — WATCHLIST ANALYSIS
For each stock: Wheel Score™ (show the 7 factor scores and weighted total), verdict (SELL/WAIT/SKIP), and brief rationale.
` : ''}
## PART D — RECOMMENDED TRADES
Top opportunities ranked by daily return. One sentence per trade explaining why.

## PART E — ACTION SUMMARY
List trades to execute, stocks to skip (with reason), and stocks to watch.

## PART F — INCOME DASHBOARD
Brief: projected weekly/monthly premium, total collateral deployed.

---

## PART G — STRUCTURED DATA (REQUIRED)

**IMPORTANT: You MUST include this JSON block at the very end of your response. This is used for parsing.**

\`\`\`json
{
  "mode": "Cash-Secured|Margin",
  "sessionType": "New Trades|Position Review|Both",
  "accountSnapshot": {
    "cashAvailable": 30000,
    "buyingPower": 100000,
    "currentExposure": 20000,
    "maxSinglePosition": 15000
  },
  "trades": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "wheelScore": 8.3,
      "verdict": "SELL|WAIT|SKIP",
      "tradeType": "cash-secured put|covered call",
      "expiryFrequency": "3x/week (Mon/Wed/Fri)|weekly|monthly",
      "currentPrice": 230.50,
      "strike": 227.00,
      "premium": 1.50,
      "delta": 0.16,
      "dte": 2,
      "expirationDate": "Wed Feb 19, 2025",
      "nextExpiries": ["Fri Feb 21", "Mon Feb 24", "Wed Feb 26"],
      "ivRank": 42,
      "dailyReturn": 0.33,
      "weeklyReturn": 0.99,
      "monthlyReturn": 3.96,
      "annualizedReturn": 120.5,
      "collateralRequired": 22550,
      "maxProfit": 150,
      "breakeven": 225.50,
      "assignmentComfort": "Yes - would own at $225.50 basis",
      "earningsDate": "Apr 24, 2025",
      "earningsRisk": "LOW|MEDIUM|HIGH",
      "rationale": "0.33%/day return exceeds 0.30% target. 3x/week expiries allow rapid compounding. Comfortable assignment at $225.50 basis.",
      "risks": ["Gamma risk near expiry", "Gap risk overnight"],
      "scoreBreakdown": {
        "ivRank": 1.8,
        "premiumYield": 2.0,
        "technicalSetup": 1.5,
        "fundamentals": 1.5,
        "assignmentComfort": 1.5
      },
      "calculations": {
        "premiumBid": 1.40,
        "premiumAsk": 1.60,
        "premiumMid": 1.50,
        "premiumSource": "$227 Put, Wed Feb 19 expiry, from live chain",
        "dte": 2,
        "breakevenCalc": "227.00 - 1.50 = 225.50",
        "collateralCalc": "225.50 × 100 = $22,550",
        "dailyReturnCalc": "(1.50 / 225.50) / 2 × 100 = 0.33%",
        "maxProfitCalc": "1.50 × 100 = $150",
        "annualizedCalc": "0.33% × 365 = 120.5%"
      },
      "weeklyPlan": {
        "tradesPerWeek": 3,
        "projectedWeeklyPremium": 450,
        "projectedMonthlyPremium": 1800,
        "expiryDays": ["Mon", "Wed", "Fri"]
      }
    }
  ],
  "skipList": [
    {
      "ticker": "TSLA",
      "name": "Tesla Inc.",
      "reason": "Earnings in 5 days - too risky",
      "dailyReturn": 0.18,
      "revisitDate": "After Feb 5 earnings"
    }
  ],
  "watchlist": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA Corporation",
      "triggerCondition": "Wait for IV Rank above 40",
      "currentIV": 32,
      "targetIV": 40,
      "expiryFrequency": "3x/week",
      "potentialStrike": 850,
      "potentialPremium": 15.00,
      "potentialDailyReturn": 0.35
    }
  ],
  "summary": {
    "totalTrades": 3,
    "totalPremiumThisTrade": 450,
    "projectedWeeklyPremium": 1350,
    "projectedMonthlyPremium": 5400,
    "totalCollateral": 45000,
    "avgDailyReturn": 0.33,
    "portfolioYield": 3.6,
    "riskLevel": "LOW|MODERATE|HIGH"
  },
  "keyDates": [
    {
      "date": "Feb 19, 2025",
      "event": "AAPL Wed expiry",
      "impact": "LOW",
      "action": "Let expire or roll to Fri"
    }
  ]
}
\`\`\`

**Fill in all fields with actual data from your analysis. Use null for any field you cannot determine.**

**Critical field definitions:**
- \`premium\`: The MID price (average of bid and ask) of the SINGLE option contract you are recommending, expressed PER SHARE (not per contract). For example, if the bid is $1.50 and ask is $1.80, premium = 1.65. This is NOT a total, NOT per contract (×100), and NOT aggregated across multiple trades. It is the per-share mid-price of the specific strike and expiry you are recommending. USE THE LIVE OPTIONS DATA PROVIDED — do not estimate if real bid/ask data is available.
- \`dte\`: MUST match the DTE shown in the live data header for the expiry you selected (e.g. if the data says "Expiry: Wed Mar 5, 2025 (2 DTE)" then dte = 2). Do NOT calculate DTE yourself — use the exact number from the live data. This is critical because all return calculations depend on it.
- \`breakeven\`: strike - premium (for puts) or strike + premium (for calls). This is the cost basis per share.
- \`collateralRequired\`: breakeven × 100 (actual capital at risk, NOT strike × 100)
- \`maxProfit\`: premium × 100 (per contract, in dollars)
- \`dailyReturn\`: (premium / breakeven) / DTE × 100 (percentage) — return on actual cost basis, using DTE from live data header
- \`annualizedReturn\`: dailyReturn × 365 (simple multiplication, no compounding)
- \`totalPremiumThisTrade\` (in summary): Sum of all recommended trade premiums × 100
- \`calculations\`: REQUIRED — Show your working. This object must contain:
  - \`premiumBid\`: The bid price you read from the live data (per share)
  - \`premiumAsk\`: The ask price you read from the live data (per share)
  - \`premiumMid\`: (bid + ask) / 2 — this MUST equal the \`premium\` field
  - \`premiumSource\`: Which strike, expiry, and data row you used (e.g. "$255 Put, Fri Feb 28 expiry, from live chain")
  - \`dte\`: The DTE value from the live data header for the selected expiry — must match the \`dte\` field above
  - \`breakevenCalc\`: Show formula e.g. "227.00 - 1.50 = 225.50"
  - \`collateralCalc\`: Show formula using BREAKEVEN e.g. "225.50 × 100 = $22,550" (NOT strike × 100)
  - \`dailyReturnCalc\`: Show formula using BREAKEVEN e.g. "(1.50 / 225.50) / 2 × 100 = 0.33%" — the DTE divisor must match the \`dte\` field
  - \`maxProfitCalc\`: Show formula e.g. "1.50 × 100 = $150"
  - \`annualizedCalc\`: Show formula e.g. "0.33% × 365 = 120.5%" (simple daily × 365, no compounding)

---

# END OF PROMPT`
}

// Extract JSON data block from response
function extractJsonData(text) {
  try {
    // Look for JSON code block
    const jsonMatch = text.match(/```json\s*\n?([\s\S]*?)\n?```/i)
    if (jsonMatch && jsonMatch[1]) {
      const jsonStr = jsonMatch[1].trim()
      const data = JSON.parse(jsonStr)
      return data
    }
  } catch (error) {
    console.error('Failed to parse JSON data:', error.message)
  }
  return null
}

// Convert JSON trades to standard format
function convertJsonTrades(jsonData, watchlistTickers) {
  if (!jsonData || !jsonData.trades) return null

  return jsonData.trades.map(trade => ({
    ticker: trade.ticker,
    name: trade.name,
    wheelScore: trade.wheelScore,
    verdict: trade.verdict,
    tradeType: trade.tradeType,
    expiryFrequency: trade.expiryFrequency,
    currentPrice: trade.currentPrice,
    strike: trade.strike,
    premium: trade.premium,
    delta: trade.delta,
    dte: trade.dte,
    expirationDate: trade.expirationDate,
    nextExpiries: trade.nextExpiries,
    ivRank: trade.ivRank,
    dailyReturn: trade.dailyReturn,
    weeklyReturn: trade.weeklyReturn,
    monthlyReturn: trade.monthlyReturn,
    annualizedReturn: trade.annualizedReturn,
    collateralRequired: trade.collateralRequired,
    maxProfit: trade.maxProfit,
    breakeven: trade.breakeven,
    assignmentComfort: trade.assignmentComfort,
    earningsDate: trade.earningsDate,
    earningsRisk: trade.earningsRisk,
    rationale: trade.rationale,
    risks: trade.risks,
    scoreBreakdown: trade.scoreBreakdown,
    calculations: trade.calculations,
    weeklyPlan: trade.weeklyPlan,
    details: null // No raw details when using JSON
  }))
}

function parseResponse(responseText, formData) {
  // Extract watchlist tickers from formData
  const watchlistTickers = formData.watchlist
    ? formData.watchlist.split('\n')
        .map(line => line.trim().toUpperCase())
        .filter(t => t.length >= 1 && t.length <= 5 && /^[A-Z]+$/.test(t))
    : []

  // First, try to extract structured JSON data (most reliable)
  const jsonData = extractJsonData(responseText)

  // Use JSON data if available, otherwise fall back to text parsing
  const result = {
    mode: jsonData?.mode || extractMode(responseText),
    summary: jsonData?.summary?.estimatedMonthlyIncome
      ? `Estimated monthly income: $${jsonData.summary.estimatedMonthlyIncome}. ${jsonData.summary.totalTrades || 0} trades recommended.`
      : extractSummary(responseText),
    trades: convertJsonTrades(jsonData, watchlistTickers) || extractTrades(responseText, watchlistTickers),
    skipList: jsonData?.skipList || null,
    watchlistItems: jsonData?.watchlist || null,
    summaryData: jsonData?.summary || null,
    keyDates: jsonData?.keyDates || null,
    accountSnapshotData: jsonData?.accountSnapshot || null,
    accountSnapshot: extractSection(responseText, 'PART A', 'PART B') || extractSection(responseText, 'ACCOUNT SNAPSHOT', 'PART B'),
    positionReview: extractSection(responseText, 'PART B', 'PART C') || extractSection(responseText, 'POSITION REVIEW', 'PART C'),
    watchlistAnalysis: extractSection(responseText, 'PART C', 'PART D') || extractSection(responseText, 'WATCHLIST ANALYSIS', 'PART D'),
    recommendedTrades: extractSection(responseText, 'PART D', 'PART E') || extractSection(responseText, 'RECOMMENDED TRADES', 'PART E'),
    actionSummary: extractSection(responseText, 'PART E', 'PART F') || extractSection(responseText, 'ACTION SUMMARY', 'PART F'),
    incomeDashboard: extractSection(responseText, 'PART F', 'PART G') || extractSection(responseText, 'INCOME DASHBOARD', 'PART G'),
    fullAnalysis: responseText,
    jsonParsed: jsonData !== null
  }

  return result
}

function extractMode(text) {
  if (text.toLowerCase().includes('cash-secured')) {
    return 'Cash-Secured'
  }
  if (text.toLowerCase().includes('margin mode')) {
    return 'Margin'
  }
  return 'Cash-Secured'
}

function extractSummary(responseText) {
  // Try to get the action summary
  const summaryMatch = responseText.match(/TRADES TO EXECUTE:[\s\S]*?(?=TOTAL PREMIUM|SKIP THIS WEEK|---)/i)
  if (summaryMatch) {
    return summaryMatch[0].trim()
  }

  // Try alternate format
  const altMatch = responseText.match(/This session's trades:[\s\S]*?(?=\*\*Skip|\*\*Watch|---|\n\n\*\*)/i)
  if (altMatch) {
    return altMatch[0].trim()
  }

  // Fallback to first substantial paragraph
  const paragraphs = responseText.split('\n\n').filter(p => p.length > 100)
  return paragraphs[0]?.substring(0, 500) || 'Analysis complete. Review full report below.'
}

function extractSection(text, startMarker, endMarker) {
  const startPatterns = [
    new RegExp(`## ${startMarker}[\\s\\S]*?(?=## ${endMarker}|$)`, 'i'),
    new RegExp(`### ${startMarker}[\\s\\S]*?(?=### ${endMarker}|## ${endMarker}|$)`, 'i'),
    new RegExp(`# ${startMarker}[\\s\\S]*?(?=# ${endMarker}|$)`, 'i'),
    new RegExp(`${startMarker}[\\s\\S]*?(?=${endMarker}|$)`, 'i')
  ]

  for (const pattern of startPatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }
  return null
}

function extractTrades(text, watchlistTickers = []) {
  const trades = []

  // Company name lookup for common tickers
  const companyNames = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'GOOG': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corporation',
    'TSLA': 'Tesla Inc.',
    'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',
    'JNJ': 'Johnson & Johnson',
    'WMT': 'Walmart Inc.',
    'PG': 'Procter & Gamble Co.',
    'MA': 'Mastercard Inc.',
    'HD': 'The Home Depot Inc.',
    'KO': 'The Coca-Cola Company',
    'PEP': 'PepsiCo Inc.',
    'MRK': 'Merck & Co. Inc.',
    'ABBV': 'AbbVie Inc.',
    'CVX': 'Chevron Corporation',
    'LLY': 'Eli Lilly and Company',
    'BAC': 'Bank of America Corp.',
    'PFE': 'Pfizer Inc.',
    'COST': 'Costco Wholesale Corp.',
    'TMO': 'Thermo Fisher Scientific',
    'CSCO': 'Cisco Systems Inc.',
    'MCD': 'McDonald\'s Corporation',
    'ABT': 'Abbott Laboratories',
    'DHR': 'Danaher Corporation',
    'ACN': 'Accenture plc',
    'NKE': 'NIKE Inc.',
    'DIS': 'The Walt Disney Company',
    'VZ': 'Verizon Communications',
    'ADBE': 'Adobe Inc.',
    'CMCSA': 'Comcast Corporation',
    'INTC': 'Intel Corporation',
    'CRM': 'Salesforce Inc.',
    'T': 'AT&T Inc.',
    'UNH': 'UnitedHealth Group Inc.',
    'XOM': 'Exxon Mobil Corporation',
    'AMD': 'Advanced Micro Devices',
    'NFLX': 'Netflix Inc.',
    'ORCL': 'Oracle Corporation',
    'IBM': 'IBM Corporation',
    'QCOM': 'QUALCOMM Inc.',
    'TXN': 'Texas Instruments Inc.',
    'LOW': 'Lowe\'s Companies Inc.',
    'SBUX': 'Starbucks Corporation',
    'GS': 'Goldman Sachs Group',
    'BLK': 'BlackRock Inc.',
    'SPGI': 'S&P Global Inc.',
    'AMAT': 'Applied Materials Inc.',
    'BKNG': 'Booking Holdings Inc.',
    'MDLZ': 'Mondelez International',
    'ADP': 'Automatic Data Processing',
    'GILD': 'Gilead Sciences Inc.',
    'MMM': 'The 3M Company',
    'C': 'Citigroup Inc.',
    'CVS': 'CVS Health Corporation',
    'MO': 'Altria Group Inc.',
    'BMY': 'Bristol-Myers Squibb',
    'WFC': 'Wells Fargo & Company',
    'SCHW': 'Charles Schwab Corp.',
    'BX': 'Blackstone Inc.',
    'SO': 'Southern Company',
    'DUK': 'Duke Energy Corporation',
    'CL': 'Colgate-Palmolive Co.',
    'GE': 'General Electric Co.',
    'SYK': 'Stryker Corporation',
    'ZTS': 'Zoetis Inc.',
    'CB': 'Chubb Limited',
    'VRTX': 'Vertex Pharmaceuticals',
    'NOW': 'ServiceNow Inc.',
    'ISRG': 'Intuitive Surgical',
    'REGN': 'Regeneron Pharmaceuticals',
    'BSX': 'Boston Scientific Corp.',
    'ATVI': 'Activision Blizzard',
    'DE': 'Deere & Company',
    'LRCX': 'Lam Research Corp.',
    'ADI': 'Analog Devices Inc.',
    'PNC': 'PNC Financial Services',
    'USB': 'U.S. Bancorp',
    'TJX': 'The TJX Companies',
    'CI': 'The Cigna Group',
    'EQIX': 'Equinix Inc.',
    'CME': 'CME Group Inc.',
    'ITW': 'Illinois Tool Works',
    'MMC': 'Marsh McLennan',
    'AON': 'Aon plc',
    'APD': 'Air Products & Chemicals',
    'SHW': 'Sherwin-Williams Co.',
    'ETN': 'Eaton Corporation',
    'EMR': 'Emerson Electric Co.',
    'KLAC': 'KLA Corporation',
    'FCX': 'Freeport-McMoRan Inc.',
    'NSC': 'Norfolk Southern Corp.',
    'PSX': 'Phillips 66',
    'MPC': 'Marathon Petroleum',
    'VLO': 'Valero Energy Corp.',
    'SLB': 'Schlumberger Limited',
    'F': 'Ford Motor Company',
    'GM': 'General Motors Company'
  }

  // For each ticker in the watchlist, find its section and extract data
  for (const ticker of watchlistTickers) {
    // Find the section where this ticker is analyzed
    // Look for various patterns where Claude might discuss this ticker
    const tickerPatterns = [
      // ### AAPL — Apple Inc.
      new RegExp(`(?:^|\\n)#{1,4}\\s*\\*?\\*?${ticker}\\*?\\*?\\s*[-—:]([\\s\\S]*?)(?=\\n#{1,4}\\s|$)`, 'im'),
      // **AAPL** or AAPL: followed by content
      new RegExp(`(?:^|\\n)\\*\\*${ticker}\\*\\*([\\s\\S]*?)(?=\\n\\*\\*[A-Z]{1,5}\\*\\*|\\n#{1,4}|$)`, 'im'),
      // Look for TICKER in a wheel score context
      new RegExp(`${ticker}[\\s\\S]{0,50}?Wheel\\s*Score[\\s\\S]*?(?=\\n#{1,4}|\\n\\*\\*[A-Z]{1,5}\\*\\*|$)`, 'i'),
      // General mention with surrounding context (2000 chars)
      new RegExp(`(?:^|[\\n\\s])${ticker}(?:[\\s\\n]|[-—:])[\\s\\S]{0,2000}`, 'im')
    ]

    let section = null
    for (const pattern of tickerPatterns) {
      const match = text.match(pattern)
      if (match) {
        section = match[0]
        break
      }
    }

    if (!section) {
      // Ticker not found in response, add with minimal data
      trades.push({
        ticker,
        name: companyNames[ticker] || null,
        wheelScore: null,
        verdict: null,
        premium: null
      })
      continue
    }

    // Extract Wheel Score - look for various patterns
    let wheelScore = null
    const scorePatterns = [
      /Wheel\s*Score[™]?\s*[:=]?\s*\*?\*?(\d+\.?\d*)\s*(?:\/\s*10)?/i,
      /(\d+\.?\d*)\s*\/\s*10/,
      /Score[:\s]+(\d+\.?\d*)(?:\s*\/\s*10)?/i,
      /(\d+\.?\d*)\s*\[?[⭐★]+/,
      /Rating[:\s]+(\d+\.?\d*)/i,
    ]
    for (const pattern of scorePatterns) {
      const match = section.match(pattern)
      if (match) {
        const score = parseFloat(match[1])
        if (score >= 1 && score <= 10) {
          wheelScore = score
          break
        }
      }
    }

    // Extract company name from section or use lookup
    let name = companyNames[ticker] || null
    const namePatterns = [
      new RegExp(`${ticker}\\s*[-—:]\\s*([A-Z][A-Za-z0-9\\s&.,'()]+?)(?:\\n|\\||Wheel|Score|$)`, 'i'),
      /Company[:\s]+([A-Z][A-Za-z0-9\s&.,'()]+?)(?:\n|\||$)/i,
      /Stock[:\s]+[A-Z]{1,5}\s*[-—]\s*([A-Z][A-Za-z0-9\s&.,'()]+?)(?:\n|\||$)/i,
    ]
    for (const pattern of namePatterns) {
      const match = section.match(pattern)
      if (match && match[1].length > 3 && match[1].length < 50) {
        const extractedName = match[1].trim().replace(/\*+/g, '').replace(/\s+/g, ' ')
        // Validate it looks like a company name
        if (/^[A-Z]/.test(extractedName) && !/^(SELL|BUY|WAIT|SKIP|HOLD|None)$/i.test(extractedName)) {
          name = extractedName
          break
        }
      }
    }

    // Extract verdict
    let verdict = null
    const verdictPatterns = [
      /Verdict[:\s|]+\*?\*?\[?(SELL|BUY|WAIT|SKIP|PASS|HOLD)\]?\*?\*?/i,
      /Recommendation[:\s|]+\*?\*?\[?(SELL|BUY|WAIT|SKIP|PASS|HOLD)\]?\*?\*?/i,
      /Action[:\s|]+\*?\*?\[?(SELL|BUY|WAIT|SKIP|PASS|HOLD)\]?\*?\*?/i,
      /\*\*(SELL|WAIT|SKIP)\*\*/i,
    ]
    for (const pattern of verdictPatterns) {
      const match = section.match(pattern)
      if (match) {
        verdict = match[1].toUpperCase()
        break
      }
    }

    // Extract premium
    let premium = null
    const premiumPatterns = [
      /Premium\s*\([^)]*\)[:\s]*\$(\d+\.?\d*)/i,
      /Premium[:\s]+\$(\d+\.?\d*)/i,
      /\$(\d+\.?\d*)\s*(?:per contract|premium)/i,
      /Collect[:\s]+\$(\d+\.?\d*)/i,
      /\$(\d+\.?\d*)\s*\(/,  // $2.50 (
    ]
    for (const pattern of premiumPatterns) {
      const match = section.match(pattern)
      if (match) {
        const p = parseFloat(match[1])
        if (p > 0 && p < 1000) {  // Reasonable premium range
          premium = p
          break
        }
      }
    }

    // Extract returns
    let monthlyReturn = null
    let annualizedReturn = null
    const monthlyMatch = section.match(/Monthly\s*Return[^:]*[:\s]+(\d+\.?\d*)%/i)
    const annualMatch = section.match(/Annual(?:ized)?\s*Return[^:]*[:\s]+(\d+\.?\d*)%/i)
    if (monthlyMatch) monthlyReturn = parseFloat(monthlyMatch[1])
    if (annualMatch) annualizedReturn = parseFloat(annualMatch[1])

    // Extract strike price
    let strike = null
    const strikeMatch = section.match(/Strike[:\s|]+\$?(\d+\.?\d*)/i)
    if (strikeMatch) strike = parseFloat(strikeMatch[1])

    // Extract expiry/DTE
    let dte = null
    const dteMatch = section.match(/(\d+)\s*(?:DTE|days?\s*to\s*expir)/i)
    if (dteMatch) dte = parseInt(dteMatch[1])

    // Extract IV Rank
    let ivRank = null
    const ivMatch = section.match(/IV\s*Rank[:\s]+(\d+\.?\d*)%?/i)
    if (ivMatch) ivRank = parseFloat(ivMatch[1])

    // Extract current price
    let currentPrice = null
    const pricePatterns = [
      /Current\s*Price[:\s]+\$?(\d+\.?\d*)/i,
      /Price[:\s]+\$?(\d+\.?\d*)/i,
      /trading\s*(?:at|around)\s*\$?(\d+\.?\d*)/i,
    ]
    for (const pattern of pricePatterns) {
      const match = section.match(pattern)
      if (match) {
        const price = parseFloat(match[1])
        if (price > 1 && price < 10000) {
          currentPrice = price
          break
        }
      }
    }

    // Extract delta
    let delta = null
    const deltaMatch = section.match(/Delta[:\s]+(-?\d*\.?\d+)/i)
    if (deltaMatch) delta = parseFloat(deltaMatch[1])

    // Extract expiration date
    let expirationDate = null
    const expMatch = section.match(/Expir(?:ation|y)[:\s]+([A-Za-z]+\s*\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i)
    if (expMatch) expirationDate = expMatch[1].trim()

    // Extract assignment comfort / would own assessment
    let assignmentComfort = null
    const comfortPatterns = [
      /Assignment\s*Comfort[:\s]+([^\n]+)/i,
      /Would\s*(?:you\s*)?own[:\s]+([^\n]+)/i,
      /Comfort[:\s]+(Yes|No|Maybe)[^\n]*/i,
    ]
    for (const pattern of comfortPatterns) {
      const match = section.match(pattern)
      if (match) {
        assignmentComfort = match[1].trim().substring(0, 100)
        break
      }
    }

    // Extract reasoning/rationale
    let rationale = null
    const rationalePatterns = [
      /(?:Rationale|Reasoning|Why)[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
      /(?:Analysis|Assessment)[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i,
    ]
    for (const pattern of rationalePatterns) {
      const match = section.match(pattern)
      if (match) {
        rationale = match[1].trim().substring(0, 300)
        break
      }
    }

    // Extract the full section as details (cleaned up)
    let details = section
      .replace(/^[\s\n]+/, '')  // trim leading whitespace
      .substring(0, 1500)  // limit length
      .trim()

    trades.push({
      ticker,
      name,
      wheelScore,
      verdict,
      premium,
      monthlyReturn,
      annualizedReturn,
      strike,
      dte,
      ivRank,
      currentPrice,
      delta,
      expirationDate,
      assignmentComfort,
      rationale,
      details
    })
  }

  // Sort by wheel score (highest first), then by verdict priority (SELL > WAIT > SKIP > null)
  const verdictPriority = { 'SELL': 0, 'BUY': 0, 'WAIT': 1, 'HOLD': 2, 'SKIP': 3, 'PASS': 3 }
  trades.sort((a, b) => {
    // First by wheel score (highest first)
    if (a.wheelScore !== null && b.wheelScore !== null) {
      return b.wheelScore - a.wheelScore
    }
    if (a.wheelScore !== null) return -1
    if (b.wheelScore !== null) return 1

    // Then by verdict priority
    const aPriority = a.verdict ? (verdictPriority[a.verdict] ?? 4) : 5
    const bPriority = b.verdict ? (verdictPriority[b.verdict] ?? 4) : 5
    if (aPriority !== bPriority) return aPriority - bPriority

    // Finally alphabetically
    return a.ticker.localeCompare(b.ticker)
  })

  return trades
}
