export async function processOAuthRedirect(
  supabaseClient: any,
  opts: {
    setSession: (s: any) => void;
    setUser: (u: any) => void;
    fetchRoles: (id: string) => Promise<void>;
    setRoles: (r: Set<any>) => void;
  }
): Promise<{ sessionHandled: boolean; redirectParam?: string | null }> {
  const { setSession, setUser, fetchRoles, setRoles } = opts;

  try {
    if (typeof window === 'undefined') return { sessionHandled: false };

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const hasAccessToken = url.hash && url.hash.includes('access_token=');

    console.log('🔍 OAuth callback check:', {
      hasCode: !!code,
      hasAccessToken,
      fullUrl: window.location.href,
    });

    if (!code && !hasAccessToken) {
      console.log('❌ No OAuth code or access token found');
      return { sessionHandled: false };
    }

    // Extract redirect param from URL OR localStorage
    let redirectParam = url.searchParams.get('redirect');

    if (!redirectParam) {
      try {
        const stored = localStorage.getItem('oauth_redirect');
        if (stored) {
          redirectParam = stored;
          console.log(
            '📦 Retrieved redirect from localStorage:',
            redirectParam
          );
        }
      } catch (_e) {
        console.warn('⚠️ Could not read from localStorage:', _e);
      }
    } else {
      console.log('🔗 Found redirect in URL params:', redirectParam);
    }

    let session: any = null;
    let user: any = null;

    // Helper: wait for an auth state change event (short timeout)
    const waitForAuthStateChange = (timeout = 3000) =>
      new Promise<any>(resolve => {
        try {
          const { data: sub } = supabaseClient.auth.onAuthStateChange(
            (_event: any, s: any) => {
              if (s?.user) {
                try {
                  sub.subscription.unsubscribe();
                } catch (_e) {
                  /* ignore */
                }
                resolve(s);
              }
            }
          );

          setTimeout(() => {
            try {
              sub.subscription.unsubscribe();
            } catch (_e) {
              /* ignore */
            }
            resolve(null);
          }, timeout);
        } catch (_e) {
          resolve(null);
        }
      });

    // PRIORITY 1: Handle PKCE code-based flow (modern approach)
    if (code) {
      console.log(
        '🔐 Attempting PKCE code exchange / SDK session retrieval...'
      );

      try {
        // Many SDKs implement a helper that parses the URL and exchanges the code.
        // Try `getSessionFromUrl` first because it often handles both hash and code flows.
        if (
          typeof (supabaseClient.auth as any).getSessionFromUrl === 'function'
        ) {
          try {
            const res: any = await (
              supabaseClient.auth as any
            ).getSessionFromUrl();
            if (res?.data?.session) {
              session = res.data.session;
              user = session.user;
              console.log(
                '✅ Session established via getSessionFromUrl (code handled by SDK)'
              );
            }
          } catch (_e) {
            console.warn('⚠️ getSessionFromUrl threw while handling code:', _e);
          }
        }

        // If that didn't produce a session, try explicit code exchange if available
        if (
          !session &&
          typeof (supabaseClient.auth as any).exchangeCodeForSession ===
            'function'
        ) {
          try {
            const { data, error } = await (
              supabaseClient.auth as any
            ).exchangeCodeForSession(code);
            if (error) {
              console.error('❌ exchangeCodeForSession error:', error);
            } else if (data?.session) {
              session = data.session;
              user = session.user;
              console.log('✅ Session established via exchangeCodeForSession');
            }
          } catch (_e) {
            console.warn('⚠️ exchangeCodeForSession threw:', _e);
          }
        }

        // If still no session, wait briefly for the auth state change event (some SDKs set session asynchronously)
        if (!session) {
          const s = await waitForAuthStateChange(3000);
          if (s?.user) {
            session = s;
            user = s.user;
            console.log(
              '✅ Session captured from onAuthStateChange after code exchange'
            );
          }
        }
      } catch (_err: any) {
        console.error('❌ PKCE handling failed:', _err);
      }
    }

    // PRIORITY 2: Handle implicit/hash-based flow (legacy)
    if (!session && hasAccessToken) {
      console.log('🔐 Attempting hash-based session retrieval...');

      try {
        const result: any =
          typeof (supabaseClient.auth as any).getSessionFromUrl === 'function'
            ? await (supabaseClient.auth as any).getSessionFromUrl()
            : typeof (supabaseClient.auth as any)._getSessionFromURL ===
                'function'
              ? await (supabaseClient.auth as any)._getSessionFromURL(
                  window.location.href
                )
              : null;

        const { data, error } = result || {};
        if (error) {
          console.warn('⚠️ getSessionFromUrl error:', error);
        } else if (data?.session) {
          session = data.session;
          user = session.user;
          console.log('✅ Session retrieved via hash-based flow');
        } else {
          // Try waiting for auth state change if SDK handled the hash asynchronously
          const s = await waitForAuthStateChange(3000);
          if (s?.user) {
            session = s;
            user = s.user;
            console.log(
              '✅ Session captured from onAuthStateChange after hash flow'
            );
          }
        }
      } catch (_err) {
        console.warn('⚠️ Hash-based retrieval threw:', _err);
      }
    }

    // PRIORITY 3: Final fallback - check if session already exists
    if (!session) {
      console.log('🔍 Checking for existing session...');

      try {
        // Try immediate getSession
        const { data } = await supabaseClient.auth.getSession();
        if (data?.session) {
          session = data.session;
          user = session.user;
          console.log('✅ Found existing session');
        } else {
          // Give the SDK a short window to emit an auth state change
          const s = await waitForAuthStateChange(2000);
          if (s?.user) {
            session = s;
            user = s.user;
            console.log(
              '✅ Session captured from onAuthStateChange after getSession check'
            );
          }
        }
      } catch (_err) {
        console.warn('⚠️ getSession check failed:', _err);
      }
    }

    if (!session || !user) {
      console.error('❌ No session could be established after all attempts');
      return { sessionHandled: false };
    }

    console.log('✅ Session established successfully, updating store...');

    // Update auth store
    setSession(session);
    setUser(user);

    // Fetch user roles
    try {
      console.log('👥 Fetching user roles...');
      await fetchRoles(user.id);
      console.log('✅ Roles fetched successfully');
    } catch (_err) {
      console.warn('⚠️ Failed to fetch roles:', _err);
      setRoles(new Set());
    }

    // Upsert profile
    try {
      console.log('👤 Upserting user profile...');
      const um: any = user.user_metadata || {};
      await fetch('/api/auth/upsert-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          full_name: um.full_name || null,
          phone: um.phone || null,
        }),
      });
      console.log('✅ Profile upserted successfully');
    } catch (_e) {
      console.warn('⚠️ Profile upsert error:', _e);
    }

    // Clean up URL and localStorage
    try {
      url.searchParams.delete('code');
      url.searchParams.delete('state');

      window.history.replaceState(
        {},
        document.title,
        url.pathname + url.search
      );

      // Clean up localStorage
      try {
        localStorage.removeItem('oauth_redirect');
        console.log('🧹 Cleaned up localStorage redirect');
      } catch (_e) {
        console.warn('⚠️ Could not clear localStorage:', _e);
      }

      console.log('✅ OAuth process complete! Redirect param:', redirectParam);
      return { sessionHandled: true, redirectParam: redirectParam };
    } catch (_e) {
      console.warn('⚠️ URL cleanup error:', _e);
      return { sessionHandled: true, redirectParam: redirectParam };
    }
  } catch (_err) {
    console.error('❌ OAuth redirect handling failed:', _err);
  }

  return { sessionHandled: false };
}
