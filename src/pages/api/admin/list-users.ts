import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  // avoid throwing at module init
}
const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    : (null as any);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });
  if (!supabase) {
    return res.status(500).json({
      error:
        "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured on the server.\n" +
        "For local testing add SUPABASE_SERVICE_ROLE_KEY to your .env.local (get it from Supabase Dashboard > Project Settings > API > Service Key). Do NOT commit the real key.",
    });
  }
  try {
    // Debug: log incoming query and URL to help diagnose why `limit` is set
    console.debug("list-users incoming url:", req.url, "query:", req.query);
    // Parse pagination params (defaults). If `limit` is not provided,
    // return all users (no pagination).
    const page = Math.max(1, Number(req.query.page || 1));
    const limitParam = req.query.limit;

    // Parse date range filter parameters
    const fromDate = req.query.from_date
      ? new Date(String(req.query.from_date))
      : null;
    const toDate = req.query.to_date
      ? new Date(String(req.query.to_date))
      : null;

    // Parse min/max order count and spend filters
    const minOrders = req.query.min_orders
      ? Number(req.query.min_orders)
      : null;
    const maxOrders = req.query.max_orders
      ? Number(req.query.max_orders)
      : null;
    const minSpend = req.query.min_spend ? Number(req.query.min_spend) : null;
    const maxSpend = req.query.max_spend ? Number(req.query.max_spend) : null;

    // Search query (simple case-insensitive match against name/email/phone)
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : "";

    // Parse role filter parameter
    const roleFilter = req.query.role ? String(req.query.role) : null;

    // Run roles, auth users and aggregates in parallel for speed
    const [profilesRes, rolesRes, authUsersRes, ordersAggRes] =
      (await Promise.all([
        // fetch profiles (we'll exclude riders in JS to avoid complex subquery
        // expressions that can behave inconsistently across runtimes)
        supabase.from("profiles").select("id, full_name, phone, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("users").select("id, email, created_at"),
        // Call RPC that aggregates orders per user (see migration)
        supabase.rpc("get_orders_aggregate_per_user"),
      ] as any)) as any;

    // Log Supabase response summaries to help diagnose empty results
    try {
      console.debug("list-users supabase results:", {
        profilesError: profilesRes?.error,
        profilesCount: Array.isArray(profilesRes?.data)
          ? profilesRes.data.length
          : profilesRes?.data
            ? 1
            : 0,
        rolesError: rolesRes?.error,
        rolesCount: Array.isArray(rolesRes?.data) ? rolesRes.data.length : 0,
        authError: authUsersRes?.error,
        authCount: Array.isArray(authUsersRes?.data)
          ? authUsersRes.data.length
          : 0,
        ordersAggError: ordersAggRes?.error,
        ordersAggCount: Array.isArray(ordersAggRes?.data)
          ? ordersAggRes.data.length
          : ordersAggRes?.data
            ? 1
            : 0,
      });
    } catch (e) {}

    const profilesArr = (profilesRes?.data as any[]) || [];
    const rolesArr = (rolesRes?.data as any[]) || [];
    const authArr = (authUsersRes?.data as any[]) || [];
    const ordersAggAny = (ordersAggRes?.data as any) || [];

    // Create a union map keyed by user id. Profiles take precedence for name/phone
    const byId: Record<string, any> = {};

    for (const p of profilesArr) {
      byId[String(p.id)] = {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        created_at: p.created_at,
        role: "user",
        email: "",
        order_count: 0,
        total_spend: 0,
      };
    }

    for (const a of authArr) {
      const key = String(a.id);
      if (!byId[key]) {
        byId[key] = {
          id: a.id,
          full_name: null,
          phone: null,
          created_at: a.created_at || null,
          role: "user",
          email: a.email || "",
          order_count: 0,
          total_spend: 0,
        };
      } else {
        byId[key].email = a.email || byId[key].email || "";
        // keep profile's created_at if present
        byId[key].created_at = byId[key].created_at || a.created_at || null;
      }
    }

    // Attach roles
    for (const r of rolesArr) {
      const key = String(r.user_id);
      if (!byId[key]) continue;
      byId[key].role = r.role || byId[key].role || "user";
    }

    // Attach order aggregates
    for (const o of ordersAggAny) {
      const key = String(o.user_id);
      if (!byId[key]) continue;
      byId[key].order_count = Number(o.order_count || 0);
      byId[key].total_spend = Number(o.total_spend || 0);
    }

    // Convert to array - include ALL users regardless of role
    // Role filtering happens below if roleFilter is specified
    const usersArr = Object.values(byId).map((u: any) => ({
      id: u.id,
      full_name: u.full_name,
      phone: u.phone,
      role: u.role || "user",
      email: u.email || "",
      order_count: Number(u.order_count || 0),
      total_spend: Number(u.total_spend || 0),
      created_at: u.created_at || null,
    }));

    // Parse sort parameter (defaults to recent: most recent first)
    const sortBy = (req.query.sort || "recent") as string;

    // Sort based on sortBy parameter
    if (sortBy === "oldest") {
      usersArr.sort((a: any, b: any) => {
        const ta = a.created_at ? Date.parse(String(a.created_at)) : 0;
        const tb = b.created_at ? Date.parse(String(b.created_at)) : 0;
        return ta - tb; // ascending
      });
    } else if (sortBy === "time_registered_asc") {
      usersArr.sort((a: any, b: any) => {
        const ta = a.created_at ? Date.parse(String(a.created_at)) : 0;
        const tb = b.created_at ? Date.parse(String(b.created_at)) : 0;
        return ta - tb; // oldest first
      });
    } else if (sortBy === "time_registered_desc") {
      usersArr.sort((a: any, b: any) => {
        const ta = a.created_at ? Date.parse(String(a.created_at)) : 0;
        const tb = b.created_at ? Date.parse(String(b.created_at)) : 0;
        return tb - ta; // newest first
      });
    } else if (sortBy === "most_orders") {
      usersArr.sort((a: any, b: any) => b.order_count - a.order_count);
    } else if (sortBy === "highest_spend") {
      usersArr.sort((a: any, b: any) => b.total_spend - a.total_spend);
    } else if (sortBy === "lowest_spend") {
      usersArr.sort((a: any, b: any) => a.total_spend - b.total_spend);
    } else {
      // Default: recent (most recent first)
      usersArr.sort((a: any, b: any) => {
        const ta = a.created_at ? Date.parse(String(a.created_at)) : 0;
        const tb = b.created_at ? Date.parse(String(b.created_at)) : 0;
        return tb - ta; // descending
      });
    }

    // Apply date range, order count, spend filters, and role filter
    const filtered = usersArr.filter((u: any) => {
      // Role filter
      if (roleFilter && u.role !== roleFilter) return false;

      // Search filter
      if (q) {
        const full = (u.full_name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const phone = (u.phone || "").toLowerCase();
        if (!full.includes(q) && !email.includes(q) && !phone.includes(q)) {
          return false;
        }
      }

      // Date range filter
      if (fromDate || toDate) {
        const userDate = u.created_at ? new Date(String(u.created_at)) : null;
        if (!userDate) return false;
        if (fromDate && userDate < fromDate) return false;
        if (toDate) {
          const toDateWithDay = new Date(toDate);
          toDateWithDay.setDate(toDateWithDay.getDate() + 1);
          if (userDate >= toDateWithDay) return false;
        }
      }

      // Order count filter
      if (minOrders !== null && u.order_count < minOrders) return false;
      if (maxOrders !== null && u.order_count > maxOrders) return false;

      // Spend filter
      if (minSpend !== null && u.total_spend < minSpend) return false;
      if (maxSpend !== null && u.total_spend > maxSpend) return false;

      return true;
    });

    // Count users by role for the frontend
    const roleCountsMap: Record<string, number> = {};
    for (const u of usersArr) {
      const role = u.role || "user";
      roleCountsMap[role] = (roleCountsMap[role] || 0) + 1;
    }

    const totalCount = usersArr.length;

    let paginated: any[];
    let limitUsed: number;

    if (limitParam === undefined) {
      // No limit provided - return all users
      paginated = filtered;
      limitUsed = filtered.length;
    } else {
      const limit = Math.max(1, Number(limitParam || 50));
      const start = (page - 1) * limit;
      paginated = filtered.slice(start, start + limit);
      limitUsed = limit;
    }

    return res.status(200).json({
      users: paginated,
      count: filtered.length, // Total count of filtered users
      total_count: totalCount, // Total count before filters
      page: limitParam === undefined ? 1 : page,
      limit: limitUsed,
      role_counts: roleCountsMap, // Count of users by role
    });
  } catch (err: any) {
    console.error("list-users failed", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to list users" });
  }
}
