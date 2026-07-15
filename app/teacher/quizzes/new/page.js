// app/teacher/quizzes/new/page.js
import Link from 'next/link'
import NewQuizForm from './NewQuizForm'

const C = { navy: '#1c3557', border: '#e3ddd0', bg: '#f7f5f0' }

export default function NewQuizPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', sans-serif", padding: 40 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Link href="/teacher/quiz-sessions" style={{ color: C.navy, fontSize: 13, textDecoration: 'none' }}>← Quiz Sessions</Link>
        <h1 style={{ fontSize: 26, color: C.navy, margin: '10px 0 24px' }}>New Quiz</h1>
        <NewQuizForm />
      </div>
    </div>
  )
}
