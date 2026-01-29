import type { NextApiRequest, NextApiResponse } from "next";
import { respondToAssignment } from "@/lib/api/riders";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

   const { assignmentId, status } = req.body;
   if (!assignmentId || !status)
      return res
         .status(400)
         .json({ error: "assignmentId and status required" });

   try {
      const resp = await respondToAssignment(assignmentId, status);
      return res.status(200).json({ assignment: resp });
   } catch (err: any) {
      console.error("respond-assignment failed", err);
      // Map common custom errors to proper HTTP statuses
      if (err && err.code === "ASSIGNMENT_NOT_FOUND") {
         return res
            .status(404)
            .json({ error: { code: err.code, message: err.message } });
      }

      return res
         .status(500)
         .json({
            error: {
               code: err.code || "INTERNAL_ERROR",
               message: err.message || "Failed to respond to assignment",
            },
         });
   }
}
