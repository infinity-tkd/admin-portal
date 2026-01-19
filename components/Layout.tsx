import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../hooks/usePWA';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
interface LayoutProps {
  children: React.ReactNode;
}

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavIcon: React.FC<SidebarItemProps> = ({ to, icon, label, isActive, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex flex-col items-center justify-center space-y-0.5 relative transition-all duration-300 ${isActive ? 'text-accent' : 'text-slate-400'
      }`}
  >
    <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-accent/10 scale-105' : ''}`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' })}
    </div>
    <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    {isActive && (
      <motion.div
        layoutId="activePill"
        className="absolute -top-3 w-6 h-0.5 bg-accent rounded-full"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
  </Link>
);

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, isActive, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`relative flex items-center space-x-3.5 px-5 py-3.5 rounded-lg transition-all duration-300 group font-bold tracking-tight ${isActive
      ? 'text-white bg-white/10'
      : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
  >
    <div className={`transition-all duration-300 ${isActive ? 'scale-105 text-accent' : 'group-hover:scale-105'}`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' })}
    </div>
    <span className="text-[11px] uppercase tracking-widest leading-none">{label}</span>
    {isActive && (
      <motion.div
        layoutId="sidebarActivePill"
        className="absolute left-0 w-1 h-5 bg-accent rounded-r"
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
  </Link>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isInstallable, installPWA } = usePWA();
  const { isFetching, isError } = useData();

  const navItems = [
    {
      path: '/', label: 'Dash', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      path: '/students', label: 'Students', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      path: '/attendance', label: 'Check-in', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      path: '/payments', label: 'Economy', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const secondaryItems = [
    {
      path: '/events', label: 'Events', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      path: '/achievements', label: 'Awards', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
  ];

  const currentTitle = [...navItems, ...secondaryItems].find(i => i.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans overflow-hidden">
      {/* SIDEBAR - DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-primary border-r border-white/5 fixed h-full z-20 transition-all duration-500 shadow-2xl">
        <div className="p-8 pb-10">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-accent rounded flex items-center justify-center text-white font-black text-lg shadow-lg shadow-accent/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500 pointer-events-none">
              ∞
            </div>
            <div>
              <h2 className="text-lg font-black font-display text-white tracking-tight leading-none uppercase">Infinity</h2>
              <p className="text-[8px] uppercase font-black tracking-[0.2em] text-accent/80 mt-1">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-none">
          <p className="text-[8px] uppercase font-black text-slate-400 px-4 mb-3 tracking-[0.2em]">Principal</p>
          {navItems.map((item) => (
            <SidebarItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.path}
            />
          ))}

          <div className="pt-8 mb-2">
            <p className="text-[8px] uppercase font-black text-slate-400 px-4 mb-3 tracking-[0.2em]">Academy</p>
            {secondaryItems.map((item) => (
              <SidebarItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>
        </nav>

        <div className="p-4 space-y-4">
          {isInstallable && (
            <button
              onClick={installPWA}
              className="w-full bg-accent text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all hover:bg-accentHover active:scale-95 shadow-lg shadow-accent/10"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="text-[10px] uppercase tracking-widest">Install App</span>
            </button>
          )}

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 group">
            <div className="flex items-center space-x-3 transition-transform duration-300 group-hover:translate-x-0.5">
              <div className="h-8 w-8 rounded bg-accent text-white flex items-center justify-center font-black shadow-lg shadow-accent/20 text-xs">
                {user?.name.charAt(0)}
              </div>
              <div>
                <p className="text-[11px] font-bold text-white leading-none">{user?.name}</p>
                <p className="text-[7px] text-slate-400 uppercase font-black tracking-wider mt-1.5">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <button onClick={() => setIsLogoutModalOpen(true)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER - CLEAN - SAFE AREA AWARE */}
      <header className="lg:hidden fixed top-0 w-full bg-white/95 backdrop-blur-md z-30 border-b border-slate-100 px-4 sm:px-6 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3.5 flex items-center justify-between pointer-events-auto transition-all">
        <div className="flex items-center space-x-3">
          <div className="h-7 w-7 bg-primary rounded flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary/20 transform -rotate-3">∞</div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display font-black text-sm text-slate-900 tracking-tight uppercase">{currentTitle}</h1>
            {/* MOBILE SYNC INDICATOR */}
            <div
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${isError ? 'bg-red-500' :
                isFetching ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-emerald-500/30'
                }`}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <button onClick={() => setIsLogoutModalOpen(true)} className="h-8 w-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm active:scale-95 transition-all text-[10px] font-bold">
            {user?.name.charAt(0)}
          </button>
        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-white rounded-t-2xl shadow-2xl p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] z-50 border-t border-slate-100 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
              <p className="text-[9px] uppercase font-black text-slate-400 mb-4 tracking-[0.2em] px-2">Academy</p>
              <div className="grid grid-cols-2 gap-3">
                {secondaryItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${location.pathname === item.path
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                      : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                      }`}
                  >
                    <div className="mb-2 scale-110">{item.icon}</div>
                    <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                  </Link>
                ))}
              </div>
              <button
                onClick={installPWA}
                className={`w-full mt-6 bg-accent/10 text-accent font-bold py-4 rounded-xl flex items-center justify-center space-x-2 transition-all hover:bg-accent hover:text-white border border-accent/20 ${isInstallable ? 'flex' : 'hidden'}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="text-[10px] uppercase tracking-widest">Install Application</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAV - REFINED & SAFE AREA */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2 w-full max-w-md mx-auto">
          {navItems.map(item => (
            <NavIcon
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.path}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors h-full w-16 ${isMobileMenuOpen ? 'text-primary' : 'text-slate-400'}`}
          >
            <div className={`p-0.5 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : 'rotate-0'}`}>
              {isMobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider">{isMobileMenuOpen ? 'Close' : 'More'}</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 lg:ml-64 relative overflow-y-auto overflow-x-hidden h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8 pt-24 sm:pt-28 lg:pt-16 min-h-full pb-32 lg:pb-16">
          {/* DESKTOP HEADER ACTION BAR */}
          <header className="hidden lg:flex justify-between items-end mb-12">
            <div>
              <p className="text-[8px] uppercase font-black tracking-[0.4em] text-accent mb-2.5">Portal Environment</p>
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-black text-slate-900 font-display tracking-tight leading-tight uppercase">{currentTitle}</h1>

                {/* SYNC INDICATOR */}
                <div
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${isError ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' :
                    isFetching ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.6)]' : 'bg-emerald-500/30'
                    }`}
                  title={isError ? "Sync Failed" : isFetching ? "Syncing..." : "Live"}
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex -space-x-1.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-7 w-7 rounded border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                    <img className="grayscale opacity-80" src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                  </div>
                ))}
                <div className="h-7 w-7 rounded border-2 border-white bg-primary text-white flex items-center justify-center text-[7px] font-black shadow-sm">+42</div>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <button className="bg-white p-2 rounded-lg border border-slate-100 text-slate-400 hover:text-accent hover:border-accent transition-all duration-300 shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </button>
            </div>
          </header>


          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* LOGOUT MODAL */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsLogoutModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-accent to-accent-light" />
              <div className="h-14 w-14 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-5 text-red-500 transform rotate-6">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <h3 className="text-xl font-black font-display text-slate-900 mb-1 tracking-tight">Ending Session?</h3>
              <p className="text-slate-400 text-xs font-medium mb-6">Securely sign out of your admin dashboard.</p>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={logout}
                  className="w-full py-4 text-white font-black rounded-2xl bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20 active:scale-95 transition-all text-sm"
                >
                  Confirm Sign Out
                </button>
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="w-full py-4 text-slate-500 font-bold rounded-2xl bg-white hover:bg-slate-50 transition-colors text-sm"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

