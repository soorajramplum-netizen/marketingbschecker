// pages/explore.js
import { useState, useCallback } from 'react'
import Layout from '../components/Layout'
import styles from './explore.module.css'

const ROOT_CONCEPTS = [
  { id: 'C17744445',    label: 'Marketing',           emoji: '📢', color: '#00c896', description: 'The science of connecting products with people' },
  { id: 'C2780468801', label: 'Consumer Behavior',    emoji: '🧠', color: '#a78bfa', description: 'Why people buy what they buy' },
  { id: 'C2993193',    label: 'Behavioral Economics', emoji: '⚖️', color: '#f0a500', description: 'How psychology shapes economic decisions' },
  { id: 'C111472728',  label: 'Social Psychology',    emoji: '👥', color: '#60a5fa', description: 'How people influence each other' },
  { id: 'C127413603',  label: 'Advertising',          emoji: '📺', color: '#f472b6', description: 'The art and science of persuasive communication' },
  { id: 'C2778717582', label: 'Digital Marketing',    emoji: '💻', color: '#34d399', description: 'Marketing in the age of the internet' },
  { id: 'C36289849',   label: 'Decision Making',      emoji: '🎯', color: '#fb923c', description: 'How humans choose between options' },
  { id: 'C2779209822', label: 'Consumer Psychology',  emoji: '🔬', color: '#e879f9', description: 'The mind of the buyer under the microscope' },
]

const LEVEL_META = {
  beginner:     { label: 'Beginner friendly', color: '#00c896' },
  intermediate: { label: 'Some background helpful', color: '#f0a500' },
  advanced:     { label: 'Advanced', color: '#f87171' },
}

function formatCount(n) {
  if (!n) return '0'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return n.toString()
}

async function fetchExplanation(conceptId, conceptLabel, conceptDescription) {
  const res = await fetch('/api/concepts/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conceptId, conceptLabel, conceptDescription }),
  })
  const d = await res.json()
  if (d.error) throw new Error(d.error)
  return d
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RootCard({ concept, isSelected, onClick }) {
  return (
    <button
      className={`${styles.rootCard} ${isSelected ? styles.rootCardSelected : ''}`}
      style={{ '--card-color': concept.color }}
      onClick={() => onClick(concept)}
    >
      <span className={styles.rootEmoji}>{concept.emoji}</span>
      <div className={styles.rootLabel}>{concept.label}</div>
      <div className={styles.rootDesc}>{concept.description}</div>
    </button>
  )
}

function ExplainerPanel({ explanation, papers, conceptLabel, loading, error }) {
  const [activeTab, setActiveTab] = useState('explain')

  if (loading) return (
    <div className={styles.explainerLoading}>
      <div className={styles.loadingPulse}>
        <div className={styles.loadingDot} />
        <div className={styles.loadingDot} />
        <div className={styles.loadingDot} />
      </div>
      <p className={styles.loadingText}>Gemini is reading the research and simplifying it for you…</p>
    </div>
  )

  if (error) return <div className={styles.explainerError}>Failed to load: {error}</div>
  if (!explanation) return null

  const lm = LEVEL_META[explanation.level] || LEVEL_META.intermediate

  return (
    <div className={styles.explainerPanel}>
      <div className={styles.explainerHeader}>
        <div className={styles.explainerTitle}>{conceptLabel}</div>
        <span className={styles.levelBadge} style={{ color: lm.color, borderColor: lm.color + '40', background: lm.color + '12' }}>
          {lm.label}
        </span>
      </div>

      <div className={styles.oneSentence}>&ldquo;{explanation.one_sentence_definition}&rdquo;</div>

      <div className={styles.tabs}>
        {[
          { id: 'explain', label: 'Explain it' },
          { id: 'examples', label: 'Real examples' },
          { id: 'papers', label: `Papers (${papers?.length || 0})` },
        ].map(t => (
          <button key={t.id} className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'explain' && (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>What is it?</div>
            <p className={styles.sectionText}>{explanation.what_is_it}</p>
          </div>

          <div className={styles.analogyBlock}>
            <div className={styles.analogyIcon}>💡</div>
            <div>
              <div className={styles.analogyLabel}>Think of it this way</div>
              <p className={styles.analogyText}>{explanation.simple_analogy}</p>
            </div>
          </div>

          <div className={styles.keyInsight}>
            <div className={styles.keyInsightLabel}>The key insight</div>
            <p className={styles.keyInsightText}>{explanation.the_key_insight}</p>
          </div>

          <div className={styles.misconceptionBlock}>
            <div className={styles.misconceptionTop}>
              <span className={styles.misconceptionIcon}>✕</span>
              <div className={styles.misconceptionLabel}>Common misconception</div>
            </div>
            <p className={styles.misconceptionText}>{explanation.common_misconception}</p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Why marketers care</div>
            <p className={styles.sectionText}>{explanation.why_marketers_care}</p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>In your day-to-day work</div>
            <p className={styles.sectionText}>{explanation.how_it_connects_to_marketing}</p>
          </div>

          {explanation.related_concepts?.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Learn next</div>
              <div className={styles.relatedTags}>
                {explanation.related_concepts.map(c => <span key={c} className={styles.relatedTag}>{c}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'examples' && (
        <div className={styles.tabContent}>
          <p className={styles.papersIntro}>These are real situations where this concept is at play — you&apos;ve probably experienced all of them.</p>
          {(explanation.real_world_examples || []).map((ex, i) => (
            <div key={i} className={styles.exampleItem}>
              <div className={styles.exampleNum}>{i + 1}</div>
              <p className={styles.exampleText}>{ex}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'papers' && (
        <div className={styles.tabContent}>
          <p className={styles.papersIntro}>Most-cited academic papers on this topic. Click DOI to read the original.</p>
          {!(papers?.length) ? (
            <p className={styles.noPapers}>No papers retrieved.</p>
          ) : papers.map((p, i) => (
            <div key={i} className={styles.paperRow}>
              <div className={styles.paperRank}>{i + 1}</div>
              <div className={styles.paperContent}>
                <div className={styles.paperTitle}>{p.title}</div>
                <div className={styles.paperMeta}>
                  {p.authors?.length > 0 && <span>{p.authors.join(', ')}</span>}
                  <span>·</span><span>{p.year}</span>
                  {p.journal && <><span>·</span><span>{p.journal}</span></>}
                  <span>·</span><span>{p.citations?.toLocaleString()} citations</span>
                  {p.doi && (
                    <a href={`https://doi.org/${p.doi.replace('https://doi.org/', '')}`} target="_blank" rel="noreferrer" className={styles.doiLink}>
                      Read ↗
                    </a>
                  )}
                </div>
                {p.abstract && <p className={styles.paperAbstract}>{p.abstract.substring(0, 220)}…</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Explore() {
  const [selectedRoot, setSelectedRoot]     = useState(null)
  const [subConcepts, setSubConcepts]       = useState([])
  const [subLoading, setSubLoading]         = useState(false)
  const [selectedSub, setSelectedSub]       = useState(null)
  const [explanation, setExplanation]       = useState(null)
  const [papers, setPapers]                 = useState([])
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError]     = useState(null)

  const loadExplanation = useCallback(async (id, label, description) => {
    setExplainLoading(true)
    setExplainError(null)
    setExplanation(null)
    setPapers([])
    try {
      const d = await fetchExplanation(id, label, description)
      setExplanation(d.explanation)
      setPapers(d.papers || [])
    } catch (e) {
      setExplainError(e.message)
    } finally {
      setExplainLoading(false)
    }
  }, [])

  const handleRootClick = useCallback(async (concept) => {
    if (selectedRoot?.id === concept.id) return
    setSelectedRoot(concept)
    setSelectedSub(null)
    setSubConcepts([])
    setSubLoading(true)

    // Fetch children + explanation in parallel
    const [childrenRes] = await Promise.all([
      fetch(`/api/concepts/tree?parentId=${concept.id}`).then(r => r.json()).catch(() => ({ concepts: [] })),
      loadExplanation(concept.id, concept.label, concept.description),
    ])
    setSubConcepts(childrenRes.concepts || [])
    setSubLoading(false)
  }, [selectedRoot, loadExplanation])

  const handleSubClick = useCallback(async (concept) => {
    if (selectedSub?.id === concept.id) return
    setSelectedSub(concept)
    loadExplanation(concept.id, concept.label, concept.description)
  }, [selectedSub, loadExplanation])

  const handleRootOverview = useCallback(() => {
    if (!selectedRoot) return
    setSelectedSub(null)
    loadExplanation(selectedRoot.id, selectedRoot.label, selectedRoot.description)
  }, [selectedRoot, loadExplanation])

  return (
    <Layout title="Concept Explorer — Marketing BS Detector">
      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          65,000+ academic concepts · Simplified by Gemini
        </div>
        <h1 className={styles.title}>Concept <em>explorer</em></h1>
        <p className={styles.subtitle}>
          Browse the academic map of marketing science. Pick any concept and Gemini will explain it
          in plain English — with real examples you&apos;ll actually recognise.
        </p>
      </section>

      <div className={styles.rootGrid}>
        {ROOT_CONCEPTS.map(c => (
          <RootCard key={c.id} concept={c} isSelected={selectedRoot?.id === c.id} onClick={handleRootClick} />
        ))}
      </div>

      {selectedRoot && (
        <div className={styles.explorerArea}>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbRoot} style={{ color: selectedRoot.color }}>
              {selectedRoot.emoji} {selectedRoot.label}
            </span>
            {selectedSub && (
              <><span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbSub}>{selectedSub.label}</span></>
            )}
          </div>

          <div className={styles.explorerLayout}>
            <div className={styles.subConceptsPane}>
              <div className={styles.subPaneLabel}>Sub-topics</div>
              {subLoading ? (
                <div className={styles.subLoading}>Loading topics…</div>
              ) : (
                <div className={styles.chipsList}>
                  <button
                    className={`${styles.chip} ${!selectedSub ? styles.chipSelected : ''}`}
                    style={{ '--chip-color': selectedRoot.color }}
                    onClick={handleRootOverview}
                  >
                    <span className={styles.chipLabel}>Overview: {selectedRoot.label}</span>
                    <span className={styles.chipCount}>root topic</span>
                  </button>
                  {subConcepts.map(sc => (
                    <button
                      key={sc.id}
                      className={`${styles.chip} ${selectedSub?.id === sc.id ? styles.chipSelected : ''}`}
                      style={{ '--chip-color': selectedRoot.color }}
                      onClick={() => handleSubClick(sc)}
                    >
                      <span className={styles.chipLabel}>{sc.label}</span>
                      <span className={styles.chipCount}>{formatCount(sc.worksCount)} papers</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.explainerPane}>
              {!explanation && !explainLoading && !explainError ? (
                <div className={styles.explainerEmpty}>
                  <div className={styles.emptyGlyph}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <circle cx="24" cy="24" r="22" stroke="rgba(0,200,150,0.2)" strokeWidth="1"/>
                      <circle cx="24" cy="24" r="14" stroke="rgba(0,200,150,0.12)" strokeWidth="1"/>
                      <circle cx="24" cy="24" r="3" fill="rgba(0,200,150,0.4)"/>
                    </svg>
                  </div>
                  <p>Select a sub-topic to get a plain-English explanation</p>
                </div>
              ) : (
                <ExplainerPanel
                  explanation={explanation}
                  papers={papers}
                  conceptLabel={selectedSub?.label || selectedRoot?.label}
                  loading={explainLoading}
                  error={explainError}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedRoot && (
        <div className={styles.emptyState}>
          <p>Choose a field above to start exploring</p>
        </div>
      )}
    </Layout>
  )
}
