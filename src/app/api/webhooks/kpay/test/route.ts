import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Test endpoint to verify webhook is reachable and log recent webhook attempts
 * GET /api/webhooks/kpay/test
 */
export async function GET(request: NextRequest) {
   try {
      logger.info("webhook", "Webhook test endpoint called", {
         timestamp: new Date().toISOString(),
         origin: request.headers.get("origin"),
         userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({
         success: true,
         message: "KPay webhook endpoint is reachable",
         webhookUrl: process.env.KPAY_WEBHOOK_URL || "Not configured",
         timestamp: new Date().toISOString(),
         note: "Make sure this URL is configured in your KPay dashboard and is publicly accessible (not localhost unless using ngrok/tunneling)",
      });
   } catch (error) {
      logger.error("webhook", "Webhook test failed", {
         error: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json(
         {
            success: false,
            error: "Webhook test failed",
         },
         { status: 500 }
      );
   }
}

/**
 * POST handler for testing webhook payload processing
 */
export async function POST(request: NextRequest) {
   try {
      const payload = await request.json();

      logger.info("webhook", "Test webhook payload received", {
         payload,
         timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
         success: true,
         message: "Test webhook payload received and logged",
         receivedPayload: payload,
         timestamp: new Date().toISOString(),
      });
   } catch (error) {
      logger.error("webhook", "Test webhook POST failed", {
         error: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json(
         {
            success: false,
            error: "Failed to process test webhook",
         },
         { status: 500 }
      );
   }
}
