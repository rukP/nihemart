import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/utils/supabase/service";
import { initializeKPayService } from "@/lib/services/kpay";
import { createOrder } from "@/integrations/supabase/orders";
import { logger } from "@/lib/logger";

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

      const supabase = createServiceSupabaseClient();

      // Find matching payments row (session-like payment with order_id null)
      let payment: any = null;
      let paymentErr: any = null;

      if (reference) {
         const res = await supabase
            .from("payments")
            .select("*")
            .eq("reference", reference)
            .limit(1)
            .maybeSingle();
         payment = res.data;
         paymentErr = res.error;
      }

      if (!payment && transactionId) {
         const res = await supabase
            .from("payments")
            .select("*")
            .eq("kpay_transaction_id", transactionId)
            .limit(1)
            .maybeSingle();
         payment = res.data;
         paymentErr = res.error || paymentErr;
      }

      if (paymentErr) {
         console.error(
            "Failed to lookup payments row for finalize:",
            paymentErr
         );
      }

      if (!payment) {
         return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
         );
      }

      // We only finalize session-like payments that don't have an order yet
      if (payment.order_id) {
         return NextResponse.json(
            { success: true, orderId: payment.order_id },
            { status: 200 }
         );
      }

      if (payment.status !== "completed") {
         // Attempt to reconcile with KPay directly in case webhook/status
         // update hasn't arrived yet. If KPay shows the payment completed,
         // persist that and continue; otherwise return 409.
         try {
            const kpayService = initializeKPayService();
            const kpayResponse = await kpayService.checkPaymentStatus({
               transactionId: payment.kpay_transaction_id,
               orderReference: payment.reference,
            });

            const statusIdStr = String(kpayResponse?.statusid || "").padStart(
               2,
               "0"
            );

            if (statusIdStr === "01") {
               // Persist KPay completion info on payments row
               const updateData: any = {
                  updated_at: new Date().toISOString(),
                  status: "completed",
                  completed_at: new Date().toISOString(),
               };
               if (kpayResponse.momtransactionid) {
                  updateData.kpay_mom_transaction_id =
                     kpayResponse.momtransactionid;
               }
               if (kpayResponse.tid) {
                  updateData.kpay_transaction_id = kpayResponse.tid;
               }
               if (kpayResponse) {
                  updateData.kpay_response = kpayResponse;
               }

               const { error: payUpdErr } = await supabase
                  .from("payments")
                  .update(updateData)
                  .eq("id", payment.id);

               if (payUpdErr) {
                  logger.error(
                     "api",
                     "Failed to update payments row from KPay reconciliation",
                     payUpdErr
                  );
               } else {
                  // reflect the update locally
                  payment.status = "completed";
               }
            } else {
               return NextResponse.json(
                  { error: "Payment not yet completed" },
                  { status: 409 }
               );
            }
         } catch (err) {
            console.error("KPay reconciliation failed in finalize:", err);
            // If we can't reach KPay, return the last-known DB state so the
            // client can keep polling instead of treating this as a hard error.
            return NextResponse.json(
               {
                  success: true,
                  paymentId: payment.id,
                  status: payment.status,
                  canCreateOrder:
                     payment.status === "completed" && !payment.order_id,
                  message:
                     "Unable to check with payment gateway, showing last known status",
               },
               { status: 200 }
            );
         }
      }

      // Do NOT create an order here. Finalize confirms payment status and
      // allows the client to explicitly call the create-order endpoint when
      // the customer clicks "Create order" in the UI.
      return NextResponse.json({
         success: true,
         paymentId: payment.id,
         status: payment.status,
         canCreateOrder: payment.status === "completed" && !payment.order_id,
         message:
            payment.status === "completed"
               ? "Payment completed."
               : "Payment is not completed yet",
      });
   } catch (error) {
      console.error("Finalize error:", error);
      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}

export async function GET() {
   return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
