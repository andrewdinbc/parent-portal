import { sbSelect, sbInsert, sbDelete } from '../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const rows = await sbSelect('rubrics', `?id=eq.${id}&select=*`)
      return Response.json({ rubric: rows[0] || null })
    }
    const rubrics = await sbSelect('rubrics', '?select=id,title,subject,grade,scale,source,standard_alignment,created_at&order=created_at.desc')
    return Response.json({ rubrics })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { title, subject, grade, scale, levelNames, criteria, source, standardAlignment } = await request.json()
    if (!title || !levelNames || !criteria) {
      return Response.json({ error: 'title, levelNames, and criteria are required' }, { status: 400 })
    }
    const [rubric] = await sbInsert('rubrics', [{
      title,
      subject: subject || null,
      grade: grade || null,
      scale: scale || levelNames.length,
      level_names: levelNames,
      criteria,
      source: source || 'manual',
      standard_alignment: standardAlignment || null,
    }])
    return Response.json({ rubric })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })
    await sbDelete('rubrics', `?id=eq.${id}`)
    return Response.json({ deleted: id })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
