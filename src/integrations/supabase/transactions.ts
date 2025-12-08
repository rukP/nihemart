import { createClient } from '@/utils/supabase/client';

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
  page?: number;
  limit?: number;
  status?: string;
  payment_method?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface TransactionStats {
  totalRevenue: number;
  completedTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  revenueChange: number;
  completedChange: number;
  failedChange: number;
  pendingChange: number;
}

// Fetch all transactions (admin only)
export async function fetchAllTransactions(options: TransactionQueryOptions = {}) {
  const supabase = createClient();
  
  const {
    page = 1,
    limit = 20,
    status,
    payment_method,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    startDate,
    endDate
  } = options;

  let query = supabase
    .from('payments')
    .select(`
      *,
      order:orders!inner (
        id,
        order_number,
        status,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        total,
        payment_status,
        delivery_address,
        delivery_city,
        delivery_notes,
        user_id,
        created_at,
        updated_at,
        items:order_items (
          id,
          product_name,
          product_sku,
          variation_name,
          price,
          quantity,
          total
        )
      )
    `);

  // Apply filters
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (payment_method && payment_method !== 'all') {
    query = query.eq('payment_method', payment_method);
  }

  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,reference.ilike.%${search}%,kpay_transaction_id.ilike.%${search}%`
    );
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  const start = (page - 1) * limit;
  query = query.range(start, start + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    throw new Error(error.message);
  }

  return {
    transactions: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  };
}

// Fetch transaction statistics
export async function getTransactionStats(): Promise<TransactionStats> {
  const supabase = createClient();
  
  // Get current period stats (last 7 days)
  const currentDate = new Date();
  const currentWeekStart = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Current week stats
  const { data: currentStats } = await supabase
    .from('payments')
    .select('status, amount')
    .gte('created_at', currentWeekStart.toISOString());

  // Previous week stats for comparison
  const { data: previousStats } = await supabase
    .from('payments')
    .select('status, amount')
    .gte('created_at', previousWeekStart.toISOString())
    .lt('created_at', currentWeekStart.toISOString());

  // Calculate current stats
  let totalRevenue = 0;
  let completedTransactions = 0;
  let failedTransactions = 0;
  let pendingTransactions = 0;

  currentStats?.forEach((payment: { status: string; amount: number }) => {
    if (payment.status === 'completed') {
      totalRevenue += payment.amount;
      completedTransactions += 1;
    } else if (payment.status === 'failed') {
      failedTransactions += 1;
    } else if (payment.status === 'pending') {
      pendingTransactions += 1;
    }
  });

  // Calculate previous stats for change calculation
  let previousRevenue = 0;
  let previousCompleted = 0;
  let previousFailed = 0;
  let previousPending = 0;

  previousStats?.forEach((payment: { status: string; amount: number }) => {
    if (payment.status === 'completed') {
      previousRevenue += payment.amount;
      previousCompleted += 1;
    } else if (payment.status === 'failed') {
      previousFailed += 1;
    } else if (payment.status === 'pending') {
      previousPending += 1;
    }
  });

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    totalRevenue,
    completedTransactions,
    failedTransactions,
    pendingTransactions,
    revenueChange: calculateChange(totalRevenue, previousRevenue),
    completedChange: calculateChange(completedTransactions, previousCompleted),
    failedChange: calculateChange(failedTransactions, previousFailed),
    pendingChange: calculateChange(pendingTransactions, previousPending),
  };
}

// Fetch single transaction by ID
export async function fetchTransactionById(id: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      order:orders!inner (
        id,
        order_number,
        status,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        total,
        payment_status,
        delivery_address,
        delivery_city,
        delivery_notes,
        user_id,
        created_at,
        updated_at,
        items:order_items (
          id,
          product_name,
          product_sku,
          variation_name,
          price,
          quantity,
          total
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching transaction:', error);
    throw new Error(error.message);
  }

  return data;
}

