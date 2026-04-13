// pages/api/daily.js
// Daily digest — one insight per field, simplified by AI

import { getDailyPaper, FIELD_LABELS } from '../../lib/openalex'
import { callGemini, parseJSON } from '../../lib/gemini'

const DAILY_FIELDS = ['marketing', 'consumer_behavior', 'behavioral_economics']

const SIMPLIFY_SYSTEM = `You are a brilliant science communicator — like Malcolm Gladwell meets a great Reddit explainer.
Take dense academic research and make it clear enough for a busy marketing manager to understand in 30 seconds.
No jargon. No hedging. Just the core insight with a practical "so what".
Respond with valid JSON only — no markdown, no preamble.`

async function simplifyPaper(paper, fieldLabel) {
  if (!paper?.abstract) return null

  const prompt = `Academic paper to simplify:

Title: "${paper.title}"
Field: ${fieldLabel}
Year: ${paper.year}
Citations: ${paper.citations}
Abstract: ${paper.abstract.substring(0, 1200)}

Create a daily insight card. Return JSON with exactly these fields:
{
  "headline": "Punchy factual headline, max 12 words",
  "the_finding": "What researchers found — like texting a smart friend. Max 2 sentences. Zero jargon.",
  "why_it_matters": "One sentence starting with: This means for marketers...",
  "the_myth_it_busts": "One sentence naming a common belief this challenges, or null if none",
  "real_world_example": "One vivid concrete sentence — use real brands or situations",
  "complexity_score": 1,
  "confidence_level": "strong",
  "one_line_summary": "10 words max — elevator pitch version"
}

complexity_score: 1=very simple to 5=very complex
confidence_level: "strong" | "moderate" | "preliminary"`

  try {
    const { text } = await callGemini(prompt, SIMPLIFY_SYSTEM)
    const insight = parseJSON(text)
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
    console.error('Simplification failed:', e.message)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Set longer timeout hint for Vercel
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  try {
    // Fetch papers sequentially to avoid rate limits
    const paperResults = []
    for (const field of DAILY_FIELDS) {
      try {
        const paper = await getDailyPaper(field, { minCitations: 10 })
        paperResults.push({ field, paper })
      } catch {
        paperResults.push({ field, paper: null })
      }
    }

    // Simplify each paper
    const insights = []
    for (const { field, paper } of paperResults) {
      if (!paper) continue
      const insight = await simplifyPaper(paper, FIELD_LABELS[field])
      if (insight) insights.push(insight)
    }

    // Connector insight tying all three together
    let connector = null
    if (insights.length >= 2) {
      try {
        const { text } = await callGemini(
          `Today's 3 research findings:
${insights.map((ins, i) => `${i + 1}. ${ins.headline}: ${ins.the_finding}`).join('\n')}

Write ONE connecting insight (2 sentences) tying these into a broader truth about human behavior or marketing.
Plain language. Make it feel like a revelation.
Return JSON: {"connector": "your insight here"}`,
          SIMPLIFY_SYSTEM
        )
        connector = parseJSON(text).connector
      } catch { /* optional */ }
    }

    const today = new Date()
    return res.status(200).json({
      date: today.toISOString().split('T')[0],
      dateLabel: today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      insights,
      connector,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
