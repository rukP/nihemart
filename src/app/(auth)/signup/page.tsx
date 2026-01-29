import Image from "next/image";
import type { Metadata } from "next";
import { FC } from "react";
import logo from "@/assets/logo.png";
import AdminSignupForm from "@/components/auth/admin/AdminSignupForm";

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Side (Always Visible) */}
      <div className="w-full lg:flex-[0.5] px-5 sm:px-10 flex items-center justify-center">
        <div className="w-full max-w-md sm:max-w-lg mx-auto">
          <div className="w-full relative flex items-center justify-center">
            <div className="mt-5"></div>
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
          <AdminSignupForm />
        </div>
      </div>

      {/* Right Side (Hidden on Mobile/Tablet) */}
      <div className="hidden lg:flex h-screen sticky top-0 p-1 flex-[0.5]">
        <div className="w-full h-full bg-brand-orange rounded-3xl flex flex-col justify-end overflow-hidden">
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

export const metadata: Metadata = {
  title: "Iyandikishe",
  description:
    "Fungura konti ya Nihemart kugirango utangire kugura no gukurikirana ibyaguzwe.",
};
export default page;
