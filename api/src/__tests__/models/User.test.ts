import { User } from '../../models/User';
import { createTestUser } from '../helpers/testHelpers';

describe('User Model', () => {
  describe('Required fields', () => {
    it('should create a user with all required fields', async () => {
      const user = await createTestUser('testuser', 'Test User', 'password123');
      expect(user.username).toBe('testuser');
      expect(user.displayName).toBe('Test User');
      expect(user.passwordHash).toBeDefined();
    });

    it('should fail when username is missing', async () => {
      const user = new User({
        displayName: 'Test User',
        passwordHash: 'hashedpassword',
      });
      await expect(user.save()).rejects.toThrow();
    });

    it('should fail when displayName is missing', async () => {
      const user = new User({
        username: 'testuser',
        passwordHash: 'hashedpassword',
      });
      await expect(user.save()).rejects.toThrow();
    });

    it('should fail when passwordHash is missing', async () => {
      const user = new User({
        username: 'testuser',
        displayName: 'Test User',
      });
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Unique username constraint', () => {
    it('should fail when username already exists', async () => {
      await createTestUser('duplicate', 'User 1');
      const user2 = new User({
        username: 'duplicate',
        displayName: 'User 2',
        passwordHash: 'hashedpassword',
      });
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('Username normalization', () => {
    it('should lowercase username', async () => {
      const user = new User({
        username: 'TestUser',
        displayName: 'Test User',
        passwordHash: 'hashedpassword',
      });
      await user.save();
      expect(user.username).toBe('testuser');
    });
  });

  describe('toJSON transform', () => {
    it('should exclude passwordHash from JSON output', async () => {
      const user = await createTestUser();
      const userDoc = await User.findById(user._id);
      const json = userDoc?.toJSON();
      expect(json).not.toHaveProperty('passwordHash');
      expect(json).not.toHaveProperty('_id');
      expect(json).not.toHaveProperty('__v');
      expect(json).toHaveProperty('id');
    });
  });
});

