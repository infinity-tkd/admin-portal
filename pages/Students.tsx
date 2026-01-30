import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Student } from '../types';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../components/Avatar';

import { useQueryClient } from '@tanstack/react-query';

export const Students: React.FC = () => {
    // Principal Data Source
    const { students: globalStudents, globalLoading, refreshStudents } = useData();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Visual & Logic State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBelt, setSelectedBelt] = useState('All');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
    const [saving, setSaving] = useState(false);
    const [showReadyForTest, setShowReadyForTest] = useState(false);

    const loading = globalLoading && globalStudents.length === 0;

    // Memoized Filtering Logic for Performance
    const filteredStudents = React.useMemo(() => {
        const term = searchTerm.toLowerCase();
        return (globalStudents || []).filter((s) => {
            const matchesTerm = (s.englishName || '').toLowerCase().includes(term) ||
                (s.khmerName || '').includes(term) ||
                (s.id || '').toLowerCase().includes(term);
            const matchesBelt = selectedBelt === 'All' || (s.currentBelt || '').toLowerCase().includes(selectedBelt.toLowerCase());
            const matchesReady = !showReadyForTest || s.eligibleForTest;
            return matchesTerm && matchesBelt && matchesReady;
        });
    }, [searchTerm, selectedBelt, showReadyForTest, globalStudents]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        // Optimistic Update
        queryClient.setQueryData(['students'], (old: Student[] | undefined) => {
            const list = old || [];
            const s = currentStudent as Student;
            if (s.id && !String(s.id).includes('NEW')) {
                return list.map(item => item.id === s.id ? s : item);
            }
            return [...list, { ...s, id: 'temp-' + Date.now() }];
        });

        try {
            await api.saveStudent(currentStudent as Student);
            await refreshStudents();
            showToast("Student profile updated successfully.", "success");
            setIsEditModalOpen(false);
            setIsDetailOpen(true);
        } catch (error) {
            console.error("Transmission failed:", error);
            showToast("Failed to save student. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    const belts = ['All', 'White', 'Yellow', 'Green', 'Blue', 'Brown', 'Red', 'Black'];

    const BeltBadge = React.memo(({ belt }: { belt: string }) => {
        const b = (belt || '').toLowerCase();
        let colors = "bg-slate-100 text-slate-500 border-slate-200";
        if (b.includes('black')) colors = "bg-slate-900 text-white border-slate-700 shadow-lg shadow-black/10";
        else if (b.includes('red')) colors = "bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/10";
        else if (b.includes('brown')) colors = "bg-amber-800 text-white border-amber-700 shadow-lg shadow-amber-800/10";
        else if (b.includes('blue')) colors = "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/10";
        else if (b.includes('green')) colors = "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/10";
        else if (b.includes('yellow')) colors = "bg-yellow-400 text-slate-900 border-yellow-300 shadow-lg shadow-yellow-400/10";

        return (
            <span className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border transition-all ${colors}`}>
                {belt}
            </span>
        );
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <div className="relative">
                <div className="h-16 w-16 border-[5px] border-accent/20 border-t-accent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center font-black text-accent text-lg">∞</div>
            </div>
            <div className="text-center">
                <p className="font-display font-black text-slate-900 text-xl tracking-tight uppercase">Syncing Roster</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[.2em] mt-2">Connecting to Cloud Dojang</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 pb-32">
            <section className="space-y-8">
                <div className="max-w-3xl">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-3 ml-1">Warrior Search</p>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                            <svg className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Name, ID or Khmer Name..."
                            className="block w-full pl-12 sm:pl-14 pr-6 sm:pr-8 py-4 sm:py-5 bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 shadow-sm text-base"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-3">
                            <div className="h-[1px] w-8 bg-slate-200" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Filter by Rank</p>
                        </div>

                        <button
                            onClick={() => setShowReadyForTest(!showReadyForTest)}
                            className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border transition-all ${showReadyForTest ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                        >
                            <div className={`h-2 w-2 rounded-full ${showReadyForTest ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
                            <span className="text-[9px] font-black uppercase tracking-widest">{showReadyForTest ? 'Ready Only' : 'Show Ready'}</span>
                        </button>
                    </div>
                    <div className="flex items-center space-x-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {belts.map((belt, i) => (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                key={belt}
                                onClick={() => setSelectedBelt(belt)}
                                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${selectedBelt === belt
                                    ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30 scale-105'
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                                    }`}
                            >
                                {belt}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </section>

            <div className="relative">
                <div className="hidden md:block bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 w-1/3">Identity</th>
                                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Rank</th>
                                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Badges</th>
                                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map((s) => (
                                <motion.tr
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    key={s.id}
                                    className="group hover:bg-slate-50/80 transition-all duration-300 cursor-pointer"
                                    onClick={() => { setCurrentStudent(s); setIsDetailOpen(true); }}
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center space-x-5">
                                            <div className="relative">
                                                <Avatar profilePictureId={s.profilePictureId} name={s.englishName} size="md" className="ring-4 ring-slate-100/50" />
                                                <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${s.eligibleForTest ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            </div>
                                            <div>
                                                <p className="text-base font-black text-slate-900 leading-none group-hover:text-primary transition-colors">{s.englishName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wide font-display">{s.khmerName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <BeltBadge belt={s.currentBelt} />
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-center space-x-2">
                                            {s.scholarship && (
                                                <span className="h-9 w-9 rounded-md bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shadow-sm" title="Scholarship">
                                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.827a1 1 0 00-.788 0L2.606 6A1 1 0 003 7.82V12a1 1 0 00.553.894l6 3a1 1 0 00.894 0l6-3a1 1 0 00.553-.894V7.82a1 1 0 00.394-1.82l-7-3zM7 10a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" /></svg>
                                                </span>
                                            )}
                                            {s.eligibleForTest && (
                                                <span className="h-9 w-9 rounded-md bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center shadow-sm" title="Ready for Test">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="h-9 w-9 rounded-md bg-slate-50 text-slate-300 group-hover:bg-primary group-hover:text-white transition-all duration-300 flex items-center justify-center ml-auto">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="md:hidden space-y-4">
                    {filteredStudents.map((s) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            key={s.id}
                            onClick={() => { setCurrentStudent(s); setIsDetailOpen(true); }}
                            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center space-x-3 sm:space-x-4 group"
                        >
                            <div className="relative">
                                <Avatar profilePictureId={s.profilePictureId} name={s.englishName} size="md" />
                                <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${s.eligibleForTest ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black font-display text-slate-900 text-sm leading-tight truncate">{s.englishName}</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider truncate">{s.khmerName}</p>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                                <BeltBadge belt={s.currentBelt} />
                                <div className="flex -space-x-1">
                                    {s.scholarship && <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center border border-white text-[10px]">💰</div>}
                                    {s.eligibleForTest && <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center border border-white text-[10px]">⚡</div>}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {isDetailOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center lg:p-12 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
                            onClick={() => setIsDetailOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="relative bg-white rounded-t-2xl lg:rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] lg:max-h-[90vh] overflow-hidden flex flex-col mt-auto lg:mt-0"
                        >
                            <header className="px-5 py-5 md:px-10 md:py-8 border-b border-slate-100 flex items-center justify-between bg-white relative z-10 pt-[calc(1rem+env(safe-area-inset-top))] lg:pt-8">
                                <div className="flex items-center space-x-4 md:space-x-6">
                                    <div className="relative">
                                        <Avatar profilePictureId={currentStudent.profilePictureId} name={currentStudent.englishName || ''} size="lg" className="ring-[6px] ring-slate-50 shadow-inner" />
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white shadow-sm ${currentStudent.eligibleForTest ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-black font-display text-slate-900 tracking-tight leading-none uppercase">{currentStudent.englishName}</h3>
                                        <div className="flex items-center space-x-2 mt-2.5">
                                            <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded uppercase tracking-widest">ID: {currentStudent.id}</span>
                                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentStudent.currentBelt} Rank</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailOpen(false)} className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all group active:scale-95">
                                    <svg className="h-5 w-5 md:h-6 md:w-6 transform group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-5 md:p-8 lg:p-12 space-y-8 md:space-y-12 scrollbar-none pb-32">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
                                    <div className="lg:col-span-2 space-y-8 md:space-y-12">
                                        <section className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-8 w-1 bg-primary rounded-full" />
                                                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900">Personal Profile</h4>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Read Only</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {[
                                                    { label: 'Full English Name', value: currentStudent.englishName, icon: '👤' },
                                                    { label: 'Khmer Name', value: currentStudent.khmerName, font: 'font-display', icon: '🇰🇭' },
                                                    { label: 'Gender Identity', value: currentStudent.gender, icon: '⚧' },
                                                    { label: 'Date of Birth', value: currentStudent.dob ? new Date(currentStudent.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—', icon: '📅' },
                                                    { label: 'Primary Phone', value: currentStudent.phone || '—', icon: '📱' },
                                                    { label: 'Email Address', value: currentStudent.email || '—', icon: '📧' },
                                                ].map((info) => (
                                                    <div key={info.label} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-primary/20 transition-colors group">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{info.label}</p>
                                                            <span className="text-xs opacity-40 group-hover:opacity-100 transition-opacity">{info.icon}</span>
                                                        </div>
                                                        <p className={`text-sm font-black text-slate-900 leading-tight ${info.font || ''}`}>{info.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-8 w-1 bg-blue-500 rounded-full" />
                                                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900">Biometrics</h4>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    { label: 'Height', value: currentStudent.height ? `${Number(currentStudent.height).toFixed(2)} cm` : '—', icon: '📏' },
                                                    { label: 'Weight', value: currentStudent.weight ? `${Number(currentStudent.weight).toFixed(2)} kg` : '—', icon: '⚖️' },
                                                ].map((bio) => (
                                                    <div key={bio.label} className="bg-blue-50/30 p-5 rounded-xl border border-blue-50/50 shadow-sm transition-colors group">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{bio.label}</p>
                                                            <span className="text-xs opacity-40 group-hover:opacity-100 transition-opacity">{bio.icon}</span>
                                                        </div>
                                                        <p className="text-sm font-black text-slate-900 leading-none">{bio.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="space-y-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-8 w-1 bg-amber-500 rounded-full" />
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900">Martial Journey</h4>
                                            </div>
                                            <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700" />
                                                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                                                    <div className="space-y-4">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Current Rank</p>
                                                        <BeltBadge belt={currentStudent.currentBelt || ''} />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Stripes / Level</p>
                                                        <div className="flex items-center space-x-2">
                                                            {[1, 2, 3, 4].map((s) => (
                                                                <div
                                                                    key={s}
                                                                    className={`h-8 w-8 rounded-md flex items-center justify-center text-[10px] font-black transition-all ${currentStudent.stripes === s ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-white/10 text-slate-500'}`}
                                                                >
                                                                    {s}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* RIGHT COLUMN: ACTION & HISTORY */}
                                    <div className="space-y-8 md:space-y-12">
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl">✏️</div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900">Edit Profile</h4>
                                                <p className="text-[10px] font-medium text-slate-400 max-w-[200px] mt-1">Update rank, biometrics, or documentation.</p>
                                            </div>
                                            <button
                                                onClick={() => { setIsDetailOpen(false); setIsEditModalOpen(true); }}
                                                className="w-full py-4 bg-slate-900 text-white rounded-lg font-black text-[10px] uppercase tracking-[.25em] hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 active:scale-95"
                                            >
                                                Edit Student
                                            </button>
                                        </div>

                                        {currentStudent.eSignId && (
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-6 w-1 bg-slate-200 rounded-full" />
                                                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">E-Sign Photo</h4>
                                                </div>
                                                <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden min-h-[120px]">
                                                    <img
                                                        src={`https://drive.google.com/thumbnail?id=${currentStudent.eSignId}&sz=s600`}
                                                        alt="e-sign"
                                                        className="max-h-24 object-contain opacity-80"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* EDIT MODAL */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center lg:p-12 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                            onClick={() => setIsEditModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 40 }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            className="relative bg-white rounded-t-2xl lg:rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] lg:max-h-[90vh] overflow-hidden flex flex-col mt-auto lg:mt-0"
                        >
                            <header className="px-5 py-5 md:px-8 md:py-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 backdrop-blur-xl sticky top-0 z-10">
                                <div>
                                    <p className="text-[9px] uppercase font-black text-accent tracking-[.2em] mb-1 leading-none">Student Profile</p>
                                    <h3 className="text-xl font-black font-display text-slate-900 tracking-tight leading-none">
                                        {currentStudent.englishName} ({currentStudent.khmerName})
                                    </h3>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="h-9 w-9 rounded-full bg-white border border-slate-100 text-slate-300 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto bg-white p-5 md:p-8 pb-24 lg:pb-8 space-y-8">
                                {/* RANK & PROGRESS SECTION */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl shadow-sm">🥋</div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 leading-none">Rank & Progress</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-wider">Belt Status</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 md:col-span-1 space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Current Belt</label>
                                                <div className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-800">
                                                    {currentStudent.currentBelt}
                                                </div>
                                            </div>
                                            <div className="col-span-2 md:col-span-1 space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Time at Rank</label>
                                                <div className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl flex items-baseline space-x-2">
                                                    <span className="text-xl font-black text-slate-900">{currentStudent.monthsAtBelt || 0}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Months</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Instructor Notes</label>
                                            <div className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 min-h-[80px]">
                                                {currentStudent.instructorNotes || 'No notes available.'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* BIOMETRICS SECTION */}
                                    <div className="bg-blue-50/40 p-8 rounded-2xl border border-blue-100/50 space-y-8 flex flex-col">
                                        <div className="flex items-center space-x-4">
                                            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-blue-50">📏</div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 leading-none">Biometrics</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-wider">Growth Tracking</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5 flex-1 items-start">
                                            <div className="space-y-2.5">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Height</label>
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        min="0"
                                                        className="w-full pl-5 pr-12 py-4 bg-white border border-blue-100/80 rounded-xl outline-none focus:border-blue-400 focus:ring-8 focus:ring-blue-500/5 transition-all text-xl font-black text-slate-700"
                                                        value={currentStudent.height || ''}
                                                        onChange={(e) => setCurrentStudent({ ...currentStudent, height: Math.max(0, parseFloat(e.target.value)) })}
                                                    />
                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-300">CM</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2.5">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Weight</label>
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        min="0"
                                                        className="w-full pl-5 pr-12 py-4 bg-white border border-blue-100/80 rounded-xl outline-none focus:border-blue-400 focus:ring-8 focus:ring-blue-500/5 transition-all text-xl font-black text-slate-700"
                                                        value={currentStudent.weight || ''}
                                                        onChange={(e) => setCurrentStudent({ ...currentStudent, weight: Math.max(0, parseFloat(e.target.value)) })}
                                                    />
                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-300">KG</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* DOCUMENTATION SECTION */}
                                <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="h-8 w-1 bg-slate-200 rounded-full" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Documentation</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Photo ID ID</label>
                                            <input
                                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-lg outline-none font-mono text-base text-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                                value={currentStudent.profilePictureId || ''}
                                                onChange={(e) => setCurrentStudent({ ...currentStudent, profilePictureId: e.target.value })}
                                                placeholder="Paste Google Drive File ID"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">E-Sign ID</label>
                                            <input
                                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-lg outline-none font-mono text-base text-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                                value={currentStudent.eSignId || ''}
                                                onChange={(e) => setCurrentStudent({ ...currentStudent, eSignId: e.target.value })}
                                                placeholder="Paste Google Drive File ID"
                                            />
                                        </div>
                                    </div>
                                    {currentStudent.eSignId && (
                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Signature Preview</p>
                                            <div className="p-4 bg-white rounded-lg border border-slate-200 inline-block">
                                                <img
                                                    src={`https://drive.google.com/thumbnail?id=${currentStudent.eSignId}&sz=s400`}
                                                    alt="e-sign"
                                                    className="h-10 object-contain opacity-80"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <footer className="px-10 py-8 bg-white border-t border-slate-100 flex items-center justify-end space-x-6 sticky bottom-0 z-20 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pb-8 backdrop-blur-xl bg-white/90">
                                <button
                                    onClick={() => { setIsEditModalOpen(false); setIsDetailOpen(true); }}
                                    className="px-8 py-4 text-[11px] font-black uppercase tracking-[.25em] text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Cancel Changes
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-12 py-5 bg-primary text-white rounded-lg font-black text-[11px] uppercase tracking-[.3em] shadow-2xl shadow-primary/30 active:scale-95 disabled:opacity-50 transition-all flex items-center space-x-3"
                                >
                                    {saving ? (
                                        <div className="h-4 w-4 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                    <span>{saving ? 'Transmitting...' : 'Commit Update'}</span>
                                </button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Students;