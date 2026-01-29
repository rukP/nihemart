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
      const { paymentId, transactionId, reference } = body;

      // Validate that at least one identifier is provided
      if (!paymentId && !transactionId && !reference) {
         return NextResponse.json(
            { error: "Payment ID, transaction ID, or reference is required" },
            { status: 400 }
         );
      }

      // Get auth token from request headers
      const authToken = getAuthToken(request);

      // Forward request to backend
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
         logger.error("api", "Backend payment status check failed", {
            paymentId,
            transactionId,
            reference,
            status: backendResponse.status,
            error: backendData.message || backendData.error,
         });
         return NextResponse.json(
            {
               success: false,
               error: backendData.message || backendData.error || "Failed to check payment status",
            },
            { status: backendResponse.status }
         );
      }

      // Transform backend response to match frontend expectations
      const statusData = backendData.data || {};
      const statusIdStr = String(statusData.statusid || "").padStart(2, "0");
      const retcode = statusData.retcode;
      const hasMomTransactionId = !!(statusData.momtransactionid || statusData.momTransactionId);
      
      // Payment is completed ONLY with explicit confirmation:
      // 1. statusId is '01' (explicit success from KPay)
      // 2. retcode is 0 (explicit success code)
      // 
      // Note: statusId '02' with momTransactionId might indicate payment went through,
      // but we treat it as pending to avoid false positives. The webhook will eventually
      // update to '01' when payment is fully confirmed.
      const isCompleted = statusIdStr === "01" || retcode === 0;
      
      // Log for debugging if we see statusId '02' with momTransactionId
      if (statusIdStr === "02" && hasMomTransactionId) {
         logger.info("api", "Payment has statusId '02' with momTransactionId - treating as pending", {
            reference,
            transactionId,
            momTransactionId: statusData.momtransactionid || statusData.momTransactionId,
         });
      }
      
      const status = isCompleted 
        ? "completed" 
        : statusIdStr === "02" 
        ? "pending" 
        : statusIdStr === "03" 
        ? "failed" 
        : "pending";

      logger.info("api", "Payment status checked", {
         paymentId,
         transactionId,
         reference,
         status,
         statusId: statusData.statusid,
      });

      return NextResponse.json({
         success: true,
         paymentId: paymentId || null,
         transactionId: statusData.tid || transactionId,
         reference: reference || statusData.reference,
         status,
         amount: statusData.amount || 0,
         currency: statusData.currency || "RWF",
         message: statusData.statusdesc || `Payment is ${status}`,
         needsUpdate: isCompleted && status === "completed",
         kpayStatus: {
            statusId: statusData.statusid,
            statusDescription: statusData.statusdesc,
            returnCode: statusData.retcode,
            momTransactionId: statusData.momtransactionid,
         },
      });
   } catch (error) {
      logger.error("api", "Payment status check error", {
         error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
         {
            success: false,
            error: "Internal server error",
            technicalError:
               error instanceof Error ? error.message : String(error),
         },
         { status: 500 }
      );
   }
}

export async function GET(request: NextRequest) {
   try {
      const { searchParams } = new URL(request.url);
      const paymentId = searchParams.get("paymentId");
      const transactionId = searchParams.get("transactionId");
      const reference = searchParams.get("reference");

      // Validate that at least one identifier is provided
      if (!paymentId && !transactionId && !reference) {
         return NextResponse.json(
            { error: "Payment ID, transaction ID, or reference is required" },
            { status: 400 }
         );
      }

      // Call the same logic as POST method
      return await POST(
         new NextRequest(request.url, {
            method: "POST",
            body: JSON.stringify({ paymentId, transactionId, reference }),
            headers: { "Content-Type": "application/json" },
         })
      );
   } catch (error) {
      logger.error("api", "Payment status check error (GET)", {
         error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}
