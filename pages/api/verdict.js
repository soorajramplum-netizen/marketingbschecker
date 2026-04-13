// pages/api/verdict.js
// Synthesizes a verdict for a single claim given retrieved papers

import { callGemini, parseJSON } from '../../lib/gemini'
import { gatherEvidence } from '../../lib/evidence'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { claim, knownSource } = req.body
  if (!claim) return res.status(400).json({ error: 'No claim provided.' })

  const papers = await gatherEvidence(claim)

  const sys = `You are a senior marketing scientist and evidence reviewer with deep knowledge of:
- Academic marketing research (Journal of Marketing, Journal of Consumer Research, etc.)
- Practitioner research (IPA, Ehrenberg-Bass Institute, Binet & Field, Nielsen, McKinsey)
- Behavioral economics (Kahneman, Thaler, Ariely)
- Marketing effectiveness literature

Your job: give a FAIR, ACCURATE verdict on whether a marketing claim is supported by evidence.

CRITICAL RULES:
1. Academic papers are not the only valid evidence. Well-established practitioner research 
   (e.g. IPA Effectiveness Awards, Ehrenberg-Bass studies, Binet & Field "The Long and Short of It") 
   carries significant weight even if not in the retrieved papers.
2. If a claim aligns with established marketing science consensus, say so — even if the exact 
   papers weren't retrieved. Use your knowledge of the field.
3. Do NOT mark a claim as "unsupported" simply because OpenAlex didn't return the exact paper.
   Absence of retrieved papers ≠ absence of evidence.
4. Be generous with well-known, well-replicated findings. Be strict with novel or suspicious claims.
5. Your confidence should reflect the FIELD'S confidence, not just what was retrieved.

Respond with valid JSON only.`

  const paperText = papers.length
    ? papers.map((p, i) =>
        `[${i+1}] "${p.title}" (${p.year || 'n/a'}, ${p.source || p.db}, ${p.citations} citations)${p.abstract ? '\nAbstract: ' + p.abstract.substring(0, 400) : ''}`
      ).join('\n\n')
    : 'No papers retrieved from databases — but use your expert knowledge of marketing research.'

  const prompt = `Assess this marketing claim using both retrieved papers AND your expert knowledge:

CLAIM: "${claim.text}"
KNOWN SOURCE: ${knownSource || 'not identified — use field knowledge'}
TYPE: ${claim.type}

RETRIEVED PAPERS:
${paperText}

ASSESSMENT FRAMEWORK:
1. Is this claim consistent with established marketing science? (Use your field knowledge)
2. Do the retrieved papers support, partially support, or contradict it?
3. Is this from a known body of research (Binet & Field, Ehrenberg-Bass, IPA, etc.)?
4. What caveats genuinely apply vs. pedantic over-qualification?

VERDICT SCALE:
- "well-supported": Strong consensus in marketing science, replicated findings
- "partially-supported": Generally true but with important nuance or scope limitations  
- "contested": Genuine disagreement in the literature
- "unsupported": No meaningful evidence base exists for this claim
- "contradicted": Evidence actively contradicts this claim

Return JSON:
{
  "verdict": "well-supported" | "partially-supported" | "contested" | "unsupported" | "contradicted",
  "confidence": 0-100,
  "evidenceQuality": "high" | "moderate" | "low" | "none",
  "knownResearchBodies": ["e.g. Binet & Field", "Ehrenberg-Bass"],
  "summary": "2-3 sentences: what the evidence actually shows, including field consensus",
  "caveats": ["only genuinely important caveats, not pedantic ones"],
  "generalizabilityWarning": "real scope limitation or null",
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
