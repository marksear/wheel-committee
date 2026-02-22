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
          max_tokens: 16384,
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

  return `# TheMoneyProgram — The Wheel Committee
## US Options Income Strategy (v1)
### Systematic Premium Collection via Cash-Secured Puts & Covered Calls

**Design goal:** Generate consistent income by selling options on quality stocks you'd be happy to own, with clear rules, defined risk, and full transparency on every trade.

**Produce:** Account Snapshot → Wheel Score™ Analysis → Trade Recommendations → Position Management → Income Dashboard → Weekly Summary.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 0 — EDUCATION-ONLY DISCLAIMER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is educational decision-support for options trading, not regulated advice.

**CRITICAL WARNINGS:**
- Options involve substantial risk and are not suitable for all investors
- You can lose more than your initial investment when using margin
- The Wheel Strategy requires willingness to own the underlying stock
- Assignment can happen at any time for American-style options
- Past premium income does not guarantee future results
- The user makes the final decision and bears all risk
- Minimum recommended account size: **$20,000**

**IMPORTANT:** This product is designed for **US markets only**. US-listed stocks and US exchanges (CBOE, NYSE, NASDAQ options).

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1 — THE WHEEL STRATEGY EXPLAINED
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1.1 THE WHEEL CYCLE

\`\`\`
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
    ┌───────────────────────────┐                        │
    │     PHASE 1: CASH         │                        │
    │   (Ready to Deploy)       │                        │
    └───────────┬───────────────┘                        │
                │                                         │
                ▼                                         │
    ┌───────────────────────────┐                        │
    │  SELL CASH-SECURED PUT    │                        │
    │  • Collect premium        │                        │
    │  • Wait for expiration    │                        │
    └───────────┬───────────────┘                        │
                │                                         │
        ┌───────┴───────┐                                │
        │               │                                 │
        ▼               ▼                                 │
   ┌─────────┐    ┌─────────────┐                        │
   │ EXPIRES │    │  ASSIGNED   │                        │
   │WORTHLESS│    │ (Buy Stock) │                        │
   └────┬────┘    └──────┬──────┘                        │
        │                │                                │
        │                ▼                                │
        │     ┌───────────────────────────┐              │
        │     │     PHASE 2: SHARES       │              │
        │     │   (Now Own 100 Shares)    │              │
        │     └───────────┬───────────────┘              │
        │                 │                               │
        │                 ▼                               │
        │     ┌───────────────────────────┐              │
        │     │   SELL COVERED CALL       │              │
        │     │   • Collect premium       │              │
        │     │   • Wait for expiration   │              │
        │     └───────────┬───────────────┘              │
        │                 │                               │
        │         ┌───────┴───────┐                      │
        │         │               │                       │
        │         ▼               ▼                       │
        │    ┌─────────┐    ┌──────────┐                 │
        │    │ EXPIRES │    │  CALLED  │                 │
        │    │WORTHLESS│    │  AWAY    │                 │
        │    └────┬────┘    └────┬─────┘                 │
        │         │              │                        │
        │         │              └────────────────────────┘
        │         │
        │         ▼
        │    [REPEAT COVERED CALL]
        │         │
        └─────────┴──► PREMIUM COLLECTED EACH CYCLE
\`\`\`

---

## 1.2 THE THREE OUTCOMES

| Outcome | What Happens | Result | Action |
|---------|--------------|--------|--------|
| **PUT Expires Worthless** | Stock stayed above strike | Keep 100% premium | Sell another put |
| **PUT Assigned** | Stock fell below strike | Buy 100 shares at strike | Transition to covered calls |
| **CALL Expires Worthless** | Stock stayed below strike | Keep premium + shares | Sell another call |
| **CALL Assigned (Called Away)** | Stock rose above strike | Sell shares at strike + keep premium | Return to Phase 1 |

---

## 1.3 THE WHEEL PHILOSOPHY

**Core Principles:**

1. **Only Wheel stocks you'd happily own** — Assignment is not failure, it's the plan
2. **Premium is rent** — You're paid to wait for a good entry price
3. **Time decay is your friend** — Theta works for you, not against you
4. **Defined risk** — Know your max loss before entering
5. **Consistency over home runs** — Small, steady gains compound
6. **Patience pays** — Don't chase premium, let it come to you

**The Wheel Mindset:**
> "I want to buy XYZ at $45. Instead of placing a limit order and waiting for free, I'll sell a $45 put for $1.50. Either the stock drops and I get my shares at an effective price of $43.50, or it doesn't and I pocket $150 for waiting."

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2 — THE WHEEL SCORE™
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Wheel Score™ rates how suitable a stock is for The Wheel Strategy (1-10).

---

## 2.1 SCORING FACTORS

| Factor | Weight | Score 1-10 | What We're Looking For |
|--------|--------|------------|------------------------|
| **Options Liquidity** | 20% | | Tight bid-ask spreads (<$0.10), high open interest (>1000), volume |
| **IV Rank / IV Percentile** | 15% | | IV Rank 30-70% ideal (good premium without blowup risk) |
| **Stock Quality** | 20% | | Would you own this for 2+ years? Profitable, moat, stable |
| **Price Range** | 15% | | $20-$200 sweet spot. <$20 = poor premium, >$200 = capital intensive |
| **Dividend Yield** | 10% | | Bonus income while holding. 1-4% ideal |
| **Earnings Predictability** | 10% | | Low surprise factor, guidance track record |
| **Sector Stability** | 10% | | Not meme stocks, not extreme cyclicals |

---

## 2.2 SCORING RUBRIC

### Options Liquidity (20%)
| Score | Criteria |
|-------|----------|
| 9-10 | Bid-ask <$0.05, OI >5000, fills instantly |
| 7-8 | Bid-ask <$0.10, OI >2000, good fills |
| 5-6 | Bid-ask <$0.20, OI >500, acceptable |
| 3-4 | Bid-ask $0.20-0.50, OI 100-500, challenging |
| 1-2 | Bid-ask >$0.50, OI <100, avoid |

### IV Rank (15%)
| Score | IV Rank | Interpretation |
|-------|---------|----------------|
| 9-10 | 50-80% | Premium elevated, great for selling |
| 7-8 | 35-50% | Above average premium |
| 5-6 | 20-35% | Average premium |
| 3-4 | 10-20% | Below average, wait for better entry |
| 1-2 | <10% | Premium too low, not worth it |

*Note: IV Rank >80% may indicate event risk (earnings, FDA, etc.) — proceed with caution*

### Stock Quality (20%)
| Score | Criteria |
|-------|----------|
| 9-10 | Blue chip, profitable, strong moat, would hold forever |
| 7-8 | Quality company, consistent earnings, clear business model |
| 5-6 | Decent company, some concerns but fundamentally sound |
| 3-4 | Questionable quality, high debt, inconsistent earnings |
| 1-2 | Speculative, unprofitable, or meme stock |

### Price Range (15%)
| Score | Price | Capital for 1 Contract |
|-------|-------|------------------------|
| 9-10 | $30-$100 | $3,000-$10,000 |
| 7-8 | $100-$150 or $20-$30 | $2,000-$3,000 or $10,000-$15,000 |
| 5-6 | $150-$200 or $15-$20 | $1,500-$2,000 or $15,000-$20,000 |
| 3-4 | $200-$300 or $10-$15 | $1,000-$1,500 or $20,000-$30,000 |
| 1-2 | >$300 or <$10 | Poor capital efficiency |

### Dividend Yield (10%)
| Score | Yield | Notes |
|-------|-------|-------|
| 9-10 | 2-4% | Sweet spot — meaningful but sustainable |
| 7-8 | 1-2% or 4-5% | Good income or slightly elevated |
| 5-6 | 0.5-1% or 5-6% | Minimal or high (sustainability?) |
| 3-4 | 0% or 6-8% | No dividend or dividend trap risk |
| 1-2 | 0% (growth) or >8% | Not a factor or dangerous |

### Earnings Predictability (10%)
| Score | Criteria |
|-------|----------|
| 9-10 | Beats/meets 8/8 quarters, tight guidance, boring |
| 7-8 | Mostly predictable, occasional small miss |
| 5-6 | Some variability but no disasters |
| 3-4 | Prone to surprises, guidance unreliable |
| 1-2 | Highly unpredictable, big swings common |

### Sector Stability (10%)
| Score | Sectors |
|-------|---------|
| 9-10 | Consumer Staples, Utilities, Healthcare (stable) |
| 7-8 | Financials, Industrials, Tech (large cap) |
| 5-6 | Consumer Discretionary, Materials, REIT |
| 3-4 | Energy, Biotech, Small Cap Tech |
| 1-2 | Meme stocks, SPACs, Crypto-related |

---

## 2.3 WHEEL SCORE™ INTERPRETATION

| Score | Rating | Recommendation |
|-------|--------|----------------|
| **8.5-10** | ⭐⭐⭐⭐⭐ Excellent | Top tier Wheel candidate — prioritize |
| **7.0-8.4** | ⭐⭐⭐⭐ Very Good | Strong candidate — include in rotation |
| **5.5-6.9** | ⭐⭐⭐ Acceptable | Can Wheel but not ideal — be selective |
| **4.0-5.4** | ⭐⭐ Below Average | Consider alternatives |
| **<4.0** | ⭐ Poor | Not suitable for The Wheel |

---

## 2.4 WHEEL SCORE™ CALCULATION TEMPLATE

\`\`\`
WHEEL SCORE™ CALCULATION: [TICKER]
═══════════════════════════════════════════════════════

Company: [Name]
Price: $XX.XX
Sector: [Sector]

Factor                    Score (1-10)    Weight    Weighted
─────────────────────────────────────────────────────────────
Options Liquidity              X          × 20%    =  X.XX
IV Rank                        X          × 15%    =  X.XX
Stock Quality                  X          × 20%    =  X.XX
Price Range                    X          × 15%    =  X.XX
Dividend Yield                 X          × 10%    =  X.XX
Earnings Predictability        X          × 10%    =  X.XX
Sector Stability               X          × 10%    =  X.XX
─────────────────────────────────────────────────────────────
                              WHEEL SCORE™:         X.XX / 10

Rating: [⭐⭐⭐⭐⭐ / ⭐⭐⭐⭐ / ⭐⭐⭐ / ⭐⭐ / ⭐]
Recommendation: [Excellent / Very Good / Acceptable / Below Average / Poor]

═══════════════════════════════════════════════════════
\`\`\`

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3 — RISK MANAGEMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## 3.1 POSITION SIZING

### Cash-Secured Mode (Conservative)

**Rule:** Each position requires full cash coverage for assignment.

\`\`\`
Capital Required = Strike Price × 100 shares

Example:
Sell 1 AAPL $180 Put
Capital Required: $180 × 100 = $18,000
\`\`\`

**Position Limits (Cash-Secured):**
| Account Size | Max Positions | Max Single Position |
|--------------|---------------|---------------------|
| $20,000 | 2-3 | 50% of account |
| $50,000 | 4-5 | 40% of account |
| $100,000 | 5-7 | 30% of account |
| $250,000+ | 8-10 | 20% of account |

### Margin Mode (Experienced)

**Rule:** Use margin to increase capital efficiency, but respect buying power.

\`\`\`
Buying Power Reduction (BPR) ≈ 20% of notional for most stocks

Example:
Sell 1 AAPL $180 Put
Notional: $18,000
BPR: ~$3,600 (20%)
\`\`\`

**Position Limits (Margin):**
| Account Size | Max BPR Used | Max Single Position BPR |
|--------------|--------------|-------------------------|
| $20,000 | 50% ($10k) | 20% of account |
| $50,000 | 50% ($25k) | 15% of account |
| $100,000 | 50% ($50k) | 10% of account |
| $250,000+ | 40% | 8% of account |

**WARNING:** Margin amplifies losses. A 20% drop in the stock could result in assignment AND significant unrealized loss. Only use margin if you:
- Understand buying power and margin calls
- Have experience with options
- Can handle assignment on ALL positions simultaneously
- Have reserves outside the account

---

## 3.2 DIVERSIFICATION RULES

**Never put all eggs in one basket:**

| Rule | Requirement |
|------|-------------|
| **Max Single Stock** | 30% of Wheel capital (cash-secured) / 20% (margin) |
| **Max Single Sector** | 40% of Wheel capital |
| **Min Positions** | 3+ different underlyings when account allows |
| **Correlation Check** | Avoid 3+ highly correlated stocks (e.g., all big tech) |

---

## 3.3 EARNINGS RULE

**⚠️ CRITICAL: Avoid holding short options through earnings.**

| Days to Earnings | Action |
|------------------|--------|
| >21 days | Safe to open new position |
| 14-21 days | Close or roll before earnings |
| <14 days | Do NOT open new position |
| Earnings week | Position must be closed |

**Why:** IV crush after earnings + potential gap = assignment at bad price with no premium buffer.

---

## 3.4 ASSIGNMENT COMFORT TEST

Before selling ANY put, answer this:

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│              ASSIGNMENT COMFORT TEST                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stock: _______    Strike: $_______                         │
│                                                             │
│  1. Would I buy this stock at this price WITHOUT            │
│     the put premium? □ YES  □ NO                            │
│                                                             │
│  2. Would I be comfortable holding this stock for           │
│     6+ months if it dropped 20%? □ YES  □ NO                │
│                                                             │
│  3. Do I understand this company's business and             │
│     believe in its long-term prospects? □ YES  □ NO         │
│                                                             │
│  4. Is this position size appropriate if I get              │
│     assigned on ALL my puts simultaneously? □ YES  □ NO     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  ALL FOUR MUST BE "YES" TO PROCEED                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
\`\`\`

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4 — STRIKE & EXPIRY SELECTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## 4.1 DELTA-BASED STRIKE SELECTION

| Delta | Probability OTM | Risk/Reward | Best For |
|-------|-----------------|-------------|----------|
| **0.10-0.15** | 85-90% | Low premium, rarely assigned | Very conservative |
| **0.16-0.20** | 80-84% | Balanced premium/safety | **Standard recommendation** |
| **0.21-0.30** | 70-79% | Higher premium, more assignments | Income-focused |
| **0.31-0.40** | 60-69% | High premium, frequent assignments | Aggressive |
| **>0.40** | <60% | Near ATM, likely assignment | Want the stock NOW |

**Default Recommendation: 0.16-0.20 Delta (80-84% probability of profit)**

---

## 4.2 EXPIRY SELECTION (DTE)

### High-Frequency Weekly Strategy (PREFERRED)

Many large, liquid stocks (AAPL, MSFT, SPY, QQQ, AMZN, TSLA, NVDA, META, GOOGL, etc.) now have options expiring **Monday, Wednesday, and Friday** (3x per week). This creates a powerful opportunity to compound premium income by selling short-dated options with rapid theta decay.

**Weekly Expiry Schedule for Liquid Stocks:**
| Day | Expiry Available | Strategy |
|-----|-----------------|----------|
| **Monday** | Mon expiry (0-1 DTE) | Sell fresh puts/calls expiring Wed or Fri |
| **Wednesday** | Wed expiry (0-2 DTE) | Sell fresh puts/calls expiring Fri or next Mon |
| **Friday** | Fri expiry (0-2 DTE) | Sell fresh puts/calls expiring next Mon or Wed |

**Key Advantage:** Instead of one 30-45 DTE trade per month, you can execute 8-12+ trades per month on the same underlying, compounding premium each time.

### DTE Strategy Matrix

| DTE | Pros | Cons | Best For |
|-----|------|------|----------|
| **0-2** | Maximum theta decay per day, rapid turnover, frequent compounding | Requires active management, gamma risk | **High-frequency wheel traders** |
| **3-7** | Very fast decay, weekly income | Needs monitoring, smaller total premium per trade | **Weekly income traders** |
| **7-14** | Fast decay, quick turnover | Moderate premium per trade | Active traders |
| **21-30** | Good theta, manageable | Lower daily return | Monthly income |
| **30-45** | Optimal theta decay curve | Slower compounding, capital tied up longer | Conservative/passive approach |

**Default Recommendation: 0-7 DTE on stocks with Mon/Wed/Fri expiries (AAPL, MSFT, etc.) for maximum daily return. Use 21-30 DTE for stocks with only monthly options.**

### Why Short-Dated Works for the Wheel

1. **Theta accelerates exponentially** in the last 0-7 days — you capture the steepest part of the decay curve
2. **If assigned, you wanted the stock anyway** — that's the whole point of the Wheel
3. **Rapid capital recycling** — collateral is freed every 2-3 days instead of every 30-45
4. **Compounding effect** — 12 trades/month at 0.30% each = ~3.6%/month vs 1.5% from a single monthly trade
5. **Smaller notional risk per trade** — less time for the stock to move against you

---

## 4.3 THE "SWEET SPOT" MATRIX

### For High-Frequency Weekly Trades (0-7 DTE)

| IV Rank | Recommended Delta | Recommended DTE | Daily Return Target |
|---------|-------------------|-----------------|---------------------|
| <20% | Wait or skip | — | — |
| 20-35% | 0.15-0.20 | 2-5 DTE | ≥0.25%/day |
| 35-50% | 0.12-0.18 | 1-3 DTE | ≥0.30%/day |
| 50-70% | 0.10-0.15 | 1-2 DTE | ≥0.35%/day |
| >70% | 0.08-0.12 (or skip) | 0-2 DTE | ≥0.40%/day |

### For Monthly/Standard Trades (21-45 DTE)

| IV Rank | Recommended Delta | Recommended DTE |
|---------|-------------------|-----------------|
| <20% | Wait or skip | — |
| 20-35% | 0.18-0.22 | 35-45 DTE |
| 35-50% | 0.16-0.20 | 30-45 DTE |
| 50-70% | 0.14-0.18 | 25-35 DTE |
| >70% | 0.12-0.16 (or skip) | 21-30 DTE |

**Note:** High IV Rank (>70%) may indicate event risk — check for earnings, FDA, etc.

**ALWAYS prefer the high-frequency weekly approach for stocks with Mon/Wed/Fri expiries.** Only use the monthly approach for stocks that lack weekly options.

---

## 4.4 PREMIUM TARGETS

### Primary Target: 0.30% Daily Return or Better

The core return metric is **daily return on collateral at risk**. This is the key number that determines whether a trade is worth taking.

| Metric | Minimum | Target | Excellent |
|--------|---------|--------|-----------|
| **Daily Return** | ≥0.20%/day | **≥0.30%/day** | ≥0.40%/day |
| **Weekly Return (3 trades)** | ≥0.60% | **≥0.90%** | ≥1.20% |
| **Monthly Return (12+ trades)** | ≥2.4% | **≥3.6%** | ≥4.8% |
| **Annualized Return** | ≥29% | **≥43%** | ≥58% |

### Daily Return Calculation

\`\`\`
Daily Return = (Premium / Strike Price) / DTE × 100

MUST BE ≥ 0.30% per day to qualify as a trade.

Example 1 — Weekly Trade (PREFERRED):
AAPL $230 Put, 2 DTE, $1.50 premium
Daily Return = ($1.50 / $230) / 2 × 100 = 0.33%/day ✅ TAKE THIS TRADE

Example 2 — Weekly Trade:
MSFT $415 Put, 3 DTE, $2.80 premium
Daily Return = ($2.80 / $415) / 3 × 100 = 0.22%/day ❌ SKIP — below 0.30%

Example 3 — Monthly Trade (for comparison):
AAPL $230 Put, 30 DTE, $2.50 premium
Daily Return = ($2.50 / $230) / 30 × 100 = 0.036%/day ❌ FAR BELOW target

Example 4 — Compounding Effect:
AAPL weeklies: 12 trades/month × 0.33%/day × 2 days avg = ~8% monthly
vs AAPL monthly: 1 trade/month × 1.39% = 1.39% monthly
\`\`\`

**This is why high-frequency weekly trading on liquid names dominates monthly trades.**

### Expiry Availability Check

When analyzing each stock, ALWAYS check and report:
- Does this stock have **Mon/Wed/Fri** expirations? (3x/week) → Use 0-3 DTE trades
- Does this stock have **weekly Friday** expirations? → Use 3-7 DTE trades
- **Monthly only?** → Use 21-30 DTE (flag as lower-priority)

Stocks with 3x/week expirations should ALWAYS be prioritized for trade recommendations.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5 — TRADE RECOMMENDATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## 5.1 CASH-SECURED PUT RECOMMENDATION TEMPLATE

\`\`\`
═══════════════════════════════════════════════════════
WHEEL TRADE: CASH-SECURED PUT
═══════════════════════════════════════════════════════

Stock: [TICKER] — [Company Name]
Current Price: $XX.XX
Wheel Score™: X.X/10 [⭐⭐⭐⭐⭐]

──────────────────────────────────────────────────────
TRADE DETAILS
──────────────────────────────────────────────────────

Action: SELL TO OPEN
Contract: [TICKER] [DATE] $[STRIKE] PUT
Expiry: [Date] ([XX] DTE)
Delta: 0.XX
IV Rank: XX%

Premium (Bid): $X.XX per share ($XXX per contract)
Premium (Mid): $X.XX per share ($XXX per contract)

──────────────────────────────────────────────────────
CAPITAL & RETURNS
──────────────────────────────────────────────────────

Cash Required: $XX,XXX (strike × 100)
Buying Power Reduction (Margin): $X,XXX

Premium Collected: $XXX
Monthly Return (Cash): X.XX%
Annualized Return (Cash): XX.X%
Monthly Return (Margin): X.XX%
Annualized Return (Margin): XX.X%

──────────────────────────────────────────────────────
SCENARIO ANALYSIS
──────────────────────────────────────────────────────

SCENARIO A — EXPIRES WORTHLESS (Probability: ~XX%)
• Stock closes above $[STRIKE] at expiry
• You keep: $XXX premium (100%)
• Capital freed: $XX,XXX
• Next action: Sell another put or wait

SCENARIO B — ASSIGNED (Probability: ~XX%)
• Stock closes below $[STRIKE] at expiry
• You buy: 100 shares at $[STRIKE]
• Effective cost basis: $XX.XX (strike - premium)
• Current price discount: X.X%
• Next action: Sell covered call

──────────────────────────────────────────────────────
BREAKEVEN & TARGETS
──────────────────────────────────────────────────────

Breakeven Price: $XX.XX (strike - premium)
Max Profit: $XXX (premium collected)
Max Loss: $XX,XXX (if stock goes to $0 — theoretical)

If Assigned, Target Exit (Covered Call Strike): $XX-$XX
Estimated Time to Full Cycle: X-X weeks

──────────────────────────────────────────────────────
RISK CHECKLIST
──────────────────────────────────────────────────────

[✓/✗] Earnings date >21 days away
[✓/✗] IV Rank in acceptable range (20-70%)
[✓/✗] Would own this stock at this price
[✓/✗] Position size within limits
[✓/✗] Sector diversification OK
[✓/✗] Assignment Comfort Test passed

──────────────────────────────────────────────────────
VERDICT
──────────────────────────────────────────────────────

Recommendation: [SELL / WAIT / SKIP]
Confidence: [High / Medium / Low]

Notes: [Any special considerations]

═══════════════════════════════════════════════════════
\`\`\`

---

## 5.2 COVERED CALL RECOMMENDATION TEMPLATE

\`\`\`
═══════════════════════════════════════════════════════
WHEEL TRADE: COVERED CALL
═══════════════════════════════════════════════════════

Stock: [TICKER] — [Company Name]
Current Price: $XX.XX
Your Cost Basis: $XX.XX (includes previous premiums)
Unrealized P&L: [+/-]$XXX ([+/-]X.X%)

──────────────────────────────────────────────────────
TRADE DETAILS
──────────────────────────────────────────────────────

Action: SELL TO OPEN
Contract: [TICKER] [DATE] $[STRIKE] CALL
Expiry: [Date] ([XX] DTE)
Delta: 0.XX
IV Rank: XX%

Premium (Bid): $X.XX per share ($XXX per contract)
Premium (Mid): $X.XX per share ($XXX per contract)

──────────────────────────────────────────────────────
CAPITAL & RETURNS
──────────────────────────────────────────────────────

Shares Held: 100
Current Value: $XX,XXX
Premium Collected: $XXX

Return on Current Value: X.XX%
Annualized Return: XX.X%

Total Premium This Cycle: $XXX (puts + calls)
Effective Cost Basis After This Call: $XX.XX

──────────────────────────────────────────────────────
SCENARIO ANALYSIS
──────────────────────────────────────────────────────

SCENARIO A — EXPIRES WORTHLESS (Probability: ~XX%)
• Stock closes below $[STRIKE] at expiry
• You keep: 100 shares + $XXX premium
• Reduced cost basis: $XX.XX
• Next action: Sell another call

SCENARIO B — CALLED AWAY (Probability: ~XX%)
• Stock closes above $[STRIKE] at expiry
• You sell: 100 shares at $[STRIKE]
• Total proceeds: $XX,XXX (shares) + $XXX (all premiums)
• Total profit this cycle: $X,XXX
• Return on original capital: XX.X%
• Next action: Wheel complete — return to Phase 1

──────────────────────────────────────────────────────
STRIKE SELECTION RATIONALE
──────────────────────────────────────────────────────

Cost Basis: $XX.XX
Current Price: $XX.XX
Selected Strike: $XX.XX

[✓] Strike above cost basis (ensures profit if called)
[✓] Reasonable premium for risk
[✓] Delta appropriate for outlook

Alternative Strikes Considered:
• $XX.XX — Higher premium, more likely called
• $XX.XX — Lower premium, keep shares longer

──────────────────────────────────────────────────────
VERDICT
──────────────────────────────────────────────────────

Recommendation: [SELL / WAIT / SKIP]
Confidence: [High / Medium / Low]

═══════════════════════════════════════════════════════
\`\`\`

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6 — POSITION MANAGEMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## 6.1 EARLY MANAGEMENT RULES

### For High-Frequency Trades (0-7 DTE)

| Profit % | Time Since Entry | Action |
|----------|-----------------|--------|
| 50%+ | <1 day | Close for profit, sell next expiry immediately |
| 75%+ | Any | Close for profit, redeploy |
| At expiry | OTM | Let expire worthless, sell next expiry |
| At expiry | ITM | Accept assignment (you want the stock!) then sell covered calls |

**High-frequency management is simple:** These trades are so short-dated that you mostly let them expire or close early if you hit 50%+ profit quickly. The key is **immediate redeployment** — as soon as one trade closes, open the next one.

### For Monthly Trades (21-45 DTE)

| Profit % | DTE Remaining | Action |
|----------|---------------|--------|
| 50% | >21 days | Close for profit, redeploy |
| 65% | >14 days | Close for profit |
| 75% | >7 days | Close for profit |
| 90%+ | Any | Close — not worth the risk |

**Why close early?**
- Capture most of profit with less time risk
- Free up capital for new trades
- Avoid gamma risk near expiration

### Rolling (If Needed)

| Situation | Roll Action |
|-----------|-------------|
| Stock dropping, want to avoid assignment | Roll down and out to next expiry (2-3 days out) |
| Stock rallying, want to keep shares | Roll up and out to next expiry |
| Expiry approaching, still OTM | Let expire, sell fresh for next expiry |

**Rolling Rules:**
- Only roll for a NET CREDIT (receive more than you pay)
- For weeklies: roll to next Mon/Wed/Fri expiry — keep it tight
- Don't roll more than 2-3 times on same position
- If can't roll for credit, accept assignment/calling — **that's the Wheel working as designed**

---

## 6.2 POSITION STATUS TEMPLATE

\`\`\`
──────────────────────────────────────────────────────
POSITION: [TICKER] [TYPE: PUT/CALL]
──────────────────────────────────────────────────────

Opened: [Date]
Contract: [TICKER] [DATE] $[STRIKE] [PUT/CALL]
Premium Received: $XXX
Current Value: $XXX
Profit/Loss: [+/-]$XXX ([+/-]XX%)

Stock Price (Open): $XX.XX
Stock Price (Now): $XX.XX
Strike: $XX.XX
DTE Remaining: XX days

Status: [ON TRACK / WATCH / ACTION NEEDED]

Management Action: [HOLD / CLOSE / ROLL]

──────────────────────────────────────────────────────
\`\`\`

---

## 6.3 WHEEL CYCLE TRACKER

\`\`\`
═══════════════════════════════════════════════════════
WHEEL CYCLE: [TICKER]
═══════════════════════════════════════════════════════

Cycle Started: [Date]
Current Phase: [CASH → PUT → SHARES → CALL]

──────────────────────────────────────────────────────
TRANSACTION HISTORY
──────────────────────────────────────────────────────

Date       Action              Strike   Premium   Running Total
──────────────────────────────────────────────────────
XX/XX/XX   Sell Put            $XXX     +$XXX     $XXX
XX/XX/XX   Put Expired                            $XXX
XX/XX/XX   Sell Put            $XXX     +$XXX     $XXX
XX/XX/XX   Assigned (Bought)   $XXX               $XXX
XX/XX/XX   Sell Call           $XXX     +$XXX     $XXX
XX/XX/XX   Call Expired                           $XXX
XX/XX/XX   Sell Call           $XXX     +$XXX     $XXX
XX/XX/XX   Called Away         $XXX     +$XXX     $XXX
──────────────────────────────────────────────────────

CYCLE SUMMARY
──────────────────────────────────────────────────────

Total Premiums Collected: $X,XXX
Stock Profit (if called): $XXX
Total Cycle Profit: $X,XXX

Capital Deployed: $XX,XXX
Cycle Duration: XX days
Annualized Return: XX.X%

═══════════════════════════════════════════════════════
\`\`\`

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 7 — INCOME DASHBOARD
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## 7.1 WEEKLY INCOME SUMMARY

\`\`\`
═══════════════════════════════════════════════════════
WHEEL INCOME DASHBOARD — Week of [Date]
═══════════════════════════════════════════════════════

──────────────────────────────────────────────────────
ACCOUNT OVERVIEW
──────────────────────────────────────────────────────

Account Value: $XX,XXX
Cash Available: $XX,XXX
Buying Power: $XX,XXX
Buying Power Used: XX%

Open Put Positions: X
Open Call Positions: X
Shares Held (Assigned): XXX shares in X stocks

──────────────────────────────────────────────────────
PREMIUM INCOME
──────────────────────────────────────────────────────

This Week:
• Premiums Collected: $XXX
• Premiums Expired (Profit): $XXX
• Positions Closed Early: $XXX profit
• Net Premium Income: $XXX

Month to Date: $X,XXX
Year to Date: $XX,XXX

──────────────────────────────────────────────────────
PERFORMANCE METRICS
──────────────────────────────────────────────────────

Win Rate (Expires Worthless or Closed Profit): XX%
Assignment Rate: XX%
Average Days in Trade: XX days
Average Premium per Trade: $XXX
Average Return per Trade: X.X%
Annualized Return (YTD): XX.X%

──────────────────────────────────────────────────────
OPEN POSITIONS
──────────────────────────────────────────────────────

PUTS:
Ticker   Strike   Expiry    Premium   P&L      Status
──────────────────────────────────────────────────────
AAPL     $180     02/21     $2.50     +65%     Close soon
MSFT     $400     02/28     $4.20     +32%     On track

CALLS:
Ticker   Strike   Expiry    Premium   P&L      Status
──────────────────────────────────────────────────────
KO       $62      02/21     $0.85     +80%     Close soon

SHARES HELD:
Ticker   Shares   Cost Basis   Current   P&L      Next Action
──────────────────────────────────────────────────────
PEP      100      $168.50      $172.30   +2.3%    Sell call

──────────────────────────────────────────────────────
UPCOMING EVENTS
──────────────────────────────────────────────────────

Expirations This Week: X positions
Earnings to Watch: [TICKER] on [Date] — close position by [Date]

──────────────────────────────────────────────────────
NEXT ACTIONS
──────────────────────────────────────────────────────

1. [Action 1]
2. [Action 2]
3. [Action 3]

═══════════════════════════════════════════════════════
\`\`\`

---

## 7.2 PERFORMANCE TRACKING METRICS

| Metric | Calculation | Target |
|--------|-------------|--------|
| **Total Premium Collected** | Sum of all premiums received | Track absolute $ |
| **Win Rate** | (Expired worthless + closed profit) / total trades | >75% |
| **Assignment Rate** | Assigned trades / total put trades | <30% |
| **Average Days in Trade** | Sum of days / total trades | 20-35 days |
| **Average Return per Trade** | Sum of returns / total trades | >1.5% |
| **Annualized ROI** | (Total profit / capital) × (365 / days) | >20% |
| **Profit Factor** | Gross profits / gross losses | >3.0 |
| **Max Drawdown** | Largest peak-to-trough decline | <15% |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8 — INPUT SPECIFICATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## 8.1 ACCOUNT INPUTS

\`\`\`yaml
account_settings:
  account_size: [Total account value in $]
  cash_available: [Cash not deployed]
  buying_power: [If using margin]
  mode: [Cash-Secured / Margin]

experience_level:
  options_experience: [Beginner / Intermediate / Advanced]
  margin_approved: [Yes / No]
  level: [1 / 2 / 3 / 4] # Options approval level

risk_settings:
  max_single_position: [% of account]
  max_sector_exposure: [% of account]
  min_wheel_score: [Minimum acceptable score, default 6.0]
  target_monthly_income: [$ amount or % of account]
\`\`\`

---

## 8.2 CURRENT POSITIONS (CSV or Text)

\`\`\`
Type, Ticker, Strike, Expiry, Premium, Opened
PUT, AAPL, 180, 2026-02-21, 2.50, 2026-01-15
PUT, MSFT, 400, 2026-02-28, 4.20, 2026-01-18
CALL, KO, 62, 2026-02-21, 0.85, 2026-01-20
SHARES, PEP, 100, 168.50, -, 2026-01-10
\`\`\`

---

## 8.3 WATCHLIST (Stocks to Analyze)

\`\`\`
AAPL
MSFT
KO
PEP
JNJ
PG
\`\`\`

---

## 8.4 SESSION INPUTS

\`\`\`yaml
session:
  session_type: [New Trades / Position Review / Weekly Summary]
  target_delta: [0.10-0.40, default 0.16-0.20]
  target_dte: [21-60, default 30-45]
  market_outlook: [Bullish / Neutral / Bearish]
\`\`\`

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 9 — EXECUTION FLOW
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## 9.1 NEW TRADE FLOW

\`\`\`
1. INPUTS RECEIVED
   ↓
2. ACCOUNT SNAPSHOT
   • Display account size, cash, buying power
   • List current positions
   • Calculate current exposure
   ↓
3. POSITION CAPACITY CHECK
   • How much capital available for new positions?
   • Sector exposure check
   ↓
4. WATCHLIST ANALYSIS
   • For each ticker:
     - Calculate Wheel Score™
     - Check IV Rank
     - Check earnings date
     - Score and rank
   ↓
5. FILTER CANDIDATES
   • Remove Wheel Score < minimum
   • Remove earnings within 21 days
   • Remove sector over-exposure
   ↓
6. GENERATE RECOMMENDATIONS
   • For top candidates:
     - Optimal strike selection
     - Optimal expiry selection
     - Premium and return calculations
     - Full recommendation template
   ↓
7. RANK BY ATTRACTIVENESS
   • Sort by risk-adjusted return
   • Consider diversification
   ↓
8. PRESENT TOP 3 TRADES
   • Full details for each
   • Assignment comfort test included
   ↓
9. SUMMARY
   • What to trade this week
   • What to wait on
   • What to avoid
\`\`\`

---

## 9.2 POSITION REVIEW FLOW

\`\`\`
1. LOAD CURRENT POSITIONS
   ↓
2. FOR EACH POSITION:
   • Current P&L
   • Days remaining
   • Stock price vs strike
   • Early close opportunity?
   ↓
3. MANAGEMENT RECOMMENDATIONS
   • HOLD — on track
   • CLOSE — take profit
   • ROLL — if needed
   • ALERT — needs attention
   ↓
4. EXPIRING THIS WEEK
   • What's happening at expiry?
   • Expected outcomes
   ↓
5. CYCLE STATUS
   • Where is each stock in the Wheel?
   • What's the next action?
\`\`\`

---

## 9.3 WEEKLY SUMMARY FLOW

\`\`\`
1. GATHER ALL DATA
   ↓
2. INCOME CALCULATIONS
   • Premium collected this week
   • Positions closed
   • Running totals
   ↓
3. PERFORMANCE METRICS
   • Win rate
   • Assignment rate
   • Average return
   ↓
4. OPEN POSITIONS STATUS
   • Overview of all positions
   ↓
5. UPCOMING WEEK
   • Expirations
   • Earnings
   • Planned trades
   ↓
6. GENERATE DASHBOARD
\`\`\`

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 10 — TOP WHEEL CANDIDATES (Reference List)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**These stocks typically score well for The Wheel:**

## TIER 1 — EXCELLENT (Typical Score 8.5+)

| Ticker | Company | Sector | Why Good for Wheel |
|--------|---------|--------|-------------------|
| AAPL | Apple | Tech | Liquid, stable, quality |
| MSFT | Microsoft | Tech | Liquid, consistent, moat |
| KO | Coca-Cola | Staples | Dividend, stable, boring |
| PEP | PepsiCo | Staples | Dividend, predictable |
| JNJ | Johnson & Johnson | Healthcare | Dividend, defensive |
| PG | Procter & Gamble | Staples | Dividend, stable |
| JPM | JPMorgan | Financial | Liquid, dividend |
| V | Visa | Financial | Growth, moat |
| HD | Home Depot | Retail | Quality, dividend |
| MCD | McDonald's | Consumer | Franchise, dividend |

## TIER 2 — VERY GOOD (Typical Score 7.0-8.4)

| Ticker | Company | Sector | Notes |
|--------|---------|--------|-------|
| COST | Costco | Retail | Quality but pricey |
| UNH | UnitedHealth | Healthcare | Quality, some vol |
| ABBV | AbbVie | Pharma | High dividend |
| MRK | Merck | Pharma | Dividend, stable |
| T | AT&T | Telecom | High yield, limited growth |
| VZ | Verizon | Telecom | Yield, stable |
| CVX | Chevron | Energy | Dividend, some cyclicality |
| XOM | ExxonMobil | Energy | Dividend, cyclical |
| DIS | Disney | Media | Quality, some volatility |
| SBUX | Starbucks | Consumer | Brand, dividend |

## AVOID FOR WHEEL

| Type | Examples | Why |
|------|----------|-----|
| Meme stocks | GME, AMC, BBBY | Unpredictable, wide spreads |
| Pre-revenue | Most biotechs | Binary outcomes |
| High IV (>100%) | Earnings plays | Blow-up risk |
| Low liquidity | Small caps | Bad fills, wide spreads |
| Chinese ADRs | BABA, PDD | Regulatory risk |

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

Using all the rules, templates, and frameworks above, please provide:

## PART A — ACCOUNT SNAPSHOT

Provide a summary of the account status including:
- Account size and available capital
- Current exposure and positions
- Capacity for new trades
- Any diversification concerns

---

${hasPositions ? `## PART B — POSITION REVIEW

For each open position, using the Position Status Template (Section 6.2):
- Current P&L assessment
- Days remaining and status
- Management recommendation (HOLD / CLOSE / ROLL)
- If rolling, provide specific roll recommendation

---` : ''}

${hasWatchlist ? `## PART C — WATCHLIST ANALYSIS

For EACH stock in the watchlist:

1. **Calculate the full Wheel Score™** using Section 2.4 template
2. **Provide complete trade recommendation** using Section 5.1 template (Cash-Secured Put)
3. **Include all scenario analysis**
4. **Complete the risk checklist**
5. **Give final verdict: SELL / WAIT / SKIP**

---` : ''}

## PART D — RECOMMENDED TRADES

Rank the top 3 opportunities by risk-adjusted return, providing:
- Full trade details for each
- Why this trade ranks highest
- Specific entry parameters

---

## PART E — ACTION SUMMARY

\`\`\`
═══════════════════════════════════════════════════════
ACTION SUMMARY — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
═══════════════════════════════════════════════════════

TRADES TO EXECUTE:
──────────────────────────────────────────────────────
[List each trade with contract details]

TOTAL PREMIUM THIS SESSION: $XXX
TOTAL CAPITAL DEPLOYED: $XX,XXX
ESTIMATED MONTHLY INCOME: $XXX

SKIP THIS WEEK:
──────────────────────────────────────────────────────
[List stocks to skip with reasons]

WATCH FOR NEXT SESSION:
──────────────────────────────────────────────────────
[List developing setups]

═══════════════════════════════════════════════════════
\`\`\`

---

## PART F — INCOME DASHBOARD

Using the template from Section 7.1, provide the complete Weekly Income Summary dashboard.

---

Be specific, practical, and conservative. Always prioritize capital preservation over premium maximization.

**Mark any data that requires real-time verification as NEEDS CHECK** (current stock prices, IV rank, earnings dates, option premiums).

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
      "annualizedReturn": 47.5,
      "collateralRequired": 22700,
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
        "dailyReturnCalc": "(1.50 / 227.00) / 2 × 100 = 0.33%",
        "breakevenCalc": "227.00 - 1.50 = 225.50",
        "maxProfitCalc": "1.50 × 100 = $150",
        "collateralCalc": "227.00 × 100 = $22,700",
        "annualizedCalc": "0.33% × 365 = 120.5% (simplified) or 47.5% (conservative)"
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
- \`maxProfit\`: premium × 100 (per contract, in dollars)
- \`collateralRequired\`: strike × 100 (total cash needed to secure the put)
- \`dailyReturn\`: (premium / strike) / DTE × 100 (percentage)
- \`breakeven\`: strike - premium (for puts) or strike + premium (for calls)
- \`totalPremiumThisTrade\` (in summary): Sum of all recommended trade premiums × 100
- \`calculations\`: REQUIRED — Show your working. This object must contain:
  - \`premiumBid\`: The bid price you read from the live data (per share)
  - \`premiumAsk\`: The ask price you read from the live data (per share)
  - \`premiumMid\`: (bid + ask) / 2 — this MUST equal the \`premium\` field
  - \`premiumSource\`: Which strike, expiry, and data row you used (e.g. "$255 Put, Fri Feb 28 expiry, from live chain")
  - \`dailyReturnCalc\`: Show the formula with actual numbers e.g. "(1.50 / 227.00) / 2 × 100 = 0.33%"
  - \`breakevenCalc\`: Show the formula e.g. "227.00 - 1.50 = 225.50"
  - \`maxProfitCalc\`: Show the formula e.g. "1.50 × 100 = $150"
  - \`collateralCalc\`: Show the formula e.g. "227.00 × 100 = $22,700"
  - \`annualizedCalc\`: Show the annualized return formula

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
