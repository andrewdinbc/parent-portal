import { sbSelect, sbUpdate } from '../../../../../../lib/supabase'

// Jerry Johns Basic Reading Inventory level thresholds (from Aj's own
// reference document): Independent = 99%+ word accuracy AND 90%+
// comprehension. Instructional = 95%+ word accuracy AND 75-85%
// comprehension. Frustration = below 90% word accuracy OR below 50%
// comprehension. Anything between Instructional and Frustration
// thresholds is flagged for teacher judgment rather than guessed.
function determineLevel(accuracyPct, comprehensionPct) {
  if (accuracyPct >= 99 && comprehensionPct >= 90) return 'independent'
  if (accuracyPct >= 95 && comprehensionPct >= 75) return 'instructional'
  if (accuracyPct < 90 || comprehensionPct < 50) return 'frustration'
  return null // in between the defined bands - teacher judgment call, not auto-assigned
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const { miscueCount, secondsTaken } = await request.json()
    if (miscueCount == null) return Response.json({ error: 'miscueCount required' }, { status: 400 })

    const [attempt] = await sbSelect('oral_reading_attempts', `?id=eq.${id}&select=*`)
    if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 })
    const [passage] = await sbSelect('oral_reading_passages', `?id=eq.${attempt.passage_id}&select=word_count`)

    const totalWords = passage.word_count
    // Accuracy rate = (Total Words - Miscues) / Total Words
    const accuracyPct = Math.round(((totalWords - miscueCount) / totalWords) * 1000) / 10
    // WCPM = (Total Words - Miscues) / minutes taken
    const wcpm = secondsTaken ? Math.round(((totalWords - miscueCount) / (secondsTaken / 60)) * 10) / 10 : null

    const levelDetermination = determineLevel(accuracyPct, attempt.comprehension_score_pct)

    await sbUpdate('oral_reading_attempts', `?id=eq.${id}`, {
      total_words: totalWords,
      miscue_count: miscueCount,
      accuracy_pct: accuracyPct,
      wcpm,
      level_determination: levelDetermination,
      scored_by_teacher_at: new Date().toISOString(),
    })

    return Response.json({ accuracyPct, wcpm, comprehensionPct: attempt.comprehension_score_pct, levelDetermination })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
