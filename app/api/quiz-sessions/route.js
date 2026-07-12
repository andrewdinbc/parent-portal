import { sbInsert } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const { quizId } = await request.json()
    if (!quizId) return Response.json({ error: 'quizId required' }, { status: 400 })
    const [session] = await sbInsert('quiz_sessions', [{ quiz_id: quizId, status: 'active' }])
    return Response.json({ session })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
