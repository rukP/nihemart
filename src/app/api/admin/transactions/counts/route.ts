import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTransactionCountsByStatusServer } from '@/integrations/supabase/transactions-server';
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

    logger.info('api', 'Fetching transaction counts by status');

    // Fetch transaction counts using service role client
    const counts = await getTransactionCountsByStatusServer(serviceSupabase);

    logger.info('api', 'Transaction counts fetched successfully', { counts });

    return NextResponse.json(counts);

  } catch (error) {
    logger.error('api', 'Failed to fetch transaction counts', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Failed to fetch transaction counts' },
      { status: 500 }
    );
  }
}