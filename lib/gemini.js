// lib/gemini.js
// Gemini client with 6-tier fallback chain

const MODELS = [
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite-preview-06-17',
  'gemini-1.5-flash',
]

export async function callGemini(prompt, systemPrompt = '', apiKey, attempt = 0) {
  if (attempt >= MODELS.length) throw new Error('All Gemini models exhausted')
  const model = MODELS[attempt]
  try {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 6000 },
    }
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const d = await res.json()
    if (d.error) throw new Error(d.error.message)
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) throw new Error('Empty response')
    return { text, model }
  } catch (e) {
    console.warn(`Gemini ${model} failed:`, e.message)
    return callGemini(prompt, systemPrompt, apiKey, attempt + 1)
  }
}

export function parseJSON(raw) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}
