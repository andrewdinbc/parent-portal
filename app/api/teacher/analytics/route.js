import { sbSelect } from '@/lib/supabase'

// Class-level analytics, modeled on CoGrader's Overview/Patterns/Strengths/
// Areas-for-growth structure. Aggregates the TEACHER-APPROVED feedback
// (qr_teacher_assessment, type='rubric_feedback') for an assignment, not
// the raw AI draft — this reflects what the teacher actually confirmed,
// consistent with the grading boundary (memory #19): still teacher-only,
// still never exposed to parents.

function checkAuth(request) {
  const secret = request.headers.get('x-portfolio-sync-secret') || ''
  return process.env.PORTFOLIO_SYNC_SECRET && secret === process.env.PORTFOLIO_SYNC_SECRET
}

const BUCKET_LABELS = ['0-25%', '26-50%', '51-75%', '76-100%']

export async function GET(request) {
  if (!checkAuth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const assignmentId = searchParams.get('assignmentId')
  if (!assignmentId) return Response.json({ error: 'assignmentId required' }, { status: 400 })

  try {
    const [assignment] = await sbSelect('assignments', `?id=eq.${assignmentId}&select=*`)
    const submissions = await sbSelect('qr_submissions', `?assignment_id=eq.${assignmentId}&select=qr_id`)
    const qrIds = submissions.map((s) => s.qr_id)

    // Pull every teacher assessment for these students, filter to this
    // assignment client-side (qr_teacher_assessment is a general table, not
    // assignment-scoped at the DB level - the assignmentId lives inside the
    // jsonb `assessment` field, set by the review page on approve).
    const allAssessments = []
    for (const qrId of qrIds) {
      const rows = await sbSelect('qr_teacher_assessment', `?qr_id=eq.${qrId}&select=*`)
      allAssessments.push(...rows.filter((r) => r.assessment?.type === 'rubric_feedback' && r.assessment?.assignmentId === assignmentId))
    }

    if (allAssessments.length === 0) {
      return Response.json({ assignment, submissionCount: submissions.length, approvedCount: 0, overview: null, patterns: null })
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

    // Per-criterion averages across the class.
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

    return Response.json({
      assignment,
      submissionCount: submissions.length,
      approvedCount: allAssessments.length,
      overview: {
        avgScore: Math.round(avgScore * 100) / 100, maxScore,
        distribution: BUCKET_LABELS.map((label, i) => ({ label, count: buckets[i] })),
        criteria,
      },
      patterns: { strengths, areasForGrowth },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
