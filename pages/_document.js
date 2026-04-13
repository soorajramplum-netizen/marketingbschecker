import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="description" content="Marketing BS Detector — Cross-reference marketing claims against 200M+ peer-reviewed research papers. Fluff stops here." />
        <meta property="og:title" content="Marketing BS Detector" />
        <meta property="og:description" content="Fluff stops here. Real-time verification of marketing claims against peer-reviewed literature." />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
