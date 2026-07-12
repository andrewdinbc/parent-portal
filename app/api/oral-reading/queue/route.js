import { sbSelect } from '../../../../../lib/supabase'

export async function GET() {
  try {
    const attempts = await sbSelect(
      'oral_reading_attempts',
      '?scored_by_teacher_at=is.null&select=id,qr_id,passage_id,recording_url,comprehension_score_pct,created_at&order=created_at.asc'
    )
    // Attach passage title/word_count for context without a second round trip per row.
    const passageIds = [...new Set(attempts.map((a) => a.passage_id))]
    const passages = passageIds.length
      ? await sbSelect('oral_reading_passages', `?id=in.(${passageIds.join(',')})&select=id,title,word_count`)
      : []
    const passageMap = Object.fromEntries(passages.map((p) => [p.id, p]))

    const queue = attempts.map((a) => ({ ...a, passage: passageMap[a.passage_id] || null }))
    return Response.json({ queue })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
