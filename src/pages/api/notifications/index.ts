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

  const API_BASE = 'https://api.nihemart.rw/api';

  try {
    if (req.method === 'GET') {
      const { userId, role, limit = 50, notificationId, since } = req.query;

      // Build query parameters for the backend
      const params = new URLSearchParams();
      if (userId) params.append('userId', String(userId));
      if (role) params.append('role', String(role));
      if (limit) params.append('limit', String(limit));
      if (notificationId)
        params.append('notificationId', String(notificationId));
      if (since) params.append('since', String(since));

      const response = await fetch(`${API_BASE}/notifications?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json({
          error:
            errorData.error ||
            errorData.message ||
            'Failed to fetch notifications',
        });
      }

      const result = await response.json();
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('notifications handler error', err);
    return res.status(500).json({ error: err.message || err });
  }
}
