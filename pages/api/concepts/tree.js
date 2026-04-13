// pages/api/concepts/tree.js
// Returns root concepts or children of a given concept

import { ROOT_CONCEPTS, getChildConcepts } from '../../../lib/concepts'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { parentId } = req.query

  try {
    if (!parentId) {
      return res.status(200).json({ concepts: ROOT_CONCEPTS })
    }
    const children = await getChildConcepts(parentId)
    return res.status(200).json({ concepts: children })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
