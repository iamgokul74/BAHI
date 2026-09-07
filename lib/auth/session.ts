import { cookies } from 'next/headers';
import { COOKIE_NAME, SessionPayload, verifySessionToken } from './jwt';
import { db } from '@/lib/db';

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        profile: true,
      },
    });
    return user;
  } catch (err) {
    console.error('Error fetching current user:', err);
    return null;
  }
}

export async function requireAuth(allowedRoles?: Array<'BORROWER' | 'LENDER' | 'ADMIN'>) {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error('FORBIDDEN');
  }

  return session;
}
