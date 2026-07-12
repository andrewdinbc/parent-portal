import Anthropic from '@anthropic-ai/sdk'
import { sbSelect } from '../../../lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Fast first-pass check - grammar, clarity, structure, rubric alignment.
// Deliberately NOT a scored evaluation (that's mark-submission's job).
// This flags issues a teacher can glance at before deciding whether the
// piece is even ready for full grading, matching CoGrader's Essay Checker
// as a distinct, faster tool from the Essay Scorer.

export async function POST(request) {
  try {
    const { submissionId } = await request.json()
    if (!submissionId) return Response.json({ error: 'submissionId required' }, { status: 400 })

    const [submission] = await sbSelect('qr_submissions', `?id=eq.${submissionId}&select=*`)
    if (!submission) return Response.json({ error: 'Submission not found' }, { status: 404 })
    if (!submission.text_content) {
      return Response.json({ error: 'Essay Checker only supports text submissions right now' }, { status: 400 })
    }

    const prompt = `You are a fast first-pass proofreader for a K-12 student essay. Do NOT score or grade this piece - only flag concrete issues, so a teacher can glance at this before deciding whether the piece is ready for full rubric grading.

Student writing:
"""
${submission.text_content}
"""

Respond with ONLY valid JSON, no markdown fences:
{
  "issues": [
    { "category": "grammar" | "clarity" | "structure", "quote": "the exact problematic phrase from the text", "note": "one short sentence on what's wrong" }
  ],
  "structureNote": "one or two sentences on overall structure (intro/body/conclusion presence, paragraphing)",
  "readyForGrading": true or false,
  "readyForGradingReason": "one short sentence"
}
List at most 8 of the most important issues, not every minor thing.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return Response.json(parsed)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
