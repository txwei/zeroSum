import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { ConflictError, UnauthorizedError, ValidationError } from '../types/errors';
import { validatePassword, validateUsername, validateDisplayName } from '../utils/validators';
import { BCRYPT_ROUNDS, JWT_EXPIRY } from '../utils/constants';
import { logger } from '../utils/logger';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Register a new user
   */
  async register(username: string, displayName: string, password: string): Promise<{
    token: string;
    user: {
      id: string;
      username: string;
      displayName: string;
    };
  }> {
    // Validate input
    validateUsername(username);
    validateDisplayName(displayName);
    validatePassword(password);

    // Check if user already exists
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new ConflictError('Username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const user = await this.userRepository.create({
      username,
      displayName,
      passwordHash,
    });

    // Generate token
    const token = this.generateToken(user._id.toString());

    logger.info('User registered', { username: user.username, userId: user._id });

    return {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
      },
    };
  }

  /**
   * Login user
   */
  async login(username: string, password: string): Promise<{
    token: string;
    user: {
      id: string;
      username: string;
      displayName: string;
    };
  }> {
    // Validate input
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    // Find user
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user._id.toString());

    logger.info('User logged in', { username: user.username, userId: user._id });

    return {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
      },
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    return jwt.sign({ userId }, secret, { expiresIn: JWT_EXPIRY });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string } {
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret';
      return jwt.verify(token, secret) as { userId: string };
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
}


