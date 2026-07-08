'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }

const STATUS_LABEL = {
  done: { text: '✅ Done', color: C.green },
  in_progress: { text: '🟡 In Progress', color: C.gold },
  not_started: { text: '⬜ Not Started', color: '#8a7d6e' },
}

export default function PortalPage() {
  const params = useParams()
  const qrId = params.qrId
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/portal/${qrId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [qrId])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ color: C.navy, fontSize: 28, marginBottom: 4 }}>Weekly Progress</h1>
        <p style={{ color: '#8a7d6e', fontSize: 14, marginBottom: 24 }}>
          What's been done this week, updated automatically each Sunday.
        </p>

        {loading && <div style={{ color: '#8a7d6e' }}>Loading…</div>}
        {error && <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 12, color: '#c0392b' }}>{error}</div>}

        {data && (
          <>
            {(!data.weeklyData || data.weeklyData.length === 0) ? (
              <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, textAlign: 'center', color: '#8a7d6e' }}>
                No weekly data yet — this will populate once the Curriculum Designer and Implementer
                are connected. (Placeholder period per docs/PROJECT_SPECS.md — the portal, admin tool,
                and email pipeline are live now; the live data feed is a follow-up.)
              </div>
            ) : (
              data.weeklyData.map((week) => (
                <div key={week.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                    Week of {new Date(week.week_start).toLocaleDateString()}
                  </div>
                  {(week.items || []).map((item, i) => {
                    const label = STATUS_LABEL[item.status] || STATUS_LABEL.not_started
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                        <span>{item.title}</span>
                        <span style={{ color: label.color, fontWeight: 600, fontSize: 13 }}>{label.text}</span>
                      </div>
                    )
                  })}
                </div>
              ))
            )}

            {data.announcements && data.announcements.length > 0 && (
              <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginTop: 24 }}>
                <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>📅 Announcements</div>
                {data.announcements.map((a) => (
                  <div key={a.id} style={{ padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontWeight: 600 }}>{a.title} — {new Date(a.date).toLocaleDateString()}</div>
                    {a.detail && <div style={{ color: '#8a7d6e', fontSize: 13 }}>{a.detail}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
