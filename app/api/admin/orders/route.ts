import { NextRequest, NextResponse } from 'next/server';
import { getAdminOrders } from '@/lib/simple-db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[Admin Orders] Starting request...');
    const user = await requireAdmin();
    console.log('[Admin Orders] User:', user);
    
    if (!user || !user.isAdmin) {
      console.log('[Admin Orders] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const customerId = searchParams.get('customerId') || undefined;

    console.log('[Admin Orders] Params:', { page, limit, status, search, startDate, endDate, customerId });
    
    const result = getAdminOrders({
      page,
      limit,
      status,
      search,
      startDate,
      endDate,
      customerId,
    });
    
    console.log('[Admin Orders] Result:', JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin Orders] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}