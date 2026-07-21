import React from 'react';
import './MainLayout.css';

/**
 * MainLayout 컴포넌트
 * 메인 레이아웃 - Header, Navigation, Content를 한 화면 프레임으로 구성합니다.
 *
 * @param {React.ReactNode} header - 상단 고정 헤더 영역입니다.
 * @param {React.ReactNode} navigation - 좌측 사이드바 또는 모바일 드로어에 표시할 메뉴입니다.
 * @param {React.ReactNode} children - 현재 페이지의 본문 콘텐츠입니다.
 * @param {boolean} isMobileNavOpen - 모바일 내비게이션 드로어 노출 여부입니다.
 * @param {Function} onCloseMobileNav - 오버레이 클릭 시 모바일 메뉴를 닫는 콜백입니다.
 */
const MainLayout = ({
  header,
  navigation,
  children,
  isMobileNavOpen = false,
  onCloseMobileNav,
}) => {
  return (
    <div className="main-layout">
      {/* 모든 페이지에서 동일하게 유지되는 상단 헤더입니다. */}
      <div className="layout-header">{header}</div>

      <div className="layout-body">
        {/* 데스크톱에서는 고정 사이드바, 모바일에서는 슬라이드 드로어로 동작합니다. */}
        <div className={`layout-sidebar ${isMobileNavOpen ? 'open' : ''}`}>
          {navigation}
        </div>

        {/* 모바일 메뉴가 열려 있을 때 본문을 덮어 메뉴 닫기 동작을 제공합니다. */}
        <button
          className={`mobile-nav-backdrop ${isMobileNavOpen ? 'show' : ''}`}
          type="button"
          aria-label="모바일 메뉴 닫기"
          onClick={onCloseMobileNav}
        />

        {/* 페이지 본문은 자체 스크롤을 가지도록 분리해 헤더/사이드바가 안정적으로 고정됩니다. */}
        <main className="layout-main">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
