import React, { createContext, useState, useEffect } from 'react';
import api from '../api/client.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('enderpanel_token');
    const saved = localStorage.getItem('enderpanel_user');
    if (token && saved) {
      setUser(JSON.parse(saved));
      api.get('/auth/me').then(res => {
        setUser(res.data);
        localStorage.setItem('enderpanel_user', JSON.stringify(res.data));
      }).catch(() => {
        localStorage.removeItem('enderpanel_token');
        localStorage.removeItem('enderpanel_user');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('enderpanel_token', res.data.token);
    localStorage.setItem('enderpanel_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('enderpanel_token');
    localStorage.removeItem('enderpanel_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
