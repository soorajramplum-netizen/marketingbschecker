// pages/api/extract.js
// Extracts claims + performs nuanced source classification

import { callGemini, parseJSON } from '../../lib/gemini'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body
  if (!text || text.trim().length < 20)
    return res.status(400).json({ error: 'Please provide at least 20 characters of content.' })

  const sys = `You are an expert at evaluating marketing content and identifying the quality of evidence behind claims.
You understand the difference between opinion, synthesis of others' research, original research, and everything in between.
Respond with valid JSON only.`

  const prompt = `Carefully analyze this marketing content.

STEP 1 — CLASSIFY THE SOURCE TYPE:

Use this precise classification:

"peer-reviewed" — Academic journal paper with methodology, statistics, and citations
"practitioner-research" — Named researchers/institutions with specific quantified findings
  Examples: IPA studies, Ehrenberg-Bass, Binet & Field, Orlando Wood/System1, Paul Dyson/Ebiquity,
  Byron Sharp, Nielsen, WARC, Les Binet. The key signal: NAMED SOURCE + SPECIFIC NUMBER.
"research-synthesis" — Article that consolidates findings from named researchers/studies,
  even without inline citations. The author summarises others' evidence-backed work.
  Key signal: specific researchers named, specific percentages/numbers attributed to them.
"industry-report" — McKinsey, Deloitte, HBR, trade publications with data but not academic
"informed-opinion" — Written by someone with expertise, makes logical arguments, may reference
  general concepts, but does NOT cite specific researchers or give specific numbers from studies
"pure-opinion" — Personal anecdote, no research anchors, no named researchers, no specific data

EVIDENCE SIGNALS to look for (each one present raises the classification):
- Named researcher (e.g. "Paul Dyson", "Orlando Wood", "Byron Sharp") → strong signal
- Specific percentage or number attributed to a study (e.g. "12x profitability", "+88% conversion") → strong signal  
- Named institution (IPA, Ehrenberg-Bass, Nielsen, System1, Ebiquity) → strong signal
- General concept reference without numbers ("research shows") → weak signal
- Personal anecdote ("I did X and got Y") → negative signal
- No sources at all → negative signal

STEP 2 — EXTRACT CLAIMS:

For each specific, falsifiable claim:
- id: "c1", "c2" etc.
- text: the claim concisely
- type: "statistical" | "causal" | "behavioral" | "trend" | "effectiveness" | "definitional"
- evidenceAnchor: the specific researcher/institution/study named for this claim, or null
- hasSpecificData: true if a specific number/percentage supports this claim
- searchQueries: 3 academic search strings:
  1. Named researcher + concept if available (e.g. "Orlando Wood showmanship salesmanship advertising")
  2. The underlying mechanism (e.g. "emotional advertising brand awareness lift")
  3. Broad domain (e.g. "creative quality advertising effectiveness")

Return JSON:
{
  "contentType": "peer-reviewed"|"practitioner-research"|"research-synthesis"|"industry-report"|"informed-opinion"|"pure-opinion",
  "contentTypeReason": "one specific sentence explaining the classification with evidence from the text",
  "evidenceLevel": 1-5,
  "evidenceLevelReason": "why this level",
  "namedResearchers": ["list of named researchers/institutions found in the text"],
  "hasCitations": true/false,
  "claims": [...],
  "contentSummary": "one sentence",
  "knownSource": "name of specific research paper/body if identifiable, or null"
}

evidenceLevel scale:
5 = Peer-reviewed original research with methodology
4 = Named researcher + specific quantified findings (practitioner research)
3 = Synthesis of named researchers' work / industry reports with data
2 = Informed expert opinion with logical arguments, no specific data
1 = Pure opinion / anecdote / no research anchors

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
