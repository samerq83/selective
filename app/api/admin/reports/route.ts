import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getReportDataFromMongoDB } from '@/lib/admin-mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[Admin Reports] Starting request...');
    const user = await requireAdmin();
    console.log('[Admin Reports] User:', user);
    
    if (!user || !user.isAdmin) {
      console.log('[Admin Reports] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log('[Admin Reports] Date range:', { start, end });

    const reportData = await getReportDataFromMongoDB(start, end);

    console.log('[Admin Reports] Customer-Product Matrix count:', reportData.customerProductMatrix.length);

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('[Admin Reports] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}