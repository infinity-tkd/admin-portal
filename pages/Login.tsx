import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../hooks/usePWA';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, installPWA } = usePWA();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(username, password, rememberMe);
    if (!success) setError('The gates are locked. Verify credentials.');
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* AMBIENT BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/10 blur-[120px] rounded-full"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] z-10"
      >
        <div className="bg-white rounded-md p-8 md:p-10 shadow-2xl border border-white/10 relative overflow-hidden group">
          <div className="relative z-10">
            <header className="mb-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="h-12 w-12 bg-primary rounded flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-primary/20 rotate-3">
                  ∞
                </div>
              </div>
              <h1 className="text-2xl font-black font-display text-slate-900 tracking-tight leading-tight uppercase mb-2">
                Infinity Admin
              </h1>
              <div className="h-1 w-12 bg-accent mx-auto rounded-full mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[8px]">Authentication Portal</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Guardian Identity</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-bold text-slate-900 text-sm placeholder:text-slate-300 shadow-sm"
                  placeholder="Username"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Passcode</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-bold text-slate-900 text-sm placeholder:text-slate-300 shadow-sm pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-accent transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543-7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-accent border-accent text-white' : 'bg-slate-50 border-slate-300 hover:border-accent'}`}
                >
                  {rememberMe && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </button>
                <label onClick={() => setRememberMe(!rememberMe)} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700">Save Login for next time</label>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-red-50 border border-red-100 rounded-md flex items-center space-x-3 text-red-500 text-[9px] font-black uppercase tracking-widest"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-white py-4 rounded-md font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-primary/20 hover:bg-slate-900 active:scale-95 transition-all outline-none disabled:opacity-50"
              >
                {isLoading ? 'Decrypting...' : 'Enter System'}
              </button>
            </form>

            {isInstallable && (
              <button
                onClick={installPWA}
                className="mt-8 w-full flex items-center justify-center space-x-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-accent transition-colors py-3 border-t border-slate-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span>Install Admin App</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};