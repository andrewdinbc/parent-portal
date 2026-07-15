'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAssignmentAnalytics, getSkillAnalytics } from './actions'

// Layout modeled on CoGrader's teacher dashboard (left sidebar of
// assignments + quick actions, main "Grade" action cards, and a "Trends
// and patterns" section with an assignment picker feeding
// Overall Assessment / Strengths / Areas for Growth cards). Inline styles
// throughout -- see standing note in components/Tooltip.jsx pattern used
// across the other Chalk & Circuit products (no Tailwind in this repo).
const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', red: '#a33', border: '#e3ddd0', bg: '#f7f5f0', card: '#fff' }

function ActionCard({ href, emoji, title, desc }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 16, background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 20, textDecoration: 'none', flex: 1, minWidth: 260,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: C.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
      }}>
        {emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 16, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#888' }}>{desc}</div>
      </div>
      <span style={{ color: '#bbb', fontSize: 18 }}>›</span>
    </Link>
  )
}

function InfoCard({ emoji, title, children }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, flex: 1, minWidth: 260 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <h3 style={{ margin: 0, fontSize: 16, color: C.navy }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function TeacherDashboardClient({ assignments }) {
  const [selectedId, setSelectedId] = useState(assignments[0]?.id || '')
  const [analytics, setAnalytics] = useState(null)
  const [skills, setSkills] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    getAssignmentAnalytics(selectedId).then((data) => {
      setAnalytics(data)
      setLoading(false)
    })
  }, [selectedId])

  useEffect(() => {
    getSkillAnalytics().then(setSkills)
  }, [])

  const weakest = skills?.criterionBreakdown?.slice(0, 3) || []
  const strongest = skills?.criterionBreakdown ? [...skills.criterionBreakdown].sort((a, b) => b.avgPct - a.avgPct).slice(0, 3) : []

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', sans-serif", display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: C.card, borderRight: `1px solid ${C.border}`, padding: 24, flexShrink: 0 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, color: C.navy, fontSize: 18, marginBottom: 28 }}>
          chalk<span style={{ color: C.gold }}>&circuit</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>Assignments</span>
          <Link href="/teacher/assignments/new" title="Create a new assignment" style={{ color: C.navy, textDecoration: 'none', fontSize: 18, fontWeight: 700 }}>+</Link>
        </div>
        {assignments.length === 0 ? (
          <div style={{ fontSize: 13, color: '#999' }}>No assignments yet</div>
        ) : (
          assignments.slice(0, 8).map((a) => (
            <div
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              title={`View analytics for ${a.title}`}
              style={{
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 4,
                background: a.id === selectedId ? C.bg : 'transparent',
                color: a.id === selectedId ? C.navy : '#555',
                fontWeight: a.id === selectedId ? 700 : 400,
              }}
            >
              {a.title}
            </div>
          ))
        )}
        <Link href="/teacher/assignments" style={{ display: 'block', marginTop: 16, fontSize: 13, color: C.navy, fontWeight: 600, textDecoration: 'none' }}>
          View all →
        </Link>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 40, maxWidth: 1100 }}>
        <h1 style={{ fontSize: 24, color: C.navy, margin: '0 0 20px' }}>Grade essays & worksheets</h1>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <ActionCard href="/teacher/submissions" emoji="✍️" title="Submissions" desc="Review scanned work and give personalized feedback" />
          <ActionCard href="/teacher/quiz-sessions" emoji="📊" title="Quiz Sessions" desc="Score multiple choice and short-answer questions" />
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
          <ActionCard href="/teacher/rubrics" emoji="📖" title="Rubric library" desc="Browse and manage your grading rubrics" />
          <ActionCard href="/teacher/assignments" emoji="🔑" title="My assignments & answer keys" desc="Manage assignments and answer keys" />
        </div>

        <h2 style={{ fontSize: 22, color: C.navy, margin: '0 0 20px' }}>Trends and patterns</h2>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            title="Choose which assignment's analytics to view"
            style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, background: C.card, minWidth: 200 }}
          >
            {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ color: '#999', padding: 20 }}>Loading…</div>
        ) : !analytics || analytics.approvedCount === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, color: '#888', fontSize: 14 }}>
            No approved feedback yet for this assignment — analytics will populate once submissions are marked and approved.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <InfoCard emoji="🎯" title="Overall Assessment">
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: 0 }}>
                Average score: <strong>{analytics.overview.avgScore}/{analytics.overview.maxScore}</strong> across{' '}
                {analytics.approvedCount} of {analytics.submissionCount} submissions reviewed.
              </p>
              <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
                {analytics.overview.distribution.map((d) => (
                  <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span>{d.label}</span><span>{d.count}</span>
                  </div>
                ))}
              </div>
            </InfoCard>
            <InfoCard emoji="👍" title="Strengths">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                {analytics.patterns.strengths.map((s) => (
                  <li key={s.name}>{s.name} — {s.avgScore}/{s.maxScore} ({s.studentCount} students)</li>
                ))}
              </ul>
            </InfoCard>
            <InfoCard emoji="🌱" title="Areas for Growth">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                {analytics.patterns.areasForGrowth.map((s) => (
                  <li key={s.name}>{s.name} — {s.avgScore}/{s.maxScore} ({s.studentCount} students)</li>
                ))}
              </ul>
            </InfoCard>
          </div>
        )}

        {skills && skills.totalDataPoints > 0 && (
          <>
            <h2 style={{ fontSize: 20, color: C.navy, margin: '40px 0 16px' }}>Across all assignments</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <InfoCard emoji="⚠️" title="Weakest criteria overall">
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                  {weakest.map((c) => <li key={c.name}>{c.name} — {c.avgPct}% avg ({c.count} data points)</li>)}
                </ul>
              </InfoCard>
              <InfoCard emoji="⭐" title="Strongest criteria overall">
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                  {strongest.map((c) => <li key={c.name}>{c.name} — {c.avgPct}% avg ({c.count} data points)</li>)}
                </ul>
              </InfoCard>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
