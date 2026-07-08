import { sbSelect } from '../../../../lib/supabase'

// Vercel cron, Sundays. Iterates qr_parent_contacts, joins to that week's
// qr_student_data by QR ID, sends via Brevo. No student names ever touch
// this — the email body only ever contains QR-scoped weekly item data.

export async function GET(request) {
  const auth = request.headers.get('authorization') || ''
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const contacts = await sbSelect('qr_parent_contacts', '?select=*')
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // most recent Sunday
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    let sent = 0
    let skipped = 0

    for (const contact of contacts) {
      const rows = await sbSelect('qr_student_data', `?qr_id=eq.${encodeURIComponent(contact.qr_id)}&week_start=eq.${weekStartStr}&select=*`)
      if (!rows.length) { skipped++; continue }

      const items = rows[0].items || []
      const itemsHtml = items
        .map((it) => `<li>${it.title} — <strong>${(it.status || 'not_started').replace('_', ' ')}</strong></li>`)
        .join('')

      const emailBody = {
        sender: { email: process.env.BREVO_SENDER_EMAIL || 'noreply@chalkandcircuit.ca', name: 'Chalk & Circuit' },
        to: [{ email: contact.parent_email }],
        subject: `Weekly Progress Update — week of ${weekStartStr}`,
        htmlContent: `<h2>What's been done this week</h2><ul>${itemsHtml || '<li>No items recorded this week.</li>'}</ul>`,
      }

      if (process.env.BREVO_API_KEY) {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify(emailBody),
        })
        sent++
      } else {
        skipped++
      }
    }

    return Response.json({ sent, skipped, weekStart: weekStartStr })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
