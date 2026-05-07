import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lv_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((u) => { if (u) setUser(u); })
      .catch(() => localStorage.removeItem('lv_token'))
      .finally(() => setLoading(false));
  }, []);

  function login(token, userData) {
    if (!token) throw new Error('No token returned from server');
    localStorage.setItem('lv_token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('lv_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
