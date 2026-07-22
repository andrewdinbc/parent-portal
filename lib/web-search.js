// lib/web-search.js
// General web search via Serper.dev (a lightweight Google Search API
// wrapper -- chosen over the official Google Custom Search JSON API for
// simpler setup: one API key, no separate Custom Search Engine config
// step). Built 2026-07-22 alongside lib/youtube-search.js as the second
// half of Forge's own search capability -- for finding non-video web
// resources (articles, reference pages, worksheets) rather than videos.
//
// SETUP (one-time, Aj -- Claude cannot set Vercel env vars from a
// session):
// 1. serper.dev -> sign up -> API key is shown immediately on the
//    dashboard, no credit card required for the free 2,500-query trial
// 2. Add it as SERPER_API_KEY in this project's Vercel env vars
// Pricing after the free trial: $50 per 50,000 queries (0.1 cent/query)
// -- only relevant if this sees real sustained usage.
//
// Not yet wired into a specific route (see app/api/quizzes/from-topic
// for the YouTube-only pipeline that IS wired up) -- this is here so the
// next resource-finding feature (e.g. "find a matching article for this
// bundle" or vetting new Actionable Resources candidates) doesn't need
// its own search integration built from scratch.

const SERPER_URL = 'https://google.serper.dev/search'

function apiKey() {
  const key = process.env.SERPER_API_KEY
  if (!key) throw new Error('SERPER_API_KEY not configured -- see setup notes in lib/web-search.js')
  return key
}

export async function webSearch(query, count = 5) {
  const res = await fetch(SERPER_URL, {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: count }),
  })
  if (!res.ok) throw new Error(`Serper search failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return (data.organic || []).map((r) => ({ title: r.title, url: r.link, snippet: r.snippet }))
}

// Restrict a search to a specific domain (e.g. one of Aj's tagged
// resource sites) using Google's site: operator -- useful for "find the
// specific page on this already-trusted site about topic X" rather than
// searching the open web.
export async function webSearchSite(query, domain, count = 5) {
  return webSearch(`site:${domain} ${query}`, count)
}
