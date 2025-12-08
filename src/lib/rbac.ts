/**
 * Role-Based Access Control (RBAC) configuration for admin dashboard
 */

import type { AppRole } from "@/store/auth.store";

export type AdminSection =
  | "dashboard"
  | "transactions"
  | "users"
  | "products"
  | "orders"
  | "refunds"
  | "sales"
  | "stock"
  | "riders"
  | "settings";

/**
 * Define which roles can access which sections
 *
 * Roles:
 * - admin: Full access to all sections
 * - manager: Full access to all sections
 * - stock_manager: Can access stock, orders, refunds, riders
 * - staff: Can access orders, refunds, riders
 */
export const roleAccessMap: Record<AdminSection, AppRole[]> = {
  dashboard: ["admin", "manager"],
  transactions: ["admin", "manager"],
  users: ["admin", "manager"],
  products: ["admin", "manager"],
  orders: ["admin", "manager", "stock_manager", "staff"],
  refunds: ["admin", "manager", "stock_manager", "staff"],
  sales: ["admin", "manager"],
  stock: ["admin", "manager", "stock_manager"],
  riders: ["admin", "manager", "stock_manager", "staff"],
  settings: ["admin", "manager"],
};

/**
 * Check if a user with given roles can access a section
 */
export function canAccessSection(
  userRoles: Set<AppRole> | AppRole[],
  section: AdminSection
): boolean {
  const rolesArray = Array.isArray(userRoles)
    ? userRoles
    : Array.from(userRoles);

  const allowedRoles = roleAccessMap[section];
  return rolesArray.some((role) => allowedRoles.includes(role));
}

/**
 * Get all sections accessible by user
 */
export function getAccessibleSections(
  userRoles: Set<AppRole> | AppRole[]
): AdminSection[] {
  const rolesArray = Array.isArray(userRoles)
    ? userRoles
    : Array.from(userRoles);

  return (Object.keys(roleAccessMap) as AdminSection[]).filter((section) =>
    rolesArray.some((role) => roleAccessMap[section].includes(role))
  );
}

/**
 * Get user's display role (highest privilege)
 */
export function getUserDisplayRole(
  userRoles: Set<AppRole> | AppRole[]
): string {
  const rolesArray = Array.isArray(userRoles)
    ? userRoles
    : Array.from(userRoles);

  if (rolesArray.includes("admin")) return "Admin";
  if (rolesArray.includes("manager")) return "Manager";
  if (rolesArray.includes("stock_manager")) return "Stock Manager";
  if (rolesArray.includes("staff")) return "Staff";
  if (rolesArray.includes("rider")) return "Rider";
  return "User";
}
