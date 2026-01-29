import type { NextApiRequest, NextApiResponse } from "next";
import { createRider } from "@/lib/api/riders";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

   const {
      fullName,
      full_name,
      phone,
      vehicle,
      email,
      password,
      active,
      image_url,
      location,
   } = req.body;
   
   try {
      // Create rider via backend API
      // If email and password are provided, they will be used to create a user account
      const rider = await createRider({
         email,
         password,
         fullName: fullName || full_name,
         phone,
         vehicle,
         active,
         imageUrl: image_url,
         location,
      });

      return res.status(200).json({ rider });
   } catch (err: any) {
      console.error("create-rider failed", err);
      return res
         .status(500)
         .json({ error: err.message || "Failed to create rider" });
   }
}
