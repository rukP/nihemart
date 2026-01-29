import type { NextRequest } from "next/server";
import { sendAuthEmail } from "@/lib/email/send";

// Simple endpoint to validate custom SMTP sending via Nodemailer
// POST { to: string, type?: 'recovery' | 'signup', link?: string }
export async function POST(req: NextRequest) {
   try {
      const body = await req.json().catch(() => ({}));
      const to = String(body?.to || "").trim();
      const type = (body?.type as "recovery" | "signup") || "signup";
      const testLink =
         body?.link ||
         (type === "recovery"
            ? "https://example.com/reset"
            : "https://example.com/confirm");

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!to) {
         return new Response(JSON.stringify({ error: "Missing 'to' email" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
         });
      }

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
         return new Response(
            JSON.stringify({
               ok: false,
               error: "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and optional EMAIL_FROM.",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
         );
      }

      const result = await sendAuthEmail(to, type, testLink);
      if (!result.ok) {
         return new Response(JSON.stringify(result), {
            status: 500,
            headers: { "Content-Type": "application/json" },
         });
      }

      return new Response(JSON.stringify({ ok: true, info: result.info }), {
         status: 200,
         headers: { "Content-Type": "application/json" },
      });
   } catch (err: any) {
      return new Response(
         JSON.stringify({ ok: false, error: err?.message || String(err) }),
         { status: 500, headers: { "Content-Type": "application/json" } }
      );
   }
}
