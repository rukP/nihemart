import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/utils/supabase/service";
import { logger } from "@/lib/logger";
import { initializeKPayService } from "@/lib/services/kpay";

export async function POST(request: NextRequest) {
   try {
      const { orderId, reference, paymentId } = await request.json();
      if (!orderId || (!reference && !paymentId)) {
         return NextResponse.json(
            { error: "orderId and (reference or paymentId) are required" },
            { status: 400 }
         );
      }

      const supabase = createServiceSupabaseClient();

      logger.info("api", "payments.link.received", {
         orderId,
         reference,
         paymentId,
      });

      // Find any payment row by reference or id. We allow linking even when the
      // payment is not yet completed (prepay flow). The webhook or later
      // reconciliation will update status; we ensure the payments.order_id is set
      // immediately so the eventual completion can be associated with the order.
      const { data: payment, error: paymentFetchErr } = await supabase
         .from("payments")
         .select("*")
         .eq(reference ? "reference" : "id", reference || paymentId)
         .maybeSingle();

      if (paymentFetchErr) {
         logger.error("api", "payments.link.payment_lookup_error", {
            error: paymentFetchErr.message,
            orderId,
            reference,
            paymentId,
         });
         return NextResponse.json(
            { error: paymentFetchErr.message },
            { status: 500 }
         );
      }

      if (!payment) {
         logger.warn("api", "payments.link.no_payment_found", {
            orderId,
            reference,
            paymentId,
         });
         return NextResponse.json(
            { error: "No payment found to link" },
            { status: 404 }
         );
      }

      logger.info("api", "payments.link.payment_found", {
         paymentId: payment.id,
         status: payment.status,
         order_id: payment.order_id,
      });

      // If already linked to same order, just ensure order flags are set
      if (payment.order_id && payment.order_id !== orderId) {
         return NextResponse.json(
            { error: "Payment already linked to different order" },
            { status: 409 }
         );
      }

      // If payment exists but is not yet completed, attempt best-effort reconciliation
      // with KPay but do NOT block linking. This ensures the order can be created
      // and the payment row associated immediately; the webhook or the above
      // reconciliation will update status and the DB trigger will mark the order
      // paid when appropriate.
      if (payment.status !== "completed" && payment.status !== "successful") {
         try {
            logger.info("api", "payments.link.reconciling", {
               paymentId: payment.id,
               reference: payment.reference,
               currentStatus: payment.status,
            });

            const kpayService = initializeKPayService();
            const kpayResponse = await kpayService.checkPaymentStatus({
               transactionId: payment.kpay_transaction_id || undefined,
               orderReference: payment.reference || undefined,
            });

            const statusIdStr = String(kpayResponse?.statusid || "").padStart(
               2,
               "0"
            );

            if (statusIdStr === "01") {
               const updateData: any = {
                  updated_at: new Date().toISOString(),
                  status: "completed",
                  completed_at: new Date().toISOString(),
                  kpay_response: kpayResponse,
                  kpay_return_code: kpayResponse.retcode,
               };
               if (kpayResponse.momtransactionid) {
                  updateData.kpay_mom_transaction_id =
                     kpayResponse.momtransactionid;
               }
               if (kpayResponse.tid) {
                  updateData.kpay_transaction_id = kpayResponse.tid;
               }

               const { error: reconcileErr } = await supabase
                  .from("payments")
                  .update(updateData)
                  .eq("id", payment.id);

               if (!reconcileErr) {
                  // reflect updated status locally for following logic
                  payment.status = "completed";
                  logger.info("api", "payments.link.reconcile_persisted", {
                     paymentId: payment.id,
                     kpay_transaction_id: updateData.kpay_transaction_id,
                  });
               } else {
                  logger.warn("api", "payments.link.reconcile_persist_fail", {
                     paymentId: payment.id,
                     error: reconcileErr.message,
                  });
               }
            }
         } catch (reconErr) {
            logger.warn("api", "payments.link.reconcile_error", {
               error:
                  reconErr instanceof Error
                     ? reconErr.message
                     : String(reconErr),
               paymentId: payment.id,
            });
            // Do not block linking on reconciliation failures
         }
      }

      // Link payment to order. If it's already linked to the same order, it's a noop.
      if (payment.order_id && payment.order_id !== orderId) {
         return NextResponse.json(
            { error: "Payment already linked to different order" },
            { status: 409 }
         );
      }

      if (!payment.order_id) {
         const { error: linkErr } = await supabase
            .from("payments")
            .update({ order_id: orderId, updated_at: new Date().toISOString() })
            .eq("id", payment.id);
         if (linkErr) {
            logger.error("api", "payments.link.update_failed", {
               paymentId: payment.id,
               orderId,
               error: linkErr.message,
            });
            return NextResponse.json(
               { error: "Failed to link payment to order" },
               { status: 500 }
            );
         }
         logger.info("api", "payments.link.updated", {
            paymentId: payment.id,
            orderId,
         });
      }

      // Mark order as paid
      const { error: orderUpdErr } = await supabase
         .from("orders")
         .update({
            payment_status: "paid",
            is_paid: true,
            updated_at: new Date().toISOString(),
         })
         .eq("id", orderId);
      if (orderUpdErr) {
         logger?.warn?.("api", "payments.link.order_update_failed", {
            orderId,
            error: orderUpdErr.message,
         });
      } else {
         logger.info("api", "payments.link.order_marked_paid", {
            orderId,
            paymentId: payment.id,
         });
      }

      return NextResponse.json({
         success: true,
         orderId,
         paymentId: payment.id,
      });
   } catch (e) {
      return NextResponse.json(
         { error: e instanceof Error ? e.message : String(e) },
         { status: 500 }
      );
   }
}
