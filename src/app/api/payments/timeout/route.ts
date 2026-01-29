import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { API_BASE } from "@/lib/api";

interface RouteParams {
   paymentId: string;
   reason?: string;
}

// Helper to extract auth token from request
function getAuthToken(request: NextRequest): string | null {
   const authHeader = request.headers.get("authorization");
   if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
   }
   return null;
}

export async function POST(request: NextRequest) {
   try {
      const body: RouteParams = await request.json();
      const { paymentId, reason } = body;

      logger.info("api", "Payment timeout request received", {
         paymentId,
         reason,
      });

      if (!paymentId) {
         return NextResponse.json(
            { error: "Payment ID is required" },
            { status: 400 }
         );
      }

      // Get auth token from request headers
      const authToken = getAuthToken(request);

      // Call backend's timeout endpoint
      const backendUrl = `${API_BASE}/payments/timeout`;
      const backendResponse = await fetch(backendUrl, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
         },
         body: JSON.stringify({
            paymentId,
            reason: reason || "Client-side timeout after 5 minutes",
         }),
      });

      const backendData = await backendResponse.json();

      if (!backendResponse.ok) {
         logger.error("api", "Backend payment timeout failed", {
            paymentId,
            status: backendResponse.status,
            error: backendData.message || backendData.error,
         });
         return NextResponse.json(
            {
               success: false,
               error: backendData.message || backendData.error || "Failed to record payment timeout",
            },
            { status: backendResponse.status }
         );
      }

      logger.info("api", "Payment timeout recorded successfully", {
         paymentId,
         status: backendData.status,
      });

      return NextResponse.json({
         success: true,
         message: "Payment timeout recorded. Order remains available for retry.",
         status: backendData.status || "timeout",
         payment: backendData.payment || null,
      });
   } catch (error) {
      logger.error("api", "Payment timeout handling failed", {
         error: error instanceof Error ? error.message : String(error),
         stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
         { 
            success: false,
            error: "Internal server error",
            technicalError: error instanceof Error ? error.message : String(error),
         },
         { status: 500 }
      );
   }
}

export async function GET() {
   return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
