import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://api.nihemart.rw/api";

  try {
    const idsParam = String(req.query.ids || "").trim();
    if (!idsParam)
      return res.status(400).json({ error: "ids parameter is required" });

    // Forward request to backend API
    const token = req.headers.authorization?.replace("Bearer ", "");

    const response = await fetch(
      `${API_BASE}/orders/assignments/batch?ids=${encodeURIComponent(idsParam)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Failed to get assignments",
      }));
      return res.status(response.status).json(error);
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("batch assignments handler failed", err);
    return res.status(500).json({ error: err?.message || "Failed" });
  }
}
