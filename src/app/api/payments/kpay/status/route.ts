import { NextRequest, NextResponse } from "next/server";
import { initializeKPayService } from "@/lib/services/kpay";
import { createServiceSupabaseClient } from "@/utils/supabase/service";

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

      // Initialize Supabase client
      const supabase = createServiceSupabaseClient();

      // Find the payment record
      let paymentQuery = supabase
         .from("payments")
         .select(
            "id, order_id, status, amount, currency, reference, kpay_transaction_id, customer_name, customer_email"
         );

      if (paymentId) {
         paymentQuery = paymentQuery.eq("id", paymentId);
      } else if (transactionId) {
         paymentQuery = paymentQuery.eq("kpay_transaction_id", transactionId);
      } else if (reference) {
         paymentQuery = paymentQuery.eq("reference", reference);
      }

      const { data: payment, error: paymentError } =
         await paymentQuery.maybeSingle();
      if (paymentError || !payment) {
         // Return a soft 'not found' so clients polling can retry instead of treating 404 as terminal
         return NextResponse.json(
            {
               success: false,
               message: "Payment not found",
               status: "unknown",
               paymentId: null,
               reference: reference || null,
            },
            { status: 200 }
         );
      }

      // If payment is already in final state, return current status
      if (payment.status === "completed" || payment.status === "failed") {
         return NextResponse.json({
            success: true,
            paymentId: payment.id,
            orderId: payment.order_id || null,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            reference: payment.reference,
            transactionId: payment.kpay_transaction_id,
            message: `Payment is ${payment.status}`,
            needsUpdate: false,
         });
      }

      // Initialize KPay service
      let kpayService;
      try {
         kpayService = initializeKPayService();
      } catch (error) {
         console.error("KPay service initialization failed:", error);
         return NextResponse.json(
            { error: "Payment service unavailable" },
            { status: 503 }
         );
      }

      try {
         // Prefer transactionId/reference from the request body if present,
         // otherwise fall back to the stored payment row values. This helps when
         // the payments row hasn't yet been populated with the kpay_transaction_id.
         const effectiveTransactionId =
            transactionId || payment.kpay_transaction_id || undefined;
         const effectiveReference = reference || payment.reference || undefined;

         // Check payment status with KPay
         const kpayResponse = await kpayService.checkPaymentStatus({
            transactionId: effectiveTransactionId,
            orderReference: effectiveReference,
         });

         console.log("KPay status check response:", {
            paymentId: payment.id,
            kpayResponse: kpayResponse,
         });

         // Process the status response
         let updatedStatus = payment.status;
         let needsUpdate = false;
         const updateData: any = {
            updated_at: new Date().toISOString(),
            kpay_response: kpayResponse,
         };

         // Check if status has changed based on statusid
         console.log("Processing KPay status response:", {
            paymentId: payment.id,
            currentStatus: payment.status,
            kpayStatusId: kpayResponse.statusid,
            kpayStatusDesc: kpayResponse.statusdesc,
            kpayRetCode: kpayResponse.retcode,
         });

         const statusIdStr = String(kpayResponse.statusid || "").padStart(
            2,
            "0"
         );

         if (statusIdStr === "01" && payment.status !== "completed") {
            // Payment successful
            updatedStatus = "completed";
            updateData.status = "completed";
            updateData.completed_at = new Date().toISOString();
            updateData.kpay_mom_transaction_id = kpayResponse.momtransactionid;
            // Persist KPay tid if present and not already stored
            if (
               kpayResponse.tid &&
               kpayResponse.tid !== payment.kpay_transaction_id
            ) {
               updateData.kpay_transaction_id = String(kpayResponse.tid);
            }
            needsUpdate = true;
            console.log("Payment marked as completed:", {
               paymentId: payment.id,
               previousStatus: payment.status,
               newStatus: "completed",
               momTransactionId: kpayResponse.momtransactionid,
            });
         } else if (statusIdStr === "02") {
            // Payment is being processed (waiting for SMS confirmation)
            updatedStatus = "pending";
            // For long-running payments, don't update the database unless status actually changes
            if (payment.status !== "pending") {
               updateData.status = "pending";
               needsUpdate = true;
            }
            console.log("Payment is processing - awaiting confirmation:", {
               paymentId: payment.id,
               momTransactionId: kpayResponse.momtransactionid,
               statusDesc: kpayResponse.statusdesc,
               currentStatus: payment.status,
               willUpdate: needsUpdate,
            });
         } else if (statusIdStr === "03") {
            // Check if this is actually a failure or still pending
            // For some payment methods like Airtel, '03' with 'Pending' status description means still processing
            if (
               kpayResponse.statusdesc &&
               kpayResponse.statusdesc.toLowerCase().includes("pending")
            ) {
               // Payment is still pending, but we should update the status to ensure consistency
               if (payment.status !== "pending") {
                  updatedStatus = "pending";
                  updateData.status = "pending";
                  needsUpdate = true;
               } else {
                  updatedStatus = "pending";
               }
               console.log("Payment still pending:", {
                  paymentId: payment.id,
                  statusDesc: kpayResponse.statusdesc,
                  statusId: kpayResponse.statusid,
                  willUpdate: needsUpdate,
               });
            } else {
               // Payment failed or cancelled
               updatedStatus = "failed";
               updateData.status = "failed";
               if (
                  kpayResponse.tid &&
                  kpayResponse.tid !== payment.kpay_transaction_id
               ) {
                  updateData.kpay_transaction_id = String(kpayResponse.tid);
               }
               updateData.failure_reason =
                  kpayResponse.statusdesc || "Payment failed";
               needsUpdate = true;
            }
         } else if (kpayResponse.retcode === 611) {
            // Transaction not found - might indicate a problem
            console.warn("Transaction not found in KPay system:", {
               paymentId: payment.id,
               transactionId: payment.kpay_transaction_id,
               reference: payment.reference,
            });

            return NextResponse.json({
               success: true,
               paymentId: payment.id,
               orderId: payment.order_id || null,
               status: payment.status,
               amount: payment.amount,
               currency: payment.currency,
               reference: payment.reference,
               transactionId: payment.kpay_transaction_id,
               message: "Transaction not found in payment gateway",
               needsUpdate: false,
               error: "Transaction not found in KPay system",
            });
         }

         // Update payment record if status changed
         if (needsUpdate) {
            console.log("Updating payment in database:", {
               paymentId: payment.id,
               updateData: {
                  status: updateData.status,
                  hasKpayResponse: Boolean(updateData.kpay_response),
                  hasMomTxId: Boolean(updateData.kpay_mom_transaction_id),
                  hasCompletedAt: Boolean(updateData.completed_at),
                  hasTid: Boolean(updateData.kpay_transaction_id),
               },
               previousStatus: payment.status,
               newStatus: updatedStatus,
            });

            // Perform the update (don't gate on current status) so session-like
            // payments are always updated immediately when KPay reports completion.
            const { data: updatedPayment, error: updateError } = await supabase
               .from("payments")
               .update(updateData)
               .eq("id", payment.id)
               .select("*")
               .maybeSingle();

            if (updateError) {
               console.error("Failed to update payment status:", {
                  error: updateError.message,
                  code: updateError.code,
                  details: updateError.details,
                  paymentId: payment.id,
               });
               return NextResponse.json(
                  { error: "Failed to update payment status" },
                  { status: 500 }
               );
            }

            console.log("Payment successfully updated in database:", {
               paymentId: payment.id,
               newStatus: updatedStatus,
               dbStatus: updatedPayment?.status,
               hasWebhookData: Boolean(
                  (updatedPayment as any)?.kpay_webhook_data
               ),
            });

            // Update the payment object with the new status for immediate return
            if (updatedPayment) {
               payment.status = updatedPayment.status;
               // copy other known safe fields that may have been updated
               if (
                  typeof (updatedPayment as any).kpay_transaction_id ===
                  "string"
               ) {
                  payment.kpay_transaction_id = (
                     updatedPayment as any
                  ).kpay_transaction_id;
               }
            } else {
               payment.status = updatedStatus;
            }

            // Update only the order.payment_status field so we don't inadvertently change
            // the order lifecycle/status without explicit business logic elsewhere.
            if (updatedStatus === "completed") {
               if (payment.order_id) {
                  const { error: orderUpdateError } = await supabase
                     .from("orders")
                     .update({
                        payment_status: "paid",
                        is_paid: true,
                        updated_at: new Date().toISOString(),
                     })
                     .eq("id", payment.order_id);

                  if (orderUpdateError) {
                     console.error(
                        "Failed to update order.payment_status:",
                        orderUpdateError
                     );
                  }
               } else {
                  // No order associated yet; this is a session-like payment. Finalize will create order later.
                  console.log(
                     "Payment completed for session-like payments row; no order to update yet",
                     {
                        paymentId: payment.id,
                     }
                  );
               }
            }

            if (updatedStatus === "failed") {
               if (payment.order_id) {
                  const { error: orderUpdateError } = await supabase
                     .from("orders")
                     .update({
                        payment_status: "failed",
                        updated_at: new Date().toISOString(),
                     })
                     .eq("id", payment.order_id);

                  if (orderUpdateError) {
                     console.error(
                        "Failed to update order.payment_status on payment failure:",
                        orderUpdateError
                     );
                  }
               } else {
                  console.log(
                     "Payment failed for session-like payments row; no order to update",
                     {
                        paymentId: payment.id,
                     }
                  );
               }
            }
         }

         const p: any = payment as any;
         return NextResponse.json({
            success: true,
            paymentId: payment.id,
            orderId: payment.order_id || null,
            status: updatedStatus,
            amount: payment.amount,
            currency: payment.currency,
            reference: payment.reference,
            checkoutUrl: (() => {
               const raw =
                  p.kpay_response?.url ||
                  p.kpay_response?.redirecturl ||
                  p.kpay_response?.redirectUrl ||
                  null;
               return typeof raw === "string" && raw.trim().length > 0
                  ? raw.trim()
                  : null;
            })(),
            transactionId: payment.kpay_transaction_id,
            message: kpayResponse.statusdesc || `Payment is ${updatedStatus}`,
            needsUpdate: needsUpdate,
            kpayStatus: {
               statusId: kpayResponse.statusid,
               statusDescription: kpayResponse.statusdesc,
               returnCode: kpayResponse.retcode,
               momTransactionId: kpayResponse.momtransactionid,
            },
         });
      } catch (kpayError) {
         console.error("KPay status check failed:", kpayError);

         // Return current status from database if KPay check fails
         return NextResponse.json({
            success: true,
            paymentId: payment.id,
            orderId: payment.order_id || null,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            reference: payment.reference,
            transactionId: payment.kpay_transaction_id,
            message:
               "Unable to check with payment gateway, showing last known status",
            needsUpdate: false,
            error: "Failed to check status with payment gateway",
         });
      }
   } catch (error) {
      console.error("Payment status check error:", error);
      return NextResponse.json(
         { error: "Internal server error" },
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
      console.error("Payment status check error (GET):", error);
      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}
