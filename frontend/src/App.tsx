import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Login } from './pages/Login';
import { Layout } from './components/layout/Layout';
import { Card } from './components/ui/Card';
import { RealtimeNotifications } from './components/RealtimeNotifications';
import { Players } from './pages/Players';
import { Recorders } from './pages/Recorders';
import { Controls } from './pages/Controls';
import { Presets } from './pages/Presets';
import { UserManagement } from './pages/UserManagement';

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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WebSocketProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                        <p className="text-gray-500 dark:text-gray-400">System overview and quick actions</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card title="System Status">
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Online</span>
                          </div>
                        </Card>
                        <Card title="Active Devices">
                          <p className="text-3xl font-bold text-gray-900 dark:text-white">12</p>
                        </Card>
                        <Card title="Network">
                          <p className="text-gray-600 dark:text-gray-300">Stable (1ms latency)</p>
                        </Card>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/presets"
                element={
                  <ProtectedRoute>
                    <Presets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/players"
                element={
                  <ProtectedRoute>
                    <Players />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recorders"
                element={
                  <ProtectedRoute>
                    <Recorders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/controls"
                element={
                  <ProtectedRoute>
                    <Controls />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
            </Routes>
            <RealtimeNotifications />
          </WebSocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;