import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get absolute image URL from relative path
 */
function getAbsoluteImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string" || url.trim().length === 0) return null;

  const trimmedUrl = url.trim();

  // If already absolute, handle protocol conversion for localhost
  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    // Check if we're in development (localhost)
    const isDevelopment =
      typeof window !== "undefined"
        ? window.location.hostname.includes("localhost") ||
          window.location.hostname.includes("127.0.0.1")
        : process.env.NODE_ENV !== "production";

    // In development, ensure localhost URLs use HTTP (backend doesn't serve HTTPS)
    if (
      isDevelopment &&
      (trimmedUrl.includes("localhost") || trimmedUrl.includes("127.0.0.1"))
    ) {
      // Convert HTTPS back to HTTP for localhost in development
      if (trimmedUrl.startsWith("https://")) {
        return trimmedUrl.replace("https://", "http://");
      }
      return trimmedUrl;
    }

    // In production, force HTTPS for non-localhost URLs
    const isProduction =
      typeof window !== "undefined"
        ? !window.location.hostname.includes("localhost") &&
          !window.location.hostname.includes("127.0.0.1")
        : process.env.NODE_ENV === "production";

    if (
      isProduction &&
      trimmedUrl.startsWith("http://") &&
      !trimmedUrl.includes("localhost") &&
      !trimmedUrl.includes("127.0.0.1")
    ) {
      return trimmedUrl.replace("http://", "https://");
    }
    return trimmedUrl;
  }

  // Convert relative path to absolute URL using backend API base
  const apiBase =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE ||
        process.env.NEXT_PUBLIC_API_URL ||
        "https://api.nihemart.rw/api"
      : "https://api.nihemart.rw/api";

  // Remove /api suffix if present to get base backend URL
  const backendBase = apiBase.replace(/\/api$/, "");

  // Always use HTTP for localhost, HTTPS for production
  const isDevelopment =
    typeof window !== "undefined"
      ? window.location.hostname.includes("localhost") ||
        window.location.hostname.includes("127.0.0.1")
      : process.env.NODE_ENV !== "production";

  // In development, ensure we use HTTP for localhost
  // In production, use HTTPS if the base URL is HTTPS
  const finalBase =
    isDevelopment ||
    backendBase.includes("localhost") ||
    backendBase.includes("127.0.0.1")
      ? backendBase.replace(/^https:\/\//, "http://") // Force HTTP for localhost
      : backendBase.startsWith("http://") &&
          !backendBase.includes("localhost") &&
          !backendBase.includes("127.0.0.1")
        ? backendBase.replace("http://", "https://") // Force HTTPS for production
        : backendBase;

  const cleanPath = trimmedUrl.startsWith("/") ? trimmedUrl : `/${trimmedUrl}`;
  return `${finalBase}${cleanPath}`;
}

/**
 * Check if an image URL is from localhost (needs unoptimized loading in development)
 */
export function isLocalhostUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/**
 * to reduce bandwidth and improve loading speeds.
 * Also converts relative backend upload paths to absolute URLs.
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "avif" | "jpg" | "png";
  } = {},
): string {
  if (!url || typeof url !== "string" || url.trim().length === 0)
    return "/placeholder.svg";

  // If it's a relative backend upload path, convert to absolute URL
  if (url.startsWith("/uploads/")) {
    const absoluteUrl = getAbsoluteImageUrl(url);
    return absoluteUrl || "/placeholder.svg";
  }

  if (
    (url.startsWith("http://") || url.startsWith("https://")) &&
    !url.includes("supabase")
  ) {
    // Check if we're in development (localhost)
    const isDevelopment =
      typeof window !== "undefined"
        ? window.location.hostname.includes("localhost") ||
          window.location.hostname.includes("127.0.0.1")
        : process.env.NODE_ENV !== "production";

    // In development, ensure localhost URLs use HTTP (backend doesn't serve HTTPS)
    if (
      isDevelopment &&
      (url.includes("localhost") || url.includes("127.0.0.1"))
    ) {
      // Convert HTTPS back to HTTP for localhost in development
      if (url.startsWith("https://")) {
        return url.replace("https://", "http://");
      }
      return url;
    }

    // In production, force HTTPS for non-localhost URLs
    const isProduction =
      typeof window !== "undefined"
        ? !window.location.hostname.includes("localhost") &&
          !window.location.hostname.includes("127.0.0.1")
        : process.env.NODE_ENV === "production";

    if (
      isProduction &&
      url.startsWith("http://") &&
      !url.includes("localhost") &&
      !url.includes("127.0.0.1")
    ) {
      return url.replace("http://", "https://");
    }
    return url;
  }

  // For Supabase URLs, return placeholder since we now use file-based uploads
  // Old Supabase URLs in database should be migrated to local uploads
  if (url.includes("supabase")) {
    console.warn(
      "Supabase URL detected but system now uses file-based uploads:",
      url,
    );
    return "/placeholder.svg";
  }

  // Fallback: try to convert to absolute URL
  const absoluteUrl = getAbsoluteImageUrl(url);
  return absoluteUrl || "/placeholder.svg";
}
