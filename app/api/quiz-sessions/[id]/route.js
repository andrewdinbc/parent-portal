import { sbSelect, sbUpdate } from '../../../../lib/supabase'

// A device counts as "may have left" if it checked in, hasn't completed,
// and hasn't sent a heartbeat in a while - the most we can honestly know
// from a webpage. We do NOT claim to know what else the device is doing.
const IDLE_THRESHOLD_MS = 45_000

export async function GET(request, { params }) {
  try {
    const { id } = params
    const [session] = await sbSelect('quiz_sessions', `?id=eq.${id}&select=*,quizzes(title,questions)`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

    const devices = await sbSelect('quiz_session_devices', `?session_id=eq.${id}&select=*&order=checked_in_at.asc`)

    const now = Date.now()
    const enriched = devices.map((d) => {
      const idleMs = now - new Date(d.last_active_at).getTime()
      const likelyAway = d.status === 'checked_in' && idleMs > IDLE_THRESHOLD_MS
      const offQuizEvents = d.off_quiz_events || []
      // Distinct from likelyAway (inferred from silence): this is an
      // ACTUAL detected tab-hidden/window-blur event, reported by the
      // device itself in real time.
      const recentlyFlagged = offQuizEvents.length > 0 &&
        (now - new Date(offQuizEvents[offQuizEvents.length - 1].at).getTime()) < 60_000
      return { ...d, idleSeconds: Math.round(idleMs / 1000), likelyAway, offQuizEventCount: offQuizEvents.length, recentlyFlagged }
    })

    return Response.json({
      session,
      devices: enriched,
      counts: {
        checkedIn: devices.length,
        completed: devices.filter((d) => d.status === 'completed').length,
        likelyAway: enriched.filter((d) => d.likelyAway).length,
        flagged: enriched.filter((d) => d.recentlyFlagged).length,
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  // End a session
  try {
    const { id } = params
    await sbUpdate('quiz_sessions', `?id=eq.${id}`, { status: 'ended', ended_at: new Date().toISOString() })
    return Response.json({ ended: id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

