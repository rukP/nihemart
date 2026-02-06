import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order } = req.body;
  if (!order || !order.customer_email) {
    return res.status(400).json({ error: 'Missing order or customer_email' });
  }

  const API_BASE = 'https://api.nihemart.rw/api';

  try {
    const response = await fetch(`${API_BASE}/email/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: order.customer_email,
        kind: 'order_confirmation',
        meta: {
          order_id: order.id,
          order_number: order.order_number,
          items: order.items,
          total: order.total,
          currency: order.currency,
          customer_name: order.customer_first_name || order.customer_name,
          delivery_address: order.delivery_address,
          delivery_time: order.delivery_time,
          schedule_notes: order.schedule_notes,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error:
          errorData.error ||
          errorData.message ||
          'Failed to send order confirmation email',
      });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({
      error: e.message || 'Failed to send order confirmation email',
    });
  }
}
