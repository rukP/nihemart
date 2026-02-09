'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// EMPTY CART VIEW COMPONENT
// Displays a message and CTA when the cart is empty on checkout page.
// ============================================================================

export interface EmptyCartViewProps {
  t: (key: string) => string;
  onContinueShopping: () => void;
}

export function EmptyCartView({ t, onContinueShopping }: EmptyCartViewProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center py-12">
        <ShoppingCart className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground mx-auto mb-4 sm:mb-6" />
        <h1 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4 px-2">
          {t('checkout.cartEmptyTitle')}
        </h1>
        <p className="text-muted-foreground mb-6 sm:mb-8 px-4 text-sm sm:text-base">
          {t('checkout.cartEmptyInfo')}
        </p>
        <Button
          onClick={onContinueShopping}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base"
        >
          {t('checkout.continueShopping')}
        </Button>
      </div>
    </div>
  );
}

export default EmptyCartView;
