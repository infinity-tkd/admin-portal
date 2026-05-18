import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Student, Attendance as AttendanceType } from '../types';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext';

export const Attendance: React.FC = () => {
    const { students: globalStudents, attendance: globalAttendance, globalLoading, refreshAttendance } = useData();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // No local state for batching anymore - purely optimistic cache updates

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

    // Use Global Cache Only (Optimistically Updated by handleStatusChange)
    const attendanceData = useMemo(() => {
        const map: { [studentId: string]: 'Present' | 'Late' | 'Absent' | 'None' } = {};
        const targetDate = normalizeDate(selectedDate);

        // 1. Load Server Data
        (globalAttendance || []).forEach(record => {
            const recordDate = normalizeDate(record.date);
            if (recordDate === targetDate) {
                map[record.studentId] = record.status as any;
            }
        });

        return map;
    }, [globalAttendance, selectedDate]);

    const filteredStudents = useMemo(() => {
        return globalStudents.filter(s => {
            const matchesBelt = selectedBelt === 'All' || (s.currentBelt || '').toLowerCase().includes(selectedBelt.toLowerCase());
            const matchesTerm = (s.englishName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.id || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'All' || (attendanceData[s.id] || 'None') === statusFilter;

            return matchesBelt && matchesTerm && matchesStatus;
        });
    }, [globalStudents, selectedBelt, searchTerm, statusFilter, statusFilter === 'All' ? null : attendanceData]);

    const stats = useMemo(() => {
        const current = Object.values(attendanceData);
        return {
            present: current.filter(s => s === 'Present').length,
            late: current.filter(s => s === 'Late').length,
            absent: current.filter(s => s === 'Absent').length,
            pending: globalStudents.length - current.length
        };
    }, [attendanceData, globalStudents.length]);

    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const queuedRecordsRef = useRef<Map<string, AttendanceType>>(new Map());

    // OPTIMIZED: Instant Optimistic Update + Debounced Background Save
    const handleStatusChange = async (studentId: string, status: 'Present' | 'Late' | 'Absent') => {
        const currentStatus = attendanceData[studentId];
        if (currentStatus === status) return;

        const record: AttendanceType = {
            studentId,
            studentName: globalStudents.find(s => s.id === studentId)?.englishName || '',
            date: selectedDate,
            status,
            classId: 'N/A',
            id: `${studentId}-${selectedDate}`
        };

        // 1. Optimistic Update (Instant Feedback)
        queryClient.setQueryData(['masterData'], (old: any) => {
            const list = old?.attendance || [];
            const mergedList = [...list];
            const existingIdx = mergedList.findIndex((a: any) => a.studentId === record.studentId && a.date === record.date);
            if (existingIdx >= 0) {
                mergedList[existingIdx] = record;
            } else {
                mergedList.push({ ...record, id: 'temp-' + Date.now() + Math.random() });
            }
            
            return { ...old, attendance: mergedList };
        });

        // 2. Queue for Batch Processing (Protects Google Apps Script Quota)
        queuedRecordsRef.current.set(record.id, record);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            const recordsToSave: AttendanceType[] = Array.from(queuedRecordsRef.current.values());
            queuedRecordsRef.current.clear(); // Empty the queue

            api.saveAttendanceBatch(recordsToSave)
                .catch((error) => {
                    console.error("Batch save failed:", error);
                    showToast("Failed to sync attendance batch. Please check your connection.", "error");
                    refreshAttendance(); // Revert/Sync on error
                });
        }, 1500); // 1.5 second debounce window
    };

    // Manual Sync Button Handler
    const handleConfirmSave = async () => {
        setSaving(true);
        try {
            await refreshAttendance();
            setIsConfirmOpen(false);
            showToast("Records synced with cloud.", "success");
        } catch (error) {
            console.error("Sync failed:", error);
            showToast("Sync failed.", "error");
        } finally {
            setSaving(false);
        }
    };

    const belts = ['All', 'White', 'Yellow', 'Green', 'Blue', 'Brown', 'Red', 'Black'];

    return (
        <div className="space-y-8 pb-32">
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-white dark:bg-[#0A0A0A] p-6 sm:p-8 rounded-lg border border-neutral-100 dark:border-white/10 shadow-sm">
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Chronos Control</p>
                    <div className="relative group">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="text-3xl font-black font-display text-black dark:text-white bg-transparent border-b-4 border-neutral-100 dark:border-white/10 focus:border-primary outline-none py-2 transition-all cursor-pointer"
                        />
                        <div className="absolute -bottom-1 left-0 w-0 h-1 bg-primary transition-all group-hover:w-full" />
                    </div>
                    <div className="flex flex-wrap gap-4 sm:gap-6">
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{stats.present} Present</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{stats.late} Late</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{stats.absent} Absent</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-neutral-300 shadow-sm" />
                            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{stats.pending} Pending</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Find Student..."
                            className="pl-10 pr-6 py-3.5 bg-neutral-50 dark:bg-black/50 border border-neutral-100 dark:border-white/10 rounded-lg text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:bg-white dark:bg-[#0A0A0A] outline-none w-full sm:w-64 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <button
                        onClick={() => setIsConfirmOpen(true)}
                        className="w-full sm:w-auto px-8 py-3.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-black/20 active:scale-95 transition-all whitespace-nowrap hover:bg-neutral-800"
                    >
                        Sync Records
                    </button>
                </div>
            </header>

            <div className="bg-white dark:bg-[#0A0A0A] rounded-xl border border-neutral-100 dark:border-white/10 shadow-sm overflow-hidden p-6 sm:p-8 space-y-8">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                        {belts.map(belt => (
                            <button
                                key={belt}
                                onClick={() => setSelectedBelt(belt)}
                                className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${selectedBelt === belt ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-[#0A0A0A] border-neutral-100 dark:border-white/10 text-neutral-400 dark:text-neutral-500 hover:border-neutral-200 dark:border-white/10'}`}
                            >
                                {belt}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center space-x-2 p-1.5 bg-neutral-50 dark:bg-black/50 rounded-lg border border-neutral-100 dark:border-white/10 overflow-x-auto scrollbar-none w-full">
                        {['All', 'Present', 'Late', 'Absent', 'None'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`flex-1 min-w-[80px] px-2 sm:px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap text-center ${statusFilter === s ? 'bg-white dark:bg-[#0A0A0A] text-black dark:text-white shadow-md ring-1 ring-neutral-200' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:text-neutral-300'}`}
                            >
                                {s === 'None' ? 'Pending' : s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col space-y-3">
                    <AnimatePresence>
                        {filteredStudents.map((s) => {
                            const currentStatus = attendanceData[s.id] || 'None';
                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={s.id}
                                    className="bg-white dark:bg-[#0A0A0A] p-4 sm:p-5 rounded-xl border border-neutral-100 dark:border-white/10 shadow-sm hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <Avatar profilePictureId={s.profilePictureId} name={s.englishName} size="md" className="ring-2 ring-neutral-50 dark:ring-white/5" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-black dark:text-white text-sm sm:text-base leading-tight truncate">{s.englishName}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{s.currentBelt}</span>
                                                <span className="h-1 w-1 bg-neutral-200 dark:bg-white/10 rounded-full"/>
                                                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest truncate">{s.khmerName}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center bg-neutral-50 dark:bg-white/5 p-1 rounded-lg border border-neutral-100 dark:border-white/10 w-full md:w-auto">
                                        {[
                                            { id: 'Present', bg: 'bg-emerald-500', text: 'text-white', icon: '✓' },
                                            { id: 'Late', bg: 'bg-amber-500', text: 'text-white', icon: '⏱' },
                                            { id: 'Absent', bg: 'bg-red-500', text: 'text-white', icon: '✕' }
                                        ].map(status => (
                                            <button
                                                key={status.id}
                                                onClick={() => handleStatusChange(s.id, status.id as any)}
                                                className={`flex-1 md:flex-none md:w-28 py-2 sm:py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-1 sm:space-x-2 ${currentStatus === status.id
                                                    ? `${status.bg} ${status.text} shadow-md`
                                                    : 'text-neutral-400 dark:text-neutral-500 hover:bg-white dark:hover:bg-[#0A0A0A] hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                                            >
                                                <span className="text-[10px] sm:text-xs opacity-80">{status.icon}</span>
                                                <span>{status.id}</span>
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
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsConfirmOpen(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-[#0A0A0A] p-10 rounded-xl shadow-2xl max-w-sm w-full text-center space-y-6">
                            <div className="h-20 w-20 bg-neutral-50 dark:bg-black/50 text-neutral-500 dark:text-neutral-400 rounded-full flex items-center justify-center text-3xl mx-auto border-4 border-white shadow-xl shadow-neutral-500/10">🔄</div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">Sync Records?</h3>
                                <p className="text-sm text-neutral-400 dark:text-neutral-500 font-bold px-4">This will force a clean sync with the cloud database for {new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}.</p>
                            </div>
                            <div className="flex flex-col space-y-2 pt-4">
                                <button
                                    onClick={handleConfirmSave}
                                    disabled={saving}
                                    className="w-full py-4 bg-black text-white rounded-lg font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-black/30 active:scale-95 transition-all text-center flex items-center justify-center"
                                >
                                    {saving ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Confirm & Sync'}
                                </button>
                                <button onClick={() => setIsConfirmOpen(false)} className="w-full py-4 text-neutral-400 dark:text-neutral-500 font-black text-[10px] uppercase tracking-[0.3em] hover:text-neutral-600 dark:text-neutral-300 transition-colors">Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};