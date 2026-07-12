import { put } from '@vercel/blob'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('audio')
    const qrId = formData.get('qrId')
    if (!file || !qrId) return Response.json({ error: 'audio and qrId are required' }, { status: 400 })

    const filename = `oral-reading/${qrId}-${Date.now()}.webm`
    const blob = await put(filename, file, { access: 'public', addRandomSuffix: false })

    return Response.json({ url: blob.url })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
