import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/layout/Layout';
import { Card } from './components/ui/Card';

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
    <BrowserRouter>
      <AuthProvider>
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
