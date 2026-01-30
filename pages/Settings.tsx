import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, AdminUser } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useData } from '../context/DataContext';

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'team' | 'students'>('team');
    const queryClient = useQueryClient();
    const { users, studentLogins, loading, refreshUsers, refreshAll } = useData();
    const usersLoading = loading; // Map global loading to component loading
    const studentsLoading = loading; // Same for students

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [userForm, setUserForm] = useState<Partial<AdminUser>>({});
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [deleteUserTarget, setDeleteUserTarget] = useState<string | null>(null);

    const handleEditUser = (user: AdminUser) => {
        setEditingUser(user);
        setUserForm({ ...user, password: '' });
        setIsUserModalOpen(true);
    };

    const handleNewUser = () => {
        setEditingUser(null);
        setUserForm({ role: 'coach', avatarUrl: '' });
        setIsUserModalOpen(true);
    };

    const saveUserMutation = useMutation({
        mutationFn: api.saveUser,
        onSuccess: () => {
            refreshUsers(); // Use context refresh
            setIsUserModalOpen(false);
            setIsSavingUser(false);
        }
    });

    const handleSaveUser = () => {
        if (!userForm.username || !userForm.displayName || (!editingUser && !userForm.password)) {
            alert("Please fill in required fields.");
            return;
        }
        setIsSavingUser(true);
        saveUserMutation.mutate(userForm as AdminUser);
    };

    const deleteUserMutation = useMutation({
        mutationFn: api.deleteUser,
        onSuccess: () => {
            refreshUsers();
            setDeleteUserTarget(null);
        }
    });

    // --- STUDENT ACCESS ---
    // Removed local query, using global data
    // const { data: studentLogins, isLoading: studentsLoading } = useQuery(...)

    const [studentPassTarget, setStudentPassTarget] = useState<{ id: string, name?: string } | null>(null);
    const [newStudentPass, setNewStudentPass] = useState('');
    const [isSavingPass, setIsSavingPass] = useState(false);

    const saveStudentPassMutation = useMutation({
        mutationFn: ({ id, pass }: { id: string, pass: string }) => api.updateStudentPassword(id, pass),
        onSuccess: () => {
            refreshAll(); // Reload master data to get updated login status
            setStudentPassTarget(null);
            setNewStudentPass('');
            setIsSavingPass(false);
        }
    });

    const activeStudentsCount = studentLogins?.filter(s => s.hasPassword).length || 0;
    const totalStudentsCount = studentLogins?.length || 0;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black font-display text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="uppercase">System Control</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 text-xs">Manage team permissions and student portal access.</p>
                </div>

                {/* MODERN TABS */}
                <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex gap-1">
                    {[
                        { id: 'team', label: 'Team', icon: '👥' },
                        { id: 'students', label: 'Student Access', icon: '🔐' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-md shadow-primary/30'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {activeTab === 'team' && (
                    <motion.div
                        key="team"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-between items-center px-1">
                            <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest text-[10px]">Team Roster</h2>
                            <button
                                onClick={handleNewUser}
                                className="bg-primary text-white px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                <span>Add Member</span>
                            </button>
                        </div>

                        {usersLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-48 bg-slate-100 rounded-md animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {users?.map((user, idx) => (
                                    <motion.div
                                        key={user.username}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex items-start justify-between mb-6">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-md bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-400 uppercase overflow-hidden">
                                                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.username[0]}
                                                </div>
                                                <div className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditUser(user)}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-slate-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                {user.username !== 'admin' && (
                                                    <button
                                                        onClick={() => setDeleteUserTarget(user.username)}
                                                        className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="font-bold text-lg text-slate-900">{user.displayName}</h3>
                                            <p className="text-xs font-mono text-slate-400">@{user.username}</p>
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
                                                ${user.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                                                    user.role === 'coach' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}
                                            `}>
                                                {user.role.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Active</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'students' && (
                    <motion.div
                        key="students"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* STATS HEADER */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-md border border-slate-100 shadow-sm">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Total Students</p>
                                <p className="text-2xl font-black font-display text-slate-900">{totalStudentsCount}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] uppercase font-black text-emerald-400 tracking-widest mb-1">Active Accounts</p>
                                <p className="text-2xl font-black font-display text-emerald-600">{activeStudentsCount}</p>
                            </div>
                        </div>

                        {studentsLoading ? (
                            <div className="bg-white rounded-xl h-64 animate-pulse" />
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 border-b border-slate-100">
                                            <tr>
                                                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Student ID</th>
                                                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Access Status</th>
                                                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Security</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {studentLogins?.map(login => (
                                                <tr key={login.studentId} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="px-8 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors">{login.name || 'Unknown Student'}</span>
                                                            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">{login.studentId}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        {login.hasPassword ? (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                                PORTAL ACTIVE
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                                NO ACCESS
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <button
                                                            onClick={() => setStudentPassTarget({ id: login.studentId, name: login.name })}
                                                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95 ${login.hasPassword
                                                                ? 'text-slate-500 hover:text-primary bg-white border border-slate-200 hover:border-primary/30'
                                                                : 'text-white bg-primary hover:bg-primary/90 shadow-primary/20'
                                                                }`}
                                                        >
                                                            {login.hasPassword ? 'Reset Password' : 'Generate Password'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* USER EDIT MODAL - GLASS STYLE */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 backdrop-blur-xl">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingUser ? 'Edit Member Config' : 'New Team Member'}</h3>
                            <p className="text-xs text-slate-500 mt-1">Configure access rights and credentials.</p>
                        </div>

                        <div className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
                                <input
                                    value={userForm.username || ''}
                                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                    disabled={!!editingUser}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:bg-slate-100 transition-all"
                                    placeholder="e.g. coach_john"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
                                <input
                                    value={userForm.displayName || ''}
                                    onChange={e => setUserForm({ ...userForm, displayName: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    {editingUser ? 'New Password (Optional)' : 'Secure Password'}
                                </label>
                                <input
                                    type="password"
                                    value={userForm.password || ''}
                                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                    placeholder={editingUser ? 'Leave blank to keep current' : 'Required'}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">System Role</label>
                                <div className="relative">
                                    <select
                                        value={userForm.role}
                                        onChange={e => setUserForm({ ...userForm, role: e.target.value as any })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none transition-all"
                                    >
                                        <option value="admin">Administrator (Full Access)</option>
                                        <option value="coach">Coach (Limited Access)</option>
                                        <option value="assistant_coach">Assistant Coach (ReadOnly)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="flex-1 px-4 py-2.5 rounded-md text-sm font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveUser}
                                disabled={isSavingUser}
                                className="flex-1 bg-primary text-white px-4 py-2.5 rounded-md text-sm font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isSavingUser ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* DELETE CONFIRMATION */}
            <ConfirmationModal
                isOpen={!!deleteUserTarget}
                title="Remove Team Member?"
                message={<span className="block mt-2 text-slate-600">Are you sure you want to remove access for user <b className="text-slate-900">{deleteUserTarget}</b>? This cannot be undone.</span>}
                confirmText="Remove User"
                isDestructive
                onConfirm={() => deleteUserMutation.mutate(deleteUserTarget!)}
                onClose={() => setDeleteUserTarget(null)}
            />
            {/* STUDENT PASS MODAL */}
            {studentPassTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 space-y-6 text-center"
                    >
                        <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600 mb-2 shadow-sm border border-blue-100">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 19l-1 1-1-1-1 1-1-1-1 1H6a2 2 0 01-2-2v-4b6 6 0 1110.99 0V17l.5 1 .5-1" /></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black font-display text-slate-900 tracking-tight">Set Access Key</h3>
                            <p className="text-sm text-slate-500 mt-2 font-medium">
                                Create a secure portal password for <br /><b className="text-slate-900">{studentPassTarget.name || studentPassTarget.id}</b>.
                            </p>
                        </div>

                        <input
                            type="text"
                            value={newStudentPass}
                            onChange={e => setNewStudentPass(e.target.value)}
                            placeholder="Enter password..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-lg font-bold text-center focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all tracking-wide text-slate-900 placeholder:text-slate-300"
                        />

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setStudentPassTarget(null)}
                                className="flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!newStudentPass) return;
                                    setIsSavingPass(true);
                                    saveStudentPassMutation.mutate({ id: studentPassTarget.id, pass: newStudentPass });
                                }}
                                disabled={!newStudentPass || isSavingPass}
                                className="flex-1 bg-primary text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-70 active:scale-95"
                            >
                                {isSavingPass ? 'Saving...' : 'Set Password'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
