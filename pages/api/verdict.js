// pages/api/verdict.js
// Evidence-calibrated verdict — respects source quality, not just database hits

import { callGemini, parseJSON } from '../../lib/gemini'
import { gatherEvidence } from '../../lib/evidence'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { claim, knownSource, contentType, evidenceLevel, namedResearchers } = req.body
  if (!claim) return res.status(400).json({ error: 'No claim provided.' })

  const papers = await gatherEvidence(claim)

  const sys = `You are a calibrated marketing scientist giving fair, accurate verdicts on claims.

You understand that evidence exists on a spectrum:
- Peer-reviewed meta-analyses = highest
- Named researcher + specific quantified finding (e.g. "Paul Dyson found 12x ROI") = high  
- Research synthesis articles citing named researchers = moderate-high
- Industry reports with data = moderate
- Expert opinion without data = low
- Personal anecdote = none

Your verdicts must be PROPORTIONATE to evidence quality — not too harsh, not too lenient.
A claim backed by Orlando Wood's IPA research deserves "well-supported" even if OpenAlex didn't return the exact paper.
A claim from a pure opinion piece with no sources deserves "unsupported" even if it sounds correct.

Respond with valid JSON only.`

  const paperText = papers.length
    ? papers.map((p, i) =>
        `[${i+1}] "${p.title}" (${p.year || 'n/a'}, ${p.source || p.db}, ${p.citations} citations)${p.abstract ? '\nAbstract: ' + p.abstract.substring(0, 400) : ''}`
      ).join('\n\n')
    : 'No papers retrieved from databases.'

  const prompt = `Assess this marketing claim:

CLAIM: "${claim.text}"
TYPE: ${claim.type}
EVIDENCE ANCHOR: ${claim.evidenceAnchor || 'none stated'}
HAS SPECIFIC DATA: ${claim.hasSpecificData ? 'yes' : 'no'}

SOURCE CONTEXT:
- Content type: ${contentType || 'unknown'}
- Evidence level: ${evidenceLevel || 'unknown'}/5
- Named researchers in source: ${(namedResearchers || []).join(', ') || 'none'}
- Known research body: ${knownSource || 'not identified'}

RETRIEVED PAPERS FROM DATABASES:
${paperText}

ASSESSMENT APPROACH:
1. Check if this claim has a named evidence anchor (researcher/institution + specific number)
   If YES: treat as practitioner research → can be "well-supported" or "partially-supported"
   
2. Check retrieved papers for direct or adjacent support
   
3. Apply your expert knowledge of marketing science:
   - Orlando Wood / System1 / IPA creative research → well-established
   - Paul Dyson / Ebiquity advertising profitability → well-established  
   - Binet & Field / IPA effectiveness → well-established
   - Ehrenberg-Bass / Byron Sharp → well-established
   - Generic "studies show" without source → treat skeptically

4. Consider if the claim is directionally correct even if exact numbers vary

VERDICT RULES:
- "well-supported": Backed by named research OR multiple converging database papers. Specific numbers from known researchers qualify.
- "partially-supported": Directionally correct per research consensus but exact claim lacks direct evidence, OR single study support
- "contested": Genuine disagreement exists — some research supports, some contradicts
- "unsupported": No research anchor, no database evidence, no field consensus. Use for pure opinion claims.
- "contradicted": Evidence actively contradicts this

CONFIDENCE CALIBRATION:
- Named researcher + specific number: 65-85%
- Retrieved papers support: +10-15%  
- No evidence anchor + no papers: 20-35% max
- Pure opinion source: 15-30% max

Return JSON:
{
  "verdict": "well-supported"|"partially-supported"|"contested"|"unsupported"|"contradicted",
  "confidence": 0-100,
  "evidenceQuality": "high"|"moderate"|"low"|"none",
  "sourceType": "peer-reviewed"|"practitioner-research"|"research-synthesis"|"industry-report"|"informed-opinion"|"pure-opinion"|"unknown",
  "knownResearchBodies": ["specific bodies that support this — only if genuinely applicable"],
  "evidenceAnchorUsed": "the specific researcher/finding used to assess this, or null",
  "summary": "2-3 sentences: honest synthesis of what evidence shows and why this verdict",
  "caveats": ["only caveats that genuinely matter"],
  "generalizabilityWarning": "real limitation or null",
  "paperAssessments": [
    {"index": 1, "relevance": 0-100, "stance": "supports"|"neutral"|"contradicts", "note": "brief"}
  ]
}`

  try {
    const { text: raw, model, provider } = await callGemini(prompt, sys)
    const verdict = parseJSON(raw)
    return res.status(200).json({ verdict, papers, model, provider })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
