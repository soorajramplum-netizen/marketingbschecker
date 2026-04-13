// lib/concepts.js
// OpenAlex concept tree fetching — shared between API routes

const BASE = 'https://api.openalex.org'

export const ROOT_CONCEPTS = [
  { id: 'C17744445',    label: 'Marketing',           emoji: '📢', color: '#00c896', description: 'The science of connecting products with people' },
  { id: 'C2780468801', label: 'Consumer Behavior',    emoji: '🧠', color: '#a78bfa', description: 'Why people buy what they buy' },
  { id: 'C2993193',    label: 'Behavioral Economics', emoji: '⚖️', color: '#f0a500', description: 'How psychology shapes economic decisions' },
  { id: 'C111472728',  label: 'Social Psychology',    emoji: '👥', color: '#60a5fa', description: 'How people influence each other' },
  { id: 'C127413603',  label: 'Advertising',          emoji: '📺', color: '#f472b6', description: 'The art and science of persuasive communication' },
  { id: 'C2778717582', label: 'Digital Marketing',    emoji: '💻', color: '#34d399', description: 'Marketing in the age of the internet' },
  { id: 'C36289849',   label: 'Decision Making',      emoji: '🎯', color: '#fb923c', description: 'How humans choose between options' },
  { id: 'C2779209822', label: 'Consumer Psychology',  emoji: '🔬', color: '#e879f9', description: 'The mind of the buyer under the microscope' },
]

export async function getChildConcepts(parentId) {
  const params = new URLSearchParams({
    filter: `ancestors.id:${parentId}`,
    sort: 'cited_by_count:desc',
    'per-page': '20',
    select: 'id,display_name,description,works_count,cited_by_count,level',
    mailto: 'bsdetector@tool.io',
  })

  const res = await fetch(`${BASE}/concepts?${params}`)
  if (!res.ok) return []
  const d = await res.json()

  return (d.results || [])
    .filter(c => c.works_count > 500 && c.display_name && c.display_name.length < 60)
    .slice(0, 16)
    .map(c => ({
      id: c.id?.replace('https://openalex.org/', '') || c.id,
      fullId: c.id,
      label: c.display_name,
      description: c.description || null,
      worksCount: c.works_count,
      citedByCount: c.cited_by_count,
      level: c.level,
    }))
}

export async function getConceptWithPapers(conceptId) {
  const shortId = conceptId.startsWith('https://') ? conceptId.split('/').pop() : conceptId

  const papersParams = new URLSearchParams({
    filter: `concepts.id:${shortId},type:article,has_abstract:true`,
    sort: 'cited_by_count:desc',
    'per-page': '6',
    select: 'id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships',
    mailto: 'bsdetector@tool.io',
  })

  const papersRes = await fetch(`${BASE}/works?${papersParams}`)
  const papersData = papersRes.ok ? await papersRes.json() : { results: [] }

  return (papersData.results || []).map(w => ({
    id: w.id,
    title: w.title || '',
    year: w.publication_year,
    doi: w.doi,
    citations: w.cited_by_count || 0,
    journal: w.primary_location?.source?.display_name || '',
    authors: (w.authorships || []).slice(0, 3).map(a => a.author?.display_name).filter(Boolean),
    abstract: reconstructAbstract(w.abstract_inverted_index),
  }))
}

function reconstructAbstract(inv) {
  if (!inv) return ''
  const words = []
  for (const [word, positions] of Object.entries(inv))
    for (const pos of positions) words[pos] = word
  return words.filter(Boolean).join(' ').substring(0, 800)
}
