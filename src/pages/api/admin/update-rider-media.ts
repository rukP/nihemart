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
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   try {
      // Validate admin from Authorization header (Supabase JWT)
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      const { data: userResp, error: userErr } = await supabase.auth.getUser(
         token as any
      );
      if (userErr || !userResp?.user) {
         return res.status(401).json({ error: "Invalid token" });
      }
      const userId = userResp.user.id;

      // Check role in user_roles table
      const { data: roles, error: roleErr } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", userId);
      if (roleErr)
         return res.status(500).json({ error: roleErr.message || roleErr });
      const isAdmin =
         Array.isArray(roles) && roles.some((r: any) => r.role === "admin");
      if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

      const { riderId, imageUrl, location } = req.body || {};
      if (!riderId) return res.status(400).json({ error: "riderId required" });

      const updates: Record<string, any> = {};
      if (typeof imageUrl === "string") updates.image_url = imageUrl;
      if (typeof location === "string") updates.location = location;

      const { data: rider, error } = await supabase
         .from("riders")
         .update(updates)
         .eq("id", riderId)
         .select("*")
         .single();
      if (error) return res.status(500).json({ error: error.message || error });

      return res.status(200).json({ rider });
   } catch (err: any) {
      console.error("update-rider-media failed", err);
      return res.status(500).json({ error: err?.message || "Failed" });
   }
}
