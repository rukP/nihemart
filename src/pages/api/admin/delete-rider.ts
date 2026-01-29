import type { NextApiRequest, NextApiResponse } from "next";
import { deleteRider } from "@/lib/api/riders";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

   const { riderId } = req.body || {};
   if (!riderId) return res.status(400).json({ error: "riderId required" });
   try {
      await deleteRider(riderId);
      return res.status(200).json({ deleted: true });
   } catch (err: any) {
      console.error("delete-rider failed", err);
      return res.status(500).json({ error: err?.message || String(err) });
   }
}
