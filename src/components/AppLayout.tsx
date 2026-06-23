import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#0F9D58] border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          <p className="text-gray-500 text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
