'use client';

import { Loader2 } from 'lucide-react';

// ============================================================================
// FINALIZING BANNER COMPONENT
// Displays a sticky banner when payment is being finalized after return
// from external payment provider.
// ============================================================================

export interface FinalizingBannerProps {
  isFinalizing: boolean;
}

export function FinalizingBanner({ isFinalizing }: FinalizingBannerProps) {
  if (!isFinalizing) return null;

  return (
    <div className="sticky top-16 z-40 mb-4">
      <div className="mx-auto max-w-[90vw] sm:max-w-7xl px-2 sm:px-0">
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin h-4 w-4" />
            <div className="text-sm">Finalizing payment, please wait...</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinalizingBanner;
