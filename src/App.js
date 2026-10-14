import React, { useState } from 'react';
import './App.css';
import './styles/variables.css';

import { WorkerProvider } from './context/WorkerContext';
import { AlertProvider } from './context/AlertContext';
import { SensorProvider } from './context/SensorContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';

import Header from './components/common/Header';
import Navigation from './components/common/Navigation';
import MainLayout from './components/layout/MainLayout';
import EmergencyDispatchController from './components/dashboard/EmergencyDispatchController';

import DashboardPage from './pages/DashboardPage';

function AuthenticatedApp() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [activeMenu, setActiveMenu] = useState('workers');

  // 메뉴를 고르면 해당 화면으로 전환하고 모바일 드로어를 닫습니다.
  const handleMenuChange = (menuId) => {
    setActiveMenu(menuId);
    setIsMobileNavOpen(false);
  };

  // TODO: MVP 현장 테스트 동안 로그인 화면을 임시 우회합니다.
  // if (loading) return <div className="loading">인증 정보를 확인하는 중...</div>;
  // if (!user) return <LoginPage />;

  return (
      <RealtimeProvider>
        <WorkerProvider>
          <AlertProvider>
          <SensorProvider>
            <MainLayout
              isMobileNavOpen={isMobileNavOpen}
              onCloseMobileNav={() => setIsMobileNavOpen(false)}
              header={
                <Header
                  title=""
                  onMenuToggle={() => setIsMobileNavOpen((isOpen) => !isOpen)}
                  isMenuOpen={isMobileNavOpen}
                />
              }
              navigation={
                <Navigation
                  activeMenu={activeMenu}
                  onMenuChange={handleMenuChange}
                />
              }
            >
              <div className="page-content"><DashboardPage view={activeMenu} onViewChange={setActiveMenu} /></div>
            </MainLayout>
            <EmergencyDispatchController />
          </SensorProvider>
          </AlertProvider>
        </WorkerProvider>
      </RealtimeProvider>
  );
}

function App() {
  return <ThemeProvider><AuthProvider><AuthenticatedApp /></AuthProvider></ThemeProvider>;
}

export default App;
