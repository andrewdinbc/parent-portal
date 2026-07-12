import { sbSelect, sbUpsert } from '@/lib/supabase'

const FREQUENCY_DAYS = { daily: 1, weekly: 7, monthly: 30 }

export async function GET() {
  try {
    const schedules = await sbSelect('oral_reading_schedules', '?select=*&order=next_due_at.asc.nullsfirst')
    const now = Date.now()
    const withDueStatus = schedules.map((s) => ({
      ...s,
      isDue: s.active && (!s.next_due_at || new Date(s.next_due_at).getTime() <= now),
    }))
    return Response.json({ schedules: withDueStatus })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { qrId, frequency, currentLevel, active } = await request.json()
    if (!qrId || !frequency) return Response.json({ error: 'qrId and frequency required' }, { status: 400 })
    if (!FREQUENCY_DAYS[frequency]) return Response.json({ error: 'frequency must be daily, weekly, or monthly' }, { status: 400 })

    const [schedule] = await sbUpsert('oral_reading_schedules', [{
      qr_id: qrId,
      frequency,
      current_level: currentLevel || null,
      active: active !== false,
      next_due_at: new Date().toISOString(), // due immediately until first completion sets the real cadence
    }], 'qr_id')

    return Response.json({ schedule })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

