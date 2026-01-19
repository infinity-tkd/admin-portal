import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';

export const Dashboard: React.FC = () => {
  const { students, attendance, payments, loading } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading && students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="relative">
          <div className="h-16 w-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center font-black text-accent text-xs">∞</div>
        </div>
        <p className="font-display font-black text-slate-400 uppercase tracking-widest text-[10px]">Syncing Dojo Data</p>
      </div>
    );
  }

  const stats = {
    total: students.length,
    blackBelts: students.filter(s => (s.currentBelt || '').toLowerCase().includes('black')).length,
    eligible: students.filter(s => s.eligibleForTest).length,
    scholarships: students.filter(s => s.scholarship).length
  };

  const StatCard = ({ title, value, delay, icon, color }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group relative p-4 sm:p-5 rounded-lg bg-white border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-500"
    >
      <div className="relative z-10 flex items-center space-x-4">
        <div className={`h-10 w-10 rounded bg-slate-50 flex items-center justify-center ${color} transition-all duration-500`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' })}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg sm:text-xl font-black font-display text-slate-900 tracking-tight leading-none">{value}</h3>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* HERO STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Roster"
          value={stats.total}
          delay={0.1}
          color="text-accent"
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard
          title="Mastery Levels"
          value={stats.blackBelts}
          delay={0.2}
          color="text-primary"
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Promotion Ready"
          value={stats.eligible}
          delay={0.3}
          color="text-success"
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          title="Funded Talents"
          value={stats.scholarships}
          delay={0.4}
          color="text-orange-500"
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: ACTIVITY & BIRTHDAYS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QUICK ACTIONS BENTO BOX */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black font-display text-slate-900 tracking-tight leading-none uppercase">Command Center</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Register', sub: 'Add Student', icon: '👤+', to: '/students', color: 'hover:bg-slate-50 text-primary border-slate-100' },
                  { label: 'Check-in', sub: 'Attendance', icon: '📅', to: '/attendance', color: 'hover:bg-slate-50 text-primary border-slate-100' },
                  { label: 'Economy', sub: 'Payments', icon: '💰', to: '/payments', color: 'hover:bg-slate-50 text-primary border-slate-100' },
                  { label: 'Schedules', sub: 'Events', icon: '🎪', to: '/events', color: 'hover:bg-slate-50 text-primary border-slate-100' },
                ].map((action, i) => (
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    key={i}
                    onClick={() => navigate(action.to)}
                    className={`group p-4 sm:p-5 rounded border ${action.color} transition-all duration-300 text-left`}
                  >
                    <div className="text-xl mb-3">{action.icon}</div>
                    <div className="font-black text-[11px] uppercase tracking-widest">{action.label}</div>
                    <div className="text-[8px] font-black opacity-40 uppercase tracking-widest mt-1">{action.sub}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* BIRTHDAY FEED */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="bg-primary p-6 rounded-lg text-white shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 blur-[60px]" />
              <div className="relative z-10 flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black font-display tracking-tight leading-none uppercase">Celebrations</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {new Date().toLocaleString('default', { month: 'long' })} Birthdays
                  </p>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-accent bg-accent/10 px-3 py-1.5 rounded border border-accent/20">Active</span>
              </div>

              <div className="space-y-2">
                {students
                  .filter(s => {
                    if (!s.dob) return false;
                    const dob = new Date(s.dob);
                    const today = new Date();
                    return dob.getMonth() === today.getMonth();
                  })
                  .sort((a, b) => {
                    const d1 = new Date(a.dob).getDate();
                    const d2 = new Date(b.dob).getDate();
                    return d1 - d2;
                  })
                  .slice(0, 4).map((s, i) => (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                      key={s.id}
                      className="flex items-center justify-between p-3 sm:p-3.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                      onClick={() => navigate('/students')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded bg-accent text-white flex items-center justify-center font-black text-xs shadow-lg group-hover:rotate-3 transition-transform">
                          {s.englishName.charAt(0)}
                        </div>
                        <div>
                          <span className="block font-black text-[11px] uppercase tracking-widest leading-none">{s.englishName}</span>
                          <span className="block text-[9px] text-slate-400 font-bold mt-0.5 font-display">{s.khmerName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-black text-accent leading-none">{formatDate(s.dob)?.split('-').slice(0, 2).join(' / ')}</span>
                        <span className="block text-[7px] text-slate-500 uppercase font-black tracking-widest mt-1">Run: {new Date(s.dob).getDate()}</span>
                      </div>
                    </motion.div>
                  ))}

                {students.filter(s => s.dob && new Date(s.dob).getMonth() === new Date().getMonth()).length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-[10px] uppercase font-black tracking-widest">
                    No birthdays this month
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* RECENT ACTIVITY / NOTIFICATIONS */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black font-display text-slate-900 tracking-tight leading-none uppercase">Notifications</h3>
              <button className="text-[9px] font-black text-accent uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {[...payments, ...attendance as any[]].map(item => ({
                ...item,
                type: item.amount ? 'Payment' : 'Attendance',
                timestamp: new Date(item.date).getTime()
              }))
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5)
                .map((activity, i) => (
                  <div key={i} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className={`h-8 w-8 rounded flex items-center justify-center text-sm ${activity.type === 'Payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {activity.type === 'Payment' ? '💰' : '📅'}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-slate-900">
                        <span className="font-black">{activity.studentName}</span>
                        {activity.type === 'Payment' ? ` paid $${activity.amount}` : ` checked in`}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{formatDate(activity.date)} • {activity.type}</p>
                    </div>
                  </div>
                ))}
              {(!payments.length && !attendance.length) && (
                <div className="text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-widest">No recent activity</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: PROFILE */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm h-full"
          >
            <div className="text-center">
              <div className="h-24 w-24 rounded-full bg-slate-100 mx-auto mb-4 overflow-hidden border-4 border-white shadow-lg relative">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary text-white text-3xl font-black">{user?.name?.charAt(0)}</div>
                )}
                <div className="absolute bottom-1 right-3 h-4 w-4 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <h3 className="text-lg font-black text-slate-900">{user?.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{user?.role?.replace('_', ' ')}</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[18px] font-black text-slate-900 leading-none">{students.length}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Students</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[18px] font-black text-slate-900 leading-none">{payments.length}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Payments</p>
                </div>
              </div>

              <button className="w-full py-3 bg-primary text-white rounded-lg font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-slate-900 transition-all">
                Edit Profile
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">System Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Database</span>
                  <span className="flex items-center text-emerald-600 font-bold text-[10px] uppercase tracking-widest"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />Live</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Sync</span>
                  <span className="font-bold text-slate-900 text-[10px]">Just now</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Version</span>
                  <span className="font-bold text-slate-900 text-[10px]">v2.4.0</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};