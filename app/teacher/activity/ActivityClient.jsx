'use client'
import { useState, useEffect } from 'react'
import { getStudentActivity } from '../actions'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#e3ddd0', bg: '#f7f5f0', card: '#fff', muted: '#888' }

const EVENT_ICON = { submission: '📤', marked: '✅', approved: '👍', oral_reading: '🎙️' }

function StatCard({ label, value, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 160, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.navy }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function ActivityClient() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getStudentActivity().then((d) => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color: C.muted, padding: 20 }}>Loading…</div>
  if (!data || data.totalStudents === 0) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, color: C.muted, fontSize: 14 }}>
        No activity recorded yet — this populates automatically as students submit work, get feedback approved, or complete oral reading passages.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Students with activity" value={data.totalStudents} />
        <StatCard label={`Active in last ${data.windowDays} days`} value={`${data.activeThisWindow} / ${data.totalStudents}`} />
        <StatCard
          label="Avg. time to feedback"
          value={data.classAvgTurnaroundHours !== null ? `${data.classAvgTurnaroundHours}h` : '—'}
          sub={data.classAvgTurnaroundHours === null ? 'No marked submissions yet' : 'submission → marked'}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.students.map((s) => (
          <div key={s.qrId} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button
              onClick={() => setExpanded(expanded === s.qrId ? null : s.qrId)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>Student {s.qrId}</span>
                <span style={{ fontSize: 12, color: C.muted, marginLeft: 12 }}>
                  {s.eventCount} event{s.eventCount === 1 ? '' : 's'}
                  {s.avgTurnaroundHours !== null && ` · avg feedback ${s.avgTurnaroundHours}h`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {s.activeThisWindow && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: '#eef7f0', padding: '3px 8px', borderRadius: 20 }}>ACTIVE</span>
                )}
                <span style={{ fontSize: 12, color: C.muted }}>{expanded === s.qrId ? '▲' : '▼'}</span>
              </div>
            </button>

            {expanded === s.qrId && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 18px 16px' }}>
                {s.timeline.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, padding: '6px 0', borderBottom: i < s.timeline.length - 1 ? `1px solid ${C.bg}` : 'none' }}>
                    <span>{EVENT_ICON[e.type] || '•'}</span>
                    <span style={{ color: '#555', flex: 1 }}>{e.label}</span>
                    <span style={{ color: C.muted }}>{new Date(e.occurredAt).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#bbb', marginTop: 24, maxWidth: 600 }}>
        Not shown: on-time submission rate (assignments don&apos;t have due dates anywhere in the system yet) and communication activity (no messaging feature has any real usage yet). Both would need to be built as real features first rather than estimated here.
      </p>
    </div>
  )
}
