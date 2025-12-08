import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const _SUPABASE_URL =
   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase =
   _SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : (null as any);

function getKigaliScheduleState() {
   const KIGALI_OFFSET_HOURS = 2;
   const OFFSET_MS = KIGALI_OFFSET_HOURS * 60 * 60 * 1000;

   const nowMs = Date.now();
   const kigaliMs = nowMs + OFFSET_MS;
   const kigaliDate = new Date(kigaliMs);
   const kHour = kigaliDate.getUTCHours();
   const kMinute = kigaliDate.getUTCMinutes();
   const minuteOfDay = kHour * 60 + kMinute;

   const offStart = 21 * 60 + 30;
   const offEnd = 9 * 60;
   const scheduleDisabled = minuteOfDay >= offStart || minuteOfDay < offEnd;

   const kYear = kigaliDate.getUTCFullYear();
   const kMonth = kigaliDate.getUTCMonth();
   const kDate = kigaliDate.getUTCDate();
   let nextToggleAt: Date | null = null;
   if (scheduleDisabled) {
      const addDays = minuteOfDay < offEnd ? 0 : 1;
      const nextLocalUtcMs = Date.UTC(
         kYear,
         kMonth,
         kDate + addDays,
         9,
         0,
         0,
         0
      );
      nextToggleAt = new Date(nextLocalUtcMs - OFFSET_MS);
   } else {
      const addDays = minuteOfDay >= offStart ? 1 : 0;
      const nextLocalUtcMs = Date.UTC(
         kYear,
         kMonth,
         kDate + addDays,
         21,
         30,
         0,
         0
      );
      nextToggleAt = new Date(nextLocalUtcMs - OFFSET_MS);
   }

   return { scheduleDisabled, nextToggleAt };
}

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (!supabase) {
      return res
         .status(500)
         .json({
            error: "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured on the server.",
         });
   }

   try {
      if (req.method === "GET") {
         const { data, error } = await supabase
            .from("site_settings")
            .select("key, value")
            .in("key", ["orders_enabled", "orders_enabled_source"]);

         if (error) throw error;
         const rows: any[] = data || [];
         const enabledRow = rows.find((r) => r.key === "orders_enabled");
         const sourceRow = rows.find((r) => r.key === "orders_enabled_source");
         const val = enabledRow?.value;
         const explicitSource = sourceRow?.value ?? null;

         const adminHasSetting = typeof val !== "undefined" && val !== null;
         const adminEnabled = adminHasSetting
            ? val === true || String(val) === "true" || (val && val === "true")
            : null;

         const { scheduleDisabled, nextToggleAt } = getKigaliScheduleState();
         const enabled =
            adminEnabled !== null ? Boolean(adminEnabled) : !scheduleDisabled;

         let message: string | null = null;
         const source =
            explicitSource || (adminEnabled !== null ? "admin" : "schedule");
         if (!enabled) {
            if (adminEnabled === null && scheduleDisabled) {
               message =
                  "We are currently not working, please order again at 9 am";
            } else {
               message =
                  "We are currently not allowing orders, please try again later";
            }
         }

         return res
            .status(200)
            .json({
               enabled: Boolean(enabled),
               adminEnabled,
               scheduleDisabled: Boolean(scheduleDisabled),
               message,
               source,
               nextToggleAt: nextToggleAt ? nextToggleAt.toISOString() : null,
            });
      }

      if (req.method === "POST") {
         const { enabled } = req.body || {};

         if (enabled === "auto") {
            const { error } = await supabase
               .from("site_settings")
               .delete()
               .in("key", ["orders_enabled", "orders_enabled_source"]);
            if (error) throw error;
            const { scheduleDisabled } = getKigaliScheduleState();
            return res
               .status(200)
               .json({
                  enabled: !scheduleDisabled,
                  adminEnabled: null,
                  scheduleDisabled: Boolean(scheduleDisabled),
                  message: scheduleDisabled
                     ? "We are currently not working, please order again at 9 am"
                     : null,
                  source: "schedule",
                  nextToggleAt: null,
               });
         }

         if (typeof enabled !== "boolean")
            return res
               .status(400)
               .json({ error: "enabled must be boolean or 'auto'" });

         const { error } = await supabase.from("site_settings").upsert(
            [
               { key: "orders_enabled", value: enabled },
               { key: "orders_enabled_source", value: "admin" },
            ],
            { onConflict: "key" }
         );
         if (error) throw error;

         return res
            .status(200)
            .json({
               enabled: Boolean(enabled),
               adminEnabled: Boolean(enabled),
               scheduleDisabled: false,
               message: enabled
                  ? null
                  : "We are currently not allowing orders, please try again later",
               source: "admin",
               nextToggleAt: null,
            });
      }

      if (req.method === "DELETE") {
         const { error } = await supabase
            .from("site_settings")
            .delete()
            .in("key", ["orders_enabled", "orders_enabled_source"]);
         if (error) throw error;
         const { scheduleDisabled } = getKigaliScheduleState();
         return res
            .status(200)
            .json({
               enabled: !scheduleDisabled,
               adminEnabled: null,
               scheduleDisabled: Boolean(scheduleDisabled),
               message: scheduleDisabled
                  ? "We are currently not working, please order again at 9 am"
                  : null,
               source: "schedule",
               nextToggleAt: null,
            });
      }

      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      res.status(405).end("Method Not Allowed");
   } catch (err: any) {
      console.error("orders-enabled handler error:", err);
      res.status(500).json({ error: err?.message || "Unknown error" });
   }
}
