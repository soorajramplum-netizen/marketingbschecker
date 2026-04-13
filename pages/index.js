// pages/index.js
import { useState, useRef } from 'react'
import Layout from '../components/Layout'
import ClaimCard from '../components/ClaimCard'
import styles from './index.module.css'

const LOG_STEPS = [
  { id: 'fetch',   label: 'Content received' },
  { id: 'extract', label: 'Extracting claims with Gemini' },
  { id: 'search',  label: 'Querying evidence databases' },
  { id: 'synth',   label: 'Synthesizing verdicts' },
]

export default function Home() {
  const [tab, setTab] = useState('text')
  const [inputText, setInputText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [logSteps, setLogSteps] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [usedModel, setUsedModel] = useState(null)
  const [summary, setSummary] = useState(null)
  const resultsRef = useRef(null)

  function updateStep(id, status, labelOverride) {
    setLogSteps(prev => prev.map(s => s.id === id ? { ...s, status, label: labelOverride || s.label } : s))
  }

  function initLog(firstStatus) {
    setLogSteps(LOG_STEPS.map((s, i) => ({
      ...s,
      status: i === 0 ? firstStatus : 'pending'
    })))
  }

  async function analyze() {
    setError(null)
    setResults(null)
    setLoading(true)

    let text = ''
    try {
      if (tab === 'url') {
        const url = urlInput.trim()
        if (!url) throw new Error('Please enter a URL.')
        initLog('active')
        const r = await fetch('/api/fetch-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
        const d = await r.json()
        if (d.error) throw new Error(d.error)
        text = d.text
        updateStep('fetch', 'done', 'URL content fetched')
      } else {
        text = inputText.trim()
        if (!text) throw new Error('Please paste some content to analyze.')
        initLog('done')
      }

      updateStep('extract', 'active', 'Extracting claims with Gemini…')
      const extRes = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const extData = await extRes.json()
      if (extData.error) throw new Error(extData.error)
      const { claims, contentSummary, model, provider, knownSource } = extData
      setUsedModel(provider ? `${model} · ${provider}` : model)
      setSummary(contentSummary)
      updateStep('extract', 'done', `${claims.length} claim${claims.length !== 1 ? 's' : ''} extracted${knownSource ? ' · ' + knownSource : ''} · ${model}`)

      if (!claims.length) {
        setError('No falsifiable claims found. The content may contain only opinions or vague assertions.')
        setLoading(false)
        return
      }

      updateStep('search', 'active', `Querying OpenAlex, PubMed, CORE for ${claims.length} claim${claims.length !== 1 ? 's' : ''}…`)
      updateStep('synth', 'active', 'Synthesizing verdicts…')

      const verdictResults = await Promise.all(
        claims.map(claim =>
          fetch('/api/verdict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claim, knownSource }) })
            .then(r => r.json())
            .then(d => ({ claim, ...d }))
        )
      )

      const totalPapers = verdictResults.reduce((a, r) => a + (r.papers?.length || 0), 0)
      updateStep('search', 'done', `${totalPapers} papers retrieved`)
      updateStep('synth', 'done', 'Analysis complete')
      setResults(verdictResults)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const score = results ? Math.round(
    results.reduce((acc, r) => {
      const map = { 'well-supported': 100, 'partially-supported': 78, 'contested': 50, 'unsupported': 20, 'contradicted': 0 }
      return acc + (map[r.verdict?.verdict] || 20)
    }, 0) / results.length
  ) : null

  return (
    <Layout>
      {/* hero */}
      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          Real-time · Peer-reviewed verification
        </div>
        <h1 className={styles.heroTitle}>
          Is that marketing claim<br />
          <em>actually</em> backed by science?
        </h1>
        <p className={styles.heroBody}>
          LinkedIn is full of confident-sounding marketing advice — presented as settled science.
          We extract specific claims and cross-reference them against <strong>200M+ peer-reviewed papers</strong> in
          marketing, consumer psychology, and behavioral economics.
        </p>
        <div className={styles.sourcePills}>
          {['OpenAlex', 'Semantic Scholar', 'PubMed', 'CORE.ac.uk', 'Gemini AI · 6-tier fallback'].map(s => (
            <span key={s} className={styles.pill}>{s}</span>
          ))}
        </div>
      </section>

      <div className={styles.divider} />

      {/* input panel */}
      <div className={styles.inputPanel}>
        <div className={styles.inputHeader}>
          <span className={styles.inputIcon}>⚡</span>
          <span className={styles.inputTitle}>Paste a LinkedIn post or marketing claim</span>
        </div>

        <div className={styles.tabRow}>
          <button className={`${styles.tab} ${tab === 'text' ? styles.tabActive : ''}`} onClick={() => setTab('text')}>Paste text</button>
          <button className={`${styles.tab} ${tab === 'url' ? styles.tabActive : ''}`} onClick={() => setTab('url')}>URL</button>
        </div>

        {tab === 'text' ? (
          <>
            <textarea
              className={styles.textarea}
              placeholder={'Example: "Studies show that companies using AI in marketing see a 400% increase in ROI. I personally grew my startup from $0 to $10M in 6 months just by leveraging personalization…"'}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
            <div className={styles.charCount}>{inputText.length.toLocaleString()} characters</div>
          </>
        ) : (
          <>
            <input
              type="text"
              className={styles.urlInput}
              placeholder="https://www.example.com/marketing-article"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
            />
            <p className={styles.urlNote}>LinkedIn requires text pasting (login wall). Public articles work directly.</p>
          </>
        )}

        <div className={styles.actionRow}>
          <div className={styles.modelBadge}>
            <span className={styles.modelDot} />
            Gemini · OpenAlex · PubMed · CORE
          </div>
          <button className={styles.btnPrimary} onClick={analyze} disabled={loading}>
            {loading ? (
              <><span className={styles.spinner} /> Analyzing…</>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{flexShrink:0}}>
                  <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 7.5h5M7.5 5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Detect the BS
              </>
            )}
          </button>
        </div>
      </div>

      {/* pipeline log */}
      {logSteps.length > 0 && (
        <div className={styles.pipelineLog}>
          <div className={styles.logHeading}>Pipeline</div>
          {logSteps.map(step => (
            <div key={step.id} className={styles.logStep}>
              <div className={`${styles.stepDot} ${styles['dot_' + step.status]}`}>
                {step.status === 'done' ? '✓' : step.status === 'fail' ? '✕' : '·'}
              </div>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className={styles.errorBlock}>{error}</div>}

      {/* results */}
      {results && (
        <div ref={resultsRef}>
          {/* score banner */}
          <div className={styles.scoreBanner}>
            <div className={styles.scoreCell}>
              <div className={styles.scoreCellLabel}>Credibility score</div>
              <div className={styles.scoreCellVal}>{score}<sup>/100</sup></div>
              <div className={styles.scoreCellSub}>across {results.length} claim{results.length !== 1 ? 's' : ''}</div>
            </div>
            <div className={styles.scoreCell}>
              <div className={styles.scoreCellLabel}>Well supported</div>
              <div className={styles.scoreCellVal}>
                {results.filter(r => r.verdict?.verdict === 'well-supported').length}
                <sup>/{results.length}</sup>
              </div>
              <div className={styles.scoreCellSub}>claims with strong evidence</div>
            </div>
            <div className={styles.scoreCell}>
              <div className={styles.scoreCellLabel}>Papers retrieved</div>
              <div className={styles.scoreCellVal}>{results.reduce((a, r) => a + (r.papers?.length || 0), 0)}</div>
              <div className={styles.scoreCellSub}>across all databases</div>
            </div>
          </div>

          <div className={styles.resultsMeta}>
            <div className={styles.resultsTitle}>
              {results.length} claim{results.length !== 1 ? 's' : ''} analyzed
              {summary ? ` · ${summary}` : ''}
            </div>
            {usedModel && <div className={styles.modelTag}>{usedModel}</div>}
          </div>

          {results.map((r, i) => (
            <ClaimCard key={r.claim?.id || i} result={r} index={i} />
          ))}
        </div>
      )}

      {/* empty state */}
      {!results && !loading && logSteps.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyGlyph}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="rgba(0,200,150,0.2)" strokeWidth="1"/>
              <circle cx="32" cy="32" r="20" stroke="rgba(0,200,150,0.15)" strokeWidth="1"/>
              <circle cx="32" cy="32" r="10" stroke="rgba(0,200,150,0.12)" strokeWidth="1"/>
              <circle cx="32" cy="32" r="3" fill="rgba(0,200,150,0.4)"/>
              <line x1="32" y1="2" x2="32" y2="10" stroke="rgba(0,200,150,0.3)" strokeWidth="1"/>
              <line x1="32" y1="54" x2="32" y2="62" stroke="rgba(0,200,150,0.3)" strokeWidth="1"/>
              <line x1="2" y1="32" x2="10" y2="32" stroke="rgba(0,200,150,0.3)" strokeWidth="1"/>
              <line x1="54" y1="32" x2="62" y2="32" stroke="rgba(0,200,150,0.3)" strokeWidth="1"/>
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>Cut through the marketing noise</h2>
          <p className={styles.emptyText}>
            Paste any LinkedIn post or marketing claim above. We&apos;ll check it
            against OpenAlex&apos;s database of 200M+ research papers in real-time
            and tell you what&apos;s real, what&apos;s exaggerated, and what&apos;s pure BS.
          </p>
          <div className={styles.emptyStats}>
            <div className={styles.emptyStat}><span>200M+</span>research papers</div>
            <div className={styles.emptyStatDiv} />
            <div className={styles.emptyStat}><span>4</span>databases</div>
            <div className={styles.emptyStatDiv} />
            <div className={styles.emptyStat}><span>6</span>AI model fallbacks</div>
          </div>
        </div>
      )}
    </Layout>
  )
}
