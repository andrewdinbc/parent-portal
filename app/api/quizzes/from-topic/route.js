// app/api/quizzes/from-topic/route.js
// The automated version of the manual pipeline Claude ran by hand once
// (2026-07-21, using its own web_search tool): given a subject+topic,
// finds a real relevant video from Aj's subject-tagged Actionable
// Resources channels (steering_documents, category=actionable_resources,
// source_type=web -- the exact list separated-by-subject and link-checked
// earlier), generates comprehension questions grounded in that video's
// real title/description, and saves it as a quiz with source_url set --
// ready to start as a live QR session via /api/quiz-sessions.
//
// Reads steering_documents directly from the shared Supabase project
// (same DB this whole ecosystem shares) via this app's own sbSelect,
// rather than round-tripping through Hyperion -- no new cross-app call
// needed since parent-portal already reaches this table.
//
// Requires YOUTUBE_API_KEY (see lib/youtube-search.js for setup). Fails
// with a clear 500 naming the missing env var if it isn't configured yet,
// rather than a confusing downstream error.

import Anthropic from '@anthropic-ai/sdk'
import { sbSelect, sbInsert } from '../../../../lib/supabase'
import { resolveChannelId, searchChannelForTopic, searchYouTubeForTopic } from '../../../../lib/youtube-search'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { subject, topic, gradeLevel, numQuestions } = await request.json()
    if (!subject || !topic) return Response.json({ error: 'subject and topic are required' }, { status: 400 })

    // Step 1: pull this subject's tagged web resources, keep the
    // YouTube-channel ones (the site-level resources like Khan Academy or
    // BC Curriculum aren't video sources, so they're skipped here --
    // that's what lib/web-search.js's webSearchSite is for instead).
    const taggedResources = await sbSelect(
      'steering_documents',
      `?category=eq.actionable_resources&source_type=eq.web&subject=eq.${encodeURIComponent(subject)}&select=title,source_url`
    )
    const youtubeChannels = taggedResources.filter((d) => /youtube\.com\/@/.test(d.source_url || ''))

    // Step 2: search each tagged channel in turn for a topic-relevant
    // video, stop at the first real result. A single channel failing
    // (bad handle resolution, transient API error) skips to the next
    // rather than failing the whole request.
    let video = null
    let usedChannel = null
    for (const ch of youtubeChannels) {
      try {
        const channelId = await resolveChannelId(ch.source_url)
        if (!channelId) continue
        const results = await searchChannelForTopic(channelId, topic, 3)
        if (results.length) { video = results[0]; usedChannel = ch.title; break }
      } catch { /* try the next tagged channel */ }
    }

    // Step 3: if none of the tagged channels had anything, fall back to
    // a general (safe-search) YouTube search -- still a real video, just
    // not from the pre-vetted list, flagged as such in the response.
    let fromTaggedChannel = true
    if (!video) {
      fromTaggedChannel = false
      const gradeQualifier = gradeLevel ? ` grade ${gradeLevel}` : ''
      const results = await searchYouTubeForTopic(`${topic} ${subject}${gradeQualifier} for kids educational`, 3)
      video = results[0] || null
    }
    if (!video) return Response.json({ error: `No relevant video found for "${topic}"` }, { status: 404 })

    // Step 4: generate questions grounded in the video's REAL title and
    // description only -- explicitly told not to invent transcript
    // content it can't verify, same honesty constraint as the manual run.
    const n = numQuestions || 6
    const prompt = `Create a multiple choice quiz for a classroom video-guide worksheet.

Video title: "${video.title}"
Channel: ${video.channelTitle}
Video description (real, from YouTube): ${video.description}
Subject: ${subject}
Topic: ${topic}
Grade level: ${gradeLevel || 'not specified'}
Number of questions: ${n}

Write questions about the concepts and structure described in the title/description above -- do NOT invent specific quotes, numbers, or scenes you cannot verify are actually in the video. This is a video-guide worksheet based on the video's own published title/description, not a transcript.

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "title": "quiz title",
  "questions": [
    { "question": "text", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "brief why" }
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content.find((b) => b.type === 'text')?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    // Step 5: save as a real quiz, source_url set to the real video --
    // this is the fix from earlier today (schema had the column, the
    // route never used it) actually paying off for an automated caller.
    const [quiz] = await sbInsert('quizzes', [{
      title: parsed.title, subject, question_type: 'multiple_choice',
      questions: parsed.questions, source: 'video', source_url: video.url,
    }])

    return Response.json({ quiz, video, fromTaggedChannel, usedChannel: usedChannel || null })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
