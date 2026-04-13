// components/ClaimCard.js
import { useState } from 'react'
import styles from './ClaimCard.module.css'

const VERDICT_META = {
  'well-supported':     { label: 'Well supported',      cls: 'supported' },
  'partially-supported':{ label: 'Partially supported', cls: 'partial' },
  'contested':          { label: 'Contested',            cls: 'contested' },
  'unsupported':        { label: 'Unsupported',          cls: 'unsupported' },
  'contradicted':       { label: 'Contradicted',         cls: 'contradicted' },
}

const QUALITY_WIDTH = { high: 90, moderate: 55, low: 22, none: 6 }
const QUALITY_COLOR = {
  high:     'var(--c-supported)',
  moderate: 'var(--c-partial)',
  low:      'var(--c-contradicted)',
  none:     'var(--text-faint)',
}

export default function ClaimCard({ result, index }) {
  const [open, setOpen] = useState(false)
  const { claim, verdict, papers } = result
  const vm = VERDICT_META[verdict?.verdict] || VERDICT_META['unsupported']
  const dbs = ['OpenAlex', 'PubMed', 'CORE']
  const hitDBs = new Set((papers || []).map(p => p.db))
  const qw = QUALITY_WIDTH[verdict?.evidenceQuality] || 6
  const qc = QUALITY_COLOR[verdict?.evidenceQuality] || 'var(--text-faint)'
  const knownBodies = verdict?.knownResearchBodies || []

  return (
    <div className={styles.card}>
      <div
        className={styles.header}
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setOpen(!open)}
      >
        <div className={styles.index}>{index + 1}</div>
        <div className={styles.main}>
          <div className={styles.claimText}>{claim.text}</div>
          <div className={styles.chips}>
            <span className={styles.typeChip}>{claim.type}</span>
            <span className={styles.typeChip}>{verdict?.evidenceQuality || 'unknown'} evidence</span>
            <span className={styles.typeChip}>{verdict?.confidence || 0}% confidence</span>
          </div>
        </div>
        <div className={`${styles.verdictTag} ${styles[vm.cls]}`}>{vm.label}</div>
        <div className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>&#9662;</div>
      </div>

      {open && (
        <div className={styles.body}>
          <div className={styles.bodyDivider} />

          <div className={styles.barRow}>
            <span className={styles.barLabel}>Evidence quality</span>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: qw + '%', background: qc }} />
            </div>
            <span className={styles.barVal}>{verdict?.evidenceQuality || 'none'}</span>
          </div>

          <div className={styles.barRow} style={{ marginBottom: '1.25rem' }}>
            <span className={styles.barLabel}>Confidence</span>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: (verdict?.confidence || 0) + '%', background: 'var(--green)' }} />
            </div>
            <span className={styles.barVal}>{verdict?.confidence || 0}%</span>
          </div>

          {knownBodies.length > 0 && (
            <div className={styles.researchBodies}>
              <span className={styles.rbLabel}>Known research:</span>
              {knownBodies.map(b => (
                <span key={b} className={styles.rbTag}>{b}</span>
              ))}
            </div>
          )}

          <blockquote className={styles.synthesis}>
            {verdict?.summary || 'No synthesis available.'}
          </blockquote>

          {verdict?.generalizabilityWarning && (
            <div className={styles.warnBox}>
              <span className={styles.warnIcon}>&#9888;</span>
              <span><strong>Generalizability:</strong> {verdict.generalizabilityWarning}</span>
            </div>
          )}

          {(verdict?.caveats || []).length > 0 && (
            <div className={styles.caveatsBlock}>
              <div className={styles.blockLabel}>Caveats &amp; limitations</div>
              {verdict.caveats.map((c, i) => (
                <div key={i} className={styles.caveat}>&#8212; {c}</div>
              ))}
            </div>
          )}

          <div className={styles.dbRow}>
            {dbs.map(db => (
              <span key={db} className={`${styles.dbTag} ${hitDBs.has(db) ? styles.dbHit : styles.dbMiss}`}>
                {db}
              </span>
            ))}
          </div>

          <div className={styles.papersSection}>
            <div className={styles.blockLabel}>Retrieved papers ({(papers || []).length})</div>

            {(papers || []).length > 0 ? (
              papers.slice(0, 8).map((p, pi) => {
                const assessment = verdict?.paperAssessments?.find(a => a.index === pi + 1)
                const doiClean = p.doi?.replace('https://doi.org/', '')
                return (
                  <div key={pi} className={styles.paperRow}>
                    <div className={styles.relScore}>{assessment?.relevance || 0}</div>
                    <div className={styles.paperContent}>
                      <div className={styles.paperTitle}>
                        {p.title.substring(0, 130)}{p.title.length > 130 ? '...' : ''}
                      </div>
                      <div className={styles.paperMeta}>
                        <span>{p.year || 'n/a'}</span>
                        <span>&#183;</span>
                        <span>{p.source || p.db}</span>
                        {p.citations > 0 && (
                          <span>&#183; {p.citations.toLocaleString()} citations</span>
                        )}
                        {doiClean && (
                          <a href={'https://doi.org/' + doiClean} target="_blank" rel="noreferrer" className={styles.doiLink}>
                            DOI &#8599;
                          </a>
                        )}
                        {assessment && (
                          <span className={styles.stanceBadge + ' ' + (styles['stance_' + assessment.stance] || '')}>
                            {assessment.stance}
                          </span>
                        )}
                      </div>
                      {assessment?.note && (
                        <div className={styles.paperNote}>{assessment.note}</div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className={styles.noPapers}>
                No peer-reviewed papers retrieved. The AI verdict uses expert field knowledge to
                assess this claim — including practitioner research like IPA, Ehrenberg-Bass, and
                Binet &amp; Field. Absence of retrieved papers is not absence of evidence.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
