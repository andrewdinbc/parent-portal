'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateQuiz, saveQuiz } from '../../actions'

const C = { navy: '#1c3557', gold: '#b57c2a', border: '#e3ddd0', bg: '#f7f5f0', card: '#fff' }
const inputStyle = { width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 8 }

export default function NewQuizForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', subject: '', source: 'topic', sourceContent: '',
    questionType: 'multiple_choice', numQuestions: 'automatic', instructions: '',
  })
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!form.sourceContent.trim()) { alert('Please provide a topic or paste source text'); return }
    setGenerating(true)
    const result = await generateQuiz(form)
    setGenerating(false)
    if (result.error) { alert(result.error); return }
    setDraft({ title: result.title || form.title, subject: form.subject, questionType: form.questionType, source: form.source, questions: result.questions })
  }

  const updateQuestion = (i, field, value) => {
    setDraft((d) => {
      const questions = [...d.questions]
      questions[i] = { ...questions[i], [field]: value }
      return { ...d, questions }
    })
  }

  const updateOption = (qi, oi, value) => {
    setDraft((d) => {
      const questions = [...d.questions]
      const options = [...questions[qi].options]
      options[oi] = value
      questions[qi] = { ...questions[qi], options }
      return { ...d, questions }
    })
  }

  const removeQuestion = (i) => {
    setDraft((d) => ({ ...d, questions: d.questions.filter((_, idx) => idx !== i) }))
  }

  const handleSave = async () => {
    setSaving(true)
    const quiz = await saveQuiz(draft)
    setSaving(false)
    router.push(`/teacher/quiz-sessions`)
  }

  if (draft) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Quiz title</label>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={inputStyle} />
        </div>

        {draft.questions.map((q, i) => (
          <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#999' }}>Question {i + 1}</span>
              <button onClick={() => removeQuestion(i)} title="Remove this question" style={{
                background: 'none', border: 'none', color: '#a33', fontSize: 12, cursor: 'pointer',
              }}>
                Remove
              </button>
            </div>
            <textarea value={q.question} onChange={(e) => updateQuestion(i, 'question', e.target.value)}
              rows="2" style={{ ...inputStyle, resize: 'none', marginBottom: 10 }} />
            {q.options.map((opt, oi) => (
              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <input type="radio" checked={q.correctIndex === oi} onChange={() => updateQuestion(i, 'correctIndex', oi)}
                  title="Mark as correct answer" />
                <input value={opt} onChange={(e) => updateOption(i, oi, e.target.value)}
                  style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }} />
              </div>
            ))}
            {q.explanation && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Explanation: {q.explanation}</div>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 22px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8,
            fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Saving…' : 'Save Quiz'}
          </button>
          <button onClick={() => setDraft(null)} style={{
            padding: '10px 22px', background: C.bg, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            Discard
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleGenerate} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Title (optional -- AI will suggest one if left blank)</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Subject</label>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g., Science" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Question type</label>
          <select value={form.questionType} onChange={(e) => setForm({ ...form, questionType: e.target.value })} style={inputStyle}>
            <option value="multiple_choice">Multiple Choice</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Source</label>
        <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={{ ...inputStyle, marginBottom: 10 }}>
          <option value="topic">Topic (AI writes questions from scratch)</option>
          <option value="text">Pasted text (AI writes questions from this content)</option>
        </select>
        <textarea required value={form.sourceContent} onChange={(e) => setForm({ ...form, sourceContent: e.target.value })}
          rows="5" placeholder={form.source === 'topic' ? 'e.g., The water cycle' : 'Paste the passage or notes to quiz on...'}
          style={{ ...inputStyle, resize: 'none' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Number of questions</label>
          <select value={form.numQuestions} onChange={(e) => setForm({ ...form, numQuestions: e.target.value })} style={inputStyle}>
            <option value="automatic">Automatic (~8)</option>
            <option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Additional instructions (optional)</label>
          <input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="e.g., focus on vocabulary" style={inputStyle} />
        </div>
      </div>
      <button type="submit" disabled={generating} style={{
        padding: '10px 22px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8,
        fontWeight: 600, fontSize: 14, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
      }}>
        {generating ? 'Generating…' : 'Generate Draft'}
      </button>
    </form>
  )
}
