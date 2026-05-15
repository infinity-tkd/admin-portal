import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { motion } from 'framer-motion';
import { Students } from './pages/Students';
import { Attendance } from './pages/Attendance';
import { Payments } from './pages/Payments';
import { Events } from './pages/Events';
import { Achievements } from './pages/Achievements';
import { Settings } from './pages/Settings';

interface PrivateRouteProps {
    children: React.ReactNode;
    roles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles }) => {
    const { user, isLoading: authLoading } = useAuth();
    const { loading: dataLoading } = useData();

    if (authLoading) return null; // Wait for auth check

    if (!user) return <Navigate to="/login" replace />;

    // ROLE CHECK
    if (roles && roles.length > 0 && user.role && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // BLOCKING DATA LOADER
    if (dataLoading) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-black flex flex-col items-center justify-center z-[9999] transition-colors duration-300">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center space-y-8"
                >
                    <div className="relative">
                        <div className="h-24 w-24 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 shadow-xl flex items-center justify-center relative overflow-hidden">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-primary/10"
                            />
                            <div className="h-12 w-12 flex items-center justify-center">
                                <img src="/logo.svg" alt="Infinity Logo" className="w-full h-full object-contain drop-shadow-lg" />
                            </div>
                        </div>
                        <div className="absolute -bottom-3 -right-3 h-8 w-8 bg-white dark:bg-[#0A0A0A] rounded-lg border border-neutral-200 dark:border-white/10 flex items-center justify-center shadow-lg">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="h-2.5 w-2.5 bg-green-500 rounded-full shadow-sm shadow-green-500/50"
                            />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-black font-display text-black dark:text-white tracking-tight">System Synchronizing</h3>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Fetching secure records...</p>
                    </div>
                    <div className="w-48 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="h-full bg-primary/20 w-1/2 rounded-full"
                        />
                    </div>
                </motion.div>
            </div>
        );
    }

    return <Layout>{children}</Layout>;
};

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
                <PrivateRoute>
                    <Dashboard />
                </PrivateRoute>
            } />

            <Route path="/students" element={
                <PrivateRoute>
                    <Students />
                </PrivateRoute>
            } />

            <Route path="/attendance" element={
                <PrivateRoute>
                    <Attendance />
                </PrivateRoute>
            } />

            <Route path="/payments" element={
                <PrivateRoute roles={['admin']}>
                    <Payments />
                </PrivateRoute>
            } />

            <Route path="/settings" element={
                <PrivateRoute roles={['admin']}>
                    <Settings />
                </PrivateRoute>
            } />

            <Route path="/events" element={
                <PrivateRoute>
                    <Events />
                </PrivateRoute>
            } />

            <Route path="/achievements" element={
                <PrivateRoute>
                    <Achievements />
                </PrivateRoute>
            } />
        </Routes>
    );
}

import { ToastProvider } from './context/ToastContext';

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <DataProvider>
                    <ToastProvider>
                        <Router>
                            <AppRoutes />
                        </Router>
                    </ToastProvider>
                </DataProvider>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
