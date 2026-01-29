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
import { z } from "zod";
import { useResetPassword } from "@/hooks/useAuth";

const ResetSchema = z
   .object({
      password: z.string().min(6, "Password must be at least 6 characters"),
      confirmPassword: z
         .string()
         .min(6, "Password must be at least 6 characters"),
   })
   .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
   });

type TReset = z.infer<typeof ResetSchema>;

const ResetPasswordForm: FC = () => {
   const searchParams = useSearchParams();
   const router = useRouter();
   const [token, setToken] = useState<string | null>(null);
   const { mutateAsync: resetPassword, isPending } = useResetPassword();

   useEffect(() => {
      // Get token from URL query parameter
      const tokenParam = searchParams?.get("token");
      setToken(tokenParam ?? null);

      if (!tokenParam) {
         toast.error(
            "Invalid or missing reset token. Please request a new password reset."
         );
      }
   }, [searchParams]);

   const form = useForm<TReset>({
      resolver: zodResolver(ResetSchema),
      defaultValues: { password: "", confirmPassword: "" },
   });

   const { t } = useLanguage();

   const onSubmit = async (data: TReset) => {
      if (!token) {
         toast.error(
            "Reset token is required. Please use the link from your email."
         );
         return;
      }

      try {
         const response = await resetPassword({
            token,
            password: data.password,
         });

         toast.success(response.message || t("auth.password.updated"));
         router.push("/signin");
      } catch (error: any) {
         console.error("Reset password error:", error);
         toast.error(
            error?.message ||
               error?.error ||
               "Failed to reset password. The token may have expired. Please request a new one."
         );
      }
   };

   if (!token) {
      return (
         <div className="w-full max-w-md mx-auto text-center">
            <p className="text-red-500 mb-4">
               Invalid or missing reset token. Please request a new password
               reset.
            </p>
            <Button
               onClick={() => router.push("/forgot-password")}
               className="bg-brand-orange hover:bg-brand-orange/90 text-white"
            >
               Request New Reset Link
            </Button>
         </div>
      );
   }

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
                  disabled={isPending || form.formState.isSubmitting}
               >
                  {isPending || form.formState.isSubmitting
                     ? t("auth.updating")
                     : t("auth.updatePassword")}
               </Button>
            </form>
         </Form>
      </div>
   );
};

export default ResetPasswordForm;
