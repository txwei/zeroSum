import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth';
import { User } from '../../models/User';
import { createTestUser } from '../helpers/testHelpers';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          displayName: 'New User',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        username: 'newuser',
        displayName: 'New User',
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should fail when username already exists', async () => {
      await createTestUser('existing', 'Existing User');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existing',
          displayName: 'Another User',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username already exists');
    });

    it('should fail when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          // displayName missing
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('All fields are required');
    });

    it('should fail when password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          displayName: 'New User',
          password: '12345', // Less than 6 characters
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 6 characters');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      await createTestUser('testuser', 'Test User', 'password123');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        username: 'testuser',
        displayName: 'Test User',
      });
    });

    it('should fail with invalid credentials', async () => {
      await createTestUser('testuser', 'Test User', 'password123');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail when user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          // password missing
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password are required');
    });
  });
});

