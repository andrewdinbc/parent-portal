// app/teacher/rubrics/page.js
import Link from 'next/link'
import RubricsClient from './RubricsClient'

const C = { navy: '#1c3557', border: '#e3ddd0', bg: '#f7f5f0' }

export default function RubricsPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', sans-serif", padding: 40 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/teacher" style={{ color: C.navy, fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
        <h1 style={{ fontSize: 26, color: C.navy, margin: '10px 0 24px' }}>Rubric Library</h1>
        <RubricsClient />
      </div>
    </div>
  )
}
