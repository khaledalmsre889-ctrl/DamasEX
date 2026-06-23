import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import ExhibitionsPage from './pages/ExhibitionsPage';
import CompaniesPage from './pages/CompaniesPage';
import VisitsPage from './pages/VisitsPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import FollowupsPage from './pages/FollowupsPage';
import ReportsPage from './pages/ReportsPage';
import { useAuth } from './contexts/AuthContext';

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="employees" element={
                <AdminRoute><EmployeesPage /></AdminRoute>
              } />
              <Route path="exhibitions" element={
                <AdminRoute><ExhibitionsPage /></AdminRoute>
              } />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="visits" element={<VisitsPage />} />
              <Route path="opportunities" element={<OpportunitiesPage />} />
              <Route path="followups" element={<FollowupsPage />} />
              <Route path="reports" element={
                <AdminRoute><ReportsPage /></AdminRoute>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
