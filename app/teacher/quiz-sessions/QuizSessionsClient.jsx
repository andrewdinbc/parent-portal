'use client'
import { useState, useEffect } from 'react'
import { getQuizzes, getRecentSessions, startQuizSession, endQuizSession, getQuizSessionDetail } from '../actions'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', red: '#a33', border: '#e3ddd0', bg: '#f7f5f0', card: '#fff' }

export default function QuizSessionsClient() {
  const [quizzes, setQuizzes] = useState([])
  const [sessions, setSessions] = useState([])
  const [starting, setStarting] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const loadSessions = () => getRecentSessions().then(setSessions)

  useEffect(() => {
    getQuizzes().then(setQuizzes)
    loadSessions()
  }, [])

  useEffect(() => {
    if (!detailId) return
    const load = () => getQuizSessionDetail(detailId).then(setDetail)
    load()
    const interval = setInterval(load, 8000) // live-ish polling while a teacher is watching
    return () => clearInterval(interval)
  }, [detailId])

  const handleStart = async (quizId) => {
    setStarting(quizId)
    const session = await startQuizSession(quizId)
    setStarting(null)
    loadSessions()
    setDetailId(session.id)
  }

  const handleEnd = async (sessionId) => {
    await endQuizSession(sessionId)
    loadSessions()
    if (detailId === sessionId) setDetail((d) => d ? { ...d, session: { ...d.session, status: 'ended' } } : d)
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, color: C.navy, margin: '0 0 12px' }}>Your quizzes</h2>
      {quizzes.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, color: '#888', marginBottom: 30 }}>
          No quizzes yet. Build one via /api/quizzes (Quiz Maker UI not built yet).
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 30 }}>
          {quizzes.map((q) => (
            <div key={q.id} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{q.title}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{q.subject || 'General'} · {q.question_type}</div>
              </div>
              <button onClick={() => handleStart(q.id)} disabled={starting === q.id} title="Start a live session for this quiz" style={{
                padding: '8px 16px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6,
                fontWeight: 600, fontSize: 13, cursor: starting === q.id ? 'not-allowed' : 'pointer', opacity: starting === q.id ? 0.6 : 1,
              }}>
                {starting === q.id ? 'Starting…' : 'Start Session'}
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 16, color: C.navy, margin: '0 0 12px' }}>Recent sessions</h2>
      {sessions.length === 0 ? (
        <div style={{ color: '#888', fontSize: 13 }}>No sessions yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {sessions.map((s) => (
            <div key={s.id} onClick={() => setDetailId(s.id)} style={{
              background: C.card, border: `1px solid ${detailId === s.id ? C.navy : C.border}`, borderRadius: 10, padding: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.quizzes?.title || 'Quiz'}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{new Date(s.created_at).toLocaleString()}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                background: s.status === 'active' ? C.green : '#999', color: '#fff',
              }}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: C.navy }}>{detail.session.quizzes?.title}</h3>
            {detail.session.status === 'active' && (
              <button onClick={() => handleEnd(detail.session.id)} style={{
                background: 'none', border: `1px solid ${C.red}`, color: C.red, padding: '6px 14px',
                borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                End Session
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13 }}>
            <div><strong>{detail.counts.checkedIn}</strong> checked in</div>
            <div style={{ color: C.green }}><strong>{detail.counts.completed}</strong> completed</div>
            <div style={{ color: C.gold }}><strong>{detail.counts.likelyAway}</strong> may have left</div>
            <div style={{ color: C.red }}><strong>{detail.counts.flagged}</strong> flagged just now</div>
          </div>
          {detail.devices.length === 0 ? (
            <div style={{ color: '#888', fontSize: 13 }}>No devices checked in yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {detail.devices.map((d) => (
                <div key={d.id} style={{
                  display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <span>{d.qr_id || 'Unidentified device'}</span>
                  <span style={{
                    color: d.recentlyFlagged ? C.red : d.status === 'completed' ? C.green : d.likelyAway ? C.gold : '#555',
                    fontWeight: 600,
                  }}>
                    {d.recentlyFlagged ? '⚠️ flagged' : d.status === 'completed' ? '✓ completed' : d.likelyAway ? 'may have left' : 'active'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
