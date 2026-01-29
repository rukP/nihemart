import { authorizedAPI } from "../api";
import handleApiRequest from "@/lib/handleApiRequest";

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: "pending" | "completed" | "failed" | "timeout";
  reference: string;
  kpayTransactionId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failureReason?: string;
  clientTimeout?: boolean;
  clientTimeoutReason?: string;
  kpayMomTransactionId?: string;
  order?: any;
}

export interface PaymentFilters {
  status?: string;
  orderId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaymentsResponse {
  success: boolean;
  data: Payment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Internal API functions
const paymentsAPI = {
  // Get all payments (admin only)
  listPayments: async (filters: PaymentFilters = {}): Promise<PaymentsResponse> => {
    const params = new URLSearchParams();
    
    if (filters.status) params.append("status", filters.status);
    if (filters.orderId) params.append("orderId", filters.orderId);
    if (filters.from) params.append("from", filters.from);
    if (filters.to) params.append("to", filters.to);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));
    if (filters.search) params.append("search", filters.search);
    if (filters.sortBy) params.append("sortBy", filters.sortBy);
    if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

    const queryString = params.toString();
    const result = await handleApiRequest(() =>
      authorizedAPI.get(`/payments${queryString ? `?${queryString}` : ""}`)
    );

    // Backend returns { success: true, data: [...] }
    return {
      success: result.success ?? true,
      data: result.data || [],
    };
  },

  // Get payment by ID
  getPayment: async (id: string): Promise<Payment> => {
    const result = await handleApiRequest(() => authorizedAPI.get(`/payments/${id}`));
    return result.data || result;
  },

  // Get payments by order ID
  getPaymentsByOrder: async (orderId: string): Promise<Payment[]> => {
    const result = await handleApiRequest(() => authorizedAPI.get(`/payments/order/${orderId}`));
    return result.data || [];
  },
};

export default paymentsAPI;

