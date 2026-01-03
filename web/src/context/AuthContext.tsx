import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { User } from '../types/api';


interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, password: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Optional version that doesn't throw error, for components that can work without auth
export const useOptionalAuth = () => {
  return useContext(AuthContext);
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data
    const loadAuthData = () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      } else {
        setToken(null);
        setUser(null);
    }
    };

    loadAuthData();
    setLoading(false);

    // Listen for auth cleared event (dispatched by API client interceptor on 401)
    const handleAuthCleared = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth-cleared', handleAuthCleared);
    return () => window.removeEventListener('auth-cleared', handleAuthCleared);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { token: newToken, user: newUser } = await authService.login(username, password);

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (username: string, displayName: string, password: string) => {
    try {
      const { token: newToken, user: newUser } = await authService.register(username, displayName, password);

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const updateDisplayName = async (displayName: string) => {
    try {
      const updatedUser = await userService.updateDisplayName(displayName);
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update display name');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, updateDisplayName, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

