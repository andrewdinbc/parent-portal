import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbUpdate } from '../../../lib/supabase'

// Structured, per-criterion marking — modeled on CoGrader's rubric UX
// (Level + numeric Score + a supporting quote from the student's own work,
// per criterion, plus Glow/Grow/Think-about-it summary feedback). Replaces
// the earlier free-text markdown blob with a real structured object the
// teacher review UI can render as an editable rubric, matching the
// reference pattern Aj provided.
//
// Handles both submission types: text_content (writing assignments — no
// vision call needed) and image_url (photo-scanned worksheets — vision
// call, unchanged from before).

const LEVELS = ['Developing', 'Emerging', 'Proficient', 'Extending']

function buildCriteriaText(criteria) {
  if (!criteria || !criteria.length) return null
  return criteria.map((c, i) => `${i + 1}) ${c.name}${c.description ? ` — ${c.description}` : ''}`).join('\n')
}

export async function POST(request) {
  try {
    const { submissionId } = await request.json()
    if (!submissionId) return Response.json({ error: 'submissionId required' }, { status: 400 })

    const [submission] = await sbSelect('qr_submissions', `?id=eq.${submissionId}&select=*`)
    if (!submission) return Response.json({ error: 'Submission not found' }, { status: 404 })

    const [assignment] = await sbSelect('assignments', `?id=eq.${submission.assignment_id}&select=*`)
    if (!assignment) return Response.json({ error: 'Assignment not found' }, { status: 404 })

    const criteriaText = buildCriteriaText(assignment.rubric_criteria)
    let markingBasis
    if (criteriaText) {
      markingBasis = `Mark against this rubric, one score per criterion:\n${criteriaText}`
    } else if (assignment.answer_key) {
      markingBasis = `Mark against this answer key: ${JSON.stringify(assignment.answer_key)}`
    } else if (assignment.rubric) {
      markingBasis = `Mark against this rubric: ${assignment.rubric}`
    } else {
      markingBasis = `No rubric or answer key was provided. Determine reasonable criteria yourself and be explicit that you derived them independently so the teacher can double-check.`
    }

    const responseFormatInstruction = `Return ONLY valid JSON (no markdown fences, no prose outside the JSON) matching this exact shape:
{
  "overallScore": number, "maxScore": number,
  "criteria": [{ "name": string, "level": one of ${JSON.stringify(LEVELS)}, "score": number, "maxScore": number, "justificationQuote": "a short exact quote from the student's work supporting this score" }],
  "glow": [string, string], "grow": [string, string], "thinkAboutIt": [string]
}
glow = specific praise citing their own words. grow = specific improvement areas citing their own words. thinkAboutIt = 1 reflective question to prompt the student's own revision thinking. Keep language appropriate for the student's grade level and encouraging in tone, matching CoGrader's "Glow, Grow" style.`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    let message

    if (submission.text_content) {
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `This is a student's written submission for the assignment "${assignment.title}" (${assignment.subject}).\n\n${markingBasis}\n\nStudent's submission:\n"""\n${submission.text_content}\n"""\n\n${responseFormatInstruction}`,
        }],
      })
    } else {
      const imageRes = await fetch(submission.image_url)
      const imageBuffer = await imageRes.arrayBuffer()
      const imageBase64 = Buffer.from(imageBuffer).toString('base64')
      const mediaType = imageRes.headers.get('content-type') || 'image/jpeg'
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: `This is a photo of a student's completed worksheet: "${assignment.title}" (${assignment.subject}).\n\n${markingBasis}\n\n${responseFormatInstruction}` },
          ],
        }],
      })
    }

    const rawText = message.content.find((b) => b.type === 'text')?.text || '{}'
    let structuredFeedback
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      structuredFeedback = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
    } catch (parseErr) {
      structuredFeedback = { error: 'AI response was not valid JSON', raw: rawText.slice(0, 1000) }
    }

    await sbUpdate('qr_submissions', `?id=eq.${submissionId}`, {
      structured_feedback: structuredFeedback,
      ai_feedback: { markdown: rawText, markedAt: new Date().toISOString() }, // kept for backward compat
    })

    return Response.json({ ok: true, structuredFeedback })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
