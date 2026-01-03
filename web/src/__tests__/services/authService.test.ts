import { authService } from '../../services/authService';
import apiClient from '../../api/client';

jest.mock('../../api/client');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call API and return auth response', async () => {
      const mockResponse = {
        data: {
          token: 'test-token',
          user: {
            id: '1',
            username: 'testuser',
            displayName: 'Test User',
          },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.login('testuser', 'password123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('register', () => {
    it('should call API and return auth response', async () => {
      const mockResponse = {
        data: {
          token: 'test-token',
          user: {
            id: '1',
            username: 'newuser',
            displayName: 'New User',
          },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.register('newuser', 'New User', 'password123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        displayName: 'New User',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
});

