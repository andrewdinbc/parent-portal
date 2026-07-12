import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbInsert, sbUpsert } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { qrId, passageId, recordingUrl, comprehensionAnswers } = await request.json()
    if (!qrId || !passageId || !comprehensionAnswers) {
      return Response.json({ error: 'qrId, passageId, comprehensionAnswers required' }, { status: 400 })
    }

    const questions = await sbSelect('oral_reading_questions', `?passage_id=eq.${passageId}&select=*&order=order_index.asc`)

    // AI first-pass comprehension scoring against the acceptable-answer
    // key, using the same +/- with half-credit convention as the Jerry
    // Johns scoring guide. Teacher can review/override, same pattern as
    // every other AI-first-pass score in this suite.
    const prompt = `Score these comprehension answers against the acceptable-answer key, using
+/- scoring with half credit for partially correct answers (matching the Jerry Johns Basic
Reading Inventory convention). The student answered from memory, without the passage in front
of them, so don't penalize different wording that captures the same idea.

${questions.map((q, i) => `Q${i + 1} (${q.question_type}): ${q.question_text}
Acceptable answer(s): ${JSON.stringify(q.acceptable_answers)}
Student answered: ${comprehensionAnswers[i] || '(no answer)'}`).join('\n\n')}

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "scores": [ { "score": 1 | 0.5 | 0, "note": "brief reason" } ],
  "totalCorrect": number,
  "totalPossible": ${questions.length},
  "percentageScore": number
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const aiReview = JSON.parse(text.replace(/```json|```/g, '').trim())

    const [attempt] = await sbInsert('oral_reading_attempts', [{
      qr_id: qrId,
      passage_id: passageId,
      recording_url: recordingUrl || null,
      comprehension_answers: comprehensionAnswers,
      comprehension_score_pct: aiReview.percentageScore,
      comprehension_ai_review: aiReview,
    }])

    // Advance the schedule so the next due date reflects this completion.
    const [schedule] = await sbSelect('oral_reading_schedules', `?qr_id=eq.${qrId}&select=frequency`)
    if (schedule) {
      const days = { daily: 1, weekly: 7, monthly: 30 }[schedule.frequency] || 7
      const nextDue = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      await sbUpsert('oral_reading_schedules', [{ qr_id: qrId, frequency: schedule.frequency, last_completed_at: new Date().toISOString(), next_due_at: nextDue }], 'qr_id')
    }

    return Response.json({ attempt, aiReview })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

