import React from 'react';
import { useAlert } from '../../context/AlertContext';
import './Navigation.css';

/**
 * Navigation 컴포넌트
 * 좌측 사이드바에서 장비, 기기, 드론, 관제 등 주요 관리 페이지로 이동합니다.
 *
 * @param {string} activeMenu - 현재 선택된 메뉴 id입니다.
 * @param {Function} onMenuChange - 메뉴 클릭 시 상위 App의 현재 페이지를 변경하는 콜백입니다.
 */
const Navigation = ({ activeMenu, onMenuChange }) => {
  const { unreadCount } = useAlert();

  // 메뉴 정의를 배열로 유지해 렌더링과 배지 표시 규칙을 한 흐름에서 처리합니다.
  const menus = [
    { id: 'dashboard', label: '대시보드', icon: '⌂' },
    { id: 'workers', label: '작업자 관리', icon: '◎' },
    { id: 'equipment', label: '안전장비', icon: '◇' },
    { id: 'devices', label: '웨어러블 명령', icon: '▣' },
    { id: 'droneManagement', label: '드론 관리', icon: '▲' },
    { id: 'iot', label: 'IoT 연동', icon: '↔' },
    { id: 'monitoring', label: '관제 모니터링', icon: '◉' },
    { id: 'drone', label: '드론 대응', icon: '△' },
    { id: 'alerts', label: '알림', icon: '!', badge: unreadCount },
    { id: 'settings', label: '설정', icon: '⚙' },
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
