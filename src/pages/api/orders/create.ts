import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = req.body;
  if (!payload || !payload.order || !payload.items) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  try {
    // Forward to backend API
    const API_BASE =
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_URL ||
      "https://api.nihemart.rw/api";
    const token = req.headers.authorization?.replace("Bearer ", "");

    const response = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Failed to create order" }));
      return res.status(response.status).json(error);
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("/api/orders/create error:", err);
    const message = err?.message || "Failed to create order";
    return res.status(500).json({ error: message });
  }
}
