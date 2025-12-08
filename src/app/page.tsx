import type { Metadata } from "next";
import AnnouncementBar from "@/components/landing-page/AnnouncementBar";
import Footer from "@/components/landing-page/Footer";
import HeroCarousel from "@/components/landing-page/HeroCarousel";
import NavBar from "@/components/landing-page/NavBar";
import { FC, Suspense, lazy } from "react";

// Lazy load heavy components
const Collection = lazy(() => import("@/components/landing-page/Collection"));
const FeaturedProducts = lazy(
   () => import("@/components/landing-page/FeaturedProducts")
);
const MoreProducts = lazy(
   () => import("@/components/landing-page/MoreProducts")
);
const MoreToLove = lazy(() => import("@/components/landing-page/MoreToLove"));

interface pageProps {}

export const revalidate = 3600; 

export const metadata: Metadata = {
   
   title: "Ahabanza - Nihemart",
   description:
      "Nihemart — Gura ibicuruzwa bitandukanye, ubigezwaho byihuse kandi ku giciro cyiza.",
};

const page: FC<pageProps> = ({}) => {
   return (
      <div className="w-full">
         <AnnouncementBar />
         <NavBar />
         <HeroCarousel />
         <Suspense
            fallback={
               <div className="my-20 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
               </div>
            }
         >
            <Collection />
         </Suspense>
         <Suspense
            fallback={
               <div className="my-20">
                  <div className="max-w-6xl mx-auto px-4">
                     <div className="h-8 bg-gray-200 rounded mb-5 animate-pulse"></div>
                     <div className="flex gap-3 mb-8">
                        {Array.from({ length: 4 }).map((_, i) => (
                           <div
                              key={i}
                              className="h-10 w-20 bg-gray-200 rounded-full animate-pulse"
                           ></div>
                        ))}
                     </div>
                     <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-4 gap-5">
                        {Array.from({ length: 8 }).map((_, i) => (
                           <div
                              key={i}
                              className="aspect-[9/12] bg-gray-200 rounded-2xl animate-pulse"
                           ></div>
                        ))}
                     </div>
                  </div>
               </div>
            }
         >
            <FeaturedProducts />
         </Suspense>
         <Suspense
            fallback={
               <div className="my-20">
                  <div className="max-w-6xl mx-auto px-4">
                     <div className="h-8 bg-gray-200 rounded mb-5 animate-pulse"></div>
                     <div className="flex gap-3 mb-8">
                        {Array.from({ length: 4 }).map((_, i) => (
                           <div
                              key={i}
                              className="h-10 w-20 bg-gray-200 rounded-full animate-pulse"
                           ></div>
                        ))}
                     </div>
                     <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-4 gap-5">
                        {Array.from({ length: 14 }).map((_, i) => (
                           <div
                              key={i}
                              className="aspect-[9/12] bg-gray-200 rounded-2xl animate-pulse"
                           ></div>
                        ))}
                     </div>
                  </div>
               </div>
            }
         >
            <MoreProducts />
         </Suspense>
         <Suspense
            fallback={
               <div className="my-20 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
               </div>
            }
         >
            <MoreToLove />
         </Suspense>
         <Footer />
      </div>
   );
};

export default page;
