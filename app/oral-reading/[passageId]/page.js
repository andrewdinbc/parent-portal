'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'

const C = { navy: '#1c3557', gold: '#b57c2a', border: '#ddd4c2', green: '#2e7d4f', red: '#c0392b' }

export default function OralReadingPage() {
  const { passageId } = useParams()
  const [passage, setPassage] = useState(null)
  const [questions, setQuestions] = useState([])
  const [qrId, setQrId] = useState('')
  const [stage, setStage] = useState('identify') // identify -> reading -> recording -> comprehension -> done
  const [recording, setRecording] = useState(false)
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const audioBlobRef = useRef(null)

  useEffect(() => {
    fetch(`/api/oral-reading/passages/${passageId}`).then((r) => r.json()).then((d) => {
      setPassage(d.passage)
      setQuestions(d.questions || [])
    }).catch(() => setError('Could not load this passage.'))
  }, [passageId])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        audioBlobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
      setStage('reading')
    } catch (e) {
      setError('Could not access the microphone. Ask your teacher for help.')
    }
  }

  function finishReading() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
    // Passage disappears from here on - comprehension is answered from memory.
    setStage('comprehension')
  }

  async function submit() {
    setSubmitting(true); setError('')
    try {
      const orderedAnswers = questions.map((q, i) => answers[i] || '')
      const res = await fetch('/api/oral-reading/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrId, passageId, comprehensionAnswers: orderedAnswers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStage('done')
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !passage) return <div style={{ padding: 40, fontFamily: 'Georgia, serif', color: C.red }}>{error}</div>
  if (!passage) return <div style={{ padding: 40, fontFamily: 'Georgia, serif', color: C.navy }}>Loading…</div>

  if (stage === 'identify') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', background: '#faf7f2' }}>
      <div style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
        <h1 style={{ color: C.navy, fontSize: 22, marginBottom: 12 }}>Oral Reading</h1>
        <p style={{ color: '#8a7d6e', fontSize: 14, marginBottom: 20 }}>Scan or enter your own portfolio QR code to begin.</p>
        <input
          value={qrId}
          onChange={(e) => setQrId(e.target.value)}
          placeholder="Your QR ID"
          style={{ width: '100%', padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16, textAlign: 'center', fontSize: 16 }}
        />
        <button
          onClick={() => qrId.trim() && setStage('ready')}
          disabled={!qrId.trim()}
          style={{ width: '100%', padding: 14, background: C.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}
        >
          Continue
        </button>
      </div>
    </div>
  )

  if (stage === 'ready') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', background: '#faf7f2' }}>
      <div style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
        <h1 style={{ color: C.navy, fontSize: 22, marginBottom: 8 }}>{passage.title}</h1>
        <p style={{ color: '#8a7d6e', fontSize: 14, marginBottom: 24 }}>
          Read the passage out loud. Recording starts when you press the button below. When
          you&apos;re done reading, press &quot;I&apos;m Done Reading&quot; — the passage will disappear and
          you&apos;ll answer some questions about it from memory.
        </p>
        <button onClick={startRecording} style={{ padding: '14px 28px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
          🎙️ Start Recording &amp; Reading
        </button>
      </div>
    </div>
  )

  if (stage === 'reading') return (
    <div style={{ minHeight: '100vh', fontFamily: 'Georgia, serif', background: '#fff', padding: 32 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, color: C.red, fontWeight: 700 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
          Recording
        </div>
        <h1 style={{ color: C.navy, fontSize: 22, marginBottom: 20 }}>{passage.title}</h1>
        <p style={{ fontSize: 19, lineHeight: 1.8, color: '#2a2a2a', whiteSpace: 'pre-wrap' }}>{passage.text_content}</p>
        <button onClick={finishReading} style={{ marginTop: 28, width: '100%', padding: 16, background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>
          I&apos;m Done Reading
        </button>
      </div>
    </div>
  )

  if (stage === 'comprehension') {
    const q = questions[current]
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', background: '#faf7f2', padding: 20 }}>
        <div style={{ maxWidth: 500, width: '100%' }}>
          <p style={{ fontSize: 12, color: '#8a7d6e', marginBottom: 8 }}>Question {current + 1} of {questions.length} — answer from memory</p>
          <h2 style={{ color: C.navy, fontSize: 18, marginBottom: 16 }}>{q.question_text}</h2>
          <textarea
            value={answers[current] || ''}
            onChange={(e) => setAnswers((a) => ({ ...a, [current]: e.target.value }))}
            rows={4}
            style={{ width: '100%', padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 15, boxSizing: 'border-box', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            {current > 0 && (
              <button onClick={() => setCurrent((c) => c - 1)} style={{ padding: '12px 20px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Back
              </button>
            )}
            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent((c) => c + 1)} style={{ flex: 1, padding: 12, background: C.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                Next →
              </button>
            ) : (
              <button onClick={submit} disabled={submitting} style={{ flex: 1, padding: 12, background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            )}
          </div>
          {error && <div style={{ marginTop: 12, color: C.red, fontSize: 13 }}>{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', background: C.navy, color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h1 style={{ fontSize: 22 }}>All done!</h1>
        <p style={{ opacity: 0.8, marginTop: 8 }}>Your teacher will listen to your recording and finish scoring it soon.</p>
      </div>
    </div>
  )
}
