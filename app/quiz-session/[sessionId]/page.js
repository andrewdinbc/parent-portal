'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', red: '#b03a2e', border: '#ddd4c2', muted: '#8a7d6e' }

function getDeviceToken() {
  let token = localStorage.getItem('quizDeviceToken')
  if (!token) {
    token = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('quizDeviceToken', token)
  }
  return token
}

export default function QuizSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId
  const [stage, setStage] = useState('loading') // loading | identify | quiz | submitting | done | ended
  const [quiz, setQuiz] = useState(null)
  const [qrId, setQrId] = useState('')
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const deviceToken = useRef(null)

  useEffect(() => {
    deviceToken.current = getDeviceToken()
    fetch(`/api/quiz-sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setStage('ended'); return }
        setQuiz(d.session.quizzes)
        setStage('identify')
      })
      .catch(() => { setError('Could not load this quiz.'); setStage('ended') })
  }, [sessionId])

  // Heartbeat while the quiz is active and the tab is visible.
  useEffect(() => {
    if (stage !== 'quiz') return
    const ping = () => {
      if (document.visibilityState === 'visible') {
        fetch(`/api/quiz-sessions/${sessionId}/heartbeat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceToken: deviceToken.current }),
        }).catch(() => {})
      }
    }
    ping()
    const interval = setInterval(ping, 10000)
    return () => clearInterval(interval)
  }, [stage, sessionId])

  // Can't prevent a student from switching apps/tabs from a webpage - only
  // detect it and make it loud and obvious, plus log it so the teacher
  // dashboard can flag which student's device left the quiz.
  function playAlertBeep() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioContextClass()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3)
      osc.stop(ctx.currentTime + 0.5)
    } catch { /* audio not available - the flag still logs either way */ }
  }

  function reportOffQuiz(reason) {
    playAlertBeep()
    fetch(`/api/quiz-sessions/${sessionId}/flag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceToken: deviceToken.current, reason }),
    }).catch(() => {})
  }

  useEffect(() => {
    if (stage !== 'quiz') return
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') reportOffQuiz('tab_hidden')
    }
    const onBlur = () => reportOffQuiz('window_blur')
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onBlur)
    }
  }, [stage, sessionId])

  async function identify(e) {
    e.preventDefault()
    setError('')
    try {
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {})
      const res = await fetch(`/api/quiz-sessions/${sessionId}/checkin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken: deviceToken.current, qrId: qrId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStage('quiz')
    } catch (e) {
      setError(e.message)
    }
  }

  function selectAnswer(qIndex, optionIndex) {
    setAnswers((a) => ({ ...a, [qIndex]: optionIndex }))
  }

  async function submit() {
    setStage('submitting')
    try {
      const res = await fetch(`/api/quiz-sessions/${sessionId}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken: deviceToken.current, answers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStage('done')
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    } catch (e) {
      setError(e.message)
      setStage('quiz')
    }
  }

  const wrap = { minHeight: '100vh', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5f0e8' }

  if (stage === 'loading') return <div style={wrap}><p style={{ color: C.muted }}>Loading quiz…</p></div>

  if (stage === 'ended') return (
    <div style={wrap}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
        <p style={{ color: C.navy, fontSize: 18 }}>{error || 'This quiz session has ended.'}</p>
      </div>
    </div>
  )

  if (stage === 'identify') return (
    <div style={wrap}>
      <form onSubmit={identify} style={{ background: '#fff', padding: 32, borderRadius: 12, maxWidth: 380, width: '100%', border: `1px solid ${C.border}` }}>
        <h1 style={{ color: C.navy, fontSize: 22, marginBottom: 4 }}>{quiz?.title}</h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Scan or type your own portfolio QR code to begin — not your name.</p>
        <input
          value={qrId}
          onChange={(e) => setQrId(e.target.value)}
          placeholder="Your QR ID"
          autoFocus
          style={{ width: '100%', padding: 14, fontSize: 16, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 16, boxSizing: 'border-box' }}
        />
        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button type="submit" style={{ width: '100%', padding: 14, background: C.gold, color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          Start Quiz
        </button>
      </form>
    </div>
  )

  if (stage === 'quiz') {
    const q = quiz.questions[current]
    const isLast = current === quiz.questions.length - 1
    return (
      <div style={{ minHeight: '100vh', fontFamily: 'Georgia, serif', background: '#f5f0e8', padding: 24 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Question {current + 1} of {quiz.questions.length}</div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <p style={{ color: C.navy, fontSize: 18, marginBottom: 20 }}>{q.question}</p>
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => selectAnswer(current, i)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: 14, marginBottom: 10,
                  borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15,
                  background: answers[current] === i ? '#fdf6ea' : '#fff',
                  border: answers[current] === i ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                  color: C.navy,
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
              style={{ padding: '12px 20px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, cursor: current === 0 ? 'default' : 'pointer', opacity: current === 0 ? 0.4 : 1 }}>
              Back
            </button>
            {isLast ? (
              <button onClick={submit} disabled={answers[current] === undefined}
                style={{ flex: 1, padding: '12px 20px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                Submit Quiz
              </button>
            ) : (
              <button onClick={() => setCurrent((c) => c + 1)} disabled={answers[current] === undefined}
                style={{ flex: 1, padding: '12px 20px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'submitting') return <div style={wrap}><p style={{ color: C.muted }}>Submitting…</p></div>

  function retake() {
    setAnswers({})
    setCurrent(0)
    setResult(null)
    setStage('quiz')
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {})
  }

  if (stage === 'done') return (
    <div style={{ minHeight: '100vh', fontFamily: 'Georgia, serif', background: C.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Return iPad to teacher</h1>
        <p style={{ opacity: 0.7, marginBottom: 20 }}>Score: {result?.correct} / {result?.total} (attempt {result?.attemptNumber})</p>
        <button onClick={retake} style={{ padding: '10px 22px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          Try Again
        </button>
        <p style={{ opacity: 0.5, fontSize: 12, marginTop: 12 }}>Your first attempt and your best attempt both stay in your portfolio.</p>
      </div>
    </div>
  )

  return null
}

