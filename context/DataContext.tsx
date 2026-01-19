
import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { Student, Attendance, Payment, Event, Achievement } from '../types';

// Create a client
const queryClient = new QueryClient();

interface DataContextType {
    students: Student[];
    attendance: Attendance[];
    payments: Payment[];
    events: Event[];
    achievements: Achievement[];

    loading: boolean; // Initial load (isLoading)
    isFetching: boolean; // Background sync state

    refreshStudents: () => Promise<void>;
    refreshAttendance: () => Promise<void>;
    refreshPayments: () => Promise<void>;
    refreshEvents: () => Promise<void>;
    refreshAchievements: () => Promise<void>;
    refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Internal Provider Component that uses the hooks
const DataProviderContent: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const isEnabled = !!(user && user.token);

    // --- QUERY CONFIGURATION ---
    const QUERY_OPTIONS = {
        enabled: isEnabled,
        refetchInterval: 6000, // 6 seconds
        refetchIntervalInBackground: true,
        staleTime: 6000, // Data is fresh for 6s
        refetchOnWindowFocus: true,
    };

    // --- PERSISTENCE HELPER ---
    const loadFromStorage = <T,>(key: string, defaultVal: T): T => {
        try {
            const item = localStorage.getItem(`cache_${key}`);
            return item ? JSON.parse(item) : defaultVal;
        } catch { return defaultVal; }
    };

    const saveToStorage = (key: string, data: any) => {
        try { localStorage.setItem(`cache_${key}`, JSON.stringify(data)); } catch (e) { console.warn('Cache full', e); }
    };

    // --- QUERIES ---
    const studentsQuery = useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const data = await api.getStudents();
            saveToStorage('students', data);
            return data;
        },
        initialData: () => loadFromStorage('students', []),
        ...QUERY_OPTIONS
    });

    const attendanceQuery = useQuery({
        queryKey: ['attendance'],
        queryFn: async () => {
            const data = await api.getAttendance();
            saveToStorage('attendance', data);
            return data;
        },
        initialData: () => loadFromStorage('attendance', []),
        ...QUERY_OPTIONS
    });

    const paymentsQuery = useQuery({
        queryKey: ['payments'],
        queryFn: async () => {
            const data = await api.getPayments();
            saveToStorage('payments', data);
            return data;
        },
        initialData: () => loadFromStorage('payments', []),
        ...QUERY_OPTIONS
    });

    const eventsQuery = useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            const data = await api.getEvents();
            saveToStorage('events', data);
            return data;
        },
        initialData: () => loadFromStorage('events', []),
        ...QUERY_OPTIONS
    });

    const achievementsQuery = useQuery({
        queryKey: ['achievements'],
        queryFn: async () => {
            const data = await api.getAchievements();
            saveToStorage('achievements', data);
            return data;
        },
        initialData: () => loadFromStorage('achievements', []),
        ...QUERY_OPTIONS
    });

    // --- AGGREGATED STATES ---
    // Initial loading is true only if we have NO data from cache AND we are fetching
    // If we have cache, we are not "loading" in the UI sense (we show cached data)
    const initialLoading =
        (studentsQuery.isLoading && !studentsQuery.data.length) ||
        (attendanceQuery.isLoading && !attendanceQuery.data.length) ||
        (paymentsQuery.isLoading && !paymentsQuery.data.length) ||
        (eventsQuery.isLoading && !eventsQuery.data.length) ||
        (achievementsQuery.isLoading && !achievementsQuery.data.length);

    // Background fetching is true if any query is refetching
    const isFetching =
        studentsQuery.isFetching ||
        attendanceQuery.isFetching ||
        paymentsQuery.isFetching ||
        eventsQuery.isFetching ||
        achievementsQuery.isFetching;

    // Error state if any query fails
    const isError =
        studentsQuery.isError ||
        attendanceQuery.isError ||
        paymentsQuery.isError ||
        eventsQuery.isError ||
        achievementsQuery.isError;


    // --- MANUAL REFRESH WRAPPERS ---
    const refreshStudents = async () => { await queryClient.invalidateQueries({ queryKey: ['students'] }); };
    const refreshAttendance = async () => { await queryClient.invalidateQueries({ queryKey: ['attendance'] }); };
    const refreshPayments = async () => { await queryClient.invalidateQueries({ queryKey: ['payments'] }); };
    const refreshEvents = async () => { await queryClient.invalidateQueries({ queryKey: ['events'] }); };
    const refreshAchievements = async () => { await queryClient.invalidateQueries({ queryKey: ['achievements'] }); };

    const refreshAll = async () => {
        await queryClient.invalidateQueries();
    };

    return (
        <DataContext.Provider value={{
            students: studentsQuery.data,
            attendance: attendanceQuery.data,
            payments: paymentsQuery.data,
            events: eventsQuery.data,
            achievements: achievementsQuery.data,
            loading: initialLoading,
            isFetching,
            isError,
            refreshStudents, refreshAttendance, refreshPayments, refreshEvents, refreshAchievements, refreshAll
        }}>
            {children}
        </DataContext.Provider>
    );
};

// Main Exported Provider that includes QueryClientProvider
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <DataProviderContent>
                {children}
            </DataProviderContent>
        </QueryClientProvider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};
