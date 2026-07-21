import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

/**
 * Header 컴포넌트
 * 상단 헤더 - 로고, 현재 페이지 제목, 시스템 상태, 관리자 정보를 표시합니다.
 *
 * @param {string} title - 현재 화면명을 포함한 헤더 제목입니다.
 * @param {Function} onMenuToggle - 모바일 화면에서 사이드 메뉴를 열고 닫는 콜백입니다.
 * @param {boolean} isMenuOpen - 모바일 메뉴가 열려 있는지 여부입니다.
 */
const Header = ({
  title = 'WORKSAFE+ Dashboard',
  onMenuToggle,
  isMenuOpen = false,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          {/* 모바일에서는 사이드바가 드로어로 전환되므로 헤더에서 메뉴 접근점을 제공합니다. */}
          <button
            className="mobile-menu-button"
            type="button"
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={isMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {/* 제품 로고와 현재 화면 제목을 분리해 작은 화면에서는 제목만 숨길 수 있게 합니다. */}
          <h1 className="header-logo">WORKSAFE+</h1>
          <span className="header-title">{title}</span>
        </div>

        {/* 운영자가 앱이 실시간 모드인지 빠르게 확인할 수 있는 상태 영역입니다. */}
        <div className="header-right">
          {/* 전역 테마 전환 버튼입니다. ThemeContext의 상태를 바꿔 전체 CSS 변수가 즉시 교체됩니다. */}
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
            title={isDarkMode ? '라이트 모드' : '다크 모드'}
          >
            <span className="theme-toggle__icon">{isDarkMode ? '☀' : '☾'}</span>
            <span className="theme-toggle__label">
              {isDarkMode ? 'Light' : 'Dark'}
            </span>
          </button>
          <span className="system-status">LIVE</span>
          <span className="user-info">관리자</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
