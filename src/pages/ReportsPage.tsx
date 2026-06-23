import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Download, FileSpreadsheet, Users, MapPin, Target } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { arSA } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const COLORS = ['#0F9D58', '#34A853', '#66BB6A', '#FFC107', '#FF5722', '#2196F3', '#9C27B0'];

export default function ReportsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [empPerformance, setEmpPerformance] = useState<{ name: string; visits: number; opportunities: number }[]>([]);
  const [exhPerformance, setExhPerformance] = useState<{ name: string; visits: number }[]>([]);
  const [oppPipeline, setOppPipeline] = useState<{ name: string; value: number; count: number }[]>([]);
  const [monthlyActivity, setMonthlyActivity] = useState<{ month: string; visits: number; opportunities: number }[]>([]);

  useEffect(() => { loadReports(); }, [profile]);

  async function loadReports() {
    if (!profile) return;
    setLoading(true);

    const [
      { data: visitData },
      { data: oppData },
      { data: exhData },
    ] = await Promise.all([
      isAdmin
        ? supabase.from('visits').select('employee_id, profiles(name), exhibition_id, exhibitions(name), visit_date')
        : supabase.from('visits').select('employee_id, profiles(name), exhibition_id, exhibitions(name), visit_date').eq('employee_id', profile.id),
      isAdmin
        ? supabase.from('opportunities').select('status, estimated_value, visits(employee_id, profiles(name), visit_date)')
        : supabase.from('opportunities').select('status, estimated_value, visits!inner(employee_id, profiles(name), visit_date)').eq('visits.employee_id', profile.id),
      supabase.from('exhibitions').select('id, name'),
    ]);

    // Employee performance
    const empMap: Record<string, { name: string; visits: number; opportunities: number }> = {};
    (visitData ?? []).forEach((v: any) => {
      const id = v.employee_id;
      const name = v.profiles?.name ?? 'غير معروف';
      if (!empMap[id]) empMap[id] = { name, visits: 0, opportunities: 0 };
      empMap[id].visits++;
    });
    (oppData ?? []).forEach((o: any) => {
      const id = o.visits?.employee_id;
      if (id && empMap[id]) empMap[id].opportunities++;
    });
    setEmpPerformance(Object.values(empMap).sort((a, b) => b.visits - a.visits).slice(0, 10));

    // Exhibition performance
    const exhMap: Record<string, { name: string; visits: number }> = {};
    (visitData ?? []).forEach((v: any) => {
      if (!v.exhibition_id) return;
      const id = v.exhibition_id;
      const name = v.exhibitions?.name ?? 'معرض';
      if (!exhMap[id]) exhMap[id] = { name, visits: 0 };
      exhMap[id].visits++;
    });
    setExhPerformance(Object.values(exhMap).sort((a, b) => b.visits - a.visits).slice(0, 8));

    // Opportunity pipeline
    const statusLabels: Record<string, string> = {
      new: 'جديد', in_progress: 'قيد التنفيذ', quotation_sent: 'عرض مرسل',
      negotiation: 'تفاوض', won: 'مكسبة', lost: 'خسارة',
    };
    const pipeMap: Record<string, { count: number; value: number }> = {};
    (oppData ?? []).forEach((o: any) => {
      const s = o.status;
      if (!pipeMap[s]) pipeMap[s] = { count: 0, value: 0 };
      pipeMap[s].count++;
      pipeMap[s].value += o.estimated_value ?? 0;
    });
    setOppPipeline(Object.entries(pipeMap).map(([k, v]) => ({
      name: statusLabels[k] ?? k, value: v.value, count: v.count,
    })));

    // Monthly activity
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const label = format(d, 'MMM', { locale: arSA });
      const vCount = (visitData ?? []).filter((v: any) => v.visit_date >= start && v.visit_date <= end).length;
      const oCount = (oppData ?? []).filter((o: any) => {
        const vDate = o.visits?.visit_date;
        return vDate && vDate >= start && vDate <= end;
      }).length;
      months.push({ month: label, visits: vCount, opportunities: oCount });
    }
    setMonthlyActivity(months);

    setLoading(false);
  }

  async function exportVisits() {
    const { data } = await supabase
      .from('visits')
      .select('visit_number, visit_date, profiles(name), companies(name,industry,country), exhibitions(name), contact_name, contact_position, contact_phone, contact_email, evaluation, notes');

    const rows = (data ?? []).map((v: any) => ({
      'رقم الزيارة': v.visit_number,
      'التاريخ': v.visit_date,
      'الموظف': v.profiles?.name,
      'الشركة': v.companies?.name,
      'القطاع': v.companies?.industry,
      'الدولة': v.companies?.country,
      'المعرض': v.exhibitions?.name,
      'جهة الاتصال': v.contact_name,
      'المنصب': v.contact_position,
      'الهاتف': v.contact_phone,
      'البريد': v.contact_email,
      'التقييم': v.evaluation,
      'الملاحظات': v.notes,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الزيارات');
    XLSX.writeFile(wb, `تقرير_الزيارات_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  async function exportOpportunities() {
    const { data } = await supabase
      .from('opportunities')
      .select('type, status, estimated_value, priority, followup_date, details, visits(visit_number, profiles(name), companies(name))');

    const rows = (data ?? []).map((o: any) => ({
      'نوع الفرصة': o.type,
      'الحالة': o.status,
      'القيمة': o.estimated_value,
      'الأولوية': o.priority,
      'تاريخ المتابعة': o.followup_date,
      'التفاصيل': o.details,
      'رقم الزيارة': o.visits?.visit_number,
      'الموظف': o.visits?.profiles?.name,
      'الشركة': o.visits?.companies?.name,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الفرص');
    XLSX.writeFile(wb, `تقرير_الفرص_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#0F9D58] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقارير والتحليلات</h1>
          <p className="text-gray-500 text-sm mt-0.5">نظرة شاملة على أداء النظام</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportVisits} className="btn-secondary text-sm">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            تصدير الزيارات
          </button>
          <button onClick={exportOpportunities} className="btn-secondary text-sm">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            تصدير الفرص
          </button>
        </div>
      </div>

      {/* Monthly Activity */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-900 mb-4">النشاط الشهري (آخر 6 أشهر)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyActivity} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: 'Cairo' }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v, name) => [v, name === 'visits' ? 'الزيارات' : 'الفرص']} />
            <Legend formatter={(v) => v === 'visits' ? 'الزيارات' : 'الفرص'} />
            <Bar dataKey="visits" fill="#0F9D58" radius={[4, 4, 0, 0]} name="visits" />
            <Bar dataKey="opportunities" fill="#66BB6A" radius={[4, 4, 0, 0]} name="opportunities" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Performance */}
        {isAdmin && empPerformance.length > 0 && (
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0F9D58]" />
              أداء الموظفين
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={empPerformance} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontFamily: 'Cairo' }} width={90} />
                <Tooltip formatter={(v, n) => [v, n === 'visits' ? 'الزيارات' : 'الفرص']} />
                <Legend formatter={(v) => v === 'visits' ? 'الزيارات' : 'الفرص'} />
                <Bar dataKey="visits" fill="#0F9D58" radius={[0, 4, 4, 0]} name="visits" />
                <Bar dataKey="opportunities" fill="#66BB6A" radius={[0, 4, 4, 0]} name="opportunities" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Opportunity Pipeline */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#0F9D58]" />
            خط أنابيب الفرص
          </h2>
          {oppPipeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={oppPipeline} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, count }) => `${name}: ${count}`}>
                  {oppPipeline.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n, p) => [`${v} فرصة`, p.payload.name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">لا توجد بيانات</div>
          )}
        </div>

        {/* Exhibition Performance */}
        {exhPerformance.length > 0 && (
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#0F9D58]" />
              أداء المعارض
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={exhPerformance} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontFamily: 'Cairo' }} width={120} />
                <Tooltip formatter={(v) => [`${v} زيارة`, 'الزيارات']} />
                <Bar dataKey="visits" fill="#34A853" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
