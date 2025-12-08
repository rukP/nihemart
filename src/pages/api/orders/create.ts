import type { NextApiRequest, NextApiResponse } from "next";
import { createOrder } from "@/integrations/supabase/orders";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
   }

   const payload = req.body;
   if (!payload || !payload.order || !payload.items) {
      return res.status(400).json({ error: "Invalid order payload" });
   }

   try {
      // Call the server-side createOrder helper which will use the service role
      // Supabase client when executed in Node (server environment).
      const result = await createOrder(payload);
      return res.status(200).json(result);
   } catch (err: any) {
      console.error("/api/orders/create error:", err);
      const message = err?.message || "Failed to create order";
      // If the error is a structured object from Supabase include its message
      return res.status(500).json({ error: message });
   }
}
