// pages/api/extract.js
// Extracts falsifiable claims from submitted content

import { callGemini, parseJSON } from '../../lib/gemini'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body
  if (!text || text.trim().length < 20)
    return res.status(400).json({ error: 'Please provide at least 20 characters of content.' })

  const sys = `You are a rigorous marketing scientist extracting specific, falsifiable claims from content.
You understand both academic marketing research AND practitioner research (IPA, Ehrenberg-Bass, Binet & Field, etc.).
Respond with valid JSON only — no markdown, no preamble.`

  const prompt = `Analyze this marketing content and extract all specific, falsifiable claims.

Focus on: statistics, causal assertions, behavioral claims, effectiveness claims, ROI claims, 
trend assertions, and claims about how marketing works.

Ignore: pure opinions, vague motivational statements, or non-falsifiable assertions.

For each claim:
- id: "c1", "c2", etc.
- text: the claim as stated, concise but complete
- type: "statistical" | "causal" | "behavioral" | "trend" | "effectiveness" | "definitional"
- searchQueries: array of 3 strings optimised for academic database search:
  1. Specific: close to the claim (e.g. "long-term advertising effects brand equity")
  2. Mechanistic: the underlying principle (e.g. "advertising carryover effects sales")  
  3. Domain: broad field search (e.g. "advertising effectiveness marketing ROI")
  NOTE: Use academic/research terminology, not the exact claim wording.
  NOTE: If this is from known research (Binet & Field, Ehrenberg-Bass, IPA), include that in query 1.

Return JSON:
{
  "claims": [...],
  "contentSummary": "one sentence describing what this content is about",
  "knownSource": "name of research paper/body if recognisable, or null"
}

Content to analyze:
${text.substring(0, 7000)}`

  try {
    const { text: raw, model, provider } = await callGemini(prompt, sys)
    const parsed = parseJSON(raw)
    return res.status(200).json({ ...parsed, model, provider })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
