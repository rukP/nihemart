import Footer from "@/components/landing-page/Footer";
import NavBar from "@/components/landing-page/NavBar";
import Link from "next/link";

export default function NotFound() {
   return (
      <>
         <NavBar />
         {/* Background with animated gradients */}
         <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 via-transparent to-orange-400/20"></div>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/30 rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-400/30 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
         </div>

         <main className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="max-w-2xl text-center space-y-8">
               {/* 404 Number with gradient */}
               <div className="relative">
                  <p className="text-9xl sm:text-[12rem] font-extrabold bg-gradient-to-br from-blue-500 via-blue-600 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">
                     404
                  </p>
                  <div className="absolute inset-0 -z-10 blur-2xl opacity-50">
                     <p className="text-9xl sm:text-[12rem] font-extrabold bg-gradient-to-br from-blue-500 to-orange-500 bg-clip-text text-transparent">
                        404
                     </p>
                  </div>
               </div>

               {/* Content */}
               <div className="space-y-4 backdrop-blur-sm bg-white/40 rounded-2xl p-8 shadow-xl border border-white/60">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-600 bg-clip-text text-transparent">
                     Page Not Found
                  </h1>
                  <p className="text-gray-700 text-lg max-w-md mx-auto">
                     Oops! The page you&apos;re looking for seems to have
                     wandered off. Let&apos;s get you back on track.
                  </p>

                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                     <Link
                        href="/"
                        className="group relative inline-flex items-center justify-center px-8 py-3 font-semibold text-white transition-all duration-300 ease-in-out bg-gradient-to-r from-blue-500 to-orange-500 rounded-full shadow-lg hover:shadow-xl hover:scale-105"
                     >
                        <span className="relative z-10">Go Back Home</span>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     </Link>
                  </div>
               </div>

               {/* Decorative elements */}
               <div className="flex items-center justify-center gap-8 pt-4 opacity-60">
                  <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full"></div>
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <div className="w-16 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent rounded-full"></div>
               </div>
            </div>
         </main>
         <Footer />
      </>
   );
}
