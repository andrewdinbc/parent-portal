import { sbSelect, sbInsert } from '../../../lib/supabase'

// GET /api/rubric-library -- browse the shared standards library
// GET /api/rubric-library?id=xxx -- one entry, full criteria
// POST /api/rubric-library { cloneId } -- copies a library entry into
//   this teacher's own `rubrics` table (My Rubrics), so it can be edited
//   and used for real grading the same way any other saved rubric is.
//
// New 2026-07-21. rubric_library is shared reference content (no
// user_id, readable by anyone) -- see its migration comment for why it's
// seeded with BC Core Competencies + 6+1 Traits only, not AP/IB/Cambridge.

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const rows = await sbSelect('rubric_library', `?id=eq.${id}&select=*`)
      return Response.json({ rubric: rows[0] || null })
    }
    const rubrics = await sbSelect('rubric_library', '?select=id,title,framework,subject,grade_band,scale,framework_source_note,source_url&order=framework')
    return Response.json({ rubrics })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { cloneId } = await request.json()
    if (!cloneId) return Response.json({ error: 'cloneId is required' }, { status: 400 })

    const rows = await sbSelect('rubric_library', `?id=eq.${cloneId}&select=*`)
    const libraryRubric = rows[0]
    if (!libraryRubric) return Response.json({ error: 'Library rubric not found' }, { status: 404 })

    const [rubric] = await sbInsert('rubrics', [{
      title: libraryRubric.title,
      subject: libraryRubric.subject,
      grade: libraryRubric.grade_band,
      scale: libraryRubric.scale,
      level_names: libraryRubric.level_names,
      criteria: libraryRubric.criteria,
      source: 'library_clone',
      standard_alignment: libraryRubric.framework,
    }])
    return Response.json({ rubric })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
