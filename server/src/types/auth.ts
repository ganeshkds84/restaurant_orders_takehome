export type UserRole = 'manager' | 'waiter';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: UserResponse;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserResponse;
    }
  }
}
