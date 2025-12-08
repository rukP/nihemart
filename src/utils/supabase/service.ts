import { createClient } from "@supabase/supabase-js";

export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for service client");
  }
  if (!serviceKey) {
    // Fallback to anon key (RLS will still apply). Prefer setting SUPABASE_SERVICE_ROLE_KEY in server env.
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anon) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY for service client");
    }
    console.warn("Using anon key for service client; set SUPABASE_SERVICE_ROLE_KEY to bypass RLS.");
    return createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const supabase = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabase;
}