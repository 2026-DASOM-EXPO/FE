import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * ThemeContext - 앱 전체 라이트/다크 모드 관리
 * 역할: 현재 테마 상태, 테마 전환 함수, 브라우저 저장소 동기화를 전역에서 제공합니다.
 */
const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'worksafe-theme';

/**
 * 브라우저 또는 저장소 기준으로 초기 테마를 계산합니다.
 * localStorage에 저장된 사용자 선택을 우선하고, 없으면 OS 다크모드 선호도를 참고합니다.
 */
const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * ThemeProvider 컴포넌트
 * 현재 테마를 React 상태로 보관하고, HTML 루트 속성과 localStorage에 함께 반영합니다.
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  // 테마가 바뀔 때마다 CSS 선택자가 읽을 수 있도록 <html data-theme="..."> 값을 갱신합니다.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // 버튼에서 사용할 토글 함수입니다. 현재 값만 기준으로 반대 테마를 선택합니다.
  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  // Context value는 theme가 바뀔 때만 새 객체가 되도록 고정해 불필요한 리렌더링을 줄입니다.
  const value = useMemo(
    () => ({
      theme,
      isDarkMode: theme === 'dark',
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

/**
 * useTheme 훅
 * ThemeProvider 내부 컴포넌트에서 현재 테마와 전환 함수를 안전하게 꺼내 씁니다.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};
