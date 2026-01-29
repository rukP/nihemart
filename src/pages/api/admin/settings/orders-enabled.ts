import type { NextApiRequest, NextApiResponse } from "next";

// Get API base URL
const getApiBase = () => {
  return (
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://api.nihemart.rw/api"
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const apiBase = getApiBase();
    const endpoint = `${apiBase}/settings/orders-enabled`;

    if (req.method === "GET") {
      // Public endpoint - no auth required
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        return res.status(response.status).json(error);
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    if (req.method === "POST" || req.method === "DELETE") {
      // Admin-only endpoints - forward auth token
      const authToken =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies["auth-token"];

      if (!authToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const response = await fetch(endpoint, {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        return res.status(response.status).json(error);
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).end("Method Not Allowed");
  } catch (err: any) {
    console.error("orders-enabled handler error:", err);
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
}
