import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { buildOrderConfirmationEmail } from "@/lib/email/notifications";

const supabase =
   process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL,
           process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : (null as any);

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
   }
   if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" });
   }
   const { order } = req.body;
   if (!order || !order.customer_email) {
      return res.status(400).json({ error: "Missing order or customer_email" });
   }
   try {
      const { subject, html } = buildOrderConfirmationEmail({
         order_id: order.id,
         order_number: order.order_number,
         items: order.items,
         total: order.total,
         currency: order.currency,
         customer_name: order.customer_first_name || order.customer_name,
         delivery_address: order.delivery_address,
         delivery_time: order.delivery_time,
         schedule_notes: order.schedule_notes,
      });
      const result = await sendEmail(order.customer_email, subject, html);
      return res.status(200).json(result);
   } catch (e: any) {
      return res.status(500).json({
         error: e.message || "Failed to send order confirmation email",
      });
   }
}
