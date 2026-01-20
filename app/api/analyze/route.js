import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { formData } = await request.json()

    // Build the full Wheel Committee prompt
    const prompt = buildFullPrompt(formData)

    // Call Claude API with extended token limit for comprehensive analysis
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

    // Parse the response
    const responseText = message.content[0].text
    const result = parseResponse(responseText)

    return Response.json(result)
  } catch (error) {
    console.error('Analysis error:', error)
    return Response.json(
      { error: 'Analysis failed', details: error.message },
      { status: 500 }
    )
  }
}

function buildFullPrompt(formData) {
  const hasWatchlist = formData.watchlist && formData.watchlist.trim().length > 0
  const hasPositions = formData.currentPositions && formData.currentPositions.trim().length > 0

  return `# TheMoneyProgram — The Wheel Committee Analysis
## US Options Income Strategy
### Systematic Premium Collection via Cash-Secured Puts & Covered Calls

You are an AI Wheel Committee applying The Wheel Strategy to make disciplined options trading decisions for income generation.

**Design goal:** Generate consistent income by selling options on quality stocks you'd be happy to own, with clear rules, defined risk, and full transparency on every trade.

---

# EDUCATION-ONLY DISCLAIMER

This is educational decision-support for options trading, not regulated advice.

**CRITICAL WARNINGS:**
- Options involve substantial risk and are not suitable for all investors
- You can lose more than your initial investment when using margin
- The Wheel Strategy requires willingness to own the underlying stock
- Assignment can happen at any time for American-style options
- Past premium income does not guarantee future results
- The user makes the final decision and bears all risk
- Minimum recommended account size: **$20,000**

**IMPORTANT:** This product is designed for **US markets only**. US-listed stocks and US exchanges.

---

# THE WHEEL STRATEGY

The Wheel is a systematic options income strategy:

1. **PHASE 1 - CASH:** Start with cash, ready to deploy
2. **SELL CASH-SECURED PUT:** Collect premium, agree to buy shares at strike if assigned
3. **IF EXPIRES WORTHLESS:** Keep premium, repeat from Phase 1
4. **IF ASSIGNED:** Buy 100 shares at strike price
5. **PHASE 2 - SHARES:** Now own the stock
6. **SELL COVERED CALL:** Collect premium, agree to sell shares at strike if called
7. **IF EXPIRES WORTHLESS:** Keep premium + shares, sell another call
8. **IF CALLED AWAY:** Sell shares at strike, keep premium, return to Phase 1

---

# THE WHEEL SCORE™

Rate stocks 1-10 based on:

| Factor | Weight | What We Want |
|--------|--------|--------------|
| Options Liquidity | 20% | Tight spreads (<$0.10), high OI (>1000) |
| IV Rank | 15% | 30-70% ideal (good premium without blow-up risk) |
| Stock Quality | 20% | Would own for 2+ years, profitable, moat |
| Price Range | 15% | $20-$200 sweet spot for capital efficiency |
| Dividend Yield | 10% | 1-4% ideal as bonus income |
| Earnings Predictability | 10% | Low surprise factor |
| Sector Stability | 10% | Not meme stocks, not extreme cyclicals |

**Interpretation:**
- 8.5-10: Excellent — prioritize
- 7.0-8.4: Very Good — include in rotation
- 5.5-6.9: Acceptable — be selective
- <5.5: Consider alternatives

---

# RISK MANAGEMENT (NON-NEGOTIABLE)

## Position Sizing

${formData.mode === 'cash_secured' ? `
**CASH-SECURED MODE:**
- Each position requires full cash coverage for assignment
- Capital Required = Strike Price × 100 shares
` : `
**MARGIN MODE:**
- Buying Power Reduction (BPR) ≈ 20% of notional for most stocks
- WARNING: Margin amplifies losses. Only use if experienced.
`}

## Key Limits
- Account Size: $${formData.accountSize}
- Cash Available: $${formData.cashAvailable}
${formData.mode === 'margin' ? `- Buying Power: $${formData.buyingPower}` : ''}
- Max Single Position: ${formData.maxSinglePosition}% of account
- Max Sector Exposure: ${formData.maxSectorExposure}%
- Min Wheel Score: ${formData.minWheelScore}
- Target Monthly Income: $${formData.targetMonthlyIncome}
- Experience Level: ${formData.experienceLevel}
- Options Approval Level: ${formData.optionsLevel}

## Diversification Rules
- Max Single Stock: 30% (cash-secured) / 20% (margin)
- Max Single Sector: 40%
- Min Positions: 3+ when account allows

## Earnings Rule (CRITICAL)
- >21 days to earnings: Safe to open
- 14-21 days: Close or roll before earnings
- <14 days: Do NOT open new position
- Earnings week: Position must be closed

## Assignment Comfort Test
Before ANY put: Would I buy this stock at this price without the premium? Would I hold 6+ months if it dropped 20%?

---

# STRIKE & EXPIRY SELECTION

## Delta-Based Selection
| Delta | Prob OTM | Best For |
|-------|----------|----------|
| 0.10-0.15 | 85-90% | Very conservative |
| 0.16-0.20 | 80-84% | Standard recommendation |
| 0.21-0.30 | 70-79% | Income-focused |
| 0.31-0.40 | 60-69% | Aggressive |

Target Delta: ${formData.targetDelta}

## Expiry Selection (DTE)
| DTE | Best For |
|-----|----------|
| 7-14 | Active traders |
| 21-30 | Monthly income |
| 30-45 | Optimal theta (recommended) |
| 45-60 | Patient traders |

Target DTE: ${formData.targetDte} days

## Premium Targets
- Minimum Annualized Return: >15%
- Target Monthly Premium: 1.5-2% of capital at risk

---

# INPUTS FOR THIS SESSION

| Input | Value |
|-------|-------|
| Session Type | ${formData.sessionType} |
| Mode | ${formData.mode === 'cash_secured' ? 'Cash-Secured' : 'Margin'} |
| Market Outlook | ${formData.marketOutlook} |
| Target Delta | ${formData.targetDelta} |
| Target DTE | ${formData.targetDte} days |

---

${hasPositions ? `# CURRENT OPEN POSITIONS

${formData.currentPositions}

**Format:** Type, Ticker, Strike, Expiry, Premium, Opened

For each open position, provide:
- Current status assessment
- P&L estimate
- Recommended action: HOLD / CLOSE / ROLL
- If ROLL: suggested new strike/expiry

---` : '# CURRENT OPEN POSITIONS\n\nNo open positions.\n\n---'}

${hasWatchlist ? `# WATCHLIST TO ANALYZE

${formData.watchlist}

For each watchlist ticker, provide:

### [TICKER] — [Company Name]

**Wheel Score™:** X.X/10 [⭐⭐⭐⭐⭐]

**Scoring Breakdown:**
| Factor | Score | Notes |
|--------|-------|-------|
| Options Liquidity | X/10 | |
| IV Rank | X/10 | |
| Stock Quality | X/10 | |
| Price Range | X/10 | |
| Dividend Yield | X/10 | |
| Earnings Predictability | X/10 | |
| Sector Stability | X/10 | |

**Trade Recommendation (if score ≥ ${formData.minWheelScore}):**

| Field | Value |
|-------|-------|
| Action | SELL TO OPEN |
| Contract | [TICKER] [DATE] $[STRIKE] PUT |
| Expiry | [Date] ([XX] DTE) |
| Delta | 0.XX |
| IV Rank | XX% |
| Premium (Mid) | $X.XX ($XXX per contract) |
| Cash Required | $XX,XXX |
| Monthly Return | X.XX% |
| Annualized Return | XX.X% |
| Breakeven | $XX.XX |

**Scenarios:**
- Expires Worthless (XX%): Keep $XXX premium, repeat
- Assigned (XX%): Buy 100 shares at effective cost $XX.XX, sell covered calls

**Earnings Check:** [Date] — [SAFE / CLOSE BEFORE / SKIP]
**Assignment Comfort:** [PASSED / FAILED]
**Verdict:** [SELL / WAIT / SKIP]

---` : ''}

# REQUIRED OUTPUT

## PART A — ACCOUNT SNAPSHOT

| Metric | Value |
|--------|-------|
| Account Size | $${formData.accountSize} |
| Cash Available | $${formData.cashAvailable} |
| Mode | ${formData.mode === 'cash_secured' ? 'Cash-Secured' : 'Margin'} |
| Current Positions | [Count] |
| Capital Deployed | $XX,XXX |
| Available for New Trades | $XX,XXX |

---

${hasPositions ? `## PART B — POSITION REVIEW

For each position:
| Ticker | Type | Strike | Expiry | DTE | P&L | Status | Action |
|--------|------|--------|--------|-----|-----|--------|--------|

**Summary:** [X positions reviewed]

---` : ''}

${hasWatchlist ? `## PART C — WATCHLIST ANALYSIS

For each stock on the watchlist, provide the full Wheel Score™ analysis and trade recommendation as specified above.

---` : ''}

## PART D — RECOMMENDED TRADES

Rank the top opportunities by risk-adjusted return:

### TRADE 1 (Highest Priority)
[Full trade details]

### TRADE 2
[Full trade details]

### TRADE 3
[Full trade details]

---

## PART E — ACTION SUMMARY

**This session's trades:**

| Action | Ticker | Contract | Premium | Cash Required | Return |
|--------|--------|----------|---------|---------------|--------|

**Total Premium This Session:** $XXX
**Total Capital Deployed:** $XX,XXX
**Estimated Monthly Income:** $XXX
**Annualized Portfolio Return:** XX.X%

**Skip This Week:**
- [Ticker] — [Reason: earnings, low IV, etc.]

**Watch for Next Session:**
- [Ticker] — [Setup developing]

---

## PART F — INCOME DASHBOARD

| Metric | Value |
|--------|-------|
| Positions After This Session | X |
| Total Capital Deployed | $XX,XXX |
| Total Premium Open | $XXX |
| Portfolio Heat | XX% |
| Estimated Monthly Income | $XXX |
| Annualized Return Target | XX% |

---

Be specific, practical, and conservative. Always prioritize capital preservation over premium maximization. Mark any data that needs verification as **NEEDS CHECK**.`
}

function parseResponse(responseText) {
  const result = {
    mode: extractMode(responseText),
    summary: extractSummary(responseText),
    trades: extractTrades(responseText),
    accountSnapshot: extractSection(responseText, 'PART A', 'PART B') || extractSection(responseText, 'ACCOUNT SNAPSHOT', 'PART B'),
    positionReview: extractSection(responseText, 'PART B', 'PART C') || extractSection(responseText, 'POSITION REVIEW', 'PART C'),
    watchlistAnalysis: extractSection(responseText, 'PART C', 'PART D') || extractSection(responseText, 'WATCHLIST ANALYSIS', 'PART D'),
    recommendedTrades: extractSection(responseText, 'PART D', 'PART E') || extractSection(responseText, 'RECOMMENDED TRADES', 'PART E'),
    actionSummary: extractSection(responseText, 'PART E', 'PART F') || extractSection(responseText, 'ACTION SUMMARY', 'PART F'),
    incomeDashboard: extractSection(responseText, 'PART F', null) || extractSection(responseText, 'INCOME DASHBOARD', null),
    fullAnalysis: responseText
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
  const summaryMatch = responseText.match(/This session's trades:[\s\S]*?(?=\*\*Skip|\*\*Watch|---|\n\n\*\*)/i)
  if (summaryMatch) {
    return summaryMatch[0].trim()
  }

  // Fallback to first substantial paragraph
  const paragraphs = responseText.split('\n\n').filter(p => p.length > 100)
  return paragraphs[0]?.substring(0, 500) || 'Analysis complete. Review full report below.'
}

function extractSection(text, startMarker, endMarker) {
  const startPatterns = [
    new RegExp(`## ${startMarker}[\\s\\S]*?(?=## ${endMarker}|$)`, 'i'),
    new RegExp(`### ${startMarker}[\\s\\S]*?(?=### ${endMarker}|## ${endMarker}|$)`, 'i'),
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

function extractTrades(text) {
  const trades = []

  // Look for trade sections with ticker headers
  const tickerMatches = text.matchAll(/###\s*(?:TRADE\s*\d+[:\s-]*)?([A-Z]{1,5})\s*[-—]\s*([^\n]+)/gi)
  for (const match of tickerMatches) {
    const ticker = match[1]
    const name = match[2].trim()

    // Find the section for this ticker
    const sectionStart = match.index
    const sectionEnd = text.indexOf('###', sectionStart + 1)
    const section = text.substring(sectionStart, sectionEnd > 0 ? sectionEnd : sectionStart + 2000)

    // Extract wheel score
    const scoreMatch = section.match(/Wheel Score[™:]?\s*(\d+\.?\d*)\/10/i)
    const wheelScore = scoreMatch ? parseFloat(scoreMatch[1]) : null

    // Extract verdict
    const verdictMatch = section.match(/Verdict[:\s]*\*?\*?(SELL|WAIT|SKIP)/i)
    const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : null

    // Extract premium
    const premiumMatch = section.match(/Premium[^$]*\$(\d+\.?\d*)/i)
    const premium = premiumMatch ? parseFloat(premiumMatch[1]) : null

    // Extract strike
    const strikeMatch = section.match(/Strike[:\s|]*\$?(\d+\.?\d*)/i)
    const strike = strikeMatch ? parseFloat(strikeMatch[1]) : null

    // Extract return
    const returnMatch = section.match(/(?:Monthly|Annualized)\s*Return[:\s|]*(\d+\.?\d*)%/i)
    const returnPct = returnMatch ? parseFloat(returnMatch[1]) : null

    trades.push({
      ticker,
      name,
      wheelScore,
      verdict,
      premium,
      strike,
      returnPct
    })
  }

  // Also look for table format trades
  const tableMatches = text.matchAll(/\|\s*([A-Z]{2,5})\s*\|[^|]*\|[^|]*\$?(\d+\.?\d*)[^|]*\|/g)
  for (const match of tableMatches) {
    const existing = trades.find(t => t.ticker === match[1])
    if (!existing && match[1] !== 'Ticker' && match[1] !== 'Action') {
      trades.push({
        ticker: match[1],
        strike: match[2] ? parseFloat(match[2]) : null
      })
    }
  }

  return trades.filter(t => t.ticker && t.ticker.length >= 2 && t.ticker.length <= 5)
}
