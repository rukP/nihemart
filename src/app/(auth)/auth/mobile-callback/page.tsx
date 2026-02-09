'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

/**
 * Mobile OAuth Callback Handler
 * This page handles OAuth redirects for mobile app and deep links back to the app
 */
export default function MobileAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing'
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    handleMobileCallback();
  }, []);

  const handleMobileCallback = async () => {
    try {
      // Get the authorization code from URL
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMsg(error);
        // Try to deep link back to app with error
        setTimeout(() => {
          window.location.href = `nihemart://auth/callback?error=${encodeURIComponent(error)}`;
        }, 500);
        // Fallback to web signin after 3 seconds
        setTimeout(() => {
          router.replace('/signin?error=oauth_error');
        }, 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMsg('No authorization code received');
        // Try to deep link back to app with error
        setTimeout(() => {
          window.location.href = 'nihemart://auth/callback?error=no_code';
        }, 500);
        // Fallback to web signin after 3 seconds
        setTimeout(() => {
          router.replace('/signin?error=no_code');
        }, 3000);
        return;
      }

      // Success - deep link back to mobile app with code
      setStatus('success');

      // Track if user has left the page (deep link worked)
      let hasLeftPage = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;

      const visibilityHandler = () => {
        if (document.hidden) {
          hasLeftPage = true;
          // Clear the redirect timeout if page becomes hidden (app opened)
          if (timeoutId !== undefined) clearTimeout(timeoutId);
          document.removeEventListener('visibilitychange', visibilityHandler);
          window.removeEventListener('blur', blurHandler);
        }
      };

      const blurHandler = () => {
        // Page lost focus, likely because app opened
        hasLeftPage = true;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        document.removeEventListener('visibilitychange', visibilityHandler);
        window.removeEventListener('blur', blurHandler);
      };

      document.addEventListener('visibilitychange', visibilityHandler);
      window.addEventListener('blur', blurHandler);

      // Attempt to open the app via deep link
      window.location.href = `nihemart://auth/callback?code=${encodeURIComponent(code)}`;

      // Fallback: only redirect to web if app didn't open after 5 seconds
      timeoutId = setTimeout(() => {
        document.removeEventListener('visibilitychange', visibilityHandler);
        window.removeEventListener('blur', blurHandler);
        // Only redirect if user is still on this page (deep link didn't work)
        if (!hasLeftPage && !document.hidden) {
          router.replace('/signin?info=install_app');
        }
      }, 5000);
    } catch (err: any) {
      // console.error('Mobile callback error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred');
      // Try to deep link with error
      setTimeout(() => {
        window.location.href = `nihemart://auth/callback?error=${encodeURIComponent(err.message || 'callback_error')}`;
      }, 500);
      // Fallback to web signin
      setTimeout(() => {
        router.replace('/signin?error=callback_error');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow-lg text-center">
        {status === 'processing' && (
          <>
            <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Opening Nihemart App...
            </h2>
            <p className="text-gray-600">
              Please wait while we redirect you to the app
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Success!</h2>
            <p className="text-gray-600">Opening Nihemart app...</p>
            <p className="text-sm text-gray-500 mt-4">
              If the app doesn't open automatically, make sure you have it
              installed.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">{errorMsg}</p>
            <p className="text-sm text-gray-500">
              Redirecting to sign in page...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
