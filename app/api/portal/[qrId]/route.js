import { sbSelect } from '../../../../lib/supabase'

// Parent-facing read. Accessed via /portal/[qrId] — the QR ID itself is the
// access mechanism (no login), per docs/PROJECT_SPECS.md section 1.
//
// assignments/submissions added 2026-07-08: per Aj's spec, parents see one
// of three states per assignment - Assigned (no submission row yet),
// Completed (submitted, ai_feedback not yet present OR teacher hasn't
// embedded feedback), Marked (both AI and teacher feedback present). This
// route intentionally NEVER touches qr_teacher_assessment - that boundary
// (memory #19) stays enforced by simply not querying that table here, ever.

export async function GET(request, { params }) {
  const qrId = params.qrId
  try {
    const weeklyData = await sbSelect('qr_student_data', `?qr_id=eq.${encodeURIComponent(qrId)}&select=*&order=week_start.desc&limit=12`)
    const announcements = await sbSelect('qr_announcements', `?or=(qr_id.eq.${encodeURIComponent(qrId)},qr_id.is.null)&select=*&order=date.desc&limit=20`)

    const allAssignments = await sbSelect('assignments', '?select=id,title,subject,created_at&order=created_at.desc')
    const submissions = await sbSelect('qr_submissions', `?qr_id=eq.${encodeURIComponent(qrId)}&select=*`)
    const submissionByAssignment = Object.fromEntries(submissions.map(s => [s.assignment_id, s]))

    // Teacher feedback existing is what actually flips status to "marked" -
    // check qr_teacher_assessment for a row matching qr_id (content itself
    // is never returned to the parent, only used here to compute status).
    const teacherAssessments = await sbSelect('qr_teacher_assessment', `?qr_id=eq.${encodeURIComponent(qrId)}&select=id,week_start`)
    const hasTeacherFeedback = new Set(teacherAssessments.map(t => t.week_start))

    const assignments = allAssignments.map(a => {
      const sub = submissionByAssignment[a.id]
      let status = 'assigned'
      if (sub) {
        const hasAi = !!sub.ai_feedback
        const hasTeacher = hasTeacherFeedback.size > 0 // coarse check - refined once assessment platform is designed
        status = (hasAi && hasTeacher) ? 'marked' : 'completed'
      }
      return {
        id: a.id, title: a.title, subject: a.subject, status,
        aiFeedback: status === 'marked' ? sub?.ai_feedback : null,
      }
    })

    return Response.json({ weeklyData, announcements, assignments })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
