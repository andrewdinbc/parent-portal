# UI Reference Mapping (2026-07-21)

13 reference images Aj shared (CoGrader, Edcafe, generic dashboard kits,
MS Teams Insights) mapped against what's actually built in the ecosystem
today. Written before building any of it -- this is the audit, not the
implementation. Verified against real code and real Supabase schema, not
assumptions.

## Group 1: CoGrader (writing analytics -- Assessment Tool)

Real architecture, confirmed by reading the code: **Assessment Tool holds
no database of its own.** `lib/cross-app.js` there fetches writing data
from parent-portal (`PORTFOLIO_SYNC_SECRET`) and math data from
math-mastery (`MICRO_UNIT_SYNC_SECRET`). The rubrics/quizzes/students/
classrooms/teachers tables that DO exist in the shared Supabase project
appear to be Assessment Tool's own early-build remnants for its
Rubrics/Quizzes pages specifically -- not what powers cross-app analytics.

The real Overview/Patterns/Strengths/Areas-for-growth data comes from
**parent-portal's `/api/teacher/analytics`** (`app/api/teacher/analytics/
route.js`), which already computes:
- `overview` (submission counts, class average)
- `patterns.strengths` (top 3 criteria by avg score)
- `patterns.areasForGrowth` (bottom 3 criteria by avg score)

All real, live, not mocked -- 4 of the 6 CoGrader tabs already exist.

**Gaps (confirmed absent from the real endpoint):**
- Intensive support tab -- tier-3 "needs more than small group" flagging.
  Derivable from existing per-student criterion scores (students uniformly
  low across all criteria vs one weak spot) -- no new table needed, new
  logic in the same analytics route.
- Next lesson tab -- suggested follow-up moves per skill level. Would need
  an AI call over the existing patterns data; no new table.
- "Create teaching slides" button -- new feature, would need a slide-gen
  pipeline (Project Forge already has a PDF pipeline that could plausibly
  be reused/adapted, not from scratch).
- Home-page "Trends and patterns" quick-select widget -- UI-only gap,
  wraps the existing analytics endpoint with a Div/Assignment picker.
- Separate "Rubric library" (state/AP/IB standard rubrics to browse) vs
  "My rubrics" -- only "My rubrics" exists (Assessment Tool's own
  `rubrics` table). A browsable standards library is a new table +
  seed-data effort, not small.

## Group 2: Edcafe (image 8) -- reading/worksheet generation

Maps to Project Forge's Reading Passage Generator (built 2026-07-21,
`app/api/worksheet-generators/reading-passage/generate/route.ts`). Same
shape: topic input, additional instructions, output. Real gap: Edcafe's
Webpage and Files tabs -- Project Forge's generator only takes a topic
string today, no URL fetch or file upload path.

## Group 3: Generic dashboard kits (images 9-12)

Matches the Hub's new "personal assistant" home page (Today / Week at a
glance / Staff notes, built 2026-07-21). Specific gaps against these
mockups:
- Leaderboard widget -- Math Mastery's `mastery_students` table has real
  points data; not surfaced in the Hub yet.
- Calendar view -- Lesson Planner's `calendar_events` table is real and
  populated (district calendar upload feature); not pulled into the Hub's
  briefing yet.
- "Hours spent" / performance charts -- no time-tracking data exists
  anywhere in the ecosystem for this; would be new.

## Group 4: MS Teams Insights (image 13) -- student activity/engagement

**Nothing like this exists anywhere.** No table tracks a per-student
activity timeline (digital activity, on-time submission rate,
communication activity) across the ecosystem. `qr_submissions` has
timestamps but nothing aggregates them into an engagement view.

If built: belongs in parent-portal (where submissions already live), new
table shape something like:
`student_activity_events(id, qr_id, event_type, occurred_at, metadata)`
populated by existing submission/marking code paths as a side effect,
rather than a new tracking system bolted on separately.

## Not built this pass

This is a mapping document only, per Aj's framing ("tables I will need to
build later"). Nothing in Groups 1, 2, or 4 was implemented in this
session -- Group 3's Hub overlap was already built the same day, before
these images were shared.
