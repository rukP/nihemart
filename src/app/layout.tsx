import type { Metadata } from 'next';
import './globals.css';
import Providers from './Providers';
import { Toaster } from 'sonner';
import TopProgressBar from '@/components/TopProgressBar';

// Using system fonts instead of Google Fonts to avoid network dependencies
const _geistSans = {
  variable: '--font-geist-sans',
};

const _geistMono = {
  variable: '--font-geist-mono',
};

const SITE_NAME = 'Nihemart';
const DEFAULT_DESCRIPTION =
  'Muri NIHE MART ducuruza product utabona mu rwanda kuri make ushaka kutubona watwandikira kur whatsapp 0792412177.';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nihemart.rw';

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s - ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    siteName: SITE_NAME,
    url: BASE_URL,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/open-graph.png`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [`${BASE_URL}/twitter.png`],
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${_geistSans.variable} ${_geistMono.variable} antialiased`}
      >
        {/* Early chunk error handler - runs before React loads */}
        {/* <Script
               id="chunk-error-handler"
               strategy="beforeInteractive"
               dangerouslySetInnerHTML={{
                  __html: `
              (function() {
                var RELOADKEY = 'chunk-error-reloaded';
                var MAXRELOADS = 3; // Allow 3 reloads: normal -> hard -> force
                var RELOADDELAY = 300;
                var ERRORUI_KEY = 'chunk-error-ui-shown';
                var LASTRELOAD_TIME_KEY = 'last-chunk-reload-time';
                var OVERLAYSHOWN_KEY = 'chunk-overlay-shown-time';
                
                function shouldReload() {
                  var reloadCount = parseInt(sessionStorage.getItem(RELOADKEY) || '0', 10);
                  var lastReloadTime = parseInt(sessionStorage.getItem(LASTRELOAD_TIME_KEY) || '0', 10);
                  var timeSinceLastReload = Date.now() - lastReloadTime;
                  if (timeSinceLastReload < 2000) {
                    return false; // Throttle rapid reloads
                  }
                  return reloadCount < MAXRELOADS;
                }
                
                function markReload() {
                  var reloadCount = parseInt(sessionStorage.getItem(RELOADKEY) || '0', 10);
                  sessionStorage.setItem(RELOADKEY, String(reloadCount + 1));
                  sessionStorage.setItem(LASTRELOAD_TIME_KEY, String(Date.now()));
                }
                
                function performReload(reloadType) {
                  var baseUrl = window.location.href.split('?')[0].split('#')[0];
                  if (reloadType === 'force') {
                    console.log('Performing FORCE reload with aggressive cache clearing...');
                    if ('caches' in window) {
                      caches.keys().then(function(keys) {
                        keys.forEach(function(key) { caches.delete(key); });
                      });
                    }
                    window.location.replace(baseUrl + '?_reload=' + Date.now() + '&_v=' + Math.random());
                  } else if (reloadType === 'hard') {
                    console.log('Performing HARD reload with cache bust...');
                    window.location.replace(baseUrl + '?_t=' + Date.now());
                  } else {
                    console.log('Performing normal reload...');
                    window.location.reload();
                  }
                }
                
                function clearReloadFlag() {
                  // Clear after successful page load
                  setTimeout(function() {
                    sessionStorage.removeItem(RELOADKEY);
                    sessionStorage.removeItem(ERRORUI_KEY);
                    sessionStorage.removeItem(LASTRELOAD_TIME_KEY);
                    var lastOverlayTime = parseInt(localStorage.getItem(OVERLAYSHOWN_KEY) || '0', 10);
                    if (Date.now() - lastOverlayTime > 300000) {
                      localStorage.removeItem(OVERLAYSHOWN_KEY);
                    }
                  }, 3000);
                }

                function showPersistentErrorUI() {
                  // Prevent showing multiple error UIs
                  if (sessionStorage.getItem(ERRORUI_KEY) === 'true') {
                    return;
                  }
                  sessionStorage.setItem(ERRORUI_KEY, 'true');

                  // Create error overlay
                  var overlay = document.createElement('div');
                  overlay.id = 'chunk-error-overlay';
                  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); color: white; display: flex; align-items: center; justify-content: center; z-index: 999999; font-family: system-ui, -apple-system, sans-serif;';

                  overlay.innerHTML = '<div style="max-width: 500px; padding: 2rem; text-align: center;"><svg style="width: 64px; height: 64px; margin-bottom: 1rem; color: #ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Application Update Required</h1><p style="margin-bottom: 1.5rem; color: #d1d5db; line-height: 1.6;">The application has been updated and requires a fresh reload. Please use the button below to reload the page.</p><button id="hard-refresh-btn" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer; margin-bottom: 0.5rem; display: inline-block; width: 100%;">Reload Application</button><p style="font-size: 0.875rem; color: #9ca3af; margin-top: 1rem;">Or press <kbd style="background: #374151; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">Ctrl+Shift+R</kbd> (Windows/Linux) or <kbd style="background: #374151; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">Cmd+Shift+R</kbd> (Mac)</p></div>';

                  document.body.appendChild(overlay);

                  // Add click handler
                  var btn = document.getElementById('hard-refresh-btn');
                  if (btn) {
                    btn.addEventListener('click', function() {
                      sessionStorage.clear();
                      localStorage.removeItem(OVERLAYSHOWN_KEY);
                      var baseUrl = window.location.href.split('?')[0].split('#')[0];
                      if ('caches' in window) {
                        caches.keys().then(function(keys) {
                          keys.forEach(function(key) { caches.delete(key); });
                        });
                      }
                      window.location.replace(baseUrl + '?_force=' + Date.now() + '&_clear=' + Math.random());
                    });
                  }
                }
                
                function isChunkResource(url) {
                  if (!url) return false;
                  // Only treat JS chunks as chunk resources, not CSS
                  // CSS files should load normally and not trigger reloads
                  return url.includes('/_next/static/chunks/') ||
                         (url.includes('/_next/static/js/') && !url.endsWith('.css')) ||
                         url.includes('webpack-') ||
                         url.includes('main-app-') ||
                         (url.includes('app/') && url.endsWith('.js')) ||
                         (url.includes('pages/') && url.endsWith('.js'));
                }
                
                function handleChunkError(source, url) {
                  if (!isChunkResource(url)) return false;
                  
                  var reloadCount = parseInt(sessionStorage.getItem(RELOADKEY) || '0', 10);

                  if (!shouldReload()) {
                    var lastOverlayTime = parseInt(localStorage.getItem(OVERLAYSHOWN_KEY) || '0', 10);
                    var timeSinceOverlay = Date.now() - lastOverlayTime;
                    
                    if (timeSinceOverlay < 60000) {
                      console.log('Overlay shown recently, forcing aggressive reload instead...');
                      sessionStorage.clear();
                      performReload('force');
                      return true;
                    }
                    
                    console.error('Chunk error persisted after ' + MAXRELOADS + ' reloads. Showing error UI.');
                    localStorage.setItem(OVERLAYSHOWN_KEY, String(Date.now()));
                    showPersistentErrorUI();
                    return false;
                  }
                  
                  var reloadType = reloadCount === 0 ? 'normal' : reloadCount === 1 ? 'hard' : 'force';
                  console.warn('Chunk loading error detected, attempting ' + reloadType.toUpperCase() + ' reload...', { source: source, url: url, attempt: reloadCount + 1, type: reloadType });
                  markReload();

                  setTimeout(function() {
                    performReload(reloadType);
                  }, RELOADDELAY);

                  return true;
                }
                
                // Handle script tag errors (400, 404, network errors)
                // NOTE: We only handle SCRIPT tags, not LINK tags (CSS)
                // CSS loading errors should not trigger reloads
                window.addEventListener('error', function(e) {
                  var target = e.target;
                  
                  // Only handle SCRIPT tags, ignore LINK tags (CSS)
                  if (target && target.tagName === 'SCRIPT') {
                    var url = target.src;
                    if (handleChunkError('resource-error', url)) {
                      e.preventDefault();
                      return;
                    }
                  }
                  
                  // Handle JavaScript errors
                  var error = e.error;
                  if (error) {
                    var isChunkError = 
                      error.name === 'ChunkLoadError' ||
                      (error.message && (
                        error.message.includes('Loading chunk') ||
                        error.message.includes('Failed to fetch dynamically imported module') ||
                        error.message.includes('ChunkLoadError')
                      ));
                    
                    if (isChunkError) {
                      if (handleChunkError('js-error', error.message)) {
                        e.preventDefault();
                      }
                    }
                  }
                }, true);
                
                // Handle unhandled promise rejections
                window.addEventListener('unhandledrejection', function(e) {
                  var error = e.reason;
                  if (!error) return;
                  
                  var isChunkError = 
                    error.name === 'ChunkLoadError' ||
                    (error.message && (
                      error.message.includes('Loading chunk') ||
                      error.message.includes('Failed to fetch dynamically imported module') ||
                      error.message.includes('ChunkLoadError')
                    )) ||
                    (error.toString && error.toString().includes('ChunkLoadError'));
                  
                  if (isChunkError) {
                    if (handleChunkError('promise-rejection', error.message || error.toString())) {
                      e.preventDefault();
                    }
                  }
                });
                
                // Monitor fetch requests for chunk files
                var originalFetch = window.fetch;
                window.fetch = function() {
                  var url = arguments[0];
                  var urlString = typeof url === 'string' ? url : (url && url.url ? url.url : '');
                  
                  if (isChunkResource(urlString)) {
                    return originalFetch.apply(this, arguments)
                      .then(function(response) {
                        // Check for 400 or 404 status codes
                        if (response.status === 400 || response.status === 404) {
                          if (handleChunkError('fetch-' + response.status, urlString)) {
                            return Promise.reject(new Error('Chunk load failed: ' + response.status));
                          }
                        }
                        return response;
                      })
                      .catch(function(error) {
                        // Network errors or other fetch failures
                        if (error && (error.name === 'TypeError' || error.message && error.message.includes('Failed to fetch'))) {
                          if (handleChunkError('fetch-network-error', urlString)) {
                            return Promise.reject(error);
                          }
                        }
                        throw error;
                      });
                  }
                  return originalFetch.apply(this, arguments);
                };
                
                // Clear reload flag on successful load
                if (document.readyState === 'complete') {
                  clearReloadFlag();
                } else {
                  window.addEventListener('load', clearReloadFlag);
                }
              })();
            `,
               }}
            /> */}
        <TopProgressBar />
        <Toaster richColors />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
