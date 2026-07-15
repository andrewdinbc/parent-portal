// app/teacher/page.js
// Server Component -- fetches the initial assignments list server-side
// (see ./actions.js for why: keeps PORTFOLIO_SYNC_SECRET out of the
// browser entirely). Interactive filtering happens client-side via
// TeacherDashboardClient, which calls the same Server Actions.
import { getAssignments } from './actions'
import TeacherDashboardClient from './TeacherDashboardClient'

export default async function TeacherDashboard() {
  const assignments = await getAssignments()
  return <TeacherDashboardClient assignments={assignments} />
}
