"use client";

import { FC, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const ResetSchema = z.object({
   password: z.string().min(6),
   confirmPassword: z.string().min(6),
});

type TReset = z.infer<typeof ResetSchema>;

const ResetPasswordForm: FC = () => {
   const searchParams = useSearchParams();
   const router = useRouter();
   const [token, setToken] = useState<string | null>(null);

   useEffect(() => {
      // Try query params first (Next.js `useSearchParams`), then fall back
      // to parsing the URL hash (Supabase sometimes returns tokens in the fragment).
      const fromQuery =
         searchParams?.get("access_token") || searchParams?.get("token");

      let t: string | null = fromQuery ?? null;

      if (!t && typeof window !== "undefined") {
         const hash = window.location.hash.replace(/^#/, "");
         if (hash) {
            const params = new URLSearchParams(hash);
            t = params.get("access_token") || params.get("token") || null;

            // Remove token from URL to avoid leaking it via referrers or logs
            if (t) {
               const cleanUrl =
                  window.location.origin +
                  window.location.pathname +
                  window.location.search;
               window.history.replaceState(null, "", cleanUrl);
            }
         }
      }

      setToken(t ?? null);
   }, [searchParams]);

   const form = useForm<TReset>({
      resolver: zodResolver(ResetSchema),
      defaultValues: { password: "", confirmPassword: "" },
   });

   const { t } = useLanguage();

   const onSubmit = async (data: TReset) => {
      if (data.password !== data.confirmPassword) {
         toast.error("Passwords do not match");
         return;
      }

      try {
         if (!token) {
            // If no token present, try updateUser which will require current session
            const { error } = await supabase.auth.updateUser({
               password: data.password,
            });
            if (error) {
               toast.error(error.message || "Failed to update password");
               return;
            }
            toast.success(t("auth.password.updated"));
            router.push("/signin");
            return;
         }

         // If token present, use the special endpoint to set new password via the session
         // The Supabase JS client supports updating user when a session exists with the access token in URL
         const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

         // If client already has a session (unlikely in reset flow), update normally
         if (sessionData?.session) {
            const { error } = await supabase.auth.updateUser({
               password: data.password,
            });
            if (error) {
               toast.error(error.message || "Failed to update password");
               return;
            }
            toast.success(t("auth.password.updated"));
            router.push("/signin");
            return;
         }

         // If we don't have an active session, call the REST endpoint to set the password using the token.
         // Supabase exposes a helper via the JS client: signInWithPassword isn't appropriate here.
         // We'll call the auth API directly using fetch against the Supabase auth endpoint.
         const SUPABASE_URL = (supabase as any).url;
         const key = (supabase as any).anonKey || (supabase as any).key;

         if (!SUPABASE_URL) {
            toast.error("Unable to determine auth endpoint");
            return;
         }

         const body = {
            type: "recover",
            email: null,
            password: data.password,
         } as any;

         // Use the /user endpoint with access token in query is tricky; instead, use a simple fetch to Supabase's auth/v1/user with Authorization: Bearer <token>
         const tokenHeader = token;
         const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: "PUT",
            headers: {
               "Content-Type": "application/json",
               Authorization: `Bearer ${tokenHeader}`,
            },
            body: JSON.stringify({ password: data.password }),
         });

         if (!res.ok) {
            const err = await res.json().catch(() => null);
            console.error("Reset error", err);
            toast.error("Failed to reset password");
            return;
         }

         toast.success(t("auth.password.updated"));
         router.push("/signin");
      } catch (err) {
         console.error(err);
         toast.error("An unexpected error occurred");
      }
   };

   return (
      <div className="w-full max-w-md mx-auto">
         <Form {...form}>
            <form
               onSubmit={form.handleSubmit(onSubmit)}
               className="space-y-4"
            >
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
                                 type="password"
                                 placeholder="Enter new password"
                                 {...field}
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
                  name="confirmPassword"
                  render={({ field }) => (
                     <FormItem>
                        <FormLabel className="text-zinc-500">
                           Confirm Password
                        </FormLabel>
                        <FormControl>
                           <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                 type="password"
                                 placeholder="Confirm new password"
                                 {...field}
                                 className="pl-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                              />
                           </div>
                        </FormControl>
                        <FormMessage />
                     </FormItem>
                  )}
               />

               <Button
                  type="submit"
                  className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white"
                  size="lg"
                  disabled={form.formState.isSubmitting}
               >
                  {form.formState.isSubmitting
                     ? t("auth.updating")
                     : t("auth.updatePassword")}
               </Button>
            </form>
         </Form>
      </div>
   );
};

export default ResetPasswordForm;
