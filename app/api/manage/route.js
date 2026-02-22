import Anthropic from '@anthropic-ai/sdk'
import { fetchAllMarketData, formatMarketDataForSpreadsPrompt } from '@/lib/yahooFinance'

// Allow up to 5 minutes for roll analysis
export const maxDuration = 300

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { position, formData } = await request.json()

    // Fetch live market data for the position's ticker
    let marketDataText = ''
    try {
      const marketData = await fetchAllMarketData([position.ticker])
      marketDataText = formatMarketDataForSpreadsPrompt(marketData)
    } catch (err) {
      console.error('Market data fetch failed:', err.message)
      marketDataText = '**Live market data unavailable.** Use your best estimates.\n'
    }

    const prompt = buildManagePrompt(position, formData, marketDataText)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const responseText = message.content[0].text
    const result = parseManageResponse(responseText)

    return Response.json(result)
  } catch (error) {
    console.error('Trade management error:', error)
    return Response.json(
      { error: 'Trade management failed', details: error.message },
      { status: 500 }
    )
  }
}

function buildManagePrompt(position, formData, marketDataText = '') {
  return `# Trade Management — Roll Recommendation

You are an options trade management specialist. A trader has an open position that needs a rolling recommendation.

## Current Open Position

| Field | Value |
|-------|-------|
| Type | ${position.type} |
| Ticker | ${position.ticker} |
| Strike | $${position.strike} |
| Expiration | ${position.expiry} |
| Premium Received | $${position.premium} |
| Date Opened | ${position.opened} |
| DTE Remaining | ${position.dte} days |

## Account Context

| Setting | Value |
|---------|-------|
| Account Size | $${formData.accountSize} |
| Cash Available | $${formData.cashAvailable} |
| Mode | ${formData.mode === 'cash_secured' ? 'Cash-Secured' : 'Margin'} |
| Experience Level | ${formData.experienceLevel} |

## Live Market Data

${marketDataText}

## Instructions

Analyse this position and recommend a roll. A roll means:
1. **Close** the current position (buy back the option)
2. **Open** a new position at a later expiration (and possibly different strike)

Consider:
- Current market price relative to the strike
- Time remaining (theta decay)
- Whether the position is being tested (stock approaching strike)
- Whether to roll out (same strike, later expiry) or out-and-down/up (new strike + later expiry)
- The net credit or debit of the roll

## Required Output

Provide a brief analysis, then at the END include a JSON block:

\`\`\`json
{
  "rollRecommendation": {
    "action": "ROLL|CLOSE|HOLD",
    "closeCost": 1.85,
    "newStrike": 175,
    "newExpiry": "2026-03-21",
    "newPremium": 3.20,
    "netCredit": 1.35,
    "newDTE": 30,
    "rationale": "Stock is approaching strike with 5 DTE remaining. Roll out and down to $175 for March expiry, collecting $1.35 net credit. This gives more room and extends the trade."
  }
}
\`\`\`

**Field definitions:**
- \`action\`: ROLL (roll to new position), CLOSE (close for profit/loss, don't reopen), HOLD (keep current position)
- \`closeCost\`: Estimated cost to buy back the current option (per share)
- \`newStrike\`: Recommended new strike price (null if CLOSE or HOLD)
- \`newExpiry\`: Recommended new expiration date (null if CLOSE or HOLD)
- \`newPremium\`: Estimated premium for the new position (per share, null if CLOSE or HOLD)
- \`netCredit\`: Net credit (positive) or debit (negative) of the roll (newPremium - closeCost)
- \`newDTE\`: Days to expiration of the new position (null if CLOSE or HOLD)
- \`rationale\`: Brief explanation of the recommendation

All monetary values are PER SHARE. The JSON block MUST appear at the very end.

Provide your analysis now.`
}

function parseManageResponse(responseText) {
  let jsonData = null
  try {
    const jsonMatch = responseText.match(/```json\s*\n?([\s\S]*?)\n?```/i)
    if (jsonMatch && jsonMatch[1]) {
      jsonData = JSON.parse(jsonMatch[1].trim())
    }
  } catch (error) {
    console.error('Failed to parse manage JSON:', error.message)
  }

  return {
    rollRecommendation: jsonData?.rollRecommendation || null,
    fullAnalysis: responseText,
    jsonParsed: jsonData !== null,
  }
}
