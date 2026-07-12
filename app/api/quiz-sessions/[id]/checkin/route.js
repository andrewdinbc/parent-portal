import { sbSelect, sbInsert, sbUpdate } from '../../../../../lib/supabase'

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { deviceToken, qrId } = await request.json()
    if (!deviceToken) return Response.json({ error: 'deviceToken required' }, { status: 400 })

    const [session] = await sbSelect('quiz_sessions', `?id=eq.${id}&select=id,status`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })
    if (session.status !== 'active') return Response.json({ error: 'This session has ended' }, { status: 410 })

    const existing = await sbSelect('quiz_session_devices', `?session_id=eq.${id}&device_token=eq.${deviceToken}&select=*`)
    if (existing.length) {
      if (qrId) await sbUpdate('quiz_session_devices', `?id=eq.${existing[0].id}`, { qr_id: qrId, last_active_at: new Date().toISOString() })
      return Response.json({ device: existing[0] })
    }

    const [device] = await sbInsert('quiz_session_devices', [{
      session_id: id, device_token: deviceToken, qr_id: qrId || null, status: 'checked_in',
    }])
    return Response.json({ device })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
