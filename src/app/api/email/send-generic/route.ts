import type { NextRequest } from "next/server";
import { sendEmail } from "@/lib/email/send";

export async function POST(req: NextRequest) {
   try {
      const body = await req.json();
      const { to, subject, html } = body as {
         to?: string;
         subject?: string;
         html?: string;
      };

      if (!to || !subject || !html) {
         return new Response(
            JSON.stringify({ error: "Missing to, subject or html" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
         );
      }

      // Attempt to send email server-side
      try {
         const res = await sendEmail(to, subject, html);
         if (!res.ok) {
            return new Response(
               JSON.stringify({ ok: false, error: res.warning }),
               {
                  status: 500,
                  headers: { "Content-Type": "application/json" },
               }
            );
         }
         return new Response(JSON.stringify({ ok: true, info: res.info }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
         });
      } catch (err: any) {
         console.error("/api/email/send-generic sendEmail error:", err);
         return new Response(
            JSON.stringify({ ok: false, error: String(err) }),
            {
               status: 502,
               headers: { "Content-Type": "application/json" },
            }
         );
      }
   } catch (err: any) {
      console.error("/api/email/send-generic error:", err);
      return new Response(
         JSON.stringify({ error: err?.message || String(err) }),
         {
            status: 500,
            headers: { "Content-Type": "application/json" },
         }
      );
   }
}
