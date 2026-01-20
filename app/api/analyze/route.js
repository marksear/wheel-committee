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

| DTE | Pros | Cons | Best For |
|-----|------|------|----------|
| **7-14** | Fast decay, quick turnover | Low premium, high management | Active traders |
| **21-30** | Good theta, manageable | Moderate premium | Monthly income |
| **30-45** | **Optimal theta decay** | Longer wait | **Standard recommendation** |
| **45-60** | Higher total premium | Slower decay, more risk time | Patient traders |
| **>60** | Maximum premium | Too much time risk | Not recommended |

**Default Recommendation: 30-45 DTE (optimal theta decay curve)**

---

## 4.3 THE "SWEET SPOT" MATRIX

| IV Rank | Recommended Delta | Recommended DTE |
|---------|-------------------|-----------------|
| <20% | Wait or skip | — |
| 20-35% | 0.18-0.22 | 35-45 DTE |
| 35-50% | 0.16-0.20 | 30-45 DTE |
| 50-70% | 0.14-0.18 | 25-35 DTE |
| >70% | 0.12-0.16 (or skip) | 21-30 DTE |

**Note:** High IV Rank (>70%) may indicate event risk — check for earnings, FDA, etc.

---

## 4.4 PREMIUM TARGETS

| Metric | Minimum | Target | Excellent |
|--------|---------|--------|-----------|
| **Annualized Return** | >15% | 20-30% | >30% |
| **Monthly Premium** | >1% of capital at risk | 1.5-2% | >2% |
| **Premium per Day** | >$2/contract | $3-5/contract | >$5/contract |

**Premium Calculation:**
\`\`\`
Monthly Return = (Premium / Strike Price) × 100
Annualized Return = Monthly Return × 12 (approximate)

Example:
AAPL $180 Put, 30 DTE, $2.50 premium
Monthly Return = ($2.50 / $180) × 100 = 1.39%
Annualized = 1.39% × 12 = 16.7%
\`\`\`

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

### Take Profit Early

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
| Stock dropping, want to avoid assignment | Roll down and out (lower strike, later expiry) |
| Stock rallying, want to keep shares | Roll up and out (higher strike, later expiry) |
| Expiry approaching, still OTM | Roll out (same strike, later expiry) |

**Rolling Rules:**
- Only roll for a NET CREDIT (receive more than you pay)
- Don't roll more than 2-3 times on same position
- If can't roll for credit, accept assignment/calling

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

# END OF PROMPT`
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

function extractTrades(text) {
  const trades = []
  const seenTickers = new Set()

  // Helper to add or update a trade
  const addOrUpdateTrade = (ticker, data) => {
    if (!ticker || ticker.length < 1 || ticker.length > 5) return
    ticker = ticker.toUpperCase()

    let trade = trades.find(t => t.ticker === ticker)
    if (!trade) {
      trade = { ticker }
      trades.push(trade)
      seenTickers.add(ticker)
    }

    // Update with new data, preferring non-null values
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        trade[key] = data[key]
      }
    })
  }

  // Extract section around a ticker mention
  const getSectionForTicker = (ticker, startIndex) => {
    // Find section boundaries (next ticker header or 3000 chars)
    const nextSection = text.slice(startIndex + 1).search(/(?:^|\n)(?:#{1,3}\s*)?(?:\*\*)?[A-Z]{1,5}(?:\*\*)?\s*[-—]/m)
    const endIndex = nextSection > 0 ? startIndex + 1 + nextSection : startIndex + 3000
    return text.substring(startIndex, Math.min(endIndex, text.length))
  }

  // Parse wheel score from section - multiple patterns
  const parseWheelScore = (section) => {
    const patterns = [
      /Wheel\s*Score[™]?\s*[:=]?\s*\*?\*?(\d+\.?\d*)\s*(?:\/\s*10)?/i,
      /WHEEL\s*SCORE[™]?\s*[:=]?\s*(\d+\.?\d*)/i,
      /Score[™]?\s*[:=|]\s*\*?\*?(\d+\.?\d*)\s*\/\s*10/i,
      /(\d+\.?\d*)\s*\/\s*10\s*\[?[⭐★]+/i,
      /Rating:\s*(\d+\.?\d*)\s*\/\s*10/i,
    ]
    for (const pattern of patterns) {
      const match = section.match(pattern)
      if (match) {
        const score = parseFloat(match[1])
        if (score >= 0 && score <= 10) return score
      }
    }
    return null
  }

  // Parse verdict from section
  const parseVerdict = (section) => {
    const patterns = [
      /Verdict\s*[:=|]?\s*\*?\*?\[?(SELL|BUY|WAIT|SKIP|PASS)\]?\*?\*?/i,
      /Recommendation\s*[:=|]?\s*\*?\*?\[?(SELL|BUY|WAIT|SKIP|PASS)\]?\*?\*?/i,
      /Action\s*[:=|]?\s*\*?\*?\[?(SELL|BUY|WAIT|SKIP|PASS)\]?\*?\*?/i,
    ]
    for (const pattern of patterns) {
      const match = section.match(pattern)
      if (match) return match[1].toUpperCase()
    }
    return null
  }

  // Parse premium from section
  const parsePremium = (section) => {
    const patterns = [
      /Premium[^$\n]*\$(\d+\.?\d*)/i,
      /\$(\d+\.?\d*)\s*(?:per contract|premium)/i,
      /Collect[^$\n]*\$(\d+\.?\d*)/i,
    ]
    for (const pattern of patterns) {
      const match = section.match(pattern)
      if (match) return parseFloat(match[1])
    }
    return null
  }

  // Parse company name
  const parseCompanyName = (section, ticker) => {
    const patterns = [
      new RegExp(`${ticker}\\s*[-—:]\\s*([A-Za-z][A-Za-z0-9\\s&.,']+?)(?:\\n|\\||$)`, 'i'),
      /Company\s*[:=|]?\s*([A-Za-z][A-Za-z0-9\s&.,']+?)(?:\n|\||$)/i,
      /Stock\s*[:=|]?\s*[A-Z]{1,5}\s*[-—]\s*([A-Za-z][A-Za-z0-9\s&.,']+?)(?:\n|\||$)/i,
    ]
    for (const pattern of patterns) {
      const match = section.match(pattern)
      if (match) return match[1].trim().replace(/\*+/g, '')
    }
    return null
  }

  // Parse monthly/annualized return
  const parseReturns = (section) => {
    const monthly = section.match(/Monthly\s*Return[^:]*[:=|]?\s*(\d+\.?\d*)%/i)
    const annual = section.match(/Annual(?:ized)?\s*Return[^:]*[:=|]?\s*(\d+\.?\d*)%/i)
    return {
      monthlyReturn: monthly ? parseFloat(monthly[1]) : null,
      annualizedReturn: annual ? parseFloat(annual[1]) : null
    }
  }

  // Pattern 1: Look for "### TICKER — Company Name" or "## TICKER" headers
  const headerMatches = text.matchAll(/(?:^|\n)#{1,3}\s*\*?\*?([A-Z]{1,5})\*?\*?\s*[-—:]\s*([^\n]+)/gm)
  for (const match of headerMatches) {
    const ticker = match[1]
    const name = match[2].trim().replace(/\*+/g, '')
    const section = getSectionForTicker(ticker, match.index)

    addOrUpdateTrade(ticker, {
      name,
      wheelScore: parseWheelScore(section),
      verdict: parseVerdict(section),
      premium: parsePremium(section),
      ...parseReturns(section)
    })
  }

  // Pattern 2: Look for "**TICKER**" bold mentions with scores nearby
  const boldMatches = text.matchAll(/\*\*([A-Z]{1,5})\*\*/g)
  for (const match of boldMatches) {
    const ticker = match[1]
    if (seenTickers.has(ticker)) continue

    const section = getSectionForTicker(ticker, match.index)
    const score = parseWheelScore(section)

    if (score !== null) {
      addOrUpdateTrade(ticker, {
        name: parseCompanyName(section, ticker),
        wheelScore: score,
        verdict: parseVerdict(section),
        premium: parsePremium(section),
        ...parseReturns(section)
      })
    }
  }

  // Pattern 3: Look for table rows with ticker | score format
  const tableMatches = text.matchAll(/\|\s*\*?\*?([A-Z]{1,5})\*?\*?\s*\|[^|]*\|[^|]*?(\d+\.?\d*)\s*(?:\/\s*10)?[^|]*\|/g)
  for (const match of tableMatches) {
    const ticker = match[1]
    const score = parseFloat(match[2])
    if (score >= 0 && score <= 10) {
      addOrUpdateTrade(ticker, { wheelScore: score })
    }
  }

  // Pattern 4: Look for "TICKER: X.X/10" or "TICKER (X.X)" patterns
  const scoreMatches = text.matchAll(/\b([A-Z]{1,5})\s*[:(-]\s*(\d+\.?\d*)\s*(?:\/\s*10|\))/g)
  for (const match of scoreMatches) {
    const ticker = match[1]
    const score = parseFloat(match[2])
    if (score >= 0 && score <= 10 && !['PART', 'STEP', 'TIER', 'WEEK'].includes(ticker)) {
      const section = getSectionForTicker(ticker, match.index)
      addOrUpdateTrade(ticker, {
        wheelScore: score,
        name: parseCompanyName(section, ticker),
        verdict: parseVerdict(section)
      })
    }
  }

  // Pattern 5: Look for "WHEEL SCORE™ CALCULATION: TICKER"
  const calcMatches = text.matchAll(/WHEEL\s*SCORE[™]?\s*(?:CALCULATION)?[:\s]*([A-Z]{1,5})/gi)
  for (const match of calcMatches) {
    const ticker = match[1]
    const section = getSectionForTicker(ticker, match.index)
    addOrUpdateTrade(ticker, {
      wheelScore: parseWheelScore(section),
      name: parseCompanyName(section, ticker),
      verdict: parseVerdict(section),
      premium: parsePremium(section),
      ...parseReturns(section)
    })
  }

  // Pattern 6: Look for "TRADE 1: TICKER" or "Trade #1 - TICKER"
  const tradeMatches = text.matchAll(/TRADE\s*(?:#?\d+)?[:\s-]*([A-Z]{1,5})/gi)
  for (const match of tradeMatches) {
    const ticker = match[1]
    const section = getSectionForTicker(ticker, match.index)
    addOrUpdateTrade(ticker, {
      wheelScore: parseWheelScore(section),
      name: parseCompanyName(section, ticker),
      verdict: parseVerdict(section) || 'SELL',
      premium: parsePremium(section),
      ...parseReturns(section)
    })
  }

  // Sort by wheel score (highest first), then alphabetically
  trades.sort((a, b) => {
    if (a.wheelScore !== null && b.wheelScore !== null) {
      return b.wheelScore - a.wheelScore
    }
    if (a.wheelScore !== null) return -1
    if (b.wheelScore !== null) return 1
    return a.ticker.localeCompare(b.ticker)
  })

  return trades.filter(t => t.ticker && t.ticker.length >= 1 && t.ticker.length <= 5)
}
