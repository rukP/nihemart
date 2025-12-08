import type { NextApiRequest, NextApiResponse } from "next";
import { updateRider } from "@/integrations/supabase/riders";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
   const { riderId } = req.query;
   const { updates } = req.body;
   if (!riderId || typeof riderId !== "string")
      return res.status(400).json({ error: "Missing riderId" });
   try {
      const rider = await updateRider(riderId, updates || {});
      return res.status(200).json({ rider });
   } catch (err: any) {
      console.error(err);
      return res
         .status(500)
         .json({ error: err?.message || "Failed to update rider" });
   }
}
