import { sbSelect } from '../../../../../lib/supabase'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const [passage] = await sbSelect('oral_reading_passages', `?id=eq.${id}&select=*`)
    if (!passage) return Response.json({ error: 'Passage not found' }, { status: 404 })
    const questions = await sbSelect('oral_reading_questions', `?passage_id=eq.${id}&select=id,question_type,question_text,order_index&order=order_index.asc`)
    return Response.json({ passage, questions })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
