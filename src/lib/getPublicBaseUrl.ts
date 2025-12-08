import type { NextRequest } from "next/server";

/**
 * Build a public-facing base URL for redirects and assets.
 *
 * Assumptions:
 * - This code runs in a deployed environment (no special "dev" behavior).
 * - We never want to expose internal ports (like :3000) in public URLs.
 * - For the nihemart.rw host, we always use the canonical HTTPS URL.
 */
export function getPublicBaseUrl(request: NextRequest): string {
   const envUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

   if (envUrl && envUrl.trim().length > 0) {
      // If an explicit env URL is provided, normalize it so we never leak
      // an internal port like :3000 for the nihemart.rw host, even if the
      // env was misconfigured.
      try {
         const parsed = new URL(envUrl);

         if (parsed.hostname === "nihemart.rw") {
            // Always force the canonical HTTPS URL without a port
            return "https://nihemart.rw";
         }

         // For any other host, keep the URL as-is (minus trailing slash)
         return envUrl.replace(/\/$/, "");
      } catch {
         // If parsing fails, fall back to the raw value without trailing slash
         return envUrl.replace(/\/$/, "");
      }
   }

   const url = new URL(request.url);

   // Hard safety: if the public host is nihemart.rw, always use it without a port,
   // regardless of how the app/server was started.
   if (url.hostname === "nihemart.rw") {
      return "https://nihemart.rw";
   }

   // Generic fallback: strip any port and keep the protocol from the incoming request.
   // This ensures no :3000 or other internal port is ever exposed in public URLs.
   return `${url.protocol}//${url.hostname}`.replace(/\/$/, "");
}
