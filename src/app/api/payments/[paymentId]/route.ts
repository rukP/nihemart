import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/utils/supabase/service";
import { logger } from "@/lib/logger";
import { initializeKPayService } from "@/lib/services/kpay";

interface RouteParams {
   params: Promise<{
      paymentId: string;
   }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
   const { paymentId } = await params;

   try {
      logger.info("api", "Payment details request received", { paymentId });

      if (!paymentId) {
         return NextResponse.json(
            { error: "Payment ID is required" },
            { status: 400 }
         );
      }

      // Initialize Supabase client
      const supabase = createServiceSupabaseClient();

      // Fetch payment details - use maybeSingle to avoid coercion errors
      const { data: payment, error: paymentError } = await supabase
         .from("payments")
         .select("*")
         .eq("id", paymentId)
         .maybeSingle();

      if (paymentError || !payment) {
         // If not found by id, try to find by reference in payments (sometimes reference used as id)
         logger.info(
            "api",
            "Payment not found in payments table by id, trying fallback lookups",
            { paymentId, error: paymentError?.message }
         );

         try {
            const { data: byRef, error: byRefErr } = await supabase
               .from("payments")
               .select("*")
               .eq("reference", paymentId)
               .maybeSingle();

            if (byRefErr) {
               logger.warn("api", "Failed payments fallback lookup", {
                  paymentId,
                  error: byRefErr.message,
               });
            }

            if (byRef) {
               // use byRef as payment
               return NextResponse.json(byRef);
            }
         } catch (e) {
            logger.error("api", "Error during payments fallback lookup", {
               paymentId,
               error: e instanceof Error ? e.message : String(e),
            });
         }

         logger.warn("api", "Payment not found", { paymentId });
         return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
         );
      }

      logger.info("api", "Payment details retrieved successfully", {
         paymentId,
         orderId: payment.order_id,
         status: payment.status,
         amount: payment.amount,
      });

      // Return payment as-is; clients control status checks to avoid excessive server load
      return NextResponse.json(payment);
   } catch (error) {
      logger.error("api", "Failed to retrieve payment details", {
         paymentId,
         error: error instanceof Error ? error.message : String(error),
         stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}

/**
 * PATCH /api/payments/[paymentId]
 * Links a payment to an order after order creation
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
   try {
      const { paymentId } = await params;
      const body = await request.json();
      const { order_id } = body;

      if (!order_id) {
         return NextResponse.json(
            { error: "order_id is required" },
            { status: 400 }
         );
      }

      logger.info("api", "Linking payment to order", {
         paymentId,
         orderId: order_id,
      });

      const supabase = createServiceSupabaseClient();

      // Get payment from payments table (by id or reference)
      let payment: any = null;
      try {
         const { data: p, error: pErr } = await supabase
            .from("payments")
            .select("id, status, order_id, reference, kpay_transaction_id")
            .or(`id.eq.${paymentId},reference.eq.${paymentId}`)
            .maybeSingle();

         if (p && !pErr) payment = p;
      } catch (e) {
         logger.error("api", "Error fetching payment", { paymentId, error: e });
      }

      if (!payment) {
         logger.error("api", "Payment not found in payments table", {
            paymentId,
         });
         return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
         );
      }

      // Check if payment is already linked
      if (payment.order_id && payment.order_id !== order_id) {
         logger.warn("api", "Payment already linked to different order", {
            paymentId,
            existingOrderId: payment.order_id,
            newOrderId: order_id,
         });
         return NextResponse.json(
            { error: "Payment already linked to a different order" },
            { status: 409 }
         );
      }

      // If payment is not completed yet, attempt reconciliation with KPay
      if (payment.status !== "completed" && payment.status !== "successful") {
         try {
            const kpayService = initializeKPayService();
            const kpayResp = await kpayService.checkPaymentStatus({
               transactionId: payment.kpay_transaction_id || undefined,
               orderReference: payment.reference || undefined,
            });

            const statusIdStr = String(kpayResp?.statusid || "").padStart(
               2,
               "0"
            );

            if (statusIdStr === "01") {
               // Persist KPay completion info
               const updateData: any = {
                  status: "completed",
                  completed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  kpay_response: kpayResp,
                  kpay_return_code: kpayResp.retcode,
               };
               if (kpayResp.tid) updateData.kpay_transaction_id = kpayResp.tid;
               if (kpayResp.momtransactionid)
                  updateData.kpay_mom_transaction_id =
                     kpayResp.momtransactionid;

               const { error: reconcileErr } = await supabase
                  .from("payments")
                  .update(updateData)
                  .eq("id", payment.id);

               if (!reconcileErr) {
                  payment.status = "completed";
               }
            } else {
               return NextResponse.json(
                  { error: "Payment not completed at gateway" },
                  { status: 409 }
               );
            }
         } catch (e) {
            logger.warn("api", "KPay reconciliation failed during PATCH link", {
               error: e,
            });
            return NextResponse.json(
               { error: "Unable to verify payment status with gateway" },
               { status: 503 }
            );
         }
      }

      // Verify order exists
      const { data: order, error: orderError } = await supabase
         .from("orders")
         .select("id, status")
         .eq("id", order_id)
         .single();

      if (orderError || !order) {
         logger.error("api", "Order not found", {
            orderId: order_id,
            error: orderError?.message,
         });
         return NextResponse.json(
            { error: "Order not found" },
            { status: 404 }
         );
      }

      // Link payment to order and update order status
      const linkedPaymentId = payment?.id || paymentId;
      const { error: updateError } = await supabase
         .from("payments")
         .update({
            order_id: order_id,
            updated_at: new Date().toISOString(),
         })
         .eq("id", linkedPaymentId);

      if (updateError) {
         logger.error("api", "Failed to link payment to order", {
            paymentId,
            orderId: order_id,
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
         });
         return NextResponse.json(
            { error: "Failed to link payment to order" },
            { status: 500 }
         );
      }

      // Update order's payment_status to 'paid' since payment was completed
      const { error: orderUpdateError } = await supabase
         .from("orders")
         .update({
            payment_status: "paid",
            is_paid: true,
            updated_at: new Date().toISOString(),
         })
         .eq("id", order_id);

      if (orderUpdateError) {
         logger.warn("api", "Failed to update order payment_status", {
            orderId: order_id,
            error: orderUpdateError.message,
         });
         // Don't fail the request since payment link succeeded
      } else {
         logger.info("api", "Order payment_status updated to paid", {
            orderId: order_id,
         });
      }

      logger.info("api", "Payment successfully linked to order", {
         paymentId,
         orderId: order_id,
      });

      return NextResponse.json({
         success: true,
         message: "Payment linked to order successfully",
         paymentId: linkedPaymentId,
         orderId: order_id,
      });
   } catch (error) {
      logger.error("api", "Payment link endpoint error", {
         error: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}
