import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { API_BASE } from "@/lib/api";

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
      const body = await request.json();
      const { reference, transactionId } = body;

      if (!reference && !transactionId) {
         return NextResponse.json(
            { error: "reference or transactionId required" },
            { status: 400 }
         );
      }

      // Get auth token from request headers
      const authToken = getAuthToken(request);

      // Call backend's checkPaymentStatus endpoint
      // This will check payment status with KPay, update the payment session,
      // and create the order if payment is successful and order hasn't been created yet
      const backendUrl = `${API_BASE}/payments/status`;
      const backendResponse = await fetch(backendUrl, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
         },
         body: JSON.stringify({
            transactionId,
            reference,
         }),
      });

      const backendData = await backendResponse.json();

      if (!backendResponse.ok) {
         logger.error("api", "Backend payment status check failed in finalize", {
            reference,
            transactionId,
            status: backendResponse.status,
            error: backendData.message || backendData.error,
         });
         return NextResponse.json(
            {
               success: false,
               error: backendData.message || backendData.error || "Failed to finalize payment",
            },
            { status: backendResponse.status }
         );
      }

      // Backend's checkPaymentStatus returns:
      // - orderCreated: true if order was created
      // - orderId: the created order ID
      // - orderNumber: the created order number
      // - success: true if status check succeeded
      // - data: the KPay response data

      const orderCreated = backendData.orderCreated === true;
      const orderId = backendData.orderId || null;
      const orderNumber = backendData.orderNumber || null;

      logger.info("api", "Payment finalized", {
         reference,
         transactionId,
         orderCreated,
         orderId,
      });

      return NextResponse.json({
         success: true,
         orderId: orderId,
         orderNumber: orderNumber,
         canCreateOrder: !orderCreated && backendData.data?.statusid === "01",
         status: backendData.data?.statusid === "01" ? "completed" : "pending",
         message: orderCreated
            ? "Payment completed and order created."
            : backendData.data?.statusid === "01"
            ? "Payment completed."
            : "Payment is not completed yet",
      });
   } catch (error) {
      logger.error("api", "Finalize error", {
         error: error instanceof Error ? error.message : String(error),
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
