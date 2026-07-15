'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

import { S } from '@/lib/studentTheme'
import CloudBackground from '@/components/CloudBackground'

const STATUS_LABEL = {
  done: { text: '✅ Done', color: S.green },
  in_progress: { text: '🟡 In Progress', color: S.purple },
  not_started: { text: '⬜ Not Started', color: S.muted },
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
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: "'Segoe UI', sans-serif", padding: 32, position: 'relative' }}>
      <CloudBackground />
      <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <h1 style={{ color: S.text, fontSize: 28, marginBottom: 4 }}>Weekly Progress</h1>
        <p style={{ color: S.muted, fontSize: 14, marginBottom: 24 }}>
          What's been done this week, updated automatically each Sunday.
        </p>

        {loading && <div style={{ color: S.muted }}>Loading…</div>}
        {error && <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 12, color: S.red }}>{error}</div>}

        {data && (
          <>
            {(!data.weeklyData || data.weeklyData.length === 0) ? (
              <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: 24, textAlign: 'center', color: S.muted }}>
                No weekly data yet — this will populate once the Curriculum Designer and Implementer
                are connected. (Placeholder period per docs/PROJECT_SPECS.md — the portal, admin tool,
                and email pipeline are live now; the live data feed is a follow-up.)
              </div>
            ) : (
              data.weeklyData.map((week) => (
                <div key={week.id} style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: S.text, marginBottom: 10 }}>
                    Week of {new Date(week.week_start).toLocaleDateString()}
                  </div>
                  {(week.items || []).map((item, i) => {
                    const label = STATUS_LABEL[item.status] || STATUS_LABEL.not_started
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i > 0 ? `1px solid ${S.border}` : 'none' }}>
                        <span>{item.title}</span>
                        <span style={{ color: label.color, fontWeight: 600, fontSize: 13 }}>{label.text}</span>
                      </div>
                    )
                  })}
                </div>
              ))
            )}

            {data.assignments && data.assignments.length > 0 && (
              <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: 20, marginTop: 24 }}>
                <div style={{ fontWeight: 700, color: S.text, marginBottom: 10 }}>📝 Assignments</div>
                {data.assignments.map((a) => {
                  const badge = {
                    assigned: { text: 'Assigned', color: S.muted, bg: S.bg },
                    completed: { text: 'Completed — awaiting review', color: S.purple, bg: '#fdf3e3' },
                    marked: { text: 'Marked', color: S.green, bg: '#e8f6ee' },
                  }[a.status]
                  return (
                    <div key={a.id} style={{ padding: '10px 0', borderTop: `1px solid ${S.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{a.title}</span>
                        <span style={{ background: badge.bg, color: badge.color, borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{badge.text}</span>
                      </div>
                      {a.status === 'marked' && a.aiFeedback?.markdown && (
                        <div style={{ marginTop: 8, fontSize: 13, whiteSpace: 'pre-wrap', color: '#444' }}>{a.aiFeedback.markdown}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {data.announcements && data.announcements.length > 0 && (
              <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 10, padding: 20, marginTop: 24 }}>
                <div style={{ fontWeight: 700, color: S.text, marginBottom: 10 }}>📅 Announcements</div>
                {data.announcements.map((a) => (
                  <div key={a.id} style={{ padding: '8px 0', borderTop: `1px solid ${S.border}` }}>
                    <div style={{ fontWeight: 600 }}>{a.title} — {new Date(a.date).toLocaleDateString()}</div>
                    {a.detail && <div style={{ color: S.muted, fontSize: 13 }}>{a.detail}</div>}
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

