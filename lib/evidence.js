// lib/evidence.js
// Evidence retrieval across OpenAlex, PubMed, CORE

function reconstructAbstract(inv) {
  if (!inv) return ''
  const words = []
  for (const [word, positions] of Object.entries(inv))
    for (const pos of positions) words[pos] = word
  return words.filter(Boolean).join(' ').substring(0, 500)
}

export async function searchOpenAlex(query, limit = 5, apiKey = '') {
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&filter=type:article&select=id,title,publication_year,doi,abstract_inverted_index,cited_by_count,primary_location&mailto=bsdetector@tool.io`
    const res = await fetch(url)
    if (!res.ok) return []
    const d = await res.json()
    return (d.results || []).map(w => ({
      id: w.id, title: w.title || '', year: w.publication_year,
      doi: w.doi, citations: w.cited_by_count || 0,
      source: w.primary_location?.source?.display_name || '',
      abstract: reconstructAbstract(w.abstract_inverted_index),
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
      return { id: 'pmid:' + id, title: r.title || '', year: parseInt(r.pubdate) || 0,
               doi: r.elocationid || '', citations: 0, source: r.fulljournalname || r.source || '',
               abstract: '', db: 'PubMed' }
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
      abstract: (r.abstract || '').substring(0, 400), db: 'CORE',
    }))
  } catch { return [] }
}

export async function gatherEvidence(claim) {
  const queries = claim.searchQueries || [claim.text]
  let papers = []
  for (let i = 0; i < Math.min(queries.length, 3); i++) {
    const q = queries[i]
    const [oa, pm] = await Promise.all([
      searchOpenAlex(q, i === 0 ? 5 : 3),
      i === 0 ? searchPubMed(q, 3) : Promise.resolve([]),
    ])
    papers.push(...oa, ...pm)
    if (papers.length >= 7) break
  }
  if (papers.length < 3) {
    const core = await searchCORE(queries[0], 4)
    papers.push(...core)
  }
  const seen = new Set()
  return papers.filter(p => {
    const key = p.title.toLowerCase().substring(0, 50)
    if (seen.has(key) || !p.title) return false
    seen.add(key); return true
  }).slice(0, 6)
}
