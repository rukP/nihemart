import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // noop
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

   const riderId = String(req.query.rid || "");
   if (!riderId) return res.status(400).json({ error: "rid is required" });

   try {
      const { data: rider, error: rerr } = await supabase
         .from("riders")
         .select("*")
         .eq("id", riderId)
         .maybeSingle();
      if (rerr) return res.status(500).json({ error: rerr.message || rerr });
      if (!rider) return res.status(404).json({ error: "Rider not found" });

      const { data: assignments, error: aerr } = await supabase
         .from("order_assignments")
         .select("*, orders:orders(*)")
         .eq("rider_id", riderId)
         .order("assigned_at", { ascending: false })
         .limit(20);
      if (aerr) return res.status(500).json({ error: aerr.message || aerr });

      return res.status(200).json({ rider, assignments: assignments || [] });
   } catch (err: any) {
      console.error("rider-details failed", err);
      return res.status(500).json({ error: err?.message || "Failed" });
   }
}
