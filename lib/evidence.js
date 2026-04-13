// lib/evidence.js
// Evidence retrieval — OpenAlex, PubMed, CORE + semantic broadening

function reconstructAbstract(inv) {
  if (!inv) return ''
  const words = []
  for (const [word, positions] of Object.entries(inv))
    for (const pos of positions) words[pos] = word
  return words.filter(Boolean).join(' ').substring(0, 600)
}

// Known practitioner research bodies — the LLM knows these even if OpenAlex doesn't index them
export const PRACTITIONER_SOURCES = [
  'Binet & Field', 'IPA Effectiveness', 'Ehrenberg-Bass Institute',
  'Nielsen', 'McKinsey', 'WARC', 'Marketing Science Institute',
]

export async function searchOpenAlex(query, limit = 5) {
  try {
    // Search both title/abstract and add marketing filter for relevance
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&filter=type:article&select=id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location,authorships&mailto=bsdetector@tool.io`
    const res = await fetch(url)
    if (!res.ok) return []
    const d = await res.json()
    return (d.results || []).map(w => ({
      id: w.id, title: w.title || '', year: w.publication_year,
      doi: w.doi, citations: w.cited_by_count || 0,
      source: w.primary_location?.source?.display_name || '',
      abstract: reconstructAbstract(w.abstract_inverted_index),
      authors: (w.authorships || []).slice(0, 2).map(a => a.author?.display_name).filter(Boolean),
      db: 'OpenAlex',
    }))
  } catch { return [] }
}

export async function searchPubMed(query, limit = 4) {
  try {
    const sr = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${limit}&retmode=json`
    )
    const sd = await sr.json()
    const ids = sd.esearchresult?.idlist || []
    if (!ids.length) return []
    const su = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
    )
    const summ = await su.json()
    return ids.map(id => {
      const r = summ.result?.[id]
      if (!r) return null
      return {
        id: 'pmid:' + id, title: r.title || '', year: parseInt(r.pubdate) || 0,
        doi: r.elocationid || '', citations: 0,
        source: r.fulljournalname || r.source || '',
        abstract: '', authors: [], db: 'PubMed',
      }
    }).filter(Boolean)
  } catch { return [] }
}

export async function searchCORE(query, limit = 4) {
  try {
    const res = await fetch(`https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(query)}&limit=${limit}`)
    if (!res.ok) return []
    const d = await res.json()
    return (d.results || []).map(r => ({
      id: 'core:' + r.id, title: r.title || '', year: r.yearPublished || 0,
      doi: r.doi || '', citations: 0, source: r.publisher || '',
      abstract: (r.abstract || '').substring(0, 400), authors: [], db: 'CORE',
    }))
  } catch { return [] }
}

// Build smarter search queries from a claim
// Goes from specific → mechanism → domain
function buildSearchQueries(claim) {
  const queries = claim.searchQueries || []
  const base = claim.text || ''

  // Always include the raw claim text as first query
  const all = [base, ...queries].filter(Boolean)

  // Deduplicate
  const seen = new Set()
  return all.filter(q => {
    const key = q.toLowerCase().substring(0, 40)
    if (seen.has(key)) return false
    seen.add(key); return true
  }).slice(0, 4)
}

export async function gatherEvidence(claim) {
  const queries = buildSearchQueries(claim)
  let papers = []

  // First query: full parallel search
  if (queries[0]) {
    const [oa, pm] = await Promise.all([
      searchOpenAlex(queries[0], 5),
      searchPubMed(queries[0], 3),
    ])
    papers.push(...oa, ...pm)
  }

  // Subsequent queries: OpenAlex only, broader
  for (let i = 1; i < queries.length && papers.length < 8; i++) {
    const oa = await searchOpenAlex(queries[i], 3)
    papers.push(...oa)
  }

  // CORE fallback if thin results
  if (papers.length < 3 && queries[0]) {
    const core = await searchCORE(queries[0], 4)
    papers.push(...core)
  }

  // Deduplicate by title
  const seen = new Set()
  return papers.filter(p => {
    const key = p.title.toLowerCase().substring(0, 50)
    if (seen.has(key) || !p.title) return false
    seen.add(key); return true
  }).slice(0, 8) // increased from 6 to 8 for better coverage
}
