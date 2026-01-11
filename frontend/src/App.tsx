import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
                    <Dashboard />
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