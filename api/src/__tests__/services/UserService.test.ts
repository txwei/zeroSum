import { UserService } from '../../services/UserService';
import { UserRepository } from '../../repositories/UserRepository';
import { NotFoundError, ValidationError } from '../../types/errors';
import { createTestUser, createTestUsers } from '../helpers/testHelpers';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: UserRepository;

  beforeEach(() => {
    userService = new UserService();
    userRepository = new UserRepository();
  });

  describe('getUserById', () => {
    it('should get user by ID', async () => {
      const testUser = await createTestUser('getuser', 'Get User');

      const user = await userService.getUserById(testUser._id.toString());

      expect(user.id).toBe(testUser._id.toString());
      expect(user.username).toBe('getuser');
      expect(user.displayName).toBe('Get User');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        userService.getUserById(fakeId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user', async () => {
      const testUser = await createTestUser('currentuser', 'Current User');

      const user = await userService.getCurrentUser(testUser._id.toString());

      expect(user.id).toBe(testUser._id.toString());
      expect(user.username).toBe('currentuser');
    });
  });

  describe('updateDisplayName', () => {
    it('should update display name', async () => {
      const testUser = await createTestUser('updateuser', 'Old Name');

      const updated = await userService.updateDisplayName(
        testUser._id.toString(),
        'New Name'
      );

      expect(updated.displayName).toBe('New Name');
      expect(updated.username).toBe('updateuser');
    });

    it('should throw ValidationError for empty display name', async () => {
      const testUser = await createTestUser('updateuser', 'Old Name');

      await expect(
        userService.updateDisplayName(testUser._id.toString(), '')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('listUsers', () => {
    it('should list all users', async () => {
      await createTestUsers(3);

      const users = await userService.listUsers();

      expect(users.length).toBeGreaterThanOrEqual(3);
      expect(users[0]).toHaveProperty('id');
      expect(users[0]).toHaveProperty('username');
      expect(users[0]).toHaveProperty('displayName');
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      await createTestUser('alice', 'Alice Smith');
      await createTestUser('bob', 'Bob Johnson');

      const results = await userService.searchUsers('alice');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.username === 'alice')).toBe(true);
    });

    it('should throw ValidationError for empty query', async () => {
      await expect(
        userService.searchUsers('')
      ).rejects.toThrow(ValidationError);
    });
  });
});

