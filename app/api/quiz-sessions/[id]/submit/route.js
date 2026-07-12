import { sbSelect, sbUpdate, sbUpsert } from '../../../../../lib/supabase'

function weekStartOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().slice(0, 10)
}

// Multiple attempts allowed per session - each POST here is one attempt,
// not an overwrite. The device stays "checked_in" so it can retry (only
// the last attempt's answers are kept on the device row itself, since
// that's just for the live teacher dashboard), but every attempt is
// logged in quiz_attempts, and the portfolio write-back keeps the FIRST
// attempt (shows real learning starting point) and the BEST attempt
// (shows what they ultimately achieved) as two separate entries rather
// than one attempt silently overwriting the last, per Aj.
export async function POST(request, { params }) {
  try {
    const { id } = params
    const { deviceToken, answers } = await request.json()
    if (!deviceToken || !answers) return Response.json({ error: 'deviceToken and answers required' }, { status: 400 })

    const [session] = await sbSelect('quiz_sessions', `?id=eq.${id}&select=id,quiz_id`)
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })
    const [quiz] = await sbSelect('quizzes', `?id=eq.${session.quiz_id}&select=title,questions`)
    if (!quiz) return Response.json({ error: 'Quiz not found' }, { status: 404 })

    const [device] = await sbSelect('quiz_session_devices', `?session_id=eq.${id}&device_token=eq.${deviceToken}&select=*`)
    if (!device) return Response.json({ error: 'Device not checked in' }, { status: 404 })

    let correct = 0
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct += 1
    })
    const scorePct = Math.round((correct / quiz.questions.length) * 100)
    const completedAt = new Date().toISOString()

    // Every attempt logged, in order - this is the durable record.
    const priorAttempts = await sbSelect('quiz_attempts', `?session_id=eq.${id}&device_token=eq.${deviceToken}&select=attempt_number,score_pct&order=attempt_number.asc`)
    const attemptNumber = priorAttempts.length + 1
    await sbUpsert('quiz_attempts', [{
      session_id: id, device_token: deviceToken, qr_id: device.qr_id, attempt_number: attemptNumber,
      answers, correct, total: quiz.questions.length, score_pct: scorePct, completed_at: completedAt,
    }], 'session_id,device_token,attempt_number')

    // Device row reflects the most recent attempt for the live dashboard.
    await sbUpdate('quiz_session_devices', `?id=eq.${device.id}`, {
      status: 'completed', answers, score_pct: scorePct, completed_at: completedAt, last_active_at: completedAt,
      attempt_count: attemptNumber,
    })

    // Portfolio write-back: first attempt always kept; best attempt kept
    // and updated if this one beats it. Both are separate items, not one
    // that silently overwrites - a parent/teacher can see the starting
    // point and the eventual best, not just whatever was submitted last.
    if (device.qr_id) {
      const week = weekStartOf(completedAt)
      const existing = await sbSelect('qr_student_data', `?qr_id=eq.${device.qr_id}&week_start=eq.${week}&select=items`)
      let items = existing[0]?.items || []

      const firstKey = `quiz_result_first:${quiz.title}:${id}`
      const bestKey = `quiz_result_best:${quiz.title}:${id}`
      const hasFirst = items.some((it) => it._key === firstKey)
      const bestItem = items.find((it) => it._key === bestKey)

      if (!hasFirst) {
        items.push({ _key: firstKey, type: 'quiz_result_first', title: quiz.title, scorePct, correct, total: quiz.questions.length, completedAt, attemptNumber })
      }
      if (!bestItem || scorePct > bestItem.scorePct) {
        items = items.filter((it) => it._key !== bestKey)
        items.push({ _key: bestKey, type: 'quiz_result_best', title: quiz.title, scorePct, correct, total: quiz.questions.length, completedAt, attemptNumber })
      }

      await sbUpsert('qr_student_data', [{ qr_id: device.qr_id, week_start: week, items }], 'qr_id,week_start')
    }

    return Response.json({ scorePct, correct, total: quiz.questions.length, attemptNumber })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
