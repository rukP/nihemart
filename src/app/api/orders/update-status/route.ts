import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
   try {
      const body = await req.json();
      // Accept either { id, status, additionalFields } (client calls) or { orderId, status }
      const id = body?.id || body?.orderId;
      const status = body?.status;
      const additionalFields = body?.additionalFields || {};

      if (!id || !status) {
         return NextResponse.json(
            { error: "Missing id or status" },
            { status: 400 }
         );
      }

      // Update order status via backend API
      const API_BASE =
         process.env.NEXT_PUBLIC_API_BASE ||
         process.env.NEXT_PUBLIC_API_URL ||
         "https://api.nihemart.rw/api";
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
         ? authHeader.slice(7)
         : "";

      const response = await fetch(`${API_BASE}/orders/${id}/status`, {
         method: "PUT",
         headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
         },
         body: JSON.stringify({ status, ...additionalFields }),
      });

      if (!response.ok) {
         const error = await response
            .json()
            .catch(() => ({ error: "Failed to update order status" }));
         return NextResponse.json(error, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
   } catch (error) {
      console.error("Error in update-status route:", error);
      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}
