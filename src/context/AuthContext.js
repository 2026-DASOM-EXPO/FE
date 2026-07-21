import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, tokenStorage } from '../services/api';

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStorage.getAccessToken()));
  useEffect(() => {
    if (!tokenStorage.getAccessToken()) return;
    authAPI.me().then((result) => {
      if (result.success) setUser(result.data);
      else tokenStorage.clear();
      setLoading(false);
    });
  }, []);
  const login = async (credentials) => {
    const result = await authAPI.login(credentials);
    if (result.success) setUser(result.data.user);
    return result;
  };
  const logout = () => { authAPI.logout(); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
