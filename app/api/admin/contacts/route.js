import { sbSelect, sbInsert, sbDelete } from '../../../../lib/supabase'

// Teacher-side admin tool: QR ID <-> parent email pairs only. No student
// names are ever accepted or stored here — see docs/PROJECT_SPECS.md
// section 1 (this app's data architecture is final, by design).
//
// Secret-gated, matching every sibling teacher-only route (teacher/
// submissions, teacher/analytics, teacher/assessment, qr-worksheet/bulk) -
// this one was the only one missing it, found while moving the teacher UI
// to assessment-tool.

function checkAuth(request) {
  const secret = request.headers.get('x-portfolio-sync-secret') || ''
  return process.env.PORTFOLIO_SYNC_SECRET && secret === process.env.PORTFOLIO_SYNC_SECRET
}

export async function GET(request) {
  if (!checkAuth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const contacts = await sbSelect('qr_parent_contacts', '?select=*&order=qr_id')
    return Response.json({ contacts })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  if (!checkAuth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { qrId, parentEmail } = await request.json()
    if (!qrId || !parentEmail) {
      return Response.json({ error: 'qrId and parentEmail are required' }, { status: 400 })
    }
    const [row] = await sbInsert('qr_parent_contacts', [{ qr_id: qrId, parent_email: parentEmail }])
    return Response.json({ contact: row })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  if (!checkAuth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
    await sbDelete('qr_parent_contacts', `?id=eq.${id}`)
    return Response.json({ deleted: id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
