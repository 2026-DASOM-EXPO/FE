import React, { useMemo, useState } from 'react';
import './App.css';
import './styles/variables.css';

import { WorkerProvider } from './context/WorkerContext';
import { AlertProvider } from './context/AlertContext';
import { SensorProvider } from './context/SensorContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Header from './components/common/Header';
import Navigation from './components/common/Navigation';
import MainLayout from './components/layout/MainLayout';

import DashboardPage from './pages/DashboardPage';
import WorkersPage from './pages/WorkersPage';
import EquipmentPage from './pages/EquipmentPage';
import DeviceManagementPage from './pages/DeviceManagementPage';
import DroneManagementPage from './pages/DroneManagementPage';
import IoTIntegrationPage from './pages/IoTIntegrationPage';
import MonitoringPage from './pages/MonitoringPage';
import DroneResponsePage from './pages/DroneResponsePage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

function AuthenticatedApp() {
  const { loading, user } = useAuth();
  // currentPage는 별도 라우터를 쓰지 않는 현재 구조에서 화면 전환의 단일 기준입니다.
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // 메뉴 id와 헤더 타이틀을 한 곳에서 매핑해 페이지 추가/이름 변경 시 수정 범위를 줄입니다.
  const pageTitles = useMemo(() => ({
    dashboard: '대시보드',
    workers: '작업자 관리',
    equipment: '안전장비 관리',
    devices: '웨어러블 명령 관리',
    droneManagement: '드론 관리',
    iot: 'IoT 연동 관리',
    monitoring: '관제 모니터링',
    drone: '드론 대응 시스템',
    alerts: '알림 관리',
    settings: '설정',
  }), []);

  // 메뉴 선택 시 페이지를 바꾸고, 모바일 드로어가 열려 있었다면 함께 닫습니다.
  const handleMenuChange = (pageId) => {
    setCurrentPage(pageId);
    setIsMobileNavOpen(false);
  };

  // currentPage 값에 따라 실제 페이지 컴포넌트를 렌더링합니다.
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'workers':
        return <WorkersPage />;
      case 'equipment':
        return <EquipmentPage />;
      case 'devices':
        return <DeviceManagementPage />;
      case 'droneManagement':
        return <DroneManagementPage />;
      case 'iot':
        return <IoTIntegrationPage />;
      case 'monitoring':
        return <MonitoringPage />;
      case 'drone':
        return <DroneResponsePage />;
      case 'alerts':
        return <AlertsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  if (loading) return <div className="loading">인증 정보를 확인하는 중...</div>;
  if (!user) return <LoginPage />;

  return (
      <WorkerProvider>
        <AlertProvider>
          <SensorProvider>
            <MainLayout
              isMobileNavOpen={isMobileNavOpen}
              onCloseMobileNav={() => setIsMobileNavOpen(false)}
              header={
                <Header
                  title={`WORKSAFE+ - ${pageTitles[currentPage]}`}
                  onMenuToggle={() => setIsMobileNavOpen((isOpen) => !isOpen)}
                  isMenuOpen={isMobileNavOpen}
                />
              }
              navigation={
                <Navigation
                  activeMenu={currentPage}
                  onMenuChange={handleMenuChange}
                />
              }
            >
              <div className="page-content">{renderPage()}</div>
            </MainLayout>
          </SensorProvider>
        </AlertProvider>
      </WorkerProvider>
  );
}

function App() {
  return <ThemeProvider><AuthProvider><AuthenticatedApp /></AuthProvider></ThemeProvider>;
}

export default App;
