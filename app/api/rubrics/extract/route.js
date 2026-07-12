import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Extracts a rubric from an uploaded file (PDF or photo/scan of a printed
// rubric) into the same structured format the manual builder and AI
// generator both use, so it lands in the same editable grid rather than
// being a separate one-off path - the teacher reviews/edits it before
// anything is saved, same as the AI-generate flow.

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: 'file is required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'application/octet-stream'

    let contentBlock
    if (mimeType === 'application/pdf') {
      contentBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    } else if (mimeType.startsWith('image/')) {
      contentBlock = { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } }
    } else {
      return Response.json({ error: 'Only PDF or image files are supported for rubric upload' }, { status: 400 })
    }

    const prompt = `This file contains a grading rubric. Extract it into structured JSON.

Identify the performance levels (columns, e.g. "Below Standard, Approaching, Meets Standard, Exceeds Standard")
and the criteria (rows, e.g. "Organization", "Evidence"), with the description text for each criterion at each level.

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "title": "rubric title if shown, otherwise a reasonable title based on content",
  "levelNames": ["level 1 name", "level 2 name", ...],
  "criteria": [
    { "name": "criterion name", "descriptions": ["description at level 1", "description at level 2", ...] }
  ]
}

If the document isn't a rubric at all (wrong file), respond with {"error": "This doesn't appear to be a rubric"}.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: prompt }] }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    if (parsed.error) return Response.json({ error: parsed.error }, { status: 422 })

    return Response.json(parsed)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
