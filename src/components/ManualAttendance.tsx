'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Check,
    X,
    Clock,
    Search,
    CheckSquare,
    Square,
    Save,
    ChevronDown,
    Loader2,
    Users,
    Calendar as CalendarIcon,
    Minus,
    Trash2,
    MoreVertical,
    Phone,
    MessageSquare,
    Edit3,
    UserCircle,
    Clock8,
    LayoutGrid,
    Table2,
    ChevronUp,
    ChevronsUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from './SessionProvider';
import { useUI } from './UIProvider';
import dynamic from 'next/dynamic';
import Modal from './Modal';
import AttendanceSummary from './AttendanceSummary';

const StudentProfileModal = dynamic(() => import('./StudentProfileModal'), { ssr: false });

interface Student {
    id: string;
    name: string;
    rollNumber?: string;
    photo?: string;
    phone?: string;
    email?: string;
    attendance?: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'LEAVE_PENDING';
    initialAttendance?: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'LEAVE_PENDING';
    updatedAt?: string;
    stats?: {
        totalDays: number;
        totalSchoolDays: number;
        presentDays: number;
        lateDays: number;
        absentDays: number;
        percentage: number;
    };
    classId?: string;
    className?: string;
    metadata?: any;
}

export default function ManualAttendance({ classId, selectedDate }: { classId: string, selectedDate: string }) {
    const { activeInstitute, activeRole, user } = useSession();
    const isAdmin = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN';
    const isTeacher = activeRole === 'TEACHER';

    // Determine if the current teacher has attendance permission for this specific class
    const hasAttendancePerm = useMemo(() => {
        if (isAdmin) return true;
        if (!isTeacher || !user?.teacherProfiles || !activeInstitute?.id || !classId || classId === 'all') return isAdmin;
        const profile = (user.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute.id);
        if (!profile) return false;
        if (profile.isAdmin === true) return true;
        const classPerm = profile.permissions?.classWise?.[classId];
        if (!classPerm) return false;
        if (typeof classPerm === 'object' && Array.isArray(classPerm.permissions)) {
            return classPerm.permissions.includes('canTakeAttendance');
        }
        if (Array.isArray(classPerm)) return classPerm.includes('canTakeAttendance');
        if (typeof classPerm === 'object') return classPerm.canTakeAttendance === true;
        return false;
    }, [isAdmin, isTeacher, user, activeInstitute?.id, classId]);

    // Teachers without the permission see a read-only view
    const isReadOnlyAttendance = isTeacher && !hasAttendancePerm;

    const ui = useUI();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LEAVE' | 'LEAVE_PENDING'>('ALL');
    const [toast, setToast] = useState<{ message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' } | null>(null);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
    const [modalTab, setModalTab] = useState<'fees' | 'attendance' | 'assignments' | 'login' | 'face'>('fees');
    const [viewMode, setViewMode] = useState<'CARD' | 'REGISTER'>('CARD');
    const [registerData, setRegisterData] = useState<Record<string, Record<string, string>>>({});
    const [registerLoading, setRegisterLoading] = useState(false);
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [visibleDays, setVisibleDays] = useState<number[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const showToast = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' = 'SUCCESS') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Derive month string e.g. "2026-05" from selectedDate
    const monthStr = selectedDate ? selectedDate.substring(0, 7) : '';
    // Number of days in the selected month
    const daysInMonth = selectedDate ? new Date(parseInt(selectedDate.substring(0,4)), parseInt(selectedDate.substring(5,7)), 0).getDate() : 31;
    // Array of day numbers [1..daysInMonth]
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    useEffect(() => {
        setVisibleDays(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    }, [daysInMonth]);

    const fetchRegisterData = async () => {
        if (!activeInstitute?.id || !monthStr) return;

        const isAdminUser = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || (() => {
            const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            return profile?.isAdmin === true;
        })();

        if (activeRole === 'TEACHER' && !isAdminUser) {
            if (!classId || classId === 'all') {
                setRegisterData({});
                return;
            }
            const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            const classPermissions = profile?.permissions?.classWise?.[classId];
            let hasPerm = false;
            if (classPermissions) {
                if (typeof classPermissions === 'object' && classPermissions.permissions && Array.isArray(classPermissions.permissions)) {
                    hasPerm = classPermissions.permissions.includes('canTakeAttendance');
                } else if (Array.isArray(classPermissions)) {
                    hasPerm = classPermissions.includes('canTakeAttendance');
                } else if (typeof classPermissions === 'object') {
                    hasPerm = classPermissions.canTakeAttendance === true;
                }
            }
            if (!hasPerm) {
                setRegisterData({});
                return;
            }
        }

        setRegisterLoading(true);
        try {
            const fetchClassId = classId || 'all';
            const res = await fetch(`/api/attendance/list?instituteId=${activeInstitute.id}&classId=${fetchClassId}&month=${monthStr}`);
            if (res.ok) {
                const records: any[] = await res.json();
                // Build map: studentId -> { dateString -> status }
                const map: Record<string, Record<string, string>> = {};
                records.forEach(r => {
                    if (!map[r.studentId]) map[r.studentId] = {};
                    map[r.studentId][r.dateString] = r.status;
                });
                setRegisterData(map);
            }
        } catch (err) {
            console.error('Error fetching register data:', err);
        } finally {
            setRegisterLoading(false);
        }
    };

    const storageKey = `attendance_draft_${activeInstitute?.id}_${selectedDate}`;

    // Close dropdown on click outside
    useEffect(() => {
        const handleClick = () => setActiveActionId(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const openProfileModal = (student: Student, tab: typeof modalTab = 'attendance') => {
        setModalTab(tab);
        setSelectedStudentForModal(student);
        setActiveActionId(null);
    };

    // Sync to localStorage
    useEffect(() => {
        if (!loading && students.length > 0) {
            const hasChanges = students.some(s => s.attendance !== s.initialAttendance);
            if (hasChanges) {
                const draft = students.reduce((acc, s) => {
                    if (s.attendance !== s.initialAttendance) {
                        acc[s.id] = s.attendance;
                    }
                    return acc;
                }, {} as Record<string, any>);
                localStorage.setItem(storageKey, JSON.stringify(draft));
            } else {
                localStorage.removeItem(storageKey);
            }
        }
    }, [students, storageKey, loading]);

    useEffect(() => {
        if (classId !== undefined && activeInstitute?.id) {
            fetchStudents();
        }
    }, [classId, selectedDate, activeInstitute?.id]);

    const fetchStudents = async () => {
        if (!activeInstitute?.id) return;

        const isAdminUser = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || (() => {
            const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            return profile?.isAdmin === true;
        })();

        if (activeRole === 'TEACHER' && !isAdminUser) {
            if (!classId || classId === 'all') {
                setStudents([]);
                setLoading(false);
                return;
            }
            const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            const classPermissions = profile?.permissions?.classWise?.[classId];
            let hasPerm = false;
            if (classPermissions) {
                if (typeof classPermissions === 'object' && classPermissions.permissions && Array.isArray(classPermissions.permissions)) {
                    hasPerm = classPermissions.permissions.includes('canTakeAttendance');
                } else if (Array.isArray(classPermissions)) {
                    hasPerm = classPermissions.includes('canTakeAttendance');
                } else if (typeof classPermissions === 'object') {
                    hasPerm = classPermissions.canTakeAttendance === true;
                }
            }
            if (!hasPerm) {
                setStudents([]);
                setLoading(false);
                return;
            }
        }

        setLoading(true);
        try {
            // Fetch students, attendance, and stats in parallel
            const fetchClassId = classId || 'all';
            const [studentsRes, attendanceRes, statsRes] = await Promise.all([
                fetch(`/api/admin/users?role=STUDENT&classId=${fetchClassId}&instituteId=${activeInstitute?.id}`),
                fetch(`/api/attendance/list?instituteId=${activeInstitute?.id}&date=${selectedDate}&classId=${fetchClassId}`),
                fetch(`/api/attendance/stats?instituteId=${activeInstitute?.id}&classId=${fetchClassId}`)
            ]);

            if (studentsRes.ok) {
                const studentsData = await studentsRes.json();
                const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
                const statsData = statsRes.ok ? await statsRes.json() : [];

                const statsMap = new Map(statsData.map((s: any) => [s.studentId, s]));

                const normalizeId = (id: any) => {
                    if (!id) return null;
                    if (typeof id === 'object' && id?.$oid) return id.$oid;
                    return String(id);
                };

                const mappedStudents = studentsData.map((s: any) => {
                    const existing = attendanceData.find((a: any) => normalizeId(a.studentId) === s.id);
                    const status = existing?.status || 'ABSENT';
                    return {
                        id: s.id,
                        name: s.name,
                        rollNumber: s.metadata?.rollNumber,
                        photo: s.metadata?.studentPhoto,
                        phone: s.phone || s.metadata?.studentPhone || s.metadata?.guardianPhone,
                        email: s.email,
                        attendance: status,
                        initialAttendance: status,
                        updatedAt: existing?.updatedAt,
                        stats: statsMap.get(s.id),
                        classId: s.metadata?.classId,
                        className: s.metadata?.className,
                        metadata: s.metadata // Keep all for modal
                    };
                });

                // Check for localStorage draft
                const savedDraft = localStorage.getItem(storageKey);
                if (savedDraft) {
                    try {
                        const draft = JSON.parse(savedDraft);
                        mappedStudents.forEach((s: any) => {
                            if (draft[s.id]) {
                                s.attendance = draft[s.id];
                            }
                        });
                    } catch (e) {
                        console.error('Error parsing attendance draft:', e);
                    }
                }

                setStudents(mappedStudents);
            }
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = (id: string, status: Student['attendance']) => {
        if (isReadOnlyAttendance) return;
        setStudents(prev => prev.map(s => s.id === id ? {
            ...s,
            attendance: status,
            updatedAt: status !== 'ABSENT' ? new Date().toISOString() : s.updatedAt
        } : s));
    };

    const bulkUpdate = (status: Student['attendance'] | 'RESET') => {
        if (isReadOnlyAttendance) return;
        const now = new Date().toISOString();
        setStudents(prev => prev.map(s => {
            // Prevent teachers from modifying already pending leaves via bulk actions
            if (!isAdmin && s.initialAttendance === 'LEAVE_PENDING' && status !== 'RESET') {
                return s;
            }

            let finalStatus = status === 'RESET' ? s.initialAttendance : status;
            
            // Redirect LEAVE to LEAVE_PENDING for teachers
            if (isTeacher && finalStatus === 'LEAVE') {
                finalStatus = 'LEAVE_PENDING';
            }

            return {
                ...s,
                attendance: finalStatus,
                updatedAt: (status !== 'RESET' && finalStatus !== 'ABSENT') ? now : s.updatedAt
            };
        }));
    };

    const handleNameIdSort = () => {
        setSortConfig(current => {
            if (!current || (current.key !== 'name' && current.key !== 'id')) return { key: 'name', direction: 'asc' };
            if (current.key === 'name' && current.direction === 'asc') return { key: 'name', direction: 'desc' };
            if (current.key === 'name' && current.direction === 'desc') return { key: 'id', direction: 'asc' };
            if (current.key === 'id' && current.direction === 'asc') return { key: 'id', direction: 'desc' };
            return null; // id desc -> reset
        });
    };

    const handleQuickCellUpdate = async (studentId: string, dateString: string, currentStatus: string | undefined, classIdFromStudent: string | undefined) => {
        if (!activeInstitute?.id) return;
        if (isReadOnlyAttendance) return;
        
        // Determine next status: (none/undefined) -> PRESENT -> ABSENT -> LATE -> LEAVE -> NONE -> PRESENT...
        const statuses = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'NONE'];
        let nextStatusIndex = 0;
        if (currentStatus) {
            // Treat LEAVE_PENDING as LEAVE for the cycle
            const normalizedStatus = currentStatus === 'LEAVE_PENDING' ? 'LEAVE' : currentStatus;
            const idx = statuses.indexOf(normalizedStatus);
            if (idx !== -1) {
                nextStatusIndex = (idx + 1) % statuses.length;
            }
        }
        
        const nextStatus = statuses[nextStatusIndex];
        
        // Optimistic UI update in register view
        setRegisterData(prev => {
            const next = { ...prev };
            if (!next[studentId]) next[studentId] = {};
            if (nextStatus === 'NONE') {
                delete next[studentId][dateString];
            } else {
                next[studentId] = {
                    ...next[studentId],
                    [dateString]: nextStatus
                };
            }
            return next;
        });

        // If it's the currently selected date, also update the main students list
        if (dateString === selectedDate) {
            setStudents(prev => prev.map(s => {
                if (s.id !== studentId) return s;
                return {
                    ...s,
                    attendance: nextStatus === 'NONE' ? 'ABSENT' : nextStatus as any,
                    initialAttendance: nextStatus === 'NONE' ? 'ABSENT' : nextStatus as any // auto-saved
                };
            }));
        }

        // Save immediately in the background
        try {
            if (nextStatus === 'NONE') {
                await fetch('/api/attendance/unmark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, dateString })
                });
            } else {
                await fetch('/api/attendance/mark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId,
                        instituteId: activeInstitute.id,
                        classId: classIdFromStudent || classId || 'all',
                        dateString,
                        status: nextStatus,
                        method: 'MANUAL'
                    })
                });
            }
        } catch (error) {
            console.error('Failed to quick save cell:', error);
        }
    };

    const handleSave = async () => {
        if (isReadOnlyAttendance) return;
        const changedStudents = students.filter(s => s.attendance !== s.initialAttendance);
        if (changedStudents.length === 0) return;

        setSaving(true);
        try {
            const promises = changedStudents.map(s =>
                fetch('/api/attendance/mark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: s.id,
                        instituteId: activeInstitute?.id,
                        classId: s.classId || classId,
                        dateString: selectedDate,
                        status: s.attendance,
                        method: 'MANUAL'
                    })
                })
            );
            await Promise.all(promises);

            // Sync initial state after successful save
            setStudents(prev => prev.map(s => {
                const savedStatus = s.attendance;
                return {
                    ...s,
                    initialAttendance: savedStatus as any,
                    attendance: savedStatus as any,
                    updatedAt: s.updatedAt // Preserve the timestamp we just set
                };
            }));

            // Clear draft
            localStorage.removeItem(storageKey);

            // Show success toast
            showToast('হাজিরা সফলভাবে সংরক্ষিত হয়েছে।', 'SUCCESS');
        } catch (err) {
            console.error('Error saving attendance:', err);
            showToast('হাজিরা সেভ করতে সমস্যা হয়েছে।', 'ERROR');
        } finally {
            setSaving(false);
        }
    };

    const handleClearSaved = async () => {
        const savedStudents = students.filter(s => s.initialAttendance !== 'ABSENT' || s.updatedAt);
        if (savedStudents.length === 0) return;

        if (!await ui.confirm('আপনি কি আজকের সমস্ত হাজিরা রেকর্ড মুছে ফেলতে চান? এটি রিপোর্ট থেকেও মুছে যাবে।')) {
            return;
        }

        setSaving(true);
        try {
            const promises = savedStudents.map(s =>
                fetch('/api/attendance/unmark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: s.id,
                        dateString: selectedDate
                    })
                })
            );
            await Promise.all(promises);

            // Reset state
            setStudents(prev => prev.map(s => ({
                ...s,
                attendance: 'ABSENT',
                initialAttendance: 'ABSENT',
                updatedAt: undefined
            })));

            localStorage.removeItem(storageKey);
            showToast('সমস্ত হাজিরা রেকর্ড মুছে ফেলা হয়েছে।', 'SUCCESS');
        } catch (err) {
            console.error('Error clearing attendance:', err);
            showToast('হাজিরা মুছতে সমস্যা হয়েছে।', 'ERROR');
        } finally {
            setSaving(false);
        }
    };

    const sortedAllStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));
    const studentsWithRoll = sortedAllStudents.map((s, idx) => ({ ...s, assignedRoll: idx + 1 }));

    // Calculate total active class days for the month
    const activeClassDays = useMemo(() => {
        const days = new Set<string>();
        Object.values(registerData).forEach(studentData => {
            Object.keys(studentData).forEach(date => {
                if (studentData[date] && date.startsWith(monthStr)) {
                    days.add(date);
                }
            });
        });
        return days.size;
    }, [registerData, monthStr]);

    // Pre-calculate present count for sorting
    const studentsWithStats = studentsWithRoll.map(student => {
        const sData = registerData[student.id] || {};
        let presentCount = 0;
        let totalCount = 0;
        monthDays.forEach(day => {
            const dayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
            const status = sData[dayStr];
            if (status) totalCount++;
            if (status === 'PRESENT' || status === 'LATE') presentCount++;
        });
        return { ...student, presentCount, totalCount, sData };
    });

    let filteredStudents = studentsWithStats.filter(s => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = s.name.toLowerCase().includes(query) || 
                              s.assignedRoll.toString() === query ||
                              s.metadata?.studentId === query;
        const matchesStatus = statusFilter === 'ALL' || s.attendance === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (sortConfig) {
        filteredStudents.sort((a, b) => {
            let valA: any = 0;
            let valB: any = 0;

            if (sortConfig.key === 'roll') {
                valA = a.assignedRoll;
                valB = b.assignedRoll;
            } else if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            } else if (sortConfig.key === 'id') {
                valA = parseInt(a.metadata?.studentId || '0', 10);
                valB = parseInt(b.metadata?.studentId || '0', 10);
                if (isNaN(valA)) valA = a.metadata?.studentId || '';
                if (isNaN(valB)) valB = b.metadata?.studentId || '';
            } else if (sortConfig.key === 'totalP') {
                valA = a.presentCount;
                valB = b.presentCount;
            } else if (sortConfig.key === 'percentage') {
                valA = activeClassDays > 0 ? a.presentCount / activeClassDays : -1;
                valB = activeClassDays > 0 ? b.presentCount / activeClassDays : -1;
            } else if (sortConfig.key.startsWith('date_')) {
                const dateStr = sortConfig.key.replace('date_', '');
                const statusWeight = (status: string | undefined) => {
                    if (status === 'PRESENT') return 4;
                    if (status === 'LATE') return 3;
                    if (status === 'LEAVE' || status === 'LEAVE_PENDING') return 2;
                    if (status === 'ABSENT') return 1;
                    return 0; // NONE
                };
                valA = statusWeight(a.sData[dateStr]);
                valB = statusWeight(b.sData[dateStr]);
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const hasChanges = students.some(s => s.attendance !== s.initialAttendance);

    return (
        <div className="space-y-6">
            {/* Redesigned Toolbar */}
            <div className="flex flex-col gap-3 bg-white/95 backdrop-blur-md p-3 rounded-[24px] border border-slate-200 shadow-sm sticky top-[73px] z-20">
                <div className="flex items-center gap-3">
                    {/* Expanding Search Bar */}
                    <motion.div
                        initial={false}
                        animate={{ flex: searchFocused ? 5 : 1 }}
                        className="relative group min-w-[50px]"
                    >
                        <Search
                            size={18}
                            className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchFocused ? 'text-[#045c84]' : 'text-slate-400'}`}
                        />
                        <input
                            type="text"
                            placeholder={searchFocused ? "নাম বা রোল দিয়ে খুঁজুন..." : ""}
                            value={searchQuery}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`bg-slate-50 border border-slate-100 rounded-[22px] pl-12 pr-4 py-4 text-base font-bold text-slate-700 outline-none focus:ring-4 ring-[#045c84]/5 transition-all w-full cursor-pointer focus:cursor-text ${!searchFocused && !searchQuery ? 'placeholder-transparent' : ''}`}
                        />
                    </motion.div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-slate-100 rounded-[18px] p-1">
                            <button
                                onClick={() => setViewMode('CARD')}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all ${
                                    viewMode === 'CARD'
                                        ? 'bg-white text-[#045c84] shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <LayoutGrid size={14} />
                                <span className="hidden sm:inline">কার্ড</span>
                            </button>
                            <button
                                onClick={() => { setViewMode('REGISTER'); fetchRegisterData(); }}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all ${
                                    viewMode === 'REGISTER'
                                        ? 'bg-white text-[#045c84] shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Table2 size={14} />
                                <span className="hidden sm:inline">রেজিস্টার</span>
                            </button>
                        </div>

                        {viewMode === 'REGISTER' && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowColumnPicker(!showColumnPicker)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-wider transition-all"
                                >
                                    <Table2 size={14} />
                                    <span className="hidden sm:inline">কলাম</span>
                                    <ChevronDown size={14} />
                                </button>
                                {showColumnPicker && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2">
                                        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">কলাম নির্বাচন</span>
                                            <button 
                                                onClick={() => setVisibleDays(visibleDays.length === daysInMonth ? [] : monthDays)}
                                                className="text-[10px] font-bold text-[#045c84] hover:underline"
                                            >
                                                {visibleDays.length === daysInMonth ? 'সব লুকান' : 'সব নির্বাচন'}
                                            </button>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            {monthDays.map(day => (
                                                <label key={day} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs font-bold text-slate-600">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={visibleDays.includes(day)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setVisibleDays([...visibleDays, day].sort((a,b)=>a-b));
                                                            else setVisibleDays(visibleDays.filter(d => d !== day));
                                                        }}
                                                        className="rounded border-slate-300 text-[#045c84] focus:ring-[#045c84]"
                                                    />
                                                    তারিখ {day}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Save Button — hidden when teacher lacks canTakeAttendance */}
                    {isReadOnlyAttendance ? (
                        <div className="flex items-center gap-2 px-5 py-3 rounded-[22px] bg-slate-100 text-slate-400 shrink-0 border border-slate-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span className="text-[12px] font-black uppercase tracking-widest">শুধু দেখুন</span>
                        </div>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={saving || loading || !hasChanges}
                            className={`px-8 py-4 rounded-[22px] font-black text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-xl active:scale-95 shrink-0 ${hasChanges
                                ? 'bg-[#045c84] text-white shadow-[#045c84]/20 hover:bg-[#034a6b]'
                                : 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed opacity-70'
                                }`}
                        >
                            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            <span className={searchFocused ? 'hidden sm:inline' : 'inline'}>{hasChanges ? 'হাজিরা সেভ' : 'সেভড'}</span>
                        </button>
                    )}
                </div>

                {/* Interactive Status Tabs - Always in one scrollable row */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                    {isReadOnlyAttendance && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-[18px] bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">এই ক্লাসে হাজিরা দেওয়ার অনুমতি নেই</span>
                        </div>
                    )}
                    {[
                        { id: 'ALL', label: 'সব', count: students.length, color: 'slate', activeBg: 'bg-slate-800', activeText: 'text-white' },
                        { id: 'PRESENT', label: 'উপস্থিত', count: students.filter(s => s.attendance === 'PRESENT').length, color: 'emerald', activeBg: 'bg-emerald-500', activeText: 'text-white' },
                        { id: 'ABSENT', label: 'অনুপস্থিত', count: students.filter(s => s.attendance === 'ABSENT').length, color: 'rose', activeBg: 'bg-rose-500', activeText: 'text-white' },
                        { id: 'LEAVE', label: 'ছুটি', count: students.filter(s => s.attendance === 'LEAVE').length, color: 'blue', activeBg: 'bg-blue-500', activeText: 'text-white' },
                        { id: 'LEAVE_PENDING', label: 'অপেক্ষমান', count: students.filter(s => s.attendance === 'LEAVE_PENDING').length, color: 'amber', activeBg: 'bg-amber-500', activeText: 'text-white' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id as any)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-[18px] text-[13px] font-black uppercase tracking-widest transition-all whitespace-nowrap border shrink-0 ${statusFilter === tab.id
                                ? `${tab.activeBg} ${tab.activeText} border-transparent shadow-lg scale-105`
                                : `bg-white text-slate-500 border-slate-100 hover:bg-slate-50`
                                }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${statusFilter === tab.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                {tab.count.toLocaleString('bn-BD')}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Actions — hide in register mode */}
            {viewMode === 'CARD' && !isReadOnlyAttendance && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                <div className="flex items-center gap-2">
                    <button onClick={() => bulkUpdate('PRESENT')} className="px-5 py-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all">উপস্থিত</button>
                    <button onClick={() => bulkUpdate('ABSENT')} className="px-5 py-2.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[11px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">অনুপস্থিত</button>
                    <button onClick={() => bulkUpdate('LEAVE')} className="px-5 py-2.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all">ছুটি</button>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                    <AnimatePresence>
                        {hasChanges && (
                            <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onClick={() => bulkUpdate('RESET')}
                                className="px-6 py-2.5 rounded-full text-[11px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all active:scale-95 whitespace-nowrap shadow-sm"
                            >
                                সব বাতিল করুন
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {students.some(s => s.initialAttendance !== 'ABSENT' || s.updatedAt) && (
                        <button
                            onClick={handleClearSaved}
                            disabled={saving}
                            className="px-6 py-2.5 rounded-full text-[11px] font-black uppercase text-slate-500 bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-95 whitespace-nowrap shadow-sm flex items-center gap-2"
                        >
                            <Trash2 size={12} className="opacity-70" />
                            <span>আজকের ডাটা মুছুন</span>
                        </button>
                    )}
                </div>
            </div>
            )}

            {/* ===== REGISTER VIEW ===== */}
            {viewMode === 'REGISTER' && (
                <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
                    {/* Legend */}
                    <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/70">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">কিংবদন্তি:</span>
                        {[
                            { label: 'P – উপস্থিত', color: 'bg-emerald-500' },
                            { label: 'A – অনুপস্থিত', color: 'bg-rose-500' },
                            { label: 'L – বিলম্ব', color: 'bg-amber-500' },
                            { label: 'H – ছুটি', color: 'bg-blue-500' },
                            { label: '– – নেই', color: 'bg-slate-300' },
                        ].map(item => (
                            <span key={item.label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                                {item.label}
                            </span>
                        ))}
                        <div className="ml-auto flex items-center gap-3">
                            <button
                                onClick={() => setShowSummaryModal(true)}
                                className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-lg text-[11px] font-black shadow-sm hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                            >
                                <CalendarIcon size={12} />
                                <span>সামারি রিপোর্ট</span>
                            </button>
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-lg text-[11px] font-black shadow-sm">
                                মোট কর্মদিবস: {activeClassDays} দিন
                            </span>
                            {registerLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
                        </div>
                    </div>

                    {/* Scrollable Table */}
                    <div className="overflow-auto max-h-[65vh] custom-scrollbar rounded-b-[20px]" data-lenis-prevent="true">
                        <table className="w-full text-[11px] border-collapse relative" style={{ minWidth: `${220 + daysInMonth * 36}px` }}>
                            <thead>
                                <tr className="bg-[#045c84] text-white select-none">
                                    <th 
                                        className="sticky top-0 left-0 z-30 bg-[#045c84] text-center px-3 py-3 font-black text-[10px] uppercase tracking-widest w-10 border-r border-white/10 cursor-pointer hover:bg-[#034a6a]"
                                        onClick={() => handleSort('roll')}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            রোল
                                            {sortConfig?.key === 'roll' ? (sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronsUpDown size={10} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th 
                                        className="sticky top-0 left-10 z-30 bg-[#045c84] text-left px-3 py-3 font-black text-[10px] uppercase tracking-widest min-w-[150px] border-r border-white/10 cursor-pointer hover:bg-[#034a6a]"
                                        onClick={handleNameIdSort}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            শিক্ষার্থীর নাম
                                            {(sortConfig?.key === 'name' || sortConfig?.key === 'id') ? (
                                                <div className="flex items-center gap-0.5 text-amber-200">
                                                    <span className="text-[8px] leading-none">{sortConfig.key === 'name' ? 'নাম' : 'আইডি'}</span>
                                                    {sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                                </div>
                                            ) : (
                                                <ChevronsUpDown size={10} className="opacity-30" />
                                            )}
                                        </div>
                                    </th>
                                    {monthDays.map(day => {
                                        if (!visibleDays.includes(day)) return null;
                                        const dayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
                                        const isToday = dayStr === selectedDate;
                                        const dayName = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'][new Date(dayStr).getDay()];
                                        
                                        return (
                                            <th
                                                key={day}
                                                onClick={() => handleSort(`date_${dayStr}`)}
                                                className={`sticky top-0 z-20 py-2 font-black w-10 text-center border-r border-white/10 cursor-pointer hover:bg-[#034a6a] ${
                                                    isToday ? 'bg-amber-400 text-slate-900 hover:bg-amber-500' : 'bg-[#045c84]'
                                                }`}
                                            >
                                                <div className="flex flex-col items-center justify-center leading-[1.2]">
                                                    <div className="flex items-center gap-0.5">
                                                        <span className="text-[11px]">{day}</span>
                                                        {sortConfig?.key === `date_${dayStr}` && (
                                                            sortConfig.direction === 'asc' ? <ChevronUp size={8} /> : <ChevronDown size={8} />
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] opacity-80 font-semibold tracking-tighter">{dayName}</span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                    <th 
                                        className="sticky top-0 z-20 bg-[#045c84] text-center px-2 py-3 font-black text-[10px] uppercase tracking-widest w-16 border-r border-white/10 cursor-pointer hover:bg-[#034a6a]"
                                        onClick={() => handleSort('totalP')}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            মোট P
                                            {sortConfig?.key === 'totalP' ? (sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronsUpDown size={10} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th 
                                        className="sticky top-0 z-20 bg-[#045c84] text-center px-2 py-3 font-black text-[10px] uppercase tracking-widest w-16 cursor-pointer hover:bg-[#034a6a]"
                                        onClick={() => handleSort('percentage')}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            %
                                            {sortConfig?.key === 'percentage' ? (sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronsUpDown size={10} className="opacity-30" />}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, idx) => {
                                        const { sData, presentCount, totalCount } = student;

                                        return (
                                            <tr
                                                key={student.id}
                                                className={`border-b border-slate-100 transition-colors ${
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                                } hover:bg-blue-50/40`}
                                            >
                                                {/* SL / Roll */}
                                                <td className={`sticky left-0 z-10 px-3 py-2 font-black text-slate-400 text-center border-r border-slate-100 ${
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                                }`}>{student.assignedRoll}</td>
                                                {/* Name & ID */}
                                                <td className={`sticky left-10 z-10 px-3 py-2 font-bold text-slate-700 border-r border-slate-100 ${
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                                }`}>
                                                    <span className="block truncate max-w-[150px]">{student.name}</span>
                                                    <span className="block text-[9px] text-slate-400 font-medium">ID: {student.metadata?.studentId || 'N/A'}</span>
                                                </td>
                                                {/* Day cells */}
                                                {monthDays.map(day => {
                                                    if (!visibleDays.includes(day)) return null;
                                                    
                                                    const dayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
                                                    const status = sData[dayStr];

                                                    const isToday = dayStr === selectedDate;
                                                    const cellLabel = status === 'PRESENT' ? 'P'
                                                        : status === 'ABSENT' ? 'A'
                                                        : status === 'LATE' ? 'L'
                                                        : status === 'LEAVE' || status === 'LEAVE_PENDING' ? 'H'
                                                        : '-';
                                                    const cellColor = status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700'
                                                        : status === 'ABSENT' ? 'bg-rose-100 text-rose-600'
                                                        : status === 'LATE' ? 'bg-amber-100 text-amber-700'
                                                        : status === 'LEAVE' || status === 'LEAVE_PENDING' ? 'bg-blue-100 text-blue-600'
                                                        : 'text-slate-300';

                                                    return (
                                                        <td
                                                            key={day}
                                                            id={`cell-${idx}-${visibleDays.indexOf(day)}`}
                                                            tabIndex={0}
                                                            onClick={() => handleQuickCellUpdate(student.id, dayStr, status, student.classId)}
                                                            onKeyDown={(e) => {
                                                                const dayIdx = visibleDays.indexOf(day);
                                                                if (e.key === 'ArrowUp') {
                                                                    document.getElementById(`cell-${idx - 1}-${dayIdx}`)?.focus();
                                                                    e.preventDefault();
                                                                } else if (e.key === 'ArrowDown') {
                                                                    document.getElementById(`cell-${idx + 1}-${dayIdx}`)?.focus();
                                                                    e.preventDefault();
                                                                } else if (e.key === 'ArrowLeft') {
                                                                    document.getElementById(`cell-${idx}-${dayIdx - 1}`)?.focus();
                                                                    e.preventDefault();
                                                                } else if (e.key === 'ArrowRight') {
                                                                    document.getElementById(`cell-${idx}-${dayIdx + 1}`)?.focus();
                                                                    e.preventDefault();
                                                                } else if (e.key === 'Enter' || e.key === ' ') {
                                                                    handleQuickCellUpdate(student.id, dayStr, status, student.classId);
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            className={`py-2 text-center border-r border-slate-100 font-black text-[10px] cursor-pointer hover:bg-blue-100/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#045c84] focus:bg-blue-50 transition-colors ${
                                                                isToday ? 'ring-1 ring-inset ring-amber-300 bg-amber-50/60' : ''
                                                            }`}
                                                        >
                                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-sm ${cellColor}`}>
                                                                {cellLabel}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                                {/* Summary */}
                                                <td className="px-2 py-2 text-center font-black text-emerald-600 border-l border-slate-100">
                                                    {presentCount}/{activeClassDays}
                                                </td>
                                                <td className="px-2 py-2 text-center font-black">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                                        activeClassDays > 0 && (presentCount/activeClassDays) >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                                                        activeClassDays > 0 && (presentCount/activeClassDays) >= 0.5 ? 'bg-amber-100 text-amber-700' :
                                                        activeClassDays > 0 ? 'bg-rose-100 text-rose-600' : 'text-slate-300'
                                                    }`}>
                                                        {activeClassDays > 0 ? `${Math.round((presentCount/activeClassDays)*100)}%` : '—'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== CARD VIEW ===== */}
            {viewMode === 'CARD' && (
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <div key="loading" className="py-20 text-center bg-white rounded-2xl border border-slate-200">
                            <Loader2 size={32} className="animate-spin text-slate-300 mx-auto" />
                            <p className="text-slate-400 font-bold mt-4">ছাত্রদের তালিকা লোড হচ্ছে...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div key="empty" className="py-20 text-center bg-white rounded-2xl border border-slate-200">
                            <Users size={32} className="text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">কোনো ছাত্র পাওয়া যায়নি।</p>
                        </div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid gap-4 justify-center"
                            style={{ 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                                maxWidth: '100%' 
                            }}
                        >
                            {filteredStudents.map((student) => {
                                const status = student.attendance;

                                const getStatusConfig = (s: string | undefined) => {
                                    switch (s) {
                                        case 'ABSENT': return { next: 'PRESENT', label: 'অনুপস্থিত', color: 'rose', icon: X };
                                        case 'PRESENT': return { next: isTeacher ? 'LEAVE_PENDING' : 'LEAVE', label: 'উপস্থিত', color: 'emerald', icon: Check };
                                        case 'LEAVE': return { next: 'ABSENT', label: 'ছুটী', color: 'blue', icon: Square };
                                        case 'LEAVE_PENDING': return { next: 'ABSENT', label: 'ছুটীর আবেদন', color: 'amber', icon: Clock8 };
                                        default: return { next: 'PRESENT', label: '---', color: 'slate', icon: Minus };
                                    }
                                };

                                const current = {
                                    PRESENT: { label: 'উপস্থিত', color: 'emerald', icon: Check },
                                    ABSENT: { label: 'অনুপস্থিত', color: 'rose', icon: X },
                                    LEAVE: { label: 'ছুটী', color: 'blue', icon: Square },
                                    LATE: { label: 'দেরি', color: 'amber', icon: Clock },
                                    LEAVE_PENDING: { label: 'অপেক্ষমান', color: 'amber', icon: Clock8 }
                                }[status || 'PRESENT'] as any || { label: '---', color: 'slate', icon: Minus };

                                const attendanceTime = student.updatedAt ? new Date(student.updatedAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : null;

                                // Attendance Stats for segment border
                                const stats = student.stats || { presentDays: 0, lateDays: 0, absentDays: 0, totalDays: 0, totalSchoolDays: 0 };
                                const total = stats.totalSchoolDays || stats.totalDays || 0;
                                const presentPct = total > 0 ? (stats.presentDays / total) * 100 : 0;
                                const absentPct = total > 0 ? (stats.absentDays / total) * 100 : 0;

                                return (
                                    <motion.div
                                        key={student.id}
                                        layout
                                        className="bg-white rounded-[20px] p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 relative group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative shrink-0">
                                                <div
                                                    className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 italic font-black text-slate-400 text-[10px] shadow-inner cursor-pointer"
                                                    onClick={() => setSelectedStudentForModal(student)}
                                                >
                                                    {student.photo ? (
                                                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users size={20} />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="text-[15px] font-black text-slate-800 truncate mb-0.5 cursor-pointer hover:text-[#045c84]" onClick={() => setSelectedStudentForModal(student)}>{student.name}</h4>
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveActionId(activeActionId === student.id ? null : student.id);
                                                            }}
                                                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                                                        >
                                                            <MoreVertical size={13} />
                                                        </button>

                                                        <AnimatePresence>
                                                            {activeActionId === student.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[100] font-bengali"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">দ্রুত অ্যাকশন</div>

                                                                    <a href={`tel:${student.phone}`} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-600 transition-colors text-sm font-bold group/item">
                                                                        <Phone size={16} className="group-hover/item:scale-110 transition-transform" />
                                                                        <span>কল করুন</span>
                                                                    </a>

                                                                    <a href={`sms:${student.phone}`} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors text-sm font-bold group/item">
                                                                        <MessageSquare size={16} className="group-hover/item:scale-110 transition-transform" />
                                                                        <span>মেসেজ দিন</span>
                                                                    </a>

                                                                    <button
                                                                        onClick={() => openProfileModal(student, 'face')}
                                                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors text-sm font-bold group/item"
                                                                    >
                                                                        <UserCircle size={16} className="group-hover/item:scale-110 transition-transform" />
                                                                        <span>প্রোফাইল / ফেস আইডি</span>
                                                                    </button>

                                                                    <button
                                                                        onClick={() => openProfileModal(student, 'attendance')}
                                                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-amber-600 transition-colors text-sm font-bold group/item"
                                                                    >
                                                                        <Edit3 size={16} className="group-hover/item:scale-110 transition-transform" />
                                                                        <span>এডিট তথ্য</span>
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-black text-slate-400 opacity-60">#{student.rollNumber || 'N/A'}</span>
                                                        {classId === '' && student.className && (
                                                            <span className="text-[10px] font-black text-[#045c84] uppercase truncate opacity-50">
                                                                {student.className}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {status !== 'ABSENT' && attendanceTime && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Clock size={9} className="text-slate-300" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{attendanceTime}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[9px] font-black uppercase tracking-widest text-${current.color}-600 opacity-70`}>{current.label}</span>
                                                {student.stats && (
                                                    <span className={`whitespace-nowrap text-[10px] font-black px-2 py-0.5 rounded-md leading-tight ${
                                                        student.stats.percentage >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                                        student.stats.percentage >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'
                                                    }`}>
                                                        {student.stats.presentDays}/{student.stats.totalSchoolDays || student.stats.totalDays} দিন
                                                    </span>
                                                )}
                                                {isAdmin && status === 'LEAVE_PENDING' ? (
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => updateStatus(student.id, 'LEAVE')}
                                                            className="w-10 h-10 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center justify-center active:scale-95"
                                                            title="অনুমোদন করুন"
                                                        >
                                                            <Check size={18} strokeWidth={3} />
                                                        </button>
                                                        <button 
                                                            onClick={() => updateStatus(student.id, 'ABSENT')}
                                                            className="w-10 h-10 rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:scale-105 transition-all flex items-center justify-center active:scale-95"
                                                            title="বাতিল করুন"
                                                        >
                                                            <X size={18} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => updateStatus(student.id, getStatusConfig(status).next as any)}
                                                        disabled={!isAdmin && status === 'LEAVE_PENDING' && student.initialAttendance === 'LEAVE_PENDING'}
                                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${status === 'PRESENT' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-500/5' :
                                                            status === 'ABSENT' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10 ring-4 ring-rose-500/5' :
                                                                status === 'LEAVE' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/10 ring-4 blue-500/5' :
                                                                    status === 'LEAVE_PENDING' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/10 ring-4 ring-amber-500/5 cursor-wait' :
                                                                        'bg-slate-50 text-slate-400 border border-slate-200 shadow-inner hover:bg-slate-100 flex items-center justify-center'
                                                            }`}
                                                    >
                                                        <current.icon size={22} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Segmented Bottom Border */}
                                        <div className="absolute bottom-0 left-0 right-0 h-1 flex rounded-b-[20px] overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-500"
                                                style={{ width: `${presentPct}%` }}
                                            />
                                            <div
                                                className="h-full bg-rose-500 transition-all duration-500"
                                                style={{ width: `${absentPct}%` }}
                                            />
                                            {total === 0 && (
                                                <div className="h-full bg-slate-100 w-full" />
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Student Profile Modal */}
                {selectedStudentForModal && (
                    <StudentProfileModal
                        isOpen={!!selectedStudentForModal}
                        onClose={() => setSelectedStudentForModal(null)}
                        student={selectedStudentForModal}
                        onUpdate={fetchStudents}
                        initialTab={modalTab}
                    />
                )}
            </div >
            )}

            {/* Glassmorphism Toast */}
            <AnimatePresence>
                {
                    toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="fixed top-6 right-6 z-[9999] pointer-events-none"
                        >
                            <div className={`
                            min-w-[320px] px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-4 transition-all
                            ${toast.type === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' :
                                    toast.type === 'ERROR' ? 'bg-rose-500/10 border-rose-500/20 text-rose-700' :
                                        'bg-slate-500/10 border-slate-500/20 text-slate-700'}
                        `}>
                                <div className={`
                                w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg
                                ${toast.type === 'SUCCESS' ? 'bg-emerald-500 text-white' :
                                        toast.type === 'ERROR' ? 'bg-rose-500 text-white' :
                                            'bg-slate-500 text-white'}
                            `}>
                                    {toast.type === 'SUCCESS' ? <Check size={20} strokeWidth={3} /> :
                                        toast.type === 'ERROR' ? <X size={20} strokeWidth={3} /> :
                                            <Users size={20} strokeWidth={3} />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">
                                        {toast.type === 'SUCCESS' ? 'সাফল্য' : toast.type === 'ERROR' ? 'ত্রুটি' : 'তথ্য'}
                                    </h4>
                                    <p className="text-sm font-black italic uppercase leading-tight truncate">
                                        {toast.message}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Summary Modal */}
            <Modal
                isOpen={showSummaryModal}
                onClose={() => setShowSummaryModal(false)}
                title="হাজিরা সামারি রিপোর্ট"
                maxWidth="max-w-7xl"
            >
                <div className="bg-slate-50 min-h-[60vh]">
                    <AttendanceSummary 
                        initialClassId={classId === 'all' ? '' : classId}
                        initialStartDate={monthStr ? `${monthStr}-01` : undefined}
                        initialEndDate={monthStr ? `${monthStr}-${daysInMonth}` : undefined}
                    />
                </div>
            </Modal>
        </div >
    );
}
