// lib/evidence.js
// Domain-anchored evidence retrieval — stays within our 4 core fields

import { searchWithinDomain, searchOpenAlex } from './openalex'

// Map claim types to the most relevant domain for anchored search
function inferDomain(claim) {
  const text = (claim.text + ' ' + (claim.type || '')).toLowerCase()

  if (text.match(/consumer|buyer|purchase|shopping|loyalty|satisfaction|attitude/))
    return 'consumer_psychology'
  if (text.match(/bias|heuristic|nudge|choice|decision|cognitive|anchor|framing|loss aversion/))
    return 'behavioral_science'
  if (text.match(/brand|advertising|campaign|creative|awareness|recall|media|digital|social media|email|roi|revenue/))
    return 'marketing'

  // Default: try marketing first
  return 'marketing'
}

async function searchPubMed(query, limit = 3) {
  try {
    const sr = await fetch(
      'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=' +
      encodeURIComponent(query + ' marketing consumer behavior') +
      '&retmax=' + limit + '&retmode=json'
    )
    const sd = await sr.json()
    const ids = sd.esearchresult?.idlist || []
    if (!ids.length) return []
    const su = await fetch(
      'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=' + ids.join(',') + '&retmode=json'
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

export async function gatherEvidence(claim) {
  const queries = claim.searchQueries || [claim.text]
  const primaryDomain = inferDomain(claim)
  let papers = []

  // Strategy:
  // 1. Domain-anchored search with primary query (most relevant)
  // 2. Broad search with secondary/tertiary queries
  // 3. PubMed for consumer psychology / behavioral science claims
  // 4. Try other domains if thin results

  // Step 1: Domain-anchored primary search
  if (queries[0]) {
    const domainPapers = await searchWithinDomain(queries[0], primaryDomain, 5)
    papers.push(...domainPapers)
  }

  // Step 2: Broad search with conceptual query
  if (queries[1] && papers.length < 6) {
    const broadPapers = await searchOpenAlex(queries[1], 4)
    papers.push(...broadPapers)
  }

  // Step 3: PubMed for behavioral/psychology claims
  if (papers.length < 4 && (primaryDomain === 'consumer_psychology' || primaryDomain === 'behavioral_science')) {
    const pubmedPapers = await searchPubMed(queries[0] || claim.text, 3)
    papers.push(...pubmedPapers)
  }

  // Step 4: Try other domains if still thin
  if (papers.length < 3 && queries[0]) {
    const otherDomains = ['marketing', 'consumer_psychology', 'behavioral_science'].filter(d => d !== primaryDomain)
    for (const domain of otherDomains) {
      if (papers.length >= 5) break
      const extra = await searchWithinDomain(queries[0], domain, 3)
      papers.push(...extra)
    }
  }

  // Step 5: Domain-level search with broad query if still thin
  if (papers.length < 3 && queries[2]) {
    const fallback = await searchOpenAlex(queries[2], 4)
    papers.push(...fallback)
  }

  // Deduplicate by title
  const seen = new Set()
  return papers.filter(p => {
    const key = p.title.toLowerCase().substring(0, 50)
    if (seen.has(key) || !p.title) return false
    seen.add(key)
    return true
  }).slice(0, 8)
}
