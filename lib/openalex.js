// lib/openalex.js
// OpenAlex API — curated around our 4 core domains

const BASE = 'https://api.openalex.org'

// ── Core domain concept IDs ────────────────────────────────────────────────
// These are the 4 domains we focus on — every search is anchored here first
export const CORE_DOMAINS = {
  marketing: {
    label: 'Marketing Science',
    conceptId: 'C17744445',
    // Sub-concepts within marketing we care about most
    subConcepts: ['C127413603', 'C2780473472', 'C2778717582', 'C2780468801'],
    journals: ['S170285963', 'S91658814', 'S2764493692', 'S2764455558'], // JMR, JAMS, Marketing Science
    emoji: '📢',
    color: '#00c896',
  },
  consumer_psychology: {
    label: 'Consumer Psychology',
    conceptId: 'C2779209822',
    subConcepts: ['C2780468801', 'C2780371682', 'C111472728'],
    journals: ['S167974482', 'S35775959'], // JCR, JCP
    emoji: '🧠',
    color: '#a78bfa',
  },
  behavioral_science: {
    label: 'Behavioral Science',
    conceptId: 'C2993193',
    subConcepts: ['C36289849', 'C111472728', 'C2779209822'],
    journals: ['S2764461616', 'S2764455558'],
    emoji: '⚖️',
    color: '#f0a500',
  },
}

export const FIELD_LABELS = {
  marketing: 'Marketing Science',
  consumer_psychology: 'Consumer Psychology',
  behavioral_science: 'Behavioral Science',
}

// ── Helpers ────────────────────────────────────────────────────────────────
function reconstructAbstract(inv) {
  if (!inv) return ''
  const words = []
  for (const [word, positions] of Object.entries(inv))
    for (const pos of positions) words[pos] = word
  return words.filter(Boolean).join(' ').substring(0, 800)
}

function formatWork(w) {
  return {
    id: w.id,
    title: w.title || '',
    year: w.publication_year,
    doi: w.doi,
    citations: w.cited_by_count || 0,
    journal: w.primary_location?.source?.display_name || '',
    abstract: reconstructAbstract(w.abstract_inverted_index),
    authors: (w.authorships || []).slice(0, 3).map(a => a.author?.display_name).filter(Boolean),
    concepts: (w.concepts || []).slice(0, 5).map(c => c.display_name),
    doiUrl: w.doi ? 'https://doi.org/' + w.doi.replace('https://doi.org/', '') : null,
  }
}

// ── Daily paper — robust version ───────────────────────────────────────────
// Pulls from top journals in each domain to guarantee quality abstracts
export async function getDailyPaper(domainKey, options = {}) {
  const { minCitations = 30, fromYear = 2018 } = options
  const domain = CORE_DOMAINS[domainKey]
  if (!domain) return null

  // Use date seed to rotate — but fetch from a curated journal list
  // so we always get high-quality, abstract-rich papers
  const today = new Date()
  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()

  // Try domain journals first — highest quality
  for (const journalId of domain.journals) {
    try {
      const params = new URLSearchParams({
        filter: [
          'primary_location.source.id:' + journalId,
          'publication_year:>' + fromYear,
          'cited_by_count:>' + minCitations,
          'has_abstract:true',
          'type:article',
        ].join(','),
        sort: 'cited_by_count:desc',
        'per-page': '25',
        select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships,concepts',
        mailto: 'bsdetector@tool.io',
      })

      const res = await fetch(BASE + '/works?' + params)
      if (!res.ok) continue
      const d = await res.json()
      const results = (d.results || []).map(formatWork).filter(w => w.abstract && w.abstract.length > 200)
      if (!results.length) continue

      // Pick deterministically by day seed
      return results[daySeed % results.length]
    } catch { continue }
  }

  // Fallback: concept-based search
  try {
    const params = new URLSearchParams({
      filter: [
        'concepts.id:' + domain.conceptId,
        'publication_year:>' + fromYear,
        'cited_by_count:>' + minCitations,
        'has_abstract:true',
        'type:article',
      ].join(','),
      sort: 'cited_by_count:desc',
      'per-page': '20',
      select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships,concepts',
      mailto: 'bsdetector@tool.io',
    })

    const res = await fetch(BASE + '/works?' + params)
    if (!res.ok) return null
    const d = await res.json()
    const results = (d.results || []).map(formatWork).filter(w => w.abstract && w.abstract.length > 200)
    if (!results.length) return null
    return results[daySeed % results.length]
  } catch { return null }
}

// ── Evidence search — domain-anchored ─────────────────────────────────────
// Combines semantic search WITH concept filtering to stay on-topic
export async function searchWithinDomain(query, domainKey, limit = 5) {
  const domain = CORE_DOMAINS[domainKey]
  if (!domain) return searchOpenAlex(query, limit)

  try {
    const params = new URLSearchParams({
      search: query,
      filter: [
        'concepts.id:' + domain.conceptId,
        'has_abstract:true',
        'type:article',
      ].join(','),
      sort: 'relevance_score:desc',
      'per-page': String(limit),
      select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships',
      mailto: 'bsdetector@tool.io',
    })

    const res = await fetch(BASE + '/works?' + params)
    if (!res.ok) return []
    const d = await res.json()
    return (d.results || []).map(w => ({ ...formatWork(w), db: 'OpenAlex' }))
  } catch { return [] }
}

// ── Standard search — fallback ─────────────────────────────────────────────
export async function searchOpenAlex(query, limit = 5) {
  try {
    const params = new URLSearchParams({
      search: query,
      filter: 'type:article,has_abstract:true',
      sort: 'relevance_score:desc',
      'per-page': String(limit),
      select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships',
      mailto: 'bsdetector@tool.io',
    })

    const res = await fetch(BASE + '/works?' + params)
    if (!res.ok) return []
    const d = await res.json()
    return (d.results || []).map(w => ({ ...formatWork(w), db: 'OpenAlex' }))
  } catch { return [] }
}

// ── Concept explorer ───────────────────────────────────────────────────────
export async function getChildConcepts(parentId) {
  try {
    const params = new URLSearchParams({
      filter: 'ancestors.id:' + parentId,
      sort: 'cited_by_count:desc',
      'per-page': '20',
      select: 'id,display_name,description,works_count,cited_by_count,level',
      mailto: 'bsdetector@tool.io',
    })

    const res = await fetch(BASE + '/concepts?' + params)
    if (!res.ok) return []
    const d = await res.json()
    return (d.results || [])
      .filter(c => c.works_count > 500 && c.display_name && c.display_name.length < 60)
      .slice(0, 16)
      .map(c => ({
        id: (c.id || '').replace('https://openalex.org/', ''),
        fullId: c.id,
        label: c.display_name,
        description: c.description || null,
        worksCount: c.works_count,
        citedByCount: c.cited_by_count,
        level: c.level,
      }))
  } catch { return [] }
}

export async function getConceptWithPapers(conceptId) {
  const shortId = conceptId.startsWith('https://') ? conceptId.split('/').pop() : conceptId
  try {
    const params = new URLSearchParams({
      filter: 'concepts.id:' + shortId + ',type:article,has_abstract:true',
      sort: 'cited_by_count:desc',
      'per-page': '6',
      select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships',
      mailto: 'bsdetector@tool.io',
    })
    const res = await fetch(BASE + '/works?' + params)
    const d = res.ok ? await res.json() : { results: [] }
    return (d.results || []).map(w => ({ ...formatWork(w), db: 'OpenAlex' }))
  } catch { return [] }
}
