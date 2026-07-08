import { put } from '@vercel/blob'
import { sbInsert } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const qrId = formData.get('qrId')
    const assignmentId = formData.get('assignmentId')

    if (!file || !qrId || !assignmentId) {
      return Response.json({ error: 'file, qrId, assignmentId required' }, { status: 400 })
    }

    const blob = await put(`submissions/${qrId}-${assignmentId}-${Date.now()}.jpg`, file, {
      access: 'public',
    })

    const [submission] = await sbInsert('qr_submissions', [{
      qr_id: qrId, assignment_id: assignmentId, image_url: blob.url, status: 'completed',
    }])

    // Kick off AI marking in the background — best-effort, does not block
    // the student's confirmation that their submission went through.
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
