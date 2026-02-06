'use client';

import { FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminSignupSchema,
  TAdminSignupSchema,
} from '@/lib/validators/admin-auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import { useAuth, useGoogleAuthUrl } from '@/hooks/useAuth';
import { GoogleSignInButton } from './google-signin-button';
import { useLanguage } from '@/contexts/LanguageContext';
import { setEmailCookie } from '@/utils/emailCookie';

interface AdminSignupFormProps {}

const AdminSignupForm: FC<AdminSignupFormProps> = ({}) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [_phoneDisplay, _setPhoneDisplay] = useState<string>('');
  const { signUp } = useAuth();
  const { mutateAsync: getGoogleAuthUrl } = useGoogleAuthUrl();
  // Google sign-up handler (same as sign-in)
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';

      // For signup, we redirect to /signin after OAuth completes
      const callbackUrl = `${origin}/auth/callback`;

      console.log('Starting Google signup...');
      console.log('- Callback URL:', callbackUrl);

      // Inform the user that we're redirecting them to Google
      try {
        toast(t('auth.redirectingToGoogle'));
      } catch (_e) {
        // ignore toast errors
      }

      // Get Google OAuth URL from backend - no state needed for signup
      const { url } = await getGoogleAuthUrl(undefined);

      // Redirect to Google OAuth
      window.location.href = url;
    } catch (err: any) {
      console.error('Google sign-up failed:', err);
      toast.error(err?.message || t('auth.google.failed'));
      setGoogleLoading(false);
    }
  };

  const form = useForm<TAdminSignupSchema>({
    resolver: zodResolver(AdminSignupSchema),
    defaultValues: {
      email: '',
      fullName: '',
      // phoneNumber: "",
      password: '',
      confirmPassword: '',
      // rememberMe: false,
    },
  });

  const { t } = useLanguage();

  const onSubmit = async (formData: TAdminSignupSchema) => {
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setEmailCookie(formData.email);
    } catch (_e) {
      // ignore
    }

    const { error } = await signUp(
      formData.fullName,
      formData.email,
      formData.password
      // formData.phoneNumber
    );

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('auth.registrationSuccess'));
    redirect('/signin');
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-none border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">
          Welcome To Nihemart !
        </CardTitle>
      </CardHeader>
      <CardContent>
        <GoogleSignInButton
          onClick={handleGoogleSignUp}
          loading={googleLoading}
          variant="signup"
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-500">
                    {t('auth.email')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="admin@nihemart.com"
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
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-500">
                    {t('auth.fullName')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="John Doe"
                        {...field}
                        className="pl-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
                     control={form.control}
                     name="phoneNumber"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel className="text-zinc-500">
                              Phone Number
                           </FormLabel>
                           <FormControl>
                              <div className="relative">
                                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                 <Input
                                    placeholder="+250784148374"
                                    value={phoneDisplay || field.value || ""}
                                    onChange={(e) => {
                                       handlePhoneChange(e);
                                       // keep react-hook-form field in sync for other updates
                                       field.onChange(e);
                                    }}
                                    className="pl-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                                 />
                              </div>
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  /> */}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-500">
                    {t('auth.password')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        {...field}
                        className="pl-10 pr-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
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
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        {...field}
                        className="pl-10 pr-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
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

            {/* <div className="flex items-center justify-between">
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
                        href="#"
                        className="text-sm text-blue-500 hover:underline"
                     >
                        Forgot Password?
                     </Link>
                  </div> */}

            <Button
              type="submit"
              className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white"
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? t('auth.signingUp')
                : t('auth.signup.button')}
            </Button>
            <Link
              className="text-sm text-center mt-4 text-orange-600 underline cursor-pointer"
              href={'/signin'}
            >
              {t('auth.prompt.haveAccount')}
            </Link>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AdminSignupForm;
