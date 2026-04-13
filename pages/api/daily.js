// pages/api/digest.js
// Generates the daily digest — one insight per field, oversimplified by Gemini

import { getDailyPaper, FIELD_CONCEPTS, FIELD_LABELS } from '../../lib/openalex'
import { callGemini, parseJSON } from '../../lib/gemini'

const GEMINI_KEY = process.env.GEMINI_KEY || 'AIzaSyAetA3okV1BA9TEN8lRfBzdccxbpL2opBs'

// The three fields we feature daily — rotate through more over time
const DAILY_FIELDS = ['marketing', 'consumer_behavior', 'behavioral_economics']

const SIMPLIFY_SYSTEM = `You are a brilliant science communicator — like a mix of Malcolm Gladwell and a Reddit explainer. 
Your job: take dense academic research and make it so clear that a busy marketing manager can understand it in 30 seconds.
No jargon. No hedging. Just the core insight, explained simply, with a "so what" for marketers.
Respond with valid JSON only.`

async function simplifyPaper(paper, fieldLabel) {
  if (!paper?.abstract) return null

  const prompt = `You have this academic paper:

Title: "${paper.title}"
Field: ${fieldLabel}
Year: ${paper.year}
Citations: ${paper.citations}
Abstract: ${paper.abstract.substring(0, 1200)}

Your job — create a "daily insight" card with these exact fields:

1. headline: A punchy, specific headline (max 12 words). Not clickbait — factual but engaging. Like a good magazine subhead.
2. the_finding: Explain what the researchers actually found. Write like you're texting a smart friend. Max 2 sentences. Zero jargon. Be specific about what they found, not vague.
3. why_it_matters: One sentence — "This means for marketers..." Make it actionable.
4. the_myth_it_busts: If this finding challenges a common marketing belief, name it in one sentence. If it doesn't bust a myth, write null.
5. real_world_example: A concrete, relatable example of this finding in practice. One sentence. Make it vivid.
6. complexity_score: How complex is this research? 1 (very simple) to 5 (very complex). Be honest.
7. confidence_level: "strong" | "moderate" | "preliminary" — based on citation count and study design implied by abstract.
8. one_line_summary: If you had to explain this to someone in a lift in 10 words, what would you say?

Return JSON with exactly these fields.`

  try {
    const { text } = await callGemini(prompt, SIMPLIFY_SYSTEM, GEMINI_KEY)
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
      fieldKey: DAILY_FIELDS.find(f => FIELD_LABELS[f] === fieldLabel),
    }
  } catch (e) {
    console.error('Simplification failed:', e.message)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Fetch one paper per field in parallel
    const papers = await Promise.all(
      DAILY_FIELDS.map(field => getDailyPaper(field, { minCitations: 15 }))
    )

    // Simplify each paper with Gemini in parallel
    const insights = await Promise.all(
      papers.map((paper, i) => {
        if (!paper) return null
        return simplifyPaper(paper, FIELD_LABELS[DAILY_FIELDS[i]])
      })
    )

    const validInsights = insights.filter(Boolean)

    // Generate a daily "connector" — how these 3 findings relate
    let connector = null
    if (validInsights.length >= 2) {
      try {
        const connectorPrompt = `Here are today's 3 research findings:
${validInsights.map((ins, i) => `${i + 1}. ${ins.headline}: ${ins.the_finding}`).join('\n')}

Write a single connecting insight (2 sentences max) that ties these findings together into one broader truth about human behavior or marketing. 
Make it feel like a revelation, not a summary. Very plain language.
Return JSON: {"connector": "your insight here"}`

        const { text } = await callGemini(connectorPrompt, SIMPLIFY_SYSTEM, GEMINI_KEY)
        const parsed = parseJSON(text)
        connector = parsed.connector
      } catch { /* connector is optional */ }
    }

    const today = new Date()
    return res.status(200).json({
      date: today.toISOString().split('T')[0],
      dateLabel: today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      insights: validInsights,
      connector,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
