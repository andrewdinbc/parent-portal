import { getAssignmentAnalytics } from '@/app/teacher/actions'

// Class-level analytics, modeled on CoGrader's Overview/Patterns/Strengths/
// Areas-for-growth/Intensive-support/Next-lesson structure. Aggregates the
// TEACHER-APPROVED feedback (qr_teacher_assessment, type='rubric_feedback')
// for an assignment, not the raw AI draft -- this reflects what the
// teacher actually confirmed, consistent with the grading boundary
// (memory #19): still teacher-only, still never exposed to parents.
//
// 2026-07-21: this used to duplicate the entire computation from
// app/teacher/actions.js's getAssignmentAnalytics() independently -- the
// exact same logic maintained in two places, which is how the Intensive
// Support / Next Lesson extension almost got added to only one of them.
// Now calls the single real implementation instead. Server Actions are
// plain async functions under the hood, so importing one into a Route
// Handler works the same as any other function import.

function checkAuth(request) {
  const secret = request.headers.get('x-portfolio-sync-secret') || ''
  return process.env.PORTFOLIO_SYNC_SECRET && secret === process.env.PORTFOLIO_SYNC_SECRET
}

export async function GET(request) {
  if (!checkAuth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const assignmentId = searchParams.get('assignmentId')
  if (!assignmentId) return Response.json({ error: 'assignmentId required' }, { status: 400 })

  try {
    const data = await getAssignmentAnalytics(assignmentId)
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
