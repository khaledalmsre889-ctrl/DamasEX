import React, { useEffect, useState } from 'react';
import { supabase, type Opportunity } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Search, X, Check, Target } from 'lucide-react';
import { format } from 'date-fns';

const OPP_TYPES = [
  'زيارة موقع تقنية', 'طلب عرض سعر', 'اجتماع متابعة', 'اجتماع أونلاين',
  'مشروع محتمل', 'فرصة شراكة', 'طلب توزيع', 'مناقصة', 'أخرى',
];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  new: { label: 'جديد', cls: 'badge-blue' },
  in_progress: { label: 'قيد التنفيذ', cls: 'badge-yellow' },
  quotation_sent: { label: 'عرض مرسل', cls: 'badge-green' },
  negotiation: { label: 'تفاوض', cls: 'badge-yellow' },
  won: { label: 'مكسبة', cls: 'badge-green' },
  lost: { label: 'خسارة', cls: 'badge-red' },
};

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  low: { label: 'منخفضة', cls: 'text-gray-600 bg-gray-50' },
  medium: { label: 'متوسطة', cls: 'text-blue-600 bg-blue-50' },
  high: { label: 'عالية', cls: 'text-orange-600 bg-orange-50' },
  urgent: { label: 'عاجلة', cls: 'text-red-600 bg-red-50' },
};

type OppForm = {
  visit_id: string;
  type: string;
  status: string;
  details: string;
  estimated_value: string;
  priority: string;
  followup_date: string;
  notes: string;
};

const emptyForm: OppForm = {
  visit_id: '', type: '', status: 'new', details: '',
  estimated_value: '', priority: 'medium', followup_date: '', notes: '',
};

export default function OpportunitiesPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [opps, setOpps] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<OppForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    const [{ data: oppData }, { data: visitData }] = await Promise.all([
      isAdmin
        ? supabase.from('opportunities').select('*, visits(visit_number, companies(name), profiles(name))').order('created_at', { ascending: false })
        : supabase.from('opportunities').select('*, visits!inner(visit_number, companies(name), profiles(name), employee_id)').eq('visits.employee_id', profile.id).order('created_at', { ascending: false }),
      isAdmin
        ? supabase.from('visits').select('id, visit_number, companies(name)').order('created_at', { ascending: false }).limit(100)
        : supabase.from('visits').select('id, visit_number, companies(name)').eq('employee_id', profile.id).order('created_at', { ascending: false }).limit(100),
    ]);
    setOpps(oppData ?? []);
    setVisits(visitData ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(opp: any) {
    setEditId(opp.id);
    setForm({
      visit_id: opp.visit_id,
      type: opp.type,
      status: opp.status,
      details: opp.details ?? '',
      estimated_value: opp.estimated_value?.toString() ?? '',
      priority: opp.priority ?? 'medium',
      followup_date: opp.followup_date ?? '',
      notes: opp.notes ?? '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.visit_id || !form.type) { setError('الزيارة ونوع الفرصة مطلوبان'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        visit_id: form.visit_id,
        type: form.type,
        status: form.status,
        details: form.details || null,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        priority: form.priority || null,
        followup_date: form.followup_date || null,
        notes: form.notes || null,
      };
      if (!editId) {
        const { error } = await supabase.from('opportunities').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('opportunities').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId);
        if (error) throw error;
      }
      setShowModal(false);
      loadData();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('opportunities').delete().eq('id', id);
    setDeleteId(null);
    loadData();
  }

  const filtered = opps.filter(o => {
    const matchSearch = search === '' ||
      o.type.toLowerCase().includes(search.toLowerCase()) ||
      (o.visits?.companies?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalValue = filtered.reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الفرص</h1>
          <p className="text-gray-500 text-sm mt-0.5">{opps.length} فرصة مسجلة</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          إضافة فرصة
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = opps.filter(o => o.status === key).length;
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
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pr-9" placeholder="بحث بنوع الفرصة أو الشركة..." />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-40">
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {totalValue > 0 && (
            <div className="text-sm font-semibold text-[#0F9D58] bg-green-50 px-3 py-1.5 rounded-lg">
              القيمة الإجمالية: {totalValue.toLocaleString('ar')} 
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#0F9D58] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">لا توجد فرص</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">نوع الفرصة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الشركة</th>
                  {isAdmin && <th className="text-right py-3 px-4 font-semibold text-gray-700">الموظف</th>}
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الحالة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الأولوية</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">القيمة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">تاريخ المتابعة</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className="table-row">
                    <td className="py-3 px-4 font-medium text-gray-900">{o.type}</td>
                    <td className="py-3 px-4 text-gray-700">{o.visits?.companies?.name ?? '—'}</td>
                    {isAdmin && <td className="py-3 px-4 text-gray-600 text-xs">{o.visits?.profiles?.name}</td>}
                    <td className="py-3 px-4">
                      <span className={STATUS_CONFIG[o.status]?.cls ?? 'badge-gray'}>
                        {STATUS_CONFIG[o.status]?.label ?? o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {o.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CONFIG[o.priority]?.cls}`}>
                          {PRIORITY_CONFIG[o.priority]?.label}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700 font-medium">
                      {o.estimated_value ? o.estimated_value.toLocaleString('ar') : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {o.followup_date ? format(new Date(o.followup_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(o)} className="p-1.5 text-gray-500 hover:text-[#0F9D58] hover:bg-green-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(o.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'تعديل فرصة' : 'إضافة فرصة جديدة'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">الزيارة المرتبطة *</label>
                <select value={form.visit_id} onChange={e => setForm({ ...form, visit_id: e.target.value })} className="input">
                  <option value="">اختر الزيارة</option>
                  {visits.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.visit_number} — {(v.companies as any)?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">نوع الفرصة *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                    <option value="">اختر النوع</option>
                    {OPP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">الحالة</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">الأولوية</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">القيمة التقديرية</label>
                  <input value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} className="input" placeholder="0" type="number" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="label">تفاصيل الفرصة</label>
                <textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} className="input h-20 resize-none" placeholder="تفاصيل..." />
              </div>
              <div>
                <label className="label">تاريخ المتابعة</label>
                <input value={form.followup_date} onChange={e => setForm({ ...form, followup_date: e.target.value })} className="input" type="date" />
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input h-16 resize-none" placeholder="ملاحظات..." />
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
            <p className="text-gray-600 text-sm mb-6">هل أنت متأكد من حذف هذه الفرصة؟</p>
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
