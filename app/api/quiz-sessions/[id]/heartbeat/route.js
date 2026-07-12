import { sbUpdate } from '../../../../../lib/supabase'

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { deviceToken } = await request.json()
    if (!deviceToken) return Response.json({ error: 'deviceToken required' }, { status: 400 })
    await sbUpdate('quiz_session_devices', `?session_id=eq.${id}&device_token=eq.${deviceToken}`, { last_active_at: new Date().toISOString() })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
