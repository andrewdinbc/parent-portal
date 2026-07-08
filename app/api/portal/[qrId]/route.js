import { sbSelect } from '../../../../lib/supabase'

// Parent-facing read. Accessed via /portal/[qrId] — the QR ID itself is the
// access mechanism (no login), per docs/PROJECT_SPECS.md section 1.

export async function GET(request, { params }) {
  const qrId = params.qrId
  try {
    const weeklyData = await sbSelect('qr_student_data', `?qr_id=eq.${encodeURIComponent(qrId)}&select=*&order=week_start.desc&limit=12`)
    const announcements = await sbSelect('qr_announcements', `?or=(qr_id.eq.${encodeURIComponent(qrId)},qr_id.is.null)&select=*&order=date.desc&limit=20`)
    return Response.json({ weeklyData, announcements })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
