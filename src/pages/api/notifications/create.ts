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

  const { recipient_user_id, title, body, meta } = req.body || {};
  let { recipient_role, type } = req.body || {};

  // If a recipient_user_id is provided but no explicit role, treat as a customer/user
  if (recipient_user_id && !recipient_role) recipient_role = 'user';
  if (!type) return res.status(400).json({ error: 'type required' });

  // Normalize notification type when callers send cancellation for delivered orders
  // so admin receives a clean refund request message instead of a cancellation.
  if (type === 'order_cancellation_requested') {
    try {
      const tmeta = meta as any | undefined;
      if (
        tmeta &&
        (tmeta.is_delivered === true || tmeta.is_delivered === 'true')
      ) {
        type = 'refund_requested';
      }
    } catch (_e) {}
  }

  try {
    const response = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        recipient_user_id,
        recipient_role,
        type,
        title,
        body,
        meta,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error:
          errorData.error ||
          errorData.message ||
          'Failed to create notification',
      });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (err: any) {
    // console.error(err);
    return res.status(500).json({ error: err.message || err });
  }
}
