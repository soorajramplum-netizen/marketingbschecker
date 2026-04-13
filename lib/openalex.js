// lib/openalex.js
// Rich OpenAlex API client — goes beyond search into discovery

const BASE = 'https://api.openalex.org'
const MAILTO = 'mailto=bsdetector@tool.io'

// Field concept IDs in OpenAlex for our core domains
export const FIELD_CONCEPTS = {
  marketing: 'C17744445',
  consumer_behavior: 'C2780468801',
  behavioral_economics: 'C2993193',
  social_psychology: 'C111472728',
  advertising: 'C127413603',
  brand_management: 'C2780473472',
  consumer_psychology: 'C2779209822',
  persuasion: 'C2780371682',
  decision_making: 'C36289849',
  digital_marketing: 'C2778717582',
}

export const FIELD_LABELS = {
  marketing: 'Marketing',
  consumer_behavior: 'Consumer Behavior',
  behavioral_economics: 'Behavioral Economics',
  social_psychology: 'Social Psychology',
  advertising: 'Advertising',
  brand_management: 'Brand Management',
  consumer_psychology: 'Consumer Psychology',
  persuasion: 'Persuasion Science',
  decision_making: 'Decision Science',
  digital_marketing: 'Digital Marketing',
}

// Top marketing/consumer research journals by OpenAlex source ID
export const TOP_JOURNALS = {
  'Journal of Marketing': 'S170285963',
  'Journal of Consumer Research': 'S167974482',
  'Journal of Marketing Research': 'S91658814',
  'Journal of the Academy of Marketing Science': 'S2764493692',
  'Journal of Consumer Psychology': 'S35775959',
  'Marketing Science': 'S2764455558',
  'Journal of Retailing': 'S2764516530',
  'Organizational Behavior and Human Decision Processes': 'S2764461616',
}

/**
 * Fetch the latest high-impact papers from a specific field
 * Sorted by citation count within recent years
 */
export async function getLatestPapersByField(fieldKey, options = {}) {
  const {
    limit = 5,
    fromYear = new Date().getFullYear() - 2,
    minCitations = 5,
  } = options

  const conceptId = FIELD_CONCEPTS[fieldKey]
  if (!conceptId) throw new Error(`Unknown field: ${fieldKey}`)

  const params = new URLSearchParams({
    filter: [
      `concepts.id:${conceptId}`,
      `publication_year:>${fromYear}`,
      `cited_by_count:>${minCitations}`,
      'type:article',
      'has_abstract:true',
    ].join(','),
    sort: 'cited_by_count:desc',
    'per-page': limit,
    select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships,concepts',
    [MAILTO]: '',
  })

  const res = await fetch(`${BASE}/works?${params}`)
  if (!res.ok) throw new Error(`OpenAlex error: ${res.status}`)
  const d = await res.json()
  return (d.results || []).map(formatWork)
}

/**
 * Fetch recent papers from top marketing journals specifically
 */
export async function getJournalPapers(journalName, options = {}) {
  const { limit = 5, fromYear = new Date().getFullYear() - 1 } = options
  const sourceId = TOP_JOURNALS[journalName]
  if (!sourceId) return []

  const params = new URLSearchParams({
    filter: [
      `primary_location.source.id:${sourceId}`,
      `publication_year:>${fromYear}`,
      'has_abstract:true',
    ].join(','),
    sort: 'cited_by_count:desc',
    'per-page': limit,
    select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships,concepts',
    [MAILTO]: '',
  })

  const res = await fetch(`${BASE}/works?${params}`)
  if (!res.ok) return []
  const d = await res.json()
  return (d.results || []).map(formatWork)
}

/**
 * Get a single random high-quality paper from a concept
 * Used for Daily Digest — rotates through fields
 */
export async function getDailyPaper(fieldKey, options = {}) {
  const { fromYear = new Date().getFullYear() - 3, minCitations = 20 } = options
  const conceptId = FIELD_CONCEPTS[fieldKey]
  if (!conceptId) return null

  // Use today's date as a deterministic seed for "daily" rotation
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const page = (seed % 8) + 1 // rotates through pages 1-8

  const params = new URLSearchParams({
    filter: [
      `concepts.id:${conceptId}`,
      `publication_year:>${fromYear}`,
      `cited_by_count:>${minCitations}`,
      'type:article',
      'has_abstract:true',
    ].join(','),
    sort: 'cited_by_count:desc',
    'per-page': 5,
    page,
    select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships,concepts',
    [MAILTO]: '',
  })

  const res = await fetch(`${BASE}/works?${params}`)
  if (!res.ok) return null
  const d = await res.json()
  const results = (d.results || []).map(formatWork).filter(w => w.abstract)
  if (!results.length) return null

  // Pick deterministically from results using seed
  return results[seed % results.length]
}

/**
 * Get trending concepts in marketing (what topics are rising)
 */
export async function getTrendingConcepts() {
  const params = new URLSearchParams({
    filter: `ancestors.id:${FIELD_CONCEPTS.marketing}`,
    sort: 'works_count:desc',
    'per-page': 20,
    select: 'id,display_name,works_count,cited_by_count,description',
    [MAILTO]: '',
  })

  const res = await fetch(`${BASE}/concepts?${params}`)
  if (!res.ok) return []
  const d = await res.json()
  return d.results || []
}

/**
 * Search papers — the existing search but richer
 */
export async function searchPapers(query, options = {}) {
  const { limit = 8, fromYear = null, minCitations = 0 } = options

  const filters = ['type:article', 'has_abstract:true']
  if (fromYear) filters.push(`publication_year:>${fromYear}`)
  if (minCitations > 0) filters.push(`cited_by_count:>${minCitations}`)

  const params = new URLSearchParams({
    search: query,
    filter: filters.join(','),
    sort: 'relevance_score:desc',
    'per-page': limit,
    select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships,concepts',
    [MAILTO]: '',
  })

  const res = await fetch(`${BASE}/works?${params}`)
  if (!res.ok) return []
  const d = await res.json()
  return (d.results || []).map(formatWork)
}

/**
 * Get a specific author's recent work
 */
export async function getAuthorPapers(authorId, limit = 5) {
  const params = new URLSearchParams({
    filter: `authorships.author.id:${authorId},type:article`,
    sort: 'publication_year:desc',
    'per-page': limit,
    select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location',
    [MAILTO]: '',
  })

  const res = await fetch(`${BASE}/works?${params}`)
  if (!res.ok) return []
  const d = await res.json()
  return (d.results || []).map(formatWork)
}

// ── helpers ──

function reconstructAbstract(inv) {
  if (!inv) return ''
  const words = []
  for (const [word, positions] of Object.entries(inv))
    for (const pos of positions) words[pos] = word
  return words.filter(Boolean).join(' ')
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
    openalexUrl: w.id,
    doiUrl: w.doi ? `https://doi.org/${w.doi.replace('https://doi.org/', '')}` : null,
  }
}
