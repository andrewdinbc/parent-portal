// app/teacher/activity/page.js
import Link from 'next/link'
import ActivityClient from './ActivityClient'

const C = { navy: '#1c3557', border: '#e3ddd0', bg: '#f7f5f0' }

export default function ActivityPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', sans-serif", padding: 40 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link href="/teacher" style={{ color: C.navy, fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
        <h1 style={{ fontSize: 26, color: C.navy, margin: '10px 0 4px' }}>Student Activity</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          Real activity across submissions, approved feedback, and oral reading attempts. No due-date tracking or communication-activity numbers here — see the page footer for why.
        </p>
        <ActivityClient />
      </div>
    </div>
  )
}
