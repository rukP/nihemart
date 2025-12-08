"use client";

import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
   AdminSigninSchema,
   TAdminSigninSchema,
} from "@/lib/validators/admin-auth";
import { Button } from "@/components/ui/button";
import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader } from "lucide-react";
import { toast } from "sonner";
import { setEmailCookie } from "@/utils/emailCookie";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "./google-signin-button";
import { useLanguage } from "@/contexts/LanguageContext";

interface AdminSigninFormProps {
   redirect?: string | null;
}

const AdminSigninForm: FC<AdminSigninFormProps> = ({ redirect }) => {
   const [showPassword, setShowPassword] = useState<boolean>(false);
   const [googleLoading, setGoogleLoading] = useState(false);
   const { signIn, hasRole, user, loading } = useAuth();
   const router = useRouter();
   // Use the prop if provided, otherwise derive from window.location in effect
   const [redirectParamState, setRedirectParamState] = useState<string | null>(
      null
   );

   const redirectParam = redirect ?? redirectParamState;

   // Read redirect param on mount (client-only)
   useEffect(() => {
      try {
         const params = new URLSearchParams(window.location.search);
         setRedirectParamState(params.get("redirect") ?? null);
      } catch (err) {
         setRedirectParamState(null);
      }
   }, []);

   // Prefill email field if provided as a query param (eg. ?email=...)
   useEffect(() => {
      try {
         const params = new URLSearchParams(window.location.search);
         const emailParam = params.get("email");
         if (emailParam) {
            form.setValue("email", emailParam);
         }
      } catch (e) {
         // ignore
      }
   }, []);

   // Google sign-in handler - FIXED
   const { t } = useLanguage();

   const handleGoogleSignIn = async () => {
      setGoogleLoading(true);
      try {
         const origin =
            typeof window !== "undefined" ? window.location.origin : "";

         // CRITICAL: Store redirect in localStorage before OAuth redirect
         // because Supabase OAuth doesn't reliably preserve query parameters
         if (redirectParam) {
            try {
               localStorage.setItem("oauth_redirect", redirectParam);
               console.log("Stored redirect in localStorage:", redirectParam);
            } catch (e) {
               console.warn("Could not store redirect in localStorage:", e);
            }
         } else {
            // Clear any stale redirect
            try {
               localStorage.removeItem("oauth_redirect");
            } catch (e) {
               // ignore
            }
         }

         // Build callback URL - don't add redirect as query param
         // because it will likely be stripped by OAuth flow
         const redirectTo = `${origin}/auth/callback`;

         console.log("Starting Google OAuth...");
         console.log("- Origin redirect param:", redirectParam);
         console.log("- Callback URL:", redirectTo);

         // Inform the user that we're redirecting them to Google
         try {
            toast(t("auth.redirectingToGoogle"));
         } catch (e) {
            // ignore toast errors
         }

         const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
               redirectTo,
               queryParams: {
                  access_type: "offline",
               },
            },
         });

         // Note: Most OAuth flows will redirect before we reach here
         // Only handle errors that prevent the redirect
         if (error) {
            console.error("Google OAuth initiation error:", error);
            toast.error(t("auth.google.startFailed"));

            // Clear stored redirect on error
            try {
               localStorage.removeItem("oauth_redirect");
            } catch (e) {
               // ignore
            }
         }
      } catch (err: any) {
         console.error("Google sign-in failed:", err);
         toast.error(err?.message || t("auth.google.failed"));

         // Clear stored redirect on error
         try {
            localStorage.removeItem("oauth_redirect");
         } catch (e) {
            // ignore
         }
      } finally {
         // Note: This may not execute if OAuth redirect happens
         setGoogleLoading(false);
      }
   };

   const form = useForm<TAdminSigninSchema>({
      resolver: zodResolver(AdminSigninSchema),
      defaultValues: {
         email: "",
         password: "",
         rememberMe: false,
      },
   });

   const onSubmit = async (formData: TAdminSigninSchema) => {
      try {
         const { email, password } = formData;
         // Persist email to cookie so middleware can detect if user exists
         try {
            setEmailCookie(email);
         } catch (e) {
            // ignore cookie errors
         }
         const { error } = await signIn(email, password);

         if (error) {
            toast.error(error);
            return;
         }

         toast.success(t("auth.loggedInSuccess"));
         form.reset();

         // Use redirect parameter if available and safe
         const safeRedirect =
            redirectParam && redirectParam.startsWith("/")
               ? redirectParam
               : null;

         if (safeRedirect) {
            router.push(safeRedirect);
         } else {
            // Fallback to role-based routing
            if (hasRole("admin")) {
               router.push("/admin");
            } else if (hasRole("rider")) {
               router.push("/rider");
            } else {
               router.push("/");
            }
         }
      } catch (error: any) {
         toast.error(error?.message || t("auth.signin.failed"));
      }
   };

   return (
      <Card className="w-full max-w-md mx-auto shadow-none border-0 lg:mt-7">
         <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
               Welcome Back <span className="lg:hidden">to Nihemart</span>!
            </CardTitle>
         </CardHeader>
         <CardContent>
            <GoogleSignInButton
               onClick={handleGoogleSignIn}
               loading={googleLoading}
               variant="signin"
            />
            <div className="relative my-4">
               <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
               </div>
               <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">or</span>
               </div>
            </div>
            <Form {...form}>
               <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
               >
                  <FormField
                     control={form.control}
                     name="email"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel className="text-zinc-500">
                              {t("auth.email")}
                           </FormLabel>
                           <FormControl>
                              <div className="relative">
                                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                 <Input
                                    placeholder="admin@nihemart.com"
                                    {...field}
                                    onChange={(e) => {
                                       field.onChange(e);
                                       try {
                                          setEmailCookie(e.target.value);
                                       } catch (err) {
                                          // ignore
                                       }
                                    }}
                                    className="pl-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                                 />
                              </div>
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />

                  <FormField
                     control={form.control}
                     name="password"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel className="text-zinc-500">
                              {t("auth.password")}
                           </FormLabel>
                           <FormControl>
                              <div className="relative">
                                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                 <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    {...field}
                                    className="pl-10 pr-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                                 />
                                 <button
                                    type="button"
                                    onClick={() =>
                                       setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    aria-label={
                                       showPassword
                                          ? "Hide password"
                                          : "Show password"
                                    }
                                 >
                                    {showPassword ? (
                                       <EyeOff className="h-5 w-5 text-gray-400" />
                                    ) : (
                                       <Eye className="h-5 w-5 text-gray-400" />
                                    )}
                                 </button>
                              </div>
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />

                  <div className="flex items-center justify-between">
                     <FormField
                        control={form.control}
                        name="rememberMe"
                        render={({ field }) => (
                           <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                 <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                 />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                 <FormLabel className="text-zinc-500">
                                    Remember me
                                 </FormLabel>
                              </div>
                           </FormItem>
                        )}
                     />
                     <Link
                        href="/forgot-password"
                        className="text-sm text-blue-500 hover:underline"
                     >
                        {t("auth.forgotPassword")}
                     </Link>
                  </div>

                  <Button
                     type="submit"
                     className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white"
                     size="lg"
                     disabled={form.formState.isSubmitting}
                  >
                     {form.formState.isSubmitting ? (
                        <>
                           <Loader className="mr-2 h-4 w-4 animate-spin" />
                           {t("auth.signingIn")}
                        </>
                     ) : (
                        t("auth.signin.button")
                     )}
                  </Button>
                  <Link
                     className="text-sm text-center mt-4 text-orange-600 underline cursor-pointer block "
                     href={
                        redirectParam
                           ? `/signup?redirect=${encodeURIComponent(
                                redirectParam
                             )}`
                           : "/signup"
                     }
                  >
                     {t("auth.prompt.noAccount")}
                  </Link>
               </form>
            </Form>
         </CardContent>
      </Card>
   );
};

export default AdminSigninForm;
