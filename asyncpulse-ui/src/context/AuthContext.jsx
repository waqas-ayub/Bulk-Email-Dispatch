import { createContext, useContext, useState, useEffect } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  saveAuth,
  clearAuth,
  getAccessToken,
  getStoredUser,
} from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  // On mount: check if user is already logged in
  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const tokens = await apiLogin(email, password);

    // Decode token to get user info (JWT payload has user_id)
    const payload = JSON.parse(atob(tokens.access.split('.')[1]));
    const userData = {
      id: payload.user_id,
      email: email,
    };

    saveAuth({
      access: tokens.access,
      refresh: tokens.refresh,
      user: userData,
    });

    setUser(userData);
    return userData;
  };

  const register = async ({ username, email, password }) => {
    await apiRegister({ username, email, password });
    // Auto-login after signup
    return login(email, password);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}