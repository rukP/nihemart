"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import { processOAuthRedirect } from "@/providers/processOAuthRedirect";
import { Loader } from "lucide-react";
import { toast } from "sonner";

export default function AuthCallback() {
   const router = useRouter();
   const { setUser, setSession, fetchRoles, setRoles } = useAuthStore();
   const [hasProcessed, setHasProcessed] = useState(false);
   const [showRefresh, setShowRefresh] = useState(false);

   useEffect(() => {
      // Show refresh button after 5 seconds if still on callback page
      // (shorter timeout improves perceived responsiveness)
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

            // Process the OAuth redirect
            const result = await processOAuthRedirect(supabase, {
               setSession,
               setUser,
               fetchRoles,
               setRoles,
            });

            if (result?.sessionHandled) {
               // Session was successfully established
               // Notify the user both in English and Kinyarwanda
               try {
                  toast.success("You are now logged in to Nihemart");
               } catch (e) {
                  // ignore toast errors
               }
               const redirectTarget = result.redirectParam;
               const safeRedirect =
                  redirectTarget &&
                  redirectTarget.startsWith("/") &&
                  !redirectTarget.includes("..")
                     ? redirectTarget
                     : "/";

               // Small delay to ensure state is updated
               await new Promise((resolve) => setTimeout(resolve, 500));

               setShowRefresh(false);
               router.replace(safeRedirect);
               return;
            }

            // If session wasn't handled, wait a bit and try one more time
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const { data } = await supabase.auth.getSession();

            if (data?.session?.user) {
               setSession(data.session);
               setUser(data.session.user);

               await fetchRoles(data.session.user.id);

               const storedRedirect = localStorage.getItem("oauth_redirect");
               const safeRedirect =
                  storedRedirect &&
                  storedRedirect.startsWith("/") &&
                  !storedRedirect.includes("..")
                     ? storedRedirect
                     : "/";

               localStorage.removeItem("oauth_redirect");

               try {
                  toast.success("You are now logged in to Nihemart");
               } catch (e) {
                  // ignore
               }

               router.replace(safeRedirect);
            } else {
               await new Promise((resolve) => setTimeout(resolve, 1000));
               toast.error("Could not complete sign-in. Please try again.");
               router.replace("/signin?error=no_session");
            }
         } catch (error: any) {
            // Show user-facing error and redirect back to sign-in
            try {
               toast.error(
                  error?.message || "Sign-in callback failed. Please try again."
               );
            } catch (e) {
               // ignore
            }
            await new Promise((resolve) => setTimeout(resolve, 1500));
            router.replace("/signin?error=callback_error");
         }
      };

      handleOAuthCallback();
   }, [router, setSession, setUser, fetchRoles, setRoles, hasProcessed]);

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
