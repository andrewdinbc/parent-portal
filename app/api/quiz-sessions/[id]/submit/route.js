import { sbSelect, sbUpdate, sbUpsert } from '../../../../../lib/supabase'

function weekStartOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().slice(0, 10)
}

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

    await sbUpdate('quiz_session_devices', `?id=eq.${device.id}`, {
      status: 'completed', answers, score_pct: scorePct, completed_at: completedAt, last_active_at: completedAt,
    })

    // Write into the portfolio, matching the shape used elsewhere
    // (qr_student_data, one row per qr_id+week_start, items array).
    if (device.qr_id) {
      const week = weekStartOf(completedAt)
      const existing = await sbSelect('qr_student_data', `?qr_id=eq.${device.qr_id}&week_start=eq.${week}&select=items`)
      const items = existing[0]?.items || []
      items.push({ type: 'quiz_result', title: quiz.title, scorePct, correct, total: quiz.questions.length, completedAt })
      await sbUpsert('qr_student_data', [{ qr_id: device.qr_id, week_start: week, items }], 'qr_id,week_start')
    }

    return Response.json({ scorePct, correct, total: quiz.questions.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
