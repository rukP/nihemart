#!/usr/bin/env node
/**
 * Toggle orders_enabled in the site_settings table based on Kigali local time.
 * This script uses the Supabase service role key and will upsert the
 * `orders_enabled` key to the appropriate boolean value.
 *
 * Environment variables required:
 *  - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *
 * Notes:
 *  - This implementation writes the `orders_enabled` key to the DB. That
 *    becomes an "admin"-style override. If you prefer a strict "schedule only"
 *    approach (no DB writes) you can delete the row instead or call the API
 *    with `{ enabled: 'auto' }` when transitioning back to schedule mode.
 */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL =
   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
   console.error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables"
   );
   process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
   auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
   try {
      // Kigali offset is UTC+2 year-round
      const KIGALI_OFFSET_HOURS = 2;
      const OFFSET_MS = KIGALI_OFFSET_HOURS * 60 * 60 * 1000;

      const nowMs = Date.now();
      const kigaliMs = nowMs + OFFSET_MS;
      const kigaliDate = new Date(kigaliMs);
      const kHour = kigaliDate.getUTCHours();
      const kMinute = kigaliDate.getUTCMinutes();
      const minuteOfDay = kHour * 60 + kMinute;

      // Off-hours: 21:30 to 09:00 local Kigali
      const offStart = 21 * 60 + 30; // 1290
      const offEnd = 9 * 60; // 540

      const scheduleDisabled = minuteOfDay >= offStart || minuteOfDay < offEnd;
      const desiredEnabled = !scheduleDisabled;

      console.log(
         "Kigali local time:",
         kigaliDate.toISOString(),
         "(hour",
         kHour,
         ")"
      );
      console.log(
         "Schedule disabled?",
         scheduleDisabled,
         "=> desiredEnabled=",
         desiredEnabled
      );

      // Respect explicit admin override: if there is an existing source row
      // set to 'admin', do not overwrite it. Otherwise upsert the boolean
      // and mark the source as 'schedule' so future runs know this was
      // written by the scheduler.
      const { data: sourceRows, error: readError } = await supabase
         .from("site_settings")
         .select("key, value")
         .eq("key", "orders_enabled_source");

      if (readError) {
         console.error(
            "Failed to read orders_enabled_source:",
            readError.message || readError
         );
         process.exitCode = 2;
         return;
      }

      const currentSource =
         Array.isArray(sourceRows) && sourceRows.length > 0
            ? sourceRows[0].value
            : null;
      if (currentSource === "admin") {
         console.log(
            "Admin override present; scheduler will not change orders_enabled."
         );
         return;
      }

      // Upsert both the boolean and the source marker
      const { error } = await supabase.from("site_settings").upsert(
         [
            { key: "orders_enabled", value: desiredEnabled },
            { key: "orders_enabled_source", value: "schedule" },
         ],
         { onConflict: "key" }
      );

      if (error) {
         console.error(
            "Failed to update site_settings:",
            error.message || error
         );
         process.exitCode = 2;
         return;
      }

      console.log(
         "Successfully upserted orders_enabled:",
         desiredEnabled,
         "(source=schedule)"
      );
   } catch (err) {
      console.error(
         "Unexpected error:",
         err && err.message ? err.message : err
      );
      process.exitCode = 3;
   }
}

main();
