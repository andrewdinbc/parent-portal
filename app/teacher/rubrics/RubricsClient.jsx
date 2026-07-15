'use client'
import { useState, useEffect } from 'react'
import { getRubrics, generateRubric, saveRubric, deleteRubric } from '../actions'

const C = { navy: '#1c3557', gold: '#b57c2a', red: '#a33', border: '#e3ddd0', bg: '#f7f5f0', card: '#fff' }
const inputStyle = { width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 8 }

export default function RubricsClient() {
  const [rubrics, setRubrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const [form, setForm] = useState({ subject: '', grade: '', assignmentDescription: '', standardAlignment: 'none', numCriteria: 4, scale: 4 })
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => getRubrics().then((r) => { setRubrics(r); setLoading(false) })
  useEffect(() => { load() }, [])

  const handleGenerate = async (e) => {
    e.preventDefault()
    setGenerating(true)
    const result = await generateRubric(form)
    setGenerating(false)
    if (result.error) { alert(result.error); return }
    setDraft({ title: form.assignmentDescription.slice(0, 60), ...form, levelNames: result.levelNames, criteria: result.criteria })
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    await saveRubric(draft)
    setSaving(false)
    setDraft(null)
    setShowGenerator(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this rubric?')) return
    await deleteRubric(id)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => setShowGenerator(!showGenerator)} style={{
          padding: '10px 20px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8,
          fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>
          {showGenerator ? 'Cancel' : '+ Generate Rubric with AI'}
        </button>
      </div>

      {showGenerator && !draft && (
        <form onSubmit={handleGenerate} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Assignment description</label>
            <textarea required value={form.assignmentDescription} onChange={(e) => setForm({ ...form, assignmentDescription: e.target.value })}
              rows="3" placeholder="e.g., Persuasive essay on a topic of the student's choosing" style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Subject</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g., ELA" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Grade</label>
              <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g., 7" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Number of criteria</label>
              <input type="number" min="2" max="8" value={form.numCriteria} onChange={(e) => setForm({ ...form, numCriteria: Number(e.target.value) })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Performance levels</label>
              <select value={form.scale} onChange={(e) => setForm({ ...form, scale: Number(e.target.value) })} style={inputStyle}>
                <option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={generating} style={{
            padding: '10px 22px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8,
            fontWeight: 600, fontSize: 14, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
          }}>
            {generating ? 'Generating…' : 'Generate Draft'}
          </button>
        </form>
      )}

      {draft && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Title</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Levels: {draft.levelNames.join(' → ')}</div>
          {draft.criteria.map((c, i) => (
            <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < draft.criteria.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 6 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {c.descriptions.map((d, j) => <div key={j}>{draft.levelNames[j]}: {d}</div>)}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={handleSaveDraft} disabled={saving} style={{
              padding: '10px 22px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8,
              fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Saving…' : 'Save Rubric'}
            </button>
            <button onClick={() => setDraft(null)} style={{
              padding: '10px 22px', background: C.bg, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
              Discard
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#999' }}>Loading…</div>
      ) : rubrics.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, textAlign: 'center', color: '#888' }}>
          No rubrics yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rubrics.map((r) => (
            <div key={r.id} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 15 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                  {r.subject || 'General'}{r.grade ? ` · Grade ${r.grade}` : ''} · {r.scale}-level scale · {r.source}
                </div>
              </div>
              <button onClick={() => handleDelete(r.id)} title="Delete this rubric" style={{
                background: 'none', border: 'none', color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
