import { UserRepository } from '../../repositories/UserRepository';
import { NotFoundError, ConflictError } from '../../types/errors';
import { createTestUser } from '../helpers/testHelpers';

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const testUser = await createTestUser('finduser', 'Find User');

      const user = await userRepository.findById(testUser._id.toString());

      expect(user._id.toString()).toBe(testUser._id.toString());
      expect(user.username).toBe('finduser');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        userRepository.findById(fakeId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      await createTestUser('findbyusername', 'Find By Username');

      const user = await userRepository.findByUsername('findbyusername');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('findbyusername');
    });

    it('should return null for non-existent username', async () => {
      const user = await userRepository.findByUsername('nonexistent');

      expect(user).toBeNull();
    });

    it('should handle case-insensitive username', async () => {
      await createTestUser('caseuser', 'Case User');

      const user = await userRepository.findByUsername('CASEUSER');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('caseuser');
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const user = await userRepository.create({
        username: 'newuser',
        displayName: 'New User',
        passwordHash: 'hashedpassword',
      });

      expect(user.username).toBe('newuser');
      expect(user.displayName).toBe('New User');
    });

    it('should throw ConflictError if username already exists', async () => {
      await createTestUser('existinguser', 'Existing User');

      await expect(
        userRepository.create({
          username: 'existinguser',
          displayName: 'New User',
          passwordHash: 'hashedpassword',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const testUser = await createTestUser('updateuser', 'Old Name');

      const updated = await userRepository.update(testUser._id.toString(), {
        displayName: 'New Name',
      });

      expect(updated.displayName).toBe('New Name');
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      await createTestUser('alice', 'Alice Smith');
      await createTestUser('bob', 'Bob Johnson');

      const results = await userRepository.searchUsers('alice');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.username === 'alice')).toBe(true);
    });

    it('should respect limit', async () => {
      for (let i = 0; i < 15; i++) {
        await createTestUser(`user${i}`, `User ${i}`);
      }

      const results = await userRepository.searchUsers('user', 10);

      expect(results.length).toBeLessThanOrEqual(10);
    });
  });
});

