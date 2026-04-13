// pages/learn.js
// Phase 3 ready: learning module scaffold
import Layout from '../components/Layout'
import styles from './learn.module.css'

const MODULES = [
  {
    id: 'attention',
    category: 'Consumer Psychology',
    title: 'The attention myth',
    subtitle: 'What research actually says about human attention spans',
    status: 'available',
    lessons: 4,
    papers: 12,
    preview: 'The "8-second goldfish attention span" claim has been widely debunked. Here\'s what peer-reviewed research shows about attention in digital contexts.',
    tags: ['attention', 'cognitive load', 'digital behavior'],
  },
  {
    id: 'personalization',
    category: 'Marketing Effectiveness',
    title: 'Personalization & ROI',
    subtitle: 'Separating effect sizes from headline statistics',
    status: 'available',
    lessons: 5,
    papers: 18,
    preview: 'Personalization does improve outcomes — but the magnitude depends heavily on context, industry, and implementation. The "760% revenue lift" figure needs unpacking.',
    tags: ['personalization', 'ROI', 'email marketing'],
  },
  {
    id: 'social-proof',
    category: 'Behavioral Science',
    title: 'Social proof & conformity',
    subtitle: 'Cialdini\'s principles under the research microscope',
    status: 'available',
    lessons: 6,
    papers: 23,
    preview: 'Social proof is one of the best-evidenced influence mechanisms. But its effect size varies significantly across cultures, product types, and presentation formats.',
    tags: ['social proof', 'conformity', 'influence'],
  },
  {
    id: 'brand-purpose',
    category: 'Brand Strategy',
    title: 'Brand purpose & purchase intent',
    subtitle: 'Does "purpose-driven" marketing actually drive sales?',
    status: 'coming-soon',
    lessons: 5,
    papers: 15,
    preview: 'The relationship between brand purpose and consumer behavior is more nuanced than most LinkedIn posts suggest.',
    tags: ['brand purpose', 'CSR', 'purchase intent'],
  },
  {
    id: 'viral',
    category: 'Content Marketing',
    title: 'What makes content go viral',
    subtitle: 'Jonah Berger\'s STEPPS model and the evidence behind it',
    status: 'coming-soon',
    lessons: 4,
    papers: 9,
    preview: 'Virality is partly predictable, but the predictors are not what most marketers think.',
    tags: ['virality', 'word of mouth', 'sharing behavior'],
  },
  {
    id: 'pricing',
    category: 'Behavioral Economics',
    title: 'Pricing psychology',
    subtitle: 'Charm pricing, anchoring, and decoy effects — what holds up?',
    status: 'coming-soon',
    lessons: 7,
    papers: 31,
    preview: 'Pricing psychology is one of the most robustly researched areas in behavioral economics. Here\'s what the meta-analyses show.',
    tags: ['pricing', 'anchoring', 'decoy effect'],
  },
]

export default function Learn() {
  return (
    <Layout title="Learn — Marketing BS Detector">
      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          Research-backed learning
        </div>
        <h1 className={styles.title}>What does the research <em>actually</em> say?</h1>
        <p className={styles.subtitle}>
          Short, evidence-dense modules on marketing, consumer psychology, and behavioral economics.
          Every claim linked to primary research.
        </p>
      </section>

      <div className={styles.comingSoonBanner}>
        <span className={styles.csBadge}>Phase 3</span>
        Full interactive modules are coming — think Duolingo for marketing science.
        Modules below are available to browse; interactive lessons launching soon.
      </div>

      <div className={styles.grid}>
        {MODULES.map(mod => (
          <div key={mod.id} className={`${styles.moduleCard} ${mod.status === 'coming-soon' ? styles.dim : ''}`}>
            <div className={styles.cardTop}>
              <span className={styles.category}>{mod.category}</span>
              {mod.status === 'coming-soon' && <span className={styles.csBadgeSmall}>Coming soon</span>}
              {mod.status === 'available' && <span className={styles.availBadge}>Available</span>}
            </div>
            <h2 className={styles.moduleTitle}>{mod.title}</h2>
            <p className={styles.moduleSubtitle}>{mod.subtitle}</p>
            <p className={styles.modulePreview}>{mod.preview}</p>
            <div className={styles.cardMeta}>
              <span className={styles.metaItem}>{mod.lessons} lessons</span>
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaItem}>{mod.papers} papers</span>
            </div>
            <div className={styles.tags}>
              {mod.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
