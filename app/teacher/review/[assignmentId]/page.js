'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3', muted: '#8a7d6e' }
const LEVELS = ['Developing', 'Emerging', 'Proficient', 'Extending']

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

export default function TeacherReviewPage() {
  const params = useParams()
  const assignmentId = params.assignmentId
  const [secret, setSecret] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([]);
  const [idx, setIdx] = useState(0)
  const [draft, setDraft] = useState(null) // editable copy of current submission's structured_feedback
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load(s) {
    setLoading(true)
    try {
      const res = await fetch(`/api/teacher/submissions?assignmentId=${assignmentId}`, {
        headers: { 'x-portfolio-sync-secret': s },
      })
      if (res.status === 401) { setSecret(null); setLoading(false); return }
      const data = await res.json()
      setAssignment(data.assignment)
      setSubmissions(data.submissions || [])
      if (data.submissions?.[0]) setDraft(data.submissions[0].structured_feedback || null)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { if (secret) load(secret) }, [secret])
  useEffect(() => { setDraft(submissions[idx]?.structured_feedback || null) }, [idx])

  if (!secret) return <SecretGate onUnlock={setSecret} />
  if (loading) return <div style={{ padding: 32, fontFamily: 'Georgia, serif' }}>Loading…</div>
  if (!submissions.length) return <div style={{ padding: 32, fontFamily: 'Georgia, serif' }}>No submissions yet for this assignment.</div>

  const sub = submissions[idx]

  function updateCriterion(i, field, value) {
    setDraft((d) => {
      const criteria = [...(d.criteria || [])]
      criteria[i] = { ...criteria[i], [field]: value }
      return { ...d, criteria }
    })
  }

  async function saveAndApprove() {
    setSaving(true)
    try {
      const res = await fetch('/api/teacher/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-portfolio-sync-secret': secret },
        body: JSON.stringify({
          qrId: sub.qr_id,
          assessment: { type: 'rubric_feedback', assignmentId, feedback: draft, approvedAt: new Date().toISOString() },
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      // Advance to next submission after approving, matching CoGrader's flow.
      if (idx < submissions.length - 1) setIdx(idx + 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{assignment?.title}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{assignment?.subject}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>‹</button>
          <span style={{ fontSize: 13 }}>{idx + 1} of {submissions.length}</span>
          <button onClick={() => setIdx((i) => Math.min(submissions.length - 1, i + 1))} disabled={idx === submissions.length - 1} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>›</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0 }}>
        {/* LEFT: the submission itself */}
        <div style={{ flex: 1, padding: 24, borderRight: `1px solid ${C.border}`, maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 8 }}>Student QR: {sub.qr_id}</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Submitted {new Date(sub.submitted_at).toLocaleString()}</div>
          {sub.text_content ? (
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.7, background: '#fff', padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
              {sub.text_content}
            </div>
          ) : (
            <img src={sub.image_url} alt="submission" style={{ maxWidth: '100%', borderRadius: 10, border: `1px solid ${C.border}` }} />
          )}
        </div>

        {/* RIGHT: rubric feedback, editable */}
        <div style={{ flex: 1, padding: 24, maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
          {!draft ? (
            <div style={{ color: C.muted }}>AI feedback still generating — check back in a moment, or refresh.</div>
          ) : draft.error ? (
            <div style={{ color: '#c0392b' }}>AI marking failed to produce structured feedback: {draft.error}</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>{draft.overallScore} / {draft.maxScore}</div>
                <button onClick={saveAndApprove} disabled={saving} style={{ padding: '10px 20px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}>
                  {saving ? 'Saving…' : '✅ Approve & Next'}
                </button>
              </div>

              <div style={{ marginBottom: 16, padding: 14, background: '#fef9ec', borderRadius: 8 }}>
                <div style={{ fontWeight: 700, color: '#b8860b', marginBottom: 6 }}>🌟 Glow</div>
                {(draft.glow || []).map((g, i) => <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>• {g}</div>)}
              </div>
              <div style={{ marginBottom: 16, padding: 14, background: '#eef7f0', borderRadius: 8 }}>
                <div style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>🌱 Grow</div>
                {(draft.grow || []).map((g, i) => <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>• {g}</div>)}
              </div>
              {(draft.thinkAboutIt || []).length > 0 && (
                <div style={{ marginBottom: 20, padding: 14, background: '#f3eefc', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: '#7a4fb5', marginBottom: 6 }}>🤔 Think About It</div>
                  {draft.thinkAboutIt.map((t, i) => <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>• {t}</div>)}
                </div>
              )}

              {(draft.criteria || []).map((c, i) => (
                <div key={i} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 700, color: C.navy, marginBottom: 6 }}>{i + 1}) {c.name}</div>
                  <div style={{ fontSize: 13, color: '#444', marginBottom: 8, fontStyle: 'italic' }}>"{c.justificationQuote}"</div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <select value={c.level} onChange={(e) => updateCriterion(i, 'level', e.target.value)} style={{ padding: 6, borderRadius: 6, border: `1px solid ${C.border}` }}>
                      {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="range" min={0} max={c.maxScore || 10} step={0.1} value={c.score}
                        onChange={(e) => updateCriterion(i, 'score', parseFloat(e.target.value))} style={{ flex: 1 }} />
                      <span style={{ fontSize: 13, minWidth: 50 }}>{c.score} / {c.maxScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          {error && <div style={{ color: '#c0392b', marginTop: 12 }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}
