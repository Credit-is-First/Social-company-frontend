import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types';
import { authAPI, setSession, clearSession, refreshSession, onSessionChange } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  hasRole: (roleName: string) => boolean;
  /** Applies a profile update to the in-memory session without a round trip. */
  updateCurrentUser: (updated: Partial<User>) => void;
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

/** Direct roles plus every role inherited from the user's groups. */
const roleNamesFromUser = (user: User | null): string[] => {
  if (!user) {
    return [];
  }

  const names: string[] = [];
  const add = (name: string) => {
    if (name && names.indexOf(name) === -1) {
      names.push(name);
    }
  };

  (user.roles || []).forEach(role => add(role.name));
  (user.groups || []).forEach(group => (group.roles || []).forEach(role => add(role.name)));

  return names;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState<boolean>(true);

  // Keep React state in step with refreshes the axios interceptor performs
  // behind the scenes (for example after an access token expires mid-session).
  useEffect(() => {
    onSessionChange((session: AuthResponse | null) => {
      setUser(session ? session.user : null);
    });
    return () => onSessionChange(null);
  }, []);

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

  /*
   * There is no stored session to read on startup any more. Instead the browser
   * presents the refresh cookie and the server hands back a fresh access token
   * plus the current user — which also means role changes and account blocks
   * take effect on the next page load rather than a token lifetime later.
   */
  useEffect(() => {
    let cancelled = false;

    // refreshSession() is shared with the 401 interceptor, so a remount or a
    // parallel request cannot start a second rotation of the same cookie.
    refreshSession()
      .catch(() => {
        // No cookie, or it is expired/revoked: simply not signed in.
        clearSession();
      })
      .then(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await authAPI.login({ email, password });
      setSession(response.data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (data: any): Promise<void> => {
    try {
      // Register endpoint only returns user, not a session
      // User needs to login separately after registration
      await authAPI.register(data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = (): void => {
    // Clear locally first so the UI never appears signed in while the network
    // call is in flight; revoking server-side is best-effort.
    clearSession();

    authAPI.logout().catch(error => {
      console.error('Could not revoke the session:', error);
    });
  };

  /**
   * Derived from the user record the server returned, so a revoked role stops
   * granting UI access as soon as the session is refreshed. The server
   * re-checks every request regardless.
   */
  const hasRole = (roleName: string): boolean =>
    roleNamesFromUser(user).indexOf(roleName) !== -1;

  const updateCurrentUser = (updated: Partial<User>): void => {
    setUser(current => (current ? { ...current, ...updated } : current));
  };

  // Mark setup as complete (called after successful setup-super-admin)
  const completeSetup = (): void => {
    setNeedsSetup(false);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading,
    hasRole,
    updateCurrentUser,
    needsSetup,
    checkingSetup,
    completeSetup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
