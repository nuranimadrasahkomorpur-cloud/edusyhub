'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTANT' | 'TEACHER' | 'GUARDIAN' | 'STUDENT' | 'DEMO';

interface User {
    id: string;
    email: string;
    name?: string;
    role: Role;
    defaultInstituteId?: string;
    institutes?: any[];
    teacherProfiles?: any[];
    faceDescriptor?: number[];
    metadata?: {
        classId?: string;
        [key: string]: any;
    };
}

interface SessionContextType {
    user: User | null;
    activeRole: Role | null;
    activeInstitute: any | null;
    login: (user: User) => void;
    logout: () => void;
    switchRole: (role: Role) => void;
    switchInstitute: (institute: any) => void;
    refreshInstitutes: (institute: any) => void;
    setAllInstitutes: (institutes: any[]) => void;
    isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [activeRole, setActiveRole] = useState<Role | null>(null);
    const [activeInstitute, setActiveInstitute] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('edusy_session');
        const savedRole = localStorage.getItem('edusy_active_role');
        const savedInstitute = localStorage.getItem('edusy_active_institute');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);

            let initialRole = (savedRole as Role) || parsedUser.role;

            // Auto-promote to GUARDIAN if user is a student but has guardian metadata
            if (initialRole === 'STUDENT' && (parsedUser.metadata?.childrenIds?.length > 0 || parsedUser.metadata?.studentId)) {
                initialRole = 'GUARDIAN';
            }

            setActiveRole(initialRole);
            if (savedInstitute) {
                setActiveInstitute(JSON.parse(savedInstitute));
            }

            // Fetch fresh session details from server in the background
            const refreshSession = async () => {
                try {
                    const res = await fetch('/api/auth/session');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.user) {
                            setUser(data.user);
                            localStorage.setItem('edusy_session', JSON.stringify(data.user));

                            // Refresh active institute if it exists and details changed
                            const currentActive = localStorage.getItem('edusy_active_institute');
                            if (currentActive) {
                                const parsedActive = JSON.parse(currentActive);
                                const freshInst = data.user.institutes.find((i: any) => i.id === parsedActive.id);
                                if (freshInst) {
                                    setActiveInstitute(freshInst);
                                    localStorage.setItem('edusy_active_institute', JSON.stringify(freshInst));
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to auto-refresh session:', err);
                }
            };
            refreshSession();
        }
        setIsLoading(false);
    }, []);

    const login = React.useCallback((newUser: User) => {
        setUser(newUser);

        let initialRole = newUser.role;
        // Auto-promote to GUARDIAN if user is a student but has guardian metadata
        if (initialRole === 'STUDENT' && (newUser.metadata?.childrenIds?.length > 0 || newUser.metadata?.studentId)) {
            initialRole = 'GUARDIAN';
        }

        setActiveRole(initialRole);
        // Set initial active institute
        if (newUser.institutes && newUser.institutes.length > 0) {
            const defaultInst = newUser.institutes.find((i: any) => i.id === newUser.defaultInstituteId) || newUser.institutes[0];
            setActiveInstitute(defaultInst);
            localStorage.setItem('edusy_active_institute', JSON.stringify(defaultInst));
        }
        localStorage.setItem('edusy_session', JSON.stringify(newUser));
        localStorage.setItem('edusy_active_role', initialRole);
    }, []);

    const logout = React.useCallback(async () => {
        // Clear server-side cookie so proxy knows session is gone
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (_) { /* silently ignore network errors */ }
        setUser(null);
        setActiveRole(null);
        setActiveInstitute(null);
        localStorage.removeItem('edusy_session');
        localStorage.removeItem('edusy_active_role');
        localStorage.removeItem('edusy_active_institute');
        window.location.href = '/entrance';
    }, []);

    const switchRole = React.useCallback((role: Role) => {
        // if (user?.role === 'SUPER_ADMIN') { // Removed check to allow switching for now if logic permits
        setActiveRole(role);
        localStorage.setItem('edusy_active_role', role);
        // }
    }, []);

    const switchInstitute = React.useCallback((institute: any) => {
        setActiveInstitute(institute);
        localStorage.setItem('edusy_active_institute', JSON.stringify(institute));
    }, []);

    const refreshInstitutes = React.useCallback((updatedInstitute: any) => {
        setUser(prevUser => {
            if (!prevUser) return null;

            const currentInstitutes = prevUser.institutes || [];
            const index = currentInstitutes.findIndex(i => i.id === updatedInstitute.id);
            let newInstitutes;

            if (index !== -1) {
                newInstitutes = [...currentInstitutes];
                newInstitutes[index] = { ...newInstitutes[index], ...updatedInstitute };
            } else {
                newInstitutes = [...currentInstitutes, updatedInstitute];
            }

            const newUser = { ...prevUser, institutes: newInstitutes };
            localStorage.setItem('edusy_session', JSON.stringify(newUser));

            // Update active institute if needed (inside callback to access fresh state via closure issue? No, use functional update for user, but activeInstitute is separate state)
            // We need access to activeInstitute here. To avoid stale closure, let's access activeInstitute via ref or dependency?
            // Actually, activeInstitute is state. If we add it to dependency, refreshInstitutes changes often.
            // Let's just update local storage for safety and handle activeInstitute separately if we can.
            // OR, just update active institute if IDs match.
            // We need current `activeInstitute` to check ID.
            // Let's rely on component re-render or check localStorage?
            const currentActive = localStorage.getItem('edusy_active_institute');
            if (currentActive) {
                const parsedActive = JSON.parse(currentActive);
                if (parsedActive.id === updatedInstitute.id) {
                    const newActive = { ...parsedActive, ...updatedInstitute };
                    localStorage.setItem('edusy_active_institute', JSON.stringify(newActive));
                    setActiveInstitute(newActive); // This might be slightly stale if called rapidly but safe for now
                }
            }

            return newUser;
        });
    }, []);

    const setAllInstitutes = React.useCallback((institutes: any[]) => {
        setUser(prevUser => {
            if (!prevUser) return null;
            const newUser = { ...prevUser, institutes };
            localStorage.setItem('edusy_session', JSON.stringify(newUser));
            return newUser;
        });

        // Also update active institute from new list if it exists
        // We use functional update for setAllInstitutes to avoid dependency on activeInstitute state
        // access via localStorage for consistent latest
        const currentActiveInfo = localStorage.getItem('edusy_active_institute');
        if (currentActiveInfo) {
            const parsedActive = JSON.parse(currentActiveInfo);
            const freshActive = institutes.find(i => i.id === parsedActive.id);
            if (freshActive) {
                setActiveInstitute(freshActive);
                localStorage.setItem('edusy_active_institute', JSON.stringify(freshActive));
            }
        }
    }, []);

    const contextValue = React.useMemo(() => ({
        user,
        activeRole,
        activeInstitute,
        login,
        logout,
        switchRole,
        switchInstitute,
        refreshInstitutes,
        setAllInstitutes,
        isLoading
    }), [user, activeRole, activeInstitute, login, logout, switchRole, switchInstitute, refreshInstitutes, setAllInstitutes, isLoading]);

    return (
        <SessionContext.Provider value={contextValue}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}
