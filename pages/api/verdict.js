// pages/api/verdict.js
// Synthesizes a verdict for a single claim given retrieved papers

import { callGemini, parseJSON } from '../../lib/gemini'
import { gatherEvidence } from '../../lib/evidence'

const GEMINI_KEY = process.env.GEMINI_KEY || 'AIzaSyAetA3okV1BA9TEN8lRfBzdccxbpL2opBs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { claim } = req.body
  if (!claim) return res.status(400).json({ error: 'No claim provided.' })

  // gather evidence
  const papers = await gatherEvidence(claim)

  const sys = `You are a rigorous peer reviewer assessing marketing claims against academic evidence. Be precise, calibrated, and honest about uncertainty. Respond with valid JSON only.`

  const paperText = papers.length
    ? papers.map((p, i) =>
        `[${i+1}] "${p.title}" (${p.year || 'n/a'}, ${p.source || p.db}, ${p.citations} citations)${p.abstract ? '\nAbstract: ' + p.abstract.substring(0, 300) : ''}`
      ).join('\n\n')
    : 'No papers retrieved from any database.'

  const prompt = `Assess this marketing claim:
"${claim.text}"
Type: ${claim.type}

Retrieved papers:
${paperText}

Consider:
- Do papers directly or indirectly support/contradict this claim?
- Evidence quality: meta-analysis > RCT > longitudinal > cross-sectional > case study
- Caveats: sample population, era, geography, industry context
- If no direct evidence, reason from adjacent constructs
- Be calibrated — don't overstate support or opposition

Return JSON:
{
  "verdict": "well-supported" | "partially-supported" | "contested" | "unsupported" | "contradicted",
  "confidence": 0-100,
  "evidenceQuality": "high" | "moderate" | "low" | "none",
  "summary": "2-3 sentences synthesizing what evidence shows",
  "caveats": ["specific caveat strings"],
  "generalizabilityWarning": "scope limitation string or null",
  "paperAssessments": [
    {"index": 1, "relevance": 0-100, "stance": "supports" | "neutral" | "contradicts", "note": "brief"}
  ]
}`

  try {
    const { text: raw } = await callGemini(prompt, sys, GEMINI_KEY)
    const verdict = parseJSON(raw)
    return res.status(200).json({ verdict, papers })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
