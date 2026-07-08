import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbUpdate } from '../../../lib/supabase'

// AI marking, per Aj: mark against an answer_key if the teacher provided
// one, else a rubric, else research the answers independently. Writes
// ai_feedback only — status stays 'completed' until a teacher also adds
// their own feedback (qr_teacher_assessment), matching the "requires BOTH
// AI and teacher feedback" spec (memory #22). This route never writes to
// qr_teacher_assessment and is not reachable from any parent-facing page.

export async function POST(request) {
  try {
    const { submissionId } = await request.json()
    if (!submissionId) return Response.json({ error: 'submissionId required' }, { status: 400 })

    const [submission] = await sbSelect('qr_submissions', `?id=eq.${submissionId}&select=*`)
    if (!submission) return Response.json({ error: 'Submission not found' }, { status: 404 })

    const [assignment] = await sbSelect('assignments', `?id=eq.${submission.assignment_id}&select=*`)
    if (!assignment) return Response.json({ error: 'Assignment not found' }, { status: 404 })

    const imageRes = await fetch(submission.image_url)
    const imageBuffer = await imageRes.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')
    const mediaType = imageRes.headers.get('content-type') || 'image/jpeg'

    let markingInstruction
    if (assignment.answer_key) {
      markingInstruction = `Mark this student's work against the following answer key: ${JSON.stringify(assignment.answer_key)}. For each question, state whether it was answered correctly.`
    } else if (assignment.rubric) {
      markingInstruction = `Mark this student's work against the following rubric: ${assignment.rubric}`
    } else {
      markingInstruction = `No answer key or rubric was provided. Determine the correct answers yourself (research/reason them out) and mark the student's work against your own determination, being explicit that you derived the answers independently so the teacher can double-check.`
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: `This is a photo of a student's completed worksheet: "${assignment.title}" (${assignment.subject}). ${markingInstruction} Return your marking as clean Markdown: per-question correct/incorrect (or a qualitative assessment for open-ended work), an overall summary, and any encouraging note for the student.` },
        ],
      }],
    })
    const feedbackText = message.content.find((b) => b.type === 'text')?.text || ''

    await sbUpdate('qr_submissions', `?id=eq.${submissionId}`, {
      ai_feedback: { markdown: feedbackText, markedAt: new Date().toISOString() },
    })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
