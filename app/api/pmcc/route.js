import Anthropic from '@anthropic-ai/sdk'
import { fetchAllMarketData, formatMarketDataForPmccPrompt } from '@/lib/yahooFinance'

// Allow up to 5 minutes for the full analysis
export const maxDuration = 300

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { formData } = await request.json()

    // Extract tickers from watchlist
    const tickers = formData.watchlist
      ? formData.watchlist.split('\n').map(t => t.trim().toUpperCase()).filter(t => t.length >= 1 && t.length <= 5 && /^[A-Z]+$/.test(t))
      : []

    // Fetch live market data for all tickers in parallel
    let marketDataText = ''
    if (tickers.length > 0) {
      try {
        const marketData = await fetchAllMarketData(tickers)
        marketDataText = formatMarketDataForPmccPrompt(marketData)
      } catch (err) {
        console.error('Market data fetch failed, continuing without live data:', err.message)
        marketDataText = '**Live market data unavailable.** Use your best estimates based on recent knowledge.\n'
      }
    }

    const prompt = buildPmccPrompt(formData, marketDataText)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const responseText = message.content[0].text
    const result = parsePmccResponse(responseText, formData)

    return Response.json(result)
  } catch (error) {
    console.error('PMCC analysis error:', error)
    return Response.json(
      { error: 'PMCC analysis failed', details: error.message },
      { status: 500 }
    )
  }
}

function buildPmccPrompt(formData, marketDataText = '') {
  const tickers = formData.watchlist
    ? formData.watchlist.split('\n').map(t => t.trim().toUpperCase()).filter(t => t.length >= 1 && t.length <= 5 && /^[A-Z]+$/.test(t))
    : []

  return `# Poor Man's Covered Call (PMCC) Analysis

You are an options strategy analyst specializing in the Poor Man's Covered Call (PMCC) strategy, also known as a diagonal call spread using LEAPS.

## What is a PMCC?

A PMCC replaces owning 100 shares with a deep-in-the-money LEAPS call option, then sells short-term calls against it — just like a covered call, but with 70-80% less capital.

**Structure:**
- **Long Leg:** Buy a deep ITM LEAPS call (Delta ≥ 0.80, DTE > 365 days)
- **Short Leg:** Sell a shorter-term OTM call against it (30-45 DTE typically)

## Analysis Requirements

For EACH ticker in the watchlist below, analyse its suitability for a PMCC and provide:

### Step 1: LEAPS Candidate Identification
- Find the best LEAPS call option with **DTE > 365 days** and **Delta ≥ 0.80**
- The LEAPS should be deep ITM to behave like stock ownership
- Estimate a realistic LEAPS strike and cost based on current market conditions

### Step 2: Short Call Selection
- Identify a suitable short-term OTM call to sell (30-45 DTE)
- The short call premium MUST exceed the extrinsic (time) value of the long LEAPS
- This ensures you can recover the time decay cost of the LEAPS through premium collection

### Step 3: Profitability Check
- **Max Profit** = (Short Call Strike − Long LEAPS Strike) − (Debit Paid − Premium Received)
  - Where Debit Paid = cost of LEAPS, Premium Received = short call premium
- Verify the short call premium > extrinsic value of the LEAPS
- The trade should be profitable even if the short call expires worthless initially

### Step 4: Capital Efficiency
- **Capital Required** = LEAPS cost (debit paid for the long call)
- **Capital Saved** = percentage saved vs buying 100 shares outright
- Target: ~70-80% capital savings compared to owning 100 shares

## Account Context

| Setting | Value |
|---------|-------|
| Account Size | $${formData.accountSize} |
| Cash Available | $${formData.cashAvailable} |
| Mode | ${formData.mode === 'cash_secured' ? 'Cash-Secured' : 'Margin'} |
| Experience Level | ${formData.experienceLevel} |
| Target Monthly Income | $${formData.targetMonthlyIncome} |

## Watchlist to Analyze

${tickers.map(t => `- ${t}`).join('\n')}

${marketDataText ? `## Live Market Data (from Yahoo Finance)

**IMPORTANT: Use the live data below for your analysis. These are real-time prices and options chain data. Do NOT estimate values that are provided here — use the actual numbers. For LEAPS pricing, if the exact expiration isn't shown, extrapolate from the closest available long-dated chain. If data for a ticker is marked unavailable, use your best estimates and note it.**

${marketDataText}
` : ''}

## Required Output

For each ticker, provide a thorough analysis, then at the END of your response, include a JSON block with this exact structure:

\`\`\`json
{
  "pmccTrades": [
    {
      "ticker": "AAPL",
      "leapsStrike": 180,
      "leapsDTE": 450,
      "leapsDelta": 0.85,
      "leapsCost": 55.00,
      "shortCallStrike": 240,
      "shortCallDTE": 35,
      "shortCallPremium": 3.50,
      "extrinsicValue": 2.80,
      "maxProfit": 850,
      "capitalRequired": 5500,
      "capitalSaved": 76,
      "verdict": "BUY|WAIT|SKIP",
      "rationale": "Deep ITM LEAPS at 0.85 delta provides strong stock-like exposure. Short call premium of $3.50 exceeds LEAPS extrinsic of $2.80, generating net income each cycle."
    }
  ],
  "pmccSummary": {
    "totalCandidates": 3,
    "totalCapitalRequired": 15000,
    "avgCapitalSaved": 75,
    "totalMaxProfit": 2500
  }
}
\`\`\`

**Field definitions:**
- \`ticker\`: Stock symbol
- \`leapsStrike\`: Strike price of the long LEAPS call
- \`leapsDTE\`: Days to expiration of the LEAPS (must be >365)
- \`leapsDelta\`: Delta of the LEAPS call (must be ≥0.80)
- \`leapsCost\`: Per-share cost of the LEAPS call (multiply by 100 for total)
- \`shortCallStrike\`: Strike price of the short call
- \`shortCallDTE\`: DTE of the short call
- \`shortCallPremium\`: Per-share premium received for the short call
- \`extrinsicValue\`: Extrinsic (time) value portion of the LEAPS cost
- \`maxProfit\`: (Short Call Strike − LEAPS Strike) × 100 − (LEAPS Cost × 100 − Short Call Premium × 100) — in dollars per spread
- \`capitalRequired\`: Total cost of the LEAPS (leapsCost × 100)
- \`capitalSaved\`: Percentage of capital saved vs owning 100 shares at current price
- \`verdict\`: BUY (good PMCC candidate), WAIT (conditions not ideal yet), SKIP (not suitable)
- \`rationale\`: Brief explanation of the verdict

**Important rules:**
- ALL monetary values for \`leapsCost\`, \`shortCallPremium\`, \`extrinsicValue\` are PER SHARE (multiply by 100 for per-contract)
- \`maxProfit\` and \`capitalRequired\` are PER CONTRACT (already multiplied by 100)
- \`capitalSaved\` is a percentage (e.g., 75 means 75% less capital needed)
- Only give a "BUY" verdict if: LEAPS delta ≥ 0.80 AND DTE > 365 AND short call premium > extrinsic value
- Use realistic, current market-based estimates for all prices and premiums
- Mark any data that requires real-time verification as approximate
- The JSON block MUST appear at the very end of your response

Provide your full analysis now.`
}

function parsePmccResponse(responseText, formData) {
  // Extract JSON block
  let jsonData = null
  try {
    const jsonMatch = responseText.match(/```json\s*\n?([\s\S]*?)\n?```/i)
    if (jsonMatch && jsonMatch[1]) {
      jsonData = JSON.parse(jsonMatch[1].trim())
    }
  } catch (error) {
    console.error('Failed to parse PMCC JSON:', error.message)
  }

  return {
    mode: 'PMCC',
    pmccTrades: jsonData?.pmccTrades || [],
    pmccSummary: jsonData?.pmccSummary || null,
    fullAnalysis: responseText,
    jsonParsed: jsonData !== null,
    // Include empty standard fields so the UI doesn't break
    trades: [],
    skipList: [],
    watchlistItems: [],
    summaryData: null,
    keyDates: [],
  }
}
