import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import PublicWebsite from './PublicWebsite';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import CustomerPortal from './CustomerPortal';
import EmployeePortal from './EmployeePortal';
import AdminPortal from './AdminPortal';
import { UserRole } from './types';
function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center text-white text-sm">
        Loading NewEdgeEngineeringAndWorks Workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const fallback = user.role === 'ADMIN' ? '/admin' : user.role === 'EMPLOYEE' ? '/employee' : '/customer';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicWebsite />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/customer/*"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <CustomerPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/*"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                <EmployeePortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPortal />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
