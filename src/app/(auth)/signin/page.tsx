"use client";

import Image from "next/image";
import { FC, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import logo from "@/assets/logo.png";
import AdminSigninForm from "@/components/auth/admin/AdminSigninForm";

interface pageProps {}

const Page: FC<pageProps> = ({}) => {
  const router = useRouter();
  const [redirect, setRedirect] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Read redirect param on client mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setRedirect(params.get("redirect") ?? null);
    } catch (err) {
      setRedirect(null);
    }
  }, []);

  // If already logged in, redirect immediately
  useEffect(() => {
    if (user) {
      const safeRedirect =
        redirect && redirect.startsWith("/") && !redirect.includes("..")
          ? redirect
          : "/";
      router.push(safeRedirect);
    }
  }, [user, redirect, router]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Side (Always Visible) */}
      <div className="w-full lg:flex-[0.5] px-5 sm:px-10 flex items-center justify-center">
        <div className="w-full max-w-md sm:max-w-lg mx-auto">
          <div className="w-full relative flex items-center justify-center">
            <Image
              src={logo}
              alt="logo"
              priority
              height={100}
              width={100}
              className="m-auto"
              loading="eager"
            />
          </div>
          <AdminSigninForm redirect={redirect} />
        </div>
      </div>

      {/* Right Side (Hidden on Mobile/Tablet) */}
      <div className="hidden lg:flex h-screen sticky top-0 p-1 flex-[0.5]">
        <div className="w-full h-full bg-brand-orange rounded-3xl flex flex-col justify-end overflow-hidden bg-[url('/bg-Illustration1.png')] bg-cover bg-center bg-no-repeat">
          <h2 className="px-5 py-4 text-white text-5xl lg:text-7xl font-bold text-center">
            Nihemart
          </h2>
          <Image
            src={"/auth-page-girl.png"}
            alt="auth page girl"
            width={1000}
            height={1200}
            className="w-full h-auto object-contain"
            priority
            loading="eager"
          />
        </div>
      </div>
    </div>
  );
};

export default Page;
