// lib/gemini.js
// Multi-provider LLM client: Gemini → Groq → OpenRouter
// Each tier has its own models. Falls through automatically on failure.

// ── Gemini ────────────────────────────────────────────────────────────────────
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

async function callGeminiModel(model, prompt, systemPrompt, apiKey) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 6000 },
  }
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
  const d = await res.json()
  if (d.error) throw new Error(d.error.message)
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('Empty response')
  return text
}

// ── Groq ──────────────────────────────────────────────────────────────────────
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'mixtral-8x7b-32768',
  'llama3-70b-8192',
]

async function callGroqModel(model, prompt, systemPrompt, apiKey) {
  const messages = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 6000 }),
  })
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`)
  const d = await res.json()
  if (d.error) throw new Error(d.error.message)
  const text = d.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Empty response')
  return text
}

// ── OpenRouter ────────────────────────────────────────────────────────────────
const OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct',
  'google/gemini-flash-1.5',
  'mistralai/mixtral-8x7b-instruct',
  'anthropic/claude-3-haiku',
]

async function callOpenRouterModel(model, prompt, systemPrompt, apiKey) {
  const messages = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://marketingbschecker.vercel.app',
      'X-Title': 'Marketing BS Detector',
    },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 6000 }),
  })
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`)
  const d = await res.json()
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error))
  const text = d.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Empty response')
  return text
}

// ── Main exported function ────────────────────────────────────────────────────
// Tries every model in every provider in order. Returns { text, model, provider }.

export async function callGemini(prompt, systemPrompt = '', apiKey = '') {
  const geminiKey  = apiKey || process.env.GEMINI_KEY || ''
  const groqKey    = process.env.GROQ_KEY || ''
  const orKey      = process.env.OPENROUTER_KEY || ''

  const errors = []

  // ── Tier 1: Gemini ──
  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const text = await callGeminiModel(model, prompt, systemPrompt, geminiKey)
        return { text, model, provider: 'Gemini' }
      } catch (e) {
        errors.push(`Gemini/${model}: ${e.message}`)
        console.warn(`Gemini ${model} failed:`, e.message)
      }
    }
  }

  // ── Tier 2: Groq ──
  if (groqKey) {
    for (const model of GROQ_MODELS) {
      try {
        const text = await callGroqModel(model, prompt, systemPrompt, groqKey)
        return { text, model, provider: 'Groq' }
      } catch (e) {
        errors.push(`Groq/${model}: ${e.message}`)
        console.warn(`Groq ${model} failed:`, e.message)
      }
    }
  }

  // ── Tier 3: OpenRouter ──
  if (orKey) {
    for (const model of OPENROUTER_MODELS) {
      try {
        const text = await callOpenRouterModel(model, prompt, systemPrompt, orKey)
        return { text, model, provider: 'OpenRouter' }
      } catch (e) {
        errors.push(`OpenRouter/${model}: ${e.message}`)
        console.warn(`OpenRouter ${model} failed:`, e.message)
      }
    }
  }

  throw new Error(`All providers exhausted.\n${errors.slice(-6).join('\n')}`)
}

export function parseJSON(raw) {
  // Strip markdown code fences if present
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    // Try to extract JSON object/array from within the text
    const match = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m)
    if (match) return JSON.parse(match[1])
    throw new Error('Could not parse JSON from response')
  }
}
