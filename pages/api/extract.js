// pages/api/extract.js
// Extracts falsifiable claims from submitted content

import { callGemini, parseJSON } from '../../lib/gemini'

const GEMINI_KEY = process.env.GEMINI_KEY || 'AIzaSyAetA3okV1BA9TEN8lRfBzdccxbpL2opBs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body
  if (!text || text.trim().length < 20)
    return res.status(400).json({ error: 'Please provide at least 20 characters of content.' })

  const sys = `You are a rigorous scientific analyst specializing in marketing science, consumer psychology, and behavioral economics. Extract discrete, falsifiable claims only. Respond with valid JSON only — no markdown, no preamble.`

  const prompt = `Analyze this marketing content and extract all specific, falsifiable claims.

Focus on: statistics, causal assertions, behavioral claims, effectiveness claims, ROI claims, trend assertions, and definitional claims about how marketing works.

Ignore: pure opinions, vague statements, subjective assessments, or motivational language.

For each claim:
- id: "c1", "c2", etc.
- text: concise version of the claim
- type: one of [statistical, causal, behavioral, trend, effectiveness, definitional]
- searchQueries: array of 3 strings:
  1. Specific query (close to the claim)
  2. Conceptual query (the underlying mechanism)
  3. Domain-level query (broad field)

Return: {"claims": [...], "contentSummary": "one sentence"}

Content:
${text.substring(0, 7000)}`

  try {
    const { text: raw, model } = await callGemini(prompt, sys, GEMINI_KEY)
    const parsed = parseJSON(raw)
    return res.status(200).json({ ...parsed, model })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
