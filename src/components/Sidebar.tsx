import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, Building2, MapPin, Eye, Target,
  Bell, Settings, LogOut, ChevronLeft, Menu, X, Leaf,
  CalendarCheck, BarChart3, UserCog
} from 'lucide-react';
import clsx from 'clsx';

const adminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: '/employees', icon: UserCog, label: 'الموظفون' },
  { to: '/exhibitions', icon: MapPin, label: 'المعارض' },
  { to: '/companies', icon: Building2, label: 'الشركات' },
  { to: '/visits', icon: Eye, label: 'الزيارات' },
  { to: '/opportunities', icon: Target, label: 'الفرص' },
  { to: '/followups', icon: CalendarCheck, label: 'المتابعات' },
  { to: '/reports', icon: BarChart3, label: 'التقارير' },
];

const employeeLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: '/visits', icon: Eye, label: 'زياراتي' },
  { to: '/opportunities', icon: Target, label: 'الفرص' },
  { to: '/followups', icon: CalendarCheck, label: 'المتابعات' },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = profile?.role === 'admin' ? adminLinks : employeeLinks;

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={clsx('flex items-center gap-3 p-4 border-b border-white/20', collapsed && 'justify-center')}>
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">Green Exhibition</h1>
            <p className="text-white/60 text-xs">CRM System</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              clsx(
                'sidebar-item text-white/80',
                isActive && 'active !text-[#0F9D58]',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/20">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-white/10 rounded-lg">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{profile?.name?.[0] ?? '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{profile?.name}</p>
              <p className="text-white/60 text-xs">
                {profile?.role === 'admin' ? 'مدير' : 'موظف'}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={clsx(
            'sidebar-item text-white/80 w-full hover:text-red-300 hover:bg-red-500/20',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          'hidden lg:flex flex-col bg-gradient-to-b from-[#0F9D58] to-[#0d7a47] transition-all duration-300 relative',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -left-3 top-20 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors z-10"
        >
          <ChevronLeft className={clsx('w-3 h-3 text-gray-600 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 w-10 h-10 bg-[#0F9D58] rounded-xl flex items-center justify-center shadow-lg text-white"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-gradient-to-b from-[#0F9D58] to-[#0d7a47] h-full">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 left-4 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
