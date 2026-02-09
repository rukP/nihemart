import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = String(req.query.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const API_BASE = 'https://api.nihemart.rw/api';

  try {
    const response = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: errorData.error || errorData.message || 'Failed to fetch order',
      });
    }

    const result = await response.json();
    return res.status(200).json({ order: result });
  } catch (err: any) {
    // console.error('/api/orders/get error:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
