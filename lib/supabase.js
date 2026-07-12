// lib/supabase.js — direct REST fetch, no @supabase/supabase-js SDK.
// Matches this codebase's convention (see Hyperion's import-validator):
// process.env.SUPABASE_URL + '/rest/v1/' with the service role key, server-side only.

const BASE = process.env.SUPABASE_URL + '/rest/v1/'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function headers(extra = {}) {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export async function sbSelect(table, query = '') {
  const res = await fetch(`${BASE}${table}${query}`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error(`Supabase select ${table} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sbInsert(table, rows) {
  const res = await fetch(`${BASE}${table}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`Supabase insert ${table} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sbUpsert(table, rows, onConflict) {
  const res = await fetch(`${BASE}${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`Supabase upsert ${table} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sbUpdate(table, query, patch) {
  // query is a PostgREST filter string starting with '?', e.g. '?id=eq.123'
  // - matches the calling convention already used for sbSelect/sbDelete.
  // Added 2026-07-11: this was imported and called by mark-submission.js
  // (and possibly other routes) but never actually defined, meaning every
  // AI-marking save has failed with a 500 since that feature was built -
  // silently, since submit/route.js's trigger call is fire-and-forget with
  // .catch(() => {}). Found via a real end-to-end test through
  // assessment-tool tonight.
  const res = await fetch(`${BASE}${table}${query}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Supabase update ${table} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sbDelete(table, query) {
  const res = await fetch(`${BASE}${table}${query}`, { method: 'DELETE', headers: headers() })
  if (!res.ok) throw new Error(`Supabase delete ${table} failed: ${res.status} ${await res.text()}`)
  return true
}
