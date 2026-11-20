import { NextResponse } from 'next/server';
import { verifyStaffPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!verifyStaffPassword(password)) {
      return NextResponse.json(
        { error: 'Incorrect staff password. Please try again.' },
        { status: 401 }
      );
    }

    const token = await createSessionToken();
    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });

    // Set signed httpOnly cookie per FR-1
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error during login' },
      { status: 500 }
    );
  }
}
