import { UserRepository } from '../repositories/UserRepository';
import { NotFoundError, ValidationError } from '../types/errors';
import { validateDisplayName } from '../utils/validators';
import { logger } from '../utils/logger';
import { userToDTO, UserDTO } from '../types/dto';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserDTO> {
    const user = await this.userRepository.findById(userId);
    return userToDTO(user);
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(userId: string): Promise<UserDTO> {
    return this.getUserById(userId);
  }

  /**
   * Update user display name
   */
  async updateDisplayName(userId: string, displayName: string): Promise<UserDTO> {
    validateDisplayName(displayName);

    const user = await this.userRepository.update(userId, {
      displayName: displayName.trim(),
    });

    logger.info('User display name updated', { userId, displayName });

    return userToDTO(user);
  }

  /**
   * List all users
   */
  async listUsers(): Promise<UserDTO[]> {
    const users = await this.userRepository.findAll();
    return users.map(userToDTO);
  }

  /**
   * Search users by name
   */
  async searchUsers(query: string, limit: number = 10): Promise<UserDTO[]> {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Search query is required');
    }

    const users = await this.userRepository.searchUsers(query, limit);
    return users.map(userToDTO);
  }

  /**
   * Create user (for quick signup)
   */
  async createUser(username: string, displayName: string, passwordHash: string): Promise<UserDTO> {
    const user = await this.userRepository.create({
      username,
      displayName,
      passwordHash,
    });

    logger.info('User created', { username: user.username, userId: user._id });

    return userToDTO(user);
  }

  /**
   * Get user repository (for use by other services)
   * This is a public method to allow other services to access repository methods
   * while maintaining proper encapsulation
   */
  getRepository(): UserRepository {
    return this.userRepository;
  }
}


