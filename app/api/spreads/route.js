import Anthropic from '@anthropic-ai/sdk'
import { fetchAllMarketData, formatMarketDataForSpreadsPrompt } from '@/lib/yahooFinance'

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
        marketDataText = formatMarketDataForSpreadsPrompt(marketData)
      } catch (err) {
        console.error('Market data fetch failed, continuing without live data:', err.message)
        marketDataText = '**Live market data unavailable.** Use your best estimates based on recent knowledge.\n'
      }
    }

    const prompt = buildSpreadsPrompt(formData, marketDataText)

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
    const result = parseSpreadsResponse(responseText, formData)

    return Response.json(result)
  } catch (error) {
    console.error('Spreads analysis error:', error)
    return Response.json(
      { error: 'Spreads analysis failed', details: error.message },
      { status: 500 }
    )
  }
}

function buildSpreadsPrompt(formData, marketDataText = '') {
  const tickers = formData.watchlist
    ? formData.watchlist.split('\n').map(t => t.trim().toUpperCase()).filter(t => t.length >= 1 && t.length <= 5 && /^[A-Z]+$/.test(t))
    : []

  return `# Vertical Spreads & Iron Condor Analysis

You are an options strategy analyst specialising in risk-defined income strategies: **Bull Put Spreads**, **Bear Call Spreads**, and **Iron Condors**.

## Strategy Definitions

### Bull Put Spread (Credit Put Spread)
- **Sell** an OTM put at a higher strike, **buy** a further OTM put at a lower strike
- Profit when stock stays above the short put strike
- **Max Profit** = Net premium received × 100
- **Max Loss** = (Spread Width − Net Premium) × 100
- **Breakeven** = Short Put Strike − Net Premium

### Bear Call Spread (Credit Call Spread)
- **Sell** an OTM call at a lower strike, **buy** a further OTM call at a higher strike
- Profit when stock stays below the short call strike
- **Max Profit** = Net premium received × 100
- **Max Loss** = (Spread Width − Net Premium) × 100
- **Breakeven** = Short Call Strike + Net Premium

### Iron Condor
- Combines a Bull Put Spread + Bear Call Spread on the same underlying
- Profit when stock stays within the range between the two short strikes
- **Max Profit** = Total net premium received × 100
- **Max Loss** = (Wider Spread Width − Total Net Premium) × 100
- **Upper Breakeven** = Short Call Strike + Total Net Premium
- **Lower Breakeven** = Short Put Strike − Total Net Premium

## Analysis Requirements

For EACH ticker in the watchlist, analyse ALL THREE strategy types and recommend the best one(s). Consider:

### Selection Criteria
- **DTE:** Target 30-45 DTE for optimal theta decay
- **Short strikes:** Around 0.15-0.25 delta for credit spreads (68-85% probability OTM)
- **Spread width:** $2.50-$10 depending on stock price and desired risk/reward
- **Minimum credit:** At least 1/3 of spread width for adequate reward
- **IV Rank:** Higher IV = better premium collection opportunity
- **Earnings:** Avoid spreads that span earnings dates unless intentional

### Probability of Profit (PoP)
Calculate PoP for each spread using the formula:
- For credit spreads: PoP ≈ 1 − (Premium Received / Spread Width)
- More precisely: use delta of short strike as approximation (e.g., 0.20 delta ≈ 80% PoP)

## Account Context

| Setting | Value |
|---------|-------|
| Account Size | $${formData.accountSize} |
| Cash Available | $${formData.cashAvailable} |
| Mode | ${formData.mode === 'cash_secured' ? 'Cash-Secured' : 'Margin'} |
| Experience Level | ${formData.experienceLevel} |
| Target Monthly Income | $${formData.targetMonthlyIncome} |
| Market Outlook | ${formData.marketOutlook} |
| Target Delta | ${formData.targetDelta} |
| Target DTE | ${formData.targetDte} days |

## Watchlist to Analyze

${tickers.map(t => `- ${t}`).join('\n')}

${marketDataText ? `## Live Market Data (from Yahoo Finance)

**IMPORTANT: Use the live data below for your analysis. These are real-time prices and options chain data. Do NOT estimate values that are provided here — use the actual numbers. If data for a ticker is marked unavailable, use your best estimates and note it.**

${marketDataText}
` : ''}

## Required Output

For each ticker, provide a thorough analysis of all three spread strategies, then at the END of your response, include a JSON block with this exact structure:

\`\`\`json
{
  "spreadTrades": [
    {
      "ticker": "AAPL",
      "strategy": "Bull Put Spread",
      "shortStrike": 225,
      "longStrike": 220,
      "spreadWidth": 5,
      "premium": 1.65,
      "maxProfit": 165,
      "maxLoss": 335,
      "breakeven": 223.35,
      "probabilityOfProfit": 78,
      "buyingPowerRequired": 335,
      "dte": 35,
      "shortDelta": 0.20,
      "returnOnRisk": 49.3,
      "verdict": "SELL|WAIT|SKIP",
      "rationale": "Strong support at $222, IV rank at 45th percentile provides decent premium. 78% PoP with 49% return on risk if successful."
    },
    {
      "ticker": "AAPL",
      "strategy": "Bear Call Spread",
      "shortStrike": 255,
      "longStrike": 260,
      "spreadWidth": 5,
      "premium": 1.45,
      "maxProfit": 145,
      "maxLoss": 355,
      "breakeven": 256.45,
      "probabilityOfProfit": 75,
      "buyingPowerRequired": 355,
      "dte": 35,
      "shortDelta": 0.25,
      "returnOnRisk": 40.8,
      "verdict": "SELL|WAIT|SKIP",
      "rationale": "Resistance at $258, but bullish momentum makes this riskier. Consider only if neutral-bearish."
    },
    {
      "ticker": "AAPL",
      "strategy": "Iron Condor",
      "shortStrike": 225,
      "longStrike": 220,
      "shortCallStrike": 255,
      "longCallStrike": 260,
      "spreadWidth": 5,
      "premium": 3.10,
      "maxProfit": 310,
      "maxLoss": 190,
      "breakeven": 221.90,
      "upperBreakeven": 258.10,
      "lowerBreakeven": 221.90,
      "probabilityOfProfit": 65,
      "buyingPowerRequired": 190,
      "dte": 35,
      "returnOnRisk": 163.2,
      "verdict": "SELL|WAIT|SKIP",
      "rationale": "Wide range between $225-$255 captures most likely price action. Combined premium of $3.10 provides 163% return on risk."
    }
  ],
  "spreadsSummary": {
    "totalStrategies": 9,
    "bestStrategy": "Bull Put Spread on AAPL",
    "totalMaxProfit": 620,
    "avgProbabilityOfProfit": 72,
    "totalBuyingPower": 880
  }
}
\`\`\`

**Field definitions:**
- \`ticker\`: Stock symbol
- \`strategy\`: "Bull Put Spread", "Bear Call Spread", or "Iron Condor"
- \`shortStrike\`: Strike price of the short option (for Iron Condor, this is the short put strike)
- \`longStrike\`: Strike price of the long option (for Iron Condor, this is the long put strike)
- \`shortCallStrike\`: (Iron Condor only) Strike price of the short call
- \`longCallStrike\`: (Iron Condor only) Strike price of the long call
- \`spreadWidth\`: Distance between strikes in dollars
- \`premium\`: Net credit received per share
- \`maxProfit\`: Maximum profit per contract in dollars (premium × 100)
- \`maxLoss\`: Maximum loss per contract in dollars ((spreadWidth − premium) × 100)
- \`breakeven\`: Breakeven price (for iron condors, this is lowerBreakeven)
- \`upperBreakeven\`: (Iron Condor only) Upper breakeven price
- \`lowerBreakeven\`: (Iron Condor only) Lower breakeven price
- \`probabilityOfProfit\`: Estimated PoP as a percentage (e.g., 78 means 78%)
- \`buyingPowerRequired\`: Capital at risk per contract in dollars (= maxLoss)
- \`dte\`: Days to expiration
- \`shortDelta\`: Delta of the short strike (omit for Iron Condor)
- \`returnOnRisk\`: (maxProfit / maxLoss) × 100 as a percentage
- \`verdict\`: SELL (good trade), WAIT (conditions not ideal yet), SKIP (not suitable)
- \`rationale\`: Brief explanation of the verdict

**Important rules:**
- All monetary values for \`premium\` are PER SHARE (multiply by 100 for per-contract)
- \`maxProfit\`, \`maxLoss\`, \`buyingPowerRequired\` are PER CONTRACT (already multiplied by 100)
- \`probabilityOfProfit\` and \`returnOnRisk\` are percentages (e.g., 78 means 78%)
- For each ticker, provide ALL THREE strategies (Bull Put, Bear Call, Iron Condor)
- Only give a "SELL" verdict if: PoP >= 65% AND premium >= 1/3 of spread width AND no earnings within DTE
- Use realistic, current market-based estimates for all prices and premiums
- The JSON block MUST appear at the very end of your response

Provide your full analysis now.`
}

function parseSpreadsResponse(responseText, formData) {
  // Extract JSON block
  let jsonData = null
  try {
    const jsonMatch = responseText.match(/```json\s*\n?([\s\S]*?)\n?```/i)
    if (jsonMatch && jsonMatch[1]) {
      jsonData = JSON.parse(jsonMatch[1].trim())
    }
  } catch (error) {
    console.error('Failed to parse Spreads JSON:', error.message)
  }

  return {
    mode: 'Spreads',
    spreadTrades: jsonData?.spreadTrades || [],
    spreadsSummary: jsonData?.spreadsSummary || null,
    fullAnalysis: responseText,
    jsonParsed: jsonData !== null,
    // Include empty standard fields so the UI doesn't break
    trades: [],
    skipList: [],
    watchlistItems: [],
    summaryData: null,
    keyDates: [],
    pmccTrades: [],
    pmccSummary: null,
  }
}
