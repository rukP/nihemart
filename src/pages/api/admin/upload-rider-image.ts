import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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

  try {
    const { filename, base64 } = req.body || {};
    if (!filename || !base64)
      return res.status(400).json({ error: 'filename and base64 required' });

    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');

    // Create form data for multipart upload
    const formData = new FormData();
    const file = new File([buffer], filename, {
      type: 'application/octet-stream',
    });
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/uploads/riders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error:
          errorData.error ||
          errorData.message ||
          'Failed to upload rider image',
      });
    }

    const result = await response.json();
    return res.status(200).json({ url: result.url });
  } catch (err: any) {
    // console.error('upload-rider-image failed', err);
    return res.status(500).json({ error: err?.message || 'Failed' });
  }
}
