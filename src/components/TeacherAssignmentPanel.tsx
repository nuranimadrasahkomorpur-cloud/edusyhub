'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    ClipboardList,
    Plus,
    CheckCircle2,
    Clock,
    GraduationCap,
    X,
    PenTool,
    ArrowRight,
    CheckCircle,
    Loader2,
    Settings,
    TrendingUp,
    History as HistoryIcon,
    LayoutGrid,
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    BookOpen,
    FileText,
    Home,
    ArrowUp,
    Check,
    Users,
    Search,
    Sparkles,
    ArrowLeft,
    Trash2
} from 'lucide-react';
import { useSession } from '@/components/SessionProvider';
import { useUI } from './UIProvider';
import AssignmentDetailsModal from './AssignmentDetailsModal';
import AssignmentEditorPanel from './AssignmentEditorPanel';
import Toast from './Toast';
import ClassScheduleSettingsModal from './ClassScheduleSettingsModal';
import Diary3D from './Diary3D';
import InlineMarkdown from './InlineMarkdown';
import RichTextEditor, { RichTextEditorRef } from './RichTextEditor';

interface ClassData {
    id: string;
    name: string;
}

interface BookData {
    id: string;
    name: string;
    coverImage?: string | null;
}

interface SubjectStatus {
    classId: string;
    className: string;
    bookId: string;
    bookName: string;
    coverImage?: string | null;
    isDone: boolean;
    assignmentId?: string;
    submittedBy?: string; // Added to show who submitted
    assignedTo?: string; // Added to show who is responsible (teacher name)
    status?: string; // Added to track DRAFT/RELEASED
    pendingCount?: number; // Added to show pending submissions
    submittedCount?: number; // Added to show total submissions
    totalStudents?: number; // Added to show total students in class
    canEdit?: boolean; // Added to restrict editing
    assignment?: any; // Store one assignment for legacy compatibility
    assignments?: any[]; // Store all assignments for this subject/date
    isMultiple?: boolean; // Flag to indicate if multiple entries exist
}

const ALL_TAGS = [
    { id: 'read', label: 'পড়া', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'write', label: 'লেখা', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'memo', label: 'মুখস্থ', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'notes', label: 'নোট', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'exercise', label: 'অনুশীলনী', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'chapter', label: 'অধ্যায়', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'lesson', label: 'পাঠ', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'meaning', label: 'শব্দার্থ', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'qa', label: 'প্রশ্ন-উত্তর', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'grammar', label: 'ব্যাকরণ', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'test', label: 'পরীক্ষা', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'correction', label: 'সংশোধন', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'drawing', label: 'ছবি/চিত্র', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'map', label: 'মানচিত্র', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'mcq', label: 'MCQ', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'creative', label: 'সৃজনশীল', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'excellent', label: 'চমৎকার', color: 'bg-blue-50 text-[#045c84] border-blue-100' }, // Feedback tags might stay slightly distinct? No, "not colorful" means everything.
    { id: 'attentive', label: 'মনোযোগী', color: 'bg-slate-50 text-emerald-600 border-slate-200' },
    { id: 'improving', label: 'উন্নতি করছে', color: 'bg-slate-50 text-indigo-600 border-slate-200' },
    { id: 'incomplete', label: 'অসম্পূর্ণ', color: 'bg-slate-50 text-amber-600 border-slate-200' },
    { id: 'late', label: 'দেরি', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    { id: 'parent-call', label: 'অভিভাবক সাক্ষাত', color: 'bg-slate-50 text-rose-600 border-slate-200' },
    { id: 'behavior', label: 'আচরণ ভালো', color: 'bg-slate-50 text-slate-500 border-slate-200' }
];

interface TeacherAssignmentPanelProps {
    onClose?: () => void;
    initialView?: 'LIST' | 'EDITOR';
    initialSubject?: { classId: string, bookId: string } | null;
    onSubjectClick?: (classId: string, bookId: string) => void;
    hideTitle?: boolean;
    initialEditingAssignment?: any;
    onEditComplete?: () => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    calendarViewMode?: 'list' | 'calendar';
    onCalendarViewModeChange?: (mode: 'list' | 'calendar') => void;
}

export default function TeacherAssignmentPanel({
    onClose,
    initialView = 'LIST',
    initialSubject = null,
    onSubjectClick,
    hideTitle = false,
    initialEditingAssignment,
    onEditComplete,
    activeTab = 'entry',
    onTabChange,
    calendarViewMode = 'list',
    onCalendarViewModeChange
}: TeacherAssignmentPanelProps) {
    const { user, activeInstitute } = useSession();
    const ui = useUI();
    const classScrollRef = React.useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<SubjectStatus[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [allClasses, setAllClasses] = useState<ClassData[]>([]);
    const [allBooks, setAllBooks] = useState<BookData[]>([]);
    const [allStudents, setAllStudents] = useState<any[]>([]);

    // View State: LIST or EDITOR
    const [viewState, setViewState] = useState<'LIST' | 'EDITOR'>(initialView);
    const [selectedEntry, setSelectedEntry] = useState<{ classId: string, bookId: string } | null>(initialSubject);

    const [selectedDiaryClass, setSelectedDiaryClass] = useState<string | null>(null);
    const [selectedDiarySubject, setSelectedDiarySubject] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState<'MINE' | 'ALL'>((user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? 'ALL' : 'MINE');
    const [activeClassTab, setActiveClassTab] = useState<string>('ALL');
    const [activeStatusTab, setActiveStatusTab] = useState<string>('TOTAL');

    // Details Modal State
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [editingAssignment, setEditingAssignment] = useState<any>(initialEditingAssignment || null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [releasingId, setReleasingId] = useState<string | null>(null);
    const [isBulkReleasing, setIsBulkReleasing] = useState(false);
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
    const [scheduleModalClass, setScheduleModalClass] = useState<{ id: string; name: string; schedule?: any } | null>(null);
    
    // Lock body scroll when diary modal is open
    useEffect(() => {
        if (selectedDiaryClass) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [selectedDiaryClass]);

    // Theme Mode
    const [themeMode, setThemeMode] = useState<'modern' | 'diary'>('modern');
    const [fastEntryBookId, setFastEntryBookId] = useState<string | null>(null);
    const [fastEntryText, setFastEntryText] = useState('');
    const [activeCategory, setActiveCategory] = useState<'HW' | 'CW' | 'PR' | 'CM'>('HW');
    const [isFastSubmitting, setIsFastSubmitting] = useState(false);
    const [editingFastEntryId, setEditingFastEntryId] = useState<string | null>(null);
    const [targetedStudentIds, setTargetedStudentIds] = useState<string[]>([]);
    const [isStudentSidebarOpen, setIsStudentSidebarOpen] = useState(false);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [classSearchQuery, setClassSearchQuery] = useState('');
    const [activeStudentGroup, setActiveStudentGroup] = useState<string>('ALL');
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedDiaryTaskIds, setSelectedDiaryTaskIds] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const editorRef = useRef<RichTextEditorRef>(null);

    // Fetch groups when class is selected
    useEffect(() => {
        const fetchClassGroups = async () => {
            const cls = allClasses.find(c => c.name === selectedDiaryClass);
            if (!cls?.id) {
                setGroups([]);
                return;
            }
            try {
                const res = await fetch(`/api/admin/groups?classId=${cls.id}`);
                const data = await res.json();
                setGroups(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Fetch groups error:', error);
                setGroups([]);
            }
        };

        if (selectedDiaryClass) {
            fetchClassGroups();
        } else {
            setGroups([]);
        }
    }, [selectedDiaryClass, allClasses]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBulkRelease = async (ids?: string[]) => {
        const idsToRelease = ids || selectedIds;
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
                setSelectedIds([]);
                await fetchData();
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

    const handleSingleRelease = async (assignmentId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await handleBulkRelease([assignmentId]);
    };

    const getBengaliDate = (dateString: string) => {
        const date = new Date(dateString);
        const months = [
            'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        const days = [
            'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
        ];

        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const dayName = days[date.getDay()];

        const bnDigits: any = {
            '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
        };
        const toBn = (n: number | string) => n.toString().split('').map(d => bnDigits[d] || d).join('');

        return `${toBn(day)} ${month} ${toBn(year)}, ${dayName}`;
    };

    const handleDeleteEntry = async (item: any) => {
        if (!confirm('আপনি কি এই এন্ট্রিটি মুছে ফেলতে চান?')) return;
        
        try {
            // If it's a simple assignment or the last task in a multi-task assignment, delete the whole record
            const description = item.originalAssignment.description || '';
            let parsed: any;
            try { parsed = JSON.parse(description); } catch { parsed = null; }

            if (!parsed || !parsed.sections) {
                // Simple entry, delete assignment
                const res = await fetch(`/api/assignments?id=${item.originalId}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast('এন্ট্রি মুছে ফেলা হয়েছে', 'success');
                    await fetchData();
                } else {
                    showToast('মুছতে ব্যর্থ হয়েছে', 'error');
                }
            } else {
                // Multi-task entry, remove the specific task and update
                const newSections = parsed.sections.map((section: any) => ({
                    ...section,
                    tasks: section.tasks.filter((t: any) => {
                        const taskText = (t.text || t).toString();
                        return taskText !== item.text;
                    })
                })).filter((s: any) => s.tasks.length > 0);

                if (newSections.length === 0) {
                    // No tasks left, delete assignment
                    const res = await fetch(`/api/assignments?id=${item.originalId}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('এন্ট্রি মুছে ফেলা হয়েছে', 'success');
                        await fetchData();
                    }
                } else {
                    // Update assignment with filtered tasks
                    const updatedDescription = JSON.stringify({ sections: newSections });
                    const res = await fetch('/api/assignments', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: item.originalId, description: updatedDescription })
                    });
                    if (res.ok) {
                        showToast('টাস্ক মুছে ফেলা হয়েছে', 'success');
                        await fetchData();
                    }
                }
            }
        } catch (error) {
            console.error('Delete Error:', error);
            showToast('সার্ভার এরর', 'error');
        }
    };

    const handleEditTask = (task: any, category: 'HW' | 'CW' | 'PR' | 'CM', className: string, bookId: string) => {
        const text = typeof task === 'string' ? task : (task.text || (task.segments && task.segments.map((s:any)=>s.value).join('')) || '');
        setFastEntryText(text);
        setActiveCategory(category);
        setEditingFastEntryId(text);
        setTargetedStudentIds(task.targetStudents || []);
        setSelectedDiaryClass(className);
        setFastEntryBookId(bookId);
        
        // Focus editor
        setTimeout(() => editorRef.current?.focus(), 100);
    };

    const handleFastSubmit = async () => {
        const currentMarkdown = editorRef.current?.getMarkdown() || '';
        if (!activeInstitute?.id || !user?.id || !selectedDiaryClass || !fastEntryBookId || !currentMarkdown.trim()) {
            showToast('দয়া করে ডায়েরি এন্ট্রি লিখুন', 'error');
            return;
        }

        setIsFastSubmitting(true);
        try {
            const clsObj = allClasses.find(c => c.name === selectedDiaryClass);
            if (!clsObj) throw new Error('Class not found');

            const categoryTitleMap = {
                'HW': 'বাড়ির কাজ (Homework)',
                'CW': 'ক্লাসের পড়া (Classwork)',
                'PR': 'আগামীকাল ক্লাসের পড়া (Preparation)',
                'CM': 'মন্তব্য (Comments)'
            };
            
            const targetSectionTitle = categoryTitleMap[activeCategory];

            // 1. Find existing assignment for this book and date
            const existingAssignment = subjects.find(s => s.bookId === fastEntryBookId)?.assignment;
            
            let updatedSections: { title: string, tasks: any[] }[] = [
                { title: 'ক্লাসের পড়া (Classwork)', tasks: [] },
                { title: 'আগামীকাল ক্লাসের পড়া (Preparation)', tasks: [] },
                { title: 'বাড়ির কাজ (Homework)', tasks: [] },
                { title: 'মন্তব্য (Comments)', tasks: [] }
            ];

            // 2. Parse existing if available
            if (existingAssignment?.description) {
                try {
                    const parsed = JSON.parse(existingAssignment.description);
                    if (parsed.sections) {
                        // Merge existing sections
                        updatedSections = updatedSections.map(defSec => {
                            const existingSec = parsed.sections.find((s: any) => s.title === defSec.title || (s.title.includes('Classwork') && defSec.title.includes('Classwork')) || (s.title.includes('Homework') && defSec.title.includes('Homework')) || (s.title.includes('Preparation') && defSec.title.includes('Preparation')) || (s.title.includes('Comments') && defSec.title.includes('Comments')));
                            return existingSec ? { ...defSec, tasks: existingSec.tasks || [] } : defSec;
                        });
                    }
                } catch (e) {
                    // Legacy plain text, put it in HW
                    updatedSections[2].tasks = [{ 
                        id: `task-legacy-${Date.now()}`, 
                        segments: [{ type: 'text', value: existingAssignment.description }],
                        targetStudents: []
                    }];
                }
            }


            // 4. Update the specific section
            const isUpdate = !!editingFastEntryId;
            let existingId = `task-${Date.now()}-${Math.random()}`;
            
            if (isUpdate) {
                // Find and remove from any existing section (handles category change)
                updatedSections.forEach(section => {
                    const idx = section.tasks.findIndex((t: any) => {
                        const taskId = t.id || t.originalId; 
                        const taskText = typeof t === 'string' ? t : (t.text || (t.segments && t.segments.map((s:any)=>s.value).join('')) || '');
                        return taskId === editingFastEntryId || taskText === editingFastEntryId;
                    });
                    if (idx !== -1) {
                        if (section.tasks[idx].id) existingId = section.tasks[idx].id;
                        section.tasks.splice(idx, 1);
                    }
                });
            }

            let targetSection = updatedSections.find(s => s.title === targetSectionTitle);
            if (!targetSection) {
                targetSection = { title: targetSectionTitle, tasks: [] };
                updatedSections.push(targetSection);
            }

            const finalTask = {
                id: existingId,
                text: currentMarkdown,
                segments: [{ id: `seg-${Date.now()}`, type: 'text', value: currentMarkdown }],
                targetStudents: targetedStudentIds.length > 0 ? targetedStudentIds : []
            };

            targetSection.tasks.push(finalTask as any);

            // 5. Generate Markdown
            const generateMarkdown = (sections: any[]) => {
                let md = '';
                sections.forEach(sec => {
                    if (sec.tasks && sec.tasks.length > 0) {
                        md += `### ${sec.title}\n`;
                        sec.tasks.forEach((t: any) => {
                            const text = typeof t === 'string' ? t : (t.text || (t.segments && t.segments.map((s:any)=>s.value).join('')) || '');
                            let line = `- ${text}`;
                            if (t.targetStudents && t.targetStudents.length > 0) {
                                line += ` <strong style="color: #2563eb;">→ Targeted Students</strong>`;
                            }
                            md += `${line}\n`;
                        });
                        md += `\n`;
                    }
                });
                return md;
            };

            const structuredDescription = JSON.stringify({
                version: '2.0',
                sections: updatedSections,
                fullMarkdown: generateMarkdown(updatedSections)
            });

            const payload: any = {
                instituteId: activeInstitute.id,
                teacherId: user.id,
                classId: clsObj.id,
                bookId: fastEntryBookId,
                description: structuredDescription,
                scheduledDate: selectedDate,
                status: 'DRAFT',
                type: 'HOMEWORK',
                studentIds: [] // Root student ids usually empty in v2, managed per task, but we can pass targeted if needed
            };

            const targetAssignmentId = existingAssignment?.id;

            const res = await fetch('/api/assignments', {
                method: targetAssignmentId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(targetAssignmentId ? { ...payload, id: targetAssignmentId } : payload)
            });

            if (res.ok) {
                showToast(isUpdate ? 'এন্ট্রি আপডেট হয়েছে' : 'ডায়েরি এন্ট্রি সেভ হয়েছে', 'success');
                setFastEntryText('');
                setEditingFastEntryId(null);
                setTargetedStudentIds([]);
                await fetchData();
            } else {
                showToast('সেভ করতে ব্যর্থ হয়েছে', 'error');
            }
        } catch (error) {
            console.error('Fast Submit Error:', error);
            showToast('সার্ভার এরর', 'error');
        } finally {
            setIsFastSubmitting(false);
        }
    };

    const fetchData = async (silent = false) => {
        if (!activeInstitute?.id || !user?.id) return;
        if (!silent) setLoading(true);
        try {
            const isMINE = viewMode === 'MINE';

            // 1. Fetch data
            const [classesRes, booksRes, teachersRes, assignmentsRes, studentsRes] = await Promise.all([
                fetch(`/api/admin/classes?instituteId=${activeInstitute.id}`),
                fetch(`/api/admin/books?instituteId=${activeInstitute.id}`),
                fetch(`/api/teacher?instituteId=${activeInstitute.id}`),
                fetch(`/api/assignments?instituteId=${activeInstitute.id}&role=TEACHER&userId=${user.id}&date=${selectedDate}${isMINE ? '&ownOnly=true' : ''}`),
                fetch(`/api/admin/users?instituteId=${activeInstitute.id}&role=STUDENT`)
            ]);

            const [classes, books, teachers, dateAssignments, students] = await Promise.all([
                classesRes.json(),
                booksRes.json(),
                teachersRes.json(),
                assignmentsRes.json(),
                studentsRes.json()
            ]);

            // Guard: if any core response is not an array, bail out early to avoid wiping existing data
            if (!Array.isArray(classes) || !Array.isArray(books) || !Array.isArray(teachers)) {
                console.error('Unexpected API response format — aborting fetchData to preserve existing view', { classes, books, teachers });
                return;
            }

            setAllClasses(classes);
            setAllBooks(books);
            setTeachers(teachers);
            setAllStudents(students);

            // Calculate student counts per class
            const counts: Record<string, number> = {};
            if (Array.isArray(students)) {
                students.forEach((s: any) => {
                    const cId = s.metadata?.classId;
                    if (cId) counts[cId] = (counts[cId] || 0) + 1;
                });
            }

            // Safe fallback: if dateAssignments is not an array (API error), use empty array
            const safeAssignments = Array.isArray(dateAssignments) ? dateAssignments : [];

            const subjectList: SubjectStatus[] = [];
            const processedPairs = new Set<string>();

            if (viewMode === 'ALL') {
                classes.forEach((cls: any) => {
                    const classBooks = books.filter((b: any) => b.classId === cls.id);
                    classBooks.forEach((book: any) => {
                        const pairKey = `${cls.id}-${book.id}`;
                        if (processedPairs.has(pairKey)) return;
                        processedPairs.add(pairKey);

                        const subjectAssignments = safeAssignments.filter((a: any) => a.classId === cls.id && a.bookId === book.id);
                        const firstAssignment = subjectAssignments[0];

                        // Find assigned teacher(s)
                        const assignedTeacher = teachers.find((t: any) =>
                            t.permissions?.classWise?.[cls.id]?.bookIds?.includes(book.id)
                        );

                        const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
                        const isAssigned = assignedTeacher?.userId === user?.id;

                        subjectList.push({
                            classId: cls.id,
                            className: cls.name,
                            bookId: book.id,
                            bookName: book.name,
                            coverImage: book.coverImage,
                            isDone: subjectAssignments.length > 0,
                            status: firstAssignment?.status,
                            assignmentId: firstAssignment?.id,
                            submittedBy: firstAssignment?.teacher?.name,
                            assignedTo: assignedTeacher?.user?.name,
                            submittedCount: subjectAssignments.reduce((acc, a) => acc + (a.submissions?.length || 0), 0),
                            totalStudents: counts[cls.id] || 0,
                            pendingCount: subjectAssignments.reduce((acc, a) => acc + (a.submissions?.filter((s: any) => s.status === 'SUBMITTED').length || 0), 0),
                            canEdit: isAdmin || isAssigned,
                            assignment: firstAssignment,
                            assignments: subjectAssignments,
                            isMultiple: subjectAssignments.length > 1
                        });
                    });
                });
            } else {
                const currentUserProfile = teachers.find((t: any) => t.userId === user.id);
                if (currentUserProfile?.permissions?.classWise) {
                    Object.keys(currentUserProfile.permissions.classWise).forEach(classId => {
                        const classInfo = classes.find((c: any) => c.id === classId);
                        if (!classInfo) return;

                        const bookIds = currentUserProfile.permissions.classWise[classId].bookIds || [];
                        bookIds.forEach((bookId: string) => {
                            const pairKey = `${classId}-${bookId}`;
                            if (processedPairs.has(pairKey)) return;
                            processedPairs.add(pairKey);

                            const bookInfo = books.find((b: any) => b.id === bookId);
                            if (!bookInfo) return;

                            const assignment = safeAssignments.find((a: any) => a.classId === classId && a.bookId === bookId);

                            const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

                            subjectList.push({
                                classId: classId,
                                className: classInfo.name,
                                bookId: bookId,
                                bookName: bookInfo.name,
                                coverImage: bookInfo.coverImage,
                                isDone: !!assignment,
                                status: assignment?.status,
                                assignmentId: assignment?.id,
                                submittedBy: assignment?.teacher?.name,
                                assignedTo: user.name || 'আপনি',
                                submittedCount: assignment?.submissions?.length || 0,
                                totalStudents: counts[classId] || 0,
                                pendingCount: assignment?.submissions?.filter((s: any) => s.status === 'SUBMITTED').length || 0,
                                canEdit: true, // In MINE mode, it's already filtered to their subjects, or they are Admin
                                assignment
                            });
                        });
                    });
                }
            }

            setSubjects(subjectList);
        } catch (error) {
            console.error('Failed to fetch teacher assignment status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialEditingAssignment) {
            setEditingAssignment(initialEditingAssignment);
            setViewState('EDITOR');
            setSelectedEntry({
                classId: initialEditingAssignment.classId,
                bookId: initialEditingAssignment.bookId
            });
        }
    }, [initialEditingAssignment]);

    const prevDateRef = useRef(selectedDate);
    const prevViewModeRef = useRef(viewMode);

    useEffect(() => {
        const isDateChange = prevDateRef.current !== selectedDate;
        const isViewModeChange = prevViewModeRef.current !== viewMode;
        
        // Pass true (silent) if modifying anything other than a hard refresh, or simply date change handles silent, so viewMode change can also be silent
        fetchData(isDateChange || isViewModeChange);
        
        prevDateRef.current = selectedDate;
        prevViewModeRef.current = viewMode;
    }, [activeInstitute?.id, user?.id, selectedDate, viewMode]);

    // Center active tab when it changes
    useEffect(() => {
        if (classScrollRef.current && activeClassTab) {
            const container = classScrollRef.current;
            const activeBtn = container.querySelector(`[data-class-id="${activeClassTab}"]`) as HTMLElement;
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
    }, [activeClassTab]);



    const handleEntry = (classId: string, bookId: string) => {
        if (onSubjectClick) {
            onSubjectClick(classId, bookId);
        } else {
            setSelectedEntry({ classId, bookId });
            setEditingAssignment(null); // Ensure we're creating new
            setViewState('EDITOR'); // Switch to Editor view
            if (ui?.setAssignmentModalView) ui.setAssignmentModalView('EDITOR'); // Sync global UI state
        }
    };

    const handleEditAssignment = (assignment: any) => {
        setEditingAssignment(assignment);
        setSelectedEntry({ classId: assignment.classId, bookId: assignment.bookId });
        setViewState('EDITOR');
        if (ui?.setAssignmentModalView) ui.setAssignmentModalView('EDITOR');
    };

    if (loading) {
        return (
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex items-center justify-center min-h-[200px]">
                <Loader2 className="animate-spin text-[#045c84]" size={32} />
            </div>
        );
    }

    // EDITOR VIEW
    if (viewState === 'EDITOR' && selectedEntry) {
        return (
            <AssignmentEditorPanel
                onBack={() => {
                    setViewState('LIST');
                    if (ui?.setAssignmentModalView) ui.setAssignmentModalView('LIST');
                    setSelectedEntry(null);
                    setEditingAssignment(null);
                }}
                onSave={async (data) => {
                    const isUpdate = !!editingAssignment?.id;
                    const res = await fetch('/api/assignments', {
                        method: isUpdate ? 'PATCH' : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(isUpdate ? { ...data, id: editingAssignment.id } : data)
                    });

                    if (res.ok) {
                        setToast({ message: 'ক্লাস ডাইরি সফলভাবে সেভ করা হয়েছে', type: 'success' });
                        await fetchData(); // Refresh data

                        // Small delay before returning to list so user sees the toast
                        setTimeout(() => {
                            setViewState('LIST'); // Return to list
                            if (ui?.setAssignmentModalView) ui.setAssignmentModalView('LIST'); // Sync global UI state
                            setSelectedEntry(null); // Clear selection
                            setEditingAssignment(null);
                            if (onEditComplete) onEditComplete();
                        }, 1000);
                    } else {
                        let errorMessage = 'সেভ করতে ব্যর্থ হয়েছে';
                        try {
                            const errorData = await res.json();
                            errorMessage = errorData.message || errorMessage;
                        } catch (e) {
                            console.error('Failed to parse error response');
                        }
                        setToast({ message: errorMessage, type: 'error' });
                    }
                }}
                classes={allClasses}
                books={allBooks}
                teacherId={user?.id || ''}
                instituteId={activeInstitute?.id || ''}
                initialClassId={selectedEntry.classId}
                initialBookId={selectedEntry.bookId}
                scheduledDate={selectedDate}
                initialAssignment={editingAssignment}
            />
        );
    }

    // LIST VIEW (Default)
    const filteredSubjects = activeClassTab === 'ALL'
        ? subjects
        : subjects.filter(s => s.classId === activeClassTab);

    const availableClasses = [...allClasses].sort((a, b) => a.name.localeCompare(b.name));

    // Status Filter Logic
    const stats = {
        TOTAL: filteredSubjects.length,
        DRAFTING: filteredSubjects.filter(s => s.status === 'DRAFT').length,
        WAITING: filteredSubjects.filter(s => !s.isDone).length,
        RELEASED: filteredSubjects.filter(s => s.status === 'RELEASED').length,
        SUBMITTED: filteredSubjects.filter(s => (s.pendingCount || 0) > 0).length,
        APPROVED: filteredSubjects.filter(s => s.isDone && (s.pendingCount || 0) === 0 && s.status === 'RELEASED').length,
    };

    const displaySubjects = (() => {
        // Always show all subjects in entry tab to allow management/creation
        if (activeTab === 'entry') return filteredSubjects;

        switch (activeStatusTab) {
            case 'DRAFTING': return filteredSubjects.filter(s => s.status === 'DRAFT');
            case 'WAITING': return filteredSubjects.filter(s => !s.isDone);
            case 'RELEASED': return filteredSubjects.filter(s => s.status === 'RELEASED');
            case 'SUBMITTED': return filteredSubjects.filter(s => (s.pendingCount || 0) > 0);
            case 'APPROVED': return filteredSubjects.filter(s => s.isDone && (s.pendingCount || 0) === 0 && s.status === 'RELEASED');
            default: return filteredSubjects;
        }
    })();

    // Group subjects by class for unified management
    const groupedByClass = allClasses
        .filter(cls => (activeClassTab === 'ALL' || activeClassTab === cls.id) && (!classSearchQuery || cls.name.toLowerCase().includes(classSearchQuery.toLowerCase())))
        .reduce((acc: Record<string, SubjectStatus[]>, cls) => {
        // Find all subjects registered for this class in the system
        const classSubjectsInSystem = subjects.filter(s => s.classId === cls.id);
        
        // Find subjects that match current status filters
        const matchingStatusSubjects = displaySubjects.filter(s => s.classId === cls.id);

        // For the Clean Page view or Entry tab, we want all subjects available for that class
        if (selectedDiaryClass === cls.name || activeTab === 'entry') {
            acc[cls.name] = classSubjectsInSystem;
        } else if (matchingStatusSubjects.length > 0) {
            acc[cls.name] = matchingStatusSubjects;
        }
        return acc;
    }, {});

    const handleBulkDelete = async () => {
        if (selectedDiaryTaskIds.length === 0) return;
        if (!window.confirm(`আপনি কি নিশ্চিত যে আপনি ${selectedDiaryTaskIds.length}টি টাস্ক মুছে ফেলতে চান?`)) return;

        try {
            const tasksByAssignment = selectedDiaryTaskIds.reduce((acc: any, id) => {
                const task = processedAssignments.find(t => t.id === id);
                if (task) {
                    const aId = task.originalAssignment.id;
                    if (!acc[aId]) acc[aId] = { assignment: task.originalAssignment, tasksToRemove: [] };
                    acc[aId].tasksToRemove.push(task.text);
                }
                return acc;
            }, {});

            for (const aId in tasksByAssignment) {
                const { assignment, tasksToRemove } = tasksByAssignment[aId];
                let desc: any;
                try {
                    desc = JSON.parse(assignment.description);
                } catch (e) { continue; }

                if (desc.sections) {
                    desc.sections = desc.sections.map((section: any) => ({
                        ...section,
                        tasks: section.tasks.filter((task: any) => {
                            const tText = typeof task === 'string' ? task : (task.text || task.content || '');
                            return !tasksToRemove.includes(tText);
                        })
                    })).filter((section: any) => section.tasks.length > 0);
                }

                if (desc.sections.length === 0) {
                    await fetch(`/api/assignments?id=${aId}`, { method: 'DELETE' });
                } else {
                    await fetch('/api/assignments', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: aId,
                            description: JSON.stringify({ ...desc, fullMarkdown: '' })
                        }),
                    });
                }
            }

            setSelectedDiaryTaskIds([]);
            showToast('সফলভাবে মুছে ফেলা হয়েছে', 'success');
            await fetchData();
        } catch (error) {
            console.error('Bulk delete error:', error);
            showToast('মুছে ফেলা সম্ভব হয়নি', 'error');
        }
    };

    const handleBulkMove = async (targetTagCode: string) => {
        if (selectedDiaryTaskIds.length === 0) return;

        try {
            const tasksByAssignment = selectedDiaryTaskIds.reduce((acc: any, id) => {
                const task = processedAssignments.find(t => t.id === id);
                if (task) {
                    const aId = task.originalAssignment.id;
                    if (!acc[aId]) acc[aId] = { assignment: task.originalAssignment, tasksToMove: [] };
                    acc[aId].tasksToMove.push(task);
                }
                return acc;
            }, {});

            for (const aId in tasksByAssignment) {
                const { assignment, tasksToMove } = tasksByAssignment[aId];
                let desc: any;
                try {
                    desc = JSON.parse(assignment.description);
                } catch (e) { continue; }

                if (desc.sections) {
                    desc.sections = desc.sections.map((section: any) => ({
                        ...section,
                        tasks: section.tasks.filter((task: any) => {
                            const tText = typeof task === 'string' ? task : (task.text || task.content || '');
                            return !tasksToMove.some((m:any) => m.text === tText);
                        })
                    })).filter((section: any) => section.tasks.length > 0);

                    const tags:any = { HW: 'বাড়ির কাজ (Homework)', CW: 'ক্লাসের পড়া (Classwork)', PR: 'আগামীকাল ক্লাসের পড়া (Preparation)', CM: 'মন্তব্য (Comments)' };
                    const targetTitle = tags[targetTagCode];
                    let targetSection = desc.sections.find((s: any) => s.title === targetTitle);
                    if (!targetSection) {
                        targetSection = { title: targetTitle, tasks: [] };
                        desc.sections.push(targetSection);
                    }

                    tasksToMove.forEach((task: any) => {
                        targetSection.tasks.push({
                            id: `task-${Date.now()}-${Math.random()}`,
                            text: task.rawText,
                            segments: [{ type: 'text', value: task.rawText }],
                            targetStudents: task.targetStudents || []
                        });
                    });
                }

                await fetch('/api/assignments', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: aId,
                        description: JSON.stringify({ ...desc, fullMarkdown: '' })
                    }),
                });
            }

            setSelectedDiaryTaskIds([]);
            showToast('সফলভাবে সরানো হয়েছে', 'success');
            await fetchData();
        } catch (error) {
            console.error('Bulk move error:', error);
            showToast('সরানো সম্ভব হয়নি', 'error');
        }
    };

    const handleBulkUpdateStudents = async () => {
        if (selectedDiaryTaskIds.length === 0) return;
        
        try {
            const tasksByAssignment = selectedDiaryTaskIds.reduce((acc: any, id) => {
                const task = processedAssignments.find(t => t.id === id);
                if (task) {
                    const aId = task.originalAssignment.id;
                    if (!acc[aId]) acc[aId] = { assignment: task.originalAssignment, tasksToUpdate: [] };
                    acc[aId].tasksToUpdate.push(task.text);
                }
                return acc;
            }, {});

            for (const aId in tasksByAssignment) {
                const { assignment, tasksToUpdate } = tasksByAssignment[aId];
                let desc: any;
                try {
                    desc = JSON.parse(assignment.description);
                } catch (e) { continue; }

                if (desc.sections) {
                    desc.sections = desc.sections.map((section: any) => ({
                        ...section,
                        tasks: section.tasks.map((task: any) => {
                            const tText = typeof task === 'string' ? task : (task.text || task.content || '');
                            if (tasksToUpdate.includes(tText)) {
                                return typeof task === 'string' 
                                    ? { text: task, targetStudents: targetedStudentIds }
                                    : { ...task, targetStudents: targetedStudentIds };
                            }
                            return task;
                        })
                    }));
                }

                await fetch('/api/assignments', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: aId,
                        description: JSON.stringify({ ...desc, fullMarkdown: '' })
                    }),
                });
            }

            setSelectedDiaryTaskIds([]);
            showToast('শিক্ষার্থী তালিকা আপডেট করা হয়েছে', 'success');
            await fetchData();
        } catch (error) {
            console.error('Bulk update students error:', error);
            showToast('আপডেট সম্ভব হয়নি', 'error');
        }
    };

    const classSubjectsForDiary = selectedDiaryClass 
        ? (groupedByClass[selectedDiaryClass] || []).length > 0
            ? groupedByClass[selectedDiaryClass]
            : subjects.filter(s => s.className === selectedDiaryClass)
        : [];
    
    const activeDiarySubject = classSubjectsForDiary.find(s => s.bookId === selectedDiarySubject) || classSubjectsForDiary[0];

    const processedAssignments: any[] = [];
    if (activeDiarySubject) {
        activeDiarySubject.assignments?.forEach((assignment: any) => {
            const description = assignment.description || assignment.content || '';
            const timestamp = new Date(assignment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const teacherName = assignment.teacher?.name || 'শিক্ষক';

            try {
                const parsed = JSON.parse(description);
                if (parsed.sections && Array.isArray(parsed.sections)) {
                    parsed.sections.forEach((section: any) => {
                        const title = (section.title || '').toLowerCase();
                        let tag = 'HW';
                        let bgColor = 'bg-blue-50 text-blue-600 border-blue-100';
                        if (title.includes('classwork') || title.includes('cw')) {
                            tag = 'CW';
                            bgColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                        } else if (title.includes('practical') || title.includes('pr')) {
                            tag = 'PR';
                            bgColor = 'bg-purple-50 text-purple-600 border-purple-100';
                        } else if (title.includes('comment') || title.includes('cm') || title.includes('notice')) {
                            tag = 'CM';
                            bgColor = 'bg-amber-50 text-amber-600 border-amber-100';
                        }

                        const tasks = Array.isArray(section.tasks) ? section.tasks : [];
                        tasks.forEach((task: any) => {
                            const taskText = typeof task === 'string'
                                ? task
                                : (task?.text && typeof task.text === 'string')
                                    ? task.text
                                    : Array.isArray(task?.segments)
                                        ? task.segments.map((s: any) => s?.value || s?.text || '').join('')
                                        : String(task?.text || task?.content || '');
                            if (!taskText) return;
                            processedAssignments.push({
                                id: `${assignment.id}-${processedAssignments.length}`,
                                originalId: assignment.id,
                                text: taskText,
                                tag, tagCode: tag, bgColor, timestamp, teacherName,
                                canEdit: activeDiarySubject.canEdit,
                                originalAssignment: assignment,
                                rawText: taskText,
                                studentIds: assignment.studentIds,
                                targetStudents: task.targetStudents || []
                            });
                        });
                    });
                } else { throw new Error('Not JSON'); }
            } catch (e) {
                processedAssignments.push({
                    id: assignment.id,
                    originalId: assignment.id,
                    text: (description || 'বিস্তারিত দেখুন').toString(),
                    tag: 'HW', tagCode: 'HW', bgColor: 'bg-blue-50 text-blue-600 border-blue-100',
                    timestamp, teacherName,
                    canEdit: activeDiarySubject.canEdit,
                    originalAssignment: assignment,
                    rawText: (description || '').toString(),
                    studentIds: assignment.studentIds,
                    targetStudents: []
                });
            }
        });
    }

    return (
        <div className="space-y-4 font-bengali">
            {/* Contextual Grid Controls */}
            <div className="bg-white/60 backdrop-blur-xl rounded-[32px] border border-slate-200/50 p-4 md:p-6 shadow-sm space-y-5">
                {/* 1. Class Navigation & Search */}
                {calendarViewMode === 'list' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        {/* Search Field */}
                        {themeMode !== 'diary' && (
                            <div className="relative w-full sm:w-64 shrink-0">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                <input 
                                    type="text"
                                    placeholder="ক্লাস খুঁজুন..."
                                    value={classSearchQuery}
                                    onChange={(e) => setClassSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-[#045c84]/30 focus:shadow-sm transition-all"
                                />
                            </div>
                        )}

                        {availableClasses.length > 0 && (
                            <div
                                ref={classScrollRef}
                                className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 px-1 scroll-smooth no-scrollbar"
                            >
                                <button
                                    data-class-id="ALL"
                                    onClick={() => setActiveClassTab('ALL')}
                                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${activeClassTab === 'ALL'
                                        ? 'bg-[#045c84] text-white border-[#045c84] shadow-lg shadow-[#045c84]/10'
                                        : 'bg-white/50 text-slate-500 border-white/80 hover:bg-white hover:border-[#045c84]/30'
                                        }`}
                                >
                                    সব ক্লাস ({availableClasses.length})
                                </button>
                                {availableClasses
                                    .filter(cls => !classSearchQuery || cls.name.toLowerCase().includes(classSearchQuery.toLowerCase()))
                                    .map(cls => (
                                    <button
                                        key={cls.id}
                                        data-class-id={cls.id}
                                        onClick={() => setActiveClassTab(cls.id)}
                                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${activeClassTab === cls.id
                                            ? 'bg-[#045c84] text-white border-[#045c84] shadow-lg shadow-[#045c84]/10'
                                            : 'bg-white/50 text-slate-500 border-white/80 hover:bg-white hover:border-[#045c84]/30'
                                            }`}
                                    >
                                        {cls.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Management Controls (Date, View, Theme) */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-3 border-t border-slate-100/50">
                    <div className="flex flex-wrap items-center gap-2">
                        
                        {/* Date Navigation */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() - 1);
                                    setSelectedDate(d.toISOString().split('T')[0]);
                                }}
                                className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-[#045c84] transition-all hover:bg-slate-50 shadow-sm"
                                title="পূর্ববর্তী দিন"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            
                            <div className="flex items-center bg-white/50 border border-slate-100 rounded-xl px-3 py-1.5 shadow-inner">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mr-2">তারিখ</span>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="bg-transparent text-[10px] font-black text-[#045c84] outline-none cursor-pointer uppercase tracking-widest"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() + 1);
                                    // Don't go beyond today
                                    const today = new Date().toISOString().split('T')[0];
                                    const nextDate = d.toISOString().split('T')[0];
                                    if (nextDate <= today) {
                                        setSelectedDate(nextDate);
                                    }
                                }}
                                className={`p-2 rounded-xl bg-white border border-slate-100 transition-all shadow-sm ${
                                    selectedDate >= new Date().toISOString().split('T')[0] 
                                    ? 'opacity-30 cursor-not-allowed text-slate-300' 
                                    : 'text-slate-400 hover:text-[#045c84] hover:bg-slate-50'
                                }`}
                                title="পরবর্তী দিন"
                                disabled={selectedDate >= new Date().toISOString().split('T')[0]}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Theme Toggle */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100/50 border border-slate-200/30 rounded-xl shadow-inner">
                            <button
                                onClick={() => setThemeMode('modern')}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${themeMode === 'modern' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                মডার্ন
                            </button>
                            <button
                                onClick={() => setThemeMode('diary')}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${themeMode === 'diary' ? 'bg-[#045c84] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                ডাইরি
                            </button>
                        </div>

                        {/* View Toggle (Daily vs Calendar) */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100/50 border border-slate-200/30 rounded-xl shadow-inner">
                            <button
                                onClick={() => onCalendarViewModeChange?.('list')}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${calendarViewMode === 'list' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid size={11} />
                                ডেইলি
                            </button>
                            <button
                                onClick={() => onCalendarViewModeChange?.('calendar')}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${calendarViewMode === 'calendar' ? 'bg-[#045c84] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <CalendarIcon size={11} />
                                ক্যালেন্ডার
                            </button>
                        </div>

                        {/* Mine / All Toggle */}
                        <button
                            onClick={() => setViewMode(viewMode === 'MINE' ? 'ALL' : 'MINE')}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${viewMode === 'MINE'
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm'
                                : 'bg-white/50 text-slate-400 border-slate-100 hover:bg-white hover:text-slate-600'
                                }`}
                        >
                            <BookOpen size={10} className={viewMode === 'MINE' ? 'text-indigo-500' : 'text-slate-300'} />
                            {viewMode === 'MINE' ? 'আমার' : 'সব বিষয়'}
                        </button>
                    </div>

                    {/* Close Button or Back Arrow */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 rounded-xl transition-all shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Dashboard - Compact thin pill bar */}
            {calendarViewMode === 'list' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                        { id: 'TOTAL', label: 'সর্বমোট', count: stats.TOTAL, icon: ClipboardList, activeClass: 'bg-[#045c84] text-white border-[#045c84]' },
                        { id: 'WAITING', label: 'অপেক্ষমাণ', count: stats.WAITING, icon: Clock, activeClass: 'bg-amber-500 text-white border-amber-500' },
                        { id: 'DRAFTING', label: 'ড্রাফটিং', count: stats.DRAFTING, icon: PenTool, activeClass: 'bg-blue-500 text-white border-blue-500' },
                        { id: 'RELEASED', label: 'রিলিজ করা', count: stats.RELEASED, icon: CheckCircle2, activeClass: 'bg-emerald-500 text-white border-emerald-500' },
                        { id: 'SUBMITTED', label: 'জমা হয়েছে', count: stats.SUBMITTED, icon: TrendingUp, activeClass: 'bg-purple-500 text-white border-purple-500' },
                        { id: 'APPROVED', label: 'অনুমোদিত', count: stats.APPROVED, icon: CheckCircle, activeClass: 'bg-teal-500 text-white border-teal-500' },
                    ].map(tab => {
                        const Icon = tab.icon as any;
                        const isActive = activeStatusTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveStatusTab(tab.id);
                                    if (onTabChange && activeTab !== 'history') onTabChange('history');
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    isActive
                                        ? tab.activeClass + ' shadow-sm'
                                        : 'bg-white/80 text-slate-500 border-slate-100 hover:bg-white hover:border-slate-200'
                                }`}
                            >
                                <Icon size={11} />
                                {tab.label}
                                <span className={`font-black text-[11px] ${isActive ? 'opacity-90' : 'text-slate-700'}`}>{tab.count}</span>
                                {tab.id === 'SUBMITTED' && tab.count > 0 && !isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}


            {/* Subject Entry Grid / History Grid - ONLY IN LIST VIEW */}
            {calendarViewMode === 'list' && (
                <>
                    {/* Action Bar (Contextual) - Only in entry tab or when drafting */}
                    {activeTab === 'entry' && ((activeStatusTab === 'DRAFTING' && stats.DRAFTING > 0) || selectedIds.length > 0) ? (
                        <div className="bg-[#045c84] p-4 rounded-3xl border border-[#045c84] shadow-2xl shadow-[#045c84]/30 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                    <Settings size={20} className="animate-spin-slow" />
                                </div>
                                <div>
                                    <p className="text-white text-xs font-black uppercase tracking-widest">বাল্ক অ্যাকশন প্যানেল</p>
                                    <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-widest">
                                        {selectedIds.length > 0 ? `${selectedIds.length}টি বিষয় সিলেক্ট করা হয়েছে` : `${stats.DRAFTING}টি ড্রাফট রিলিজের জন্য প্রস্তুত`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#045c84] bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
                                >
                                    বাতিল করুন
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedIds.length > 0) handleBulkRelease();
                                        else handleBulkRelease(displaySubjects.filter(s => s.status === 'DRAFT' && s.assignmentId).map(s => s.assignmentId as string));
                                    }}
                                    disabled={isBulkReleasing}
                                    className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-[#045c84] hover:bg-white/90 transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    {isBulkReleasing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                    সব রিলিজ করুন
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {selectedDiaryClass ? createPortal(
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:p-10" onClick={() => setSelectedDiaryClass(null)}>
                            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                                <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden bg-white">
                                {/* Modal Header */}
                                <div className="shrink-0 px-4 md:px-8 py-3 md:py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center justify-between z-40">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <button 
                                            onClick={() => setSelectedDiaryClass(null)}
                                            className="p-2 -ml-2 text-slate-400 hover:text-[#045c84] hover:bg-slate-50 rounded-full transition-all"
                                        >
                                            <ArrowLeft size={24} />
                                        </button>
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#045c84]">
                                            <BookOpen size={20} className="md:size-24" />
                                        </div>
                                        <div>
                                            <h3 className="text-base md:text-xl font-black text-slate-800 uppercase tracking-tight">{selectedDiaryClass} - ডায়েরি</h3>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{getBengaliDate(selectedDate)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const classSubjects = (groupedByClass[selectedDiaryClass!] || []).length > 0 
                                                ? groupedByClass[selectedDiaryClass!] 
                                                : subjects.filter(s => s.className === selectedDiaryClass);
                                            
                                            const activeSubject = classSubjects.find(s => s.bookId === selectedDiarySubject) || classSubjects[0];
                                            const hasDrafts = activeSubject?.assignments?.some((a: any) => a.status === 'DRAFT');
                                            const draftAssignmentIds = activeSubject?.assignments?.filter((a: any) => a.status === 'DRAFT').map((a: any) => a.id) || [];

                                            if (!hasDrafts) return null;

                                            return (
                                                <button 
                                                    onClick={() => handleBulkRelease(draftAssignmentIds)}
                                                    disabled={isBulkReleasing}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                                >
                                                    {isBulkReleasing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                    রিলিজ করুন
                                                </button>
                                            );
                                        })()}

                                        <button 
                                            onClick={() => setIsStudentSidebarOpen(!isStudentSidebarOpen)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isStudentSidebarOpen ? 'bg-[#045c84] text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <Users size={16} />
                                            <span className="hidden sm:inline">শিক্ষার্থী বাছাই</span>
                                            {targetedStudentIds.length > 0 && (
                                                <span className="bg-emerald-400 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px]">
                                                    {targetedStudentIds.length}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {(() => {
                                    const classSubjects = classSubjectsForDiary;
                                    const activeSubject = activeDiarySubject;

                                    // Auto-select first subject if none selected
                                    if (classSubjects.length > 0 && !selectedDiarySubject) {
                                        setSelectedDiarySubject(classSubjects[0].bookId);
                                        setFastEntryBookId(classSubjects[0].bookId);
                                    }

                                    const suggestions = fastEntryText.trim().length > 0 
                                        ? Array.from(new Set(processedAssignments.map(a => a.rawText)))
                                            .filter(text => 
                                                text.toLowerCase().includes(fastEntryText.toLowerCase()) && 
                                                text.toLowerCase() !== fastEntryText.toLowerCase()
                                            )
                                            .slice(0, 5)
                                        : [];

                                    return (
                                        <>

                                            {/* Subject Navigation Header - Reverted to top */}
                                            <div className="shrink-0 bg-white border-b border-slate-100 p-3 md:px-6 overflow-x-auto no-scrollbar">
                                                <div className="flex items-center gap-2 min-w-max">
                                                    {classSubjects.map((s: any) => (
                                                        <button
                                                            key={s.bookId}
                                                            onClick={() => {
                                                                setSelectedDiarySubject(s.bookId);
                                                                setFastEntryBookId(s.bookId);
                                                            }}
                                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[10px] font-black transition-all border whitespace-nowrap ${selectedDiarySubject === s.bookId
                                                                ? 'bg-[#045c84] text-white border-[#045c84] shadow-lg scale-105'
                                                                : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full ${s.isDone ? (s.assignments?.some((a: any) => a.status === 'DRAFT') ? 'bg-blue-400' : 'bg-emerald-400') : 'bg-amber-400'}`} />
                                                            <span>{s.bookName}</span>
                                                            {s.isDone && !s.assignments?.some((a: any) => a.status === 'DRAFT') && <Check size={10} className="ml-1 opacity-70" />}
                                                            {s.assignments?.some((a: any) => a.status === 'DRAFT') && (
                                                                <span className="px-1 py-0.5 bg-blue-500 text-white rounded-[4px] text-[7px] uppercase ml-1">ড্রাফট</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Main Modal Body with Sidebar on Right */}
                                            <div className="flex-1 flex overflow-hidden relative flex-col md:flex-row bg-slate-50/10">
                                                {/* Left Column: Diary Content Area & Entry Bar */}
                                                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                                                    {/* Scrollable Task List */}
                                                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                                                        {activeSubject ? (
                                                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                                <div className="space-y-4 pb-10">
                                                                    {(() => {
                                                                        if (processedAssignments.length === 0) {
                                                                            return (
                                                                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300 italic opacity-50 bg-white rounded-[40px] border border-dashed border-slate-200">
                                                                                    <BookOpen size={48} strokeWidth={1} />
                                                                                    <span className="font-bold">এখনো কিছু লেখা হয়নি</span>
                                                                                </div>
                                                                            );
                                                                        }

                                                                        const groupedByTag = processedAssignments.reduce((acc: any, item: any) => {
                                                                            if (!acc[item.tagCode]) acc[item.tagCode] = [];
                                                                            acc[item.tagCode].push(item);
                                                                            return acc;
                                                                        }, {});

                                                                        return Object.entries(groupedByTag).map(([tagCode, items]: [string, any]) => {
                                                                            const tag = ALL_TAGS.find(t => t.id === tagCode) || { label: tagCode, color: 'bg-slate-100 text-slate-500' };
                                                                            
                                                                            return (
                                                                                <div key={tagCode} className="space-y-4">
                                                                                    <div className="flex items-center gap-3 px-1">
                                                                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${tag.color}`}>
                                                                                            {tag.label}
                                                                                        </span>
                                                                                        <div className="h-px flex-1 bg-slate-100" />
                                                                                        {items[0].canEdit && (
                                                                                            <button 
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    const allChecked = items.every((i: any) => selectedDiaryTaskIds.includes(i.id));
                                                                                                    if (allChecked) {
                                                                                                        setSelectedDiaryTaskIds(selectedDiaryTaskIds.filter(id => !items.some((i: any) => i.id === id)));
                                                                                                    } else {
                                                                                                        setSelectedDiaryTaskIds([...new Set([...selectedDiaryTaskIds, ...items.map((i: any) => i.id)])]);
                                                                                                    }
                                                                                                }}
                                                                                                className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${items.every((i: any) => selectedDiaryTaskIds.includes(i.id)) ? 'bg-[#045c84] border-[#045c84] text-white' : 'bg-white border-slate-200 hover:border-[#045c84]'}`}
                                                                                            >
                                                                                                {items.every((i: any) => selectedDiaryTaskIds.includes(i.id)) && <Check size={10} strokeWidth={3} />}
                                                                                            </button>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="space-y-0.5 ml-1 border-l-2 border-slate-50 pl-6">
                                                                                        {(() => {
                                                                                            const subGroups: any[] = [];
                                                                                            items.forEach((item: any) => {
                                                                                                const sig = (item.targetStudents || []).sort().join(',');
                                                                                                if (subGroups.length > 0 && subGroups[subGroups.length - 1].sig === sig) {
                                                                                                    subGroups[subGroups.length - 1].tasks.push(item);
                                                                                                } else {
                                                                                                    subGroups.push({ sig, tasks: [item], targetStudents: item.targetStudents || [] });
                                                                                                }
                                                                                            });
                                                                                            
                                                                                            return subGroups.map((group, gIdx) => (
                                                                                                <div key={gIdx} className="mb-4 last:mb-0">
                                                                                                    <div className="space-y-1">
                                                                                                        {group.tasks.map((item: any) => (
                                                                                                            <div
                                                                                                                key={item.id}
                                                                                                                className={`group flex items-start justify-between gap-4 py-1.5 px-3 rounded-2xl transition-all duration-300 ${selectedDiaryTaskIds.includes(item.id) ? 'bg-[#045c84]/5 border-l-4 border-l-[#045c84] translate-x-1' : 'hover:translate-x-1 hover:bg-slate-50'}`}
                                                                                                            >
                                                                                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                                                                    {item.canEdit && (
                                                                                                                        <button 
                                                                                                                            onClick={() => {
                                                                                                                                if (selectedDiaryTaskIds.includes(item.id)) {
                                                                                                                                    setSelectedDiaryTaskIds(selectedDiaryTaskIds.filter(id => id !== item.id));
                                                                                                                                } else {
                                                                                                                                    setSelectedDiaryTaskIds([...selectedDiaryTaskIds, item.id]);
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            className={`mt-1 w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0 ${selectedDiaryTaskIds.includes(item.id) ? 'bg-[#045c84] border-[#045c84] text-white' : 'bg-white border-slate-200 hover:border-[#045c84]'}`}
                                                                                                                        >
                                                                                                                            {selectedDiaryTaskIds.includes(item.id) && <Check size={10} strokeWidth={3} />}
                                                                                                                        </button>
                                                                                                                    )}
                                                                                                                    <div 
                                                                                                                        className="flex-1 min-w-0 cursor-pointer"
                                                                                                                        onClick={() => {
                                                                                                                            if (item.canEdit) {
                                                                                                                                handleEditTask(item.rawText, item.tagCode as any, selectedDiaryClass!, item.originalAssignment.bookId);
                                                                                                                            }
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <p className="text-sm md:text-base text-slate-600 font-bold leading-relaxed group-hover:text-[#045c84] transition-colors">
                                                                                                                            <InlineMarkdown text={item.text} />
                                                                                                                        </p>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                
                                                                                                                {item.canEdit && (
                                                                                                                    <button 
                                                                                                                        onClick={(e) => {
                                                                                                                            e.stopPropagation();
                                                                                                                            handleDeleteEntry(item);
                                                                                                                        }}
                                                                                                                        className="p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 opacity-0 group-hover:opacity-100"
                                                                                                                        title="মুছে ফেলুন"
                                                                                                                    >
                                                                                                                        <Trash2 size={14} />
                                                                                                                    </button>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                    
                                                                                                    {group.targetStudents && group.targetStudents.length > 0 && (
                                                                                                        <div className="mt-1 ml-10 flex items-center gap-2 animate-in fade-in slide-in-from-left-1 duration-300">
                                                                                                            <div className="flex -space-x-1.5 mr-1 hover:space-x-1 transition-all">
                                                                                                                {group.targetStudents.slice(0, 5).map((sId: string) => {
                                                                                                                    const student = allStudents.find(s => s.id === sId);
                                                                                                                    const name = student?.name || student?.firstName || '?';
                                                                                                                    return (
                                                                                                                        <div key={sId} className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500 shadow-sm ring-1 ring-slate-100/50" title={name}>
                                                                                                                            {name[0]}
                                                                                                                        </div>
                                                                                                                    );
                                                                                                                })}
                                                                                                                {group.targetStudents.length > 5 && (
                                                                                                                    <div className="w-5 h-5 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400 shadow-sm ring-1 ring-slate-100/50">
                                                                                                                        +{group.targetStudents.length - 5}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <span className="text-[8px] font-black text-[#045c84]/60 uppercase tracking-widest bg-blue-50/30 px-2 py-0.5 rounded-full border border-blue-100/30">
                                                                                                                {group.targetStudents.length === allStudents.filter(s => s.metadata?.classId === activeSubject.classId).length ? 'সব শিক্ষার্থী' : `${group.targetStudents.length} জন শিক্ষার্থী`}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            ));
                                                                                        })()}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        });
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300 italic opacity-50 bg-white rounded-[40px] border border-dashed border-slate-200">
                                                                <BookOpen size={48} strokeWidth={1} />
                                                                <span className="font-bold">বিষয় সিলেক্ট করুন</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Entry Bar (Editor) - Pinned to bottom of left column */}
                                                    {activeSubject && (() => {
                                                        const catTheme: Record<string, { bg: string; border: string; accent: string; light: string; ring: string }> = {
                                                            HW: { bg: 'from-blue-50/80 to-indigo-50/80',   border: 'border-blue-200/60',   accent: '#3b82f6', light: 'bg-blue-500',    ring: 'focus-within:shadow-blue-200/50' },
                                                            CW: { bg: 'from-emerald-50/80 to-teal-50/80',  border: 'border-emerald-200/60', accent: '#10b981', light: 'bg-emerald-500', ring: 'focus-within:shadow-emerald-200/50' },
                                                            PR: { bg: 'from-purple-50/80 to-violet-50/80', border: 'border-purple-200/60', accent: '#8b5cf6', light: 'bg-purple-500', ring: 'focus-within:shadow-purple-200/50' },
                                                            CM: { bg: 'from-amber-50/80 to-orange-50/80',  border: 'border-amber-200/60',  accent: '#f59e0b', light: 'bg-amber-500',  ring: 'focus-within:shadow-amber-200/50' },
                                                        };
                                                        const theme = catTheme[activeCategory] || catTheme['HW'];
                                                        return (
                                                            <div className={`shrink-0 bg-gradient-to-br ${theme.bg} backdrop-blur-xl shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.08)] px-4 md:px-12 pt-3 pb-8 md:pb-12 border-t ${theme.border} z-50 transition-all duration-300`}>
                                                                <div className="max-w-4xl mx-auto flex flex-col gap-3">
                                                                    {/* Smart Suggestions */}
                                                                    {suggestions.length > 0 && (
                                                                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 animate-in slide-in-from-bottom-1 duration-300">
                                                                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
                                                                                <Sparkles size={10} className="text-blue-500" />
                                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">পরামর্শ</span>
                                                                            </div>
                                                                            {suggestions.map((text, idx) => (
                                                                                <button
                                                                                    key={idx}
                                                                                    onClick={() => setFastEntryText(text)}
                                                                                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-100 text-[10px] font-bold text-slate-600 whitespace-nowrap hover:bg-slate-50 hover:border-[#045c84]/30 hover:text-[#045c84] transition-all shadow-sm"
                                                                                >
                                                                                    {text}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {targetedStudentIds.length > 0 && (
                                                                        <div className="flex items-center justify-between bg-blue-50 px-4 py-1.5 rounded-xl border border-blue-100">
                                                                            <div className="flex items-center gap-2">
                                                                                <Users size={12} className="text-[#045c84]" />
                                                                                <span className="text-[9px] font-black text-[#045c84] uppercase tracking-widest">
                                                                                    {targetedStudentIds.length} জন শিক্ষার্থী বাছাই করা আছে
                                                                                </span>
                                                                            </div>
                                                                            <button 
                                                                                onClick={() => setTargetedStudentIds([])}
                                                                                className="text-[9px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest"
                                                                            >
                                                                                মুছুন
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                                                        {[
                                                                            { id: 'HW', label: 'HW', grad: 'from-blue-50 to-indigo-50 text-blue-600 border-blue-200' },
                                                                            { id: 'CW', label: 'CW', grad: 'from-emerald-50 to-teal-50 text-emerald-600 border-emerald-200' },
                                                                            { id: 'PR', label: 'PR', grad: 'from-purple-50 to-violet-50 text-purple-600 border-purple-200' },
                                                                            { id: 'CM', label: 'CM', grad: 'from-amber-50 to-orange-50 text-amber-600 border-amber-200' },
                                                                        ].map(cat => (
                                                                            <button 
                                                                                key={cat.id} 
                                                                                onClick={() => setActiveCategory(cat.id as any)} 
                                                                                className={`px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeCategory === cat.id ? `bg-gradient-to-br ${cat.grad} shadow-md scale-105` : 'bg-white/60 text-slate-400 border-slate-200/60 hover:text-slate-600 hover:bg-white'}`}
                                                                            >
                                                                                {cat.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>

                                                                    {/* Formatting Toolbar */}
                                                                    <div className="flex items-center gap-1 flex-wrap">
                                                                        {([
                                                                            { label: 'B',  title: 'Bold',          wrap: ['**','**'] },
                                                                            { label: 'I',  title: 'Italic',        wrap: ['*','*'] },
                                                                            { label: 'U',  title: 'Underline',     wrap: ['__','__'] },
                                                                            { label: 'S',  title: 'Strikethrough', wrap: ['~~','~~'] },
                                                                            { label: '<>', title: 'Code',          wrap: ['`','`'] },
                                                                        ] as { label: string; title: string; wrap: [string, string] }[]).map(btn => (
                                                                            <button
                                                                                key={btn.label}
                                                                                title={btn.title}
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    if (btn.label === '<>') {
                                                                                        // Custom code wrap
                                                                                        const sel = window.getSelection()?.toString() || 'text';
                                                                                        editorRef.current?.execCommand('insertHTML', `<code style="font-family: monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 0.9em;">${sel}</code>`);
                                                                                    } else {
                                                                                        const cmdMap: Record<string, string> = { 'B': 'bold', 'I': 'italic', 'U': 'underline', 'S': 'strikeThrough' };
                                                                                        editorRef.current?.execCommand(cmdMap[btn.label]);
                                                                                    }
                                                                                }}
                                                                                className={`w-7 h-7 rounded-lg text-[10px] font-black border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all ${
                                                                                    btn.label === 'B' ? 'font-black' :
                                                                                    btn.label === 'I' ? 'italic' : ''
                                                                                }`}
                                                                            >
                                                                                {btn.label}
                                                                            </button>
                                                                        ))}
                                                                        <span className="w-px h-5 bg-slate-200 mx-1" />
                                                                        {(['red','blue','green','orange','purple','amber','black'] as const).map(color => (
                                                                            <button
                                                                                key={color}
                                                                                title={`Color: ${color}`}
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    const hex = { red:'#ef4444', blue:'#3b82f6', green:'#22c55e', orange:'#f97316', purple:'#8b5cf6', amber:'#f59e0b', black:'#000000' }[color];
                                                                                    editorRef.current?.execCommand('foreColor', hex);
                                                                                }}
                                                                                className="w-5 h-5 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125"
                                                                                style={{ backgroundColor: { red:'#ef4444', blue:'#3b82f6', green:'#22c55e', orange:'#f97316', purple:'#8b5cf6', amber:'#f59e0b', black:'#000000' }[color] }}
                                                                            />
                                                                        ))}
                                                                    </div>

                                                                    {/* WYSIWYG Entry Card */}
                                                                    <div className="relative bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all focus-within:border-opacity-80 focus-within:shadow-lg">
                                                                        <div className="relative">
                                                                            <RichTextEditor
                                                                                ref={editorRef}
                                                                                value={fastEntryText}
                                                                                onChange={setFastEntryText}
                                                                                placeholder={`${activeSubject.bookName} এন্ট্রি লিখুন... (Shift+Enter = নতুন লাইন)`}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                                        e.preventDefault();
                                                                                        handleFastSubmit();
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>

                                                                        <div className="absolute right-2 top-2">
                                                                            <button
                                                                                onClick={handleFastSubmit}
                                                                                disabled={isFastSubmitting || !fastEntryText.trim()}
                                                                                className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${fastEntryText.trim() ? `${theme.light} text-white shadow-lg active:scale-90` : 'bg-slate-100 text-slate-300'}`}
                                                                            >
                                                                                {isFastSubmitting ? <Loader2 size={18} className="animate-spin" /> : (editingFastEntryId ? <CheckCircle2 size={18} /> : <ArrowUp size={18} />)}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {editingFastEntryId && (
                                                                        <button 
                                                                            onClick={() => { setEditingFastEntryId(null); setFastEntryText(''); setTargetedStudentIds([]); }} 
                                                                            className="py-2 px-6 rounded-xl bg-red-50/50 border border-red-100 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                                                        >
                                                                            <X size={12} /> এডিট বাতিল করুন
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Right Column: Controls Sidebar */}
                                                <div className={`absolute md:relative z-40 w-full md:w-[350px] bg-white border-l border-slate-100 flex flex-col transition-all duration-300 transform right-0 inset-y-0 h-full ${isStudentSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 shadow-2xl md:shadow-none'}`}>
                                                    <div className="flex flex-col h-full">

                                                        {/* Student Search & Filters */}
                                                        <div className="p-4 border-b border-slate-50 space-y-4 shrink-0">
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="শিক্ষার্থী খুঁজুন..."
                                                                    value={studentSearchTerm}
                                                                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                                                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-[#045c84]/30"
                                                                />
                                                            </div>
                                                            
                                                            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                                                                <button
                                                                    onClick={() => setActiveStudentGroup('ALL')}
                                                                    className={`flex-1 min-w-[60px] py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeStudentGroup === 'ALL' ? 'bg-[#045c84] text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                                >
                                                                    সবাই
                                                                </button>
                                                                {groups.map(group => (
                                                                    <button
                                                                        key={group.id}
                                                                        onClick={() => setActiveStudentGroup(group.id)}
                                                                        className={`flex-1 min-w-[80px] py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap px-3 ${activeStudentGroup === group.id ? 'bg-[#045c84] text-white shadow-sm scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                                    >
                                                                        {group.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* student list */}
                                                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30 custom-scrollbar">
                                                            {(() => {
                                                                const clsId = allClasses.find(c => c.name === selectedDiaryClass)?.id;
                                                                const filteredStudents = allStudents.filter(s => {
                                                                    if (s.metadata?.classId !== clsId) return false;
                                                                    if (studentSearchTerm && !s.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) && !s.metadata?.studentId?.includes(studentSearchTerm)) return false;
                                                                    if (activeStudentGroup !== 'ALL' && s.metadata?.groupId !== activeStudentGroup) return false;
                                                                    return true;
                                                                });

                                                                if (filteredStudents.length === 0) {
                                                                    return <div className="text-center py-10 text-slate-300 italic text-[10px]">শিক্ষার্থী পাওয়া যায়নি</div>;
                                                                }

                                                                return (
                                                                    <>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredStudents.length} জন শিক্ষার্থী</span>
                                                                            <button 
                                                                                onClick={() => {
                                                                                    if (targetedStudentIds.length === filteredStudents.length) {
                                                                                        setTargetedStudentIds([]);
                                                                                    } else {
                                                                                        setTargetedStudentIds(filteredStudents.map(s => s.id));
                                                                                    }
                                                                                }}
                                                                                className="text-[9px] font-black text-[#045c84] uppercase"
                                                                            >
                                                                                {targetedStudentIds.length === filteredStudents.length ? 'সব মুছুন' : 'সব বাছাই'}
                                                                            </button>
                                                                        </div>
                                                                        {filteredStudents.map(student => (
                                                                            <button
                                                                                key={student.id}
                                                                                onClick={() => {
                                                                                    if (targetedStudentIds.includes(student.id)) {
                                                                                        setTargetedStudentIds(targetedStudentIds.filter(id => id !== student.id));
                                                                                    } else {
                                                                                        setTargetedStudentIds([...targetedStudentIds, student.id]);
                                                                                    }
                                                                                }}
                                                                                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${targetedStudentIds.includes(student.id) ? 'bg-[#045c84]/5 border-[#045c84]/20 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'}`}
                                                                            >
                                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${targetedStudentIds.includes(student.id) ? 'bg-[#045c84] text-white scale-90' : 'bg-slate-100 text-slate-400'}`}>
                                                                                    {targetedStudentIds.includes(student.id) ? <Check size={14} /> : (student.name?.[0] || 'S')}
                                                                                </div>
                                                                                <div className="text-left flex-1 min-w-0">
                                                                                    <p className={`text-xs font-bold truncate ${targetedStudentIds.includes(student.id) ? 'text-[#045c84]' : 'text-slate-700'}`}>{student.name}</p>
                                                                                    <p className="text-[9px] text-slate-400 font-medium">#{student.metadata?.rollNumber || student.metadata?.studentId || 'N/A'}</p>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Floating Bulk ActionBar */}
                                                {selectedDiaryTaskIds.length > 0 && (
                                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                                                        <div className="bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-[32px] border border-white/10 shadow-2xl flex items-center gap-6">
                                                            <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                                                                <div className="w-8 h-8 rounded-full bg-[#045c84] flex items-center justify-center text-[10px] font-black text-white">
                                                                    {selectedDiaryTaskIds.length}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">বাছাই করা হয়েছে</p>
                                                                    <button onClick={() => setSelectedDiaryTaskIds([])} className="text-[9px] text-slate-400 hover:text-white transition-colors uppercase font-bold mt-1">সব বাতিল করুন</button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {/* Move Actions */}
                                                                <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl">
                                                                    {(['HW', 'CW', 'PR', 'CM'] as const).map(tag => (
                                                                        <button 
                                                                            key={tag}
                                                                            onClick={() => handleBulkMove(tag)}
                                                                            title={`${tag} এ সরান`}
                                                                            className="w-10 py-1.5 rounded-xl text-[9px] font-black text-slate-300 hover:bg-[#045c84] hover:text-white transition-all border border-transparent hover:border-white/10"
                                                                        >
                                                                            {tag}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                <div className="w-px h-6 bg-white/10 mx-2" />

                                                                {/* Student Target Action */}
                                                                <button 
                                                                    onClick={handleBulkUpdateStudents}
                                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 text-white hover:bg-[#045c84] transition-all border border-white/10 group"
                                                                >
                                                                    <Users size={14} className="group-hover:scale-110 transition-transform" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">শিক্ষার্থী বরাদ্দ</span>
                                                                </button>

                                                                {/* Delete Action */}
                                                                <button 
                                                                    onClick={handleBulkDelete}
                                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/20 text-red-100 hover:bg-red-500 transition-all border border-red-500/30 group"
                                                                >
                                                                    <Trash2 size={14} className="group-hover:shake" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">মুছুন</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>,
                    document.body
                ) : (
                        <div
                            className={`${themeMode === 'diary' ? 'grid gap-5' : 'grid grid-cols-1 gap-6'} mt-6`}
                            style={themeMode === 'diary' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' } : undefined}
                        >

                        {Object.entries(groupedByClass).length === 0 && <div className="col-span-full py-10 text-center text-slate-400">কোনো তথ্য পাওয়া যায়নি</div>}
                        {calendarViewMode === 'list' && Object.entries(groupedByClass).sort((a, b) => a[0].localeCompare(b[0])).map(([className, classSubjects]) => {
                            const isDiaryMode = themeMode === 'diary';
                            const clsObj = allClasses.find(c => c.name === className);
                            const classCover = (clsObj as any)?.coverImage;

                            // If in entry mode and no subjects today for this class, we still want to show it
                            if (activeTab === 'entry' && classSubjects.length === 0) {
                                const allClassSubjects = subjects.filter(s => s.className === className);
                                if (allClassSubjects.length > 0) {
                                    classSubjects = allClassSubjects;
                                }
                            }

                            if (isDiaryMode) {
                                // Calculate class stats for the diary cover
                                const total = classSubjects.length;
                                const released = classSubjects.filter(s => s.status === 'RELEASED' || s.status === 'DRAFT').length;
                                const submitted = classSubjects.filter(s => (s.pendingCount || 0) > 0).length;
                                const approved = classSubjects.filter(s => s.isDone && (s.pendingCount || 0) === 0 && s.status === 'RELEASED').length;
                                const notSubmitted = classSubjects.filter(s => !s.isDone).length;
                                
                                const coverStats = { total, released, submitted, notSubmitted, approved };

                                return (
                                    <div
                                        key={className}
                                        onClick={() => {
                                            setSelectedDiaryClass(className);
                                            if (!fastEntryBookId && classSubjects.length > 0) {
                                                setFastEntryBookId(classSubjects[0].bookId);
                                            }
                                        }}
                                        className="w-full flex flex-col items-center cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
                                    >
                                        <Diary3D 
                                            classTitle={className} 
                                            coverImage={classCover}
                                            accentColor="#045c84"
                                            stats={coverStats}
                                        />
                                    </div>
                                );
                            }

                            return (
                                <div key={className} className={`relative overflow-hidden transition-all duration-300 bg-white rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md`}>
                                    {/* Class Header */}
                                    <div className={`relative z-10 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-slate-50/80 border-b border-slate-200`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-[#045c84] rounded-full" />
                                            <h3 className={`font-black text-lg text-slate-800`}>
                                                {className}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest px-3 py-1 bg-white/50 rounded-full border-slate-100`}>
                                                <CalendarIcon size={12} />
                                                {getBengaliDate(selectedDate)}
                                            </div>
                                            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (() => {
                                                const cls = allClasses.find(c => c.name === className);

                                                // Get subjects that are DRAFT
                                                const draftAssignmentIds = classSubjects
                                                    .filter((s: any) => s.status === 'DRAFT' && s.assignmentId)
                                                    .map((s: any) => s.assignmentId as string);

                                                // Get subjects that are WAITING (no assignment created at all yet)
                                                const waitingSubjects = classSubjects
                                                    .filter((s: any) => !s.isDone)
                                                    .map((s: any) => ({
                                                        classId: s.classId,
                                                        bookId: s.bookId
                                                    }));

                                                const totalPendingCount = draftAssignmentIds.length + waitingSubjects.length;

                                                return cls ? (
                                                    <div className="flex items-center gap-2">
                                                        {totalPendingCount > 0 && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (await ui.confirm(`আপনি কি এই ক্লাসের ${totalPendingCount}টি বাকি থাকা কাজ (ড্রাফট ও অপেক্ষমাণ) সরাসরি রিলিজ করতে চান?`)) {

                                                                        const idsToRelease = [...draftAssignmentIds];

                                                                        // 1. Create blank assignments for WAITING subjects
                                                                        if (waitingSubjects.length > 0) {
                                                                            try {
                                                                                for (const subject of waitingSubjects) {
                                                                                    const res = await fetch('/api/assignments', {
                                                                                        method: 'POST',
                                                                                        headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({
                                                                                            title: 'আজকের পড়া',
                                                                                            description: JSON.stringify({
                                                                                                sections: [
                                                                                                    { title: 'Homework (বাড়ির কাজ)', tasks: [] },
                                                                                                    { title: 'Classwork (ক্লাসের কাজ)', tasks: [] },
                                                                                                    { title: 'Preparation (খুশখত/পরবর্তী ক্লাসের প্রস্তুতি)', tasks: [] },
                                                                                                    { title: 'Comments (মন্তব্য/আচরণ)', tasks: [] }
                                                                                                ]
                                                                                            }),
                                                                                            classId: subject.classId,
                                                                                            bookId: subject.bookId,
                                                                                            instituteId: activeInstitute?.id,
                                                                                            teacherId: user?.id,
                                                                                            scheduledDate: new Date(selectedDate).toISOString(),
                                                                                            deadline: new Date(selectedDate).toISOString(),
                                                                                            type: 'LECTURE',
                                                                                            status: 'DRAFT'
                                                                                        })
                                                                                    });
                                                                                    if (res.ok) {
                                                                                        const data = await res.json();
                                                                                        idsToRelease.push(data.id);
                                                                                    }
                                                                                }
                                                                            } catch (err) {
                                                                                console.error("Failed to create empty assignments for waiting subjects", err);
                                                                            }
                                                                        }

                                                                        // 2. Bulk release everything together
                                                                        if (idsToRelease.length > 0) {
                                                                            handleBulkRelease(idsToRelease);
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={isBulkReleasing}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-xl`}
                                                                title={`সব সাবজেক্টের কাজ রিলিজ করুন (${totalPendingCount}টি বাকি)`}
                                                            >
                                                                {isBulkReleasing ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                                                                সব রিলিজ করুন
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setScheduleModalClass({ id: cls.id, name: cls.name, schedule: (cls as any).schedule })}
                                                            className={`p-1.5 transition-all shadow-sm bg-white border border-slate-200 text-slate-400 hover:text-[#045c84] hover:border-[#045c84]/30 rounded-xl`}
                                                            title="ক্লাস সময়সূচী সেটিংস"
                                                        >
                                                            <Settings size={14} />
                                                        </button>
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div> {/* This closes the Class Header div */}

                                    {/* Subjects List */}
                                    <div className={`relative z-10 divide-y divide-slate-100`}>
                                        {classSubjects.map((s: any, idx: number) => {
                                            const isExpanded = expandedSubject === `${s.classId}-${s.bookId}`;
                                            const progress = s.totalStudents > 0 ? (s.submittedCount / s.totalStudents) * 100 : 0;

                                            // Parse assignment description for details
                                            let details: any = { homework: [], classwork: [], nextWork: [], comments: [] };
                                            if (s.assignment?.description) {
                                                const desc = s.assignment.description.trim();
                                                if (desc.startsWith('{')) {
                                                    try {
                                                        const parsed = JSON.parse(desc);
                                                        if (parsed.sections) {
                                                            parsed.sections.forEach((sec: any) => {
                                                                const tasks = Array.isArray(sec.tasks) ? sec.tasks : [];
                                                                if (sec.title.includes('Homework')) details.homework = tasks;
                                                                if (sec.title.includes('Classwork')) details.classwork = tasks;
                                                                if (sec.title.includes('Preparation')) details.nextWork = tasks;
                                                                if (sec.title.includes('Comments')) details.comments = tasks;
                                                            });
                                                        }
                                                    } catch (e) {
                                                        details.homework = [{ text: desc }];
                                                    }
                                                } else {
                                                    details.homework = [{ text: desc }];
                                                }
                                            }

                                            return (
                                                <div key={`${s.classId}-${s.bookId}`} className="group transition-all">
                                                    {/* Thin Sub-card */}
                                                    <div
                                                        onClick={() => !s.isDone ? (s.canEdit ? handleEntry(s.classId, s.bookId) : showToast('আপনার এই বিষয়ের জন্য পারমিশন নেই', 'error')) : setExpandedSubject(isExpanded ? null : `${s.classId}-${s.bookId}`)}
                                                        className={`px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors py-4 hover:bg-slate-50/50 ${!s.isDone ? (s.canEdit ? 'bg-amber-50/30' : 'bg-slate-100/30 grayscale-sm opacity-60') : ''}`}
                                                    >
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className={`shrink-0 flex items-center justify-center overflow-hidden w-10 h-10 rounded-xl bg-slate-100 border border-slate-200`}>
                                                                {s.coverImage ? <img src={s.coverImage} className={`w-full h-full object-cover`} /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><BookOpen size={16} /></div>}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className={`font-bold truncate text-slate-800 text-sm`}>{s.bookName}</h4>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <p className={`text-[10px] font-bold capitalize text-slate-400`}>{s.assignedTo || 'Teacher'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {s.canEdit && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (s.isDone && s.assignment) handleEditAssignment(s.assignment);
                                                                        else handleEntry(s.classId, s.bookId);
                                                                    }}
                                                                    className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest transition-all shadow-sm font-black border rounded-xl ${s.isDone ? 'bg-white text-slate-500 border-slate-200 hover:border-[#045c84] hover:text-[#045c84]' : 'bg-[#045c84] text-white border-[#045c84] hover:bg-[#034a6b]'}`}
                                                                    title={s.isDone ? "ক্লাস ডাইরি এডিট করুন" : "নতুন ডায়েরি তৈরি করুন"}
                                                                >
                                                                    {s.isDone ? <PenTool size={12} /> : <Plus size={12} />}
                                                                    {s.isDone ? 'এডিট করুন' : 'তৈরি করুন'}
                                                                </button>
                                                            )}

                                                            {!s.isDone ? (
                                                                <div className="flex items-center gap-2">
                                                                    {s.status === 'DRAFT' && (
                                                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 rounded-lg border border-blue-100`}>ড্রাফট</span>
                                                                    )}
                                                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 rounded-lg border border-amber-100`}>পেন্ডিং</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    {s.status === 'DRAFT' && (
                                                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 rounded-lg border border-blue-100`}>ড্রাফট</span>
                                                                    )}
                                                                    <div className="hidden md:flex items-center gap-6 min-w-[140px]">
                                                                    <div className="flex-1 space-y-1">
                                                                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tight">
                                                                            <span className={`leading-none text-slate-400`}>প্রগ্রেস</span>
                                                                            <span className={`${progress === 100 ? 'text-emerald-600' : 'text-[#045c84]'}`}>{Math.round(progress)}%</span>
                                                                        </div>
                                                                        <div className={`h-1 w-full overflow-hidden bg-slate-100 rounded-full border border-slate-200/50`}>
                                                                            <div
                                                                                className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-[#045c84]'}`}
                                                                                style={{ width: `${progress}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setExpandedSubject(isExpanded ? null : `${s.classId}-${s.bookId}`); }}
                                                                        className={`p-1.5 transition-all ${isExpanded ? 'bg-[#045c84] text-white rounded-lg' : 'bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg'}`}
                                                                    >
                                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    </div>

                                                    {/* Expanded Content */}
                                                    {isExpanded && (
                                                        <div className={`px-6 py-6 animate-in fade-in slide-in-from-top-2 duration-300 bg-slate-50/50 border-t border-slate-100`}>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                {[
                                                                    { title: 'বাড়ির কাজ (HW)', icon: <Home size={14} />, tasks: details.homework, color: 'text-[#045c84]' },
                                                                    { title: 'ক্লাসের কাজ (CW)', icon: <FileText size={14} />, tasks: details.classwork, color: 'text-blue-600' },
                                                                    { title: 'পরবর্তী ক্লাসের প্রস্তুতি', icon: <TrendingUp size={14} />, tasks: details.nextWork, color: 'text-purple-600' },
                                                                    { title: 'মন্তব্য', icon: <MessageSquare size={14} />, tasks: details.comments, color: 'text-emerald-600' }
                                                                ].map((section, sIdx) => {
                                                                    const tasks = Array.isArray(section.tasks) ? section.tasks : [];
                                                                    if (tasks.length === 0) return null;

                                                                    return (
                                                                        <div key={sIdx} className={`p-4 shadow-sm space-y-3 bg-white rounded-2xl border border-slate-200/50`}>
                                                                            <div className={`flex items-center justify-between ${section.color}`}>
                                                                                <div className="flex items-center gap-2">
                                                                                    {section.icon}
                                                                                    <span className={`text-[10px] uppercase tracking-widest font-black`}>{section.title}</span>
                                                                                </div>
                                                                                <span className={`text-[9px] font-black px-1.5 py-0.5 border bg-slate-50 rounded border-slate-100 text-slate-400`}>
                                                                                    {s.submittedCount}/{s.totalStudents}
                                                                                </span>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                {section.tasks.map((task: any, tIdx: number) => {
                                                                                    const targetedNames = Array.isArray(task.targetStudents)
                                                                                        ? task.targetStudents.map((sid: string) => allStudents.find(st => st.id === sid)?.name).filter(Boolean)
                                                                                        : [];

                                                                                    return (
                                                                                        <div key={tIdx} className="flex flex-col gap-1">
                                                                                            <div 
                                                                                                className={`flex gap-2 ${s.canEdit ? 'cursor-pointer hover:bg-slate-50 rounded-lg p-1 transition-all' : ''}`}
                                                                                                onClick={() => {
                                                                                                    if (s.canEdit) {
                                                                                                        let category: any = 'HW';
                                                                                                        if (section.title.includes('CW')) category = 'CW';
                                                                                                        else if (section.title.includes('প্রস্তুতি')) category = 'PR';
                                                                                                        else if (section.title.includes('মন্তব্য')) category = 'CM';
                                                                                                        handleEditTask(task, category, s.className, s.bookId);
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <span className={`mt-0.5 shrink-0 text-[#045c84] font-black`}>→</span>
                                                                                                <div className="flex flex-wrap gap-1 items-center">
                                                                                                    {task.segments ? task.segments.map((seg: any, segIdx: number) => {
                                                                                                        if (seg.type === 'tag') {
                                                                                                            const tag = ALL_TAGS.find(at => at.id === seg.value);
                                                                                                            return (
                                                                                                                <span key={segIdx} className={`px-1.5 py-0 text-[8px] uppercase border font-black rounded ${tag?.color || 'bg-slate-100 text-slate-500'} border-current/10`}>
                                                                                                                    {tag?.label || seg.value}
                                                                                                                </span>
                                                                                                            );
                                                                                                        }
                                                                                                        return <InlineMarkdown key={segIdx} text={seg.value || ''} />;
                                                                                                    }) : <InlineMarkdown text={task.text || ''} />}
                                                                                                </div>
                                                                                            </div>
                                                                                            {targetedNames && targetedNames.length > 0 && (
                                                                                                <p className={`ml-5 text-[8px] uppercase tracking-tight font-black text-blue-500`}>
                                                                                                    🎯 Only for: {targetedNames.join(', ')}
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div className="mt-6 flex justify-end gap-3">
                                                                <button
                                                                    onClick={() => setSelectedAssignment(s.assignment)}
                                                                    className={`px-6 py-2.5 text-[10px] uppercase tracking-widest transition-all shadow-sm bg-white border border-slate-200 rounded-xl font-black text-slate-600 hover:bg-slate-50`}
                                                                >
                                                                    বিস্তারিত দেখুন
                                                                </button>
                                                                {s.status === 'DRAFT' && s.canEdit && (
                                                                    <button
                                                                        onClick={(e) => handleSingleRelease(s.assignmentId, e)}
                                                                        className={`px-6 py-2.5 text-[10px] uppercase tracking-widest transition-all bg-[#045c84] text-white rounded-xl font-black hover:bg-[#034a6b] shadow-lg shadow-[#045c84]/20`}
                                                                    >
                                                                        রিলিজ করুন
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    )}
                </>
            )}
            {/* Assignments Grid No results message */}
            {displaySubjects.length === 0 && calendarViewMode === 'list' && (
                <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-slate-200 mt-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <GraduationCap size={32} />
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4">
                        {viewMode === 'MINE'
                            ? 'আপনার কোনো ক্লাস বা বিষয় নির্ধারিত নেই'
                            : 'এই ভিউতে কোনো বিষয় খুঁজে পাওয়া যায়নি'}
                    </p>
                    {viewMode === 'MINE' && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                        <div className="flex flex-col items-center gap-3">
                            <a href="/dashboard/teachers" className="inline-flex items-center gap-2 px-4 py-2 bg-[#045c84] text-white text-xs font-bold rounded-xl hover:bg-[#034a6b] transition-colors">
                                <Settings size={14} />
                                পারমিশন সেট করুন
                            </a>
                        </div>
                    )}
                </div>
            )}

            <AssignmentDetailsModal
                isOpen={!!selectedAssignment}
                onClose={() => setSelectedAssignment(null)}
                assignments={selectedAssignment ? [selectedAssignment] : []}
                onRelease={handleSingleRelease}
                onEdit={handleEditAssignment}
                isReleasing={releasingId === selectedAssignment?.id}
                canEdit={displaySubjects.find(s => s.assignmentId === selectedAssignment?.id)?.canEdit}
            />

            {/* Class Schedule Settings Modal */}
            {scheduleModalClass && (
                <ClassScheduleSettingsModal
                    isOpen={!!scheduleModalClass}
                    onClose={() => setScheduleModalClass(null)}
                    classId={scheduleModalClass.id}
                    className={scheduleModalClass.name}
                    existingData={scheduleModalClass.schedule}
                    onSuccess={fetchData}
                />
            )}

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    </div>
    );
}
