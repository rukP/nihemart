import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // no-op
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
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

   const { ids, userId, role } = req.body || {};

   try {
      if (ids && Array.isArray(ids) && ids.length > 0) {
         const { data, error } = await supabase
            .from("notifications")
            .delete()
            .in("id", ids)
            .select();
         if (error)
            return res.status(500).json({ error: error.message || error });
         return res.status(200).json({ deleted: data });
      }

      if (userId) {
         const { data, error } = await supabase
            .from("notifications")
            .delete()
            .eq("recipient_user_id", userId)
            .select();
         if (error)
            return res.status(500).json({ error: error.message || error });
         return res.status(200).json({ deleted: data });
      }

      if (role) {
         const { data, error } = await supabase
            .from("notifications")
            .delete()
            .eq("recipient_role", role)
            .select();
         if (error)
            return res.status(500).json({ error: error.message || error });
         return res.status(200).json({ deleted: data });
      }

      return res
         .status(400)
         .json({
            error: "Provide ids array or userId or role to clear notifications",
         });
   } catch (err: any) {
      console.error("notifications clear error", err);
      return res.status(500).json({ error: err.message || err });
   }
}
