import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';
import jwtDecode from 'jwt-decode';

interface JWTPayload {
  email: string;
  sub: string;
  roles: string[];
  groups: string[];
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  hasRole: (roleName: string) => boolean;
  needsSetup: boolean | null;
  checkingSetup: boolean;
  completeSetup: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState<boolean>(true);

  // Check setup status on mount
  useEffect(() => {
    const checkSetup = async () => {
      try {
        setCheckingSetup(true);
        const response = await authAPI.checkSetup();
        setNeedsSetup(response.data.needsSetup);
      } catch (error) {
        console.error('Error checking setup:', error);
        // If there's an error, assume setup is not needed
        setNeedsSetup(false);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkSetup();
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await authAPI.login({ email, password });
      const { user: userData, access_token } = response.data;
      
      setUser(userData);
      setToken(access_token);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (data: any): Promise<void> => {
    try {
      // Register endpoint only returns user, not token
      // User needs to login separately after registration
      await authAPI.register(data);
      // Don't set user/token here - redirect to login instead
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Decode JWT token to get roles from payload
  const getRolesFromToken = (): string[] => {
    if (!token) return [];
    try {
      const decoded = jwtDecode<JWTPayload>(token);
      return decoded.roles || [];
    } catch (error) {
      console.error('Error decoding token:', error);
      return [];
    }
  };

  // Helper function to check if user has a role (uses roles from JWT payload)
  const hasRole = (roleName: string): boolean => {
    if (!token) return false;
    const roles = getRolesFromToken();
    return roles.includes(roleName);
  };

  // Mark setup as complete (called after successful setup-super-admin)
  const completeSetup = (): void => {
    setNeedsSetup(false);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
    loading,
    hasRole,
    needsSetup,
    checkingSetup,
    completeSetup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

