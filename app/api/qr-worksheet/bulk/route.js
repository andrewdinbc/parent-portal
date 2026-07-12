import { PDFDocument, rgb } from 'pdf-lib'
import { sbSelect, sbInsert } from '@/lib/supabase'

// Bulk generator: one merged, print-ready PDF with one page per registered
// student, each with their own QR code overlaid top-right. Per Aj: fast
// upload of an existing worksheet (auto-superimpose QR), OR blank lined
// paper with nothing but the QR, covering both math (usually has real
// content to upload) and language arts (often just needs lined paper).

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/'

function checkAuth(request) {
  const secret = request.headers.get('x-portfolio-sync-secret') || ''
  return process.env.PORTFOLIO_SYNC_SECRET && secret === process.env.PORTFOLIO_SYNC_SECRET
}

async function fetchQrPng(data, sizePx = 150) {
  const url = `${QR_API}?size=${sizePx}x${sizePx}&data=${encodeURIComponent(data)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('QR generation service failed')
  return res.arrayBuffer()
}

function drawLinedPage(page) {
  const { width, height } = page.getSize()
  page.drawText('Name: _______________________', { x: 40, y: height - 50, size: 12 })
  let y = height - 100
  while (y > 60) {
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.75, color: rgb(0.6, 0.6, 0.6) })
    y -= 28
  }
}

export async function POST(request) {
  if (!checkAuth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const formData = await request.formData()
    const title = formData.get('title')
    const subject = formData.get('subject')
    const file = formData.get('file') // optional - absent means blank lined paper
    const answerKeyRaw = formData.get('answerKey')
    const rubricRaw = formData.get('rubric')

    if (!title || !subject) {
      return Response.json({ error: 'title and subject required' }, { status: 400 })
    }

    // Create the assignment record now so the QR links have a real target.
    const [assignment] = await sbInsert('assignments', [{
      title, subject,
      answer_key: answerKeyRaw ? JSON.parse(answerKeyRaw) : null,
      rubric: rubricRaw || null,
    }])

    const contacts = await sbSelect('qr_parent_contacts', '?select=qr_id')
    const qrIds = [...new Set(contacts.map((c) => c.qr_id))] // dedupe (a QR can have >1 parent email)

    if (qrIds.length === 0) {
      return Response.json({ error: 'No students registered yet - add them on the Admin page first.' }, { status: 400 })
    }

    let baseBytes = null
    if (file && typeof file.arrayBuffer === 'function') {
      baseBytes = await file.arrayBuffer()
    }

    const outDoc = await PDFDocument.create()

    for (const qrId of qrIds) {
      const submitUrl = `https://parent-portal-silk.vercel.app/submit/${encodeURIComponent(qrId)}/${assignment.id}`
      const qrPng = await fetchQrPng(submitUrl)
      const qrImage = await outDoc.embedPng(qrPng)
      const qrSize = 60

      if (baseBytes) {
        const srcDoc = await PDFDocument.load(baseBytes)
        const [copiedPage] = await outDoc.copyPages(srcDoc, [0])
        outDoc.addPage(copiedPage)
        const { width, height } = copiedPage.getSize()
        copiedPage.drawImage(qrImage, { x: width - qrSize - 20, y: height - qrSize - 20, width: qrSize, height: qrSize })
      } else {
        const page = outDoc.addPage([612, 792])
        drawLinedPage(page)
        const { width, height } = page.getSize()
        page.drawImage(qrImage, { x: width - qrSize - 20, y: height - qrSize - 20, width: qrSize, height: qrSize })
      }
    }

    const outBytes = await outDoc.save()
    return new Response(outBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9]+/gi, '_')}-class-set.pdf"`,
        'X-Assignment-Id': assignment.id,
        'X-Student-Count': String(qrIds.length),
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

