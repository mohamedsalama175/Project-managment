import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

export const SignInView: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    const res = await login(email.trim(), password, true);
    if (!res.success) {
      setLocalError(res.error || 'Invalid email or password. Please check your credentials.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* Subtle Dotted World Map Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Soft Radial Gradient Glowing Blurs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Top-Right Language / Locale Selector (US Flag) */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-200/80 flex items-center justify-center hover:shadow transition-all overflow-hidden"
          title="Language: English (US)"
        >
          <span className="text-base leading-none">🇺🇸</span>
        </button>
      </div>

      {/* Floating Centered Login Card */}
      <div className="relative z-10 w-full max-w-[440px] mx-4 p-8 sm:p-10 bg-white rounded-2xl shadow-[0_12px_45px_-10px_rgba(15,23,42,0.08)] border border-slate-100/80 animate-in fade-in zoom-in-95 duration-200">
        {/* CLAYGANTT Brand & Enterprise Badge */}
        <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/30">
              CG
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              CLAYGANTT
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
            Enterprise Workload Matrix
          </span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
            Sign In
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 font-normal">
            Enter your email and password to login
          </p>
        </div>

        {(localError || error) && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium animate-in fade-in duration-150">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoFocus
              placeholder="Enter Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (localError) setLocalError(null);
              }}
              className="w-full text-xs sm:text-[13px] px-3.5 py-3 rounded-xl bg-white border border-slate-200/90 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError(null);
                }}
                className="w-full text-xs sm:text-[13px] pl-3.5 pr-10 py-3 rounded-xl bg-white border border-slate-200/90 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs sm:text-[13px] font-semibold shadow-md shadow-emerald-600/25 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
