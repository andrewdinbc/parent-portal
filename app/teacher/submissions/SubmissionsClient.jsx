'use client'
import { useState, useEffect } from 'react'
import { getAllAssignments, getSubmissionsForAssignment, markSubmission, approveSubmissionFeedback } from '../actions'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', red: '#a33', border: '#e3ddd0', bg: '#f7f5f0', card: '#fff' }

function LevelBadge({ level }) {
  const colors = { Developing: '#c94f4f', Emerging: '#c98b2a', Proficient: '#2a8a5c', Extending: '#1c6ea8' }
  return (
    <span style={{
      background: colors[level] || '#999', color: '#fff', fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap',
    }}>
      {level}
    </span>
  )
}

export default function SubmissionsClient({ initialAssignmentId }) {
  const [assignments, setAssignments] = useState([])
  const [assignmentId, setAssignmentId] = useState(initialAssignmentId || '')
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState(null)
  const [approvingId, setApprovingId] = useState(null)

  useEffect(() => {
    getAllAssignments().then((rows) => {
      setAssignments(rows)
      if (!assignmentId && rows.length) setAssignmentId(rows[0].id)
    })
  }, [])

  useEffect(() => {
    if (!assignmentId) return
    setLoading(true)
    getSubmissionsForAssignment(assignmentId).then(({ submissions }) => {
      setSubmissions(submissions)
      setLoading(false)
    })
  }, [assignmentId])

  const handleMark = async (submissionId) => {
    setMarkingId(submissionId)
    const result = await markSubmission(submissionId)
    setSubmissions((prev) => prev.map((s) => s.id === submissionId ? { ...s, structured_feedback: result.structuredFeedback } : s))
    setMarkingId(null)
  }

  const handleApprove = async (sub) => {
    setApprovingId(sub.id)
    await approveSubmissionFeedback(sub.id, sub.qr_id, assignmentId, sub.structured_feedback)
    setApprovingId(null)
    alert('Approved -- this now feeds into class analytics and the parent portal.')
  }

  return (
    <div>
      <select
        value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}
        style={{ padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, marginBottom: 24, minWidth: 260 }}
      >
        {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
      </select>

      {loading ? (
        <div style={{ color: '#999' }}>Loading…</div>
      ) : submissions.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, textAlign: 'center', color: '#888' }}>
          No submissions yet for this assignment.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {submissions.map((sub) => {
            const fb = sub.structured_feedback
            return (
              <div key={sub.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 14 }}>Student QR: {sub.qr_id}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{new Date(sub.submitted_at).toLocaleString()}</div>
                </div>

                {!fb ? (
                  <button
                    onClick={() => handleMark(sub.id)} disabled={markingId === sub.id}
                    title="Run AI marking against the assignment's rubric or answer key"
                    style={{
                      padding: '8px 18px', background: C.navy, color: '#fff', border: 'none', borderRadius: 6,
                      fontWeight: 600, fontSize: 13, cursor: markingId === sub.id ? 'not-allowed' : 'pointer',
                      opacity: markingId === sub.id ? 0.6 : 1,
                    }}
                  >
                    {markingId === sub.id ? 'Marking…' : 'Mark with AI'}
                  </button>
                ) : fb.error ? (
                  <div style={{ color: C.red, fontSize: 13 }}>Marking failed: {fb.error}</div>
                ) : (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                      Score: {fb.overallScore}/{fb.maxScore}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {(fb.criteria || []).map((c) => (
                        <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                          <span style={{ color: '#555' }}>{c.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LevelBadge level={c.level} />
                            <span style={{ color: '#888' }}>{c.score}/{c.maxScore}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {fb.glow && (
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                        <strong style={{ color: C.green }}>Glow:</strong> {fb.glow.join(' · ')}
                      </div>
                    )}
                    {fb.grow && (
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 14 }}>
                        <strong style={{ color: C.gold }}>Grow:</strong> {fb.grow.join(' · ')}
                      </div>
                    )}
                    <button
                      onClick={() => handleApprove(sub)} disabled={approvingId === sub.id}
                      title="Approve this feedback -- feeds class analytics and becomes visible to parents"
                      style={{
                        padding: '8px 18px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6,
                        fontWeight: 600, fontSize: 13, cursor: approvingId === sub.id ? 'not-allowed' : 'pointer',
                        opacity: approvingId === sub.id ? 0.6 : 1,
                      }}
                    >
                      {approvingId === sub.id ? 'Approving…' : '✓ Approve Feedback'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
