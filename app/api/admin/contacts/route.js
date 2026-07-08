import { sbSelect, sbInsert, sbDelete } from '../../../lib/supabase'

// Teacher-side admin tool: QR ID <-> parent email pairs only. No student
// names are ever accepted or stored here — see docs/PROJECT_SPECS.md
// section 1 (this app's data architecture is final, by design).

export async function GET() {
  try {
    const contacts = await sbSelect('qr_parent_contacts', '?select=*&order=qr_id')
    return Response.json({ contacts })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
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
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
    await sbDelete('qr_parent_contacts', `?id=eq.${id}`)
    return Response.json({ deleted: id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
