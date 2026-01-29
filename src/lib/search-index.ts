/**
 * Admin Dashboard Search Index
 * Indexes all available admin pages for fast search
 */

import { Icons } from "@/components/icons";
import {
  BadgeDollarSign,
  ChevronDown,
  Settings,
  CornerUpLeft,
  LucideIcon,
} from "lucide-react";
import React from "react";
import { canAccessSection, type AdminSection } from "@/lib/rbac";
import type { AppRole } from "@/store/auth.store";

export interface SearchItem {
  id: string;
  title: string;
  href: string;
  category: string;
  categoryIcon: LucideIcon | React.ComponentType<any>;
  keywords: string[]; // Additional search keywords
  section?: AdminSection;
  parentTitle?: string; // For sub-items
}

// Build search index from navigation structure
export function buildSearchIndex(
  roles: Set<AppRole> | ReadonlySet<AppRole> | AppRole[]
): SearchItem[] {
  const navItems = [
    {
      id: "1",
      title: "Dashboard",
      href: "/admin",
      section: "dashboard" as AdminSection,
      icon: Icons.sidebar.dashboard,
    },
    {
      id: "8",
      title: "Transactions",
      href: "/admin/transactions",
      section: "transactions" as AdminSection,
      icon: BadgeDollarSign,
    },
    {
      id: "2",
      title: "Users",
      icon: Icons.sidebar.users,
      section: "users" as AdminSection,
      subLinks: [
        {
          id: "2-1",
          title: "User Management",
          href: "/admin/users",
          section: "users" as AdminSection,
          keywords: ["users", "manage", "list", "all users"],
        },
        {
          id: "2-2",
          title: "Add new user",
          href: "/admin/users/new",
          section: "users" as AdminSection,
          keywords: ["create", "new user", "add user", "register"],
        },
        {
          id: "2-3",
          title: "User roles & permissions",
          href: "/admin/users/permissions",
          section: "users" as AdminSection,
          keywords: ["roles", "permissions", "access", "rbac", "authorization"],
        },
      ],
    },
    {
      id: "4",
      title: "Products",
      icon: Icons.sidebar.products,
      section: "products" as AdminSection,
      subLinks: [
        {
          id: "4-1",
          title: "Products Management",
          href: "/admin/products",
          section: "products" as AdminSection,
          keywords: ["products", "items", "inventory", "catalog", "list"],
        },
        {
          id: "4-2",
          title: "Add product",
          href: "/admin/products/new",
          section: "products" as AdminSection,
          keywords: ["create", "new product", "add item", "new"],
        },
        {
          id: "4-3",
          title: "Product Categories",
          href: "/admin/products/categories",
          section: "products" as AdminSection,
          keywords: ["categories", "category", "groups", "classify"],
        },
        {
          id: "4-4",
          title: "Discounts & Offers",
          href: "/admin/products/discounts",
          section: "products" as AdminSection,
          keywords: ["discounts", "offers", "promotions", "deals", "sales"],
        },
        {
          id: "4-5",
          title: "Product Reviews / Ratings",
          href: "/admin/products/reviews",
          section: "products" as AdminSection,
          keywords: [
            "reviews",
            "ratings",
            "feedback",
            "comments",
            "testimonials",
          ],
        },
      ],
    },
    {
      id: "3",
      title: "Orders",
      icon: Icons.sidebar.orders,
      section: "orders" as AdminSection,
      subLinks: [
        {
          id: "3-1",
          title: "Orders Management",
          href: "/admin/orders",
          section: "orders" as AdminSection,
          keywords: ["orders", "purchases", "transactions", "list"],
        },
        {
          id: "3-2",
          title: "New orders",
          href: "/admin/orders/new",
          section: "orders" as AdminSection,
          keywords: ["new", "pending", "recent", "latest"],
        },
        {
          id: "3-3",
          title: "External orders",
          href: "/admin/orders/external",
          section: "orders" as AdminSection,
          keywords: ["external", "manual", "offline", "other"],
        },
        {
          id: "3-4",
          title: "Website orders",
          href: "/admin/orders/website",
          section: "orders" as AdminSection,
          keywords: ["website", "online", "site orders", "web"],
        },
      ],
    },
    {
      id: "3a",
      title: "Refunds",
      icon: CornerUpLeft,
      section: "refunds" as AdminSection,
      subLinks: [
        {
          id: "3a-1",
          title: "Refund Requests",
          href: "/admin/refunds",
          section: "refunds" as AdminSection,
          keywords: ["refunds", "returns", "requests", "pending"],
        },
        {
          id: "3a-2",
          title: "Refund History",
          href: "/admin/refunds/history",
          section: "refunds" as AdminSection,
          keywords: ["history", "past", "completed", "processed"],
        },
      ],
    },
    {
      id: "5",
      title: "Sales",
      icon: Icons.sidebar.sales,
      section: "sales" as AdminSection,
      subLinks: [
        {
          id: "5-1",
          title: "Sales Overview / Dashboard",
          href: "/admin/sales",
          section: "sales" as AdminSection,
          keywords: ["sales", "overview", "dashboard", "analytics", "stats"],
        },
        {
          id: "5-2",
          title: "Sales Reports",
          href: "/admin/sales/reports",
          section: "sales" as AdminSection,
          keywords: ["reports", "analytics", "statistics", "data"],
        },
      ],
    },
    {
      id: "6",
      title: "Stock",
      icon: Icons.sidebar.stock,
      section: "stock" as AdminSection,
      subLinks: [
        {
          id: "6-1",
          title: "Stock Management",
          href: "/admin/stock",
          section: "stock" as AdminSection,
          keywords: ["stock", "inventory", "quantity", "levels", "warehouse"],
        },
        {
          id: "6-3",
          title: "Stock History",
          href: "/admin/stock/history",
          section: "stock" as AdminSection,
          keywords: ["history", "logs", "changes", "movements"],
        },
      ],
    },
    {
      id: "7",
      title: "Riders",
      icon: Icons.sidebar.riders,
      section: "riders" as AdminSection,
      subLinks: [
        {
          id: "7-1",
          title: "Rider Management",
          href: "/admin/riders",
          section: "riders" as AdminSection,
          keywords: ["riders", "delivery", "drivers", "couriers", "list"],
        },
        {
          id: "7-3",
          title: "Add New Rider",
          href: "/admin/riders/new",
          section: "riders" as AdminSection,
          keywords: ["create", "new rider", "add", "register"],
        },
      ],
    },
    {
      id: "9",
      title: "Settings",
      href: "/admin/settings",
      section: "settings" as AdminSection,
      icon: Settings,
      keywords: ["configuration", "preferences", "options", "setup"],
    },
  ];

  const index: SearchItem[] = [];

  for (const item of navItems) {
    // Check if user has access to this section
    if (item.section && !canAccessSection(roles, item.section)) {
      continue;
    }

    // Add main item if it has href
    if (item.href) {
      index.push({
        id: item.id,
        title: item.title,
        href: item.href,
        category: item.title,
        categoryIcon: item.icon,
        keywords: (item as any).keywords || [],
        section: item.section,
      });
    }

    // Add sub-items
    if ((item as any).subLinks) {
      for (const subLink of (item as any).subLinks) {
        // Check access for sub-link
        if (subLink.section && !canAccessSection(roles, subLink.section)) {
          continue;
        }

        index.push({
          id: subLink.id,
          title: subLink.title,
          href: subLink.href,
          category: item.title,
          categoryIcon: item.icon,
          keywords: subLink.keywords || [],
          section: subLink.section,
          parentTitle: item.title,
        });
      }
    }
  }

  return index;
}

/**
 * Simple fuzzy search implementation
 */
export function fuzzySearch(query: string, items: SearchItem[]): SearchItem[] {
  if (!query.trim()) {
    return items;
  }

  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/);

  const scored = items.map((item) => {
    const searchableText = [
      item.title,
      item.category,
      item.parentTitle,
      ...item.keywords,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let score = 0;

    // Exact match in title (highest priority)
    if (item.title.toLowerCase() === lowerQuery) {
      score += 1000;
    } else if (item.title.toLowerCase().startsWith(lowerQuery)) {
      score += 500;
    } else if (item.title.toLowerCase().includes(lowerQuery)) {
      score += 200;
    }

    // Match in category
    if (item.category.toLowerCase().includes(lowerQuery)) {
      score += 100;
    }

    // Match in keywords
    for (const keyword of item.keywords) {
      if (keyword.toLowerCase().includes(lowerQuery)) {
        score += 50;
      }
    }

    // Word-by-word matching
    let allWordsMatch = true;
    for (const word of queryWords) {
      if (!searchableText.includes(word)) {
        allWordsMatch = false;
        break;
      }
    }
    if (allWordsMatch) {
      score += 300;
    }

    // Fuzzy character matching
    let queryIndex = 0;
    for (
      let i = 0;
      i < searchableText.length && queryIndex < lowerQuery.length;
      i++
    ) {
      if (searchableText[i] === lowerQuery[queryIndex]) {
        queryIndex++;
      }
    }
    if (queryIndex === lowerQuery.length) {
      score += 10;
    }

    return { item, score };
  });

  // Filter out items with score 0 and sort by score
  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
