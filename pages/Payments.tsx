import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Payment, Student } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../utils/formatters';
import { useData } from '../context/DataContext';
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
    const [monthFilter, setMonthFilter] = useState('All');
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
        const filtered = globalPayments.filter(p => {
            const py = Number(p.year);
            // Strict check: if year is below 2025 and filter is not 'All', ignore
            if (py < 2025 && yearFilter !== 'All') return false;
            if (py < 2025 && p.year !== '2025' && p.year !== '2026') return false; // Hide legacy trash

            const matchesSearch = !term ||
                (p.studentName || '').toLowerCase().includes(term) ||
                (p.studentId || '').toLowerCase().includes(term);

            const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
            const matchesYear = yearFilter === 'All' || p.year?.toString() === yearFilter;

            // Fuzzy Month Match (Support abbreviations like Jan)
            const targetMonth = monthFilter.toLowerCase();
            // BRIDGE: Handle 'type' if 'forMonth' is missing
            const rawMonth = p.forMonth || (p as any).type || '';
            const recordMonth = rawMonth.toString().toLowerCase().trim();

            const matchesMonth = monthFilter === 'All' ||
                recordMonth === targetMonth ||
                (recordMonth.length >= 3 && targetMonth.startsWith(recordMonth)) ||
                (targetMonth.length >= 3 && recordMonth.startsWith(targetMonth));

            return matchesSearch && matchesStatus && matchesYear && matchesMonth;
        });
        setFilteredPayments(filtered);
    }, [searchTerm, statusFilter, yearFilter, monthFilter, globalPayments]);

    const queryClient = useQueryClient();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPayment.studentId || !currentPayment.amount || !currentPayment.forMonth || !currentPayment.year) return;

        const yr = Number(currentPayment.year);
        if (yr < 2025) {
            alert("Entry for years before 2025 is restricted.");
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
            await api.savePayment(apiPayload as Payment);

            // OPTIMISTIC UPDATE: Update cache immediately
            queryClient.setQueryData(['payments'], (old: Payment[] | undefined) => {
                const current = old || [];
                const exists = current.findIndex(p => p.id === saved.id);
                if (exists >= 0) {
                    return current.map(p => p.id === saved.id ? saved : p);
                }
                return [...current, saved];
            });

            await refreshPayments();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const isPaid = status === 'Paid';
        return (
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
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
            <p className="font-display font-black text-slate-400 uppercase tracking-widest text-[10px]">Processing Treasury</p>
        </div>
    );

    return (
        <div className="space-y-12 pb-24">
            {/* ECONOMY OVERVIEW HERO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 bg-primary rounded-lg p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[180px] sm:min-h-[220px]"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 blur-[80px] -mr-32 -mt-32" />
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-accent mb-2 sm:mb-3">
                            Economy Report {monthFilter !== 'All' ? `• ${monthFilter}` : ''} {yearFilter !== 'All' ? `• FY ${yearFilter}` : ''}
                        </p>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight leading-none">
                            <span className="text-slate-500 font-sans tracking-normal">$</span>{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>
                    <div className="relative z-10 flex items-center space-x-6 mt-6">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Receipts</p>
                            <p className="text-base font-black text-white">{filteredPayments.length} <span className="text-[9px] text-slate-500">TXNS</span></p>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Uncollected</p>
                            <p className="text-base font-black text-rose-500">${pendingIncome.toLocaleString()}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 flex flex-col justify-between shadow-sm"
                >
                    <div className="space-y-3">
                        <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-black shadow-inner">
                            $
                        </div>
                        <h3 className="text-xl font-black font-display text-slate-900 leading-tight">Income Entry</h3>
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
                        className="w-full bg-primary text-white py-3.5 sm:py-4 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-slate-900 active:scale-95 transition-all mt-3 sm:mt-5"
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
                        className="w-full pl-11 pr-5 py-3 bg-white border border-slate-200 rounded-lg focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 transition-colors group-focus-within:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200">
                    {years.map(y => (
                        <button
                            key={y}
                            onClick={() => setYearFilter(y)}
                            className={`flex-1 px-2 py-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${yearFilter === y ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {y}
                        </button>
                    ))}
                </div>

                <select
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs appearance-none cursor-pointer"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                >
                    <option value="All">All Months</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200">
                    {['All', 'Paid', 'Unpaid'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`flex-1 px-2 py-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* TRANSACTION LIST */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">MONTH / YEAR</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Student</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                                <th className="px-5 sm:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Ops</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
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
                                        className="group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer"
                                        onClick={() => { setCurrentPayment(p); setIsModalOpen(true); }}
                                    >
                                        <td className="px-5 sm:px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="text-sm font-black text-slate-900 leading-none uppercase tracking-tight">
                                                    {displayMonth}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">
                                                    FY {p.year}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <Avatar profilePictureId={student?.profilePictureId} name={displayName} size="sm" className="hidden sm:flex" />
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 group-hover:text-accent transition-colors">
                                                        {displayName}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{p.studentId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4">
                                            <p className="text-base font-black text-slate-900 font-mono tracking-tight leading-none">
                                                $ {p.amount.toFixed(2)}
                                            </p>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                                {p.date}
                                            </p>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4">
                                            <StatusBadge status={p.status} />
                                        </td>
                                        <td className="px-5 sm:px-6 py-4 text-right">
                                            <button className="text-slate-300 hover:text-accent transition-colors">
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
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-t-3xl lg:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col mt-auto lg:my-8 max-h-[85vh] lg:max-h-[90vh]"
                        >
                            <header className="px-6 py-5 lg:px-8 lg:py-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                                <div>
                                    <p className="text-[9px] uppercase font-black text-accent tracking-[.2em] mb-1 leading-none">Ledger Entry</p>
                                    <h3 className="text-xl font-black font-display text-slate-900 tracking-tight leading-none">
                                        {currentPayment.id ? 'Modify Record' : 'Log Income'}
                                    </h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="h-9 w-9 rounded-full bg-white border border-slate-100 text-slate-300 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </header>

                            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 lg:p-8 pb-24 lg:pb-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Warrior Entity</label>
                                    <select
                                        required
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-bold text-slate-900 appearance-none"
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
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">For Month</label>
                                        <select
                                            required
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-900 appearance-none text-sm"
                                            value={currentPayment.forMonth || ''}
                                            onChange={e => setCurrentPayment({ ...currentPayment, forMonth: e.target.value })}
                                        >
                                            <option value="">Select Month...</option>
                                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Year</label>
                                        <input
                                            type="number" required
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-black text-slate-900 text-sm"
                                            value={currentPayment.year || ''}
                                            onChange={e => setCurrentPayment({ ...currentPayment, year: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Amount ($)</label>
                                        <input
                                            type="number" step="0.01" required
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-black text-slate-900 text-lg text-center"
                                            value={currentPayment.amount || ''}
                                            onChange={e => setCurrentPayment({ ...currentPayment, amount: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Payment Date</label>
                                        <input
                                            type="date" required
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-sm"
                                            value={currentPayment.date || ''}
                                            onChange={e => setCurrentPayment({ ...currentPayment, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200">
                                    {['Paid', 'Unpaid'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setCurrentPayment({ ...currentPayment, status: s as any })}
                                            className={`flex-1 py-3.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentPayment.status === s ? (s === 'Paid' ? 'bg-white shadow text-emerald-600 ring-1 ring-slate-200' : 'bg-white shadow text-rose-600 ring-1 ring-slate-200') : 'text-slate-400'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-primary text-white py-4 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-slate-900 disabled:opacity-50 active:scale-95 transition-all outline-none mt-4"
                                >
                                    {saving ? 'Processing Txn...' : 'Lock Transaction'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};