import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Login } from './pages/Login';
import { Layout } from './components/layout/Layout';
import { RealtimeNotifications } from './components/RealtimeNotifications';
import { Dashboard } from './pages/Dashboard';
import { Players } from './pages/Players';
import { Recorders } from './pages/Recorders';
import { Controls } from './pages/Controls';
import { Presets } from './pages/Presets';
import { Scenario } from './pages/Scenario';
import { UserManagement } from './pages/UserManagement';
import { TabletDashboard } from './pages/TabletDashboard';
import { Settings } from './pages/Settings';
import { SettingsProvider } from './context/SettingsContext';
import { useIsTablet } from './hooks/useIsTablet';
import { PageTransition } from './components/layout/PageTransition';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const DashboardSwitcher: React.FC = () => {
  const isTablet = useIsTablet();
  return isTablet ? <TabletDashboard /> : <Dashboard />;
};

const ScenarioSwitcher: React.FC = () => {
  const isTablet = useIsTablet();
  return isTablet ? <Scenario /> : <Presets />;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageTransition>
                  <DashboardSwitcher />
                </PageTransition>
              }
            />
            <Route
              path="/presets"
              element={
                <PageTransition>
                  <ScenarioSwitcher />
                </PageTransition>
              }
            />
            <Route
              path="/players"
              element={
                <PageTransition>
                  <Players />
                </PageTransition>
              }
            />
            <Route
              path="/recorders"
              element={
                <PageTransition>
                  <Recorders />
                </PageTransition>
              }
            />
            <Route
              path="/controls"
              element={
                <PageTransition>
                  <Controls />
                </PageTransition>
              }
            />
            <Route
              path="/users"
              element={
                <PageTransition>
                  <UserManagement />
                </PageTransition>
              }
            />
            <Route
              path="/settings"
              element={
                <PageTransition>
                  <Settings />
                </PageTransition>
              }
            />
            {/* Fallback for authenticated routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Layout>
    </ProtectedRoute>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <BrowserRouter>
          <AuthProvider>
            <WebSocketProvider>
              <AppContent />
              <RealtimeNotifications />
            </WebSocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;