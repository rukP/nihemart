import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Simple in-memory cache to avoid repeated expensive DB aggregation when the
  // endpoint is hammered. TTL is short because values change as orders are
  // delivered, but caching for a few seconds protects the DB from request
  // storms while preserving near-real-time metrics.
  // Note: this uses module-level memory; in a multi-instance production
  // deployment you'd prefer an external cache (Redis) but this is a low-risk
  // mitigation for dev and single-instance deployments.
  const TTLMS = 15 * 1000; // 15 seconds
  if (!(global as any).__topAmountCache) {
    (global as any).__topAmountCache = { ts: 0, data: null };
  }
  const cache = (global as any).__topAmountCache;
  if (Date.now() - cache.ts < TTLMS && cache.data) {
    return res.status(200).json(cache.data);
  }

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
    const response = await fetch(`${API_BASE}/riders/top/delivery-count`, {
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
          'Failed to get top rider by delivery count',
      });
    }

    const result = await response.json();

    // Update cache before returning
    cache.ts = Date.now();
    cache.data = result;

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('top-amount failed', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
