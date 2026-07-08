import { sbInsert } from '../../../../lib/supabase'

// TEACHER-ONLY. Deliberately NOT under the same auth model as the rest of
// this app (no Supabase Auth user session) — this is meant to be called by
// TeacherAssist server-side (or another trusted backend), gated by a shared
// secret, exactly like teacherassist's api/portfolio-sync.js. This route
// must NEVER be reachable from the parent-facing portal pages or their
// client-side code. Writes to qr_teacher_assessment, which has RLS enabled
// with zero policies — only the service-role key used here can touch it.

export async function POST(request) {
  const secret = request.headers.get('x-portfolio-sync-secret') || ''
  if (!process.env.PORTFOLIO_SYNC_SECRET || secret !== process.env.PORTFOLIO_SYNC_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { qrId, weekStart, assessment } = await request.json()
    if (!qrId || !assessment) {
      return Response.json({ error: 'qrId and assessment required' }, { status: 400 })
    }
    const [row] = await sbInsert('qr_teacher_assessment', [{
      qr_id: qrId, week_start: weekStart || null, assessment,
    }])
    return Response.json({ saved: row })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
