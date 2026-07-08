import { sbSelect, sbInsert } from '../../../lib/supabase'

export async function GET() {
  try {
    const assignments = await sbSelect('assignments', '?select=id,title,subject,created_at&order=created_at.desc')
    return Response.json({ assignments })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { title, subject, answerKey, rubric } = await request.json()
    if (!title || !subject) return Response.json({ error: 'title and subject required' }, { status: 400 })
    if (!['math', 'language_arts'].includes(subject)) {
      return Response.json({ error: "subject must be 'math' or 'language_arts'" }, { status: 400 })
    }
    const [assignment] = await sbInsert('assignments', [{
      title, subject, answer_key: answerKey || null, rubric: rubric || null,
    }])
    return Response.json({ assignment })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
