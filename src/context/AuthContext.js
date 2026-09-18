import React, { createContext, useContext, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  // TODO: MVP 현장 테스트 동안 로그인 없이 앱을 사용하도록 임시 사용자를 주입합니다.
  const [user, setUser] = useState({ id: 0, name: '테스트 관리자', role: 'ADMIN' });
  const [loading] = useState(false);
  // useEffect(() => {
  //   if (!tokenStorage.getAccessToken()) return;
  //   authAPI.me().then((result) => {
  //     if (result.success) setUser(result.data);
  //     else tokenStorage.clear();
  //     setLoading(false);
  //   });
  // }, []);
  const login = async (credentials) => {
    const result = await authAPI.login(credentials);
    if (result.success) setUser(result.data.user);
    return result;
  };
  const logout = () => { authAPI.logout(); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
