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

  const { userId, full_name, phone } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const updates: Record<string, any> = {};
    if (typeof full_name === 'string') updates.fullName = full_name;
    if (typeof phone === 'string') updates.phone = phone;

    const response = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error:
          errorData.error || errorData.message || 'Failed to update profile',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    // console.error('upsert-profile error:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
