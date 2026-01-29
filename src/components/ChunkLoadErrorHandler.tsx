"use client";

import { useEffect } from "react";
import {
   initFetchInterceptor,
   clearReloadFlag,
} from "@/lib/chunk-error-handler";

/**
 * Global handler for ChunkLoadError
 *
 * This error occurs when:
 * - A new build is deployed with different chunk hashes
 * - The browser still has old HTML that references old chunks
 * - Those old chunks no longer exist on the server (404)
 *
 * Solution: Automatically reload the page to fetch the new HTML and chunks
 */
export function ChunkLoadErrorHandler() {
   useEffect(() => {
      // Initialize fetch interceptor
      initFetchInterceptor();
      // Handle chunk load errors globally
      const handleChunkError = (event: ErrorEvent) => {
         const error = event.error;

         // Check if it's a ChunkLoadError
         const isChunkError =
            error?.name === "ChunkLoadError" ||
            error?.message?.includes("Loading chunk") ||
            error?.message?.includes(
               "Failed to fetch dynamically imported module",
            ) ||
            (error?.stack && error.stack.includes("ChunkLoadError"));

         if (isChunkError) {
            console.warn(
               "ChunkLoadError detected, reloading page to fetch new chunks...",
               {
                  error: error?.message,
                  chunk: error?.chunkName,
               },
            );

            // Prevent infinite reload loop - allow up to 3 reloads
            const reloadCount = parseInt(
               sessionStorage.getItem("chunk-error-reloaded") || "0",
               10,
            );
            const MAX_RELOADS = 3; // Allow 3 reload attempts before showing error UI

            if (reloadCount >= MAX_RELOADS) {
               console.error(
                  "ChunkLoadError persisted after reloads. Showing error UI.",
               );
               // Don't reload anymore - the persistent error UI from chunk-error-handler will show
               return;
            }

            // Mark that we've attempted a reload
            sessionStorage.setItem(
               "chunk-error-reloaded",
               String(reloadCount + 1),
            );

            // Reload the page after a short delay to allow error to be logged
            setTimeout(() => {
               window.location.reload();
            }, 500);
         }
      };

      // Handle unhandled promise rejections (chunk errors often come as promise rejections)
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
         const error = event.reason;

         const isChunkError =
            error?.name === "ChunkLoadError" ||
            error?.message?.includes("Loading chunk") ||
            error?.message?.includes(
               "Failed to fetch dynamically imported module",
            ) ||
            (error?.stack && error.stack.includes("ChunkLoadError"));

         if (isChunkError) {
            console.warn(
               "ChunkLoadError detected in promise rejection, reloading page...",
               {
                  error: error?.message,
                  chunk: error?.chunkName,
               },
            );

            const reloadCount = parseInt(
               sessionStorage.getItem("chunk-error-reloaded") || "0",
               10,
            );
            const MAX_RELOADS = 3; // Allow 3 reload attempts before showing error UI

            if (reloadCount >= MAX_RELOADS) {
               console.error(
                  "ChunkLoadError persisted after reloads. Showing error UI.",
               );
               // Don't reload anymore - the persistent error UI from chunk-error-handler will show
               return;
            }

            sessionStorage.setItem(
               "chunk-error-reloaded",
               String(reloadCount + 1),
            );

            setTimeout(() => {
               window.location.reload();
            }, 500);
         }
      };

      // Also listen for failed script loads (400, 404, network errors)
      // NOTE: We only handle SCRIPT tags, not LINK tags (CSS)
      // CSS loading errors should not trigger reloads as they're not critical chunks
      const handleResourceError = (event: Event) => {
         const target = event.target as HTMLElement;

         // Only handle SCRIPT tags, ignore LINK tags (CSS)
         if (target?.tagName === "SCRIPT") {
            const script = target as HTMLScriptElement;
            const url = script.src;

            // Check if it's a Next.js chunk resource (JS only)
            const isChunkResource =
               url &&
               (url.includes("/_next/static/chunks/") ||
                  (url.includes("/_next/static/js/") &&
                     !url.endsWith(".css")) ||
                  url.includes("webpack-") ||
                  url.includes("main-app-") ||
                  (url.includes("app/") && url.endsWith(".js")) ||
                  (url.includes("pages/") && url.endsWith(".js")));

            if (isChunkResource) {
               console.warn("Chunk script failed to load, reloading page...", {
                  src: url,
               });

               const reloadCount = parseInt(
                  sessionStorage.getItem("chunk-error-reloaded") || "0",
                  10,
               );
               const MAX_RELOADS = 3; // Allow 3 reload attempts before showing error UI

               if (reloadCount >= MAX_RELOADS) {
                  console.error(
                     "Chunk script error persisted after reloads. Showing error UI.",
                  );
                  // Don't reload anymore - the persistent error UI from chunk-error-handler will show
                  return;
               }

               sessionStorage.setItem(
                  "chunk-error-reloaded",
                  String(reloadCount + 1),
               );

               setTimeout(() => {
                  window.location.reload();
               }, 500);
            }
         }
         // Ignore LINK tag errors (CSS) - they're not critical chunks
      };

      // Add event listeners
      window.addEventListener("error", handleChunkError, true);
      window.addEventListener("unhandledrejection", handleUnhandledRejection);
      window.addEventListener("error", handleResourceError, true);

      // Cleanup
      return () => {
         window.removeEventListener("error", handleChunkError, true);
         window.removeEventListener(
            "unhandledrejection",
            handleUnhandledRejection,
         );
         window.removeEventListener("error", handleResourceError, true);
      };
   }, []);

   // Clear the reload flag when component mounts (new page load)
   useEffect(() => {
      // Clear the flag after a successful page load
      clearReloadFlag();
   }, []);

   return null;
}
