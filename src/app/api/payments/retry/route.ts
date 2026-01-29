import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { API_BASE } from "@/lib/api";
import { getPublicBaseUrl } from "@/lib/getPublicBaseUrl";

// Helper to extract auth token from request
function getAuthToken(request: NextRequest): string | null {
   const authHeader = request.headers.get("authorization");
   if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
   }
   return null;
}

interface RetryRequest {
   orderId: string;
   amount: number;
   customerName: string;
   customerEmail: string;
   customerPhone: string;
   paymentMethod: string;
   redirectUrl: string;
}

export async function POST(request: NextRequest) {
   let orderId: string | undefined;
   try {
      const body: RetryRequest = await request.json();
      const appBaseUrl = getPublicBaseUrl(request);
      orderId = body.orderId;

      if (!body.orderId || !body.amount || !body.paymentMethod) {
         return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
         );
      }

      logger.info("api", "Payment retry request received", {
         orderId: body.orderId,
         amount: body.amount,
         paymentMethod: body.paymentMethod,
      });

      // Get auth token from request headers
      const authToken = getAuthToken(request);

      // For retry, we just call the initiate endpoint again with the same orderId
      // The backend will handle creating a new payment record
      const backendUrl = `${API_BASE}/payments/initiate`;
      const backendResponse = await fetch(backendUrl, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
         },
         body: JSON.stringify({
            orderId: body.orderId,
            amount: body.amount,
            customerName: body.customerName,
            customerEmail: body.customerEmail,
            customerPhone: body.customerPhone,
            customerNumber: body.customerPhone,
            paymentMethod: body.paymentMethod,
            redirectUrl: body.redirectUrl || `${appBaseUrl}/payment/${body.orderId}`,
            orderDetails: `Order ${body.orderId} retry payment`,
         }),
      });

      const backendData = await backendResponse.json();

      if (!backendResponse.ok) {
         logger.error("api", "Backend payment retry failed", {
            orderId,
            status: backendResponse.status,
            error: backendData.message || backendData.error,
         });
         return NextResponse.json(
            {
               success: false,
               error: backendData.message || backendData.error || "Payment retry failed",
            },
            { status: backendResponse.status }
         );
      }

      // Transform backend response to match frontend expectations
      const kpayData = backendData.data || {};
      const checkoutUrl = kpayData.url || kpayData.redirecturl || kpayData.redirectUrl;

      logger.info("api", "Payment retry initiated successfully", {
         orderId,
         transactionId: kpayData.tid,
         checkoutUrl: !!checkoutUrl,
      });

      return NextResponse.json({
         success: true,
         data: kpayData,
         checkoutUrl,
         transactionId: kpayData.tid,
         reference: kpayData.reference || kpayData.orderReference,
         status: "pending",
         message: "Payment retry initiated successfully",
      });
   } catch (error) {
      logger.error("api", "Payment retry failed", {
         orderId,
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

export async function GET() {
   return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
