import type { NextApiRequest, NextApiResponse } from "next";
import { sendAuthEmail, sendEmail } from "@/lib/email/send";
import { buildOrderConfirmationEmail } from "@/lib/email/notifications";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
   }

   const { email, type, actionLink, meta, subject, html, userId } = req.body;
   if (!email || !type) {
      return res.status(400).json({ error: "Missing required fields" });
   }

   try {
      if (type === "signup" || type === "recovery") {
         if (!actionLink && type === "recovery") {
            return res
               .status(400)
               .json({ error: "Missing actionLink for auth email" });
         }
         const result = await sendAuthEmail(
            email,
            type,
            actionLink || "",
            userId
         );
         return res.status(200).json(result);
      }
      if (type === "order_confirmation") {
         if (!meta) {
            return res
               .status(400)
               .json({ error: "Missing meta for order confirmation" });
         }
         const { subject, html } = buildOrderConfirmationEmail(meta);
         const result = await sendEmail(email, subject, html);
         return res.status(200).json(result);
      }
      // Allow sending custom emails
      if (type === "custom") {
         if (!subject || !html) {
            return res
               .status(400)
               .json({ error: "Missing subject or html for custom email" });
         }
         const result = await sendEmail(email, subject, html);
         return res.status(200).json(result);
      }
      return res.status(400).json({ error: "Unknown email type" });
   } catch (error: any) {
      return res
         .status(500)
         .json({ error: error.message || "Failed to send email" });
   }
}
