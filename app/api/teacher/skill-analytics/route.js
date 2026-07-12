import { sbSelect } from '../../../../lib/supabase'

// Aggregates across ALL approved qr_teacher_assessment rows (not scoped to
// one assignment, unlike /api/teacher/analytics) - this is the class/
// district-wide picture: which rubric criteria are weak across everything
// a teacher has graded, and how that's trending over time.

function weekBucket(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

export async function GET() {
  try {
    const rows = await sbSelect('qr_teacher_assessment', "?select=qr_id,assessment,created_at&assessment->>type=eq.rubric_feedback&order=created_at.asc")

    // Flatten every criterion score out of every approved assessment,
    // tagged with its week bucket.
    const points = []
    for (const row of rows) {
      const feedback = row.assessment?.feedback
      if (!feedback?.criteria) continue
      const week = weekBucket(row.created_at)
      for (const c of feedback.criteria) {
        if (typeof c.score !== 'number' || !c.maxScore) continue
        points.push({ name: c.name, pct: (c.score / c.maxScore) * 100, week, date: row.created_at })
      }
    }

    // Rubric Criterion Breakdown: overall average per criterion name.
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

    // Skill Mastery Trends: per-criterion average per week, so a trend
    // line can be drawn, plus a flag for criteria that are both low AND
    // not improving (reteach candidates) vs low but trending up.
    const byCriterionWeek = {}
    for (const p of points) {
      const key = p.name
      if (!byCriterionWeek[key]) byCriterionWeek[key] = {}
      if (!byCriterionWeek[key][p.week]) byCriterionWeek[key][p.week] = []
      byCriterionWeek[key][p.week].push(p.pct)
    }
    const skillTrends = Object.entries(byCriterionWeek).map(([name, weeks]) => {
      const series = Object.entries(weeks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, pcts]) => ({ week, avgPct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) }))
      const latest = series[series.length - 1]?.avgPct ?? 0
      const first = series[0]?.avgPct ?? 0
      const trend = series.length > 1 ? latest - first : 0
      const needsReteaching = latest < 70 && trend <= 0
      return { name, series, latestPct: latest, trend, needsReteaching }
    }).sort((a, b) => a.latestPct - b.latestPct)

    // Growth Over Time: overall average (all criteria combined) per week.
    const overallByWeek = {}
    for (const p of points) {
      if (!overallByWeek[p.week]) overallByWeek[p.week] = []
      overallByWeek[p.week].push(p.pct)
    }
    const growthOverTime = Object.entries(overallByWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, pcts]) => ({ week, avgPct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length), submissionCount: pcts.length }))

    return Response.json({
      criterionBreakdown,
      skillTrends,
      growthOverTime,
      totalDataPoints: points.length,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
