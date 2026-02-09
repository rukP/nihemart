import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  // Get auth token from Authorization header or cookies
  let authToken = req.headers.authorization?.replace('Bearer ', '');
  if (!authToken && req.cookies['auth-token']) {
    authToken = req.cookies['auth-token'];
  }

  if (!authToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.nihemart.rw/api';

  try {
    // Build query string from request query parameters
    const queryParams = new URLSearchParams();

    // Copy all query parameters to the backend request
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const url = `${API_BASE}/users${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: errorData.error || errorData.message || 'Failed to list users',
      });
    }

    const result = await response.json();
    res.status(200).json(result);
  } catch (error: any) {
    // console.error('Error listing users:', error);
    res.status(500).json({
      error: 'Failed to list users',
      details:
        process.env.NODEENV === 'development' ? error.message : undefined,
    });
  }
}
