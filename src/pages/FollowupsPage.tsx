import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Search, X, Check, CalendarCheck, AlertCircle, Clock } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { arSA } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending: { label: 'معلقة', cls: 'badge-yellow' },
  completed: { label: 'مكتملة', cls: 'badge-green' },
  cancelled: { label: 'ملغاة', cls: 'badge-red' },
};

type FollowupForm = {
  visit_id: string;
  due_date: string;
  status: string;
  notes: string;
  assigned_to: string;
};

const emptyForm: FollowupForm = {
  visit_id: '', due_date: '', status: 'pending', notes: '', assigned_to: '',
};

export default function FollowupsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [followups, setFollowups] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FollowupForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    const [{ data: fData }, { data: vData }, { data: eData }] = await Promise.all([
      isAdmin
        ? supabase.from('followups').select('*, visits(visit_number, companies(name)), profiles!followups_assigned_to_fkey(name)').order('due_date')
        : supabase.from('followups').select('*, visits(visit_number, companies(name)), profiles!followups_assigned_to_fkey(name)').or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`).order('due_date'),
      isAdmin
        ? supabase.from('visits').select('id, visit_number, companies(name)').order('created_at', { ascending: false }).limit(100)
        : supabase.from('visits').select('id, visit_number, companies(name)').eq('employee_id', profile.id).limit(100),
      isAdmin ? supabase.from('profiles').select('id, name').eq('role', 'employee').eq('status', 'active') : Promise.resolve({ data: [] }),
    ]);
    setFollowups(fData ?? []);
    setVisits(vData ?? []);
    setEmployees(eData ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm, assigned_to: profile?.id ?? '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(f: any) {
    setEditId(f.id);
    setForm({
      visit_id: f.visit_id ?? '',
      due_date: f.due_date,
      status: f.status,
      notes: f.notes ?? '',
      assigned_to: f.assigned_to ?? '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.due_date) { setError('تاريخ الاستحقاق مطلوب'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        visit_id: form.visit_id || null,
        due_date: form.due_date,
        status: form.status,
        notes: form.notes || null,
        assigned_to: form.assigned_to || profile?.id,
      };
      if (!editId) {
        const { error } = await supabase.from('followups').insert({ ...payload, created_by: profile?.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('followups').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId);
        if (error) throw error;
      }
      setShowModal(false);
      loadData();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('followups').delete().eq('id', id);
    setDeleteId(null);
    loadData();
  }

  async function markComplete(id: string) {
    await supabase.from('followups').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', id);
    loadData();
  }

  const filtered = followups.filter(f => {
    const matchSearch = search === '' ||
      (f.visits?.companies?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (f.visits?.visit_number ?? '').includes(search) ||
      (f.notes ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const overdue = filtered.filter(f => f.status === 'pending' && isPast(new Date(f.due_date)) && !isToday(new Date(f.due_date)));
  const dueToday = filtered.filter(f => f.status === 'pending' && isToday(new Date(f.due_date)));

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">نظام المتابعات</h1>
          <p className="text-gray-500 text-sm mt-0.5">{followups.length} متابعة مسجلة</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          إضافة متابعة
        </button>
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm font-medium">
            {overdue.length} متابعة متأخرة عن موعدها!
          </p>
        </div>
      )}

      {dueToday.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <p className="text-yellow-700 text-sm font-medium">
            {dueToday.length} متابعة موعدها اليوم
          </p>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = followups.filter(f => f.status === key).length;
          return (
            <div key={key} className="stat-card text-center cursor-pointer" onClick={() => setFilterStatus(filterStatus === key ? '' : key)}>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <span className={`${cfg.cls} text-xs mt-1`}>{cfg.label}</span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pr-9" placeholder="بحث..." />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-36">
            <option value="">الكل</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#0F9D58] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <CalendarCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">لا توجد متابعات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(f => {
              const isOverdue = f.status === 'pending' && isPast(new Date(f.due_date)) && !isToday(new Date(f.due_date));
              const isDay = f.status === 'pending' && isToday(new Date(f.due_date));
              return (
                <div key={f.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isOverdue ? 'border-red-200 bg-red-50' : isDay ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100 bg-white hover:shadow-sm'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {f.visits?.visit_number && (
                        <span className="font-mono text-xs font-bold text-[#0F9D58]">{f.visits.visit_number}</span>
                      )}
                      {f.visits?.companies?.name && (
                        <span className="text-sm font-semibold text-gray-900">{f.visits.companies.name}</span>
                      )}
                      <span className={STATUS_CONFIG[f.status]?.cls ?? 'badge-gray'}>
                        {STATUS_CONFIG[f.status]?.label}
                      </span>
                    </div>
                    {f.notes && <p className="text-xs text-gray-600 mb-1">{f.notes}</p>}
                    <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : isDay ? 'text-yellow-700' : 'text-gray-500'}`}>
                      {isOverdue ? '⚠ متأخر — ' : isDay ? '📅 اليوم — ' : ''}
                      {format(new Date(f.due_date), 'dd MMMM yyyy', { locale: arSA })}
                    </p>
                    {f.profiles?.name && <p className="text-xs text-gray-400 mt-0.5">مسؤول: {f.profiles.name}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {f.status === 'pending' && (
                      <button onClick={() => markComplete(f.id)} className="p-1.5 text-[#0F9D58] hover:bg-green-100 rounded-lg transition-colors" title="تعليم كمكتملة">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(f)} className="p-1.5 text-gray-500 hover:text-[#0F9D58] hover:bg-green-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(f.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl modal-content">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'تعديل متابعة' : 'إضافة متابعة جديدة'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">الزيارة المرتبطة</label>
                <select value={form.visit_id} onChange={e => setForm({ ...form, visit_id: e.target.value })} className="input">
                  <option value="">اختر الزيارة (اختياري)</option>
                  {visits.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.visit_number} — {(v.companies as any)?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">تاريخ الاستحقاق *</label>
                  <input value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="input" type="date" />
                </div>
                <div>
                  <label className="label">الحالة</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              {isAdmin && employees.length > 0 && (
                <div>
                  <label className="label">المسؤول</label>
                  <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="input">
                    <option value="">اختر الموظف</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input h-20 resize-none" placeholder="ملاحظات المتابعة..." />
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? 'حفظ' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 modal-content">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 text-sm mb-6">هل أنت متأكد؟</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1 justify-center">حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
