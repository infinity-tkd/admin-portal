import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// 15 minutes in milliseconds
const TIMEOUT_MS = 15 * 60 * 1000;

export const AutoLogout: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Only set the timeout if a user is logged in
    if (user) {
      timeoutRef.current = setTimeout(() => {
        logout();
        showToast("Session expired due to inactivity. Please log in again.", "error");
      }, TIMEOUT_MS);
    }
  };

  useEffect(() => {
    // Events that count as user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      // Throttle the resets slightly to prevent performance issues on mousemove
      resetTimeout();
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timeout
    resetTimeout();

    // Cleanup
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, logout, showToast]);

  // This component doesn't render anything visible
  return null;
};
