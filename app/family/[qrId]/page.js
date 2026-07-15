'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { S, CARD_ACCENTS } from '@/lib/studentTheme'
import CloudBackground from '@/components/CloudBackground'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', emoji: '🏠' },
  { key: 'portfolio', label: 'Portfolio', emoji: '🎨' },
  { key: 'messages', label: 'Messages', emoji: '✉️' },
]

export default function FamilyDashboardPage() {
  const { qrId } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [activeNav, setActiveNav] = useState('dashboard')
  const [activeSubject, setActiveSubject] = useState(null) // null = all subjects

  useEffect(() => {
    fetch(`/api/family-dashboard/${encodeURIComponent(qrId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [qrId])

  const filteredPortfolio = data?.portfolio
    ? (activeSubject ? data.portfolio.filter((p) => p.subject === activeSubject) : data.portfolio)
    : []

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: S.bg, fontFamily: "'Segoe UI', sans-serif", position: 'relative' }}>
      <CloudBackground />

      {/* Sidebar */}
      <aside style={{ width: 220, background: '#fff', borderRight: `1px solid ${S.border}`, padding: 24, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18, color: S.text, marginBottom: 32 }}>
          chalk<span style={{ color: S.purple }}>&circuit</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.key}
              onClick={() => setActiveNav(item.key)}
              style={{
                padding: '10px 12px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                color: activeNav === item.key ? S.purple : S.muted,
                background: activeNav === item.key ? S.purpleLight : 'transparent',
              }}
            >
              {item.emoji} {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 40, maxWidth: 1100, position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 28, color: S.text, margin: '0 0 4px' }}>Welcome back! 👋</h1>
        <p style={{ color: S.muted, fontSize: 14, margin: '0 0 32px' }}>Here's how things are going.</p>

        {error && (
          <div style={{ background: '#FFEAF0', color: S.red, padding: 14, borderRadius: 10, marginBottom: 24, fontSize: 14 }}>{error}</div>
        )}

        {!data && !error && <div style={{ color: S.muted }}>Loading…</div>}

        {data && (activeNav === 'dashboard' || activeNav === 'portfolio') && (
          <>
            {/* Subject Progress -- no percentages, clickable to filter portfolio below */}
            <section style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, color: S.text, margin: '0 0 16px' }}>Subject Progress</h2>
              {data.subjects.length === 0 ? (
                <p style={{ color: S.muted, fontSize: 13 }}>No subjects yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div
                    onClick={() => setActiveSubject(null)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px',
                      borderRadius: 10, cursor: 'pointer',
                      background: activeSubject === null ? S.purpleLight : 'transparent',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: S.text, fontSize: 14 }}>All Subjects</span>
                    <span style={{ color: S.muted, fontSize: 13 }}>{data.portfolio.length} pieces of work</span>
                  </div>
                  {data.subjects.map((subj, i) => (
                    <div
                      key={subj.name}
                      onClick={() => setActiveSubject(subj.name)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px',
                        borderRadius: 10, cursor: 'pointer',
                        background: activeSubject === subj.name ? S.purpleLight : 'transparent',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, color: S.text, fontSize: 14 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 5, background: CARD_ACCENTS[i % CARD_ACCENTS.length], display: 'inline-block' }} />
                        {subj.name}
                      </span>
                      <span style={{ color: S.muted, fontSize: 13 }}>{subj.completed} of {subj.total} completed</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Student Portfolio -- real marked work, filterable by subject */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, color: S.text, margin: 0 }}>
                  Student Portfolio {activeSubject ? `— ${activeSubject}` : ''}
                </h2>
                {activeSubject && (
                  <button onClick={() => setActiveSubject(null)} style={{
                    background: 'none', border: 'none', color: S.purple, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Show all
                  </button>
                )}
              </div>

              {filteredPortfolio.length === 0 ? (
                <div style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 16, padding: 32, textAlign: 'center', color: S.muted }}>
                  No marked work to show yet — check back once your teacher has reviewed a submission.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
                  {filteredPortfolio.map((item) => (
                    <div key={item.id} style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 14, overflow: 'hidden' }}>
                      {item.type === 'image' && item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{
                          height: 140, background: S.purpleLight, padding: 14, fontSize: 12, color: S.text,
                          overflow: 'hidden', fontStyle: 'italic',
                        }}>
                          “{item.textSnippet}…”
                        </div>
                      )}
                      <div style={{ padding: 14 }}>
                        <div style={{ fontWeight: 700, color: S.text, fontSize: 14, marginBottom: 2 }}>{item.title}</div>
                        <div style={{ color: S.muted, fontSize: 12 }}>{item.subject} • {new Date(item.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {data && activeNav === 'messages' && (
          <section style={{ background: '#fff', border: `1px solid ${S.border}`, borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 18, color: S.text, margin: '0 0 16px' }}>Messages</h2>
            {data.messages.length === 0 ? (
              <p style={{ color: S.muted, fontSize: 13 }}>No messages yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.messages.map((m) => (
                  <div key={m.id} style={{ padding: '12px 0', borderTop: `1px solid ${S.border}` }}>
                    <div style={{ fontWeight: 700, color: S.text, fontSize: 14 }}>{m.title} — {new Date(m.date).toLocaleDateString()}</div>
                    {m.detail && <div style={{ color: S.muted, fontSize: 13, marginTop: 4 }}>{m.detail}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
