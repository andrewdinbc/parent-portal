'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAssignment } from '../../actions'

const C = { navy: '#1c3557', gold: '#b57c2a', border: '#e3ddd0', bg: '#f7f5f0', card: '#fff' }
const inputStyle = { width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 8 }

export default function NewAssignmentForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('math')
  const [answerKey, setAnswerKey] = useState('')
  const [rubric, setRubric] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { alert('Please enter a title'); return }
    setSaving(true)
    const assignment = await createAssignment({ title, subject, answerKey: answerKey || null, rubric: rubric || null })
    setSaving(false)
    router.push(`/teacher/submissions?assignmentId=${assignment.id}`)
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 28 }}>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
          placeholder="e.g., Fractions Worksheet 3" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Subject</label>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle}>
          <option value="math">Math</option>
          <option value="language_arts">Language Arts</option>
        </select>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle} title="Optional -- used for math worksheets with clear right/wrong answers">Answer Key (optional)</label>
        <textarea value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} rows="4"
          placeholder="1) 4/8  2) 12  3) 7..." style={{ ...inputStyle, resize: 'none' }} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle} title="Optional -- for open-ended work like essays, used instead of an answer key">Rubric (optional, free text)</label>
        <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} rows="4"
          placeholder="Describe what you're looking for, or leave blank and pick a saved rubric from the Rubric Library instead"
          style={{ ...inputStyle, resize: 'none' }} />
      </div>
      <button type="submit" disabled={saving} style={{
        padding: '12px 24px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8,
        fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontSize: 14,
      }}>
        {saving ? 'Creating...' : 'Create Assignment'}
      </button>
    </form>
  )
}
