import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // inject global styles once
    const id = 'bs-global-styles'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Inter:wght@300;400;500;600&display=swap');
:root {
  --bg-void:#080b0f;--bg-base:#0d1117;--bg-surface:#131920;--bg-raised:#1a2230;--bg-overlay:#1f2a3a;
  --border-dim:rgba(255,255,255,0.06);--border-mid:rgba(255,255,255,0.10);--border-bright:rgba(255,255,255,0.18);
  --text-primary:#e8edf2;--text-secondary:#8a97a6;--text-muted:#4a5568;--text-faint:#2d3748;
  --green:#00c896;--green-dim:rgba(0,200,150,0.12);--green-mid:rgba(0,200,150,0.25);
  --c-supported:#00c896;--c-supported-bg:rgba(0,200,150,0.10);
  --c-partial:#f0a500;--c-partial-bg:rgba(240,165,0,0.10);
  --c-contested:#a78bfa;--c-contested-bg:rgba(167,139,250,0.10);
  --c-unsupported:#64748b;--c-unsupported-bg:rgba(100,116,139,0.10);
  --c-contradicted:#f87171;--c-contradicted-bg:rgba(248,113,113,0.10);
  --serif:'DM Serif Display',Georgia,serif;--sans:'Inter',system-ui,sans-serif;--mono:'DM Mono','Fira Code',monospace;
  --max-w:820px;--r-sm:4px;--r-md:8px;--r-lg:14px;--r-xl:20px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{
  font-family:var(--sans);background:var(--bg-base);color:var(--text-primary);
  line-height:1.6;min-height:100vh;-webkit-font-smoothing:antialiased;
  background-image:linear-gradient(rgba(0,200,150,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,150,0.015) 1px,transparent 1px);
  background-size:48px 48px;
}
a{color:inherit;text-decoration:none}
::selection{background:var(--green-mid);color:var(--text-primary)}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:var(--bg-base)}
::-webkit-scrollbar-thumb{background:var(--bg-overlay);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--border-bright)}
    `
    document.head.appendChild(style)
  }, [])

  return <Component {...pageProps} />
}
