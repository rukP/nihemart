import { z } from 'zod';

// ============================================================================
// CHECKOUT VALIDATION UTILITIES
// Provides validation schemas and form validation functions for checkout.
// ============================================================================

/**
 * Create phone validation schema with internationalization support
 */
export function createPhoneSchema(t: (key: string) => string) {
  return z.object({
    phone: z
      .string()
      .nonempty({
        message: t('checkout.errors.phoneRequired') || 'Phone is required',
      })
      .refine(
        val => {
          // Clean the input - remove all non-digit characters except +
          const cleaned = val.replace(/[^\d+]/g, '');

          // Pattern 1: +250 followed by 9 digits (total 13 chars including +)
          if (/^\+250\d{9}$/.test(cleaned)) return true;

          // Pattern 2: 07 followed by 8 digits (total 10 digits)
          if (/^07\d{8}$/.test(cleaned)) return true;

          return false;
        },
        {
          message:
            t('checkout.errors.validPhone') ||
            'Phone must be in format +250XXXXXXXXX or 07XXXXXXXX',
        }
      ),
  });
}

export interface CheckoutFormData {
  email: string;
  fullName: string;
  address: string;
  city: string;
  phone: string;
  delivery_notes: string;
}

export interface ValidationErrors {
  email?: string;
  fullName?: string;
  address?: string;
  phone?: string;
  [key: string]: string | undefined;
}

export interface ValidateFormOptions {
  formData: CheckoutFormData;
  selectedAddress: any;
  isLoggedIn: boolean;
  t: (key: string) => string;
}

/**
 * Validate checkout form data
 */
export function validateCheckoutForm({
  formData,
  selectedAddress,
  isLoggedIn,
  t,
}: ValidateFormOptions): ValidationErrors {
  const formErrors: ValidationErrors = {};
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  const phoneSchema = createPhoneSchema(t);

  // For logged in users, validate email if provided
  if (isLoggedIn && formData.email && formData.email.trim()) {
    if (!emailPattern.test(formData.email)) {
      formErrors.email =
        t('checkout.errors.validEmailRequired') || 'Please enter a valid email';
    }
  }

  // When placing an order as a guest require the customer's name and phone
  if (!isLoggedIn) {
    if (!formData.fullName || !String(formData.fullName).trim()) {
      formErrors.fullName =
        t('checkout.errors.fullNameRequired') || 'Full name is required';
    }

    try {
      // Phone may come from the selected address; prefer that when present
      const phoneToValidate =
        (selectedAddress && selectedAddress.phone) || formData.phone || '';
      phoneSchema.parse({ phone: phoneToValidate });
    } catch (ve: any) {
      const first = ve?.errors?.[0]?.message || t('checkout.errors.validPhone');
      formErrors.phone = first;
    }
  }

  // Validate address
  const hasAddressValue =
    (formData.address && formData.address.trim()) || selectedAddress;
  if (!hasAddressValue) {
    formErrors.address =
      t('checkout.errors.addressRequired') || 'Delivery address is required';
  }

  return formErrors;
}

/**
 * Format phone input for Rwanda numbers
 */
export function formatPhoneInput(input: string): string {
  // Remove non-digit characters except +
  const cleaned = input.replace(/[^\d+]/g, '');

  // Handle +250 prefix
  if (cleaned.startsWith('+250')) {
    // Already has international prefix
    return cleaned;
  }

  // Handle 250 prefix (without +)
  if (cleaned.startsWith('250') && cleaned.length > 3) {
    return '+' + cleaned;
  }

  // Handle 07 prefix (local format)
  if (cleaned.startsWith('07')) {
    return cleaned;
  }

  // Handle just 7 (missing leading 0)
  if (cleaned.startsWith('7') && !cleaned.startsWith('+')) {
    return '0' + cleaned;
  }

  return cleaned;
}
