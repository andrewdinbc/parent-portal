import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbInsert } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  try {
    const passages = await sbSelect('oral_reading_passages', '?select=id,title,level,word_count,source,created_at&order=level.asc,created_at.asc')
    return Response.json({ passages })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// Jerry Johns-style comprehension questions: a fixed mix across
// Fact/Topic/Inference/Evaluation/Vocabulary, with "(any N)" flexible
// acceptable answers where the reference format uses them, matching the
// example Aj provided - never referencing the passage during answering.
export async function POST(request) {
  try {
    const { title, level, textContent, source } = await request.json()
    if (!title || !textContent) {
      return Response.json({ error: 'title and textContent are required' }, { status: 400 })
    }
    const wordCount = textContent.trim().split(/\s+/).length

    const prompt = `You are writing comprehension questions for a reading passage, following the Jerry Johns
Basic Reading Inventory format exactly.

Passage title: ${title}
Passage:
${textContent}

Write exactly 10 comprehension questions in this mix, matching the reference format below:
- 1 Topic question (what the story is about, overall)
- 3-4 Fact questions (directly stated details)
- 2-3 Inference questions (requires connecting ideas, not directly stated)
- 1 Evaluation question (opinion/judgment about a story event - accept any logical, well-reasoned response)
- 1-2 Vocabulary questions (meaning of a specific word as used in the passage)

For each question, give the acceptable answer(s). Where multiple details would satisfy the
question, phrase it like the reference format: e.g. "(any 2)" if 2 of several listed items suffice.
Students will answer from memory without access to the passage, so questions must be answerable
from a careful first reading, not requiring word-for-word recall of phrasing.

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "questions": [
    { "type": "topic"|"fact"|"inference"|"evaluation"|"vocabulary", "questionText": "...", "acceptableAnswers": ["answer 1", "answer 2 (any 2)"] }
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    const [passage] = await sbInsert('oral_reading_passages', [{
      title, level: level || null, text_content: textContent.trim(), word_count: wordCount, source: source || 'HELPS',
    }])

    const questionRows = parsed.questions.map((q, i) => ({
      passage_id: passage.id,
      question_type: q.type,
      question_text: q.questionText,
      acceptable_answers: q.acceptableAnswers,
      order_index: i,
    }))
    await sbInsert('oral_reading_questions', questionRows)

    return Response.json({ passage, questionCount: questionRows.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

