'use client';

import React, { useEffect, useState } from 'react';
import ThankYou from '@/components/ThankYou';
import NavBar from '@/components/landing-page/NavBar';
import Footer from '@/components/landing-page/Footer';
// Note: globals.css is already imported in app/layout.tsx (Server Component)
// CSS imports in client components can cause issues in production builds

const THANKYOU_ACCESS_KEY = 'nihemart_thank_you_access';

export default function ThankYouPage() {
  const [isValidAccess, setIsValidAccess] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user came from order workflow
    if (typeof window === 'undefined') return;

    const hasAccess = sessionStorage.getItem(THANKYOU_ACCESS_KEY);

    if (hasAccess) {
      // Valid access from order workflow
      setIsValidAccess(true);
      // Clear the flag after using it
      sessionStorage.removeItem(THANKYOU_ACCESS_KEY);
    } else {
      // Manual access - show different message
      setIsValidAccess(false);
    }
  }, []);

  // Show loading state while checking
  if (isValidAccess === null) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="container mx-auto py-6 flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="container mx-auto py-6 flex-1">
        <ThankYou isValidAccess={isValidAccess} />
      </main>
      <Footer />
    </div>
  );
}
