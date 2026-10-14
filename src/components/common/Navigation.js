import React from 'react';
import { useAlert } from '../../context/AlertContext';
import './Navigation.css';

/**
 * Navigation 컴포넌트
 * 좌측 사이드바에서 현재 제공하는 대시보드 화면으로 이동합니다.
 *
 * @param {string} activeMenu - 현재 선택된 메뉴 id입니다.
 * @param {Function} onMenuChange - 메뉴 클릭 시 상위 레이아웃에 알리는 콜백입니다.
 */
const Navigation = ({ activeMenu, onMenuChange }) => {
  // 메뉴 정의를 배열로 유지해 렌더링과 배지 표시 규칙을 한 흐름에서 처리합니다.
  const { unreadCount } = useAlert();
  const menus = [
    { id: 'workers', label: '작업자 상태', icon: '⌂' },
    { id: 'map', label: '작업자/드론 위치', icon: '⌖' },
    { id: 'stream', label: '실시간 드론 영상', icon: '▶' },
    { id: 'alerts', label: '최근 알림', icon: '!', badge: unreadCount },
  ];

  return (
    <nav className="navigation" aria-label="주요 화면 이동">
      <ul className="menu-list">
        {menus.map((menu) => (
          <li key={menu.id}>
            <button
              className={`menu-item ${activeMenu === menu.id ? 'active' : ''}`}
              onClick={() => onMenuChange(menu.id)}
              type="button"
              aria-current={activeMenu === menu.id ? 'page' : undefined}
            >
              <span className="menu-icon">{menu.icon}</span>
              <span className="menu-label">{menu.label}</span>
              {/* 읽지 않은 알림처럼 즉시 대응이 필요한 메뉴에는 숫자 배지를 붙입니다. */}
              {menu.badge > 0 && (
                <span className="menu-badge">{menu.badge}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
