import type { NextRequest } from "next/server";
import {
   buildOrderConfirmationEmail,
   buildOrderDeliveredEmail,
   OrderMeta,
} from "@/lib/email/notifications";
import { sendEmail } from "@/lib/email/send";

// POST { to: string, kind: 'order_confirmation' | 'order_delivered', meta: OrderMeta }
export async function POST(req: NextRequest) {
   try {
      const body = await req.json();
      const to = String(body?.to || "").trim();
      const kind = String(body?.kind || "").trim();
      const meta = (body?.meta || {}) as OrderMeta;

      if (!to || !kind) {
         return new Response(
            JSON.stringify({ error: "Missing 'to' or 'kind'" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
         );
      }

      let payload: { subject: string; html: string } | null = null;
      if (kind === "order_confirmation") {
         payload = buildOrderConfirmationEmail(meta);
      } else if (kind === "order_delivered") {
         payload = buildOrderDeliveredEmail(meta);
      } else {
         return new Response(JSON.stringify({ error: "Unsupported kind" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
         });
      }

      const sent = await sendEmail(to, payload.subject, payload.html);
      if (!sent.ok) {
         return new Response(JSON.stringify(sent), {
            status: 500,
            headers: { "Content-Type": "application/json" },
         });
      }

      return new Response(JSON.stringify({ ok: true, info: sent.info }), {
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
