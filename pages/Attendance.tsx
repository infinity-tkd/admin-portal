import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Student, Attendance as AttendanceType } from '../types';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import { useQueryClient } from '@tanstack/react-query';

export const Attendance: React.FC = () => {
    const { students: globalStudents, attendance: globalAttendance, globalLoading, refreshAttendance } = useData();
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBelt, setSelectedBelt] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [saving, setSaving] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const normalizeDate = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.includes('T')) return dateStr.split('T')[0];
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

        try {
            const d = new Date(dateStr);
            const offset = d.getTimezoneOffset() * 60000;
            const local = new Date(d.getTime() - offset);
            return local.toISOString().split('T')[0];
        } catch {
            return dateStr;
        }
    };

    const attendanceData = useMemo(() => {
        const map: { [studentId: string]: 'Present' | 'Late' | 'Absent' | 'None' } = {};
        const targetDate = normalizeDate(selectedDate);

        (globalAttendance || []).forEach(record => {
            const recordDate = normalizeDate(record.date);
            if (recordDate === targetDate) {
                map[record.studentId] = record.status as any;
            }
        });
        return map;
    }, [globalAttendance, selectedDate]);

    const filteredStudents = globalStudents.filter(s => {
        const matchesBelt = selectedBelt === 'All' || (s.currentBelt || '').toLowerCase().includes(selectedBelt.toLowerCase());
        const matchesTerm = (s.englishName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.id || '').toLowerCase().includes(searchTerm.toLowerCase());

        const studentStatus = attendanceData[s.id] || 'None';
        const matchesStatus = statusFilter === 'All' || studentStatus === statusFilter;

        return matchesBelt && matchesTerm && matchesStatus;
    });

    const stats = useMemo(() => {
        const current = Object.values(attendanceData);
        return {
            present: current.filter(s => s === 'Present').length,
            late: current.filter(s => s === 'Late').length,
            absent: current.filter(s => s === 'Absent').length,
            pending: globalStudents.length - current.length
        };
    }, [attendanceData, globalStudents.length]);

    const handleStatusChange = async (studentId: string, status: 'Present' | 'Late' | 'Absent') => {
        const currentStatus = attendanceData[studentId];
        if (currentStatus === status) return;

        const record: AttendanceType = {
            studentId,
            studentName: globalStudents.find(s => s.id === studentId)?.englishName || '',
            date: selectedDate,
            status,
            classId: 'N/A', // or whatever default
            id: `${studentId}-${selectedDate}`
        };

        queryClient.setQueryData(['attendance'], (old: AttendanceType[] | undefined) => {
            const current = old || [];
            const filtered = current.filter(a => !(normalizeDate(a.date) === normalizeDate(selectedDate) && a.studentId === studentId));
            return [...filtered, record];
        });

        try {
            await api.saveAttendanceBatch([record]);
        } catch (error) {
            console.error("Save failed:", error);
            refreshAttendance();
        }
    };

    const handleConfirmSave = async () => {
        setSaving(true);
        try {
            await refreshAttendance();
            setIsConfirmOpen(false);
        } catch (error) {
            console.error("Save failed:", error);
        } finally {
            setSaving(false);
        }
    };

    const belts = ['All', 'White', 'Yellow', 'Green', 'Blue', 'Brown', 'Red', 'Black'];

    return (
        <div className="space-y-8 pb-32">
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-white p-6 sm:p-8 rounded-lg border border-slate-100 shadow-sm">
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Chronos Control</p>
                    <div className="relative group">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="text-3xl font-black font-display text-slate-900 bg-transparent border-b-4 border-slate-100 focus:border-primary outline-none py-2 transition-all cursor-pointer"
                        />
                        <div className="absolute -bottom-1 left-0 w-0 h-1 bg-primary transition-all group-hover:w-full" />
                    </div>
                    <div className="flex flex-wrap gap-4 sm:gap-6">
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.present} Present</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.late} Late</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.absent} Absent</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-slate-300 shadow-sm" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.pending} Pending</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Find Student..."
                            className="pl-10 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:bg-white outline-none w-full sm:w-64 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <button
                        onClick={() => setIsConfirmOpen(true)}
                        className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 active:scale-95 transition-all whitespace-nowrap"
                    >
                        Sync Records
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-6 sm:p-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                        {belts.map(belt => (
                            <button
                                key={belt}
                                onClick={() => setSelectedBelt(belt)}
                                className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${selectedBelt === belt ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                {belt}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center space-x-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100 overflow-x-auto scrollbar-none w-full md:w-auto">
                        {['All', 'Present', 'Late', 'Absent', 'None'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 sm:px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap ${statusFilter === s ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {s === 'None' ? 'Pending' : s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode='popLayout'>
                        {filteredStudents.map((s) => {
                            const currentStatus = attendanceData[s.id] || 'None';
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={s.id}
                                    className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:border-primary/20 transition-all group"
                                >
                                    <div className="flex items-center space-x-4 mb-6">
                                        <Avatar profilePictureId={s.profilePictureId} name={s.englishName} size="md" className="ring-4 ring-slate-50 group-hover:ring-primary/10 transition-all" />
                                        <div className="min-w-0">
                                            <p className="font-black text-slate-900 text-sm leading-tight truncate">{s.englishName}</p>
                                            <p className="text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-wider truncate font-display">{s.khmerName}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'Present', color: 'emerald' },
                                            { id: 'Late', color: 'amber' },
                                            { id: 'Absent', color: 'red' }
                                        ].map(status => (
                                            <button
                                                key={status.id}
                                                onClick={() => handleStatusChange(s.id, status.id as any)}
                                                className={`py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${currentStatus === status.id
                                                    ? `bg-${status.color}-500 border-${status.color}-600 text-white shadow-lg shadow-${status.color}-500/30`
                                                    : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                {status.id}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {isConfirmOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsConfirmOpen(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white p-10 rounded-xl shadow-2xl max-w-sm w-full text-center space-y-6">
                            <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mx-auto border-4 border-white shadow-xl shadow-emerald-500/10">✨</div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Records Verified?</h3>
                                <p className="text-sm text-slate-400 font-bold px-4">All attendance markers for {new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} will be synced to cloud.</p>
                            </div>
                            <div className="flex flex-col space-y-2 pt-4">
                                <button
                                    onClick={handleConfirmSave}
                                    disabled={saving}
                                    className="w-full py-4 bg-primary text-white rounded-lg font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/30 active:scale-95 transition-all text-center flex items-center justify-center"
                                >
                                    {saving ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Confirm & Sync'}
                                </button>
                                <button onClick={() => setIsConfirmOpen(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-slate-600 transition-colors">Go Back</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};