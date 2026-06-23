import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Eye, Building2, MapPin, Users, Target, CalendarCheck,
  TrendingUp, Award, Clock, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { arSA } from 'date-fns/locale';

type Stats = {
  totalVisits: number;
  todayVisits: number;
  monthVisits: number;
  totalEmployees: number;
  totalCompanies: number;
  totalExhibitions: number;
  totalOpportunities: number;
  pendingFollowups: number;
  overdueFollowups: number;
};

const COLORS = ['#0F9D58', '#34A853', '#66BB6A', '#FFC107', '#FF5722', '#2196F3'];

export default function DashboardPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [stats, setStats] = useState<Stats>({
    totalVisits: 0, todayVisits: 0, monthVisits: 0,
    totalEmployees: 0, totalCompanies: 0, totalExhibitions: 0,
    totalOpportunities: 0, pendingFollowups: 0, overdueFollowups: 0,
  });
  const [monthlyData, setMonthlyData] = useState<{ month: string; visits: number }[]>([]);
  const [evaluationData, setEvaluationData] = useState<{ name: string; value: number }[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [topEmployees, setTopEmployees] = useState<{ name: string; visits: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    if (!profile) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const visitsQuery = supabase.from('visits').select('id, visit_date, evaluation, employee_id, profiles(name), companies(name)', { count: 'exact' });
    const baseQuery = isAdmin ? visitsQuery : visitsQuery.eq('employee_id', profile.id);

    const [
      { count: totalVisits },
      { count: todayVisits },
      { count: monthVisits },
      { count: totalCompanies },
      { count: totalExhibitions },
      { count: totalOpportunities },
      { count: totalEmployees },
      { count: pendingFollowups },
      { count: overdueFollowups },
      { data: recentData },
    ] = await Promise.all([
      baseQuery,
      isAdmin
        ? supabase.from('visits').select('id', { count: 'exact' }).eq('visit_date', today)
        : supabase.from('visits').select('id', { count: 'exact' }).eq('employee_id', profile.id).eq('visit_date', today),
      isAdmin
        ? supabase.from('visits').select('id', { count: 'exact' }).gte('visit_date', monthStart).lte('visit_date', monthEnd)
        : supabase.from('visits').select('id', { count: 'exact' }).eq('employee_id', profile.id).gte('visit_date', monthStart).lte('visit_date', monthEnd),
      supabase.from('companies').select('id', { count: 'exact' }),
      supabase.from('exhibitions').select('id', { count: 'exact' }),
      supabase.from('opportunities').select('id', { count: 'exact' }),
      isAdmin ? supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'employee').eq('status', 'active') : Promise.resolve({ count: 0 }),
      supabase.from('followups').select('id', { count: 'exact' }).eq('status', 'pending').gte('due_date', today),
      supabase.from('followups').select('id', { count: 'exact' }).eq('status', 'pending').lt('due_date', today),
      isAdmin
        ? supabase.from('visits').select('id, visit_number, visit_date, profiles(name), companies(name), evaluation').order('created_at', { ascending: false }).limit(5)
        : supabase.from('visits').select('id, visit_number, visit_date, profiles(name), companies(name), evaluation').eq('employee_id', profile.id).order('created_at', { ascending: false }).limit(5),
    ]);

    setStats({
      totalVisits: totalVisits ?? 0,
      todayVisits: todayVisits ?? 0,
      monthVisits: monthVisits ?? 0,
      totalEmployees: totalEmployees ?? 0,
      totalCompanies: totalCompanies ?? 0,
      totalExhibitions: totalExhibitions ?? 0,
      totalOpportunities: totalOpportunities ?? 0,
      pendingFollowups: pendingFollowups ?? 0,
      overdueFollowups: overdueFollowups ?? 0,
    });
    setRecentVisits(recentData ?? []);

    // Monthly data (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const q = supabase.from('visits').select('id', { count: 'exact' }).gte('visit_date', start).lte('visit_date', end);
      months.push({ label: format(d, 'MMM', { locale: arSA }), query: isAdmin ? q : q.eq('employee_id', profile.id) });
    }
    const monthResults = await Promise.all(months.map(m => m.query));
    setMonthlyData(months.map((m, i) => ({ month: m.label, visits: monthResults[i].count ?? 0 })));

    // Evaluation distribution
    const { data: evalData } = await supabase.from('visits').select('evaluation');
    const evalCounts: Record<string, number> = {};
    (evalData ?? []).forEach(v => {
      const key = v.evaluation ?? 'normal';
      evalCounts[key] = (evalCounts[key] ?? 0) + 1;
    });
    const evalLabels: Record<string, string> = { very_important: 'مهم جداً', important: 'مهم', normal: 'عادي', weak: 'ضعيف' };
    setEvaluationData(Object.entries(evalCounts).map(([k, v]) => ({ name: evalLabels[k] ?? k, value: v })));

    // Top employees
    if (isAdmin) {
      const { data: empVisits } = await supabase.from('visits').select('employee_id, profiles(name)');
      const empCount: Record<string, { name: string; count: number }> = {};
      (empVisits ?? []).forEach((v: any) => {
        const id = v.employee_id;
        if (!empCount[id]) empCount[id] = { name: v.profiles?.name ?? 'غير معروف', count: 0 };
        empCount[id].count++;
      });
      const sorted = Object.values(empCount).sort((a, b) => b.count - a.count).slice(0, 5);
      setTopEmployees(sorted.map(e => ({ name: e.name, visits: e.count })));
    }

    setLoading(false);
  }

  const evaluationConfig: Record<string, { label: string; color: string }> = {
    very_important: { label: 'مهم جداً', color: 'text-red-600 bg-red-50' },
    important: { label: 'مهم', color: 'text-orange-600 bg-orange-50' },
    normal: { label: 'عادي', color: 'text-blue-600 bg-blue-50' },
    weak: { label: 'ضعيف', color: 'text-gray-600 bg-gray-50' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#0F9D58] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'إجمالي الزيارات', value: stats.totalVisits, icon: Eye, color: 'bg-[#0F9D58]', lightColor: 'bg-green-50 text-[#0F9D58]' },
    { label: 'زيارات اليوم', value: stats.todayVisits, icon: Clock, color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-600' },
    { label: 'زيارات هذا الشهر', value: stats.monthVisits, icon: TrendingUp, color: 'bg-purple-500', lightColor: 'bg-purple-50 text-purple-600' },
    { label: 'الشركات', value: stats.totalCompanies, icon: Building2, color: 'bg-orange-500', lightColor: 'bg-orange-50 text-orange-600' },
    ...(isAdmin ? [
      { label: 'الموظفون النشطون', value: stats.totalEmployees, icon: Users, color: 'bg-pink-500', lightColor: 'bg-pink-50 text-pink-600' },
      { label: 'المعارض', value: stats.totalExhibitions, icon: MapPin, color: 'bg-teal-500', lightColor: 'bg-teal-50 text-teal-600' },
    ] : []),
    { label: 'الفرص', value: stats.totalOpportunities, icon: Target, color: 'bg-yellow-500', lightColor: 'bg-yellow-50 text-yellow-600' },
    { label: 'متابعات معلقة', value: stats.pendingFollowups, icon: CalendarCheck, color: 'bg-indigo-500', lightColor: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          مرحباً، {profile?.name} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'EEEE، d MMMM yyyy', { locale: arSA })}
        </p>
      </div>

      {stats.overdueFollowups > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">
            لديك <strong>{stats.overdueFollowups}</strong> متابعة متأخرة! يرجى المراجعة.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, lightColor }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('ar')}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${lightColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="text-base font-bold text-gray-900 mb-4">الزيارات الشهرية (آخر 6 أشهر)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barSize={30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: 'Cairo' }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v} زيارة`, 'الزيارات']} />
              <Bar dataKey="visits" fill="#0F9D58" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4">توزيع التقييمات</h2>
          {evaluationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={evaluationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {evaluationData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">لا توجد بيانات</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Visits */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4">آخر الزيارات</h2>
          {recentVisits.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد زيارات بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentVisits.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{v.companies?.name}</p>
                    <p className="text-xs text-gray-500">{v.profiles?.name} · {v.visit_date}</p>
                  </div>
                  {v.evaluation && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${evaluationConfig[v.evaluation]?.color ?? 'bg-gray-50 text-gray-600'}`}>
                      {evaluationConfig[v.evaluation]?.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Employees or My Progress */}
        <div className="card">
          {isAdmin ? (
            <>
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                أفضل الموظفين
              </h2>
              {topEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد بيانات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topEmployees.map((emp, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-[#0F9D58]'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900">{emp.name}</span>
                          <span className="text-gray-500">{emp.visits} زيارة</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-[#0F9D58] h-1.5 rounded-full"
                            style={{ width: `${topEmployees[0]?.visits ? (emp.visits / topEmployees[0].visits) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-base font-bold text-gray-900 mb-4">أدائي الشهري</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: 'Cairo' }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} زيارة`, '']} />
                  <Line type="monotone" dataKey="visits" stroke="#0F9D58" strokeWidth={2} dot={{ r: 4, fill: '#0F9D58' }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
