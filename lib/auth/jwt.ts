import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

export const COOKIE_NAME = 'bahi_session';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'BORROWER' | 'LENDER' | 'ADMIN';
}

function getJwtSecret(): Uint8Array {
  const secretStr = process.env.JWT_SECRET || 'bahi_production_jwt_secret_key_minimum_32_chars_2026';
  return new TextEncoder().encode(secretStr);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'BORROWER' | 'LENDER' | 'ADMIN',
    };
  } catch (err) {
    return null;
  }
}
