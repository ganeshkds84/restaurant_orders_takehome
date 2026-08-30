import { userRepository, mapToUserResponse } from '../users/user.repository.js';
import { comparePassword } from './password.js';
import { signToken } from './jwt.js';
import { AppError } from '../errors/app-error.js';
import { LoginResult, UserResponse } from '../types/auth.js';
import { logger } from '../logging/logger.js';

export class AuthService {
  async login(email: string, plainPassword: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      logger.warn(`Authentication failed: unknown user email ${normalizedEmail}`);
      throw AppError.unauthorized('Invalid email or password');
    }

    const isMatch = await comparePassword(plainPassword, user.password_hash);
    if (!isMatch) {
      logger.warn(`Authentication failed: incorrect password for email ${normalizedEmail}`);
      throw AppError.unauthorized('Invalid email or password');
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const safeUser = mapToUserResponse(user);
    logger.info(`User logged in successfully: ${user.email} (${user.role})`);

    return {
      token,
      user: safeUser,
    };
  }

  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.unauthorized('User not found');
    }
    return mapToUserResponse(user);
  }
}

export const authService = new AuthService();
