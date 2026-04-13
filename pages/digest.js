// pages/digest.js
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import styles from './digest.module.css'

const FIELD_COLORS = {
  'Marketing':           { accent: '#00c896', bg: 'rgba(0,200,150,0.08)',  border: 'rgba(0,200,150,0.2)'  },
  'Consumer Behavior':   { accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  'Behavioral Economics':{ accent: '#f0a500', bg: 'rgba(240,165,0,0.08)',  border: 'rgba(240,165,0,0.2)'  },
}

const CONFIDENCE_META = {
  strong:      { label: 'Strong evidence', color: '#00c896' },
  moderate:    { label: 'Moderate evidence', color: '#f0a500' },
  preliminary: { label: 'Preliminary', color: '#a78bfa' },
}

function ComplexityDots({ score }) {
  return (
    <div className={styles.complexityDots}>
      {[1,2,3,4,5].map(n => (
        <div key={n} className={`${styles.dot} ${n <= score ? styles.dotFilled : ''}`} />
      ))}
      <span className={styles.complexityLabel}>complexity</span>
    </div>
  )
}

function InsightCard({ insight, index }) {
  const [expanded, setExpanded] = useState(false)
  const fc = FIELD_COLORS[insight.field] || FIELD_COLORS['Marketing']
  const cm = CONFIDENCE_META[insight.confidence_level] || CONFIDENCE_META['moderate']

  return (
    <article className={styles.card} style={{ '--accent': fc.accent, '--card-bg': fc.bg, '--card-border': fc.border }}>
      {/* field pill + confidence */}
      <div className={styles.cardTop}>
        <span className={styles.fieldPill} style={{ background: fc.bg, color: fc.accent, borderColor: fc.border }}>
          {insight.field}
        </span>
        <div className={styles.confidenceTag}>
          <div className={styles.confidenceDot} style={{ background: cm.color }} />
          <span style={{ color: cm.color }}>{cm.label}</span>
        </div>
      </div>

      {/* one-liner */}
      <div className={styles.oneLiner}>{insight.one_line_summary}</div>

      {/* headline */}
      <h2 className={styles.headline}>{insight.headline}</h2>

      {/* the finding — the star */}
      <div className={styles.findingBlock}>
        <div className={styles.findingLabel}>What they found</div>
        <p className={styles.findingText}>{insight.the_finding}</p>
      </div>

      {/* why it matters */}
      <div className={styles.whyBlock}>
        <span className={styles.whyIcon}>→</span>
        <p className={styles.whyText}>{insight.why_it_matters}</p>
      </div>

      {/* myth buster */}
      {insight.the_myth_it_busts && (
        <div className={styles.mythBlock}>
          <span className={styles.mythIcon}>✕</span>
          <div>
            <div className={styles.mythLabel}>Myth busted</div>
            <p className={styles.mythText}>{insight.the_myth_it_busts}</p>
          </div>
        </div>
      )}

      {/* real world example */}
      <div className={styles.exampleBlock}>
        <div className={styles.exampleLabel}>In practice</div>
        <p className={styles.exampleText}>{insight.real_world_example}</p>
      </div>

      {/* complexity */}
      <ComplexityDots score={insight.complexity_score} />

      {/* paper details — expandable */}
      <button className={styles.sourceToggle} onClick={() => setExpanded(!expanded)}>
        <span>Source paper</span>
        <span className={`${styles.toggleChevron} ${expanded ? styles.open : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className={styles.sourceBlock}>
          <div className={styles.paperTitle}>{insight.paper.title}</div>
          <div className={styles.paperMeta}>
            {insight.paper.authors?.length > 0 && (
              <span>{insight.paper.authors.join(', ')}</span>
            )}
            <span>·</span>
            <span>{insight.paper.journal || 'Academic journal'}</span>
            <span>·</span>
            <span>{insight.paper.year}</span>
            <span>·</span>
            <span>{insight.paper.citations?.toLocaleString()} citations</span>
          </div>
          {insight.paper.concepts?.length > 0 && (
            <div className={styles.conceptTags}>
              {insight.paper.concepts.map(c => (
                <span key={c} className={styles.conceptTag}>{c}</span>
              ))}
            </div>
          )}
          {insight.paper.doiUrl && (
            <a href={insight.paper.doiUrl} target="_blank" rel="noreferrer" className={styles.doiLink}>
              Read paper ↗
            </a>
          )}
        </div>
      )}
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonLine} style={{ width: '30%', height: 20, marginBottom: 16 }} />
      <div className={styles.skeletonLine} style={{ width: '85%', height: 28, marginBottom: 8 }} />
      <div className={styles.skeletonLine} style={{ width: '60%', height: 28, marginBottom: 24 }} />
      <div className={styles.skeletonLine} style={{ width: '100%', height: 80, marginBottom: 12 }} />
      <div className={styles.skeletonLine} style={{ width: '90%', height: 20, marginBottom: 8 }} />
      <div className={styles.skeletonLine} style={{ width: '75%', height: 20 }} />
    </div>
  )
}

export default function Digest() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/daily')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout title="Daily Digest — Marketing BS Detector">
      {/* header */}
      <section className={styles.hero}>
        <div className={styles.dateLine}>
          {data?.dateLabel || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <h1 className={styles.title}>
          Daily research<br /><em>digest</em>
        </h1>
        <p className={styles.subtitle}>
          One finding from each field — marketing science, consumer behavior, behavioral economics.
          Pulled from peer-reviewed journals. Explained like you&apos;re a human, not a PhD student.
        </p>
        <div className={styles.refreshNote}>
          <span className={styles.refreshDot} />
          Updates daily · Sourced from OpenAlex · Simplified by Gemini AI
        </div>
      </section>

      {/* connector insight */}
      {data?.connector && (
        <div className={styles.connectorBlock}>
          <div className={styles.connectorLabel}>Today&apos;s thread</div>
          <p className={styles.connectorText}>{data.connector}</p>
        </div>
      )}

      {/* cards */}
      <div className={styles.cardsGrid}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <div className={styles.errorBlock}>
            Failed to load today&apos;s digest: {error}
          </div>
        ) : (
          data?.insights?.map((insight, i) => (
            <InsightCard key={i} insight={insight} index={i} />
          ))
        )}
      </div>

      {/* footer note */}
      {!loading && !error && (
        <div className={styles.footerNote}>
          <div className={styles.footerNoteInner}>
            <div className={styles.footerNoteTitle}>How this works</div>
            <p>Every day, we pull recent high-citation papers from OpenAlex across three fields. Gemini reads the abstract and rewrites the core finding in plain language — no copy-paste, no jargon. The source paper is always linked so you can verify.</p>
          </div>
        </div>
      )}
    </Layout>
  )
}
