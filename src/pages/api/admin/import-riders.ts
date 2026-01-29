import type { NextApiRequest, NextApiResponse } from "next";
import { createRider } from "@/lib/api/riders";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

   const { rows } = req.body || {};
   if (!Array.isArray(rows))
      return res
         .status(400)
         .json({ error: "Invalid payload, expected rows array" });

   const results: any[] = [];

   for (const r of rows) {
      const full_name = r.full_name || r.name || r.fullName || null;
      const phone = r.phone || null;
      const vehicle = r.vehicle || null;

      try {
         // Create rider via backend API
         // Note: User creation with email/password should be handled via auth API separately
         const rider = await createRider({
            fullName: full_name,
            phone,
            vehicle,
         });
         results.push({ row: r, rider });
      } catch (err: any) {
         results.push({ row: r, error: err?.message || String(err) });
      }
   }

   return res.status(200).json({ imported: results.length, results });
}
