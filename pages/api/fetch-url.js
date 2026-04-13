// pages/api/fetch-url.js
// Server-side URL fetcher (avoids CORS issues)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'No URL provided.' })

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BSDetector/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const html = await response.text()

    // strip tags and extract text content
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000)

    return res.status(200).json({ text })
  } catch (e) {
    return res.status(500).json({ error: `Could not fetch URL: ${e.message}` })
  }
}
