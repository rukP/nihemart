"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleCallback } from "@/hooks/useAuth";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import { getRedirectUrl } from "@/utils/auth/redirect";

export default function AuthCallback() {
   const router = useRouter();
   const { mutateAsync: handleGoogleCallback } = useGoogleCallback();
   const [hasProcessed, setHasProcessed] = useState(false);
   const [showRefresh, setShowRefresh] = useState(false);

   useEffect(() => {
      // Show refresh button after 5 seconds if still on callback page
      const timer = setTimeout(() => {
         setShowRefresh(true);
      }, 5000);

      return () => clearTimeout(timer);
   }, []);

   useEffect(() => {
      // Prevent double processing
      if (hasProcessed) return;

      const handleOAuthCallback = async () => {
         try {
            // Mark as processed to prevent double execution
            setHasProcessed(true);

            // Get the authorization code from URL
            const url = new URL(window.location.href);
            const code = url.searchParams.get("code");
            const error = url.searchParams.get("error");

            if (error) {
               toast.error("OAuth authentication failed. Please try again.");
               router.replace("/signin?error=oauth_error");
               return;
            }

            if (!code) {
               toast.error("No authorization code received. Please try again.");
               router.replace("/signin?error=no_code");
               return;
            }

            // Exchange code for tokens via backend
            const response = await handleGoogleCallback(code);

            // Auth data is already stored by the hook's onSuccess

            // Get redirect param from localStorage or URL
            let redirectParam: string | null = null;
            try {
               redirectParam = localStorage.getItem("oauth_redirect");
               if (redirectParam) {
                  localStorage.removeItem("oauth_redirect");
               }
            } catch (e) {
               console.warn("Could not read from localStorage:", e);
            }

            // If no stored redirect, check URL
            if (!redirectParam) {
               redirectParam = url.searchParams.get("redirect");
            }

            // Use role-based redirect with fallback to redirect param
            const userRoles = response?.user?.roles || [];
            const redirectUrl = getRedirectUrl(redirectParam, userRoles);

            // Clean up URL
            url.searchParams.delete("code");
            url.searchParams.delete("state");
            url.searchParams.delete("redirect");
            window.history.replaceState({}, document.title, url.pathname);

            toast.success("You are now logged in to Nihemart");
            setShowRefresh(false);
            router.replace(redirectUrl);
         } catch (error: any) {
            console.error("OAuth callback error:", error);

            // Provide more specific error messages
            let errorMessage = "Sign-in callback failed. Please try again.";
            if (error?.response?.data?.error) {
               errorMessage = error.response.data.error;
            } else if (error?.response?.data?.message) {
               errorMessage = error.response.data.message;
            } else if (error?.message) {
               errorMessage = error.message;
            }

            toast.error(errorMessage);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            router.replace("/signin?error=callback_error");
         }
      };

      handleOAuthCallback();
   }, [router, handleGoogleCallback, hasProcessed]);

   const handleRefresh = () => {
      window.location.href = "/signin";
   };

   return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full mx-4 border border-gray-100">
            <div className="relative mb-6">
               <div className="relative inline-block">
                  <Loader className="h-12 w-12 animate-spin text-blue-500" />
                  <div className="absolute inset-0 animate-pulse opacity-30 blur-sm">
                     <Loader className="h-12 w-12 text-orange-500" />
                  </div>
               </div>
            </div>
            <h2 className="text-2xl text-gray-800 font-bold mb-2">
               Almost there...
            </h2>
            <p className="text-sm text-gray-500 mb-6">
               Completing your sign in
            </p>

            {showRefresh && (
               <button
                  onClick={handleRefresh}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-lg hover:from-blue-600 hover:to-orange-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
               >
                  Taking too long? Click to refresh
               </button>
            )}
         </div>
      </div>
   );
}
