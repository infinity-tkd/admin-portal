import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Payment, Student } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../utils/formatters';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '../components/Avatar';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const Payments: React.FC = () => {
    const { payments: globalPayments, students: globalStudents, refreshPayments, globalLoading } = useData();

    const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPayment, setCurrentPayment] = useState<Partial<Payment>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState(() => {
        const cy = new Date().getFullYear();
        return cy >= 2025 ? cy.toString() : 'All';
    });
    const [monthFilter, setMonthFilter] = useState(MONTHS[new Date().getMonth()]);
    const [saving, setSaving] = useState(false);

    // Dynamic Year Roster (2025+)
    const currentYear = new Date().getFullYear();
    const years = ['All', ...Array.from({ length: Math.max(1, currentYear - 2024) }, (_, i) => (2025 + i).toString())];

    const loading = globalLoading && globalPayments.length === 0;

    useEffect(() => {
        refreshPayments();
    }, [refreshPayments]);

    useEffect(() => {
        if (!globalPayments) return;

        const term = searchTerm.toLowerCase().trim();

        // 1. IDENTIFY ALL PAYMENTS FOR SELECTED PERIOD (Ignore Status/Search for now)
        // We need this "absolute truth" of who paid in this period to correctly determine "Pending".
        const paymentsInPeriod = globalPayments.filter(p => {
            const py = Number(p.year);
            // Strict check: if year is below 2025 and filter is not 'All', ignore
            if (py < 2025 && yearFilter !== 'All') return false;

            const matchesYear = yearFilter === 'All' || p.year?.toString() === yearFilter;

            // Fuzzy Month Match
            const targetMonth = monthFilter.toLowerCase();
            const rawMonth = p.forMonth || (p as any).type || '';
            const recordMonth = rawMonth.toString().toLowerCase().trim();

            const matchesMonth = monthFilter === 'All' ||
                recordMonth === targetMonth ||
                (recordMonth.length >= 3 && targetMonth.startsWith(recordMonth)) ||
                (targetMonth.length >= 3 && recordMonth.startsWith(targetMonth));

            return matchesYear && matchesMonth;
        });

        // 2. FILTER FOR DISPLAY (Apply Status & Search)
        let displayList = paymentsInPeriod.filter(p => {
            const matchesSearch = !term ||
                (p.studentName || '').toLowerCase().includes(term) ||
                (p.studentId || '').toLowerCase().includes(term);

            const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        // 3. GENERATE PENDING (MISSING) RECORDS
        // Only if a specific Month & Year are selected.
        // 3. GENERATE PENDING (MISSING) RECORDS
        // Logic: If user specifically asks for "Pending", but has "All" months selected, default to Current Month.
        // Otherwise, use the selected month.
        let targetMonthForPending = monthFilter;
        if (statusFilter === 'Pending' && monthFilter === 'All') {
            targetMonthForPending = MONTHS[new Date().getMonth()];
        }

        if (targetMonthForPending !== 'All' && yearFilter !== 'All' && (statusFilter === 'All' || statusFilter === 'Pending')) {
            // We must identify who paid in the TARGET month (not necessarily the filtered month if it was All)
            const paymentsInTargetPeriod = globalPayments.filter(p => {
                const py = Number(p.year);
                if (py < 2025 && yearFilter !== 'All') return false;

                const matchesYear = yearFilter === 'All' || p.year?.toString() === yearFilter;

                const tMonth = targetMonthForPending.toLowerCase();
                const rMonth = (p.forMonth || (p as any).type || '').toString().toLowerCase().trim();

                const matchesMonth = rMonth === tMonth ||
                    (rMonth.length >= 3 && tMonth.startsWith(rMonth)) ||
                    (tMonth.length >= 3 && rMonth.startsWith(tMonth));

                return matchesYear && matchesMonth;
            });

            const paidStudentIds = new Set(paymentsInTargetPeriod.map(p => p.studentId));

            const pendingStudents = globalStudents.filter(s => {
                if (paidStudentIds.has(s.id)) return false;
                const matchesSearch = !term ||
                    (s.englishName || '').toLowerCase().includes(term) ||
                    (s.id || '').toLowerCase().includes(term);
                return matchesSearch;
            });

            const pendingRecords: Payment[] = pendingStudents.map(s => ({
                id: `PENDING-${s.id}-${yearFilter}-${targetMonthForPending}`,
                studentId: s.id,
                studentName: s.englishName,
                amount: 0,
                date: '-',
                year: yearFilter,
                forMonth: targetMonthForPending,
                status: 'Pending' as any,
                currency: 'USD'
            }));

            displayList = [...displayList, ...pendingRecords];
        }

        setFilteredPayments(displayList);
    }, [searchTerm, statusFilter, yearFilter, monthFilter, globalPayments, globalStudents]);

    const queryClient = useQueryClient();
    const { showToast } = useToast(); // Added useToast hook

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPayment.studentId || !currentPayment.amount || !currentPayment.forMonth || !currentPayment.year) return;

        const yr = Number(currentPayment.year);
        if (yr < 2025) {
            showToast("Entry for years before 2025 is restricted.", "warning"); // Replaced alert
            return;
        }

        setSaving(true);
        try {
            const student = globalStudents.find(s => s.id === currentPayment.studentId);
            const now = new Date();
            // Format: 1/16/2026 14:56:37 (M/d/yyyy HH:mm:ss)
            const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            const saved: Payment = {
                id: currentPayment.id || `PAY-${Date.now()}`,
                studentId: currentPayment.studentId,
                studentName: student?.englishName || 'Unknown',
                amount: Number(currentPayment.amount),
                date: formattedDate, // User requested format
                year: currentPayment.year.toString(),
                forMonth: currentPayment.forMonth.substring(0, 3), // Store as Jan, Feb, etc.
                status: currentPayment.status as 'Paid' | 'Unpaid' || 'Paid',
                currency: 'USD'
            };

            // Payload for backend (omit studentName as per user request to let backend handle lookup)
            const { studentName, ...apiPayload } = saved;

            // Optimistic Update: Update cache immediately
            queryClient.setQueryData(['masterData'], (old: any) => {
                const list = old?.payments || [];
                const isNew = !currentPayment.id;
                let newList = [];
                if (!isNew) {
                    newList = list.map((item: any) => item.id === apiPayload.id ? apiPayload : item);
                } else {
                    newList = [...list, { ...apiPayload, id: 'temp-' + Date.now() }];
                }
                return { ...old, payments: newList };
            });

            // ACTUAL API CALL
            await api.savePayment(apiPayload as Payment);

            await refreshPayments();
            setIsModalOpen(false);
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const isPaid = status === 'Paid';
        const isPending = status === 'Pending';
        return (
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                isPending ? 'bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-white/10' : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                {status}
            </span>
        );
    };

    const totalIncome = filteredPayments.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
    const pendingIncome = filteredPayments.filter(p => p.status === 'Unpaid').reduce((acc, p) => acc + p.amount, 0);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="h-12 w-12 border-[5px] border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="font-display font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-[10px]">Processing Treasury</p>
        </div>
    );

    return (
        <div className="space-y-12 pb-24">
            {/* ECONOMY OVERVIEW HERO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 bg-primary rounded-xl p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[180px] sm:min-h-[220px] shadow-lg shadow-primary/20"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 blur-[80px] -mr-32 -mt-32" />
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-accent mb-2 sm:mb-3">
                            Economy Report {monthFilter !== 'All' ? `• ${monthFilter}` : ''} {yearFilter !== 'All' ? `• FY ${yearFilter}` : ''}
                        </p>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight leading-none">
                            <span className="text-neutral-500 dark:text-neutral-400 font-sans tracking-normal">$</span>{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>
                    <div className="relative z-10 flex items-center space-x-6 mt-6">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">Receipts</p>
                            <p className="text-base font-black text-white">{filteredPayments.length} <span className="text-[9px] text-neutral-500 dark:text-neutral-400">TXNS</span></p>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10 dark:bg-[#0A0A0A]/10" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">Uncollected</p>
                            <p className="text-base font-black text-rose-500">${pendingIncome.toLocaleString()}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 rounded-xl p-6 sm:p-8 flex flex-col justify-between shadow-sm"
                >
                    <div className="space-y-3">
                        <div className="h-11 w-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-black shadow-inner">
                            $
                        </div>
                        <h3 className="text-xl font-black font-display text-black dark:text-white leading-tight">Income Entry</h3>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentPayment({
                                date: new Date().toISOString().split('T')[0],
                                status: 'Paid',
                                year: new Date().getFullYear().toString(),
                                forMonth: MONTHS[new Date().getMonth()]
                            });
                            setIsModalOpen(true);
                        }}
                        className="w-full bg-primary text-white py-3.5 sm:py-4 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-black active:scale-95 transition-all mt-3 sm:mt-5"
                    >
                        Create Transaction
                    </button>
                </motion.div>
            </div>

            {/* FILTER BAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative group lg:col-span-1">
                    <input
                        type="text"
                        placeholder="Student name or ID..."
                        className="w-full pl-11 pr-5 py-3 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 rounded-lg focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-bold text-black dark:text-white placeholder:text-neutral-300 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300 transition-colors group-focus-within:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="flex bg-neutral-100/50 dark:bg-white/5 p-1.5 rounded-lg border border-neutral-200 dark:border-white/10">
                    {years.map(y => (
                        <button
                            key={y}
                            onClick={() => setYearFilter(y)}
                            className={`flex-1 px-2 py-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${yearFilter === y ? 'bg-white dark:bg-[#0A0A0A] shadow-sm text-black dark:text-white ring-1 ring-neutral-200' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:text-neutral-300'}`}
                        >
                            {y}
                        </button>
                    ))}
                </div>

                <select
                    className="px-4 py-2 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 rounded-lg outline-none font-bold text-neutral-700 dark:text-neutral-300 text-xs appearance-none cursor-pointer"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                >
                    <option value="All">All Months</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <div className="flex bg-neutral-100/50 dark:bg-white/5 p-1.5 rounded-lg border border-neutral-200 dark:border-white/10">
                    {['All', 'Paid', 'Unpaid', 'Pending'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`flex-1 px-2 py-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-white dark:bg-[#0A0A0A] shadow-sm text-black dark:text-white ring-1 ring-neutral-200' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:text-neutral-300'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* TRANSACTION LIST */}
            <div className="bg-white dark:bg-[#0A0A0A] rounded-xl border border-neutral-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
                <div className="min-w-[800px] lg:min-w-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50 dark:bg-black/50 border-b border-neutral-100 dark:border-white/10 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">MONTH / YEAR</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Student</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Amount</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Date</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Status</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 text-right">Ops</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filteredPayments.map((p, i) => {
                                // DATA NORMALIZATION BRIDGE
                                // Handle backend mismatch (type vs forMonth)
                                const displayMonth = (p.forMonth || (p as any).type || 'N/A').toString().substring(0, 3);

                                // Handle missing student name via lookup
                                const student = globalStudents.find(s => s.id === p.studentId);
                                const displayName = p.studentName && p.studentName !== 'Unknown'
                                    ? p.studentName
                                    : (student ? `${student.englishName} ${student.khmerName || ''}` : p.studentId);

                                return (
                                    <motion.tr
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        key={p.id}
                                        className="group hover:bg-neutral-50/50 dark:bg-black/50 transition-all duration-300 cursor-pointer"
                                        onClick={() => {
                                            if (p.status === 'Pending') {
                                                // Pre-fill for new payment
                                                setCurrentPayment({
                                                    studentId: p.studentId,
                                                    studentName: displayName,
                                                    year: yearFilter !== 'All' ? yearFilter : new Date().getFullYear().toString(),
                                                    forMonth: monthFilter !== 'All' ? monthFilter : MONTHS[new Date().getMonth()],
                                                    status: 'Paid',
                                                    date: new Date().toISOString().split('T')[0]
                                                });
                                                setIsModalOpen(true);
                                            } else {
                                                setCurrentPayment(p);
                                                setIsModalOpen(true);
                                            }
                                        }}
                                    >
                                        <td className="px-5 sm:px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="text-sm font-black text-black dark:text-white leading-none uppercase tracking-tight">
                                                    {displayMonth}
                                                </p>
                                                <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 mt-1.5 uppercase tracking-widest">
                                                    FY {p.year}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <Avatar profilePictureId={student?.profilePictureId} name={displayName} size="sm" className="hidden sm:flex" />
                                                <div>
                                                    <p className="text-sm font-black text-black dark:text-white group-hover:text-accent transition-colors">
                                                        {displayName}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5">{p.studentId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4">
                                            <p className="text-base font-black text-black dark:text-white font-mono tracking-tight leading-none">
                                                $ {p.amount.toFixed(2)}
                                            </p>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4">
                                            <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest leading-none">
                                                {p.date}
                                            </p>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4">
                                            <StatusBadge status={p.status} />
                                        </td>
                                        <td className="px-5 sm:px-6 py-4 text-right">
                                            <button className="text-neutral-300 hover:text-accent transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL SYSTEM */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center lg:p-6 pb-0 px-0 pt-12">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 20 }}
                            className="relative bg-white dark:bg-[#0A0A0A] rounded-t-2xl lg:rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col mt-auto lg:my-8 max-h-[85vh] lg:max-h-[90vh]"
                        >
                            <header className="px-6 py-5 lg:px-8 lg:py-6 flex items-center justify-between border-b border-neutral-100 dark:border-white/10 bg-neutral-50/50 dark:bg-black/50">
                                <div>
                                    <p className="text-[9px] uppercase font-black text-accent tracking-[.2em] mb-1 leading-none">Ledger Entry</p>
                                    <h3 className="text-xl font-black font-display text-black dark:text-white tracking-tight leading-none">
                                        {currentPayment.id ? 'Modify Record' : 'Log Income'}
                                    </h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="h-9 w-9 rounded-full bg-white dark:bg-[#0A0A0A] border border-neutral-100 dark:border-white/10 text-neutral-300 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </header>

                            <form id="payment-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 lg:p-8 pb-24 lg:pb-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-3">Warrior Entity</label>
                                    <select
                                        required
                                        className="w-full px-5 py-3.5 bg-neutral-50 dark:bg-black/50 border border-neutral-200 dark:border-white/10 rounded-lg focus:bg-white dark:bg-[#0A0A0A] focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-bold text-black dark:text-white appearance-none"
                                        value={currentPayment.studentId || ''}
                                        onChange={e => {
                                            const s = globalStudents.find(st => st.id === e.target.value);
                                            setCurrentPayment({ ...currentPayment, studentId: e.target.value, studentName: s?.englishName });
                                        }}
                                        disabled={!!currentPayment.id}
                                    >
                                        <option value="">Select Student...</option>
                                        {globalStudents.map(s => <option key={s.id} value={s.id}>{s.englishName} ({s.id})</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-3">For Month</label>
                                        <select
                                            required
                                            className="w-full px-5 py-3.5 bg-neutral-50 dark:bg-black/50 border border-neutral-200 dark:border-white/10 rounded-lg outline-none font-bold text-black dark:text-white appearance-none text-base"
                                            value={currentPayment.forMonth || ''}
                                            onChange={e => setCurrentPayment({ ...currentPayment, forMonth: e.target.value })}
                                        >
                                            <option value="">Select Month...</option>
                                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-3">Year</label>
                                        <input
                                            type="number" required
                                            className="w-full px-5 py-3.5 bg-neutral-50 dark:bg-black/50 border border-neutral-200 dark:border-white/10 rounded-lg outline-none font-black text-black dark:text-white text-base"
                                            value={currentPayment.year || ''}
                                            onChange={e => setCurrentPayment({ ...currentPayment, year: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-3">Amount ($)</label>
                                        <input
                                            type="number" step="0.01" min="0" required
                                            className="w-full px-5 py-3.5 bg-neutral-50 dark:bg-black/50 border border-neutral-200 dark:border-white/10 rounded-lg focus:bg-white dark:bg-[#0A0A0A] focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-black text-black dark:text-white text-lg text-center"
                                            value={currentPayment.amount || ''}
                                            onChange={e => setCurrentPayment({ ...currentPayment, amount: Math.max(0, parseFloat(e.target.value)) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-3">Payment Date</label>
                                        <input
                                            type="date" required
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-black/50 border border-neutral-200 dark:border-white/10 rounded-lg outline-none font-bold text-neutral-700 dark:text-neutral-300 text-sm"
                                            value={currentPayment.date || ''}
                                            onChange={e => setCurrentPayment({ ...currentPayment, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex bg-neutral-100/50 dark:bg-white/5 p-1.5 rounded-lg border border-neutral-200 dark:border-white/10">
                                    {['Paid', 'Unpaid'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setCurrentPayment({ ...currentPayment, status: s as any })}
                                            className={`flex-1 py-3.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentPayment.status === s ? (s === 'Paid' ? 'bg-white dark:bg-[#0A0A0A] shadow text-emerald-600 ring-1 ring-neutral-200' : 'bg-white dark:bg-[#0A0A0A] shadow text-rose-600 ring-1 ring-neutral-200') : 'text-neutral-400 dark:text-neutral-500'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                            </form>
                            <div className="px-6 py-5 border-t border-neutral-100 dark:border-white/10 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl sticky bottom-0 z-20">
                                <button
                                    form="payment-form"
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-primary text-white py-4 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-black disabled:opacity-50 active:scale-95 transition-all outline-none"
                                >
                                    {saving ? 'Processing Txn...' : 'Lock Transaction'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};