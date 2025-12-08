import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/utils/supabase/service";
import { initializeKPayService } from "@/lib/services/kpay";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
   try {
      const payload = await request.json();

      logger.info("webhook", "KPay webhook received", {
         tid: payload.tid,
         refid: payload.refid,
         statusid: payload.statusid,
         statusdesc: payload.statusdesc,
      });

      // Initialize KPay service for validation
      const kpayService = initializeKPayService();

      // Validate webhook payload
      if (!kpayService.validateWebhookPayload(payload)) {
         logger.warn("webhook", "Invalid webhook payload", { payload });
         return NextResponse.json(
            { error: "Invalid webhook payload" },
            { status: 400 }
         );
      }

      // Process webhook
      const webhookData = kpayService.processWebhookPayload(payload);

      logger.info("webhook", "Webhook processed", {
         transactionId: webhookData.transactionId,
         orderReference: webhookData.orderReference,
         isSuccessful: webhookData.isSuccessful,
         isFailed: webhookData.isFailed,
         isPending: webhookData.isPending,
      });

      const supabase = createServiceSupabaseClient();

      // Find payment by reference or transaction ID
      let payment: any = null;
      let paymentError: any = null;

      // Try by reference first
      const { data: paymentByRef, error: refError } = await supabase
         .from("payments")
         .select("*")
         .eq("reference", webhookData.orderReference)
         .maybeSingle();

      if (paymentByRef) {
         payment = paymentByRef;
      } else if (!paymentByRef && webhookData.transactionId) {
         // Try by transaction ID
         const { data: paymentByTid, error: tidError } = await supabase
            .from("payments")
            .select("*")
            .eq("kpay_transaction_id", webhookData.transactionId)
            .maybeSingle();

         payment = paymentByTid;
         paymentError = tidError || refError;
      } else {
         paymentError = refError;
      }

      if (!payment) {
         logger.warn("webhook", "Payment not found for webhook", {
            reference: webhookData.orderReference,
            transactionId: webhookData.transactionId,
            error: paymentError?.message,
         });
         
         return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
         );
      }

      logger.info("webhook", "Payment found", {
         paymentId: payment.id,
         currentStatus: payment.status,
         orderId: payment.order_id,
      });

      // Prevent updating already completed/failed payments
      if (payment.status === "completed" || payment.status === "successful") {
         logger.info("webhook", "Payment already completed, skipping update", {
            paymentId: payment.id,
         });
         return NextResponse.json({ success: true, message: "Payment already completed" });
      }

      // Update payment status based on webhook
      let newStatus = payment.status;
      const updateData: any = {
         updated_at: new Date().toISOString(),
         kpay_mom_transaction_id: payload.momtransactionid || payment.kpay_mom_transaction_id,
         kpay_webhook_data: payload,
      };

      // Persist pay account and transaction id if provided
      if (payload?.payaccount) {
         updateData.kpay_pay_account = payload.payaccount;
      }
      if (payload?.tid && !payment.kpay_transaction_id) {
         updateData.kpay_transaction_id = String(payload.tid);
      }

      if (webhookData.isSuccessful) {
         newStatus = "completed";
         updateData.status = "completed";
         updateData.completed_at = new Date().toISOString();
         
         logger.info("webhook", "Payment marked as completed", {
            paymentId: payment.id,
            orderId: payment.order_id,
         });
      } else if (webhookData.isFailed) {
         newStatus = "failed";
         updateData.status = "failed";
         updateData.failure_reason = webhookData.statusMessage || "Payment failed";
         
         logger.info("webhook", "Payment marked as failed", {
            paymentId: payment.id,
            reason: updateData.failure_reason,
         });
      } else if (webhookData.isPending) {
         newStatus = "pending";
         updateData.status = "pending";
         
         logger.info("webhook", "Payment still pending", {
            paymentId: payment.id,
         });
      }

      // Log what we're about to update
      logger.info("webhook", "Updating payment with data", {
         paymentId: payment.id,
         updateData: {
            status: updateData.status,
            hasWebhookData: Boolean(updateData.kpay_webhook_data),
            hasMomTxId: Boolean(updateData.kpay_mom_transaction_id),
            hasCompletedAt: Boolean(updateData.completed_at),
         },
      });

      // Update payment record
      const { error: updateError } = await supabase
         .from("payments")
         .update(updateData)
         .eq("id", payment.id);

      if (updateError) {
         logger.error("webhook", "Failed to update payment", {
            paymentId: payment.id,
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
         });
         return NextResponse.json(
            { error: "Failed to update payment" },
            { status: 500 }
         );
      }

      logger.info("webhook", "Payment updated successfully", {
         paymentId: payment.id,
         newStatus: newStatus,
      });

      // If payment is successful and linked to an order, update order status
      if (webhookData.isSuccessful && payment.order_id) {
         const { error: orderUpdateError } = await supabase
            .from("orders")
            .update({
               status: "paid",
               payment_status: "paid",
               is_paid: true,
               updated_at: new Date().toISOString(),
            })
            .eq("id", payment.order_id);

         if (orderUpdateError) {
            logger.error("webhook", "Failed to update order status", {
               orderId: payment.order_id,
               error: orderUpdateError.message,
            });
         } else {
            logger.info("webhook", "Order marked as paid", {
               orderId: payment.order_id,
               paymentId: payment.id,
            });
         }
      }

      // For session-based payments (no order_id), just mark payment as completed
      // The user will manually create the order after returning to checkout
      if (webhookData.isSuccessful && !payment.order_id) {
         logger.info("webhook", "Session payment completed - user will create order manually", {
            paymentId: payment.id,
            reference: payment.reference,
         });
      }

      return NextResponse.json({
         success: true,
         message: "Webhook processed successfully",
         paymentId: payment.id,
         status: newStatus,
      });
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