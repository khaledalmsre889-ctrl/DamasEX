import React, { useState, useEffect } from 'react';
import { Bell, Search, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type Notification } from '../lib/supabase';
import { Link } from 'react-router-dom';

export default function TopNav() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .eq('status', 'unread')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setNotifications(data ?? []));
  }, [profile]);

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('user_id', profile?.id ?? '')
      .eq('status', 'unread');
    setNotifications([]);
    setShowNotif(false);
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="بحث سريع..."
            className="w-full pr-9 pl-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F9D58] focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <Bell className="w-4 h-4 text-gray-600" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-in">
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-semibold text-gray-900">الإشعارات</span>
                {notifications.length > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[#0F9D58] hover:underline">
                    تعليم الكل كمقروء
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">لا توجد إشعارات جديدة</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-3 border-b border-gray-50 hover:bg-gray-50">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="w-7 h-7 bg-gradient-to-br from-[#0F9D58] to-[#34A853] rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{profile?.name?.[0] ?? '?'}</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-gray-900">{profile?.name}</p>
            <p className="text-xs text-gray-500">{profile?.role === 'admin' ? 'مدير النظام' : 'موظف'}</p>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400 hidden md:block" />
        </div>
      </div>
    </header>
  );
}
