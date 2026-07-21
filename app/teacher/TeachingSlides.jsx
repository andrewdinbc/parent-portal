'use client'
import { useState, useEffect, useCallback } from 'react'

// Create Teaching Slides (2026-07-21) -- the last real CoGrader-parity
// gap. Deliberately NOT a .pptx generator: no product in this ecosystem
// has ever generated pptx (checked -- would mean a brand-new dependency
// and a brand-new file-generation pipeline for one feature), and every
// bit of content here already exists as real computed data from
// getAssignmentAnalytics(). This is a full-screen, presentable/printable
// view of that same data -- Next/Prev like a real deck, Escape to exit,
// works with a browser's own print-to-PDF if a downloadable file is
// wanted. If a real .pptx export is genuinely needed later, that's a
// separate scoped addition (pptxgenjs or similar), not squeezed in here.
//
// parent-portal has no shared lib/theme.js (checked -- only
// lib/studentTheme.js for the student-facing purple theme); the teacher
// dashboard defines its own color const inline instead. Matching that
// convention here rather than assuming a shared file that doesn't exist.
const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#e3ddd0', bg: '#f7f5f0', card: '#fff', muted: '#888' }

function Slide({ children }) {
  return (
    <div style={{
      width: '100%', maxWidth: 900, minHeight: 480, background: '#fff', borderRadius: 16,
      padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
    }}>
      {children}
    </div>
  )
}

export default function TeachingSlides({ assignmentTitle, analytics, onClose }) {
  const [index, setIndex] = useState(0)

  const slides = [
    { key: 'title', render: () => (
      <Slide>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Class Debrief</div>
        <h1 style={{ fontSize: 40, color: C.navy, margin: 0 }}>{assignmentTitle}</h1>
        <p style={{ fontSize: 15, color: C.muted, marginTop: 16 }}>
          {analytics.approvedCount} of {analytics.submissionCount} submissions reviewed
        </p>
      </Slide>
    )},
    { key: 'overview', render: () => (
      <Slide>
        <h2 style={{ fontSize: 26, color: C.navy, marginBottom: 24 }}>🎯 Overview</h2>
        <p style={{ fontSize: 22, color: '#333', marginBottom: 20 }}>
          Class average: <strong>{analytics.overview.avgScore} / {analytics.overview.maxScore}</strong>
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          {analytics.overview.distribution.map((d) => (
            <div key={d.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.navy }}>{d.count}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{d.label}</div>
            </div>
          ))}
        </div>
      </Slide>
    )},
    { key: 'strengths', render: () => (
      <Slide>
        <h2 style={{ fontSize: 26, color: C.navy, marginBottom: 24 }}>👍 Strengths</h2>
        <ul style={{ fontSize: 18, color: '#333', lineHeight: 2.1, paddingLeft: 24 }}>
          {analytics.patterns.strengths.map((s) => (
            <li key={s.name}>{s.name} — {s.avgScore}/{s.maxScore} <span style={{ color: C.muted, fontSize: 14 }}>({s.studentCount} students)</span></li>
          ))}
        </ul>
      </Slide>
    )},
    { key: 'growth', render: () => (
      <Slide>
        <h2 style={{ fontSize: 26, color: C.navy, marginBottom: 24 }}>🌱 Areas for Growth</h2>
        <ul style={{ fontSize: 18, color: '#333', lineHeight: 2.1, paddingLeft: 24 }}>
          {analytics.patterns.areasForGrowth.map((s) => (
            <li key={s.name}>{s.name} — {s.avgScore}/{s.maxScore} <span style={{ color: C.muted, fontSize: 14 }}>({s.studentCount} students)</span></li>
          ))}
        </ul>
      </Slide>
    )},
    ...(analytics.intensiveSupport?.candidateCount > 0 ? [{ key: 'intensive', render: () => (
      <Slide>
        <h2 style={{ fontSize: 26, color: C.navy, marginBottom: 12 }}>🆘 Intensive Support</h2>
        <p style={{ fontSize: 16, color: C.muted, marginBottom: 20 }}>
          {analytics.intensiveSupport.candidateCount} student{analytics.intensiveSupport.candidateCount === 1 ? '' : 's'} may need more than a small group
        </p>
        <ul style={{ fontSize: 15, color: '#333', lineHeight: 1.9, paddingLeft: 24 }}>
          {analytics.intensiveSupport.students.map((s) => <li key={s.qrId}>Student {s.qrId} — {s.overallScore}/{s.maxScore}</li>)}
        </ul>
      </Slide>
    )}] : []),
    { key: 'next', render: () => (
      <Slide>
        <h2 style={{ fontSize: 26, color: C.navy, marginBottom: 24 }}>📅 Plan the Follow-up</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><strong style={{ color: C.navy }}>Advanced learners ({analytics.nextLesson.advancedLearners.count}):</strong> <span style={{ color: '#555' }}>{analytics.nextLesson.advancedLearners.suggestion}</span></div>
          <div><strong style={{ color: C.navy }}>Learners who need support ({analytics.nextLesson.needsSupport.count}):</strong> <span style={{ color: '#555' }}>{analytics.nextLesson.needsSupport.suggestion}</span></div>
          <div><strong style={{ color: C.navy }}>Whole class:</strong> <span style={{ color: '#555' }}>{analytics.nextLesson.wholeClass.suggestion}</span></div>
        </div>
      </Slide>
    )},
  ]

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), [slides.length])
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === ' ') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(28,53,87,0.92)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40,
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 24, right: 32, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer',
      }}>✕</button>

      {slides[index].render()}

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24 }}>
        <button onClick={prev} disabled={index === 0} style={{
          padding: '8px 16px', borderRadius: 8, border: 'none', background: '#fff', color: C.navy, fontWeight: 600, cursor: 'pointer', opacity: index === 0 ? 0.4 : 1,
        }}>← Prev</button>
        <span style={{ color: '#fff', fontSize: 13 }}>{index + 1} / {slides.length}</span>
        <button onClick={next} disabled={index === slides.length - 1} style={{
          padding: '8px 16px', borderRadius: 8, border: 'none', background: C.gold, color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: index === slides.length - 1 ? 0.4 : 1,
        }}>Next →</button>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 16 }}>
        Arrow keys to navigate · Esc to exit · use your browser's Print to save as PDF
      </p>
    </div>
  )
}
