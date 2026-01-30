import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Event } from '../types';
import { formatDate } from '../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useQueryClient } from '@tanstack/react-query';

export const Events: React.FC = () => {
    const { events: globalEvents, refreshEvents, globalLoading } = useData();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // State
    const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({});
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Filter States
    const [filterYear, setFilterYear] = useState<string>('All');
    const [filterType, setFilterType] = useState<string>('All');

    const loading = globalLoading && globalEvents.length === 0;

    useEffect(() => {
        refreshEvents();
    }, [refreshEvents]);

    const ensureDate = (dateStr: string | undefined): string => {
        if (!dateStr) return '';

        let cleanStr = String(dateStr).trim();
        if (cleanStr === 'undefined' || cleanStr === 'null') return '';

        // 0. Clean the string (remove timestamps like T00:00:00 or space 10:00)
        if (cleanStr.includes('T')) cleanStr = cleanStr.split('T')[0];
        if (cleanStr.includes(' ') && cleanStr.length > 8) cleanStr = cleanStr.split(' ')[0];

        // 1. If already YYYY-MM-DD, return it
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) return cleanStr;

        // 2. Handle DD/MM/YYYY or MM/DD/YYYY (Common in Google Sheets)
        if (cleanStr.includes('/')) {
            const parts = cleanStr.split('/');
            if (parts.length === 3) {
                const p0 = parts[0]; // Day or Month
                const p1 = parts[1]; // Month or Day
                const p2 = parts[2]; // Year

                // Case: YYYY/MM/DD
                if (p0.length === 4) return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;

                // Case: DD/MM/YYYY or MM/DD/YYYY
                // Assumption: If last part is year
                if (p2.length === 4 || p2.length === 2) {
                    const year = p2.length === 2 ? `20${p2}` : p2;
                    const month = p1.padStart(2, '0');
                    const day = p0.padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }
        }

        // 3. Handle DD-MM-YYYY or YYYY-M-D
        if (cleanStr.includes('-')) {
            const parts = cleanStr.split('-');
            if (parts.length === 3) {
                const p0 = parts[0];
                const p1 = parts[1];
                const p2 = parts[2];

                // standard YYYY-M-D (e.g. 2026-1-1)
                if (p0.length === 4) {
                    return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
                }

                // Check if p2 is year (DD-MM-YYYY)
                if (p2.length === 4 && p0.length <= 2) {
                    return `${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
                }
            }
        }

        // 4. Fallback: standard Date parsing
        const d = new Date(cleanStr);
        if (isNaN(d.getTime())) {
            console.warn(`[ensureDate] Failed to parse: ${dateStr}`);
            return '';
        }

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Derived State for Filters
    const availableYears = Array.from(new Set(globalEvents.map(e => {
        const d = ensureDate(e.eventStart);
        return d ? d.substring(0, 4) : '';
    }).filter(y => y))).sort((a, b) => (b as string).localeCompare(a as string));

    const availableTypes = Array.from(new Set(globalEvents.map(e => e.type).filter(t => t))).sort();

    // Sort & Filter
    const filteredEvents = globalEvents.filter(event => {
        const date = ensureDate(event.eventStart);
        const year = date ? date.substring(0, 4) : '';
        const matchesYear = filterYear === 'All' || year === filterYear;
        const matchesType = filterType === 'All' || event.type === filterType;
        return matchesYear && matchesType;
    });

    const sortedEvents = [...filteredEvents].sort((a, b) => {
        const dateA = new Date(ensureDate(a.eventStart)).getTime();
        const dateB = new Date(ensureDate(b.eventStart)).getTime();
        // Sort descending (latest first). Invalid dates go last.
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });

    const handleSaveClick = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentEvent.title || !currentEvent.eventStart || !currentEvent.eventClose) {
            showToast("Please fill in all required fields: Title, Event Start, Event Close.", "error");
            return;
        }
        setSaving(true);

        const saved: Event = {
            id: currentEvent.id || `EVT-${Date.now()}`,
            title: currentEvent.title || 'Untitled Event',
            type: currentEvent.type || 'Tournament',
            regStart: currentEvent.regStart || '',
            regClose: currentEvent.regClose || '',
            eventStart: currentEvent.eventStart || '',
            eventClose: currentEvent.eventClose || '',
            location: currentEvent.location || '',
            description: currentEvent.description || '',
            status: currentEvent.status as 'Open' | 'Closed' | 'Upcoming' || 'Open'
        };

        // Optimistic Update
        queryClient.setQueryData(['events'], (old: Event[] | undefined) => {
            const list = old || [];
            if (currentEvent.id) {
                return list.map(ev => ev.id === currentEvent.id ? saved : ev);
            }
            return [...list, saved];
        });

        try {
            await api.saveEvent(saved);
            await refreshEvents();
            showToast(currentEvent.id ? "Event updated successfully." : "New event created.", "success");
            setIsFormOpen(false);
            setCurrentEvent({});
        } catch (error) {
            console.error(error);
            showToast("Failed to save event.", "error");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteId(id);
        setIsConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setSaving(true);
        try {
            // Optimistic Delete
            queryClient.setQueryData(['events'], (old: Event[] | undefined) => (old || []).filter(e => e.id !== deleteId));

            await api.deleteEvent(deleteId);
            await refreshEvents();
            showToast("Event deleted successfully.", "success");
            setIsConfirmOpen(false);
            setDeleteId(null);
            // If deleting from within the modal, close form
            if (isFormOpen && currentEvent.id === deleteId) {
                setIsFormOpen(false);
                setCurrentEvent({});
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to delete event.", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="h-12 w-12 border-[5px] border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="font-display font-black text-slate-400 uppercase tracking-widest text-[10px]">Mapping Timeline</p>
        </div>
    );

    return (
        <div className="space-y-12 pb-24">
            {/* CINEMATIC HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-end gap-5">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-accent mb-1">Grand Calendar</p>
                    <h2 className="text-3xl font-black font-display text-slate-900 tracking-tight leading-tight">Timeline & <br />Assessments</h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* FILTERS */}
                    <div className="flex items-center space-x-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-600 outline-none px-3 py-2 cursor-pointer hover:text-slate-900"
                        >
                            <option value="All">All Years</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-600 outline-none px-3 py-2 cursor-pointer hover:text-slate-900"
                        >
                            <option value="All">All Types</option>
                            {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            setCurrentEvent({
                                eventStart: today,
                                eventClose: today,
                                regStart: today,
                                regClose: today,
                                status: 'Open',
                                type: 'Tournament'
                            });
                            setIsFormOpen(true);
                        }}
                        className="bg-primary text-white px-6 py-3.5 rounded-lg font-black text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-slate-900 transition-all flex items-center space-x-2.5 active:scale-95"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        <span>Add Event</span>
                    </button>
                </div>
            </div>

            {/* EVENT GRID */}
            {sortedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="bg-slate-50 p-6 rounded-full">
                        <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <p className="font-display font-bold text-slate-400">No events found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                        {sortedEvents.map((event, i) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                                key={event.id}
                                className="bg-white rounded-xl p-5 md:p-7 border border-slate-200 shadow-sm flex flex-col hover:shadow-xl transition-all duration-500 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-accent opacity-[0.02] rounded-bl-full group-hover:scale-110 transition-transform duration-700 pointer-events-none" />

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex flex-col space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${event.status === 'Open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                event.status === 'Closed' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    event.status === 'Completed' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                        'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                {event.status}
                                            </span>
                                            <span className="px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-200">
                                                {event.type}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Safe measure
                                            setCurrentEvent({
                                                ...event,
                                                eventStart: ensureDate(event.eventStart),
                                                eventClose: ensureDate(event.eventClose),
                                                regStart: ensureDate(event.regStart),
                                                regClose: ensureDate(event.regClose),
                                            });
                                            setIsFormOpen(true);
                                        }}
                                        className="h-8 w-8 rounded-md bg-white border border-slate-100 text-slate-400 hover:text-accent flex items-center justify-center shadow-sm opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all cursor-pointer"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                </div>

                                <h3 className="text-xl font-black font-display text-slate-900 mb-4 leading-tight group-hover:text-accent transition-colors duration-500">{event.title}</h3>

                                <div className="space-y-3 mb-5 border-t border-slate-100 pt-4">
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Event Schedule</p>
                                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                                            <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span>{formatDate(event.eventStart)} - {formatDate(event.eventClose)}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Registration Window</p>
                                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
                                            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            <span>{formatDate(event.regStart)} - {formatDate(event.regClose)}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Location</p>
                                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
                                            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                    </div>
                                </div>

                                {event.description && (
                                    <div className="mt-auto">
                                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 border-t border-slate-100 pt-3">
                                            {event.description}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

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
                            className="relative bg-white rounded-t-2xl lg:rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] lg:max-h-[90vh] mt-auto lg:mt-0"
                        >
                            <header className="px-6 py-5 lg:px-8 lg:py-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 backdrop-blur-xl sticky top-0 z-10">
                                <div>
                                    <p className="text-[9px] uppercase font-black text-accent tracking-[.2em] mb-1 leading-none">Event Forge</p>
                                    <h3 className="text-xl font-black font-display text-slate-900 tracking-tight leading-none">
                                        {currentEvent.id ? 'Refine Event' : 'Craft Event'}
                                    </h3>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="h-9 w-9 rounded-full bg-white border border-slate-100 text-slate-300 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </header>

                            <form id="event-form" onSubmit={handleSaveClick} className="flex-1 overflow-y-auto p-5 lg:p-8 pb-24 lg:pb-8 space-y-6">
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Event Name</label>
                                        <input
                                            required
                                            placeholder="e.g., National Championship 2026"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all font-bold text-slate-900 text-lg"
                                            value={currentEvent.title || ''}
                                            onChange={e => setCurrentEvent({ ...currentEvent, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Type</label>
                                        <select
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-900 text-sm appearance-none"
                                            value={currentEvent.type || 'Tournament'}
                                            onChange={e => setCurrentEvent({ ...currentEvent, type: e.target.value })}
                                        >
                                            <option value="Tournament">Tournament</option>
                                            <option value="Grading">Grading</option>
                                            <option value="Seminar">Seminar</option>
                                            <option value="Workshop">Workshop</option>
                                            <option value="Social">Social</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Status</label>
                                        <select
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-900 text-sm appearance-none"
                                            value={currentEvent.status || 'Open'}
                                            onChange={e => setCurrentEvent({ ...currentEvent, status: e.target.value as any })}
                                        >
                                            <option value="Open">Open</option>
                                            <option value="Closed">Closed</option>
                                            <option value="Upcoming">Upcoming</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                </div>

                                {/* DATE SECTION */}
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Event Start</label>
                                            <input type="date" required className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-accent"
                                                value={currentEvent.eventStart || ''}
                                                onChange={e => setCurrentEvent({ ...currentEvent, eventStart: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Reg Start</label>
                                                <input
                                                    type="date" required
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-900 text-sm"
                                                    value={currentEvent.regStart ? new Date(currentEvent.regStart).toISOString().split('T')[0] : ''}
                                                    onChange={e => setCurrentEvent({ ...currentEvent, regStart: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Reg Close</label>
                                                <input
                                                    type="date" required
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-900 text-sm"
                                                    value={currentEvent.regClose ? new Date(currentEvent.regClose).toISOString().split('T')[0] : ''}
                                                    onChange={e => setCurrentEvent({ ...currentEvent, regClose: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Event Start</label>
                                                <input
                                                    type="datetime-local" required
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-900 text-sm"
                                                    // Handle datetime-local format: YYYY-MM-DDTHH:mm
                                                    value={currentEvent.eventStart ? new Date(currentEvent.eventStart).toISOString().slice(0, 16) : ''}
                                                    onChange={e => setCurrentEvent({ ...currentEvent, eventStart: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Event Close</label>
                                                <input
                                                    type="datetime-local" required
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-900 text-sm"
                                                    value={currentEvent.eventClose ? new Date(currentEvent.eventClose).toISOString().slice(0, 16) : ''}
                                                    onChange={e => setCurrentEvent({ ...currentEvent, eventClose: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Location</label>
                                    <input
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-sm"
                                        value={currentEvent.location || ''}
                                        onChange={e => setCurrentEvent({ ...currentEvent, location: e.target.value })}
                                        placeholder="Detailed venue address..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Description</label>
                                    <textarea
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-sm h-24 resize-none"
                                        placeholder="Additional event details..."
                                        value={currentEvent.description || ''}
                                        onChange={e => setCurrentEvent({ ...currentEvent, description: e.target.value })}
                                    />
                                </div>


                            </form>
                            <div className="px-6 py-5 border-t border-slate-100 bg-white/90 backdrop-blur-xl sticky bottom-0 z-20 flex items-center space-x-3">
                                <button
                                    form="event-form"
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-primary text-white py-4 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-slate-900 disabled:opacity-50 active:scale-95 transition-all outline-none"
                                >
                                    {saving ? 'Processing...' : (currentEvent.id ? 'Save Changes' : 'Create Event')}
                                </button>

                                {currentEvent.id && (
                                    <button
                                        type="button"
                                        onClick={() => { setIsFormOpen(false); confirmDelete(currentEvent.id!); }}
                                        className="px-6 py-4 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 font-bold transition-colors"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Delete Event"
                message="Are you sure you want to permanently delete this event? This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
                isLoading={saving}
            />
        </div >
    );
};