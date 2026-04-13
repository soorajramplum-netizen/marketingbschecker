// pages/api/extract.js
// Extracts falsifiable claims + detects content type

import { callGemini, parseJSON } from '../../lib/gemini'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body
  if (!text || text.trim().length < 20)
    return res.status(400).json({ error: 'Please provide at least 20 characters of content.' })

  const sys = `You are a rigorous marketing scientist extracting specific, falsifiable claims from content.
You also assess the SOURCE TYPE and EVIDENCE QUALITY of the content itself.
Respond with valid JSON only — no markdown, no preamble.`

  const prompt = `Analyze this marketing content carefully.

FIRST: Identify what kind of content this is:
- "peer-reviewed": Academic journal paper with methodology and citations
- "practitioner-research": IPA reports, Ehrenberg-Bass studies, Binet & Field, Nielsen research etc.
- "industry-report": McKinsey, Deloitte, HBR, trade publications with data
- "opinion": Blog posts, LinkedIn posts, Medium articles, personal essays WITHOUT citations
- "unknown": Cannot determine

THEN: Extract all specific, falsifiable claims. Ignore pure opinions, vague motivational statements.

For each claim:
- id: "c1", "c2" etc.
- text: the claim concisely stated
- type: "statistical" | "causal" | "behavioral" | "trend" | "effectiveness" | "definitional"
- hasCitation: true if the original text cites a source for this specific claim, false otherwise
- searchQueries: 3 academic search strings:
  1. Specific: close to the claim (academic terminology)
  2. Mechanistic: the underlying principle
  3. Domain: broad field search

Return JSON:
{
  "contentType": "peer-reviewed" | "practitioner-research" | "industry-report" | "opinion" | "unknown",
  "contentTypeReason": "one sentence explaining why",
  "hasCitations": true or false (does the content cite any external sources?),
  "claims": [...],
  "contentSummary": "one sentence describing what this content is about",
  "knownSource": "name if from a recognisable research paper/body, or null"
}

Content:
${text.substring(0, 7000)}`

  try {
    const { text: raw, model, provider } = await callGemini(prompt, sys)
    const parsed = parseJSON(raw)
    return res.status(200).json({ ...parsed, model, provider })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
