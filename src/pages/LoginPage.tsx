import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, Leaf } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await signIn(username, password);
    if (error) {
      setError(error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F9D58] via-[#34A853] to-[#66BB6A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#0F9D58] to-[#34A853] rounded-2xl mb-4 shadow-lg">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Green Exhibition CRM</h1>
            <p className="text-gray-500 text-sm mt-1">نظام إدارة زيارات المعارض</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input"
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 text-center">
              <p className="font-semibold text-gray-700 mb-1">بيانات الدخول الافتراضية</p>
              <p>المستخدم: <span className="font-mono font-bold text-[#0F9D58]">admin</span></p>
              <p>كلمة المرور: <span className="font-mono font-bold text-[#0F9D58]">admin123</span></p>
            </div>
          </div>
        </div>

        <p className="text-center text-white/70 text-sm mt-6">
          © 2024 Green Exhibition CRM. جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
