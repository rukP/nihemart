import type { NextApiRequest, NextApiResponse } from "next";
import { API_BASE } from "@/lib/api";

// Helper to extract auth token from request
function getAuthToken(req: NextApiRequest): string | null {
   const authHeader = req.headers.authorization;
   if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
   }
   return null;
}

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
   }

   const { id } = req.query;

   if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Order ID is required" });
   }

   try {
      // Get auth token from request headers
      const authToken = getAuthToken(req);

      // Call backend API
      const backendUrl = `${API_BASE}/orders/${id}`;
      const backendResponse = await fetch(backendUrl, {
         method: "GET",
         headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
         },
      });

      const backendData = await backendResponse.json();

      if (!backendResponse.ok) {
         console.error("Backend order fetch failed:", {
            orderId: id,
            status: backendResponse.status,
            error: backendData.message || backendData.error,
         });
         return res.status(backendResponse.status).json({
            error: backendData.message || backendData.error || "Failed to fetch order",
         });
      }

      // Transform backend response to match frontend expectations
      // Backend returns order with items array, which matches what frontend expects
      res.status(200).json(backendData);
   } catch (err: any) {
      console.error("Order API error:", err);
      res.status(500).json({ error: err?.message || "Server error" });
   }
}
