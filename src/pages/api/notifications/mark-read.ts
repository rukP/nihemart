import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get auth token from Authorization header or cookies
  let authToken = req.headers.authorization?.replace('Bearer ', '');
  if (!authToken && req.cookies['auth-token']) {
    authToken = req.cookies['auth-token'];
  }

  if (!authToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const API_BASE = 'https://api.nihemart.rw/api';

  const { ids } = req.body;
  if (!ids || !Array.isArray(ids))
    return res.status(400).json({ error: 'ids array required' });

  try {
    const response = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error:
          errorData.error ||
          errorData.message ||
          'Failed to mark notifications as read',
      });
    }

    const result = await response.json();
    return res.status(200).json({ updated: result });
  } catch (err: any) {
    // console.error(err);
    return res.status(500).json({ error: err.message || err });
  }
}
