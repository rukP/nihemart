import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAllTransactionsServer } from '@/integrations/supabase/transactions-server';
import { logger } from '@/lib/logger';

// Create service role client for admin operations
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // avoid throwing at module init
}
const serviceSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : (null as any);

export async function GET(request: NextRequest) {
  try {
    // Check if service role client is available
    if (!serviceSupabase) {
      return NextResponse.json({ 
        error: 'Service role not configured' 
      }, { status: 500 });
    }

    // TODO: Add proper admin authentication check here
    // For now, we'll trust that the admin interface handles auth
    // In production, you might want to add session validation

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const payment_method = searchParams.get('payment_method') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    logger.info('api', 'Fetching transactions', {
      page,
      limit,
      status,
      payment_method,
      search,
      sortBy,
      sortOrder,
      startDate,
      endDate
    });

    // Fetch transactions using service role client
    const result = await fetchAllTransactionsServer({
      page,
      limit,
      status,
      payment_method,
      search,
      sortBy,
      sortOrder,
      startDate,
      endDate,
    }, serviceSupabase);

    logger.info('api', 'Transactions fetched successfully', {
      count: result.transactions.length,
      total: result.pagination.total,
    });

    return NextResponse.json(result);

  } catch (error) {
    logger.error('api', 'Failed to fetch transactions', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}