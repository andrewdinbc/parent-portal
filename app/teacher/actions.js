'use server'
// app/teacher/actions.js
// Server Actions for the teacher dashboard. These call sbSelect directly
// (same data-access layer the /api/teacher/* routes use) rather than
// fetching those routes over HTTP — so the PORTFOLIO_SYNC_SECRET never
// needs to exist in the browser bundle. The /api/teacher/* routes stay in
// place for any external/cron callers; this dashboard just doesn't need
// them.

import { sbSelect } from '@/lib/supabase'

const BUCKET_LABELS = ['0-25%', '26-50%', '51-75%', '76-100%']

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
    assignment,
    submissionCount: submissions.length,
    approvedCount: allAssessments.length,
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
    name,
    avgPct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
    count: pcts.length,
  })).sort((a, b) => a.avgPct - b.avgPct)

  return { criterionBreakdown, totalDataPoints: points.length }
}
