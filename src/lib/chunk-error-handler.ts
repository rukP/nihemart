/**
 * Comprehensive chunk loading error handler
 * Handles 400, 404, and network errors for Next.js chunks
 */

const RELOAD_KEY = "chunk-error-reloaded";
const MAX_RELOADS = 3; // Allow 3 reloads: normal -> hard -> force hard
const RELOAD_DELAY = 300; // Quick reload
const ERROR_UI_KEY = "chunk-error-ui-shown";
const LAST_RELOAD_TIME_KEY = "last-chunk-reload-time";
const OVERLAY_SHOWN_KEY = "chunk-overlay-shown-time";

function isChunkResource(url: string | null | undefined): boolean {
   if (!url) return false;
   // Only treat JS chunks as chunk resources, not CSS
   // CSS files should load normally and not trigger reloads
   return (
      url.includes("/_next/static/chunks/") ||
      (url.includes("/_next/static/js/") && !url.endsWith(".css")) ||
      url.includes("webpack-") ||
      url.includes("main-app-") ||
      (url.includes("/app/") && url.endsWith(".js")) ||
      (url.includes("/pages/") && url.endsWith(".js"))
   );
}

function shouldReload(): boolean {
   const reloadCount = parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10);

   // Prevent rapid reloads - wait at least 2 seconds between attempts
   const lastReloadTime = parseInt(
      sessionStorage.getItem(LAST_RELOAD_TIME_KEY) || "0",
      10,
   );
   const timeSinceLastReload = Date.now() - lastReloadTime;
   if (timeSinceLastReload < 2000) {
      console.log("Reload throttled - too soon since last reload");
      return false;
   }

   return reloadCount < MAX_RELOADS;
}

function markReload(): void {
   const reloadCount = parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10);
   sessionStorage.setItem(RELOAD_KEY, String(reloadCount + 1));
   sessionStorage.setItem(LAST_RELOAD_TIME_KEY, String(Date.now()));
}

function performReload(
   reloadType: "normal" | "hard" | "force" = "normal",
): void {
   const baseUrl = window.location.href.split("?")[0].split("#")[0];

   if (reloadType === "force") {
      console.log("Performing FORCE reload with aggressive cache clearing...");
      // Clear service worker caches if available
      if ("caches" in window) {
         caches
            .keys()
            .then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      // Use location.replace for no-history hard reload
      window.location.replace(
         baseUrl + "?_reload=" + Date.now() + "&_v=" + Math.random(),
      );
   } else if (reloadType === "hard") {
      console.log("Performing HARD reload with cache bust...");
      window.location.replace(baseUrl + "?_t=" + Date.now());
   } else {
      console.log("Performing normal reload...");
      window.location.reload();
   }
}

export function clearReloadFlag(): void {
   // Clear after successful page load
   setTimeout(() => {
      sessionStorage.removeItem(RELOAD_KEY);
      sessionStorage.removeItem(ERROR_UI_KEY);
      sessionStorage.removeItem(LAST_RELOAD_TIME_KEY);
      // Clear overlay flag if it's old enough
      const lastOverlayTime = parseInt(
         localStorage.getItem(OVERLAY_SHOWN_KEY) || "0",
         10,
      );
      if (Date.now() - lastOverlayTime > 300000) {
         // 5 minutes
         localStorage.removeItem(OVERLAY_SHOWN_KEY);
      }
   }, 3000);
}

function showPersistentErrorUI(): void {
   // Prevent showing multiple error UIs
   if (sessionStorage.getItem(ERROR_UI_KEY) === "true") {
      return;
   }
   sessionStorage.setItem(ERROR_UI_KEY, "true");

   // Create error overlay
   const overlay = document.createElement("div");
   overlay.id = "chunk-error-overlay";
   overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
  `;

   overlay.innerHTML = `
    <div style="max-width: 500px; padding: 2rem; text-align: center;">
      <svg style="width: 64px; height: 64px; margin-bottom: 1rem; color: #ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Application Update Required</h1>
      <p style="margin-bottom: 1.5rem; color: #d1d5db; line-height: 1.6;">
        The application has been updated and requires a fresh reload. Please use the button below to reload the page.
      </p>
      <button id="hard-refresh-btn" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 0.5rem;
        display: inline-block;
        width: 100%;
      ">
        Reload Application
      </button>
      <p style="font-size: 0.875rem; color: #9ca3af; margin-top: 1rem;">
        Or press <kbd style="background: #374151; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">Ctrl+Shift+R</kbd> (Windows/Linux) or <kbd style="background: #374151; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">Cmd+Shift+R</kbd> (Mac)
      </p>
    </div>
  `;

   document.body.appendChild(overlay);

   // Add click handler
   const btn = document.getElementById("hard-refresh-btn");
   if (btn) {
      btn.addEventListener("click", () => {
         sessionStorage.clear();
         localStorage.removeItem(OVERLAY_SHOWN_KEY);
         // Aggressive force reload
         const baseUrl = window.location.href.split("?")[0].split("#")[0];
         if ("caches" in window) {
            caches
               .keys()
               .then((keys) => keys.forEach((key) => caches.delete(key)));
         }
         window.location.replace(
            baseUrl + "?_force=" + Date.now() + "&_clear=" + Math.random(),
         );
      });
   }
}

export function handleChunkError(source: string, url?: string | null): boolean {
   if (url && !isChunkResource(url)) {
      return false;
   }

   const reloadCount = parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10);

   if (!shouldReload()) {
      // Check if we recently showed the overlay - if so, just force reload
      const lastOverlayTime = parseInt(
         localStorage.getItem(OVERLAY_SHOWN_KEY) || "0",
         10,
      );
      const timeSinceOverlay = Date.now() - lastOverlayTime;

      if (timeSinceOverlay < 60000) {
         // Within last minute
         console.log(
            "Overlay shown recently, forcing aggressive reload instead...",
         );
         sessionStorage.clear();
         performReload("force");
         return true;
      }

      console.error(
         `Chunk error persisted after ${MAX_RELOADS} reloads. Showing error UI.`,
         { source, url },
      );
      localStorage.setItem(OVERLAY_SHOWN_KEY, String(Date.now()));
      showPersistentErrorUI();
      return false;
   }

   // 3-stage reload: normal -> hard -> force
   const reloadType =
      reloadCount === 0 ? "normal" : reloadCount === 1 ? "hard" : "force";
   console.warn(
      `Chunk loading error detected, attempting ${reloadType.toUpperCase()} reload...`,
      {
         source,
         url,
         attempt: reloadCount + 1,
         type: reloadType,
      },
   );

   markReload();

   setTimeout(() => {
      performReload(reloadType);
   }, RELOAD_DELAY);

   return true;
}

/**
 * Initialize fetch interceptor to catch chunk loading errors
 */
export function initFetchInterceptor(): void {
   if (typeof window === "undefined") return;

   const originalFetch = window.fetch;
   window.fetch = function (...args) {
      let url: string | undefined;
      if (typeof args[0] === "string") {
         url = args[0];
      } else if (args[0] instanceof Request) {
         url = args[0].url;
      } else if (args[0] && typeof args[0] === "object" && "url" in args[0]) {
         url = args[0].url as string;
      }

      if (isChunkResource(url)) {
         // Ensure the first argument is RequestInfo (convert URL to string if needed)
         const input: RequestInfo =
            typeof args[0] === "string"
               ? args[0]
               : args[0] instanceof URL
                 ? args[0].toString()
                 : args[0];
         const init: RequestInit | undefined = args[1];
         return originalFetch(input, init)
            .then((response) => {
               // Check for 400 or 404 errors
               if (response.status === 400 || response.status === 404) {
                  if (handleChunkError("fetch-400-404", url)) {
                     return Promise.reject(
                        new Error(`Chunk load failed: ${response.status}`),
                     );
                  }
               }
               return response;
            })
            .catch((error) => {
               // Network errors or other fetch failures
               if (
                  error.name === "TypeError" ||
                  error.message?.includes("Failed to fetch") ||
                  error.message?.includes("NetworkError")
               ) {
                  if (handleChunkError("fetch-network-error", url)) {
                     return Promise.reject(error);
                  }
               }
               throw error;
            });
      }

      // Ensure the first argument is RequestInfo (convert URL to string if needed)
      const input: RequestInfo =
         typeof args[0] === "string"
            ? args[0]
            : args[0] instanceof URL
              ? args[0].toString()
              : args[0];
      const init: RequestInit | undefined = args[1];
      return originalFetch(input, init);
   };
}
