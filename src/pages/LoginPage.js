import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ loginId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    const result = await login(form);
    if (!result.success) setError(result.error || '로그인에 실패했습니다.');
    setLoading(false);
  };
  return <main className="login-page"><form className="login-card" onSubmit={submit}><span>WORKSAFE+</span><h1>관리자 로그인</h1><p>현장 안전 관제 시스템에 로그인하세요.</p><label>아이디<input required autoComplete="username" value={form.loginId} onChange={(e) => setForm((p) => ({ ...p, loginId: e.target.value }))} /></label><label>비밀번호<input required type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} /></label>{error && <div className="error-message">{error}</div>}<button className="btn-primary" type="submit" disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button></form></main>;
};
export default LoginPage;
