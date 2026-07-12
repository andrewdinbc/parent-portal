import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { subject, grade, assignmentDescription, standardAlignment, numCriteria, scale } = await request.json()
    if (!assignmentDescription) {
      return Response.json({ error: 'assignmentDescription is required' }, { status: 400 })
    }

    const levelWords = {
      3: ['Below Standard', 'Approaching', 'Meets Standard'],
      4: ['Below Standard', 'Approaching', 'Meets Standard', 'Exceeds Standard'],
      5: ['Beginning', 'Developing', 'Approaching', 'Meets Standard', 'Exceeds Standard'],
    }
    const levelNames = levelWords[scale] || levelWords[4]

    const prompt = `You are an expert K-12 teacher writing a grading rubric using research-based instructional practices.

Assignment: ${assignmentDescription}
Subject: ${subject || 'not specified'}
Grade level: ${grade || 'not specified'}
${standardAlignment && standardAlignment !== 'none' ? `Align criteria language to: ${standardAlignment}` : ''}
Number of criteria: ${numCriteria}
Performance levels (in order, low to high): ${levelNames.join(', ')}

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "criteria": [
    {
      "name": "Criterion name (e.g. Organization)",
      "descriptions": ["description at level 1", "description at level 2", ... one per level, in the same order as the performance levels above]
    }
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return Response.json({ levelNames, criteria: parsed.criteria })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
