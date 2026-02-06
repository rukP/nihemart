export interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'timeout';
  reference: string;
  kpay_transaction_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  failure_reason?: string;
  client_timeout?: boolean;
  client_timeout_reason?: string;
  kpay_mom_transaction_id?: string;
  // Order details
  order?: {
    id: string;
    order_number?: string;
    status: string;
    customer_first_name: string;
    customer_last_name: string;
    customer_email: string;
    customer_phone: string;
    total: number;
    payment_status: string;
    delivery_address?: string;
    delivery_city?: string;
    delivery_notes?: string;
    user_id?: string;
    is_external?: boolean;
    created_at: string;
    updated_at: string;
    items?: {
      id: string;
      product_name: string;
      product_sku?: string;
      variation_name?: string;
      price: number;
      quantity: number;
      total: number;
    }[];
  };
}

export interface TransactionQueryOptions {
  status?: 'pending' | 'completed' | 'failed' | 'timeout' | 'all';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortOrder?: 'asc' | 'desc';
  payment_method?: string;
  source?: 'website' | 'external' | 'all';
}

export interface TransactionStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  timeout: number;
  totalAmount: number;
  completedAmount: number;
}
