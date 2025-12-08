import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTransactionStatsServer } from '@/integrations/supabase/transactions-server';
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

export async function GET() {
  try {
    // Check if service role client is available
    if (!serviceSupabase) {
      return NextResponse.json({ 
        error: 'Service role not configured' 
      }, { status: 500 });
    }

    logger.info('api', 'Fetching transaction statistics');

    // Fetch transaction statistics using service role client
    const stats = await getTransactionStatsServer(serviceSupabase);

    logger.info('api', 'Transaction statistics fetched successfully', {
      totalRevenue: stats.totalRevenue,
      completedTransactions: stats.completedTransactions,
      failedTransactions: stats.failedTransactions,
      pendingTransactions: stats.pendingTransactions,
    });

    return NextResponse.json(stats);

  } catch (error) {
    logger.error('api', 'Failed to fetch transaction statistics', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Failed to fetch transaction statistics' },
      { status: 500 }
    );
  }
}