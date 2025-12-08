import React from "react";
import ThankYou from "@/components/ThankYou";
import NavBar from "@/components/landing-page/NavBar";
import Footer from "@/components/landing-page/Footer";

export default function ThankYouPage() {
   return (
      <div className="min-h-screen flex flex-col">
         <NavBar />
         <main className="container mx-auto  py-6 flex-1">
            <ThankYou />
         </main>
         <Footer />
      </div>
   );
}
