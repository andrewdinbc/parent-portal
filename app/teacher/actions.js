'use server'
// app/teacher/actions.js
// Server Actions for the teacher dashboard. These call sbSelect/sbInsert/
// sbUpdate directly (same data-access layer the /api/teacher/* and other
// /api/* routes use) rather than fetching those routes over HTTP -- so
// PORTFOLIO_SYNC_SECRET never needs to exist in the browser bundle. The
// /api/* routes stay in place for any external/cron callers or the
// AI-calling routes (mark-submission, rubrics/generate, quizzes POST)
// which this file delegates to via direct fetch since they need
// ANTHROPIC_API_KEY server-side logic already implemented there.

import { sbSelect, sbInsert, sbUpdate, sbDelete } from '@/lib/supabase'

const BUCKET_LABELS = ['0-25%', '26-50%', '51-75%', '76-100%']
const IDLE_THRESHOLD_MS = 45_000

// ── Dashboard home ──

export async function getAssignments() {
  return sbSelect('assignments', '?select=id,title,subject,created_at&order=created_at.desc')
}

export async function getAssignmentAnalytics(assignmentId) {
  if (!assignmentId) return null
  const [assignment] = await sbSelect('assignments', `?id=eq.${assignmentId}&select=*`)
  const submissions = await sbSelect('qr_submissions', `?assignment_id=eq.${assignmentId}&select=qr_id`)
  const qrIds = submissions.map((s) => s.qr_id)

  const allAssessments = []
  for (const qrId of qrIds) {
    const rows = await sbSelect('qr_teacher_assessment', `?qr_id=eq.${qrId}&select=*`)
    allAssessments.push(...rows.filter((r) => r.assessment?.type === 'rubric_feedback' && r.assessment?.assignmentId === assignmentId))
  }

  if (allAssessments.length === 0) {
    return { assignment, submissionCount: submissions.length, approvedCount: 0, overview: null, patterns: null }
  }

  const feedbacks = allAssessments.map((a) => a.assessment.feedback)
  const scores = feedbacks.map((f) => f.overallScore)
  const maxScore = feedbacks[0]?.maxScore || 100
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

  const buckets = [0, 0, 0, 0]
  for (const s of scores) {
    const pct = s / maxScore
    const idx = pct <= 0.25 ? 0 : pct <= 0.5 ? 1 : pct <= 0.75 ? 2 : 3
    buckets[idx]++
  }

  const criterionMap = {}
  for (const f of feedbacks) {
    for (const c of f.criteria || []) {
      if (!criterionMap[c.name]) criterionMap[c.name] = { name: c.name, scores: [], maxScore: c.maxScore }
      criterionMap[c.name].scores.push(c.score)
    }
  }
  const criteria = Object.values(criterionMap).map((c) => ({
    name: c.name,
    avgScore: Math.round((c.scores.reduce((a, b) => a + b, 0) / c.scores.length) * 100) / 100,
    maxScore: c.maxScore,
    studentCount: c.scores.length,
  }))

  const strengths = [...criteria].sort((a, b) => (b.avgScore / b.maxScore) - (a.avgScore / a.maxScore)).slice(0, 3)
  const areasForGrowth = [...criteria].sort((a, b) => (a.avgScore / a.maxScore) - (b.avgScore / b.maxScore)).slice(0, 3)

  return {
    assignment, submissionCount: submissions.length, approvedCount: allAssessments.length,
    overview: {
      avgScore: Math.round(avgScore * 100) / 100, maxScore,
      distribution: BUCKET_LABELS.map((label, i) => ({ label, count: buckets[i] })),
      criteria,
    },
    patterns: { strengths, areasForGrowth },
  }
}

export async function getSkillAnalytics() {
  const rows = await sbSelect('qr_teacher_assessment', "?select=qr_id,assessment,created_at&assessment->>type=eq.rubric_feedback&order=created_at.asc")
  const points = []
  for (const row of rows) {
    const feedback = row.assessment?.feedback
    if (!feedback?.criteria) continue
    for (const c of feedback.criteria) {
      if (typeof c.score !== 'number' || !c.maxScore) continue
      points.push({ name: c.name, pct: (c.score / c.maxScore) * 100 })
    }
  }
  const byCriterion = {}
  for (const p of points) {
    if (!byCriterion[p.name]) byCriterion[p.name] = []
    byCriterion[p.name].push(p.pct)
  }
  const criterionBreakdown = Object.entries(byCriterion).map(([name, pcts]) => ({
    name, avgPct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length), count: pcts.length,
  })).sort((a, b) => a.avgPct - b.avgPct)
  return { criterionBreakdown, totalDataPoints: points.length }
}

// ── Assignments ──

export async function createAssignment({ title, subject, answerKey, rubric }) {
  const [assignment] = await sbInsert('assignments', [{
    title, subject, answer_key: answerKey || null, rubric: rubric || null,
  }])
  return assignment
}

export async function getAllAssignments() {
  return sbSelect('assignments', '?select=*&order=created_at.desc')
}

// ── Submissions ──

export async function getSubmissionsForAssignment(assignmentId) {
  if (!assignmentId) return { assignment: null, submissions: [] }
  const [assignment] = await sbSelect('assignments', `?id=eq.${assignmentId}&select=*`)
  const submissions = await sbSelect('qr_submissions', `?assignment_id=eq.${assignmentId}&select=*&order=submitted_at`)
  return { assignment, submissions }
}

// Delegates to /api/mark-submission since that route owns the
// ANTHROPIC_API_KEY-based marking logic (vision + text handling) --
// no need to duplicate that here, just call it server-side.
export async function markSubmission(submissionId) {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  const res = await fetch(`${base}/api/mark-submission`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId }),
  })
  return res.json()
}

export async function approveSubmissionFeedback(submissionId, qrId, assignmentId, feedback) {
  await sbInsert('qr_teacher_assessment', [{
    qr_id: qrId,
    assessment: { type: 'rubric_feedback', assignmentId, feedback, approvedAt: new Date().toISOString() },
  }])
  return { ok: true }
}

// ── Rubrics ──

export async function getRubrics() {
  return sbSelect('rubrics', '?select=id,title,subject,grade,scale,source,standard_alignment,created_at&order=created_at.desc')
}

export async function generateRubric(params) {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  const res = await fetch(`${base}/api/rubrics/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
  })
  return res.json()
}

export async function saveRubric(rubric) {
  const [saved] = await sbInsert('rubrics', [{
    title: rubric.title, subject: rubric.subject || null, grade: rubric.grade || null,
    scale: rubric.scale || rubric.levelNames.length, level_names: rubric.levelNames,
    criteria: rubric.criteria, source: rubric.source || 'ai_generated',
    standard_alignment: rubric.standardAlignment || null,
  }])
  return saved
}

export async function deleteRubric(id) {
  await sbDelete('rubrics', `?id=eq.${id}`)
  return { deleted: id }
}

// ── Quizzes / Quiz Sessions ──

export async function getQuizzes() {
  return sbSelect('quizzes', '?select=id,title,subject,question_type,created_at&order=created_at.desc')
}

export async function getRecentSessions() {
  return sbSelect('quiz_sessions', '?select=*,quizzes(title)&order=created_at.desc&limit=10')
}

export async function startQuizSession(quizId) {
  const [session] = await sbInsert('quiz_sessions', [{ quiz_id: quizId, status: 'active' }])
  return session
}

export async function endQuizSession(sessionId) {
  await sbUpdate('quiz_sessions', `?id=eq.${sessionId}`, { status: 'ended', ended_at: new Date().toISOString() })
  return { ended: sessionId }
}

export async function getQuizSessionDetail(sessionId) {
  const [session] = await sbSelect('quiz_sessions', `?id=eq.${sessionId}&select=*,quizzes(title,questions)`)
  if (!session) return null
  const devices = await sbSelect('quiz_session_devices', `?session_id=eq.${sessionId}&select=*&order=checked_in_at.asc`)
  const now = Date.now()
  const enriched = devices.map((d) => {
    const idleMs = now - new Date(d.last_active_at).getTime()
    const likelyAway = d.status === 'checked_in' && idleMs > IDLE_THRESHOLD_MS
    const offQuizEvents = d.off_quiz_events || []
    const recentlyFlagged = offQuizEvents.length > 0 && (now - new Date(offQuizEvents[offQuizEvents.length - 1].at).getTime()) < 60_000
    return { ...d, idleSeconds: Math.round(idleMs / 1000), likelyAway, offQuizEventCount: offQuizEvents.length, recentlyFlagged }
  })
  return {
    session, devices: enriched,
    counts: {
      checkedIn: devices.length,
      completed: devices.filter((d) => d.status === 'completed').length,
      likelyAway: enriched.filter((d) => d.likelyAway).length,
      flagged: enriched.filter((d) => d.recentlyFlagged).length,
    },
  }
}
