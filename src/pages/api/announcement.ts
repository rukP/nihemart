import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.nihemart.rw/api';

  try {
    if (req.method === 'GET') {
      // Forward GET request to backend API
      const response = await fetch(`${API_BASE}/announcement`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: 'Failed to get announcement',
        }));
        return res.status(response.status).json(error);
      }

      const result = await response.json();
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      // Forward POST request to backend API (requires admin auth)
      const token = req.headers.authorization?.replace('Bearer ', '');

      const response = await fetch(`${API_BASE}/announcement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: 'Failed to set announcement',
        }));
        return res.status(response.status).json(error);
      }

      const result = await response.json();
      return res.status(200).json(result);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    // console.error('/api/announcement error:', err);
    const message = err?.message || 'Failed to process announcement request';
    return res.status(500).json({ error: message });
  }
}
