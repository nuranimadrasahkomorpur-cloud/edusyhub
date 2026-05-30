'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
    Plus,
    Search,
    ClipboardList,
    ChevronDown,
    Filter,
    GraduationCap,
    Users,
    Activity,
    TrendingUp,
    PenTool,
    History,
    LayoutGrid,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    List
} from 'lucide-react';
import AssignmentCalendar from '@/components/AssignmentCalendar';
import { useSession } from '@/components/SessionProvider';
import AssignmentCard from '@/components/AssignmentCard';
import AssignmentDetailsModal from '@/components/AssignmentDetailsModal';
import Toast from '@/components/Toast';
import TeacherAssignmentPanel from '@/components/TeacherAssignmentPanel';
import SubmissionReviewPanel from '@/components/SubmissionReviewPanel';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUI } from '@/components/UIProvider';

function AssignmentsPageContent() {
    const { user, activeInstitute, activeRole } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { openAssignmentModal, confirm } = useUI();

    // Default to Status (entry) tab for Teachers and Admins, History for others
    const isAdminOrTeacher = activeRole === 'TEACHER' || activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN';
    const currentTab = searchParams.get('tab') || (isAdminOrTeacher ? 'entry' : 'history');

    const [assignments, setAssignments] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [teacherProfile, setTeacherProfile] = useState<any>(null);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isReleasing, setIsReleasing] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [editingAssignment, setEditingAssignment] = useState<any>(null);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [monthAssignments, setMonthAssignments] = useState<any[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isBulkReleasing, setIsBulkReleasing] = useState(false);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = async (silent = false) => {
        if (!activeInstitute?.id) return;
        if (!silent) setLoading(true);
        try {
            // Fetch Assignments for specific date
            // For students, we always include their classId and groupId if available
            let url = `/api/assignments?instituteId=${activeInstitute.id}&role=${activeRole}&userId=${user?.id}&date=${selectedDate}`;
            if (activeRole === 'STUDENT' && user?.metadata?.classId) {
                url += `&classId=${user.metadata.classId}`;
                if (user.metadata.groupId) url += `&groupId=${user.metadata.groupId}`;
            }

            const assignmentsRes = await fetch(url);
            const assignmentsData = await assignmentsRes.json();
            if (Array.isArray(assignmentsData)) setAssignments(assignmentsData);

            // Fetch Classes & Books (needed for creation and filtering)
            const classesRes = await fetch(`/api/admin/classes?instituteId=${activeInstitute.id}`);
            const classesDataRaw = await classesRes.json();
            const classesData = Array.isArray(classesDataRaw) ? classesDataRaw : [];

            const booksRes = await fetch(`/api/admin/books?instituteId=${activeInstitute.id}`);
            const booksDataRaw = await booksRes.json();
            const booksData = Array.isArray(booksDataRaw) ? booksDataRaw : [];

            if (activeRole === 'TEACHER' && user?.id) {
                const teachersRes = await fetch(`/api/teacher?instituteId=${activeInstitute.id}`);
                const teachersDataRaw = await teachersRes.json();
                const teachersData = Array.isArray(teachersDataRaw) ? teachersDataRaw : [];
                const profile = teachersData.find((t: any) => t.userId === user.id);
                setTeacherProfile(profile);

                if (profile && profile.assignedClassIds) {
                    const filteredClasses = classesData.filter((c: any) => profile.assignedClassIds.includes(c.id));
                    setClasses(filteredClasses);
                    if (!selectedClassId && filteredClasses.length > 0) {
                        setSelectedClassId(filteredClasses[0].id);
                    }
                } else {
                    setClasses(classesData);
                }
            } else if (activeRole === 'STUDENT' && user?.metadata?.classId) {
                const studentClass = classesData.find((c: any) => c.id === user.metadata?.classId);
                if (studentClass) {
                    setClasses([studentClass]);
                    setSelectedClassId(studentClass.id);
                } else {
                    setClasses([]);
                }
            } else if (activeRole === 'GUARDIAN' && user?.metadata) {
                // For guardians, we show all classes their children are in
                const childrenIdsRaw = user.metadata.childrenIds || (user.metadata.studentId ? [user.metadata.studentId] : []);
                const childrenIds = Array.isArray(childrenIdsRaw) ? childrenIdsRaw : [];
                if (childrenIds.length > 0) {
                    const childrenRes = await fetch(`/api/admin/users?ids=${childrenIds.join(',')}`);
                    const childrenData = await childrenRes.json();
                    if (Array.isArray(childrenData)) {
                        const classIds = childrenData.map((c: any) => c.metadata?.classId).filter(Boolean);
                        const filteredClasses = classesData.filter((c: any) => classIds.includes(c.id));
                        setClasses(filteredClasses);
                    } else {
                        console.error('Expected childrenData to be array, got:', childrenData);
                        setClasses([]);
                    }
                    // For guardians, we default to null (All) to show everything initially
                    setSelectedClassId(null);
                }
            } else {
                setClasses(classesData);
            }

            if (Array.isArray(booksData)) setBooks(booksData);

        } catch (error) {
            console.error(error);
            showToast('তথ্য লোড করতে সমস্যা হয়েছে', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthData = async (dateStr: string) => {
        if (!activeInstitute?.id) return;
        const date = new Date(dateStr);
        const y = date.getFullYear();
        const m = date.getMonth();
        const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)).toISOString().split('T')[0];
        const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)).toISOString().split('T')[0];

        try {
            const res = await fetch(`/api/assignments?instituteId=${activeInstitute.id}&role=${activeRole}&userId=${user?.id}&startDate=${start}&endDate=${end}`);
            const data = await res.json();
            if (Array.isArray(data)) setMonthAssignments(data);
        } catch (error) {
            console.error('Fetch Month Error:', error);
        }
    };

    const prevDateRef = useRef(selectedDate);

    useEffect(() => {
        if (currentTab === 'history') {
            const isDateChange = prevDateRef.current !== selectedDate;
            fetchData(isDateChange);
            if (viewMode === 'calendar') fetchMonthData(selectedDate);
            prevDateRef.current = selectedDate;
        }
    }, [activeInstitute?.id, activeRole, selectedDate, currentTab]);

    useEffect(() => {
        if (currentTab === 'history' && viewMode === 'calendar') {
            fetchMonthData(selectedDate);
        }
    }, [viewMode]);

    const handleCreateAssignment = async (data: any) => {
        try {
            const res = await fetch('/api/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast('ক্লাস ডাইরি সফলভাবে তৈরি করা হয়েছে', 'success');
                fetchData();
            } else {
                showToast('ক্লাস ডাইরি তৈরি করতে ব্যর্থ হয়েছে', 'error');
            }
        } catch (error) {
            showToast('সার্ভার এরর, পুনরায় চেষ্টা করুন', 'error');
        }
    };

    const filteredAssignments = assignments.filter(a => {
        const matchesSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedType === 'all' || a.type === selectedType;
        const matchesClass = (selectedClassId === 'all' || !selectedClassId) || a.classId === selectedClassId;
        const matchesSubject = (selectedSubjectId === 'all' || !selectedSubjectId) || a.bookId === selectedSubjectId;
        return matchesSearch && matchesType && matchesClass && matchesSubject;
    });

    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    const isTeacher = activeRole === 'TEACHER';
    const isAdmin = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN';
    const isStudent = activeRole === 'STUDENT';
    const isGuardian = activeRole === 'GUARDIAN';

    // Get subjects for the selected class
    const filterSubjects = React.useMemo(() => {
        if (isStudent && user?.metadata?.classId) {
            return books.filter(b => b.classId === user.metadata?.classId);
        }
        if (isTeacher && teacherProfile && selectedClassId) {
            const classData = teacherProfile.permissions?.classWise?.[selectedClassId];
            if (!classData || !classData.bookIds) return [];
            // Guard: bookIds must be an array to call .includes()
            if (!Array.isArray(classData.bookIds)) return [];
            return books.filter(b => classData.bookIds.includes(b.id));
        }
        return [];
    }, [isTeacher, isStudent, user, teacherProfile, selectedClassId, books]);

    // Handle Tab Change
    const setTab = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`/dashboard/assignments?${params.toString()}`);
    };

    const handleEdit = (assignment: any) => {
        setEditingAssignment(assignment);
        setTab('entry');
        showToast('ক্লাস ডাইরি এডিট মোডে লোড হয়েছে', 'success');
    };

    const handleBulkHistoryRelease = async (ids?: string[]) => {
        const idsToRelease = ids || selectedHistoryIds;
        if (!activeInstitute?.id || idsToRelease.length === 0) return;

        setIsBulkReleasing(true);
        try {
            const res = await fetch(`/api/assignments/release?instituteId=${activeInstitute.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignmentIds: idsToRelease })
            });

            if (res.ok) {
                const data = await res.json();
                showToast(`${data.releasedCount}টি ক্লাস ডাইরি রিলিজ করা হয়েছে`, 'success');
                setSelectedHistoryIds([]);
                fetchData();
            } else {
                showToast('রিলিজ করতে ব্যর্থ হয়েছে', 'error');
            }
        } catch (error) {
            console.error('Bulk Release Error:', error);
            showToast('সার্ভার এরর', 'error');
        } finally {
            setIsBulkReleasing(false);
        }
    };

    const handleRevert = async (assignment: any) => {
        if (!activeInstitute?.id) return;

        const confirmed = await confirm(`আপনি কি নিশ্চিত যে আপনি "${assignment.title}" ক্লাস ডাইরিটি প্রত্যাহার করতে চান? এটি শিক্ষার্থীদের ডাইরি থেকে মুছে যাবে এবং তাদের কাছে একটি দুঃখিত মেসেজ যাবে।`);

        if (!confirmed) return;

        try {
            const res = await fetch(`/api/assignments/revert?instituteId=${activeInstitute.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignmentId: assignment.id })
            });

            if (res.ok) {
                const data = await res.json();
                showToast(`ক্লাস ডাইরি প্রত্যাহার করা হয়েছে এবং ${data.notificationCount}টি নোটিফিকেশন পাঠানো হয়েছে`, 'success');
                fetchData();
            } else {
                showToast('ক্লাস ডাইরি প্রত্যাহার করতে ব্যর্থ হয়েছে', 'error');
            }
        } catch (error) {
            console.error('Revert Error:', error);
            showToast('সার্ভার এরর, পুনরায় চেষ্টা করুন', 'error');
        }
    };

    // Group assignments by date AND class for the "Day Cards" view
    const groupedAssignments = React.useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        filteredAssignments.forEach(a => {
            const date = new Date(a.createdAt).toISOString().split('T')[0];
            const key = `${date}_${a.classId}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(a);
        });
        return groups;
    }, [filteredAssignments]);

    const [selectedDayAssignments, setSelectedDayAssignments] = useState<any[] | null>(null);
    const [mobilePanel, setMobilePanel] = useState<'task' | 'review'>('task');

    return (
        <div className="px-4 md:px-8 pt-2 animate-fade-in-up font-bengali min-h-screen pb-20">

            {/* ── Mobile two-tab switcher (hidden on lg+) ── */}
            {isAdminOrTeacher && (
                <div className="flex lg:hidden mb-6 p-1.5 bg-white/60 backdrop-blur-2xl rounded-[24px] border border-white shadow-sm gap-1.5 overflow-hidden">
                    <button
                        onClick={() => setMobilePanel('task')}
                        className={`flex-1 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${mobilePanel === 'task' ? 'bg-[#045c84] text-white shadow-lg shadow-[#045c84]/20' : 'text-slate-400 hover:bg-white/50'
                            }`}>
                        📋 ডাইরি ম্যানেজমেন্ট
                    </button>
                    <button
                        onClick={() => setMobilePanel('review')}
                        className={`flex-1 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${mobilePanel === 'review' ? 'bg-[#045c84] text-white shadow-lg shadow-[#045c84]/20' : 'text-slate-400 hover:bg-white/50'
                            }`}>
                        📥 জমা পর্যালোচনা
                    </button>
                </div>
            )}

            {/* ── Main Layout ── */}
            <div className={`flex flex-col lg:flex-row gap-6 items-stretch ${isAdminOrTeacher ? '' : ''}`}>

                {/* Left Column: Task Panel */}
                <div className={`flex-1 min-w-0 overflow-hidden space-y-4 ${isAdminOrTeacher ? (mobilePanel === 'task' ? 'block' : 'hidden') : 'block'} lg:block`}>
                    {(isTeacher || isAdmin) && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <TeacherAssignmentPanel
                                activeTab={currentTab}
                                onTabChange={setTab}
                                calendarViewMode={viewMode}
                                onCalendarViewModeChange={setViewMode}
                                initialEditingAssignment={editingAssignment}
                                onEditComplete={() => {
                                    setEditingAssignment(null);
                                    fetchData();
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Right Column: Submission Review – always visible on lg+, mobile-tab-controlled below */}
                {(isTeacher || isAdmin) && (
                    <div className={`w-full lg:w-[280px] xl:w-[380px] shrink-0 lg:sticky lg:top-4 xl:top-6 lg:h-[calc(100vh-6rem)] ${mobilePanel === 'review' ? 'block' : 'hidden'
                        } lg:block`}>
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full">
                            <SubmissionReviewPanel />
                        </div>
                    </div>
                )}

            </div>

            <AssignmentDetailsModal
                isOpen={!!selectedDayAssignments}
                onClose={() => setSelectedDayAssignments(null)}
                assignments={selectedDayAssignments || []}
                onEdit={handleEdit}
                onRevert={handleRevert}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

export default function AssignmentsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold">Loading...</div>}>
            <AssignmentsPageContent />
        </Suspense>
    );
}
