import { NextRequest, NextResponse } from 'next/server';
import { getAdminStats } from '@/lib/simple-db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('[Admin Stats] Starting request...');
    const user = await requireAdmin();
    console.log('[Admin Stats] User:', user);
    
    if (!user || !user.isAdmin) {
      console.log('[Admin Stats] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'today'; // default to 'today'
    const customDate = searchParams.get('date') || undefined;

    console.log('[Admin Stats] Fetching stats with filter:', filter, 'customDate:', customDate);
    const stats = getAdminStats(filter, customDate);
    console.log('[Admin Stats] Stats:', stats);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Admin Stats] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}