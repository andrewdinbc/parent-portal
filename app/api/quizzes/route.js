import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbInsert, sbDelete } from '../../../lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const rows = await sbSelect('quizzes', `?id=eq.${id}&select=*`)
      return Response.json({ quiz: rows[0] || null })
    }
    const quizzes = await sbSelect('quizzes', '?select=id,title,subject,question_type,created_at&order=created_at.desc')
    return Response.json({ quizzes })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })
    await sbDelete('quizzes', `?id=eq.${id}`)
    return Response.json({ deleted: id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { title, subject, source, sourceContent, questionType, numQuestions, instructions, save } = await request.json()

    // If "save" is provided directly (teacher already reviewed a generated
    // draft), skip generation and just persist it.
    if (save) {
      const [quiz] = await sbInsert('quizzes', [{
        title: save.title, subject: save.subject || null,
        question_type: save.questionType || 'multiple_choice',
        questions: save.questions, source: save.source || 'topic',
      }])
      return Response.json({ quiz })
    }

    if (!sourceContent) return Response.json({ error: 'sourceContent is required' }, { status: 400 })

    const n = numQuestions === 'automatic' || !numQuestions ? 8 : parseInt(numQuestions, 10)
    const prompt = `Create a ${questionType || 'multiple choice'} quiz${title ? ` titled "${title}"` : ''}.

Source (${source || 'topic'}): ${sourceContent}
Number of questions: ${n}
${instructions ? `Additional instructions: ${instructions}` : ''}

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "title": "quiz title",
  "questions": [
    { "question": "text", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "brief why" }
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return Response.json({ title: parsed.title, questions: parsed.questions })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
