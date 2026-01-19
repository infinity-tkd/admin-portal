import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { Achievement } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../utils/formatters';
import { Avatar } from '../components/Avatar';
import { useData } from '../context/DataContext';
import { ConfirmationModal } from '../components/ConfirmationModal';

import { useQueryClient } from '@tanstack/react-query';

export const Achievements: React.FC = () => {
    const { achievements: globalAchievements, students: globalStudents, events: globalEvents, refreshAchievements, globalLoading } = useData();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentFilter, setSelectedStudentFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'delete', id?: string, data?: Achievement | null } | null>(null);

    const [currentAchievement, setCurrentAchievement] = useState<Partial<Achievement>>({});
    const [saving, setSaving] = useState(false);

    const loading = globalLoading && globalAchievements.length === 0;

    useEffect(() => {
        refreshAchievements();
    }, [refreshAchievements]);

    // Grouping Logic: Student -> Event -> Achievements
    const groupedData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        const data = globalAchievements || [];

        // Initial filter
        const filtered = data.filter(a => {
            if (!a.studentId) return false;
            const matchesTerm = (a.studentName || '').toLowerCase().includes(term) || (a.eventName || '').toLowerCase().includes(term);
            const matchesStudent = selectedStudentFilter ? a.studentId === selectedStudentFilter : true;
            return matchesTerm && matchesStudent;
        });

        // Group by Student
        const studentGroups: { [studentId: string]: { student: any, events: { [eventName: string]: Achievement[] } } } = {};

        filtered.forEach(item => {
            const sId = item.studentId;
            if (!studentGroups[sId]) {
                const s = globalStudents.find(std => std.id === sId);
                studentGroups[sId] = { student: s, events: {} };
            }
            const eName = item.eventName || 'Unnamed Event';
            if (!studentGroups[sId].events[eName]) {
                studentGroups[sId].events[eName] = [];
            }
            studentGroups[sId].events[eName].push(item);
        });

        // Sort by Student ID as requested
        const sortedGroups = Object.values(studentGroups).sort((a, b) => (a.student?.id || '').localeCompare(b.student?.id || ''));

        // Sort achievements within events by Medal Rank
        const medalOrder: { [key: string]: number } = { 'Gold': 1, 'Silver': 2, 'Bronze': 3, 'Participate': 4 };

        sortedGroups.forEach(group => {
            Object.keys(group.events).forEach(eventName => {
                group.events[eventName].sort((a, b) => {
                    const rankA = medalOrder[a.medal] || 99;
                    const rankB = medalOrder[b.medal] || 99;
                    return rankA - rankB;
                });
            });
        });

        return sortedGroups;
    }, [globalAchievements, searchTerm, selectedStudentFilter, globalStudents]);

    const handleSaveClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentAchievement.studentId || !currentAchievement.eventName) return;

        const student = globalStudents.find(s => s.id === currentAchievement.studentId);
        const achievementToSave: Achievement = {
            id: currentAchievement.id || `ACH-${Date.now()}`,
            studentId: currentAchievement.studentId,
            studentName: student?.englishName || 'Unknown',
            eventName: currentAchievement.eventName,
            date: currentAchievement.date || new Date().toISOString().split('T')[0],
            category: currentAchievement.category || '',
            division: currentAchievement.division || '',
            medal: currentAchievement.medal || 'Participate',
            notes: currentAchievement.notes || '',
            description: currentAchievement.description || ''
        };

        setConfirmAction({ type: 'save', data: achievementToSave });
        setIsConfirmOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setConfirmAction({ type: 'delete', id });
        setIsConfirmOpen(true);
    };

    const handleConfirm = async () => {
        if (!confirmAction) return;
        setSaving(true);
        try {
            if (confirmAction.type === 'save' && confirmAction.data) {
                const data = confirmAction.data;
                // Optimistic Update
                queryClient.setQueryData(['achievements'], (old: Achievement[] | undefined) => {
                    const list = old || [];
                    const exists = list.find(a => a.id === data.id);
                    if (exists) return list.map(a => a.id === data.id ? data : a);
                    return [...list, data];
                });

                await api.saveAchievement(data);
                setIsFormOpen(false);
            } else if (confirmAction.type === 'delete' && confirmAction.id) {
                // Optimistic Delete
                queryClient.setQueryData(['achievements'], (old: Achievement[] | undefined) => {
                    return (old || []).filter(a => a.id !== confirmAction.id);
                });

                await api.deleteAchievement(confirmAction.id);
                if (isFormOpen && currentAchievement.id === confirmAction.id) {
                    setIsFormOpen(false);
                }
            }
            await refreshAchievements();
            setIsConfirmOpen(false);
            setConfirmAction(null);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const getStudentProfilePic = (id: string) => {
        return globalStudents.find(s => s.id === id)?.profilePictureId;
    };

    const handleEventSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const eventId = e.target.value;
        const event = globalEvents.find(ev => ev.id === eventId);
        if (event) {
            setCurrentAchievement(prev => ({
                ...prev,
                eventName: event.title,
                date: event.date
            }));
        } else {
            setCurrentAchievement(prev => ({ ...prev, eventName: eventId }));
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="h-12 w-12 border-[5px] border-yellow-200 border-t-yellow-600 rounded-full animate-spin" />
            <p className="font-display font-black text-slate-400 uppercase tracking-widest text-[10px]">Polishing Trophies</p>
        </div>
    );

    return (
        <div className="space-y-12 pb-24">
            {/* HALL OF FAME HERO */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-5">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-yellow-600 mb-1">Legendary Registry</p>
                    <h2 className="text-3xl font-black font-display text-slate-900 tracking-tight leading-tight">Hall of <br />Excellence</h2>
                </div>
                <button
                    onClick={() => { setCurrentAchievement({ date: new Date().toISOString().split('T')[0], medal: 'Gold' }); setIsFormOpen(true); }}
                    className="bg-primary text-white px-8 py-4 rounded-lg font-black text-[9px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-900 transition-all flex items-center space-x-2.5 active:scale-95"
                >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                    <span>Honor Warrior</span>
                </button>
            </div>

            {/* FILTER BAR */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch max-w-2xl">
                <div className="relative group flex-1">
                    <input
                        type="text"
                        placeholder="Search events or champions..."
                        className="w-full pl-11 pr-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-yellow-500/5 focus:border-yellow-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm h-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 transition-colors group-focus-within:text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="relative w-full sm:w-64">
                    <select
                        value={selectedStudentFilter}
                        onChange={(e) => setSelectedStudentFilter(e.target.value)}
                        className="w-full pl-5 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-yellow-500/5 focus:border-yellow-500 outline-none transition-all font-bold text-slate-900 text-sm h-full appearance-none cursor-pointer"
                    >
                        <option value="">All Warriors</option>
                        {globalStudents.map(s => (
                            <option key={s.id} value={s.id}>{s.englishName}</option>
                        ))}
                    </select>
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>

            {/* GROUPED LISTING */}
            <div className="space-y-10">
                <AnimatePresence mode="popLayout">
                    {groupedData.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
                            <svg className="h-16 w-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" /></svg>
                            <p className="font-display font-black uppercase tracking-widest text-xs">No histories found</p>
                        </motion.div>
                    ) : groupedData.map((group, groupIdx) => (
                        <motion.section
                            key={group.student?.id || groupIdx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: groupIdx * 0.05 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center space-x-5">
                                <Avatar profilePictureId={group.student?.profilePictureId} name={group.student?.englishName || 'Warrior'} size="lg" className="ring-4 ring-slate-100/50 shadow-sm" />
                                <div>
                                    <h3 className="text-xl font-black font-display text-slate-900 tracking-tight leading-none uppercase">{group.student?.englishName || 'Unknown Student'}</h3>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black tracking-widest">{group.student?.id}</span>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display">{group.student?.khmerName || 'កីឡាករ'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {Object.entries(group.events).map(([eventName, items]) => {
                                    const eventItems = items as Achievement[];
                                    return (
                                        <motion.div
                                            key={eventName}
                                            whileHover={{ y: -4 }}
                                            className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] transition-all duration-300 overflow-hidden flex flex-col group/card"
                                        >
                                            <header className="p-4 bg-slate-50 border-b border-slate-100">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 text-[8px] font-black uppercase tracking-widest rounded">Competition</span>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{formatDate(eventItems[0].date)}</p>
                                                </div>
                                                <h5 className="font-black text-slate-900 text-xs truncate uppercase tracking-tight">{eventName}</h5>
                                            </header>

                                            <div className="p-4 space-y-3">
                                                {eventItems.map((item) => (
                                                    <div key={item.id} className="group/item relative bg-white rounded-lg p-3 border border-slate-100 hover:border-yellow-200 hover:shadow-sm transition-all duration-200">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center space-x-3">
                                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shadow-sm transform group-hover/item:rotate-12 transition-transform ${item.medal === 'Gold' ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 text-white' :
                                                                    item.medal === 'Silver' ? 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-700' :
                                                                        item.medal === 'Bronze' ? 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 text-white' :
                                                                            'bg-slate-100 text-slate-400'
                                                                    }`}>
                                                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 2l.645 2.133a1 1 0 00.95.69h2.243l-1.814 1.318a1 1 0 00-.363 1.118l.645 2.133L10 8.077 7.339 9.392l.645-2.133a1 1 0 00-.363-1.118L5.807 4.823h2.243a1 1 0 00.95-.69L10 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div>
                                                                    <p className={`text-[10px] font-black leading-tight ${item.medal === 'Gold' ? 'text-yellow-700' :
                                                                        item.medal === 'Silver' ? 'text-slate-600' :
                                                                            item.medal === 'Bronze' ? 'text-orange-700' :
                                                                                'text-slate-500'
                                                                        }`}>{item.medal}</p>
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{item.category}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => { setCurrentAchievement(item); setIsFormOpen(true); }}
                                                                className="p-1 rounded-md text-slate-300 hover:text-yellow-600 hover:bg-slate-50 transition-all opacity-0 group-hover/item:opacity-100"
                                                            >
                                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                            </button>
                                                        </div>
                                                        <div className="mt-2 flex items-center justify-between text-[8px] font-bold">
                                                            <span className="text-slate-300 uppercase tracking-widest">Division</span>
                                                            <span className="text-slate-500 uppercase">{item.division || 'Open'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.section>
                    ))}
                </AnimatePresence>
            </div>

            {/* FORM MODAL */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center lg:p-6 pb-0 px-0 pt-12">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                            onClick={() => setIsFormOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-t-3xl lg:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] lg:max-h-[90vh] mt-auto lg:mt-0"
                        >
                            <header className="px-6 py-5 lg:px-8 lg:py-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 backdrop-blur-xl sticky top-0 z-20">
                                <div>
                                    <p className="text-[9px] uppercase font-black text-yellow-600 tracking-[.2em] mb-1 leading-none">Honor Roll</p>
                                    <h3 className="text-xl font-black font-display text-slate-900 tracking-tight leading-none">
                                        {currentAchievement.id ? 'Refine Honor' : 'Bestow Honor'}
                                    </h3>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="h-9 w-9 rounded-full bg-white border border-slate-100 text-slate-300 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </header>

                            <form onSubmit={handleSaveClick} className="flex-1 overflow-y-auto p-5 lg:p-8 pb-24 lg:pb-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Recipient</label>
                                    <select
                                        required
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-yellow-500/5 focus:border-yellow-500 outline-none transition-all font-bold text-slate-900 appearance-none text-sm"
                                        value={currentAchievement.studentId || ''}
                                        onChange={e => setCurrentAchievement({ ...currentAchievement, studentId: e.target.value })}
                                        disabled={!!currentAchievement.id}
                                    >
                                        <option value="">Select Student...</option>
                                        {globalStudents.map(s => <option key={s.id} value={s.id}>{s.englishName}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Event Selector</label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-yellow-500/5 focus:border-yellow-500 outline-none transition-all font-bold text-slate-900 appearance-none text-sm"
                                            onChange={handleEventSelect}
                                            value={globalEvents.some(e => e.title === currentAchievement.eventName) ? globalEvents.find(e => e.title === currentAchievement.eventName)?.id : ''}
                                        >
                                            <option value="">Select Event...</option>
                                            {globalEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                            <option value="custom">-- Custom Event --</option>
                                        </select>
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-lg mt-2 text-sm font-bold text-slate-700"
                                        placeholder="Or type custom event name..."
                                        value={currentAchievement.eventName || ''}
                                        onChange={e => setCurrentAchievement({ ...currentAchievement, eventName: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Category</label>
                                        <select
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-yellow-500/5 focus:border-yellow-500 outline-none transition-all font-bold text-slate-900 appearance-none text-sm"
                                            value={currentAchievement.category || ''}
                                            onChange={e => setCurrentAchievement({ ...currentAchievement, category: e.target.value })}
                                        >
                                            <option value="">Select Category...</option>
                                            <option value="Recognized Poomsae">Recognized Poomsae</option>
                                            <option value="Freestyle Poomsae">Freestyle Poomsae</option>
                                            <option value="Demonstration">Demonstration</option>
                                            <option value="Board Breaking">Board Breaking</option>
                                            <option value="Speed Kicking">Speed Kicking</option>
                                            <option value="Taekwondo Aerobic">Taekwondo Aerobic</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Division</label>
                                        <select
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-yellow-500/5 focus:border-yellow-500 outline-none transition-all font-bold text-slate-900 appearance-none text-sm"
                                            value={currentAchievement.division || ''}
                                            onChange={e => setCurrentAchievement({ ...currentAchievement, division: e.target.value })}
                                        >
                                            <option value="">Select Division...</option>
                                            <option value="Team">Team</option>
                                            <option value="Team of 5">Team of 5</option>
                                            <option value="Team of 3">Team of 3</option>
                                            <option value="Female Individual">Female Individual</option>
                                            <option value="Male Individual">Male Individual</option>
                                            <option value="Pair">Pair</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Rank / Medal</label>
                                        <select
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-yellow-500/5 focus:border-yellow-500 outline-none transition-all font-bold text-slate-900 appearance-none text-sm"
                                            value={currentAchievement.medal || 'Participate'}
                                            onChange={e => setCurrentAchievement({ ...currentAchievement, medal: e.target.value })}
                                        >
                                            <option value="Gold">Gold</option>
                                            <option value="Silver">Silver</option>
                                            <option value="Bronze">Bronze</option>
                                            <option value="Participate">Participate</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Date</label>
                                        <input
                                            type="date" required
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-sm"
                                            value={currentAchievement.date || ''}
                                            onChange={e => setCurrentAchievement({ ...currentAchievement, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Notes / Description</label>
                                    <textarea
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-sm h-20 resize-none"
                                        placeholder="Additional details..."
                                        value={currentAchievement.notes || ''}
                                        onChange={e => setCurrentAchievement({ ...currentAchievement, notes: e.target.value, description: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-center space-x-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-primary text-white py-4 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-slate-900 disabled:opacity-50 active:scale-95 transition-all outline-none"
                                    >
                                        {saving ? 'Processing...' : (currentAchievement.id ? 'Save Changes' : 'Confer Honor')}
                                    </button>
                                    {currentAchievement.id && (
                                        <button
                                            type="button"
                                            onClick={() => { setIsFormOpen(false); handleDeleteClick(currentAchievement.id!); }}
                                            className="px-6 py-4 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 font-bold transition-colors"
                                        >
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirm}
                title={confirmAction?.type === 'delete' ? 'Retire Honor' : 'Save Honor'}
                message={
                    confirmAction?.type === 'delete'
                        ? 'Are you sure you want to remove this achievement from the Hall of Fame? This action cannot be undone.'
                        : 'Are you sure you want to save this achievement details?'
                }
                confirmText={confirmAction?.type === 'delete' ? 'Retire' : 'Save'}
                isDestructive={confirmAction?.type === 'delete'}
                isLoading={saving}
            />
        </div>
    );
};
