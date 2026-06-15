'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    ChevronsUpDown,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from './SessionProvider';
import { useUI } from './UIProvider';
import dynamic from 'next/dynamic';
import Modal from './Modal';
import AttendanceSummary from './AttendanceSummary';
import { getCleanId } from '@/utils/digit-utils';

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
    const isOwner = (activeInstitute?.adminIds || []).includes(user?.id) || activeInstitute?.isOwner === true;

    const isAdmin = isOwner || (() => {
        const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
        return profile?.status === 'ACTIVE' && profile?.isAdmin === true;
    })();

    const isTeacher = activeRole === 'TEACHER' || !isOwner;

    // Determine if the current teacher has attendance permission for this specific class
    const hasAttendancePerm = useMemo(() => {
        if (isOwner) return true;
        if (!user?.teacherProfiles || !activeInstitute?.id) return false;
        
        const profile = (user.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute.id);
        if (!profile || profile.status === 'REJECTED') return false;
        if (profile.isAdmin === true) return true;
        
        const targetClassId = getCleanId(classId);
        if (!targetClassId || targetClassId === 'all') {
            return profile.isAdmin === true;
        }
        
        const classPerm = profile.permissions?.classWise?.[targetClassId];
        if (!classPerm) return false;
        if (typeof classPerm === 'object' && Array.isArray(classPerm.permissions)) {
            return classPerm.permissions.includes('canTakeAttendance');
        }
        if (Array.isArray(classPerm)) return classPerm.includes('canTakeAttendance');
        if (typeof classPerm === 'object') return classPerm.canTakeAttendance === true;
        if (typeof classPerm === 'string') return classPerm === 'canTakeAttendance';
        return false;
    }, [isOwner, user, activeInstitute?.id, classId]);

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
    const [bulkScope, setBulkScope] = useState<'ALL' | 'UNMARKED'>('ALL');
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(12);

    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(12);
    }, [statusFilter, searchQuery, sortConfig, viewMode]);



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
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        if (isMobile && selectedDate) {
            const currentDay = parseInt(selectedDate.substring(8, 10), 10);
            if (!isNaN(currentDay)) {
                setVisibleDays([currentDay]);
                return;
            }
        }
        setVisibleDays(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    }, [daysInMonth, selectedDate]);

    const fetchRegisterData = async () => {
        if (!activeInstitute?.id || !monthStr) return;

        const isAdminUser = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || (() => {
            const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            return profile?.isAdmin === true;
        })();

        const targetClassId = getCleanId(classId);
        if (activeRole === 'TEACHER' && !isAdminUser) {
            if (!targetClassId || targetClassId === 'all') {
                setRegisterData({});
                return;
            }
            const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            const classPermissions = profile?.permissions?.classWise?.[targetClassId];
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

    const columnPickerRef = useRef<HTMLDivElement>(null);
    const filterScrollRef = useRef<HTMLDivElement>(null);
    const sortDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            setActiveActionId(null);
            
            if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
                setShowColumnPicker(false);
            }
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
                setIsSortDropdownOpen(false);
            }
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Center active status filter tab when it changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (filterScrollRef.current) {
                const container = filterScrollRef.current;
                const activeBtn = container.querySelector(`[data-filter-id="${statusFilter}"]`) as HTMLElement;
                if (activeBtn) {
                    const containerWidth = container.offsetWidth;
                    const btnOffset = activeBtn.offsetLeft;
                    const btnWidth = activeBtn.offsetWidth;

                    container.scrollTo({
                        left: btnOffset - (containerWidth / 2) + (btnWidth / 2),
                        behavior: 'smooth'
                    });
                }
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [statusFilter, students]);

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

        const targetClassId = getCleanId(classId);
        if (activeRole === 'TEACHER' && !isAdminUser) {
            if (!targetClassId || targetClassId === 'all') {
                setStudents([]);
                setLoading(false);
                return;
            }
            const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            const classPermissions = profile?.permissions?.classWise?.[targetClassId];
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
            // Fetch students and attendance in parallel (skip heavy stats for fast initial load)
            const fetchClassId = classId || 'all';
            const [studentsRes, attendanceRes] = await Promise.all([
                fetch(`/api/admin/users?role=STUDENT&classId=${fetchClassId}&instituteId=${activeInstitute?.id}&lightweight=true`),
                fetch(`/api/attendance/list?instituteId=${activeInstitute?.id}&date=${selectedDate}&classId=${fetchClassId}`)
            ]);

            if (studentsRes.ok) {
                const studentsData = await studentsRes.json();
                const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
                const statsData: any[] = []; // Skipped for performance

                const statsMap = new Map();

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
                        classId: getCleanId(s.metadata?.classId),
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

    const updateStatus = async (id: string, status: Student['attendance']) => {
        if (isReadOnlyAttendance) {
            showToast('আপনাকে এই ক্লাসের হাজিরা পরিবর্তন করার অনুমতি দেওয়া হয়নি।', 'ERROR');
            return;
        }

        const now = new Date().toISOString();

        // Optimistic UI updates
        setStudents(prev => prev.map(s => s.id === id ? {
            ...s,
            attendance: status,
            initialAttendance: status, // Auto-saved
            updatedAt: status !== 'ABSENT' ? now : s.updatedAt
        } : s));

        setRegisterData(prev => {
            const next = { ...prev };
            if (!next[id]) next[id] = {};
            next[id][selectedDate] = status || 'ABSENT';
            return next;
        });

        // Save immediately in the background
        setSaving(true);
        try {
            const student = students.find(s => s.id === id);
            const res = await fetch('/api/attendance/mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: id,
                    instituteId: activeInstitute?.id,
                    classId: student?.classId || classId || 'all',
                    dateString: selectedDate,
                    status: status || 'ABSENT',
                    method: 'MANUAL'
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'হাজিরা সংরক্ষণ করতে ব্যর্থ হয়েছে।');
            }
        } catch (error: any) {
            console.error('Failed to auto-save attendance status:', error);
            showToast(error.message || 'হাজিরা সেভ করতে সমস্যা হয়েছে।', 'ERROR');
            fetchStudents(); // Revert to database state
        } finally {
            setSaving(false);
        }
    };

    const bulkUpdate = async (status: Student['attendance'] | 'RESET') => {
        if (isReadOnlyAttendance) {
            showToast('আপনাকে এই ক্লাসের হাজিরা পরিবর্তন করার অনুমতি দেওয়া হয়নি।', 'ERROR');
            return;
        }

        if (status === 'RESET') return;

        const now = new Date().toISOString();
        
        // Find which students to update based on scope
        const studentsToUpdate = students.filter(s => {
            const isUnmarked = (s.initialAttendance === 'ABSENT' && !s.updatedAt) && s.attendance === 'ABSENT';
            if (bulkScope === 'UNMARKED' && !isUnmarked) {
                return false;
            }
            if (!isAdmin && s.initialAttendance === 'LEAVE_PENDING') {
                return false;
            }
            return true;
        });

        if (studentsToUpdate.length === 0) {
            showToast('হাজিরা পরিবর্তন করার মতো কোনো শিক্ষার্থী নেই।', 'INFO');
            return;
        }

        const toUpdate = studentsToUpdate.map(s => {
            let finalStatus = status;
            if (isTeacher && finalStatus === 'LEAVE') {
                finalStatus = 'LEAVE_PENDING';
            }
            return { id: s.id, status: finalStatus, classId: s.classId };
        });

        setStudents(prev => prev.map(s => {
            const target = toUpdate.find(item => item.id === s.id);
            if (!target) return s;

            return {
                ...s,
                attendance: target.status,
                initialAttendance: target.status,
                updatedAt: now
            };
        }));

        setRegisterData(prev => {
            const next = { ...prev };
            toUpdate.forEach(item => {
                if (!next[item.id]) next[item.id] = {};
                next[item.id][selectedDate] = item.status || 'ABSENT';
            });
            return next;
        });

        // Save immediately in parallel
        setSaving(true);
        try {
            const promises = toUpdate.map(async item => {
                const res = await fetch('/api/attendance/mark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: item.id,
                        instituteId: activeInstitute?.id,
                        classId: item.classId || classId || 'all',
                        dateString: selectedDate,
                        status: item.status || 'ABSENT',
                        method: 'MANUAL'
                    })
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'হাজিরা সংরক্ষণ করতে ব্যর্থ হয়েছে।');
                }
            });
            await Promise.all(promises);
            showToast('হাজিরা সফলভাবে সংরক্ষিত হয়েছে।', 'SUCCESS');
        } catch (error: any) {
            console.error('Failed to auto-save bulk attendance:', error);
            showToast(error.message || 'হাজিরা সেভ করতে সমস্যা হয়েছে।', 'ERROR');
            fetchStudents(); // Revert to database state
        } finally {
            setSaving(false);
        }
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
        if (isReadOnlyAttendance) {
            showToast('আপনাকে এই ক্লাসের হাজিরা পরিবর্তন করার অনুমতি দেওয়া হয়নি।', 'ERROR');
            return;
        }
        
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
                const res = await fetch('/api/attendance/unmark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, dateString, instituteId: activeInstitute?.id })
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'মুছে ফেলতে ব্যর্থ হয়েছে।');
                }
            } else {
                const res = await fetch('/api/attendance/mark', {
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
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'হাজিরা সংরক্ষণ করতে ব্যর্থ হয়েছে।');
                }
            }
        } catch (error: any) {
            console.error('Failed to quick save cell:', error);
            showToast(error.message || 'হাজিরা সেভ করতে সমস্যা হয়েছে।', 'ERROR');
            fetchRegisterData(); // Revert register state
            if (dateString === selectedDate) {
                fetchStudents(); // Revert card state if today
            }
        }
    };

    const handleSave = async () => {
        if (isReadOnlyAttendance) return;
        const changedStudents = students.filter(s => s.attendance !== s.initialAttendance);
        if (changedStudents.length === 0) return;

        setSaving(true);
        try {
            const promises = changedStudents.map(async s => {
                const res = await fetch('/api/attendance/mark', {
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
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'হাজিরা সংরক্ষণ করতে ব্যর্থ হয়েছে।');
                }
            });
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
        } catch (err: any) {
            console.error('Error saving attendance:', err);
            showToast(err.message || 'হাজিরা সেভ করতে সমস্যা হয়েছে।', 'ERROR');
            fetchStudents(); // Revert
        } finally {
            setSaving(false);
        }
    };

    const handleClearSaved = async () => {
        const savedStudents = students.filter(s => s.initialAttendance !== 'ABSENT' || s.updatedAt);
        if (savedStudents.length === 0) return;

        const totalSaved = savedStudents.length;
        const presentCount = savedStudents.filter(s => s.initialAttendance === 'PRESENT').length;
        const absentCount = savedStudents.filter(s => s.initialAttendance === 'ABSENT').length;
        const leaveCount = savedStudents.filter(s => s.initialAttendance === 'LEAVE').length;
        const pendingCount = savedStudents.filter(s => s.initialAttendance === 'LEAVE_PENDING').length;

        const summaryText = `আজকের হাজিরা সামারি:\n\n` +
            `• মোট রেকর্ড: ${totalSaved}টি\n` +
            `• উপস্থিত (Present): ${presentCount}টি\n` +
            `• অনুপস্থিত (Absent): ${absentCount}টি\n` +
            `• ছুটি (Leave): ${leaveCount}টি\n` +
            (pendingCount > 0 ? `• অপেক্ষমান (Pending): ${pendingCount}টি\n` : '') +
            `\nআপনি কি আজকের এই সমস্ত হাজিরা রেকর্ড মুছে ফেলতে চান?\n(এটি রিপোর্ট থেকেও মুছে যাবে।)`;

        if (!await ui.confirm(summaryText)) {
            return;
        }

        setSaving(true);
        try {
            const promises = savedStudents.map(async s => {
                const res = await fetch('/api/attendance/unmark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: s.id,
                        dateString: selectedDate,
                        instituteId: activeInstitute?.id
                    })
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'হাজিরা মুছতে ব্যর্থ হয়েছে।');
                }
            });
            await Promise.all(promises);

            // Reset state
            setStudents(prev => prev.map(s => ({
                ...s,
                attendance: 'ABSENT',
                initialAttendance: 'ABSENT',
                updatedAt: undefined
            })));

            setRegisterData(prev => {
                const next = { ...prev };
                savedStudents.forEach(s => {
                    if (next[s.id]) {
                        delete next[s.id][selectedDate];
                    }
                });
                return next;
            });

            localStorage.removeItem(storageKey);
            showToast('সমস্ত হাজিরা রেকর্ড মুছে ফেলা হয়েছে।', 'SUCCESS');
        } catch (err: any) {
            console.error('Error clearing attendance:', err);
            showToast(err.message || 'হাজিরা মুছতে সমস্যা হয়েছে।', 'ERROR');
            fetchStudents(); // Revert
        } finally {
            setSaving(false);
        }
    };

    const studentsWithRoll = useMemo(() => {
        const sorted = [...students].sort((a, b) => {
            const rollA = a.rollNumber ? parseInt(a.rollNumber, 10) : Infinity;
            const rollB = b.rollNumber ? parseInt(b.rollNumber, 10) : Infinity;
            if (rollA !== rollB && !isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
        return sorted.map((s, idx) => ({ 
            ...s, 
            assignedRoll: s.rollNumber && !isNaN(parseInt(s.rollNumber, 10)) ? parseInt(s.rollNumber, 10) : idx + 1 
        }));
    }, [students]);

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
    const studentsWithStats = useMemo(() => {
        return studentsWithRoll.map(student => {
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
    }, [studentsWithRoll, registerData, monthStr, monthDays]);

    const filteredStudents = useMemo(() => {
        let list = studentsWithStats.filter(s => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = s.name.toLowerCase().includes(query) || 
                                  s.assignedRoll.toString() === query ||
                                  s.metadata?.studentId === query;
            const matchesStatus = statusFilter === 'ALL' || s.attendance === statusFilter;
            return matchesSearch && matchesStatus;
        });

        if (sortConfig) {
            list.sort((a, b) => {
                let valA: any = 0;
                let valB: any = 0;

                if (sortConfig.key === 'roll') {
                    valA = a.assignedRoll;
                    valB = b.assignedRoll;
                } else if (sortConfig.key === 'name') {
                    return sortConfig.direction === 'asc' 
                        ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) 
                        : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
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
                    return sortConfig.direction === 'asc' 
                        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) 
                        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
                }
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [studentsWithStats, searchQuery, statusFilter, sortConfig, activeClassDays]);

    // Incrementally load more cards for "one by one" smooth effect
    useEffect(() => {
        if (viewMode === 'CARD' && visibleCount < filteredStudents?.length) {
            const timer = setTimeout(() => {
                setVisibleCount(prev => prev + 12);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [visibleCount, filteredStudents?.length, viewMode]);

    const hasChanges = students.some(s => s.attendance !== s.initialAttendance);
    const savedCount = students.filter(s => s.initialAttendance !== 'ABSENT' || s.updatedAt).length;

    return (
        <div className="space-y-6">
            {/* Redesigned Toolbar */}
            <div className="flex flex-col gap-3 bg-white p-3 rounded-[24px] border border-slate-200 shadow-sm sticky top-[73px] z-40 relative">
                {/* Float Save Button at the top-right corner */}
                {!isReadOnlyAttendance && (
                    <button
                        onClick={handleSave}
                        disabled={saving || loading || !hasChanges}
                        className={`absolute -top-2.5 -right-2.5 w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-lg transition-all duration-300 z-30 ${
                            saving
                                ? 'bg-[#045c84] text-white shadow-[#045c84]/40 cursor-wait'
                                : hasChanges
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/40 cursor-pointer active:scale-95 hover:scale-110'
                                    : 'bg-emerald-500 text-white shadow-emerald-500/30 cursor-default'
                        }`}
                        title={saving ? 'সেভ হচ্ছে...' : hasChanges ? 'পেন্ডিং পরিবর্তন সংরক্ষণ করুন' : 'সংরক্ষিত'}
                    >
                        {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : hasChanges ? (
                            <Save size={16} className="animate-pulse" />
                        ) : (
                            <Check size={16} />
                        )}
                    </button>
                )}
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
                            placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                            value={searchQuery}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-[22px] pl-12 pr-4 py-4 text-base font-bold text-slate-700 outline-none focus:ring-4 ring-[#045c84]/5 transition-all w-full cursor-pointer focus:cursor-text"
                        />
                    </motion.div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Sort Dropdown for Card View */}
                        {viewMode === 'CARD' && (
                            <div className="relative" ref={sortDropdownRef}>
                                <button
                                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                    className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-[14px] px-4 py-2.5 hover:bg-slate-50 transition-colors text-[11px] font-black uppercase tracking-wider text-[#045c84]"
                                >
                                    <span>
                                        {sortConfig ? (
                                            sortConfig.key === 'roll' ? 'রোল' :
                                            sortConfig.key === 'name' ? 'নাম' :
                                            sortConfig.key === 'id' ? 'আইডি' : 'ডিফল্ট'
                                        ) : 'ডিফল্ট সর্ট'}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                <AnimatePresence>
                                    {isSortDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5"
                                        >
                                            <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">কিভাবে সাজাবেন?</span>
                                            </div>
                                            {[
                                                { id: 'default', label: 'ডিফল্ট সর্ট' },
                                                { id: 'roll_asc', label: 'রোল (ছোট-বড়)' },
                                                { id: 'roll_desc', label: 'রোল (বড়-ছোট)' },
                                                { id: 'name_asc', label: 'নাম (A-Z)' },
                                                { id: 'name_desc', label: 'নাম (Z-A)' },
                                                { id: 'id_asc', label: 'আইডি (ছোট-বড়)' },
                                                { id: 'id_desc', label: 'আইডি (বড়-ছোট)' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => {
                                                        if (opt.id === 'default') setSortConfig(null);
                                                        else {
                                                            const [key, direction] = opt.id.split('_');
                                                            setSortConfig({ key, direction: direction as 'asc' | 'desc' });
                                                        }
                                                        setIsSortDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-colors ${
                                                        (opt.id === 'default' && !sortConfig) || (sortConfig && opt.id === `${sortConfig.key}_${sortConfig.direction}`)
                                                            ? 'bg-blue-50 text-[#045c84]'
                                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {opt.label}
                                                    {((opt.id === 'default' && !sortConfig) || (sortConfig && opt.id === `${sortConfig.key}_${sortConfig.direction}`)) && (
                                                        <Check size={12} className="text-[#045c84]" />
                                                    )}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                        <div className="flex items-center bg-slate-100 rounded-[18px] p-1">
                            <button
                                onClick={() => {
                                    setViewMode('CARD');
                                    setShowColumnPicker(false);
                                }}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all ${
                                    viewMode === 'CARD'
                                        ? 'bg-white text-[#045c84] shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <LayoutGrid size={14} />
                                <span className="hidden sm:inline">কার্ড</span>
                            </button>
                            
                            <div className="relative" ref={columnPickerRef}>
                                <button
                                    onClick={() => {
                                        if (viewMode !== 'REGISTER') {
                                            setViewMode('REGISTER');
                                            fetchRegisterData();
                                        } else {
                                            setShowColumnPicker(!showColumnPicker);
                                        }
                                    }}
                                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-wider transition-all ${
                                        viewMode === 'REGISTER'
                                            ? 'bg-white text-[#045c84] shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <Table2 size={14} />
                                    <span className="hidden sm:inline">রেজিস্টার</span>
                                    {viewMode === 'REGISTER' && <ChevronDown size={14} className={`transition-transform duration-200 ${showColumnPicker ? 'rotate-180' : ''}`} />}
                                </button>
                                {viewMode === 'REGISTER' && showColumnPicker && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2" data-lenis-prevent="true">
                                        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">কলাম নির্বাচন</span>
                                            <button 
                                                onClick={() => setVisibleDays(visibleDays.length === daysInMonth ? [] : monthDays)}
                                                className="text-[10px] font-bold text-[#045c84] hover:underline"
                                            >
                                                {visibleDays.length === daysInMonth ? 'সব লুকান' : 'সব নির্বাচন'}
                                            </button>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar" data-lenis-prevent="true">
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
                        </div>
                    </div>

                </div>

                {/* Interactive Status Tabs - Always in one scrollable row */}
                <div 
                    ref={filterScrollRef}
                    className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 relative scroll-smooth"
                >
                    {[
                        { id: 'ALL', label: 'সব', count: students.length, color: 'slate', activeBg: 'bg-slate-800', activeText: 'text-white' },
                        { id: 'PRESENT', label: 'উপস্থিত', count: students.filter(s => s.attendance === 'PRESENT').length, color: 'emerald', activeBg: 'bg-emerald-500', activeText: 'text-white' },
                        { id: 'ABSENT', label: 'অনুপস্থিত', count: students.filter(s => s.attendance === 'ABSENT').length, color: 'rose', activeBg: 'bg-rose-500', activeText: 'text-white' },
                        { id: 'LEAVE', label: 'ছুটি', count: students.filter(s => s.attendance === 'LEAVE').length, color: 'blue', activeBg: 'bg-blue-500', activeText: 'text-white' },
                        { id: 'LEAVE_PENDING', label: 'অপেক্ষমান', count: students.filter(s => s.attendance === 'LEAVE_PENDING').length, color: 'amber', activeBg: 'bg-amber-500', activeText: 'text-white' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            data-filter-id={tab.id}
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
            <div className="flex items-center justify-between gap-3 px-2 overflow-x-auto no-scrollbar py-1">
                <div className="flex items-center gap-2 shrink-0">
                    {/* Bulk Scope Toggle */}
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-full text-[10px] font-black mr-1 border border-slate-200/50">
                        <button
                            type="button"
                            onClick={() => setBulkScope('ALL')}
                            className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                                bulkScope === 'ALL'
                                    ? 'bg-white text-[#045c84] shadow-sm font-black'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            সবাইকে
                        </button>
                        <button
                            type="button"
                            onClick={() => setBulkScope('UNMARKED')}
                            className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                                bulkScope === 'UNMARKED'
                                    ? 'bg-white text-[#045c84] shadow-sm font-black'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            বাকিদের
                        </button>
                    </div>

                    <button onClick={() => bulkUpdate('PRESENT')} className="px-5 py-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all">উপস্থিত</button>
                    <button onClick={() => bulkUpdate('ABSENT')} className="px-5 py-2.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[11px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">অনুপস্থিত</button>
                    <button onClick={() => bulkUpdate('LEAVE')} className="px-5 py-2.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all">ছুটি</button>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-auto">
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

                    {savedCount > 0 && (
                        <button
                            onClick={handleClearSaved}
                            disabled={saving}
                            className="px-6 py-2.5 rounded-full text-[11px] font-black uppercase text-slate-500 bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-95 whitespace-nowrap shadow-sm flex items-center gap-2"
                        >
                            <Trash2 size={12} className="opacity-70" />
                            <span>আজকের ডাটা মুছুন ({savedCount})</span>
                        </button>
                    )}
                </div>
            </div>
            )}

            {/* ===== REGISTER VIEW ===== */}
            {viewMode === 'REGISTER' && (
                <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
                    {/* Legend */}
                    <div className="flex items-center gap-2 md:gap-4 px-3 md:px-5 py-2 md:py-3 border-b border-slate-100 bg-slate-50/70">
                        <div className="hidden md:flex items-center gap-4">
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
                        </div>
                        
                        <details className="md:hidden relative">
                            <summary className="list-none flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 shadow-sm cursor-pointer [&::-webkit-details-marker]:hidden">
                                <Info size={14} />
                            </summary>
                            <div className="absolute top-full left-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 flex flex-col gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">কিংবদন্তি:</span>
                                {[
                                    { label: 'P – উপস্থিত', color: 'bg-emerald-500' },
                                    { label: 'A – অনুপস্থিত', color: 'bg-rose-500' },
                                    { label: 'L – বিলম্ব', color: 'bg-amber-500' },
                                    { label: 'H – ছুটি', color: 'bg-blue-500' },
                                    { label: '– – নেই', color: 'bg-slate-300' },
                                ].map(item => (
                                    <span key={item.label} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                        <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${item.color}`} />
                                        {item.label}
                                    </span>
                                ))}
                            </div>
                        </details>

                        <div className="ml-auto flex items-center gap-2 md:gap-3">
                            <button
                                onClick={() => setShowSummaryModal(true)}
                                className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 md:px-3 py-1.5 rounded-lg text-[11px] font-black shadow-sm hover:bg-indigo-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                            >
                                <CalendarIcon size={12} />
                                <span className="hidden sm:inline md:hidden lg:inline">রিপোর্ট</span>
                                <span className="inline sm:hidden md:inline lg:hidden">সামারি রিপোর্ট</span>
                            </button>
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 md:px-3 py-1.5 rounded-lg text-[11px] font-black shadow-sm whitespace-nowrap">
                                কর্মদিবস: {activeClassDays} দিন
                            </span>
                            {registerLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
                        </div>
                    </div>

                    {/* Scrollable Table */}
                    <div className="overflow-auto max-h-[65vh] custom-scrollbar rounded-b-[20px]" data-lenis-prevent="true">
                        <table className="w-full text-[11px] border-collapse relative" style={{ minWidth: `${360 + visibleDays.length * 56}px` }}>
                            <thead>
                                <tr className="bg-[#045c84] text-white select-none">
                                    <th 
                                        className="sticky top-0 left-0 z-30 bg-[#045c84] text-center px-1.5 py-2 font-black text-[10px] uppercase tracking-widest w-8 border-r border-white/10 cursor-pointer hover:bg-[#034a6a]"
                                        onClick={() => handleSort('roll')}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            রোল
                                            {sortConfig?.key === 'roll' ? (sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronsUpDown size={10} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th 
                                        className="sticky top-0 left-8 z-30 bg-[#045c84] text-left px-2 py-2 font-black text-[10px] uppercase tracking-widest min-w-[140px] border-r border-white/10 cursor-pointer hover:bg-[#034a6a]"
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
                                                className={`sticky top-0 z-20 py-1.5 font-black min-w-[40px] sm:min-w-[34px] text-center border-r border-white/10 cursor-pointer hover:bg-[#034a6a] ${
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
                                        className="sticky top-0 z-20 bg-[#045c84] text-center px-1.5 py-2 font-black text-[10px] uppercase tracking-widest w-12 border-r border-white/10 cursor-pointer hover:bg-[#034a6a]"
                                        onClick={() => handleSort('totalP')}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            মোট P
                                            {sortConfig?.key === 'totalP' ? (sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronsUpDown size={10} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th 
                                        className="sticky top-0 z-20 bg-[#045c84] text-center px-1.5 py-2 font-black text-[10px] uppercase tracking-widest w-12 cursor-pointer hover:bg-[#034a6a]"
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
                                                <td className={`sticky left-0 z-10 px-1.5 py-1.5 font-black text-slate-400 text-center border-r border-slate-100 ${
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                                }`}>{student.metadata?.rollNumber || student.assignedRoll}</td>
                                                {/* Name & ID */}
                                                <td className={`sticky left-8 z-10 px-2 py-1.5 font-bold text-slate-700 border-r border-slate-100 ${
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                                }`}>
                                                    <span className="block truncate max-w-[130px] text-[16px] leading-tight">{student.name}</span>
                                                    <span className="block text-[9px] text-slate-400 font-medium leading-none mt-0.5">ID: {student.metadata?.studentId || 'N/A'}</span>
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
                                                            tabIndex={isReadOnlyAttendance ? -1 : 0}
                                                            onClick={isReadOnlyAttendance ? undefined : () => handleQuickCellUpdate(student.id, dayStr, status, student.classId)}
                                                            onKeyDown={isReadOnlyAttendance ? undefined : (e) => {
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
                                                            className={`px-1 py-1 text-center border-r border-slate-100 font-black text-[10px] ${
                                                                isReadOnlyAttendance ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:bg-blue-100/50'
                                                            } focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#045c84] focus:bg-blue-50 transition-colors ${
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
                                                <td className="px-1 py-1.5 text-center font-black text-emerald-600 border-l border-slate-100 text-[11px]">
                                                    {presentCount}/{activeClassDays}
                                                </td>
                                                <td className="px-1 py-1.5 text-center font-black">
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
                                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
                                maxWidth: '100%' 
                            }}
                        >
                            {filteredStudents.slice(0, visibleCount).map((student) => {
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

                                const getThumbnailUrl = (url: string | undefined) => {
                                    if (!url) return '';
                                    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
                                        return url.replace('/upload/', '/upload/w_100,h_100,c_fill,q_auto,f_auto/');
                                    }
                                    return url;
                                };

                                const optimizedPhoto = getThumbnailUrl(student.photo);

                                return (
                                    <div
                                        key={student.id}
                                        className="bg-white rounded-[20px] p-2 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center justify-between gap-3 relative group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative shrink-0">
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner cursor-pointer relative"
                                                    style={{ 
                                                        backgroundColor: `hsl(${(student.name.charCodeAt(0) * 15) % 360}, 60%, 90%)`, 
                                                        color: `hsl(${(student.name.charCodeAt(0) * 15) % 360}, 70%, 40%)` 
                                                    }}
                                                    onClick={() => setSelectedStudentForModal(student)}
                                                >
                                                    <span className="text-xl font-black opacity-80">{student.name.charAt(0)}</span>
                                                    {optimizedPhoto && (
                                                        <img 
                                                            src={optimizedPhoto} 
                                                            alt={student.name} 
                                                            loading="lazy" 
                                                            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300" 
                                                            onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-start justify-between w-full">
                                                    <div className="flex flex-col gap-0.5">
                                                        <h4 className="text-[15px] font-black text-slate-800 truncate mb-0.5 cursor-pointer hover:text-[#045c84]" onClick={() => setSelectedStudentForModal(student)}>{student.name}</h4>
                                                    </div>
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
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[10px] font-black text-slate-400 opacity-60">রোল: {student.metadata?.rollNumber || student.assignedRoll} | আইডি: {student.metadata?.studentId || 'N/A'}</span>
                                                        {classId === '' && student.className && (
                                                            <span className="text-[10px] font-black text-[#045c84] uppercase truncate opacity-50">
                                                                {student.className}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {status !== 'ABSENT' && attendanceTime && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={9} className="text-slate-300" />
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{attendanceTime}</span>
                                                            </div>
                                                        )}
                                                        <span className={`w-fit whitespace-nowrap text-[9px] font-black px-1.5 py-0.5 rounded-md leading-tight ${
                                                            activeClassDays > 0 && (student.presentCount / activeClassDays) >= 0.8 ? 'bg-emerald-50 text-emerald-600' :
                                                            activeClassDays > 0 && (student.presentCount / activeClassDays) >= 0.5 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'
                                                        }`}>
                                                            {student.presentCount}/{activeClassDays} দিন
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[9px] font-black uppercase tracking-widest text-${current.color}-600 opacity-70`}>{current.label}</span>
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
                                                        disabled={isReadOnlyAttendance}
                                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                                            isReadOnlyAttendance ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
                                                        } ${status === 'PRESENT' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-500/5' :
                                                            status === 'ABSENT' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10 ring-4 ring-rose-500/5' :
                                                                status === 'LEAVE' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/10 ring-4 blue-500/5' :
                                                                    status === 'LEAVE_PENDING' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/10 ring-4 ring-amber-500/5' :
                                                                        'bg-slate-50 text-slate-400 border border-slate-200 shadow-inner hover:bg-slate-100 flex items-center justify-center'
                                                            }`}
                                                    >
                                                        <current.icon size={22} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Segmented Bottom Border */}
                                        <div className="absolute inset-x-0 bottom-0 h-[20px] pointer-events-none opacity-40">
                                            {total === 0 ? (
                                                <div className="absolute inset-0 border-b-[1.5px] border-slate-200 rounded-b-[20px]" />
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 border-b-[1.5px] border-rose-500 rounded-b-[20px] transition-all duration-500" style={{ clipPath: `inset(0 0 0 ${100 - absentPct}%)` }} />
                                                    <div className="absolute inset-0 border-b-[1.5px] border-emerald-500 rounded-b-[20px] transition-all duration-500" style={{ clipPath: `inset(0 ${100 - presentPct}% 0 0)` }} />
                                                </>
                                            )}
                                        </div>
                                    </div>
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
