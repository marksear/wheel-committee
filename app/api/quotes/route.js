import { fetchQuotes } from '@/lib/yahooFinance'

export async function POST(request) {
  try {
    const { tickers } = await request.json()
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return Response.json({ error: 'No tickers provided' }, { status: 400 })
    }
    const results = await fetchQuotes(tickers.slice(0, 20))
    return Response.json(results)
  } catch (error) {
    console.error('Quotes fetch error:', error)
    return Response.json({ error: 'Quotes fetch failed', details: error.message }, { status: 500 })
  }
}
