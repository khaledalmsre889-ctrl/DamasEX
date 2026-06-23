import React, { useEffect, useState, useRef } from 'react';
import { supabase, type Visit, type Exhibition, type Company } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Search, X, Check, Eye, ChevronDown, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const DISCUSSION_TYPES = [
  'استفسار عن منتج', 'نقاش تقني', 'شراكة', 'توزيع',
  'تسعير', 'طلب عرض سعر', 'مشروع جديد', 'أخرى',
];

const EVALUATIONS = [
  { value: 'very_important', label: 'مهم جداً', color: 'border-red-300 bg-red-50 text-red-700', selected: 'border-red-500 bg-red-500 text-white' },
  { value: 'important', label: 'مهم', color: 'border-orange-300 bg-orange-50 text-orange-700', selected: 'border-orange-500 bg-orange-500 text-white' },
  { value: 'normal', label: 'عادي', color: 'border-blue-300 bg-blue-50 text-blue-700', selected: 'border-blue-500 bg-blue-500 text-white' },
  { value: 'weak', label: 'ضعيف', color: 'border-gray-300 bg-gray-50 text-gray-700', selected: 'border-gray-500 bg-gray-500 text-white' },
];

type VisitForm = {
  exhibition_id: string;
  booth_number: string;
  company_name: string;
  company_id: string;
  contact_name: string;
  contact_position: string;
  contact_phone: string;
  contact_phone2: string;
  contact_email: string;
  discussion_types: string[];
  evaluation: string;
  notes: string;
};

const emptyForm: VisitForm = {
  exhibition_id: '', booth_number: '', company_name: '', company_id: '',
  contact_name: '', contact_position: '', contact_phone: '', contact_phone2: '',
  contact_email: '', discussion_types: [], evaluation: '', notes: '',
};

export default function VisitsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [visits, setVisits] = useState<Visit[]>([]);
  const [exhibitions, setExhibitions] = useState<Pick<Exhibition, 'id' | 'name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEval, setFilterEval] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<VisitForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [companySuggestions, setCompanySuggestions] = useState<Company[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    const [{ data: vData }, { data: exData }] = await Promise.all([
      isAdmin
        ? supabase.from('visits').select('*, profiles(name), companies(name, industry), exhibitions(name), visit_discussions(discussion_type)').order('created_at', { ascending: false })
        : supabase.from('visits').select('*, profiles(name), companies(name, industry), exhibitions(name), visit_discussions(discussion_type)').eq('employee_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('exhibitions').select('id, name').eq('status', 'active').order('name'),
    ]);
    setVisits(vData ?? []);
    setExhibitions(exData ?? []);
    setLoading(false);
  }

  async function searchCompanies(q: string) {
    if (!q || q.length < 2) { setCompanySuggestions([]); return; }
    const { data } = await supabase.from('companies').select('*').ilike('name', `%${q}%`).limit(5);
    setCompanySuggestions(data ?? []);
    setShowSuggestions(true);
  }

  function selectCompany(c: Company) {
    setForm(f => ({
      ...f,
      company_id: c.id,
      company_name: c.name,
    }));
    setCompanySuggestions([]);
    setShowSuggestions(false);
  }

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(v: Visit) {
    setEditId(v.id);
    setForm({
      exhibition_id: v.exhibition_id ?? '',
      booth_number: v.booth_number ?? '',
      company_name: (v.companies as any)?.name ?? '',
      company_id: v.company_id,
      contact_name: v.contact_name ?? '',
      contact_position: v.contact_position ?? '',
      contact_phone: v.contact_phone ?? '',
      contact_phone2: v.contact_phone2 ?? '',
      contact_email: v.contact_email ?? '',
      discussion_types: v.visit_discussions?.map(d => d.discussion_type) ?? [],
      evaluation: v.evaluation ?? '',
      notes: v.notes ?? '',
    });
    setError('');
    setShowModal(true);
  }

  async function generateVisitNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('visits').select('id', { count: 'exact' });
    const seq = ((count ?? 0) + 1).toString().padStart(4, '0');
    return `VIS-${year}-${seq}`;
  }

  async function ensureCompany(): Promise<string> {
    if (form.company_id) return form.company_id;
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .ilike('name', form.company_name)
      .maybeSingle();
    if (existing) return existing.id;
    const { data: newComp, error } = await supabase
      .from('companies')
      .insert({ name: form.company_name, created_by: profile?.id })
      .select('id')
      .single();
    if (error) throw error;
    return newComp.id;
  }

  async function handleSave() {
    if (!form.company_name) { setError('اسم الشركة مطلوب'); return; }
    setSaving(true);
    setError('');
    try {
      const companyId = await ensureCompany();
      if (!editId) {
        const visitNumber = await generateVisitNumber();
        const { data: newVisit, error: vError } = await supabase.from('visits').insert({
          visit_number: visitNumber,
          employee_id: profile!.id,
          company_id: companyId,
          exhibition_id: form.exhibition_id || null,
          booth_number: form.booth_number || null,
          contact_name: form.contact_name || null,
          contact_position: form.contact_position || null,
          contact_phone: form.contact_phone || null,
          contact_phone2: form.contact_phone2 || null,
          contact_email: form.contact_email || null,
          evaluation: form.evaluation || null,
          notes: form.notes || null,
          visit_date: format(new Date(), 'yyyy-MM-dd'),
          visit_time: format(new Date(), 'HH:mm:ss'),
        }).select('id').single();
        if (vError) throw vError;
        if (form.discussion_types.length > 0) {
          await supabase.from('visit_discussions').insert(
            form.discussion_types.map(dt => ({ visit_id: newVisit.id, discussion_type: dt }))
          );
        }
      } else {
        const { error: vError } = await supabase.from('visits').update({
          company_id: companyId,
          exhibition_id: form.exhibition_id || null,
          booth_number: form.booth_number || null,
          contact_name: form.contact_name || null,
          contact_position: form.contact_position || null,
          contact_phone: form.contact_phone || null,
          contact_phone2: form.contact_phone2 || null,
          contact_email: form.contact_email || null,
          evaluation: form.evaluation || null,
          notes: form.notes || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editId);
        if (vError) throw vError;
        await supabase.from('visit_discussions').delete().eq('visit_id', editId);
        if (form.discussion_types.length > 0) {
          await supabase.from('visit_discussions').insert(
            form.discussion_types.map(dt => ({ visit_id: editId, discussion_type: dt }))
          );
        }
      }
      setShowModal(false);
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('visits').delete().eq('id', id);
    setDeleteId(null);
    loadData();
  }

  const evalConfig: Record<string, { label: string; cls: string }> = {
    very_important: { label: 'مهم جداً', cls: 'text-red-700 bg-red-50 border border-red-200' },
    important: { label: 'مهم', cls: 'text-orange-700 bg-orange-50 border border-orange-200' },
    normal: { label: 'عادي', cls: 'text-blue-700 bg-blue-50 border border-blue-200' },
    weak: { label: 'ضعيف', cls: 'text-gray-600 bg-gray-50 border border-gray-200' },
  };

  const filtered = visits.filter(v => {
    const matchSearch = search === '' ||
      (v.companies as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.visit_number.toLowerCase().includes(search.toLowerCase()) ||
      (v.contact_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (v.profiles as any)?.name?.toLowerCase().includes(search.toLowerCase());
    const matchEval = !filterEval || v.evaluation === filterEval;
    return matchSearch && matchEval;
  });

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'جميع الزيارات' : 'زياراتي'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{visits.length} زيارة مسجلة</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          تسجيل زيارة
        </button>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pr-9" placeholder="بحث برقم الزيارة أو الشركة أو جهة الاتصال..." />
          </div>
          <select value={filterEval} onChange={e => setFilterEval(e.target.value)} className="input w-40">
            <option value="">كل التقييمات</option>
            {EVALUATIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#0F9D58] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Eye className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">لا توجد زيارات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">رقم الزيارة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الشركة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">جهة الاتصال</th>
                  {isAdmin && <th className="text-right py-3 px-4 font-semibold text-gray-700">الموظف</th>}
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">المعرض</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">التاريخ</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">التقييم</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="table-row">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-[#0F9D58]">{v.visit_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900">{(v.companies as any)?.name}</p>
                      {(v.companies as any)?.industry && (
                        <p className="text-xs text-gray-500">{(v.companies as any).industry}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-900">{v.contact_name || '—'}</p>
                      {v.contact_position && <p className="text-xs text-gray-500">{v.contact_position}</p>}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-gray-600">{(v.profiles as any)?.name}</td>
                    )}
                    <td className="py-3 px-4 text-gray-600 text-xs">{(v.exhibitions as any)?.name || '—'}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{format(new Date(v.visit_date), 'dd/MM/yyyy')}</td>
                    <td className="py-3 px-4">
                      {v.evaluation ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${evalConfig[v.evaluation]?.cls}`}>
                          {evalConfig[v.evaluation]?.label}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(v)} className="p-1.5 text-gray-500 hover:text-[#0F9D58] hover:bg-green-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(v.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

      {/* Visit Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'تعديل الزيارة' : 'تسجيل زيارة جديدة'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Exhibition Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#0F9D58] text-white rounded-full flex items-center justify-center text-xs">1</span>
                  معلومات المعرض
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">المعرض</label>
                    <select value={form.exhibition_id} onChange={e => setForm({ ...form, exhibition_id: e.target.value })} className="input">
                      <option value="">اختر المعرض</option>
                      {exhibitions.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">رقم الجناح</label>
                    <input value={form.booth_number} onChange={e => setForm({ ...form, booth_number: e.target.value })} className="input" placeholder="رقم الجناح" />
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#0F9D58] text-white rounded-full flex items-center justify-center text-xs">2</span>
                  معلومات الشركة
                </h3>
                <div className="relative mb-4" ref={companyRef}>
                  <label className="label">اسم الشركة *</label>
                  <input
                    value={form.company_name}
                    onChange={e => {
                      setForm({ ...form, company_name: e.target.value, company_id: '' });
                      searchCompanies(e.target.value);
                    }}
                    className="input"
                    placeholder="ابحث عن شركة أو أدخل اسماً جديداً"
                  />
                  {form.company_id && (
                    <p className="text-xs text-[#0F9D58] mt-1">✓ شركة موجودة في قاعدة البيانات</p>
                  )}
                  {showSuggestions && companySuggestions.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      {companySuggestions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCompany(c)}
                          className="w-full text-right px-4 py-2.5 hover:bg-green-50 text-sm border-b border-gray-50 last:border-0"
                        >
                          <p className="font-medium text-gray-900">{c.name}</p>
                          {c.industry && <p className="text-xs text-gray-500">{c.industry}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">جهة الاتصال</label>
                    <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="input" placeholder="اسم الشخص" />
                  </div>
                  <div>
                    <label className="label">المنصب / الوظيفة</label>
                    <input value={form.contact_position} onChange={e => setForm({ ...form, contact_position: e.target.value })} className="input" placeholder="المنصب" />
                  </div>
                  <div>
                    <label className="label">الهاتف 1</label>
                    <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className="input" placeholder="رقم الهاتف" />
                  </div>
                  <div>
                    <label className="label">الهاتف 2</label>
                    <input value={form.contact_phone2} onChange={e => setForm({ ...form, contact_phone2: e.target.value })} className="input" placeholder="رقم بديل" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">البريد الإلكتروني</label>
                    <input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="input" placeholder="email@company.com" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* Discussion */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#0F9D58] text-white rounded-full flex items-center justify-center text-xs">3</span>
                  موضوع النقاش
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {DISCUSSION_TYPES.map(dt => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => {
                        const updated = form.discussion_types.includes(dt)
                          ? form.discussion_types.filter(d => d !== dt)
                          : [...form.discussion_types, dt];
                        setForm({ ...form, discussion_types: updated });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        form.discussion_types.includes(dt)
                          ? 'bg-[#0F9D58] text-white border-[#0F9D58]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#0F9D58] hover:text-[#0F9D58]'
                      }`}
                    >
                      {dt}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="label">ملاحظات إضافية</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input h-20 resize-none" placeholder="ملاحظات حول الزيارة..." />
                </div>
              </div>

              {/* Evaluation */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#0F9D58] text-white rounded-full flex items-center justify-center text-xs">4</span>
                  تقييم الزيارة
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {EVALUATIONS.map(ev => (
                    <button
                      key={ev.value}
                      type="button"
                      onClick={() => setForm({ ...form, evaluation: form.evaluation === ev.value ? '' : ev.value })}
                      className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        form.evaluation === ev.value ? ev.selected : ev.color
                      }`}
                    >
                      {ev.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? 'حفظ التعديلات' : 'تسجيل الزيارة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 modal-content">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 text-sm mb-6">هل أنت متأكد من حذف هذه الزيارة؟</p>
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
