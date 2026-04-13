// pages/api/daily.js
// Daily digest — one insight from each of our 3 core domains
// Pulls from curated top journals to guarantee abstract quality

import { getDailyPaper, FIELD_LABELS } from '../../lib/openalex'
import { callGemini, parseJSON } from '../../lib/gemini'

// Our 3 daily domains — focused and relevant
const DAILY_DOMAINS = ['marketing', 'consumer_psychology', 'behavioral_science']

const SYSTEM = `You are a brilliant science communicator. Your job: take a dense academic paper 
and explain its core finding so clearly that a busy marketing manager understands it in 30 seconds.
Rules: No jargon. No hedging. Be specific about what they actually found. Make it actionable.
Respond with valid JSON only — no markdown fences, no preamble.`

async function simplifyPaper(paper, fieldLabel) {
  if (!paper?.abstract || paper.abstract.length < 100) return null

  const prompt = `Simplify this academic paper for a marketing professional:

Title: "${paper.title}"
Field: ${fieldLabel}
Year: ${paper.year} | Citations: ${paper.citations}
Journal: ${paper.journal}
Abstract: ${paper.abstract.substring(0, 1500)}

Return JSON with exactly these fields — no extras:
{
  "headline": "Specific punchy headline under 12 words — state the actual finding, not vague teaser",
  "the_finding": "What they found — as if texting a smart friend. 2 sentences max. Use actual numbers if in abstract. Zero jargon.",
  "why_it_matters": "One sentence: what this means for marketers in practice",
  "the_myth_it_busts": "One sentence naming a common belief this challenges, or null",
  "real_world_example": "One vivid sentence — a real brand or scenario where this plays out",
  "complexity_score": 3,
  "confidence_level": "strong",
  "one_line_summary": "If you had 8 words to explain this finding, what would you say?"
}

complexity_score: 1=very simple, 5=very complex (be accurate)
confidence_level: "strong" | "moderate" | "preliminary" (based on citation count and journal quality)`

  try {
    const { text } = await callGemini(prompt, SYSTEM)
    const insight = parseJSON(text)

    // Validate required fields exist
    if (!insight.headline || !insight.the_finding) return null

    return {
      ...insight,
      paper: {
        title: paper.title,
        year: paper.year,
        journal: paper.journal,
        citations: paper.citations,
        authors: paper.authors,
        doiUrl: paper.doiUrl,
        concepts: paper.concepts,
      },
      field: fieldLabel,
    }
  } catch (e) {
    console.error('Simplification failed for:', paper.title, e.message)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Cache for 1 hour on Vercel Edge, stale for 24h
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  const results = []

  // Process each domain sequentially — avoids rate limits
  for (const domain of DAILY_DOMAINS) {
    const fieldLabel = FIELD_LABELS[domain]
    try {
      // Try with reasonable citation threshold first
      let paper = await getDailyPaper(domain, { minCitations: 25, fromYear: 2018 })

      // Fallback: lower threshold if nothing found
      if (!paper) {
        paper = await getDailyPaper(domain, { minCitations: 10, fromYear: 2015 })
      }

      if (!paper) {
        console.warn('No paper found for domain:', domain)
        continue
      }

      const insight = await simplifyPaper(paper, fieldLabel)
      if (insight) results.push(insight)

    } catch (e) {
      console.error('Domain failed:', domain, e.message)
    }
  }

  if (results.length === 0) {
    return res.status(500).json({ error: 'Could not retrieve papers from any domain. Try again shortly.' })
  }

  // Connector insight — ties the 3 findings together
  let connector = null
  if (results.length >= 2) {
    try {
      const { text } = await callGemini(
        `Today's research findings from marketing science:
${results.map((r, i) => (i + 1) + '. [' + r.field + '] ' + r.headline + ': ' + r.the_finding).join('\n')}

Write ONE connecting insight (2 sentences) showing what these findings reveal together about human behavior or marketing effectiveness.
Be specific and insightful — not generic. Plain language.
Return JSON: {"connector": "your insight here"}`,
        SYSTEM
      )
      connector = parseJSON(text).connector || null
    } catch { /* connector is optional */ }
  }

  const today = new Date()
  return res.status(200).json({
    date: today.toISOString().split('T')[0],
    dateLabel: today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    insights: results,
    connector,
    domainsQueried: DAILY_DOMAINS.map(d => FIELD_LABELS[d]),
  })
}
