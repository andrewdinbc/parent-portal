import { put } from '@vercel/blob'
import { sbInsert } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const textContent = formData.get('textContent')
    const qrId = formData.get('qrId')
    const assignmentId = formData.get('assignmentId')

    if ((!file && !textContent) || !qrId || !assignmentId) {
      return Response.json({ error: 'qrId, assignmentId, and either file or textContent required' }, { status: 400 })
    }

    let imageUrl = ''
    if (file) {
      const blob = await put(`submissions/${qrId}-${assignmentId}-${Date.now()}.jpg`, file, { access: 'public' })
      imageUrl = blob.url
    }

    const [submission] = await sbInsert('qr_submissions', [{
      qr_id: qrId, assignment_id: assignmentId,
      image_url: imageUrl,
      text_content: textContent || null,
      status: 'completed',
    }])

    fetch(new URL('/api/mark-submission', request.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: submission.id }),
    }).catch(() => {})

    return Response.json({ submission })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
