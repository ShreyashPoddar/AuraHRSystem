'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  getToken, getStoredUser, clearToken, setToken, setStoredUser,
  type MoodleUser,
} from '@/lib/moodle';

interface AuthContextType {
  user: MoodleUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Role shortname from Moodle — 'manager' for org, 'user' for candidate */
  userRole: 'organization' | 'candidate' | null;
  login: (token: string, user: MoodleUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  userRole: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MoodleUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from cookies on mount.
  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: MoodleUser) => {
    setToken(newToken);
    setStoredUser(newUser);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  // Determine role from user data.
  // In Moodle, managers/admins = organization side, regular users = candidate side.
  // We check both the custom 'role' field and Moodle's native roles list.
  const userRole = user
    ? (user.role === 'organization' || user.roles?.some(r => r.shortname === 'manager' || r.shortname === 'editingteacher')
        ? 'organization'
        : 'candidate')
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        userRole,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
