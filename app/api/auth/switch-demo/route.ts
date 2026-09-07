import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSessionToken, COOKIE_NAME } from '@/lib/auth/jwt';
import { logAuditEvent } from '@/lib/audit/logger';

const DEMO_EMAILS: Record<string, string> = {
  new_rider: 'priya@bahi.in',
  priya: 'priya@bahi.in',
  'priya.sharma@example.com': 'priya@bahi.in',
  cab_driver: 'ravi@bahi.in',
  ravi: 'ravi@bahi.in',
  'ravi.kumar@example.com': 'ravi@bahi.in',
  kirana_merchant: 'amit@bahi.in',
  amit: 'amit@bahi.in',
  volatile_gig: 'sunita@bahi.in',
  sunita: 'sunita@bahi.in',
  flagged: 'vikram@bahi.in',
  vikram: 'vikram@bahi.in',
  lender: 'lender@bahi.in',
  admin: 'admin@bahi.in',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const keyOrEmail = (body.personaKey || body.email || 'new_rider').toString().toLowerCase().trim();
    const email = DEMO_EMAILS[keyOrEmail] || keyOrEmail;

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { 
        profile: true,
        bahiScores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Demo user not found' }, { status: 404 });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'BORROWER' | 'LENDER' | 'ADMIN',
    });

    await logAuditEvent({
      userId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'USER_LOGGED_IN',
      entity: 'USER',
      entityId: user.id,
      metadata: { demoSwitch: keyOrEmail },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.profile,
      },
      score: user.bahiScores[0] ? {
        bahiScore: user.bahiScores[0].score,
        grade: user.bahiScores[0].grade,
        coldStartStatus: user.bahiScores[0].coldStartStatus,
      } : null,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Demo switch error:', error);
    return NextResponse.json({ error: 'Failed to switch demo account' }, { status: 500 });
  }
}
