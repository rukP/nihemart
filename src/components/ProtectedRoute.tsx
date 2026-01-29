/**
 * Client-side route protection component
 */

"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection, type AdminSection } from "@/lib/rbac";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredSection: AdminSection;
  fallbackUrl?: string;
}

export function ProtectedRoute({
  children,
  requiredSection,
  fallbackUrl = "/admin",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, roles, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // Wait for auth to initialize

    if (!user) {
      // Not authenticated, redirect to signin
      router.push("/signin");
      return;
    }

    if (!canAccessSection(roles, requiredSection)) {
      // Not authorized for this section, redirect to fallback
      router.push(fallbackUrl);
      return;
    }
  }, [user, roles, loading, router, requiredSection, fallbackUrl]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting to signin
  }

  if (!canAccessSection(roles, requiredSection)) {
    return null; // Redirecting to fallback
  }

  return <>{children}</>;
}
