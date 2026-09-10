/**
 * Auth state for the whole app.
 *
 * Flow: on mount we try to restore a persisted session (user id in AsyncStorage) ->
 * `isLoading` gates the navigator so we never flash the login screen for a signed-in
 * user. `login`/`register` delegate to AuthService and re-throw after recording the
 * error, so screens can both show the message and abort their own flow.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/api/AuthService';
import { User } from '../services/api/models';

interface AuthContextType {
  user: User | null;
  /** True while the persisted session is being restored at startup. */
  isLoading: boolean;
  /** True while a login/register request is in flight. */
  isAuthenticating: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authService
      .restoreSession()
      .then((restored) => {
        if (!cancelled) setUser(restored);
      })
      .catch((err) => {
        console.error('Error restoring session:', err);
        if (!cancelled) setError('Failed to restore your session');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const runAuth = useCallback(async (action: () => Promise<User>, fallback: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      setUser(await action());
    } catch (err) {
      setError(messageOf(err, fallback));
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) => runAuth(() => authService.login(email, password), 'Failed to log in'),
    [runAuth]
  );

  const register = useCallback(
    (email: string, password: string) =>
      runAuth(() => authService.register(email, password), 'Failed to create account'),
    [runAuth]
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      await authService.logout();
    } catch (err) {
      console.error('Error clearing session:', err);
    } finally {
      // Always drop the in-memory user, even if AsyncStorage failed.
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticating, error, login, register, logout, clearError }),
    [user, isLoading, isAuthenticating, error, login, register, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
