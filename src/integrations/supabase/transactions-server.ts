import { createClient } from '@/utils/supabase/server';
import { Transaction, TransactionQueryOptions, TransactionStats } from './transactions';
import type { SupabaseClient } from '@supabase/supabase-js';

// Server-side functions for API routes
export async function fetchAllTransactionsServer(
  options: TransactionQueryOptions = {}, 
  serviceClient?: SupabaseClient
) {
  const supabase = serviceClient || await createClient();
  
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
      order:orders (
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
    `, { count: 'exact' });

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
    console.error('Error fetching transactions server:', error);
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

export async function getTransactionCountsByStatusServer(serviceClient?: SupabaseClient) {
  const supabase = serviceClient || await createClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select('status')
    .order('status');
  
  if (error) {
    console.error('Error fetching transaction counts:', error);
    throw new Error(error.message);
  }
  
  // Count transactions by status
  const counts = data.reduce((acc: any, payment: any) => {
    const status = payment.status;
    acc[status] = (acc[status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {});
  
  return {
    all: counts.total || 0,
    pending: counts.pending || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    timeout: counts.timeout || 0,
  };
}

export async function getTransactionStatsServer(serviceClient?: SupabaseClient): Promise<TransactionStats> {
  const supabase = serviceClient || await createClient();
  
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

export async function fetchTransactionByIdServer(id: string, serviceClient?: SupabaseClient): Promise<Transaction> {
  const supabase = serviceClient || await createClient();
  
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