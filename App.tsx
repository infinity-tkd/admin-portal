import React from 'react';
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

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading: authLoading } = useAuth();
    const { loading: dataLoading } = useData();

    if (authLoading) return null; // Wait for auth check

    if (!user) return <Navigate to="/login" replace />;

    // BLOCKING DATA LOADER
    if (dataLoading) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-[9999]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center space-y-8"
                >
                    <div className="relative">
                        <div className="h-24 w-24 rounded-2xl bg-white border border-slate-100 shadow-xl flex items-center justify-center relative overflow-hidden">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-primary/10"
                            />
                            <div className="h-12 w-12 bg-primary rounded flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-primary/20">
                                ∞
                            </div>
                        </div>
                        <div className="absolute -bottom-3 -right-3 h-8 w-8 bg-white rounded-lg border border-slate-100 flex items-center justify-center shadow-lg">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="h-2.5 w-2.5 bg-green-500 rounded-full shadow-sm shadow-green-500/50"
                            />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-black font-display text-slate-900 tracking-tight">System Synchronizing</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fetching secure records...</p>
                    </div>
                    <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
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
                <PrivateRoute>
                    <Payments />
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
        <AuthProvider>
            <DataProvider>
                <ToastProvider>
                    <Router>
                        <AppRoutes />
                    </Router>
                </ToastProvider>
            </DataProvider>
        </AuthProvider>
    );
};

export default App;
