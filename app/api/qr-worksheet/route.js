import { PDFDocument, rgb } from 'pdf-lib'

// Generates a per-student worksheet with a QR code overlaid in the top
// right corner (per Aj's example: CommonCoreSheets-style math worksheet has
// a "Name:" field in the top right — the QR sits right there). The QR
// encodes a URL that opens directly to that student's submission page for
// this specific assignment: /submit/{qrId}/{assignmentId} — no manual
// selection needed when they scan it.
//
// Two modes:
//   basePdfUrl provided -> overlay QR onto page 1 of that existing PDF
//     (e.g. a CommonCoreSheets worksheet the teacher already has)
//   subject: 'language_arts' with no basePdfUrl -> generate a blank lined
//     page from scratch (per Aj: "other ones will just be lined paper")

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/'

async function fetchQrPng(data, sizePx = 150) {
  const url = `${QR_API}?size=${sizePx}x${sizePx}&data=${encodeURIComponent(data)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('QR generation service failed')
  return res.arrayBuffer()
}

async function drawLinedPage(pdfDoc) {
  const page = pdfDoc.addPage([612, 792]) // US Letter
  const { width, height } = page.getSize()
  page.drawText('Name: _______________________', { x: 40, y: height - 50, size: 12 })
  const lineSpacing = 28
  let y = height - 100
  while (y > 60) {
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.75, color: rgb(0.6, 0.6, 0.6) })
    y -= lineSpacing
  }
  return page
}

export async function POST(request) {
  try {
    const { qrId, assignmentId, subject, basePdfUrl } = await request.json()
    if (!qrId || !assignmentId) {
      return Response.json({ error: 'qrId and assignmentId required' }, { status: 400 })
    }

    const submitUrl = `https://parent-portal-silk.vercel.app/submit/${encodeURIComponent(qrId)}/${encodeURIComponent(assignmentId)}`
    const qrPng = await fetchQrPng(submitUrl)

    let pdfDoc
    let page

    if (basePdfUrl) {
      const baseRes = await fetch(basePdfUrl)
      if (!baseRes.ok) throw new Error('Could not fetch base worksheet PDF')
      const baseBytes = await baseRes.arrayBuffer()
      pdfDoc = await PDFDocument.load(baseBytes)
      page = pdfDoc.getPage(0)
    } else {
      pdfDoc = await PDFDocument.create()
      page = await drawLinedPage(pdfDoc)
    }

    const qrImage = await pdfDoc.embedPng(qrPng)
    const qrSize = 60
    const { width, height } = page.getSize()
    // Top right corner, matching the example: just left of the page edge,
    // near where "Name:" already sits on CommonCoreSheets-style pages.
    page.drawImage(qrImage, {
      x: width - qrSize - 20,
      y: height - qrSize - 20,
      width: qrSize,
      height: qrSize,
    })

    const outBytes = await pdfDoc.save()
    return new Response(outBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="worksheet-${qrId}.pdf"`,
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

