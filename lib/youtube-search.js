// lib/youtube-search.js
// Wraps the YouTube Data API v3 to find real, relevant videos -- either
// from a specific channel (matching Aj's subject-tagged Actionable
// Resources) or from YouTube generally as a fallback. Built 2026-07-22 to
// automate what Claude previously did by hand once (web_search + manual
// verification) for the bundle video-quiz pipeline.
//
// SETUP (one-time, Aj -- Claude cannot set Vercel env vars from a
// session, this step has to happen on your end):
// 1. console.cloud.google.com -> create/select a project -> APIs &
//    Services -> Library -> enable "YouTube Data API v3"
// 2. APIs & Services -> Credentials -> Create Credentials -> API Key ->
//    (recommended) restrict it to "YouTube Data API v3" only
// 3. Add it as YOUTUBE_API_KEY in this project's Vercel env vars
// Free quota: 10,000 units/day. search.list costs 100 units (so up to
// 100 searches/day free), channels.list costs 1 unit. This is a
// completely separate quota from the Gemini image API cap hit earlier --
// different Google product, does not share a spend cap.

const YT_BASE = 'https://www.googleapis.com/youtube/v3'

function apiKey() {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY not configured -- see setup notes in lib/youtube-search.js')
  return key
}

function extractHandle(url) {
  const m = String(url || '').match(/youtube\.com\/(@[\w.-]+)/i)
  return m ? m[1] : null
}

// Resolve a channel handle (e.g. the "@veritasium" in a
// youtube.com/@veritasium URL, exactly the format Aj's tagged resources
// use) to the real channel ID search.list needs for a channelId filter.
// Returns null (not a throw) if the URL isn't a recognizable handle URL,
// so callers can just skip non-channel resources cleanly.
export async function resolveChannelId(handleOrUrl) {
  const handle = extractHandle(handleOrUrl)
  if (!handle) return null
  const url = `${YT_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube channels.list failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.items?.[0]?.id || null
}

function mapItems(items) {
  return (items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url || null,
  }))
}

// Search a specific channel for videos matching a topic -- the primary
// path, since it keeps results within Aj's already-vetted channel list
// rather than open YouTube.
export async function searchChannelForTopic(channelId, topic, count = 5) {
  const url = `${YT_BASE}/search?part=snippet&channelId=${encodeURIComponent(channelId)}&q=${encodeURIComponent(topic)}&type=video&order=relevance&maxResults=${count}&key=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube search.list failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return mapItems(data.items)
}

// General topic search across all of YouTube, no channel restriction --
// the fallback when none of Aj's tagged channels have anything relevant
// for a given topic. safeSearch=strict since this is for classroom use.
export async function searchYouTubeForTopic(topic, count = 5) {
  const url = `${YT_BASE}/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&order=relevance&maxResults=${count}&safeSearch=strict&key=${apiKey()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube search.list failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return mapItems(data.items)
}
