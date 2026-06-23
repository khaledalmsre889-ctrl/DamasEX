import React, { useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, Key, X, Check } from 'lucide-react';
import { format } from 'date-fns';

type EmployeeForm = {
  name: string;
  username: string;
  email: string;
  phone: string;
  department: string;
  password: string;
  status: 'active' | 'inactive';
};

const emptyForm: EmployeeForm = {
  name: '', username: '', email: '', phone: '', department: '', password: '', status: 'active',
};

const DEPARTMENTS = ['المبيعات', 'التسويق', 'الهندسة', 'الإدارة', 'خدمة العملاء', 'المشاريع', 'أخرى'];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employee')
      .order('created_at', { ascending: false });
    setEmployees(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(emp: Profile) {
    setEditId(emp.id);
    setForm({
      name: emp.name,
      username: emp.username,
      email: emp.email ?? '',
      phone: emp.phone ?? '',
      department: emp.department ?? '',
      password: '',
      status: emp.status,
    });
    setError('');
    setShowModal(true);
  }

  async function callManageUsers(body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error ?? 'حدث خطأ');
    return json;
  }

  async function handleSave() {
    if (!form.name || !form.username) {
      setError('الاسم واسم المستخدم مطلوبان');
      return;
    }
    if (!editId && !form.password) {
      setError('كلمة المرور مطلوبة للموظف الجديد');
      return;
    }
    setSaving(true);
    setError('');

    try {
      if (!editId) {
        await callManageUsers({
          action: 'create',
          name: form.name,
          username: form.username,
          email: form.email,
          password: form.password,
          phone: form.phone,
          department: form.department,
          status: form.status,
        });
      } else {
        const { error } = await supabase.from('profiles').update({
          name: form.name,
          username: form.username,
          email: form.email,
          phone: form.phone,
          department: form.department,
          status: form.status,
          updated_at: new Date().toISOString(),
        }).eq('id', editId);
        if (error) throw new Error(error.message);
      }

      setShowModal(false);
      loadEmployees();
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await callManageUsers({ action: 'delete', userId: id });
    setDeleteId(null);
    loadEmployees();
  }

  async function handleToggleStatus(emp: Profile) {
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', emp.id);
    loadEmployees();
  }

  async function handleResetPassword() {
    if (!newPassword || !resetPasswordId) return;
    try {
      await callManageUsers({ action: 'reset-password', userId: resetPasswordId, password: newPassword });
    } catch (e) { /* silent */ }
    setResetPasswordId(null);
    setNewPassword('');
  }

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.username.toLowerCase().includes(search.toLowerCase()) ||
    (e.department ?? '').includes(search)
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الموظفين</h1>
          <p className="text-gray-500 text-sm mt-0.5">{employees.length} موظف مسجل</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          إضافة موظف
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pr-9"
              placeholder="بحث بالاسم أو المستخدم أو القسم..."
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#0F9D58] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>لا يوجد موظفون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الاسم</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">اسم المستخدم</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">القسم</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الهاتف</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الحالة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">تاريخ الإضافة</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className="table-row">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#0F9D58] to-[#34A853] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {emp.name[0]}
                        </div>
                        <span className="font-medium text-gray-900">{emp.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{emp.username}</td>
                    <td className="py-3 px-4">
                      {emp.department ? (
                        <span className="badge-green">{emp.department}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{emp.phone || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={emp.status === 'active' ? 'badge-green' : 'badge-red'}>
                        {emp.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {format(new Date(emp.created_at), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-500 hover:text-[#0F9D58] hover:bg-green-50 rounded-lg transition-colors" title="تعديل">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(emp)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تغيير الحالة">
                          {emp.status === 'active' ? <ToggleRight className="w-4 h-4 text-[#0F9D58]" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { setResetPasswordId(emp.id); setNewPassword(''); }} className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="إعادة تعيين كلمة المرور">
                          <Key className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(emp.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl modal-content">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editId ? 'تعديل موظف' : 'إضافة موظف جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">الاسم الكامل *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="اسم الموظف" />
                </div>
                <div>
                  <label className="label">اسم المستخدم *</label>
                  <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="input" placeholder="username" dir="ltr" />
                </div>
                <div>
                  <label className="label">البريد الإلكتروني</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" placeholder="email@example.com" dir="ltr" type="email" />
                </div>
                <div>
                  <label className="label">رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" placeholder="05xxxxxxxx" />
                </div>
                <div>
                  <label className="label">القسم</label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="input">
                    <option value="">اختر القسم</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">الحالة</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className="input">
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>
              {!editId && (
                <div>
                  <label className="label">كلمة المرور *</label>
                  <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input" placeholder="أدخل كلمة مرور قوية" type="password" dir="ltr" />
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? 'حفظ التعديلات' : 'إضافة الموظف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl modal-content p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 text-sm mb-6">هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1 justify-center">حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl modal-content p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">إعادة تعيين كلمة المرور</h3>
            <div>
              <label className="label">كلمة المرور الجديدة</label>
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" type="password" placeholder="أدخل كلمة المرور الجديدة" dir="ltr" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setResetPasswordId(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
              <button onClick={handleResetPassword} className="btn-primary flex-1 justify-center">
                <Key className="w-4 h-4" />
                تعيين
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
