import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.nihemart.rw/api';

  try {
    const riderId = String(req.query.riderId || '');
    if (!riderId) return res.status(400).json({ error: 'riderId is required' });

    // Forward request to backend API
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const response = await fetch(`${API_BASE}/riders/${riderId}/assignments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Failed to get assignments',
      }));
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    return res
      .status(200)
      .json({ assignments: Array.isArray(data) ? data : [] });
  } catch (err: any) {
    // console.error('assignments handler failed', err);
    return res.status(500).json({ error: err?.message || 'Failed' });
  }
}
