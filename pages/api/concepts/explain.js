// pages/api/concepts/explain.js
// Gemini-powered plain-English explainer for any academic concept

import { callGemini, parseJSON } from '../../../lib/gemini'
import { getConceptWithPapers } from '../../../lib/concepts'

const GEMINI_KEY = process.env.GEMINI_KEY || 'AIzaSyAetA3okV1BA9TEN8lRfBzdccxbpL2opBs'

const SYSTEM = `You are the world's best explainer of academic concepts for non-experts. 
Think: if a smart 22-year-old who just started their first marketing job asked you to explain this topic, 
what would you say? You are warm, direct, and use real-world examples they would actually recognise.
NEVER use academic jargon without immediately explaining it in plain words.
Your goal: genuine understanding, not just familiarity.
Respond with valid JSON only.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { conceptId, conceptLabel, conceptDescription } = req.body
  if (!conceptLabel) return res.status(400).json({ error: 'No concept provided' })

  try {
    // Fetch top papers for this concept from OpenAlex
    const papers = conceptId ? await getConceptWithPapers(conceptId) : []

    const paperContext = papers.slice(0, 4).map((p, i) =>
      `[${i+1}] "${p.title}" (${p.year}, ${p.citations} citations)\n${p.abstract ? 'Abstract: ' + p.abstract.substring(0, 400) : ''}`
    ).join('\n\n')

    const prompt = `Explain this marketing/consumer science concept to someone completely new to the field:

CONCEPT: "${conceptLabel}"
${conceptDescription ? `ACADEMIC DESCRIPTION: "${conceptDescription}"` : ''}
${paperContext ? `\nTOP RESEARCH PAPERS:\n${paperContext}` : ''}

Return a JSON object with exactly these fields:

{
  "what_is_it": "2-3 sentences. What IS this? No jargon at all.",
  "simple_analogy": "One vivid analogy that makes this click instantly.",
  "why_marketers_care": "2 sentences. Real business relevance.",
  "real_world_examples": ["example 1", "example 2", "example 3"],
  "the_key_insight": "The single most important thing to understand. One punchy sentence.",
  "common_misconception": "The most common wrong belief, then the truth. 2 sentences.",
  "how_it_connects_to_marketing": "How this shows up in day-to-day marketing work. 2 sentences.",
  "level": "beginner" or "intermediate" or "advanced",
  "related_concepts": ["concept1", "concept2", "concept3"],
  "one_sentence_definition": "Max 20 words. What you'd say at a dinner party."
}`

    const { text, model } = await callGemini(prompt, SYSTEM, GEMINI_KEY)
    const explanation = parseJSON(text)
    return res.status(200).json({ explanation, papers, model, conceptLabel })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
