import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // Handler will return error if env missing
}

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
   if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   try {
      const idsParam = String(req.query.ids || "").trim();
      if (!idsParam)
         return res
            .status(400)
            .json({ error: "ids query parameter is required" });

      const ids = idsParam
         .split(",")
         .map((s) => s.trim())
         .filter(Boolean);
      if (ids.length === 0)
         return res.status(400).json({ error: "No rider ids provided" });

      // Fetch recent assignments for the given rider ids, ordered newest first.
      // We'll pick the first assignment per rider on the server response.
      const { data, error } = await supabase
         .from("order_assignments")
         .select("*, orders:orders(id, total, delivery_address, subtotal)")
         .in("rider_id", ids)
         .order("assigned_at", { ascending: false });

      if (error) {
         console.error("Error fetching rider assignments (admin):", error);
         return res.status(500).json({ error: error.message || error });
      }

      const assignments = (data || []) as any[];
      const map: Record<string, any> = {};
      for (const a of assignments) {
         const rid = a.rider_id;
         if (!map[rid]) map[rid] = a; // first (newest) wins
      }

      return res.status(200).json({ assignments: map });
   } catch (err: any) {
      console.error("rider-assignments handler failed", err);
      return res.status(500).json({ error: err?.message || "Failed" });
   }
}
