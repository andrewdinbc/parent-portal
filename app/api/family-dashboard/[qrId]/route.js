import { sbSelect } from '../../../../lib/supabase'

// Parent-facing dashboard, redesigned per Aj's reference (playful,
// no-percentage subject overview + portfolio grid + messages).
// Same hard boundary as /api/portal/[qrId]: never touches
// qr_teacher_assessment content, only checks its existence to compute
// whether a submission is "marked" (i.e. safe to show a parent).

export async function GET(request, { params }) {
  const qrId = params.qrId
  try {
    const allAssignments = await sbSelect('assignments', '?archived_at=is.null&select=id,title,subject,created_at&order=created_at.desc')
    const submissions = await sbSelect('qr_submissions', `?qr_id=eq.${encodeURIComponent(qrId)}&select=*&order=submitted_at.desc`)
    const announcements = await sbSelect('qr_announcements', `?or=(qr_id.eq.${encodeURIComponent(qrId)},qr_id.is.null)&select=*&order=date.desc&limit=20`)
    const teacherAssessments = await sbSelect('qr_teacher_assessment', `?qr_id=eq.${encodeURIComponent(qrId)}&select=id`)
    const hasAnyTeacherFeedback = teacherAssessments.length > 0

    const assignmentById = Object.fromEntries(allAssignments.map((a) => [a.id, a]))

    // Only submissions with both AI + teacher feedback are "marked" and
    // safe to surface -- same coarse check as the existing portal route.
    const markedSubmissions = submissions.filter((s) => s.ai_feedback && hasAnyTeacherFeedback)

    // Subject Progress -- real counts, no percentages (per Aj: no % on
    // this dashboard, just click-through to see the actual work).
    const subjectCounts = {}
    for (const a of allAssignments) {
      const subj = a.subject === 'language_arts' ? 'Language Arts' : a.subject === 'math' ? 'Math' : a.subject || 'General'
      if (!subjectCounts[subj]) subjectCounts[subj] = { total: 0, completed: 0 }
      subjectCounts[subj].total++
      const sub = submissions.find((s) => s.assignment_id === a.id)
      if (sub) subjectCounts[subj].completed++
    }
    const subjects = Object.entries(subjectCounts).map(([name, counts]) => ({ name, ...counts }))

    // Portfolio grid -- real marked work, newest first.
    const portfolio = markedSubmissions.map((s) => {
      const a = assignmentById[s.assignment_id]
      return {
        id: s.id,
        title: a?.title || 'Assignment',
        subject: a?.subject === 'language_arts' ? 'Language Arts' : a?.subject === 'math' ? 'Math' : a?.subject || 'General',
        type: s.text_content ? 'text' : 'image',
        imageUrl: s.text_content ? null : s.image_url,
        textSnippet: s.text_content ? s.text_content.slice(0, 140) : null,
        date: s.submitted_at,
      }
    })

    return Response.json({ subjects, portfolio, messages: announcements })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
