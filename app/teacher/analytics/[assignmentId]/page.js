'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3', muted: '#8a7d6e' }
const TABS = ['Overview', 'Patterns', 'Strengths', 'Areas for Growth']

function SecretGate({ onUnlock }) {
  const [secret, setSecret] = useState('')
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 10, border: `1px solid ${C.border}`, width: 340 }}>
        <h2 style={{ color: C.navy, marginTop: 0 }}>Teacher Access</h2>
        <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Portfolio sync secret"
          style={{ width: '100%', padding: 10, marginBottom: 12, border: `1px solid ${C.border}`, borderRadius: 6, boxSizing: 'border-box' }} />
        <button onClick={() => onUnlock(secret)} style={{ width: '100%', padding: 10, background: C.gold, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}>
          Enter
        </button>
      </div>
    </div>
  )
}

function Bar({ label, value, max, color }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: C.muted }}>{value}{max ? ` / ${max}` : ''}</span>
      </div>
      <div style={{ background: '#eee', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%' }} />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const params = useParams()
  const assignmentId = params.assignmentId
  const [secret, setSecret] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')

  useEffect(() => {
    if (!secret) return
    setLoading(true)
    fetch(`/api/teacher/analytics?assignmentId=${assignmentId}`, { headers: { 'x-portfolio-sync-secret': secret } })
      .then((res) => { if (res.status === 401) { setSecret(null); return null } return res.json() })
      .then((d) => d && setData(d))
      .finally(() => setLoading(false))
  }, [secret])

  if (!secret) return <SecretGate onUnlock={setSecret} />
  if (loading) return <div style={{ padding: 32, fontFamily: 'Georgia, serif' }}>Loading…</div>
  if (!data) return <div style={{ padding: 32, fontFamily: 'Georgia, serif' }}>Could not load analytics.</div>

  const { assignment, submissionCount, approvedCount, overview, patterns } = data

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '18px 24px' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{assignment?.title}</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>{approvedCount} of {submissionCount} submissions reviewed</div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '12px 24px', background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === t ? C.navy : 'transparent', color: tab === t ? '#fff' : C.navy }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 800 }}>
        {!overview ? (
          <div style={{ color: C.muted }}>No approved feedback yet — analytics will populate once submissions are reviewed on the Teacher Review page.</div>
        ) : (
          <>
            {tab === 'Overview' && (
              <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
                  {overview.avgScore} / {overview.maxScore}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Class average across {approvedCount} submissions</div>

                <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>Distribution</div>
                {overview.distribution.map((d) => (
                  <Bar key={d.label} label={d.label} value={d.count} max={approvedCount} color={C.gold} />
                ))}

                <div style={{ fontWeight: 700, color: C.navy, margin: '20px 0 10px' }}>Criteria (class average)</div>
                {overview.criteria.map((c) => (
                  <Bar key={c.name} label={c.name} value={c.avgScore} max={c.maxScore} color={C.navy} />
                ))}
              </div>
            )}

            {tab === 'Patterns' && (
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, background: '#eef7f0', padding: 20, borderRadius: 10 }}>
                  <div style={{ fontWeight: 700, color: C.green, marginBottom: 10 }}>📈 Strengths</div>
                  {patterns.strengths.map((s) => (
                    <div key={s.name} style={{ marginBottom: 8, fontSize: 13 }}>
                      <strong>{s.name}</strong> — {s.avgScore}/{s.maxScore} avg ({s.studentCount} students)
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, background: '#fdf3e3', padding: 20, borderRadius: 10 }}>
                  <div style={{ fontWeight: 700, color: '#b8860b', marginBottom: 10 }}>🎯 Areas for Growth</div>
                  {patterns.areasForGrowth.map((s) => (
                    <div key={s.name} style={{ marginBottom: 8, fontSize: 13 }}>
                      <strong>{s.name}</strong> — {s.avgScore}/{s.maxScore} avg ({s.studentCount} students)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'Strengths' && (
              <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16 }}>What the class is doing well</div>
                {patterns.strengths.map((s) => (
                  <Bar key={s.name} label={s.name} value={s.avgScore} max={s.maxScore} color={C.green} />
                ))}
              </div>
            )}

            {tab === 'Areas for Growth' && (
              <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16 }}>Where the class needs the most support</div>
                {patterns.areasForGrowth.map((s) => (
                  <Bar key={s.name} label={s.name} value={s.avgScore} max={s.maxScore} color={C.gold} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
