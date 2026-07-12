import { sbSelect, sbUpdate } from '../../../../../lib/supabase'

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { deviceToken, reason } = await request.json()
    if (!deviceToken) return Response.json({ error: 'deviceToken required' }, { status: 400 })

    const [device] = await sbSelect('quiz_session_devices', `?session_id=eq.${id}&device_token=eq.${deviceToken}&select=off_quiz_events`)
    if (!device) return Response.json({ error: 'Device not found' }, { status: 404 })

    const events = device.off_quiz_events || []
    events.push({ reason: reason || 'unknown', at: new Date().toISOString() })

    await sbUpdate('quiz_session_devices', `?session_id=eq.${id}&device_token=eq.${deviceToken}`, {
      off_quiz_events: events,
      last_active_at: new Date().toISOString(),
    })

    return Response.json({ ok: true, eventCount: events.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
