import type { NextApiRequest, NextApiResponse } from 'next';
import { reassignOrderToRider } from '@/lib/api/riders';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { orderId, riderId } = req.body;
  if (!orderId || !riderId)
    return res.status(400).json({ error: 'orderId and riderId required' });

  try {
    const assignment = await reassignOrderToRider(riderId, orderId);
    return res.status(200).json({ assignment });
  } catch (err: any) {
    // console.error('reassign-order failed', err);
    if (err && err.code === 'ORDERNOT_FOUND')
      return res
        .status(404)
        .json({ error: { code: err.code, message: err.message } });
    if (err && err.code === 'RIDERNOT_FOUND')
      return res
        .status(404)
        .json({ error: { code: err.code, message: err.message } });
    if (err && err.code === 'RIDERINACTIVE')
      return res
        .status(409)
        .json({ error: { code: err.code, message: err.message } });
    return res.status(500).json({
      error: {
        code: err.code || 'INTERNALERROR',
        message: err.message || 'Failed to reassign order',
      },
    });
  }
}
