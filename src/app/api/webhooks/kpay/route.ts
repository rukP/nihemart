import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { API_BASE } from "@/lib/api";

export async function POST(request: NextRequest) {
   try {
      const payload = await request.json();

      logger.info("webhook", "KPay webhook received", {
         tid: payload.tid,
         refid: payload.refid,
         statusid: payload.statusid,
         statusdesc: payload.statusdesc,
      });

      // Forward webhook to backend
      const backendUrl = `${API_BASE}/webhooks/kpay`;
      const backendResponse = await fetch(backendUrl, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify(payload),
      });

      // Backend returns 'OK' for successful webhook processing
      const responseText = await backendResponse.text();

      if (!backendResponse.ok) {
         logger.error("webhook", "Backend webhook processing failed", {
            status: backendResponse.status,
            response: responseText,
         });
         return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: backendResponse.status }
         );
      }

      logger.info("webhook", "Webhook forwarded to backend successfully", {
         tid: payload.tid,
         refid: payload.refid,
      });

      // Return 'OK' as expected by KPay
      return new NextResponse("OK", { status: 200 });
   } catch (error) {
      logger.error("webhook", "Webhook processing failed", {
         error: error instanceof Error ? error.message : String(error),
         stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
         { error: "Webhook processing failed" },
         { status: 500 }
      );
   }
}

export async function GET() {
   return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405 }
   );
}
