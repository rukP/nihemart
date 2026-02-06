import type { NextApiRequest, NextApiResponse } from 'next';
import { updateRider } from '@/lib/api/riders';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { riderId, updates } = req.body || {};
  if (!riderId) return res.status(400).json({ error: 'riderId required' });
  try {
    const rider = await updateRider(riderId, updates || {});
    return res.status(200).json({ rider });
  } catch (err: any) {
    console.error('update-rider failed', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
