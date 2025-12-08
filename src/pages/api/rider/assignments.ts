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
   // Require a valid supabase access token in the Authorization header. This
   // endpoint is intended for rider clients; admin UIs should use the
   // `/api/admin/rider-assignments` batched endpoint instead.
   const authHeader = String(req.headers.authorization || "");
   const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
   if (!token)
      return res.status(401).json({ error: "Authorization token required" });

   try {
      // Validate token and retrieve user
      const { data: userData, error: userErr } = await supabase.auth.getUser(
         token as string as any
      );
      if (userErr || !userData?.user) {
         console.error("Invalid token for rider assignments", userErr);
         return res.status(401).json({ error: "Invalid token" });
      }
      const user = userData.user;

      const riderId = String(req.query.riderId || "");
      if (!riderId)
         return res.status(400).json({ error: "riderId is required" });

      // Ensure the rider exists and is owned by the authenticated user. This
      // prevents arbitrary clients (including admin pages) from enumerating
      // assignments for other riders: admins should use the admin batch API.
      const { data: riderRow, error: riderErr } = await supabase
         .from("riders")
         .select("id, user_id")
         .eq("id", riderId)
         .maybeSingle();
      if (riderErr) {
         console.error("Error fetching rider for auth check:", riderErr);
         return res.status(500).json({ error: riderErr.message || riderErr });
      }
      if (!riderRow) return res.status(404).json({ error: "Rider not found" });
      if (!riderRow.user_id || riderRow.user_id !== user.id) {
         return res.status(403).json({ error: "Forbidden" });
      }

      const { data, error } = await supabase
         .from("order_assignments")
         .select("*, orders:orders(*, items:order_items(*))")
         .eq("rider_id", riderId)
         .order("assigned_at", { ascending: false });

      if (error) {
         console.error("Error fetching assignments (service):", error);
         return res.status(500).json({ error: error.message || error });
      }

      return res.status(200).json({ assignments: data || [] });
   } catch (err: any) {
      console.error("assignments handler failed", err);
      return res.status(500).json({ error: err?.message || "Failed" });
   }
}
