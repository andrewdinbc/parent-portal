'use client'
import { useState, useEffect } from 'react'

const C = { navy: '#1c3557', gold: '#b57c2a', green: '#1a7a3e', border: '#ddd4c2', bg: '#f2ede3' }

export default function AdminPage() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrId, setQrId] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/contacts')
      const d = await res.json()
      setContacts(d.contacts || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addContact(e) {
    e.preventDefault()
    setError('')
    if (!qrId.trim() || !email.trim()) return
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrId: qrId.trim(), parentEmail: email.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add')
      setQrId(''); setEmail('')
      await load()
    } catch (e) { setError(e.message) }
  }

  async function removeContact(id) {
    await fetch('/api/admin/contacts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await load()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Georgia, serif', padding: 32 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ color: C.navy, fontSize: 28, marginBottom: 4 }}>Parent Contact Admin</h1>
        <p style={{ color: '#8a7d6e', fontSize: 14, marginBottom: 24 }}>
          Enter each QR ID (from your private student mapping document) with the parent email(s) to notify.
          No student names are entered or stored here — that mapping stays on your own computer, out of band.
        </p>

        <form onSubmit={addContact} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={qrId}
            onChange={(e) => setQrId(e.target.value)}
            placeholder="QR ID (e.g. QR-7f3a91)"
            style={{ flex: 1, minWidth: 180, padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit' }}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="parent@example.com"
            style={{ flex: 1, minWidth: 220, padding: 10, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: 'inherit' }}
          />
          <button type="submit" style={{ padding: '10px 20px', background: C.gold, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            + Add
          </button>
        </form>

        {error && <div style={{ background: '#fdecea', border: '1px solid #f5b7b1', borderRadius: 8, padding: 12, color: '#c0392b', marginBottom: 16 }}>{error}</div>}

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: C.navy, color: '#fff', fontWeight: 700 }}>
            {contacts.length} registered contact{contacts.length === 1 ? '' : 's'}
          </div>
          {loading ? (
            <div style={{ padding: 20, color: '#8a7d6e' }}>Loading…</div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: 20, color: '#8a7d6e', fontStyle: 'italic' }}>No contacts registered yet.</div>
          ) : (
            contacts.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderTop: `1px solid ${C.border}` }}>
                <span><strong>{c.qr_id}</strong> — {c.parent_email}</span>
                <button onClick={() => removeContact(c.id)} style={{ padding: '4px 10px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: '#c0392b', fontSize: 12 }}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: '#8a7d6e' }}>
          Each family's portal link: <code>/portal/[QR ID]</code> — give this to families out of band
          (printed card, welcome email). This app does not handle distribution.
        </div>
      </div>
    </div>
  )
}
