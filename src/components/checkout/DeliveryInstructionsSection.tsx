'use client';

import { Package } from 'lucide-react';

// ============================================================================
// DELIVERY INSTRUCTIONS SECTION COMPONENT
// Handles the optional delivery notes/instructions textarea.
// ============================================================================

export interface DeliveryInstructionsSectionProps {
  t: (key: string) => string;
  deliveryNotes: string;
  onDeliveryNotesChange: (notes: string) => void;
}

export function DeliveryInstructionsSection({
  t,
  deliveryNotes,
  onDeliveryNotesChange,
}: DeliveryInstructionsSectionProps) {
  return (
    <div className="space-y-4 sm:space-y-5 border border-gray-200 rounded-xl p-4 sm:p-5 bg-gradient-to-b from-gray-50 to-white shadow-sm">
      <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
        </div>
        <span className="text-base sm:text-lg font-semibold text-gray-900">
          {t('checkout.deliveryInstructions')}
        </span>
        <span className="text-xs text-gray-500">
          ({t('common.optional') || 'Optional'})
        </span>
      </div>
      <div>
        <textarea
          id="delivery_notes"
          rows={3}
          placeholder={
            t('checkout.writeDeliveryInstructions') ||
            'Enter any special delivery instructions...'
          }
          value={deliveryNotes}
          onChange={e => onDeliveryNotesChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-colors text-xs sm:text-sm"
        />
        <p className="mt-2 text-xs text-gray-500">
          {t('checkout.deliveryInstructionsHelper') ||
            'Add any special instructions for delivery (e.g., landmarks, preferred time)'}
        </p>
      </div>
    </div>
  );
}

export default DeliveryInstructionsSection;
