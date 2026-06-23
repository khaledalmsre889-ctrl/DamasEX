import React, { useEffect, useState } from 'react';
import { supabase, type Company } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search, X, Check, Building2, ExternalLink } from 'lucide-react';

type CompanyForm = {
  name: string;
  industry: string;
  country: string;
  city: string;
  website: string;
  address: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyForm: CompanyForm = {
  name: '', industry: '', country: '', city: '', website: '',
  address: '', phone: '', email: '', notes: '',
};

const INDUSTRIES = ['تصنيع', 'تجارة', 'خدمات', 'تقنية', 'بناء وعقارات', 'طاقة', 'صحة', 'تعليم', 'زراعة', 'نقل ولوجستيات', 'أخرى'];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(c: Company) {
    setEditId(c.id);
    setForm({
      name: c.name, industry: c.industry ?? '', country: c.country ?? '',
      city: c.city ?? '', website: c.website ?? '', address: c.address ?? '',
      phone: c.phone ?? '', email: c.email ?? '', notes: c.notes ?? '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name) { setError('اسم الشركة مطلوب'); return; }
    setSaving(true);
    setError('');
    try {
      if (!editId) {
        // Check for duplicate
        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', form.name)
          .maybeSingle();
        if (existing) throw new Error('توجد شركة بهذا الاسم مسبقاً');
        const { error } = await supabase.from('companies').insert({ ...form });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('companies').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId);
        if (error) throw error;
      }
      setShowModal(false);
      loadCompanies();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('companies').delete().eq('id', id);
    setDeleteId(null);
    loadCompanies();
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.industry ?? '').includes(search) ||
    (c.country ?? '').includes(search) ||
    (c.city ?? '').includes(search)
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الشركات</h1>
          <p className="text-gray-500 text-sm mt-0.5">{companies.length} شركة مسجلة</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          إضافة شركة
        </button>
      </div>

      <div className="card">
        <div className="mb-5">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pr-9" placeholder="بحث بالاسم أو القطاع أو البلد..." />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#0F9D58] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">لا توجد شركات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الشركة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">القطاع</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الدولة / المدينة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الهاتف</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">البريد</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="table-row">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          {c.website && (
                            <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-xs text-[#0F9D58] hover:underline flex items-center gap-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> {c.website}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {c.industry ? <span className="badge-blue">{c.industry}</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{[c.city, c.country].filter(Boolean).join('، ') || '—'}</td>
                    <td className="py-3 px-4 text-gray-600">{c.phone || '—'}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{c.email || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:text-[#0F9D58] hover:bg-green-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'تعديل شركة' : 'إضافة شركة جديدة'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">اسم الشركة *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="اسم الشركة" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">القطاع</label>
                  <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className="input">
                    <option value="">اختر القطاع</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">الدولة</label>
                  <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="input" placeholder="الدولة" />
                </div>
                <div>
                  <label className="label">المدينة</label>
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input" placeholder="المدينة" />
                </div>
                <div>
                  <label className="label">الموقع الإلكتروني</label>
                  <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className="input" placeholder="www.example.com" dir="ltr" />
                </div>
                <div>
                  <label className="label">الهاتف</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" placeholder="رقم الهاتف" />
                </div>
                <div>
                  <label className="label">البريد الإلكتروني</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" placeholder="email@company.com" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="label">العنوان</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="input" placeholder="عنوان الشركة" />
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input h-20 resize-none" placeholder="ملاحظات..." />
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
            <p className="text-gray-600 text-sm mb-6">هل أنت متأكد من حذف هذه الشركة؟</p>
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
