import { sbUpdate, sbSelect } from '../../../../lib/supabase'

// Archiving is teacher-triggered, never a deadline - data is kept forever
// either way. Archived just means parents/students stop seeing it in the
// portal (per Aj: keeps the portal focused on current work rather than
// piling up an entire year), while the teacher side keeps showing
// everything, archived or not.

export async function POST(request) {
  try {
    const { assignmentIds } = await request.json()
    if (!Array.isArray(assignmentIds) || !assignmentIds.length) {
      return Response.json({ error: 'assignmentIds array required' }, { status: 400 })
    }
    const now = new Date().toISOString()
    for (const id of assignmentIds) {
      await sbUpdate('assignments', `?id=eq.${id}`, { archived_at: now })
    }
    return Response.json({ archived: assignmentIds.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  // Unarchive - bring back into view.
  try {
    const { assignmentIds } = await request.json()
    if (!Array.isArray(assignmentIds) || !assignmentIds.length) {
      return Response.json({ error: 'assignmentIds array required' }, { status: 400 })
    }
    for (const id of assignmentIds) {
      await sbUpdate('assignments', `?id=eq.${id}`, { archived_at: null })
    }
    return Response.json({ unarchived: assignmentIds.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  // All assignments including archived, with their status - for the
  // teacher-side Archive Units page. Teacher always sees everything.
  try {
    const assignments = await sbSelect('assignments', '?select=id,title,subject,created_at,archived_at&order=created_at.desc')
    return Response.json({ assignments })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
