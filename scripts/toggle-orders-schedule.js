#!/usr/bin/env node
/**
 * Toggle orders_enabled in the site_settings table based on Kigali local time.
 * This script uses the backend API to update orders enabled status.
 *
 * Environment variables required:
 *  - API_BASE_URL or NEXT_PUBLIC_API_BASE or NEXT_PUBLIC_API_URL (defaults to https://api.nihemart.rw/api)
 *  - ADMIN_API_KEY (optional, for service-to-service auth)
 *
 * Notes:
 *  - This implementation calls the backend API to update orders_enabled.
 *  - The backend respects admin overrides and only updates if source is 'schedule'.
 *  - For strict "schedule only" approach, the backend handles this logic.
 */
const API_BASE =
  process.env.API_BASE_URL ||
  (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : null) ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.nihemart.rw/api";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || process.env.ADMIN_ACCOUNT_PASSWORD;
const SERVICE_KEY = process.env.SERVICE_API_KEY || process.env.ADMIN_API_KEY;

// Prefer admin password, fallback to service key for backward compatibility
const AUTH_KEY = ADMIN_PASSWORD || SERVICE_KEY;

if (!AUTH_KEY) {
  console.error(
    "Missing ADMIN_PASSWORD (or ADMIN_ACCOUNT_PASSWORD) or SERVICE_API_KEY environment variable",
  );
  process.exit(1);
}

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
      ")",
    );
    console.log(
      "Schedule disabled?",
      scheduleDisabled,
      "=> desiredEnabled=",
      desiredEnabled,
    );

    // Update via backend API scheduler endpoint
    // This endpoint respects admin overrides and only updates if source is 'schedule'
    const headers = {
      "Content-Type": "application/json",
    };

    // Use admin password if available, otherwise fallback to service key
    if (ADMIN_PASSWORD) {
      headers["X-Admin-Password"] = ADMIN_PASSWORD;
    } else if (SERVICE_KEY) {
      headers["X-Service-Key"] = SERVICE_KEY;
    }

    // Set forceAtScheduledTime to true since this is called at scheduled times (9:00 and 9:30)
    // This ensures the schedule takes precedence over admin overrides at these times
    const updateResponse = await fetch(
      `${API_BASE}/settings/orders-enabled/scheduler`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          enabled: desiredEnabled,
          forceAtScheduledTime: true,
        }),
      },
    );

    if (!updateResponse.ok) {
      const error = await updateResponse
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error(
        "Failed to update orders_enabled:",
        error.error || updateResponse.statusText,
      );
      process.exitCode = 2;
      return;
    }

    const result = await updateResponse.json();

    // Check if update was skipped due to admin override
    if (result.source === "admin") {
      console.log(
        "Admin override present; scheduler did not change orders_enabled.",
      );
      return;
    }

    console.log(
      "Successfully updated orders_enabled:",
      result.enabled,
      "(source=" + result.source + ")",
    );
  } catch (err) {
    console.error("Unexpected error:", err && err.message ? err.message : err);
    process.exitCode = 3;
  }
}

main();
