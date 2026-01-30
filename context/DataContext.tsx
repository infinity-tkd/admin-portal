
import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api, AdminUser, StudentLogin } from '../services/api';
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

    // New Data
    users: AdminUser[];
    studentLogins: StudentLogin[];
    refreshUsers: () => Promise<void>;
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

    // --- MASTER QUERY ---
    const masterQuery = useQuery({
        queryKey: ['masterData'],
        queryFn: async () => {
            const data = await api.getInitialData();
            // Cache individual parts for consistent access if needed later
            saveToStorage('students', data.students || []);
            saveToStorage('attendance', data.attendance || []);
            saveToStorage('payments', data.payments || []);
            saveToStorage('events', data.events || []);
            saveToStorage('achievements', data.achievements || []);
            if (data.users) saveToStorage('users', data.users);
            if (data.studentLogins) saveToStorage('studentLogins', data.studentLogins);
            return data;
        },
        initialData: () => ({
            students: loadFromStorage('students', []),
            attendance: loadFromStorage('attendance', []),
            payments: loadFromStorage('payments', []),
            events: loadFromStorage('events', []),
            achievements: loadFromStorage('achievements', []),
            users: loadFromStorage('users', []),
            studentLogins: loadFromStorage('studentLogins', [])
        }),
        ...QUERY_OPTIONS
    });

    // --- DERIVED STATE ---
    // We use the master query result for everything now
    const students = masterQuery.data?.students || [];
    const attendance = masterQuery.data?.attendance || [];
    const payments = masterQuery.data?.payments || [];
    const events = masterQuery.data?.events || [];
    const achievements = masterQuery.data?.achievements || [];
    const users = masterQuery.data?.users || [];
    const studentLogins = masterQuery.data?.studentLogins || [];

    // --- AGGREGATED STATES ---
    const initialLoading = masterQuery.isLoading && !students.length;
    const isFetching = masterQuery.isFetching;
    const isError = masterQuery.isError;


    // --- MANUAL REFRESH WRAPPERS ---
    // Invalidate everything since it's all one query now
    const refreshAll = async () => { await queryClient.invalidateQueries({ queryKey: ['masterData'] }); };

    // For backward compatibility / specific refresh intent, we just reload the master
    const refreshStudents = refreshAll;
    const refreshAttendance = refreshAll;
    const refreshPayments = refreshAll;
    const refreshEvents = refreshAll;
    const refreshAchievements = refreshAll;
    const refreshUsers = refreshAll;


    return (
        <DataContext.Provider value={{
            students, attendance, payments, events, achievements, users, studentLogins,
            loading: initialLoading,
            isFetching,
            isError,
            refreshStudents, refreshAttendance, refreshPayments, refreshEvents, refreshAchievements, refreshUsers, refreshAll
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
