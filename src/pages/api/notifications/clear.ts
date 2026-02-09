import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  // Get auth token from Authorization header or cookies
  let authToken = req.headers.authorization?.replace('Bearer ', '');
  if (!authToken && req.cookies['auth-token']) {
    authToken = req.cookies['auth-token'];
  }

  if (!authToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const API_BASE = 'https://api.nihemart.rw/api';

  const { ids, userId, role } = req.body || {};

  try {
    const response = await fetch(
      `${API_BASE}/notifications/clear-by-criteria`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ids, userId, role }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error:
          errorData.error ||
          errorData.message ||
          'Failed to clear notifications',
      });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (err: any) {
    // console.error('notifications clear error', err);
    return res.status(500).json({ error: err.message || err });
  }
}
