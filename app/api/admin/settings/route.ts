import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    await dbConnect();

    let settings = await Settings.findOne();

    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        notifications: {
          soundEnabled: true,
          emailEnabled: false,
          smsEnabled: false,
        },
        orders: {
          editTimeLimit: 2,
          autoArchiveDays: 30,
        },
        system: {
          maintenanceMode: false,
          backupEnabled: true,
          backupFrequency: 'daily',
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings fetch error:', error);

    const status = error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Admin access required') ? 401 : 500;

    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Internal server error' },
      { status }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();

    await dbConnect();

    const body = await req.json();

    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create(body);
    } else {
      settings.notifications = body.notifications;
      settings.orders = body.orders;
      settings.system = body.system;
      await settings.save();
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Settings update error:', error);

    const status = error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Admin access required') ? 401 : 500;

    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Internal server error' },
      { status }
    );
  }
}