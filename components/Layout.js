// components/Layout.js
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './Layout.module.css'

export default function Layout({ children, title = 'Marketing BS Detector' }) {
  const router = useRouter()
  const navLinks = [
    { href: '/', label: 'Detector' },
    { href: '/digest', label: 'Daily digest' },
    { href: '/explore', label: 'Explore' },
    { href: '/learn', label: 'Learn' },
  ]

  return (
    <>
      <Head>
        <title>{title} — Fluff stops here.</title>
      </Head>
      <div className={styles.root}>
        <header className={styles.header}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoMark}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7.5" stroke="#00c896" strokeWidth="1.3"/>
                <circle cx="9" cy="9" r="2.5" fill="#00c896"/>
                <path d="M9 3v2M9 13v2M3 9h2M13 9h2" stroke="#00c896" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoName}>Marketing BS Detector</span>
              <span className={styles.logoSub}>Fluff stops here.</span>
            </div>
          </Link>

          <nav className={styles.nav}>
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${router.pathname === link.href ? styles.navActive : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <span className={styles.concept}>Concept by Sooraj Ram</span>
        </header>

        <main className={styles.main}>
          {children}
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            <span className={styles.footerBrand}>Marketing BS Detector</span>
            <span className={styles.footerDivider}>·</span>
            <span className={styles.footerNote}>Absence of evidence ≠ evidence of absence</span>
          </div>
          <div className={styles.footerRight}>
            Concept by <strong>Sooraj Ram</strong> · v1.0
          </div>
        </footer>
      </div>
    </>
  )
}
