'use client'
// components/CloudBackground.jsx
// Decorative, fixed-position cloud shapes for student-facing pages --
// purely cosmetic, sits behind content (z-index: 0, pointer-events: none).
// Per Aj's note: this playful background detail is a deliberate part of
// the student-facing visual language, distinct from the plain teacher
// dashboards.

function Cloud({ top, left, right, size = 1, opacity = 0.5 }) {
  return (
    <svg
      width={120 * size} height={70 * size} viewBox="0 0 120 70"
      style={{ position: 'absolute', top, left, right, opacity }}
    >
      <ellipse cx="30" cy="45" rx="28" ry="20" fill="#fff" />
      <ellipse cx="60" cy="32" rx="34" ry="26" fill="#fff" />
      <ellipse cx="92" cy="45" rx="26" ry="18" fill="#fff" />
    </svg>
  )
}

export default function CloudBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <Cloud top="4%" left="6%" size={1.1} opacity={0.6} />
      <Cloud top="14%" right="10%" size={0.8} opacity={0.45} />
      <Cloud top="55%" left="2%" size={0.9} opacity={0.4} />
      <Cloud top="70%" right="6%" size={1.2} opacity={0.5} />
      <Cloud top="35%" right="30%" size={0.6} opacity={0.35} />
    </div>
  )
}
