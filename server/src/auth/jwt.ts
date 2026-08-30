import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JwtUserPayload } from '../types/auth.js';
import { AppError } from '../errors/app-error.js';

export function signToken(payload: JwtUserPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload as object, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

export function verifyToken(token: string): JwtUserPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUserPayload;
    return decoded;
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Authentication token has expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized('Invalid authentication token');
    }
    throw AppError.unauthorized('Authentication failed');
  }
}
