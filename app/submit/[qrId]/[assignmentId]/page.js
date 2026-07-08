'use client'
import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }

export default function SubmitPage() {
  const params = useParams()
  const { qrId, assignmentId } = params
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
  const [error, setError] = useState('')

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    if (!file) return
    setStatus('uploading'); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('qrId', qrId)
      formData.append('assignmentId', assignmentId)
      const res = await fetch('/api/submit', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setStatus('done')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h1 style={{ color: C.green, fontSize: 24 }}>Submitted!</h1>
          <p style={{ color: '#8a7d6e' }}>Your teacher will review it soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ color: C.navy, fontSize: 22, marginBottom: 8, textAlign: 'center' }}>Submit Your Work</h1>
      <p style={{ color: '#8a7d6e', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
        Take a photo of your completed page, or choose one from your photos.
      </p>

      {preview ? (
        <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16 }} />
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{ width: 240, height: 240, background: '#fff', border: `2px dashed ${C.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 16, fontSize: 40 }}
        >
          📷
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {!preview && (
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '12px 24px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          Take Photo
        </button>
      )}

      {preview && status !== 'uploading' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setPreview(null); setFile(null); }} style={{ padding: '12px 20px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8 }}>
            Retake
          </button>
          <button onClick={submit} style={{ padding: '12px 24px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}>
            Submit
          </button>
        </div>
      )}

      {status === 'uploading' && <div style={{ color: C.navy }}>Uploading…</div>}
      {error && <div style={{ color: '#c0392b', marginTop: 10 }}>{error}</div>}
    </div>
  )
}
