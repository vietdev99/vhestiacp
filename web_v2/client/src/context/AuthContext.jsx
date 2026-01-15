import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [previousUser, setPreviousUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
    // Restore previousUser from localStorage
    const savedPreviousUser = localStorage.getItem('previousUser');
    if (savedPreviousUser) {
      setPreviousUser(JSON.parse(savedPreviousUser));
    }
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, totpCode) => {
    const res = await api.post('/api/auth/login', { username, password, totpCode });
    
    // Check if 2FA is required
    if (res.data.requiresTwoFactor) {
      return res.data;
    }
    
    setUser(res.data.user);
    // Clear previous user on fresh login
    setPreviousUser(null);
    localStorage.removeItem('previousUser');
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
      setPreviousUser(null);
      localStorage.removeItem('previousUser');
      navigate('/login');
    }
  };

  // Login as another user (admin feature)
  const loginAsUser = async (username) => {
    try {
      const res = await api.post(`/api/auth/login-as/${username}`);
      // Save current user as previous
      if (user) {
        setPreviousUser(user);
        localStorage.setItem('previousUser', JSON.stringify(user));
      }
      setUser(res.data.user);
      return res.data;
    } catch (error) {
      throw error;
    }
  };

  // Return to previous user (admin account)
  const returnToPreviousUser = async () => {
    if (!previousUser) return;

    try {
      const res = await api.post('/api/auth/return-to-admin');
      setUser(res.data.user);
      setPreviousUser(null);
      localStorage.removeItem('previousUser');
      return res.data;
    } catch (error) {
      // If API fails, try logging in again
      setPreviousUser(null);
      localStorage.removeItem('previousUser');
      throw error;
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin,
      checkAuth,
      previousUser,
      loginAsUser,
      returnToPreviousUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
