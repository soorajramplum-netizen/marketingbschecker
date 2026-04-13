// pages/api/verdict.js
// Synthesizes a verdict — strict, calibrated, source-type aware

import { callGemini, parseJSON } from '../../lib/gemini'
import { gatherEvidence } from '../../lib/evidence'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { claim, knownSource, contentType } = req.body
  if (!claim) return res.status(400).json({ error: 'No claim provided.' })

  const papers = await gatherEvidence(claim)

  const sys = `You are a strict, rigorous scientific peer reviewer assessing marketing claims.
Your job is to be ACCURATE — neither too harsh nor too generous.

CORE PRINCIPLE: A claim's verdict must reflect the QUALITY OF EVIDENCE BEHIND IT, not whether it sounds plausible.

EVIDENCE HIERARCHY (strictly apply this):
1. Meta-analyses and systematic reviews → can support "well-supported"
2. Multiple independent RCTs or large longitudinal studies → can support "well-supported"  
3. Single strong studies, known practitioner research bodies (IPA, Ehrenberg-Bass, Binet & Field) → "partially-supported"
4. Industry reports, common wisdom, one-off studies → "partially-supported" at best
5. Personal opinion, anecdotes, blog posts, no citations → "unsupported" regardless of whether it sounds right
6. Evidence actively contradicts → "contradicted"

CRITICAL RULES — never break these:
- If the source is a blog post, Medium article, LinkedIn post, or opinion piece with NO citations: 
  verdicts can only be "unsupported", "partially-supported" (if aligned with known research), or "contradicted"
  NEVER give "well-supported" to uncited opinion content
- "Sounds reasonable" or "aligns with common sense" is NOT evidence — mark as "unsupported"
- If field knowledge supports a claim but no evidence was retrieved, max verdict is "partially-supported"
- Only give "well-supported" when there is genuine empirical backing — replicated studies, not vibes
- Confidence score reflects evidence strength, not claim plausibility. No citations = max 40% confidence.

Respond with valid JSON only.`

  const paperText = papers.length
    ? papers.map((p, i) =>
        `[${i+1}] "${p.title}" (${p.year || 'n/a'}, ${p.source || p.db}, ${p.citations} citations)${p.abstract ? '\nAbstract: ' + p.abstract.substring(0, 400) : ''}`
      ).join('\n\n')
    : 'No papers retrieved from any database.'

  const prompt = `Assess this marketing claim with strict evidence standards:

CLAIM: "${claim.text}"
TYPE: ${claim.type}
KNOWN SOURCE: ${knownSource || 'unknown — likely a blog post or opinion piece unless otherwise indicated'}
CONTENT TYPE CONTEXT: ${contentType || 'unknown'}

RETRIEVED PAPERS:
${paperText}

ASSESSMENT STEPS — work through these in order:
1. What TYPE of source is this claim from? (peer-reviewed research / practitioner report / blog / opinion / unknown)
2. Are there retrieved papers that directly address this claim?
3. Does established marketing science have consensus on this? Name specific studies if yes.
4. What is the genuine evidence quality — not what sounds right, but what is proven?
5. Are there important caveats that change the interpretation?

VERDICT GUIDANCE:
- "well-supported": Multiple strong studies confirm. Cannot apply to opinion/blog content.
- "partially-supported": Some evidence exists OR known research bodies align, but not definitive
- "contested": Real disagreement exists in literature between researchers
- "unsupported": No meaningful evidence base. Use for opinion pieces without citations, unverified claims.
- "contradicted": Evidence actively contradicts this claim

Return JSON:
{
  "verdict": "well-supported" | "partially-supported" | "contested" | "unsupported" | "contradicted",
  "confidence": 0-100,
  "evidenceQuality": "high" | "moderate" | "low" | "none",
  "sourceType": "peer-reviewed" | "practitioner-research" | "industry-report" | "opinion" | "unknown",
  "knownResearchBodies": ["only if genuinely applicable — e.g. Binet & Field, Ehrenberg-Bass"],
  "summary": "2-3 sentences: what evidence actually shows, being honest about gaps",
  "caveats": ["only genuine caveats"],
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
