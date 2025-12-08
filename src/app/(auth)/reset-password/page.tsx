import Image from "next/image";
import React, { FC, Suspense } from "react";
import logo from "@/assets/logo.png";
import ResetPasswordForm from "@/components/auth/admin/ResetPasswordForm";
import type { Metadata } from "next";

const page: FC = ({}) => {
   return (
      <div className="flex min-h-screen flex-col lg:flex-row">
         <div className="w-full lg:flex-[0.5] px-5 sm:px-10 py-8 flex items-center justify-center">
            <div className="w-full max-w-md sm:max-w-lg mx-auto">
               <div className="w-full relative h-40 sm:h-60 flex items-center justify-center">
                  <div
                     className="absolute z-10 inset-0"
                     style={{
                        background:
                           "radial-gradient(circle,rgba(54, 169, 236, 0) 10%, rgba(255, 255, 255, 1) 60%)",
                     }}
                  ></div>
                  <Image
                     src={"/Pattern.png"}
                     alt="pattern"
                     fill
                     className="object-cover"
                  />
                  <Image
                     src={logo}
                     alt="nihemart logo"
                     priority
                     height={50}
                     width={200}
                     className="mt-5 sm:mt-10 max-w-[150px] sm:max-w-[200px] object-contain z-20"
                  />
               </div>
               <Suspense
                  fallback={
                     <div className="py-6 text-center">Loading form...</div>
                  }
               >
                  <ResetPasswordForm />
               </Suspense>
            </div>
         </div>

         <div className="hidden lg:flex h-screen sticky top-0 p-1 flex-[0.5]">
            <div
               className="w-full h-full bg-brand-orange rounded-3xl flex flex-col justify-end overflow-hidden"
               style={{ backgroundImage: "url(/bg-Illustration1.png)" }}
            >
               <h2 className="px-5 py-4 text-white text-5xl lg:text-7xl font-bold text-center">
                  Nihemart Dashboard
               </h2>
               <Image
                  src={"/auth-page-girl.png"}
                  alt="auth page girl"
                  width={1000}
                  height={1200}
                  className="w-full h-auto object-contain"
               />
            </div>
         </div>
      </div>
   );
};

export default page;

export const metadata: Metadata = {
   title: "Hindura ijambo ry'ibanga",
   description:
      "Shyiraho ijambo ry'ibanga rishya rya konti yawe ya Nihemart ku buryo butekanye.",
};
