import { setInterval as setIntervalNode } from "timers";
import type { NextRequest } from "next/server";
import { sendEmail } from "@/lib/email/send";

// Simple in-memory rate limiter (per-process). For multi-instance deployments
// consider replacing with a centralized store like Redis.
type RateEntry = { count: number; first: number };
const _rateStore: Map<string, RateEntry> = new Map();

const RATE_CONFIG = {
   ip: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 requests per hour per IP
   email: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 requests per hour per email
};

function isRateLimited(key: string, limit: { windowMs: number; max: number }) {
   const now = Date.now();
   const existing = _rateStore.get(key);
   if (!existing) {
      _rateStore.set(key, { count: 1, first: now });
      return { limited: false };
   }
   // If window expired, reset
   if (now - existing.first > limit.windowMs) {
      _rateStore.set(key, { count: 1, first: now });
      return { limited: false };
   }
   existing.count += 1;
   _rateStore.set(key, existing);
   if (existing.count > limit.max) {
      const retryAfterSec = Math.ceil(
         (limit.windowMs - (now - existing.first)) / 1000
      );
      return { limited: true, retryAfterSec } as const;
   }
   return { limited: false };
}

// Periodic cleanup to avoid unbounded memory growth
const _cleanupInterval = setIntervalNode(() => {
   const now = Date.now();
   for (const [k, v] of _rateStore.entries()) {
      // Find which limit applies (email vs ip) by key prefix
      const limit = k.startsWith("email:")
         ? RATE_CONFIG.email.windowMs
         : RATE_CONFIG.ip.windowMs;
      if (now - v.first > limit * 2) _rateStore.delete(k);
   }
}, 60 * 60 * 1000);
// In some TypeScript lib configurations setInterval is typed as number; call unref if available.
if (typeof (_cleanupInterval as any)?.unref === "function") {
   (_cleanupInterval as any).unref();
}

// POST { name, email, subject, message }
export async function POST(req: NextRequest) {
   try {
      const body = await req.json().catch(() => ({} as any));
      const name = String(body?.name || "").trim();
      const email = String(body?.email || "").trim();
      const subject = String(body?.subject || "").trim();
      const message = String(body?.message || "").trim();

      if (!name || !email || !message) {
         return new Response(
            JSON.stringify({
               ok: false,
               error: "Missing name, email or message",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
         );
      }

      // Rate limiting: per-IP and per-email
      const forwarded = req.headers.get("x-forwarded-for") || "";
      const ip = (
         forwarded.split(",")[0] ||
         req.headers.get("x-real-ip") ||
         "unknown"
      ).trim();
      const ipKey = `ip:${ip}`;
      const emailKey = `email:${email.toLowerCase()}`;
      const ipCheck = isRateLimited(ipKey, RATE_CONFIG.ip);
      if (ipCheck.limited) {
         return new Response(
            JSON.stringify({
               ok: false,
               error: "Too many requests from this IP",
            }),
            {
               status: 429,
               headers: {
                  "Content-Type": "application/json",
                  "Retry-After": String((ipCheck as any).retryAfterSec),
               },
            }
         );
      }
      const emailCheck = isRateLimited(emailKey, RATE_CONFIG.email);
      if (emailCheck.limited) {
         return new Response(
            JSON.stringify({
               ok: false,
               error: "Too many requests for this email",
            }),
            {
               status: 429,
               headers: {
                  "Content-Type": "application/json",
                  "Retry-After": String((emailCheck as any).retryAfterSec),
               },
            }
         );
      }

      // Use explicit support email as default for incoming contact form messages
      const to =
         process.env.CONTACT_EMAIL ||
         process.env.SUPPORT_EMAIL ||
         "support@nihemart.rw";
      const from = process.env.EMAIL_FROM || `no-reply@nihemart.rw`;

      const subjectLine = `Contact form: ${
         subject || "Message from site"
      } — ${name}`;

      const appName = process.env.NEXT_PUBLIC_APP_NAME || "NiheMart";
      const logoUrl =
         process.env.NEXT_PUBLIC_LOGO_URL ||
         (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") +
            "/logo.png";
      const primaryBlue = "#1DB4E7";
      const accentOrange = "#FF6B35";

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(
         subjectLine
      )}</title></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f5"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08)"><tr><td style="padding:28px 28px 20px 28px;text-align:center;background:linear-gradient(135deg, ${primaryBlue} 0%, #1ac4f7 100%)">${
         logoUrl
            ? `<Image src="${logoUrl}" alt="${appName}" width="80" height="80" style="display:inline-block;border-radius:16px;background:#ffffff;padding:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15)" />`
            : `<div style="display:inline-block;width:80px;height:80px;border-radius:16px;background:#ffffff;line-height:80px;font-size:36px;font-weight:700;color:${primaryBlue}">N</div>`
      }<div style="font-size:20px;font-weight:700;color:#ffffff;margin-top:12px">${appName.replace(
         /\s+/g,
         ""
      )}<span style="color:${accentOrange}">Mart</span></div></td></tr><tr><td style="padding:28px">${`<div style="font-size:18px;color:#111;font-weight:700;margin-bottom:8px">New contact form submission</div>
          <div style="color:#444;margin-bottom:12px">You have received a new message via the website contact form. Reply using your inbox or click reply to respond to the sender.</div>
          <table style=\"width:100%;font-size:14px;margin-bottom:12px\"><tr><td style=\"padding:6px 0;color:#333;width:110px\"><strong>Name</strong></td><td style=\"padding:6px 0;color:#555\">${escapeHtml(
             name
          )}</td></tr><tr><td style=\"padding:6px 0;color:#333\"><strong>Email</strong></td><td style=\"padding:6px 0;color:#555\">${escapeHtml(
         email
      )}</td></tr><tr><td style=\"padding:6px 0;color:#333\"><strong>Subject</strong></td><td style=\"padding:6px 0;color:#555\">${escapeHtml(
         subject || "(none)"
      )}</td></tr></table>
          <div style=\"padding:12px;border-radius:8px;background:#f8f9fb;border:1px solid #eef2f6;\"><pre style=\"white-space:pre-wrap;margin:0;font-family:inherit;color:#222\">${escapeHtml(
             message
          )}</pre></div>
          <div style=\"margin-top:14px;font-size:12px;color:#888\">Sent: ${new Date().toLocaleString()}</div>`}</td></tr><tr><td style="background:linear-gradient(90deg, ${primaryBlue} 0%, ${accentOrange} 100%);padding:14px 28px;text-align:center"><div style="font-size:12px;color:#ffffff;font-weight:500">© ${new Date().getFullYear()} ${appName}</div></td></tr></table></td></tr></table></body></html>`;

      // Use shared sendEmail helper (it will validate SMTP envs)
      try {
         // include reply-to so admins can reply directly to the submitter
         const res = await sendEmail(to, subjectLine, html, { replyTo: email });
         if (!res || (res as any).ok === false) {
            console.warn("Contact sendEmail failed:", res);
            return new Response(
               JSON.stringify({
                  ok: false,
                  error: res?.warning || "Failed to send",
               }),
               {
                  status: 500,
                  headers: { "Content-Type": "application/json" },
               }
            );
         }

         return new Response(
            JSON.stringify({ ok: true, info: (res as any).info || null }),
            {
               status: 200,
               headers: { "Content-Type": "application/json" },
            }
         );
      } catch (sendErr: any) {
         console.error("/api/contact/send sendEmail error:", sendErr);
         return new Response(
            JSON.stringify({ ok: false, error: String(sendErr) }),
            {
               status: 502,
               headers: { "Content-Type": "application/json" },
            }
         );
      }
   } catch (err: any) {
      console.error("/api/contact/send error:", err);
      return new Response(
         JSON.stringify({ ok: false, error: err?.message || String(err) }),
         {
            status: 500,
            headers: { "Content-Type": "application/json" },
         }
      );
   }
}

function escapeHtml(s: string) {
   return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}
