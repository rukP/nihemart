'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// SELECTED ADDRESS CARD COMPONENT
// Displays the currently selected delivery address in the order summary.
// ============================================================================

export interface SelectedAddress {
  id?: string;
  display_name?: string;
  street?: string;
  city?: string;
  phone?: string;
  _isTemp?: boolean;
}

export interface SelectedAddressCardProps {
  t: (key: string) => string;
  selectedAddress: SelectedAddress;
  isLoggedIn: boolean;
  onEdit: () => void;
}

export function SelectedAddressCard({
  t,
  selectedAddress,
  isLoggedIn,
  onEdit,
}: SelectedAddressCardProps) {
  if (!selectedAddress) return null;

  return (
    <div className="border-2 border-orange-200 p-3 sm:p-4 rounded-lg bg-gradient-to-r from-orange-50 to-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start min-w-0 flex-1">
          <div className="mr-2 sm:mr-3 mt-0.5 flex-shrink-0">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-900">
              {t('checkout.deliveringTo')}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 break-words">
              {selectedAddress.display_name}
            </p>
            <p className="text-xs text-gray-600 break-words">
              {selectedAddress.city}
              {selectedAddress.phone ? ` • ${selectedAddress.phone}` : ''}
            </p>
          </div>
        </div>
        {isLoggedIn && (
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="border-orange-300 text-orange-600 hover:bg-orange-50 flex-shrink-0 text-xs h-7 sm:h-9 whitespace-nowrap"
          >
            {t('common.edit')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default SelectedAddressCard;
