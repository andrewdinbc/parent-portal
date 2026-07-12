import Anthropic from '@anthropic-ai/sdk'
import { sbSelect } from '../../../lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Bulk triage pass across an entire assignment's submissions - deliberately
// the lightest/fastest of the three writing tools (Checker does one essay's
// grammar/clarity/structure; Scorer does full rubric-based scoring with
// justification quotes; this just answers "which of these 24 papers need
// my attention first, before I grade any of them"). One quick tier + one
// weak-area note per submission, nothing else - matches CoGrader's Paper
// Rater as a pre-grading triage tool, not a grading tool itself.

const TIERS = ['Needs significant revision', 'Solid draft', 'Strong']

export async function POST(request) {
  try {
    const { assignmentId } = await request.json()
    if (!assignmentId) return Response.json({ error: 'assignmentId required' }, { status: 400 })

    const submissions = await sbSelect('qr_submissions', `?assignment_id=eq.${assignmentId}&select=id,qr_id,text_content`)
    const withText = submissions.filter((s) => s.text_content)
    if (!withText.length) {
      return Response.json({ ratings: [], note: 'No text submissions to rate yet.' })
    }

    const ratings = await Promise.all(withText.map(async (s) => {
      try {
        const prompt = `Quick triage rating only - not a grade. One tier and one weak-area note.

Student writing:
"""
${s.text_content.slice(0, 3000)}
"""

Respond with ONLY valid JSON, no markdown fences:
{ "tier": "${TIERS.join('" | "')}", "weakestArea": "one short phrase, e.g. 'run-on sentences' or 'thin supporting evidence'" }`
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }],
        })
        const text = response.content.find((b) => b.type === 'text')?.text || ''
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
        return { submissionId: s.id, qrId: s.qr_id, tier: parsed.tier, weakestArea: parsed.weakestArea }
      } catch {
        return { submissionId: s.id, qrId: s.qr_id, tier: null, weakestArea: null, error: 'rating failed' }
      }
    }))

    const tierOrder = { [TIERS[0]]: 0, [TIERS[1]]: 1, [TIERS[2]]: 2 }
    ratings.sort((a, b) => (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3))

    return Response.json({ ratings })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
