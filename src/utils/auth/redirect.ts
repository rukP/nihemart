import type { AppRole } from "@/store/auth.store";

/**
 * Get the default redirect route based on user roles
 * Priority: admin > manager > stock_manager > staff > rider > user
 */
export function getDefaultRouteForRoles(roles: string[] | Set<AppRole>): string {
   // Convert Set to array if needed
   const rolesArray = Array.isArray(roles) ? roles : Array.from(roles);
   
   // Check roles in priority order
   if (rolesArray.includes("admin")) {
      return "/admin";
   }
   if (rolesArray.includes("manager")) {
      return "/admin";
   }
   if (rolesArray.includes("stock_manager")) {
      return "/admin";
   }
   if (rolesArray.includes("staff")) {
      return "/admin";
   }
   if (rolesArray.includes("rider")) {
      return "/rider";
   }
   
   // Default to home for regular users
   return "/";
}

/**
 * Get redirect URL with role-based fallback
 * If a safe redirect is provided, use it; otherwise use role-based default
 */
export function getRedirectUrl(
   redirectParam: string | null | undefined,
   roles: string[] | Set<AppRole>
): string {
   // If redirect param is provided and safe, use it
   if (
      redirectParam &&
      redirectParam.startsWith("/") &&
      !redirectParam.includes("..")
   ) {
      return redirectParam;
   }
   
   // Otherwise, use role-based default
   return getDefaultRouteForRoles(roles);
}

