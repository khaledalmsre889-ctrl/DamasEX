import React, { useEffect, useState } from 'react';
import { supabase, type Exhibition } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search, X, Check, Archive, MapPin } from 'lucide-react';
import { format } from 'date-fns';

type ExhibitionForm = {
  name: string;
  country: string;
  city: string;
  venue: string;
  start_date: string;
  end_date: string;
  organizer: string;
  description: string;
  status: 'active' | 'archived';
};

const emptyForm: ExhibitionForm = {
  name: '', country: '', city: '', venue: '', start_date: '', end_date: '',
  organizer: '', description: '', status: 'active',
};

export default function ExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExhibitionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadExhibitions(); }, []);

  async function loadExhibitions() {
    setLoading(true);
    const { data } = await supabase
      .from('exhibitions')
      .select('*')
      .order('created_at', { ascending: false });
    setExhibitions(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(ex: Exhibition) {
    setEditId(ex.id);
    setForm({
      name: ex.name,
      country: ex.country ?? '',
      city: ex.city ?? '',
      venue: ex.venue ?? '',
      start_date: ex.start_date ?? '',
      end_date: ex.end_date ?? '',
      organizer: ex.organizer ?? '',
      description: ex.description ?? '',
      status: ex.status,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name) { setError('اسم المعرض مطلوب'); return; }
    setSaving(true);
    setError('');
    try {
      if (!editId) {
        const { error } = await supabase.from('exhibitions').insert({ ...form });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('exhibitions').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId);
        if (error) throw error;
      }
      setShowModal(false);
      loadExhibitions();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('exhibitions').delete().eq('id', id);
    setDeleteId(null);
    loadExhibitions();
  }

  async function handleArchive(ex: Exhibition) {
    await supabase.from('exhibitions').update({ status: ex.status === 'active' ? 'archived' : 'active' }).eq('id', ex.id);
    loadExhibitions();
  }

  const filtered = exhibitions.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.country ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.city ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المعارض</h1>
          <p className="text-gray-500 text-sm mt-0.5">{exhibitions.length} معرض مسجل</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          إضافة معرض
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pr-9" placeholder="بحث بالاسم أو البلد أو المدينة..." />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#0F9D58] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">لا توجد معارض</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(ex => (
              <div key={ex.id} className={`border rounded-xl p-5 hover:shadow-md transition-all ${ex.status === 'archived' ? 'opacity-60 border-gray-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{ex.name}</h3>
                    {(ex.country || ex.city) && (
                      <p className="text-gray-500 text-sm mt-0.5">
                        <MapPin className="w-3 h-3 inline ml-1" />
                        {[ex.city, ex.country].filter(Boolean).join('، ')}
                      </p>
                    )}
                  </div>
                  <span className={ex.status === 'active' ? 'badge-green' : 'badge-gray'}>
                    {ex.status === 'active' ? 'نشط' : 'مؤرشف'}
                  </span>
                </div>
                {ex.venue && <p className="text-xs text-gray-500 mb-2">المكان: {ex.venue}</p>}
                {(ex.start_date || ex.end_date) && (
                  <p className="text-xs text-gray-500 mb-3">
                    {ex.start_date && format(new Date(ex.start_date), 'dd/MM/yyyy')}
                    {ex.start_date && ex.end_date && ' — '}
                    {ex.end_date && format(new Date(ex.end_date), 'dd/MM/yyyy')}
                  </p>
                )}
                {ex.organizer && <p className="text-xs text-gray-500 mb-3">المنظم: {ex.organizer}</p>}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(ex)} className="flex-1 btn-secondary text-xs py-1.5 justify-center">
                    <Edit2 className="w-3 h-3" /> تعديل
                  </button>
                  <button onClick={() => handleArchive(ex)} className="flex-1 btn-secondary text-xs py-1.5 justify-center">
                    <Archive className="w-3 h-3" />
                    {ex.status === 'active' ? 'أرشفة' : 'تفعيل'}
                  </button>
                  <button onClick={() => setDeleteId(ex.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'تعديل معرض' : 'إضافة معرض جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">اسم المعرض *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="اسم المعرض" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">الدولة</label>
                  <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="input" placeholder="الدولة" />
                </div>
                <div>
                  <label className="label">المدينة</label>
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input" placeholder="المدينة" />
                </div>
                <div>
                  <label className="label">المكان</label>
                  <input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} className="input" placeholder="قاعة أو مركز..." />
                </div>
                <div>
                  <label className="label">المنظم</label>
                  <input value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} className="input" placeholder="اسم المنظم" />
                </div>
                <div>
                  <label className="label">تاريخ البداية</label>
                  <input value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="input" type="date" />
                </div>
                <div>
                  <label className="label">تاريخ النهاية</label>
                  <input value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input" type="date" />
                </div>
              </div>
              <div>
                <label className="label">الوصف</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input h-20 resize-none" placeholder="وصف المعرض..." />
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
            <p className="text-gray-600 text-sm mb-6">هل أنت متأكد من حذف هذا المعرض؟</p>
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
