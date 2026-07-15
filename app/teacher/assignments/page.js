// app/teacher/assignments/page.js
import Link from 'next/link'
import { getAllAssignments } from '../actions'

const C = { navy: '#1c3557', gold: '#b57c2a', border: '#e3ddd0', bg: '#f7f5f0', card: '#fff' }

export default async function AssignmentsPage() {
  const assignments = await getAllAssignments()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', sans-serif", padding: 40 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/teacher" style={{ color: C.navy, fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 24px' }}>
          <h1 style={{ fontSize: 26, color: C.navy, margin: 0 }}>My assignments & answer keys</h1>
          <Link href="/teacher/assignments/new" style={{
            background: C.gold, color: '#fff', padding: '10px 20px', borderRadius: 8,
            textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}>
            + New Assignment
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, textAlign: 'center', color: '#888' }}>
            No assignments yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assignments.map((a) => (
              <div key={a.id} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 15 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {a.subject} · {new Date(a.created_at).toLocaleDateString()}
                    {a.answer_key ? ' · has answer key' : ''}{a.rubric ? ' · has rubric' : ''}
                  </div>
                </div>
                <Link href={`/teacher/submissions?assignmentId=${a.id}`} style={{
                  color: C.navy, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}>
                  View submissions →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
