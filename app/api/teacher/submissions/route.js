import { sbSelect } from '../../../../lib/supabase'

// Teacher-only. Secret-gated like /api/teacher/assessment. Lists all
// submissions for an assignment, with their AI-drafted structured feedback,
// for the review UI to render.

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
    const [assignment] = await sbSelect('assignments', `?id=eq.${assignmentId}&select=*`)
    const submissions = await sbSelect('qr_submissions', `?assignment_id=eq.${assignmentId}&select=*&order=submitted_at`)
    return Response.json({ assignment, submissions })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
