import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[Auth Me] Request initiated');
    const authUser = await getAuthUser();

    if (!authUser) {
      console.log('[Auth Me] No auth user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Auth Me] Auth user found:', authUser);

    await connectDB();
    const user = await User.findById(authUser.userId);

    if (!user) {
      console.log('[Auth Me] User not found in database:', authUser.userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[Auth Me] User found:', { id: user._id, phone: user.phone, isAdmin: user.isAdmin });

    return NextResponse.json({
      user: {
        id: (user._id as any).toString(),
        phone: user.phone,
        companyName: user.companyName,
        name: user.name,
        email: user.email,
        address: user.address,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('[Auth Me] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}