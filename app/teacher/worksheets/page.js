'use client'
import { useState, useRef } from 'react'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3', muted: '#8a7d6e' }

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

export default function WorksheetSetupPage() {
  const [secret, setSecret] = useState(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('math')
  const [mode, setMode] = useState('upload') // 'upload' | 'blank'
  const [file, setFile] = useState(null)
  const [rubric, setRubric] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  async function generate(e) {
    e.preventDefault()
    setError(''); setGenerating(true); setResult(null)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('subject', subject)
      if (rubric.trim()) formData.append('rubric', rubric.trim())
      if (mode === 'upload' && file) formData.append('file', file)

      const res = await fetch('/api/qr-worksheet/bulk', {
        method: 'POST',
        headers: { 'x-portfolio-sync-secret': secret },
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Generation failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const studentCount = res.headers.get('X-Student-Count')
      setResult({ url, studentCount, filename: `${title.replace(/[^a-z0-9]+/gi, '_')}-class-set.pdf` })
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  if (!secret) return <SecretGate onUnlock={setSecret} />

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ color: C.navy, fontSize: 28, marginBottom: 4 }}>QR Worksheet Setup</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
          Generate one printable, class-wide PDF — one page per registered student, each with their own QR code
          in the top-right corner. Upload an existing worksheet to auto-superimpose the QR, or use blank lined paper.
        </p>

        <form onSubmit={generate} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title"
            style={{ width: '100%', padding: 10, marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }} />

          <select value={subject} onChange={(e) => setSubject(e.target.value)}
            style={{ width: '100%', padding: 10, marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit' }}>
            <option value="math">Math</option>
            <option value="language_arts">Language Arts</option>
          </select>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button type="button" onClick={() => setMode('upload')}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${mode === 'upload' ? C.navy : C.border}`, background: mode === 'upload' ? C.navy : '#fff', color: mode === 'upload' ? '#fff' : C.navy, cursor: 'pointer', fontWeight: 600 }}>
              📄 Upload My Worksheet
            </button>
            <button type="button" onClick={() => setMode('blank')}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${mode === 'blank' ? C.navy : C.border}`, background: mode === 'blank' ? C.navy : '#fff', color: mode === 'blank' ? '#fff' : C.navy, cursor: 'pointer', fontWeight: 600 }}>
              📝 Blank Lined Paper
            </button>
          </div>

          {mode === 'upload' && (
            <div style={{ marginBottom: 16 }}>
              <input ref={fileInputRef} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', padding: 12, border: `2px dashed ${C.border}`, borderRadius: 8, background: '#fafafa', cursor: 'pointer' }}>
                {file ? `✅ ${file.name}` : '📎 Choose a PDF worksheet (page 1 gets the QR)'}
              </button>
            </div>
          )}

          <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} placeholder="Rubric or marking notes (optional)"
            style={{ width: '100%', minHeight: 70, padding: 10, marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }} />

          {error && <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 12, color: '#c0392b', marginBottom: 16 }}>{error}</div>}

          <button type="submit" disabled={generating || (mode === 'upload' && !file)}
            style={{ width: '100%', padding: 14, background: C.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            {generating ? 'Generating class set…' : 'Generate & Download Class Set'}
          </button>
        </form>

        {result && (
          <div style={{ background: '#eef7f0', border: `1px solid ${C.green}`, borderRadius: 10, padding: 20, marginTop: 16 }}>
            <div style={{ fontWeight: 700, color: C.green, marginBottom: 8 }}>
              ✅ Generated {result.studentCount} page{result.studentCount === '1' ? '' : 's'} — one per student
            </div>
            <a href={result.url} download={result.filename}
              style={{ display: 'inline-block', padding: '10px 20px', background: C.navy, color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
              ⬇ Download PDF
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
