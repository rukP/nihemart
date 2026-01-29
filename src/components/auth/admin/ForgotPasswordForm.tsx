"use client";

import { FC } from "react";
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
import { Mail } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { useForgotPassword } from "@/hooks/useAuth";

const ForgotSchema = z.object({
   email: z.string().email(),
});

type TForgot = z.infer<typeof ForgotSchema>;

const ForgotPasswordForm: FC = () => {
   const form = useForm<TForgot>({
      resolver: zodResolver(ForgotSchema),
      defaultValues: { email: "" },
   });

   const { t } = useLanguage();
   const { mutateAsync: forgotPassword, isPending } = useForgotPassword();

   const onSubmit = async (data: TForgot) => {
      try {
         const response = await forgotPassword(data.email);
         
         // Backend returns a generic message for security (doesn't reveal if email exists)
         toast.success(response.message || t("auth.resetEmailSent"));
         form.reset();
      } catch (error: any) {
         console.error("Forgot password error:", error);
         toast.error(
            error?.message || 
            error?.error || 
            "Failed to send reset email. Please try again."
         );
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
                                 placeholder="you@company.com"
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
                     ? t("auth.sending")
                     : t("auth.sendResetEmail")}
               </Button>

               <div className="mt-3 text-sm text-center text-zinc-600">
                  <p>
                     Check your inbox and spam folder for the reset email. If
                     you don't receive it in a few minutes, try again or contact
                     support.
                  </p>
                  <p className="mt-2">
                     <Link
                        href="/signin"
                        className="text-brand-orange underline"
                     >
                        {t("auth.backToSignIn")}
                     </Link>
                  </p>
               </div>
            </form>
         </Form>
      </div>
   );
};

export default ForgotPasswordForm;
