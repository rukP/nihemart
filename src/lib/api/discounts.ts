import { authorizedAPI, unauthorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';

export enum DiscountType {
  percentage = 'percentage',
  fixed_amount = 'fixed_amount',
}

export enum DiscountStatus {
  active = 'active',
  inactive = 'inactive',
  expired = 'expired',
  scheduled = 'scheduled',
}

export interface Discount {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  type: DiscountType;
  value: number;
  minPurchaseAmount?: number | null;
  maxDiscountAmount?: number | null;
  status: DiscountStatus;
  usageLimit?: number | null;
  usedCount: number;
  appliesTo?: string | null;
  categoryIds?: string[];
  productIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  products?: Array<{
    id: string;
    name: string;
    mainImageUrl?: string | null;
    price: number;
    status?: string;
  }>;
}

export interface DiscountInput {
  name: string;
  description?: string | null;
  code?: string | null;
  type: DiscountType;
  value: number;
  minPurchaseAmount?: number | null;
  maxDiscountAmount?: number | null;
  status?: DiscountStatus;
  usageLimit?: number | null;
  appliesTo?: string | null;
  categoryIds?: string[];
  productIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
}

export interface DiscountListOptions {
  search?: string;
  status?: DiscountStatus | 'all';
  page?: number;
  limit?: number;
}

/**
 * Fetch all discounts (admin)
 */
export async function fetchDiscounts(options?: DiscountListOptions): Promise<{
  data: Discount[];
  count: number;
  page: number;
  limit: number;
}> {
  const params = new URLSearchParams();
  if (options?.search) params.append('search', options.search);
  if (options?.status && options.status !== 'all')
    params.append('status', options.status);
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  const queryString = params.toString();
  const response = await handleApiRequest(() =>
    authorizedAPI.get(`/discounts${queryString ? `?${queryString}` : ''}`)
  );

  return {
    data: response.data || [],
    count: response.count || 0,
    page: response.page || 1,
    limit: response.limit || 20,
  };
}

/**
 * Get discount by ID (admin)
 */
export async function getDiscount(id: string): Promise<Discount> {
  return handleApiRequest(() => authorizedAPI.get(`/discounts/${id}`));
}

/**
 * Create discount (admin)
 */
export async function createDiscount(input: DiscountInput): Promise<Discount> {
  return handleApiRequest(() => authorizedAPI.post('/discounts', input));
}

/**
 * Update discount (admin)
 */
export async function updateDiscount(
  id: string,
  input: Partial<DiscountInput>
): Promise<Discount> {
  return handleApiRequest(() => authorizedAPI.put(`/discounts/${id}`, input));
}

/**
 * Delete discount (admin)
 */
export async function deleteDiscount(id: string): Promise<void> {
  return handleApiRequest(() => authorizedAPI.delete(`/discounts/${id}`));
}

/**
 * Validate discount code (public/store)
 */
export async function validateDiscountCode(
  code: string,
  options?: {
    productIds?: string[];
    totalAmount?: number;
  }
): Promise<{
  valid: boolean;
  error?: string;
  discount?: {
    id: string;
    name: string;
    type: DiscountType;
    value: number;
    maxDiscountAmount?: number | null;
  };
}> {
  try {
    const response = await handleApiRequest(() =>
      unauthorizedAPI.post('/discounts/validate', {
        code,
        productIds: options?.productIds,
        totalAmount: options?.totalAmount,
      })
    );
    return response;
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Failed to validate discount code',
    };
  }
}

/**
 * Calculate discount amount
 */
export function calculateDiscountAmount(
  discount: {
    type: DiscountType;
    value: number;
    maxDiscountAmount?: number | null;
  },
  amount: number
): number {
  let discountAmount = 0;

  if (discount.type === DiscountType.percentage) {
    discountAmount = (amount * discount.value) / 100;
    if (
      discount.maxDiscountAmount &&
      discountAmount > discount.maxDiscountAmount
    ) {
      discountAmount = discount.maxDiscountAmount;
    }
  } else {
    discountAmount = discount.value;
    if (discountAmount > amount) {
      discountAmount = amount; // Can't discount more than the total
    }
  }

  return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
}
