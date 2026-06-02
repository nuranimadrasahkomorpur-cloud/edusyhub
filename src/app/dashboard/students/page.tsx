'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { createPortal } from 'react-dom';
import { useSession } from '@/components/SessionProvider';
import { usePathname } from 'next/navigation';
import {
    Users,
    Search,
    UserPlus,
    ShieldCheck,
    Mail,
    Building2,
    Loader2,
    X,
    Save,
    Trash2,
    Edit,
    Settings2,
    CloudUpload,
    BookOpen,
    Layers,
    Plus,
    Link,
    ChevronDown,
    ChevronUp,
    MoreVertical,
    ChevronRight,
    Phone,
    MessageSquare,
    MessageCircle,
    List,
    ChevronLeft,
    Layers3,
    CheckCircle,
    CheckCircle2,
    FileX,
    FileSpreadsheet,
    LayoutGrid,
    LayoutList,
    GraduationCap,
    Library,
    ClipboardList,
    GripVertical,
    User,
    Info,
    Key,
    History
} from 'lucide-react';
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import FieldLibrary, { FieldDefinition, POSSIBLE_FIELDS } from '@/components/FieldLibrary';
import StudentProfileModal from '@/components/StudentProfileModal';
import TeacherCard from '@/components/TeacherCard';
import BookCard from '@/components/BookCard';
import BookDetailsModal from '@/components/BookDetailsModal';
import PdfReaderModal from '@/components/PdfReaderModal';
import TeacherPermissionModal from '@/components/TeacherPermissionModal';
import SubjectGradingModal from '@/components/SubjectGradingModal';
import { useUI } from '@/components/UIProvider';
import { getCleanId } from '@/utils/digit-utils';

export default function StudentManagementPage() {
    const { user: currentUser, activeRole, activeInstitute, isLoading } = useSession();
    const pathname = usePathname();
    const { alert, confirm } = useUI();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [classData, setClassData] = useState({ name: '' });
    const [isBulkClassMode, setIsBulkClassMode] = useState(false);
    const [bulkClassText, setBulkClassText] = useState('');
    const [groupData, setGroupData] = useState({ name: '' });
    const [editingClass, setEditingClass] = useState<any>(null);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
    const [isClassManagementModalOpen, setIsClassManagementModalOpen] = useState(false);
    const [managedClasses, setManagedClasses] = useState<any[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const canDrag = useRef(false);
    const [classSearch, setClassSearch] = useState('');
    const [formData, setFormData] = useState<any>({
        name: '',
        email: '',
        password: '',
        metadata: {}
    });

    // Auto-sync fields between Profile and Account Setup
    useEffect(() => {
        if (!isAddModalOpen) return;

        const metadata = formData.metadata || {};
        const updates: any = {};

        // Sync student phone to studentPhone if studentPhone is not manually set
        if (formData.phone && !metadata.studentPhone) {
            updates.studentPhone = formData.phone;
        }

        // Sync fathersPhone or mothersPhone to guardianPhone if guardianPhone is empty
        if ((metadata.fathersPhone || metadata.mothersPhone) && !metadata.guardianPhone) {
            updates.guardianPhone = metadata.fathersPhone || metadata.mothersPhone;
        }

        if (Object.keys(updates).length > 0) {
            setFormData((prev: any) => ({
                ...prev,
                metadata: { ...prev.metadata, ...updates }
            }));
        }
    }, [formData.phone, formData.metadata?.fathersPhone, formData.metadata?.mothersPhone, isAddModalOpen]);

    const [formConfig, setFormConfig] = useState<FieldDefinition[]>([]);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    const [classes, setClasses] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [activeTab, setActiveTab] = useState<'students' | 'applications' | 'books' | 'teachers'>('students');
    const [activeFormTab, setActiveFormTab] = useState<'profile' | 'account'>('profile');

    const [teachers, setTeachers] = useState<any[]>([]);
    const [permissionModalData, setPermissionModalData] = useState<any>(null);
    const [debouncedSearch, setDebouncedSearch] = useState(search);

    const [isStudentSelectionModalOpen, setIsStudentSelectionModalOpen] = useState(false);
    const [selectedStudentsForGroup, setSelectedStudentsForGroup] = useState<string[]>([]);
    const [allStudentsInClass, setAllStudentsInClass] = useState<any[]>([]);

    // Excel Import States
    const [isExcelMode, setIsExcelMode] = useState(false);
    const [excelData, setExcelData] = useState<string[][]>([]);
    const [columnMappings, setColumnMappings] = useState<{ [key: number]: string }>({});
    const [bulkClassId, setBulkClassId] = useState('');
    const [bulkGroupId, setBulkGroupId] = useState('');
    const [bulkGroups, setBulkGroups] = useState<any[]>([]);
    const [previewIds, setPreviewIds] = useState<{ studentId: string, rollNumber: number }[]>([]);
    const [importFails, setImportFails] = useState<any[]>([]);
    const [isImportSummaryOpen, setIsImportSummaryOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isProcessingFace, setIsProcessingFace] = useState(false);
    const [processingFieldId, setProcessingFieldId] = useState<string | null>(null);
    const [isFaceModelLoaded, setIsFaceModelLoaded] = useState(false);

    // Login Credentials Modal States
    const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
    const [credentialsData, setCredentialsData] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
    const [visibleCount, setVisibleCount] = useState(50);

    useEffect(() => {
        setMounted(true);
        loadFaceModels();
    }, []);

    useEffect(() => {
        const generatePreviewIds = async () => {
            if (!bulkClassId || excelData.length === 0 || !activeInstitute?.id) {
                setPreviewIds([]);
                return;
            }

            try {
                const res = await fetch(`/api/admin/students/next-ids?instituteId=${activeInstitute.id}&classId=${bulkClassId}`);
                if (!res.ok) return;
                const startingData = await res.json();

                let currentStudentId = startingData.nextStudentId;
                let currentRollNumber = startingData.nextRollNumber;

                const newPreviewIds = excelData.map(() => {
                    const idObj = { studentId: currentStudentId, rollNumber: currentRollNumber };

                    // Increment logic for next iteration
                    const nextIdStr = (parseInt(currentStudentId.replace(/\D/g, '')) + 1).toString().padStart(currentStudentId.length - (currentStudentId.startsWith('S') ? 1 : 0), '0');
                    currentStudentId = currentStudentId.startsWith('S') ? 'S' + nextIdStr : nextIdStr;
                    currentRollNumber++;

                    return idObj;
                });

                setPreviewIds(newPreviewIds);
            } catch (error) {
                console.error("Failed to fetch initial IDs for preview:", error);
            }
        };

        generatePreviewIds();
    }, [bulkClassId, excelData, activeInstitute?.id]);

    const loadFaceModels = async () => {
        try {
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL).catch(err => {
                    console.warn('Face recognition model failed to load:', err);
                    return null;
                }),
            ]);
            setIsFaceModelLoaded(true);
            console.log('Face models loaded successfully');
        } catch (error) {
            console.error('Error loading face models:', error);
        }
    };

    const fetchTeachers = async () => {
        if (!activeInstitute?.id) return;
        try {
            const res = await fetch(`/api/teacher?instituteId=${activeInstitute.id}`);
            const text = await res.text();
            try {
                const data = JSON.parse(text);
                if (Array.isArray(data)) {
                    setTeachers(data);
                }
            } catch (e) {
                console.error('Invalid JSON from fetchTeachers:', text.substring(0, 100));
            }
        } catch (error) {
            console.error('Failed to fetch teachers:', error);
        }
    };

    const handleUpdateTeacherPermissions = async (teacherId: string, updates: any) => {
        try {
            const res = await fetch(`/api/teacher/${teacherId}/permissions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...updates,
                    adminId: currentUser?.id,
                    instituteId: activeInstitute?.id
                }),
            });

            if (res.ok) {
                setToast({ message: 'পারমিশন আপডেট করা হয়েছে', type: 'success' });
                fetchTeachers(); // Refresh
            } else {
                const data = await res.json();
                setToast({ message: data.error || 'পারমিশন আপডেট ব্যর্থ হয়েছে', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'আপডেট ব্যর্থ হয়েছে', type: 'error' });
        }
    };

    useEffect(() => {
        if (activeTab === 'teachers') {
            fetchTeachers();
            fetchBooks();
        }
    }, [activeTab, activeInstitute?.id]);

    // Books States
    const [books, setBooks] = useState<any[]>([]);
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [isBookDetailsModalOpen, setIsBookDetailsModalOpen] = useState(false);
    const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
    const [gradingSubjectId, setGradingSubjectId] = useState<string | null>(null);
    const [selectedBook, setSelectedBook] = useState<any | null>(null);
    const [isReaderOpen, setIsReaderOpen] = useState(false);
    const [bookData, setBookData] = useState({ names: '', classId: '', groupId: '', coverImage: '', author: '' });
    const [bookViewMode, setBookViewMode] = useState<'card' | 'cover'>('card');

    // Persist book view mode
    useEffect(() => {
        const savedView = localStorage.getItem('edusy_book_view_mode');
        if (savedView === 'card' || savedView === 'cover') {
            setBookViewMode(savedView);
        }
    }, []);

    const handleViewModeToggle = (mode: 'card' | 'cover') => {
        setBookViewMode(mode);
        localStorage.setItem('edusy_book_view_mode', mode);
    };

    const [pendingCount, setPendingCount] = useState(0);

    const fetchPendingCount = async () => {
        if (!activeInstitute?.id) return;
        try {
            const res = await fetch(`/api/admin/users?role=STUDENT&instituteId=${activeInstitute.id}&admissionStatus=PENDING`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];

            if (activeRole === 'TEACHER') {
                const profile = currentUser?.teacherProfiles?.find((p: any) => p.instituteId === activeInstitute?.id);
                const classWise = profile?.permissions?.classWise || {};
                const allowedClassIds = Object.keys(classWise);

                const filtered = list.filter(s => {
                    const studentClassId = s.metadata?.classId;
                    return allowedClassIds.includes(studentClassId);
                });
                setPendingCount(filtered.length);
            } else {
                setPendingCount(list.length);
            }
        } catch (error) {
            console.error('Fetch pending count error:', error);
        }
    };



    const fetchFormConfig = async () => {
        if (!activeInstitute?.id) return;
        try {
            const url = `/api/admin/institutes/form-config?instituteId=${activeInstitute.id}`;
            const res = await fetch(url);
            const data = await res.json();
            let config = Array.isArray(data) ? data : [];

            // If empty, set default fields
            if (config.length === 0) {
                const defaultIds = ['studentPhoto', 'studentId', 'rollNumber', 'name', 'email', 'fathersName', 'mothersName', 'guardianPhone', 'password', 'guardianPassword'];
                const defaults = POSSIBLE_FIELDS.filter(f => defaultIds.includes(f.id));
                // Sort by defaultIds order
                const sortedDefaults = defaultIds.map(id => defaults.find(f => f.id === id)).filter(Boolean) as FieldDefinition[];

                await handleUpdateFormConfig(sortedDefaults);
                config = sortedDefaults;
            }

            setFormConfig(config);
        } catch (error) {
            console.error('Fetch form config error:', error);
        }
    };

    // Dropdown Positioning
    const classButtonRef = useRef<HTMLButtonElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

    const handleOpenDropdown = () => {
        if (isClassDropdownOpen) {
            setIsClassDropdownOpen(false);
            return;
        }
        if (classButtonRef.current) {
            const rect = classButtonRef.current.getBoundingClientRect();
            setDropdownStyle({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX,
                width: rect.width
            });
            setIsClassDropdownOpen(true);
        }
    };

    // Update position on scroll/resize if open
    useEffect(() => {
        if (!isClassDropdownOpen) return;
        const handleReposition = () => {
            if (classButtonRef.current) {
                const rect = classButtonRef.current.getBoundingClientRect();
                setDropdownStyle({
                    top: rect.bottom + window.scrollY + 8,
                    left: rect.left + window.scrollX,
                    width: rect.width
                });
            }
        };
        window.addEventListener('scroll', handleReposition, true);
        window.addEventListener('resize', handleReposition);
        return () => {
            window.removeEventListener('scroll', handleReposition, true);
            window.removeEventListener('resize', handleReposition);
        };
    }, [isClassDropdownOpen]);

    const fetchClasses = async () => {
        if (!activeInstitute?.id) return;
        try {
            const res = await fetch(`/api/admin/classes?instituteId=${activeInstitute.id}`);
            const data = await res.json();
            setClasses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch classes error:', error);
        }
    };

    const fetchGroups = async (classId: string) => {
        try {
            const res = await fetch(`/api/admin/groups?classId=${classId}`);
            const data = await res.json();
            setGroups(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch groups error:', error);
        }
    };

    const fetchBooks = async () => {
        if (!activeInstitute?.id) return;
        setLoading(true);
        try {
            const classFilter = selectedClassId !== 'all' ? `&classId=${selectedClassId}` : '';
            const groupFilter = selectedGroupId !== 'all' ? `&groupId=${selectedGroupId}` : '';
            const res = await fetch(`/api/admin/books?instituteId=${activeInstitute.id}${classFilter}${groupFilter}`);
            const text = await res.text();
            try {
                const data = JSON.parse(text);
                setBooks(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Invalid JSON from fetchBooks:', text.substring(0, 100));
                setBooks([]);
            }
        } catch (error) {
            console.error('Fetch books error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async (pageToFetch = 1) => {
        if (!activeInstitute?.id) return;

        if (pageToFetch === 1) {
            setLoading(true);
            setHasMore(true);
        } else {
            setIsLoadingMore(true);
        }
        
        try {
            const instituteFilter = activeInstitute?.id ? `&instituteId=${activeInstitute.id}` : '';
            const statusFilterQuery = activeTab === 'applications' ? '&admissionStatus=PENDING' : `&status=${statusFilter}`;

            // Fetch students without class/group filters so we can filter locally instantly
            const res = await fetch(`/api/admin/users?role=STUDENT&search=${debouncedSearch}${instituteFilter}${statusFilterQuery}&page=${pageToFetch}&limit=1000`);
            const text = await res.text();
            try {
                const data = JSON.parse(text);
                const list = Array.isArray(data) ? data : [];
                
                if (pageToFetch === 1) {
                    setStudents(list);
                } else {
                    setStudents(prev => [...prev, ...list]);
                }
                
                setHasMore(list.length === 20);
                setCurrentPage(pageToFetch);
                
                // Sync selectedStudent state with the updated record from the database
                if (selectedStudent) {
                    const updated = list.find((s: any) => s.id === selectedStudent.id);
                    if (updated) {
                        setSelectedStudent(updated);
                    }
                }
            } catch (e) {
                console.error('Invalid JSON from fetchStudents:', text.substring(0, 100));
                if (pageToFetch === 1) setStudents([]);
            }
        } catch (error) {
            console.error('Fetch students error:', error);
        } finally {
            if (pageToFetch === 1) {
                setLoading(false);
            } else {
                setIsLoadingMore(false);
            }
        }
    };

    useEffect(() => {
        if (activeInstitute?.id) {
            fetchFormConfig();
            fetchClasses();
            fetchPendingCount();
        }
    }, [activeInstitute?.id]);

    // Handle debounced search separately
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch data immediately when filters or tab change
    useEffect(() => {
        setVisibleCount(50);
        if (!activeInstitute?.id) {
            setLoading(false);
            return;
        }

        if (activeTab === 'books') {
            fetchBooks();
        } else if (activeTab === 'students' || activeTab === 'applications') {
            fetchStudents(1);
        }
    }, [debouncedSearch, activeInstitute?.id, activeTab, statusFilter]);

    // Strict Owner/SuperAdmin check
    const isOwner = activeRole === 'SUPER_ADMIN' || (activeInstitute?.adminIds || []).includes(currentUser?.id) || activeInstitute?.isOwner === true;

    // Permission Helpers (Moved to top area)
    const canManageClass = (classId: string) => {
        const targetClassId = getCleanId(classId);
        if (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN') return true;
        if (activeRole === 'TEACHER' && currentUser?.teacherProfiles) {
            const profile = currentUser.teacherProfiles.find((p: any) => p.instituteId === activeInstitute?.id);
            if (!profile) return false;
            if (profile.isAdmin) return true;
            if (!profile.permissions?.classWise) return false;

            const classPermissions = profile.permissions.classWise[targetClassId];
            if (!classPermissions) return false;

            if (classPermissions && typeof classPermissions === 'object' && classPermissions.permissions && Array.isArray(classPermissions.permissions)) {
                return classPermissions.permissions.includes('canManageAdmission');
            }
            if (Array.isArray(classPermissions)) {
                return classPermissions.includes('canManageAdmission');
            }
        }
        return false;
    };

    // Calculate allowed classes for admission (Any class teacher is assigned to for visibility)
    const allowedClasses = React.useMemo(() => {
        if (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN') return classes;
        if (activeRole === 'TEACHER' && currentUser?.teacherProfiles) {
            const profile = (currentUser.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            if (!profile) return [];
            if (profile.isAdmin) return classes;
            if (!profile.permissions?.classWise) return [];

            return classes.filter(c => {
                const targetClassId = getCleanId(c.id);
                const classPermissions = profile.permissions.classWise[targetClassId];
                // If there's ANY entry for this class, the teacher is assigned to it and should see it
                return classPermissions !== undefined && classPermissions !== null;
            });
        }
        return [];
    }, [classes, activeRole, currentUser, activeInstitute]);

    if (isLoading) return null;

    const handleUpdateFormConfig = async (newConfig: FieldDefinition[]) => {
        if (!activeInstitute?.id) return;
        try {
            await fetch('/api/admin/institutes/form-config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instituteId: activeInstitute.id,
                    studentFormConfig: newConfig
                }),
            });
            setFormConfig(newConfig);
        } catch (error) {
            console.error('Update form config error:', error);
        }
    };

    const handleAddField = (field: FieldDefinition) => {
        const newConfig = [...formConfig, field];
        handleUpdateFormConfig(newConfig);
    };

    const handleAutoGenerate = async (fieldId: string, providedClassId?: string, force = false) => {
        if (!activeInstitute?.id) return;

        // Don't overwrite if field already has value, unless forced
        const currentValue = formData.metadata?.[fieldId];
        if (currentValue && !force) return;

        try {
            const classId = providedClassId || formData.metadata?.classId || '';
            const res = await fetch(`/api/admin/students/next-ids?instituteId=${activeInstitute.id}&classId=${classId}`);
            const data = await res.json();

            if (fieldId === 'studentId') {
                setFormData((prev: any) => ({
                    ...prev,
                    metadata: { ...prev.metadata, studentId: data.nextStudentId }
                }));
            } else if (fieldId === 'rollNumber') {
                if (!classId) return;
                setFormData((prev: any) => ({
                    ...prev,
                    metadata: { ...prev.metadata, rollNumber: data.nextRollNumber }
                }));
            }
        } catch (error) {
            console.error('Auto generate failed', error);
        }
    };

    // Auto-generate IDs when modal opens for a new student
    useEffect(() => {
        if (isAddModalOpen && !editingStudent) {
            // Capture current classId from state
            const currentClassId = formData.metadata?.classId;
            // Give a small delay to ensure formData is initialized
            setTimeout(() => {
                handleAutoGenerate('studentId');
                if (currentClassId) {
                    handleAutoGenerate('rollNumber', currentClassId);
                }
            }, 100);
        }
    }, [isAddModalOpen, !!editingStudent]);

    const handleRemoveField = (fieldId: string) => {
        const newConfig = formConfig.filter(f => f.id !== fieldId);
        handleUpdateFormConfig(newConfig);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Auto-extract face if it's a student photo (middle, left, or right)
        if ((fieldId === 'studentPhoto' || fieldId === 'studentPhotoLeft' || fieldId === 'studentPhotoRight') && isFaceModelLoaded) {
            extractFaceDescriptor(file, fieldId);
        }

        const uploadData = new FormData();
        uploadData.append('file', file);

        // Create local preview
        const localUrl = URL.createObjectURL(file);
        setFormData((prev: any) => ({
            ...prev,
            metadata: { ...prev.metadata, [fieldId]: localUrl }
        }));

        try {
            setActionLoading(true);
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData
            });
            const data = await res.json();
            if (res.ok && data.url) {
                // Update with permanent URL
                setFormData((prev: any) => ({
                    ...prev,
                    metadata: { ...prev.metadata, [fieldId]: data.url }
                }));
            } else {
                // Clear local preview if upload failed
                setFormData((prev: any) => ({
                    ...prev,
                    metadata: { ...prev.metadata, [fieldId]: '' }
                }));
                setToast({ message: data.message || 'আপলোড ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Upload failed', error);
            // Clear local preview on error
            setFormData((prev: any) => ({
                ...prev,
                metadata: { ...prev.metadata, [fieldId]: '' }
            }));
            setToast({ message: 'ফাইল আপলোড ব্যর্থ হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const extractFaceDescriptor = async (file: File, fieldId: string) => {
        try {
            setProcessingFieldId(fieldId);
            setIsProcessingFace(true);
            const img = await faceapi.bufferToImage(file);
            const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                // High Precision Quality Check
                const { score } = detection.detection;
                if (score < 0.95) {
                    setToast({ message: 'ছবিটি যথেষ্ট পরিষ্কার নয়। দয়া করে ভালো মানের ছবি ব্যবহার করুন।', type: 'error' });
                    return;
                }

                const descriptor = Array.from(detection.descriptor);

                // Collision Check (Duplicate Prevention)
                try {
                    const checkRes = await fetch(`/api/admin/students/check-duplicate-face`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ descriptor })
                    });
                    
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        if (checkData.isDuplicate && checkData.studentId !== editingStudent?.id) {
                            setToast({ 
                                message: `এই মুখটি ইতিপূর্বে ${checkData.studentName} নামে নিবন্ধিত হয়েছে। একই ফেস ডাটা দুইবার ব্যবহার করা সম্ভব নয়।`, 
                                type: 'error' 
                            });
                            return;
                        }
                    }
                } catch (err) {
                    console.warn('Collision check failed, proceeding with baseline accuracy.');
                }

                const descKey = fieldId === 'studentPhoto' ? 'faceDescriptorMiddle' : 
                               fieldId === 'studentPhotoLeft' ? 'faceDescriptorLeft' : 'faceDescriptorRight';

                setFormData((prev: any) => ({
                    ...prev,
                    [descKey]: descriptor
                }));
                setToast({ message: 'ফেস আইডি সফলভাবে গ্রহণ করা হয়েছে!', type: 'success' });
            } else {
                setToast({ message: 'ছবিতে কোনো মুখ পাওয়া যায়নি। দয়া করে পরিষ্কার ছবি দিন।', type: 'error' });
            }
        } catch (error) {
            console.error('Face extraction error:', error);
        } finally {
            setIsProcessingFace(false);
            setProcessingFieldId(null);
        }
    };

    // Auto-fill Guardian Name
    useEffect(() => {
        const checkGuardian = async () => {
            const phone = formData.metadata?.guardianPhone;
            if (!phone || phone.length < 11) return;

            try {
                const res = await fetch(`/api/admin/users?role=GUARDIAN&search=${phone}`);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const guardian = data[0];
                    setFormData((prev: any) => ({
                        ...prev,
                        metadata: {
                            ...prev.metadata,
                            guardianName: guardian.name
                        }
                    }));
                    setToast({ message: 'অভিভাবকের তথ্য পাওয়া গেছে!', type: 'success' });
                }
            } catch (error) {
                console.error("Guardian check failed", error);
            }
        };

        const timeoutId = setTimeout(checkGuardian, 1000);
        return () => clearTimeout(timeoutId);
    }, [formData.metadata?.guardianPhone]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeInstitute?.id) {
            setToast({ message: 'সক্রিয় প্রতিষ্ঠান পাওয়া যায়নি।', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            // Priority: top-level formData fields should always override metadata if present
            const finalName = formData.name || formData.metadata?.name;
            const finalEmail = formData.email || formData.metadata?.email;
            const finalPassword = formData.password || formData.metadata?.password;

            // Clean metadata to avoid shadowing/legacy conflicts
            const cleanedMetadata = { ...(formData.metadata || {}) };
            delete cleanedMetadata.name;
            delete cleanedMetadata.email;
            delete cleanedMetadata.password;
            delete cleanedMetadata.phone; // Top level phone is preferred

            const finalPhone = formData.metadata?.studentPhone || formData.phone;
            const gPhone = formData.metadata?.guardianPhone;

            if (!formData.skipAccountSetup && !finalEmail && !finalPhone && !gPhone) {
                setToast({ message: 'ইমেইল, শিক্ষার্থীর মোবাইল অথবা অভিভাবকের মোবাইল নম্বর - যেকোনো একটি অবশ্যই দিতে হবে।', type: 'error' });
                setActionLoading(false);
                return;
            }

            // Build the final faceDescriptor payload
            let finalFaceDescriptor = formData.faceDescriptor || [];
            if (formData.faceDescriptorMiddle || formData.faceDescriptorLeft || formData.faceDescriptorRight) {
                const descs: number[][] = [];
                if (formData.faceDescriptorMiddle) descs.push(formData.faceDescriptorMiddle);
                else if (formData.faceDescriptor) {
                    if (Array.isArray(formData.faceDescriptor[0])) {
                        descs.push(formData.faceDescriptor[0]);
                    } else if (formData.faceDescriptor.length > 0) {
                        descs.push(formData.faceDescriptor);
                    }
                }
                
                if (formData.faceDescriptorLeft) descs.push(formData.faceDescriptorLeft);
                else if (formData.faceDescriptor && Array.isArray(formData.faceDescriptor[0]) && formData.faceDescriptor[1]) {
                    descs.push(formData.faceDescriptor[1]);
                }
                
                if (formData.faceDescriptorRight) descs.push(formData.faceDescriptorRight);
                else if (formData.faceDescriptor && Array.isArray(formData.faceDescriptor[0]) && formData.faceDescriptor[2]) {
                    descs.push(formData.faceDescriptor[2]);
                }
                finalFaceDescriptor = descs;
            }

            const payload = {
                ...formData,
                id: editingStudent?.id, // include ID for PATCH
                name: finalName,
                email: finalEmail || null,
                password: finalPassword,
                phone: finalPhone || null,
                role: 'STUDENT',
                faceDescriptor: finalFaceDescriptor,
                metadata: editingStudent?.metadata?.admissionStatus === 'PENDING'
                    ? { ...cleanedMetadata, admissionStatus: 'APPROVED', admissionDate: new Date().toISOString(), status: 'ACTIVE', statusLastChangedAt: new Date().toISOString(), statusHistory: [{ status: 'ACTIVE', timestamp: new Date().toISOString(), changedBy: currentUser?.name || 'System (Admission)', reason: 'প্রবেশাধিকার (Admission)' }] }
                    : (editingStudent ? cleanedMetadata : { ...cleanedMetadata, admissionStatus: 'APPROVED', admissionDate: new Date().toISOString(), status: 'ACTIVE', statusLastChangedAt: new Date().toISOString(), statusHistory: [{ status: 'ACTIVE', timestamp: new Date().toISOString(), changedBy: currentUser?.name || 'System (Creation)', reason: 'প্রবেশাধিকার (Admission)' }] }),
                instituteIds: editingStudent ? undefined : [activeInstitute.id] // only for POST
            };

            // Clean temporary keys from payload to prevent DB clutter
            delete (payload as any).faceDescriptorMiddle;
            delete (payload as any).faceDescriptorLeft;
            delete (payload as any).faceDescriptorRight;

            const url = '/api/admin/users';
            const method = editingStudent ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const isReviewing = editingStudent?.metadata?.admissionStatus === 'PENDING';
                setToast({
                    message: isReviewing ? 'আবেদনটি মঞ্জুর ও ডাটা আপডেট করা হয়েছে!' : (editingStudent ? 'শিক্ষার্থীর তথ্য আপডেট করা হয়েছে!' : 'শিক্ষার্থী সফলভাবে যুক্ত করা হয়েছে!'),
                    type: 'success'
                });
                setIsAddModalOpen(false);
                setFormData({ name: '', email: '', password: '', metadata: {} });
                
                if (editingStudent) {
                    // Update locally
                    setStudents(prev => prev.map(s => s.id === editingStudent.id ? { 
                        ...s, 
                        name: payload.name || s.name,
                        phone: payload.phone || s.phone,
                        email: payload.email || s.email,
                        metadata: payload.metadata || s.metadata,
                        faceDescriptor: payload.faceDescriptor || s.faceDescriptor
                    } : s));
                } else {
                    // Fetch for new student to get DB ID
                    fetchStudents();
                }
                setEditingStudent(null);
            } else {
                const data = await res.json();
                setToast({ message: data.message || 'ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Submit student error:', error);
            setToast({ message: 'সার্ভার এরর।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleQuickClassCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeInstitute?.id) return;
        setActionLoading(true);
        try {
            let payload: any = { instituteId: activeInstitute.id };

            if (isBulkClassMode) {
                const items = bulkClassText
                    .split('\n')
                    .map(line => {
                        const slMatch = line.match(/^(\d+)[\.\)\s-]+/);
                        const order = slMatch ? parseInt(slMatch[1]) : 0;
                        const name = line.replace(/^\d+[\.\)\s-]+/, '').trim();
                        return { name, order };
                    })
                    .filter(item => item.name.length > 0);

                if (items.length === 0) {
                    setToast({ message: 'অনুগ্রহ করে ক্লাস লিস্ট দিন।', type: 'error' });
                    setActionLoading(false);
                    return;
                }
                payload.names = items;
            } else {
                payload.name = classData.name;
            }

            const url = editingClass ? `/api/admin/classes/${editingClass.id}` : '/api/admin/classes';
            const method = editingClass ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setToast({ message: editingClass ? 'ক্লাস আপডেট হয়েছে!' : (isBulkClassMode ? 'ক্লাসগুলো তৈরি হয়েছে!' : 'ক্লাস সফলভাবে তৈরি হয়েছে!'), type: 'success' });
                setIsClassModalOpen(false);
                setClassData({ name: '' });
                setBulkClassText('');
                setEditingClass(null);
                fetchClasses();
            }
        } catch (error) {
            setToast({ message: 'ক্রুটি হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };



    const handleDeleteClass = async (id: string) => {
        if (!await confirm('আপনি কি এই ক্লাসটি ডিলিট করতে চান? ')) return;
        try {
            const res = await fetch(`/api/admin/classes/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setToast({ message: 'ক্লাস ডিলিট হয়েছে!', type: 'success' });
                if (selectedClassId === id) setSelectedClassId('all');
                fetchClasses();
            }
        } catch (error) {
            setToast({ message: 'ডিলিট করতে ক্রুটি হয়েছে।', type: 'error' });
        }
    };

    const handleSaveClassManagement = async () => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/classes/reorder', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instituteId: activeInstitute?.id,
                    classes: managedClasses.map((c, i) => ({
                        id: c.id,
                        name: c.name,
                        order: i
                    }))
                })
            });
            if (res.ok) {
                setToast({ message: 'ক্লাসগুলো সফলভাবে আপডেট ও সাজানো হয়েছে!', type: 'success' });
                setIsClassManagementModalOpen(false);
                fetchClasses();
            }
        } catch (error) {
            setToast({ message: 'ক্রুটি হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteStudent = async (id: string) => {
        if (!await confirm('আপনি কি এই শিক্ষার্থীকে ডিলিট করতে চান?')) return;
        try {
            const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setToast({ message: 'শিক্ষার্থী ডিলিট হয়েছে!', type: 'success' });
                setStudents(prev => prev.filter(s => s.id !== id));
            }
        } catch (error) {
            setToast({ message: 'ডিলিট করতে ক্রুটি হয়েছে।', type: 'error' });
        }
    };

    const handleStatusUpdate = async (studentId: string, status: 'APPROVED' | 'REJECTED') => {
        setActionLoading(true);
        try {
            let res;
            if (status === 'APPROVED') {
                const student = students.find(s => s.id === studentId);
                res = await fetch(`/api/admin/users?id=${studentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: 'STUDENT',
                        metadata: { ...student.metadata, admissionStatus: 'APPROVED', admissionDate: new Date().toISOString(), status: 'ACTIVE', statusLastChangedAt: new Date().toISOString(), statusHistory: [{ status: 'ACTIVE', timestamp: new Date().toISOString(), changedBy: currentUser?.name || 'System (Approval)', reason: 'প্রবেশাধিকার (Admission)' }] }
                    })
                });
            } else {
                // Reject means delete
                res = await fetch(`/api/admin/users?id=${studentId}`, {
                    method: 'DELETE'
                });
            }

            if (res && res.ok) {
                setToast({ message: `আবেদনটি ${status === 'APPROVED' ? 'মঞ্জুর' : 'বাতিল'} করা হয়েছে।`, type: 'success' });
                if (status === 'APPROVED') {
                    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, metadata: { ...s.metadata, admissionStatus: 'APPROVED', status: 'ACTIVE' } } : s));
                } else {
                    setStudents(prev => prev.filter(s => s.id !== studentId));
                }
                fetchPendingCount();
            }
        } catch (error) {
            console.error('Status update error:', error);
            setToast({ message: 'প্রক্রিয়াটি সম্পন্ন করতে সমস্যা হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleQuickGroupCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedClassId === 'all') return;
        setActionLoading(true);
        try {
            const method = editingGroup ? 'PATCH' : 'POST';
            const url = editingGroup ? `/api/admin/groups/${editingGroup.id}` : '/api/admin/groups';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...groupData, classId: selectedClassId })
            });

            if (res.ok) {
                setToast({
                    message: editingGroup ? 'গ্রুপ আপডেট হয়েছে!' : 'গ্রুপ সফলভাবে তৈরি হয়েছে!',
                    type: 'success'
                });
                setIsGroupModalOpen(false);
                setEditingGroup(null);
                setGroupData({ name: '' });
                fetchGroups(selectedClassId);
            }
        } catch (error) {
            setToast({ message: 'ক্রুটি হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        if (!await confirm(`আপনি কি নিশ্চিত যে "${name}" গ্রুপটি ডিলিট করতে চান?`)) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/admin/groups/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setToast({ message: 'গ্রুপ ডিলিট হয়েছে!', type: 'success' });
                fetchGroups(selectedClassId);
                if (selectedGroupId === id) setSelectedGroupId('all');
            } else {
                const data = await res.json();
                setToast({ message: data.error || 'ডিলিট করতে ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'ক্রুটি হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkGroupAssign = async () => {
        if (selectedGroupId === 'all' || selectedStudentsForGroup.length === 0) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/users/bulk-group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: selectedStudentsForGroup,
                    groupId: selectedGroupId
                })
            });

            if (res.ok) {
                setToast({ message: 'শিক্ষার্থীদের গ্রুপে যোগ করা হয়েছে!', type: 'success' });
                setIsStudentSelectionModalOpen(false);
                setStudents(prev => prev.map(s => selectedStudentsForGroup.includes(s.id) ? { ...s, metadata: { ...s.metadata, groupId: selectedGroupId } } : s));
                setSelectedStudentsForGroup([]);
            } else {
                setToast({ message: 'ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Bulk Assign Error:', error);
            setToast({ message: 'ক্রুটি হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveFromGroup = async (student: any) => {
        if (!await confirm(`${student.name}-কে গ্রুপ থেকে বাদ দিতে চান?`)) return;
        setActionLoading(true);
        try {
            const updatedMetadata = { ...student.metadata };
            delete updatedMetadata.groupId;

            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: student.id,
                    metadata: updatedMetadata
                })
            });

            if (res.ok) {
                setToast({ message: 'গ্রুপ থেকে বাদ দেওয়া হয়েছে!', type: 'success' });
                setStudents(prev => prev.map(s => s.id === student.id ? { ...s, metadata: updatedMetadata } : s));
            } else {
                setToast({ message: 'ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'ক্রুটি হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const fetchAllStudentsInClass = async () => {
        if (!activeInstitute?.id || selectedClassId === 'all') return;
        try {
            const res = await fetch(`/api/admin/users?role=STUDENT&classId=${selectedClassId}&instituteId=${activeInstitute.id}`);
            const data = await res.json();
            setAllStudentsInClass(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch all students error:', error);
        }
    };

    const handleBookSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeInstitute?.id || !bookData.names.trim()) return;

        const targetClassId = bookData.classId || selectedClassId;
        if (targetClassId === 'all') {
            setToast({ message: 'দয়া করে একটি ক্লাস নির্বাচন করুন।', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            const names = bookData.names.split('\n').map(n => n.trim()).filter(Boolean);
            const res = await fetch('/api/admin/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    names,
                    classId: targetClassId,
                    groupId: bookData.groupId || null,
                    instituteId: activeInstitute.id,
                    coverImage: bookData.coverImage || null,
                    author: bookData.author || null
                })
            });

            const result = await res.json();

            if (res.ok) {
                setToast({ message: `${result.count || ''} টি বই সফলভাবে যুক্ত হয়েছে!`, type: 'success' });
                setIsBookModalOpen(false);
                setBookData({ names: '', classId: '', groupId: '', coverImage: '', author: '' });
                fetchBooks();
            } else {
                setToast({ message: result.message || 'বই যুক্ত করতে সমস্যা হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Book create error:', error);
            setToast({ message: 'সার্ভারে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBookDelete = async (id: string) => {
        if (!await confirm('আপনি কি নিশ্চিতভাবে এই বইটি মুছে ফেলতে চান?')) return;
        try {
            const res = await fetch(`/api/admin/books?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setToast({ message: 'বইটি সফলভাবে মুছে ফেলা হয়েছে।', type: 'success' });
                fetchBooks();
            }
        } catch (error) {
            console.error('Book delete error:', error);
        }
    };

    const handleSaveGrading = async (id: string, data: { totalMarks: number, gradingRules: any[] }) => {
        try {
            const res = await fetch(`/api/admin/books/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setToast({ message: 'গ্রেডিং সেটিংস সংরক্ষণ করা হয়েছে!', type: 'success' });
                // Update local books state
                setBooks(prev => prev.map(book =>
                    book.id === id ? { ...book, ...data } : book
                ));
            } else {
                setToast({ message: 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Save grading error:', error);
            setToast({ message: 'সার্ভার এরর!', type: 'error' });
        }
    };

    if (activeRole !== 'ADMIN' && activeRole !== 'SUPER_ADMIN' && activeRole !== 'TEACHER') {
        if (typeof window !== 'undefined') {
            if (activeRole === 'GUARDIAN') window.location.replace('/dashboard/guardian');
            else if (activeRole === 'STUDENT') window.location.replace('/dashboard/student');
            else window.location.replace('/dashboard');
        }
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <Loader2 className="animate-spin text-primary mb-4" size={40} />
                <p className="text-xl font-medium font-bengali">পুনর্নির্দেশ করা হচ্ছে...</p>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 md:p-8 space-y-6 animate-fade-in-up font-bengali w-full min-w-0 overflow-x-hidden">


            {/* Utility Bar (Search, Action, Library, Public Link) */}
            <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none text-slate-800 text-sm sm:text-base font-medium shadow-sm placeholder:text-slate-400"
                        placeholder="খুঁজুন..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {activeTab === 'students' && (
                    <details className="relative shrink-0 group z-[200]">
                        <summary className="list-none flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 shadow-sm cursor-pointer hover:border-[#045c84] hover:text-[#045c84] transition-all focus:outline-none">
                            <span className="flex items-center gap-1.5">
                                {statusFilter === 'ACTIVE' && <><span className="w-2 h-2 rounded-full bg-emerald-500 hidden sm:inline-block"></span> সক্রিয়</>}
                                {statusFilter === 'INACTIVE' && <><span className="w-2 h-2 rounded-full bg-rose-500 hidden sm:inline-block"></span> নিষ্ক্রিয়</>}
                                {statusFilter === 'ALL' && <><span className="w-2 h-2 rounded-full bg-slate-500 hidden sm:inline-block"></span> সকল</>}
                            </span>
                            <ChevronDown size={16} className="text-slate-400 group-open:rotate-180 transition-transform" />
                        </summary>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-40 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-[210] flex flex-col gap-1">
                            {[
                                { id: 'ACTIVE', label: 'সক্রিয়', count: students.filter(s => (s.metadata?.status || 'ACTIVE') === 'ACTIVE').length, dot: 'bg-emerald-500' },
                                { id: 'INACTIVE', label: 'নিষ্ক্রিয়', count: students.filter(s => s.metadata?.status === 'INACTIVE').length, dot: 'bg-rose-500' },
                                { id: 'ALL', label: 'সকল', count: null, dot: 'bg-slate-500' }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        setStatusFilter(opt.id as any);
                                        // Close dropdown by removing open attribute from closest details
                                        const details = document.querySelector('details.group[open]') as HTMLDetailsElement;
                                        if (details) details.removeAttribute('open');
                                    }}
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all w-full text-left ${
                                        statusFilter === opt.id ? 'bg-[#045c84]/10 text-[#045c84]' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`}></span>
                                        {opt.label}
                                    </span>
                                    {opt.count !== null && (
                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${
                                            statusFilter === opt.id ? 'bg-[#045c84]/20 text-[#045c84]' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {opt.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </details>
                )}
            </div>




            {/* Class & Group Tabs */}
            <div className="sticky top-0 z-[100] bg-slate-50 py-3 space-y-4 shadow-sm transition-all w-full min-w-0 overflow-hidden">
                {/* Class Dropdown */}
                <div className="flex items-center gap-2 relative z-[110] w-full overflow-hidden">

                    <ScrollableTabs
                        items={[
                            { id: 'all', label: 'সকল ক্লাস' },
                            ...allowedClasses.map(c => ({ id: c.id, label: c.name })),
                            ...(activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' ? [{ id: 'add-class', label: 'নতুন ক্লাস' }] : [])
                        ]}
                        selectedId={selectedClassId}
                        onSelect={(id) => {
                            setSelectedClassId(id);
                            setSelectedGroupId('all');
                            if (id !== 'all') fetchGroups(id);
                            else setGroups([]);
                        }}
                        className="flex-1 min-w-0"
                        renderItem={(item, isSelected) => {
                            if (item.id === 'add-class') {
                                return (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsClassModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-bold transition-all border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 text-slate-500 hover:text-[#045c84] hover:border-[#045c84] shrink-0 cursor-pointer active:scale-95"
                                    >
                                        <Plus size={16} />
                                        <span className="whitespace-nowrap">{item.label}</span>
                                    </div>
                                );
                            }
                            return (
                                <div className={`flex items-center gap-2 pl-5 pr-4 py-2 rounded-2xl text-sm font-bold transition-all border shrink-0 group/tab ${isSelected
                                    ? 'bg-[#045c84] text-white border-[#045c84] shadow-md'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#045c84] hover:text-[#045c84]'
                                    }`}>
                                    <span className="whitespace-nowrap">{item.label}</span>
                                    {(item.id !== 'all' || item.id === 'all') && isSelected && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const menuHeight = 150;
                                                const spaceBelow = window.innerHeight - rect.bottom;
                                                const showAbove = spaceBelow < menuHeight;

                                                setMenuPosition({
                                                    top: showAbove
                                                        ? rect.top + window.scrollY - menuHeight - 8
                                                        : rect.bottom + window.scrollY + 8,
                                                    left: rect.left + window.scrollX
                                                });
                                                setIsActionMenuOpen(isActionMenuOpen === item.id ? null : item.id);
                                            }}
                                            className="p-1 rounded-lg transition-all ml-1 border-l pl-2 text-white/70 hover:bg-white/20 hover:text-white border-white/20"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                    )}
                                </div>
                            );
                        }}
                    />

                    <div className="w-px h-8 bg-slate-200 shrink-0"></div>



                    {/* Redundant header buttons hidden in favor of FAB */}
                    {/* {activeTab !== 'applications' && activeTab !== 'teachers' && (allowedClasses.length > 0) && ( ... )} */}
                </div>

                {/* Main Navigation Tabs */}
                <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${activeTab === 'students'
                            ? 'bg-white text-[#045c84] shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        শিক্ষার্থী
                    </button>
                    <button
                        onClick={() => setActiveTab('books')}
                        className={`px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${activeTab === 'books'
                            ? 'bg-white text-[#045c84] shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        বই
                    </button>
                    <button
                        onClick={() => setActiveTab('teachers')}
                        className={`px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${activeTab === 'teachers'
                            ? 'bg-white text-[#045c84] shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        শিক্ষক
                    </button>
                    <button
                        onClick={() => setActiveTab('applications')}
                        className={`px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${activeTab === 'applications'
                            ? 'bg-white text-[#045c84] shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <span>আবেদনসমূহ</span>
                        <span className="bg-[#045c84]/10 text-[#045c84] px-2 py-0.5 rounded-lg text-[10px]">
                            {pendingCount || 0}
                        </span>
                    </button>
                </div>

                {selectedClassId !== 'all' && (
                    <div className="flex items-center gap-4 pl-4 border-l-4 border-slate-200 animate-fade-in w-full min-w-0">
                        <div className="relative flex items-center flex-1 min-w-0 group/scroll">
                            <ScrollableTabs
                                items={[
                                    { id: 'all', label: 'সকল গ্রুপ' },
                                    ...groups.map(g => ({ id: g.id, label: g.name })),
                                    ...(activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || (selectedClassId !== 'all' && canManageClass(selectedClassId)) ? [{ id: 'add-group', label: 'নতুন গ্রুপ' }] : [])
                                ]}
                                selectedId={selectedGroupId}
                                onSelect={(id) => {
                                    if (id !== 'add-group') setSelectedGroupId(id);
                                }}
                                className="flex-1"
                                renderItem={(item, isSelected) => {
                                    if (item.id === 'add-group') {
                                        return (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingGroup(null);
                                                    setGroupData({ name: '' });
                                                    setIsGroupModalOpen(true);
                                                }}
                                                className="flex items-center gap-2 px-5 py-2 rounded-2xl text-xs font-bold transition-all border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 text-slate-500 hover:text-[#045c84] hover:border-[#045c84] shrink-0 cursor-pointer active:scale-95"
                                            >
                                                <Plus size={14} />
                                                <span className="whitespace-nowrap">{item.label}</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className={`flex items-center gap-2 pl-5 pr-4 py-1.5 rounded-2xl text-xs font-bold transition-all border shrink-0 group/tab ${isSelected
                                            ? 'bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-900/10'
                                            : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50 hover:text-slate-800 hover:shadow-sm'
                                            }`}>
                                            <span className="whitespace-nowrap">{item.label}</span>
                                            {item.id !== 'all' && isSelected && (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || (selectedClassId !== 'all' && canManageClass(selectedClassId))) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const menuHeight = 100;
                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                        const showAbove = spaceBelow < menuHeight;

                                                        setMenuPosition({
                                                            top: showAbove
                                                                ? rect.top + window.scrollY - menuHeight - 8
                                                                : rect.bottom + window.scrollY + 8,
                                                            left: rect.left + window.scrollX
                                                        });
                                                        setIsActionMenuOpen(isActionMenuOpen === `group-${item.id}` ? null : `group-${item.id}`);
                                                    }}
                                                    className="p-1 rounded-lg transition-all ml-1 border-l pl-2 text-white/50 hover:bg-white/10 hover:text-white border-white/10"
                                                >
                                                    <MoreVertical size={14} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                            {selectedGroupId !== 'all' && (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || (selectedClassId !== 'all' && canManageClass(selectedClassId))) && (
                                <button
                                    onClick={() => {
                                        fetchAllStudentsInClass();
                                        setIsStudentSelectionModalOpen(true);
                                    }}
                                    className="ml-4 flex items-center gap-2 px-4 py-2 bg-[#045c84]/10 text-[#045c84] rounded-xl text-xs font-black hover:bg-[#045c84] hover:text-white transition-all shrink-0 active:scale-95"
                                >
                                    <UserPlus size={16} />
                                    <span>গ্রুপে শিক্ষার্থী যোগ করুন</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
                {activeTab === 'students' ? (
                    loading && students.length === 0 ? (
                        <div className="py-20 text-center">
                            <Loader2 className="animate-spin mx-auto text-[#045c84] mb-4" size={40} />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">শিক্ষার্থী লোড হচ্ছে...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400">
                            <Users className="mb-4 opacity-20" size={64} />
                            <span className="text-lg font-medium">
                                {activeTab === 'students' && selectedClassId === 'all' && !debouncedSearch 
                                    ? 'শিক্ষার্থী দেখতে একটি ক্লাস নির্বাচন করুন অথবা সার্চ করুন।' 
                                    : 'কোন শিক্ষার্থী পাওয়া যায়নি।'}
                            </span>
                        </div>
                    ) : (
                        <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-32">
                            {students
                                .filter(s => {
                                    // Local class and group filtering
                                    if (selectedClassId !== 'all' && s.metadata?.classId !== selectedClassId) return false;
                                    if (selectedGroupId !== 'all' && s.metadata?.groupId !== selectedGroupId) return false;

                                    if (activeRole === 'TEACHER') {
                                        if (allowedClasses.length > 0) {
                                            const studentClassId = s.metadata?.classId;
                                            return allowedClasses.some(c => c.id === studentClassId);
                                        }
                                        return false;
                                    }
                                    return true;
                                })
                                .map((s, index) => (
                                    <div
                                        key={s.id}
                                        onClick={() => {
                                            setSelectedStudent(s);
                                            setIsProfileModalOpen(true);
                                        }}
                                        className="bg-white p-3.5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all flex items-center gap-3 md:gap-4 relative group cursor-pointer animate-staggered-fade-in w-full min-w-[280px] overflow-hidden"
                                        style={{ animationDelay: `${(index % 15) * 30}ms` }}
                                    >
                                        {/* Avatar */}
                                        {(() => {
                                            const colors = ['bg-orange-500', 'bg-yellow-400', 'bg-teal-500', 'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];
                                            const colorIndex = s.name ? s.name.length % colors.length : 0;
                                            const bgColor = colors[colorIndex];

                                            const isOnline = s.updatedAt && (new Date().getTime() - new Date(s.updatedAt).getTime() < 5 * 60 * 1000);
                                            const status = s.metadata?.status || 'ACTIVE';
                                            const indicatorColor = isOnline ? 'bg-emerald-500' : (status === 'ACTIVE' ? 'bg-blue-500' : 'bg-red-500');

                                            return (
                                                <div className="relative shrink-0">
                                                    <div className={`w-12 h-12 rounded-full ${bgColor} border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform duration-300 relative`}>
                                                        {/* Initial Character Placeholder */}
                                                        <span className="absolute inset-0 flex items-center justify-center z-0">{s.name?.[0] || 'S'}</span>
                                                        
                                                        {/* Lazy Loaded Image */}
                                                        {s.metadata?.studentPhoto && (
                                                            <img 
                                                                src={s.metadata.studentPhoto} 
                                                                alt={s.name} 
                                                                loading="lazy"
                                                                className="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-500" 
                                                                onLoad={(e) => (e.target as HTMLImageElement).classList.remove('opacity-0')}
                                                            />
                                                        )}
                                                    </div>
                                                    {/* Status Dot */}
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${indicatorColor} ${isOnline ? 'animate-pulse' : ''}`} title={isOnline ? 'Online' : (status === 'ACTIVE' ? 'Active' : 'Inactive')} />
                                                </div>
                                            );
                                        })()}

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[18px] font-bold text-slate-800 truncate mb-1" title={s.name}>
                                                {s.name || 'নাম নেই'}
                                            </h3>

                                            {/* ID | Roll Tag */}
                                            <div className="flex-shrink-0 inline-flex items-center gap-1.5 px-1.5 py-0 bg-blue-50/50 border border-blue-100 rounded-full group/tag hover:bg-blue-50 transition-colors whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-[#045c84] text-[7px] font-medium uppercase tracking-wider">
                                                    <span>ID: {s.metadata?.studentId || '-'}</span>
                                                    <span className="opacity-30">|</span>
                                                    <span>Roll: {s.metadata?.rollNumber || '-'}</span>
                                                </div>
                                                <ChevronDown size={8} className="text-[#045c84] opacity-40 group-hover/tag:translate-y-0.5 transition-transform" />
                                            </div>
                                            {/* Fee Tier & History Badges */}
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {s.metadata?.statusHistory && s.metadata.statusHistory.length > 0 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedStudent(s);
                                                            setIsProfileModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100 hover:text-[#045c84] hover:border-blue-200 transition-all"
                                                        title="History"
                                                    >
                                                        <History size={12} />
                                                    </button>
                                                )}

                                                {s.metadata?.feeTier && s.metadata.feeTier !== 'full' && (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                                        s.metadata.feeTier === 'half' ? 'bg-amber-100 text-amber-700' :
                                                        s.metadata.feeTier === 'free' ? 'bg-emerald-100 text-emerald-700' : ''
                                                    }`}>
                                                        {s.metadata.feeTier === 'half' ? '৳ অর্ধ ফি' : '৳ বিনামূল্যে'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {(s.phone || s.metadata?.phone || s.metadata?.guardianPhone) && (
                                                <a
                                                    href={`tel:${s.phone || s.metadata?.phone || s.metadata?.guardianPhone}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    title="কল করুন"
                                                >
                                                    <Phone size={20} />
                                                </a>
                                            )}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const menuHeight = 280; // Estimated max height for student menu
                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                        const showAbove = spaceBelow < menuHeight;

                                                        setMenuPosition({
                                                            top: showAbove
                                                                ? rect.top + window.scrollY - menuHeight - 8
                                                                : rect.bottom + window.scrollY + 8,
                                                            left: rect.right + window.scrollX - 220
                                                        });
                                                        setIsActionMenuOpen(isActionMenuOpen === s.id ? null : s.id);
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-[#045c84] hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        {students.filter(s => {
                            // Local class and group filtering
                            if (selectedClassId !== 'all' && s.metadata?.classId !== selectedClassId) return false;
                            if (selectedGroupId !== 'all' && s.metadata?.groupId !== selectedGroupId) return false;

                            if (activeRole === 'TEACHER') {
                                if (allowedClasses.length > 0) {
                                    const studentClassId = s.metadata?.classId;
                                    return allowedClasses.some(c => c.id === studentClassId);
                                }
                                return false;
                            }
                            return true;
                        }).length > 0 && hasMore && (
                            <div className="flex justify-center mt-8 pb-10">
                                <button 
                                    onClick={() => fetchStudents(currentPage + 1)} 
                                    disabled={isLoadingMore}
                                    className="px-6 py-2.5 bg-blue-50 text-[#045c84] hover:bg-[#045c84] hover:text-white rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isLoadingMore ? (
                                        <><Loader2 className="animate-spin" size={18} /> লোড হচ্ছে...</>
                                    ) : (
                                        <>আরও লোড করুন <ChevronDown size={18} /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                    )
                ) : activeTab === 'books' ? (
                    <div className="relative">
                        {/* Book Controls */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-black text-slate-800">বইসমূহ</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{books.length}টি বই পাওয়া গেছে</p>
                            </div>

                            <div className="flex items-center gap-3">
                                {selectedClassId !== 'all' && (
                                    <button
                                        onClick={() => setIsGradingModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#045c84]/20 text-[#045c84] rounded-xl text-xs font-black hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <GraduationCap size={16} />
                                        <span>গ্রেডিং</span>
                                    </button>
                                )}

                                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                                    <button
                                        onClick={() => handleViewModeToggle('card')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${bookViewMode === 'card'
                                            ? 'bg-white text-[#045c84] shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        <LayoutList size={16} />
                                        <span>লিস্ট</span>
                                    </button>
                                    <button
                                        onClick={() => handleViewModeToggle('cover')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${bookViewMode === 'cover'
                                            ? 'bg-white text-[#045c84] shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        <LayoutGrid size={16} />
                                        <span>কভার</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {loading && books.length > 0 && (
                            <div className="absolute inset-x-0 -top-2 h-1 bg-slate-100 overflow-hidden rounded-full z-10">
                                <div className="h-full bg-[#045c84] animate-[shimmer_1.5s_infinite] w-1/3"></div>
                            </div>
                        )}

                        <div className={`grid gap-4 md:gap-6 pb-32 ${bookViewMode === 'card'
                            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                            }`}>
                            {books.filter(b => b && b.id).map((book, index) => (
                                <div key={book.id} className="animate-staggered-fade-in" style={{ animationDelay: `${(index % 15) * 30}ms` }}>
                                    <BookCard
                                        book={book}
                                        onDelete={handleBookDelete}
                                        onClick={(b) => {
                                            setSelectedBook(b);
                                            setIsBookDetailsModalOpen(true);
                                        }}
                                        onRead={(b) => {
                                            setSelectedBook(b);
                                            setIsReaderOpen(true);
                                        }}
                                        onMenuClick={(e, b) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const menuHeight = 160; // Estimated max height for book menu
                                            const spaceBelow = window.innerHeight - rect.bottom;
                                            const showAbove = spaceBelow < menuHeight;

                                            setMenuPosition({
                                                top: showAbove
                                                    ? rect.top + window.scrollY - menuHeight - 8
                                                    : rect.bottom + window.scrollY + 8,
                                                left: rect.right + window.scrollX - 220
                                            });
                                            setIsActionMenuOpen(isActionMenuOpen === b.id ? null : b.id);
                                        }}
                                        isAdmin={activeRole === 'ADMIN'}
                                        viewMode={bookViewMode}
                                    />
                                </div>
                            ))}
                            {books.length === 0 && !loading && (
                                <div className="col-span-full py-12 text-center text-slate-400">
                                    <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>কোনো বই পাওয়া যায়নি</p>
                                </div>
                            )}
                            {books.length === 0 && loading && (
                                <div className="col-span-full py-20 text-center">
                                    <Loader2 className="animate-spin mx-auto text-[#045c84] mb-4" size={40} />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">বই লোড হচ্ছে...</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'teachers' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(() => {
                            const filteredTeachers = teachers.filter((t: any) => {
                                const matchesClass = selectedClassId === 'all' ||
                                    t.assignedClassIds?.includes(selectedClassId) ||
                                    t.permissions?.classWise?.[selectedClassId];
                                return matchesClass;
                            });

                            return filteredTeachers.length > 0 ? (
                                filteredTeachers.map((teacher: any, index: number) => (
                                    <div key={teacher.id} className="animate-staggered-fade-in" style={{ animationDelay: `${(index % 15) * 30}ms` }}>
                                        <TeacherCard
                                            teacher={teacher}
                                            currentUser={currentUser}
                                            classes={classes}
                                            onCardClick={(t: any) => setPermissionModalData(t)}
                                            canManage={isOwner}
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center text-slate-400">
                                    <Users size={48} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">কোনো শিক্ষক পাওয়া যায়নি</p>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-32">
                            {students.slice(0, visibleCount).map((s, index) => (
                                <div
                                    key={s.id}
                                    onClick={() => {
                                        if (!canManageClass(s.metadata?.classId)) {
                                            setToast({ message: 'আপনার এই ক্লাসের আবেদন ম্যানেজ করার অনুমতি নেই।', type: 'error' });
                                            return;
                                        }
                                        setEditingStudent(s);
                                        setFormData({
                                            name: s.name || '',
                                            email: s.email || '',
                                            password: s.password || '',
                                            faceDescriptor: s.faceDescriptor || [],
                                            metadata: s.metadata || {}
                                        });
                                        setIsAddModalOpen(true);
                                    }}
                                    className="bg-white p-3.5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all flex items-center gap-3 md:gap-4 relative group cursor-pointer animate-staggered-fade-in w-full min-w-[280px]"
                                    style={{ animationDelay: `${(index % 15) * 30}ms` }}
                                >
                                    {(() => {
                                        const colors = ['bg-orange-500', 'bg-yellow-400', 'bg-teal-500', 'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];
                                        const colorIndex = s.name ? s.name.length % colors.length : 0;
                                        const bgColor = colors[colorIndex];

                                        const isOnline = s.updatedAt && (new Date().getTime() - new Date(s.updatedAt).getTime() < 5 * 60 * 1000);
                                        const status = s.metadata?.status || 'ACTIVE';
                                        const indicatorColor = isOnline ? 'bg-emerald-500' : (status === 'ACTIVE' ? 'bg-blue-500' : 'bg-rose-500');

                                        return (
                                            <div className="relative shrink-0">
                                                <div className={`w-12 h-12 rounded-full ${bgColor} border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform duration-300`}>
                                                    {s.metadata?.studentPhoto ? (
                                                        <img
                                                            src={s.metadata.studentPhoto}
                                                            alt={s.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                const parent = target.parentElement;
                                                                if (parent) parent.innerText = s.name?.[0] || 'S';
                                                            }}
                                                        />
                                                    ) : (
                                                        s.name?.[0] || 'S'
                                                    )}
                                                </div>
                                                {/* Status Dot */}
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${indicatorColor} ${isOnline ? 'animate-pulse' : ''}`} />
                                            </div>
                                        );
                                    })()}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[18px] font-bold text-slate-800 truncate mb-1" title={s.name}>
                                            {s.name || 'নাম নেই'}
                                        </h3>

                                        {/* ID | Roll Tag */}
                                        <div className="flex-shrink-0 inline-flex items-center gap-1.5 px-1.5 py-0 bg-blue-50/50 border border-blue-100 rounded-full group/tag hover:bg-blue-50 transition-colors whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-[#045c84] text-[7px] font-medium uppercase tracking-wider">
                                                <span>ID: {s.metadata?.studentId || '-'}</span>
                                                <span className="opacity-30">|</span>
                                                <span>Roll: {s.metadata?.rollNumber || '-'}</span>
                                            </div>
                                            <ChevronDown size={8} className="text-[#045c84] opacity-40 group-hover/tag:translate-y-0.5 transition-transform" />
                                        </div>
                                    </div>

                                    {/* Actions for Applications */}
                                    <div className="flex items-center gap-1 shrink-0 pr-2">
                                        {(s.phone || s.metadata?.phone || s.metadata?.guardianPhone) && (
                                            <a
                                                href={`tel:${s.phone || s.metadata?.phone || s.metadata?.guardianPhone}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all mr-1"
                                                title="কল করুন"
                                            >
                                                <Phone size={18} />
                                            </a>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStatusUpdate(s.id, 'APPROVED');
                                            }}
                                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                            title="মঞ্জুর করুন"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStatusUpdate(s.id, 'REJECTED');
                                            }}
                                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            title="বাতিল করুন"
                                        >
                                            <FileX size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {students.length > visibleCount && (
                            <div className="flex justify-center mt-8 pb-10">
                                <button onClick={() => setVisibleCount(v => v + 50)} className="px-6 py-2.5 bg-blue-50 text-[#045c84] hover:bg-[#045c84] hover:text-white rounded-xl font-bold transition-all flex items-center gap-2">
                                    আরও লোড করুন <ChevronDown size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                )
                }
            </div>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingStudent(null);
                    setFormData({ name: '', email: '', password: '', metadata: {} });
                    setActiveFormTab('profile');
                }}
                title={editingStudent ? "শিক্ষার্থীর তথ্য আপডেট করুন" : "নতুন শিক্ষার্থী যুক্ত করুন"}
                maxWidth="max-w-3xl"
            >
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                    <button
                        onClick={() => setActiveFormTab('profile')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeFormTab === 'profile'
                            ? 'border-[#045c84] text-[#045c84] bg-white'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        প্রোফাইল তথ্য (Profile)
                    </button>
                    <button
                        onClick={() => setActiveFormTab('account')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeFormTab === 'account'
                            ? 'border-[#045c84] text-[#045c84] bg-white'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        অ্যাকাউন্ট সেটআপ (Account)
                    </button>
                </div>
                <form onSubmit={handleFormSubmit} className="p-5 md:p-8 space-y-6">
                    {/* Quick Action Toolbar */}
                    {activeFormTab === 'profile' && !editingStudent && (
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                            {activeInstitute?.id && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const link = `${window.location.origin}/admission/${activeInstitute.id}`;
                                        if (navigator.clipboard) {
                                            navigator.clipboard.writeText(link).then(() => {
                                                setToast({ message: 'ভর্তি ফরমের লিঙ্ক কপি হয়েছে!', type: 'success' });
                                            }).catch(err => {
                                                console.error('Failed to copy text: ', err);
                                                setToast({ message: 'কপি করতে সমস্যা হয়েছে!', type: 'error' });
                                            });
                                        } else {
                                            const textArea = document.createElement("textarea");
                                            textArea.value = link;
                                            document.body.appendChild(textArea);
                                            textArea.focus();
                                            textArea.select();
                                            try {
                                                document.execCommand('copy');
                                                setToast({ message: 'ভর্তি ফরমের লিঙ্ক কপি হয়েছে!', type: 'success' });
                                            } catch (err) {
                                                console.error('Fallback: Oops, unable to copy', err);
                                                setToast({ message: 'কপি করতে সমস্যা হয়েছে!', type: 'error' });
                                            }
                                            document.body.removeChild(textArea);
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-extrabold bg-blue-50 text-[#034a6b] hover:bg-blue-100 transition-all"
                                    title="ভর্তি ফরমের লিঙ্ক কপি করুন"
                                >
                                    <ClipboardList size={18} />
                                    <span>অনলাইন ভর্তি</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isExcelMode) {
                                        setExcelData([]);
                                        setColumnMappings({});
                                    }
                                    setIsExcelMode(!isExcelMode);
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-extrabold transition-all ${isExcelMode
                                    ? 'bg-slate-200 text-slate-800'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                title={isExcelMode ? "ফর্ম মোড" : "Excel থেকে ডাটা ইম্পোর্ট করুন"}
                            >
                                <FileSpreadsheet size={18} />
                                <span>ডাটাবেজ ভর্তি</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsLibraryOpen(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-extrabold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                                title="ফিল্ড লাইব্রেরি থেকে ফিল্ড যোগ/মুছুন"
                            >
                                <Library size={18} />
                                <span>তথ্য ফিল্ড</span>
                            </button>
                        </div>
                    )}
                    {editingStudent?.metadata?.admissionStatus === 'PENDING' && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 animate-pulse">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-black text-amber-800 uppercase tracking-widest">আবেদনটি রিভিউ করা হচ্ছে</p>
                                <p className="text-[10px] text-amber-600 font-bold">'মঞ্জুর ও নিশ্চিত করুন' বাটনে ক্লিক করলে ভর্তির তথ্য আপডেট হবে এবং স্ট্যাটাস Approved হয়ে যাবে।</p>
                            </div>
                        </div>
                    )}
                    {isExcelMode ? (
                        /* Excel Paste Mode */
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black text-emerald-900 flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                        আবশ্যকীয় কলামসমূহ (Required Columns)
                                    </h4>
                                    <p className="text-xs font-bold text-emerald-700/80">
                                        অবশ্যই থাকতে হবে: <span className="text-emerald-900">শিক্ষার্থীর নাম</span>
                                        {!formData.skipAccountSetup && <span>, এবং <span className="text-emerald-900">মোবাইল বা ইমেইল</span></span>}
                                    </p>
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer group bg-white/50 px-3 py-2 rounded-xl">
                                    <span className="text-xs font-black text-slate-600 group-hover:text-amber-600 transition-colors">লগইন অ্যাকাউন্ট স্কিপ করুন</span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={!!formData.skipAccountSetup}
                                            onChange={(e) => setFormData({ ...formData, skipAccountSetup: e.target.checked })}
                                        />
                                        <div className={`w-10 h-5 rounded-full transition-colors ${formData.skipAccountSetup ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${formData.skipAccountSetup ? 'translate-x-5' : ''}`} />
                                    </div>
                                </label>
                            </div>

                            {/* Class and Group Dropdowns for Bulk import */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider"><span className="text-rose-500 mr-1">*</span>শ্রেণী নির্বাচন করুন (সবার জন্য)</label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-bold text-slate-900 appearance-none"
                                            value={bulkClassId}
                                            onChange={(e) => {
                                                const classId = e.target.value;
                                                setBulkClassId(classId);
                                                setBulkGroupId('');
                                                if (classId) {
                                                    fetchGroups(classId).then(res => {
                                                        // Update bulk groups state correctly as fetchGroups updates 'groups' state
                                                        // To not affect the main form's group list, we should fetch manually or use the already fetched classes since we need independent state
                                                    });
                                                    // We can just fetch it again safely for bulk
                                                    fetch(`/api/admin/groups?classId=${classId}`)
                                                        .then(res => res.json())
                                                        .then(data => setBulkGroups(Array.isArray(data) ? data : []));
                                                } else {
                                                    setBulkGroups([]);
                                                }
                                            }}
                                            required
                                        >
                                            <option value="">শ্রেণী নির্বাচন করুন</option>
                                            {classes.filter(c => canManageClass(c.id)).map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">গ্রুপ (ঐচ্ছিক)</label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-bold text-slate-900 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            value={bulkGroupId}
                                            onChange={(e) => setBulkGroupId(e.target.value)}
                                            disabled={!bulkClassId || bulkGroups.length === 0}
                                        >
                                            <option value="">গ্রুপ নির্বাচন করুন</option>
                                            {bulkGroups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-black text-slate-900">
                                    Excel থেকে ডাটা Paste করুন
                                </label>
                                <textarea
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-4 focus:ring-[#045c84]/10 focus:border-[#045c84] resize-none font-mono text-sm text-slate-900 placeholder:text-slate-300"
                                    rows={8}
                                    placeholder="Excel থেকে কপি করে এখানে Paste করুন (Ctrl+V)..."
                                    onPaste={(e) => {
                                        const pastedText = e.clipboardData.getData('text');
                                        const rows = pastedText.trim().split('\n').map(row =>
                                            row.split('\t').map(cell => cell.trim())
                                        );
                                        setExcelData(rows);
                                    }}
                                />
                            </div>

                            {excelData.length > 0 && (
                                <>
                                    <div className="text-sm text-slate-900 font-bold">
                                        {excelData.length} সারি পাওয়া গেছে
                                    </div>

                                    {/* Table Preview with Column Mapping */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden relative">
                                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-sm">
                                                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                                    <tr>
                                                        {!Object.values(columnMappings).includes('studentId') && (
                                                            <th className="px-3 py-2 text-left border-b border-slate-200 bg-emerald-50/80 text-emerald-800 font-black whitespace-nowrap">
                                                                স্টুডেন্ট আইডি (Auto)
                                                            </th>
                                                        )}
                                                        {!Object.values(columnMappings).includes('rollNumber') && (
                                                            <th className="px-3 py-2 text-left border-b border-slate-200 bg-emerald-50/80 text-emerald-800 font-black whitespace-nowrap">
                                                                রোল (Auto)
                                                            </th>
                                                        )}
                                                        {Object.entries(columnMappings).some(([_, fId]) => fId === 'studentPhone' || fId === 'phone') && (
                                                            <>
                                                                <th className="px-3 py-2 text-left border-b border-slate-200 bg-blue-50/80 text-blue-800 font-black whitespace-nowrap">
                                                                    Login ID (Auto)
                                                                </th>
                                                                <th className="px-3 py-2 text-left border-b border-slate-200 bg-blue-50/80 text-blue-800 font-black whitespace-nowrap">
                                                                    Password (Auto)
                                                                </th>
                                                            </>
                                                        )}
                                                        {excelData[0]?.map((_, colIndex) => (
                                                            <th key={colIndex} className="px-3 py-2 text-left border-b border-slate-200 bg-slate-50">
                                                                <select
                                                                    value={columnMappings[colIndex] || ''}
                                                                    onChange={(e) => setColumnMappings({
                                                                        ...columnMappings,
                                                                        [colIndex]: e.target.value
                                                                    })}
                                                                    className="w-full px-2 py-1 text-xs font-black bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-[#045c84] focus:border-[#045c84]"
                                                                >
                                                                    <option value="">ফিল্ড নির্বাচন করুন</option>
                                                                    {formConfig.filter(f => !['classId', 'groupId'].includes(f.id)).map(field => (
                                                                        <option key={field.id} value={field.id}>
                                                                            {field.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {excelData.map((row, rowIndex) => (
                                                        <tr key={rowIndex} className="hover:bg-slate-50">
                                                            {!Object.values(columnMappings).includes('studentId') && (
                                                                <td className="px-3 py-2 border-b border-slate-100 text-emerald-700 font-bold whitespace-nowrap bg-emerald-50/30">
                                                                    {previewIds[rowIndex]?.studentId || '-'}
                                                                </td>
                                                            )}
                                                            {!Object.values(columnMappings).includes('rollNumber') && (
                                                                <td className="px-3 py-2 border-b border-slate-100 text-emerald-700 font-bold whitespace-nowrap bg-emerald-50/30">
                                                                    {previewIds[rowIndex]?.rollNumber || '-'}
                                                                </td>
                                                            )}
                                                            {(() => {
                                                                const phoneEntry = Object.entries(columnMappings).find(([_, fId]) => fId === 'studentPhone' || fId === 'phone');
                                                                if (phoneEntry) {
                                                                    const pIdx = parseInt(phoneEntry[0]);
                                                                    const phoneVal = row[pIdx];
                                                                    return (
                                                                        <>
                                                                            <td className="px-3 py-2 border-b border-slate-100 text-blue-700 font-bold whitespace-nowrap bg-blue-50/30">
                                                                                {phoneVal || '-'}
                                                                            </td>
                                                                            <td className="px-3 py-2 border-b border-slate-100 text-blue-700 font-bold whitespace-nowrap bg-blue-50/30">
                                                                                {phoneVal && phoneVal.length >= 4 ? phoneVal.slice(-4) : '-'}
                                                                            </td>
                                                                        </>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={cellIndex} className="px-3 py-2 border-b border-slate-100 text-slate-900 font-medium">
                                                                    {cell || '-'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!activeInstitute?.id) {
                                                setToast({ message: 'সক্রিয় প্রতিষ্ঠান পাওয়া যায়নি।', type: 'error' });
                                                return;
                                            }

                                            if (!bulkClassId) {
                                                setToast({ message: 'অনুগ্রহ করে শ্রেণী নির্বাচন করুন।', type: 'error' });
                                                return;
                                            }

                                            setActionLoading(true);
                                            setImportFails([]);

                                            try {
                                                let successCount = 0;
                                                const fails: any[] = [];

                                                // Pre-fetch starting IDs for auto-generation
                                                const idClassMap: { [key: string]: { nextStudentId: string, nextRollNumber: number } } = {};

                                                // Function to get/increment next IDs
                                                const getNextIds = async (classId: string) => {
                                                    if (idClassMap[classId]) {
                                                        const current = idClassMap[classId];
                                                        // Simple increment for demo - ideally the API should handle a batch of IDs
                                                        // But since we are doing sequential, we can just increment locally for this session
                                                        const nextId = (parseInt(current.nextStudentId.replace(/\D/g, '')) + 1).toString().padStart(current.nextStudentId.length, '0');
                                                        idClassMap[classId] = {
                                                            nextStudentId: current.nextStudentId.startsWith('S') ? 'S' + nextId : nextId,
                                                            nextRollNumber: current.nextRollNumber + 1
                                                        };
                                                        return current;
                                                    }
                                                    const res = await fetch(`/api/admin/students/next-ids?instituteId=${activeInstitute.id}&classId=${classId}`);
                                                    const data = await res.json();
                                                    idClassMap[classId] = {
                                                        nextStudentId: data.nextStudentId,
                                                        nextRollNumber: data.nextRollNumber
                                                    };
                                                    return data;
                                                };

                                                for (let rowIndex = 0; rowIndex < excelData.length; rowIndex++) {
                                                    const row = excelData[rowIndex];
                                                    const studentData: any = {
                                                        role: 'STUDENT',
                                                        instituteIds: [activeInstitute.id],
                                                        metadata: {
                                                            classId: bulkClassId,
                                                            groupId: bulkGroupId || undefined,
                                                            admissionStatus: 'APPROVED'
                                                        }
                                                    };

                                                    // Map columns to fields
                                                    Object.entries(columnMappings).forEach(([colIndex, fieldId]) => {
                                                        const value = row[parseInt(colIndex)];
                                                        if (value) {
                                                            if (['name', 'email', 'password', 'phone'].includes(fieldId)) {
                                                                studentData[fieldId] = value;
                                                            } else {
                                                                studentData.metadata[fieldId] = value;
                                                            }
                                                        }
                                                    });

                                                    // Auto-sync studentPhone to phone for login if phone is empty
                                                    if (studentData.metadata.studentPhone && !studentData.phone) {
                                                        studentData.phone = studentData.metadata.studentPhone;
                                                    }

                                                    // Auto-generate password from phone if not provided and not skipping account
                                                    const currentPhone = studentData.phone || studentData.metadata.studentPhone;
                                                    if (currentPhone && !studentData.password && !formData.skipAccountSetup) {
                                                        if (currentPhone.length >= 4) {
                                                            studentData.password = currentPhone.slice(-4);
                                                        }
                                                    }

                                                    if (formData.skipAccountSetup) {
                                                        studentData.skipAccountSetup = true;
                                                        studentData.metadata.skipAccountSetup = true;
                                                        if (!studentData.password) {
                                                            studentData.password = Math.random().toString(36).slice(-10); // Random password to satisfy DB
                                                        }
                                                    }

                                                    const studentName = studentData.name || 'Unknown';

                                                    // 1. Validation: Name is mandatory
                                                    if (!studentData.name) {
                                                        fails.push({ name: studentName, reason: "নাম দেওয়া হয়নি" });
                                                        continue;
                                                    }

                                                    // 2. Validation: Identify missing core fields
                                                    const hasPhone = !!studentData.phone || !!studentData.metadata.studentPhone;
                                                    const hasEmail = !!studentData.email;
                                                    const hasGuardian = !!studentData.metadata.guardianPhone;
                                                    const skipLogin = !!studentData.skipAccountSetup;

                                                    if (!skipLogin && !hasPhone && !hasEmail && !hasGuardian) {
                                                        fails.push({ name: studentName, reason: "লগইন করার জন্য মোবাইল, ইমেইল বা অভিভাবকের মোবাইল নম্বর দিন" });
                                                        continue;
                                                    }

                                                    // 3. Set default password if missing
                                                    if (!studentData.password) {
                                                        studentData.password = '123456'; // Default password
                                                    }

                                                    // 4. Use pre-calculated IDs from preview (or fall back to API)
                                                    const previewId = previewIds[rowIndex];
                                                    if (previewId) {
                                                        if (!studentData.metadata.studentId) studentData.metadata.studentId = previewId.studentId;
                                                        if (!studentData.metadata.rollNumber) studentData.metadata.rollNumber = previewId.rollNumber;
                                                    } else {
                                                        // Fallback: re-fetch from API if preview IDs aren't available
                                                        const ids = await getNextIds(bulkClassId);
                                                        if (!studentData.metadata.studentId) studentData.metadata.studentId = ids.nextStudentId;
                                                        if (!studentData.metadata.rollNumber) studentData.metadata.rollNumber = ids.nextRollNumber;
                                                    }

                                                    // 4. Deduplication Check
                                                    const isDuplicateId = students.some(s => s.metadata?.studentId === studentData.metadata.studentId);
                                                    const isDuplicateRoll = bulkClassId && students.some(s => s.metadata?.classId === bulkClassId && s.metadata?.rollNumber == studentData.metadata.rollNumber);

                                                    if (isDuplicateId) {
                                                        fails.push({ name: studentName, reason: `ID (${studentData.metadata.studentId}) ইতিমধ্যে আছে`, data: row });
                                                        continue;
                                                    }
                                                    if (isDuplicateRoll) {
                                                        fails.push({ name: studentName, reason: `রোল (${studentData.metadata.rollNumber}) এই শ্রেণীতে ইতিমধ্যে আছে`, data: row });
                                                        continue;
                                                    }

                                                    try {
                                                        const res = await fetch('/api/admin/users', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify(studentData)
                                                        });

                                                        if (res.ok) {
                                                            successCount++;
                                                        } else {
                                                            let errorData;
                                                            try {
                                                                errorData = await res.json();
                                                            } catch (e) {
                                                                errorData = { message: `HTTP Error ${res.status}` };
                                                            }
                                                            fails.push({
                                                                name: studentName,
                                                                reason: errorData.message || `সার্ভার ত্রুটি (${res.status})`,
                                                                data: row
                                                            });
                                                        }
                                                    } catch (err) {
                                                        console.error('Bulk save fetch error:', err);
                                                        fails.push({ name: studentName, reason: 'সার্ভারে সংযোগ করতে সমস্যা হয়েছে', data: row });
                                                    }
                                                }

                                                setImportFails(fails);

                                                if (fails.length > 0) {
                                                    setIsImportSummaryOpen(true);
                                                    setToast({
                                                        message: `${successCount} জন যুক্ত হয়েছে, ${fails.length} জন ব্যর্থ হয়েছে।`,
                                                        type: successCount > 0 ? 'success' : 'error'
                                                    });
                                                } else {
                                                    setToast({
                                                        message: `${successCount} জন শিক্ষার্থী সফলভাবে যুক্ত হয়েছে।`,
                                                        type: 'success'
                                                    });
                                                    setIsExcelMode(false);
                                                    setIsAddModalOpen(false);
                                                    setExcelData([]);
                                                    setColumnMappings({});
                                                }

                                                if (successCount > 0) {
                                                    fetchStudents();
                                                }
                                            } catch (error) {
                                                setToast({ message: 'Import ব্যর্থ হয়েছে।', type: 'error' });
                                            } finally {
                                                setActionLoading(false);
                                            }
                                        }}
                                        disabled={actionLoading || Object.keys(columnMappings).length === 0}
                                        className="w-full py-3 bg-[#045c84] text-white rounded-xl font-bold hover:bg-[#034a6b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {actionLoading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                <span>Import হচ্ছে...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CloudUpload size={20} />
                                                <span>{excelData.length} জন শিক্ষার্থী Import করুন</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        /* Regular Form Mode */
                        <>
                            <div className="space-y-4">
                                {(() => {
                                    const LOGIN_FIELD_IDS = ['classId', 'groupId', 'studentId', 'rollNumber', 'email', 'password', 'studentPhone', 'guardianPhone', 'guardianPassword', 'guardianName', 'guardianRelation'];
                                    const alwaysShowFields = ['studentId', 'rollNumber'];
                                    const effectiveFields = (editingStudent
                                        ? [
                                            ...formConfig,
                                            ...POSSIBLE_FIELDS.filter(f =>
                                                !formConfig.some(cf => cf.id === f.id) &&
                                                (
                                                    (formData.metadata[f.id] !== undefined && formData.metadata[f.id] !== '') ||
                                                    alwaysShowFields.includes(f.id)
                                                ) &&
                                                f.id !== 'password'
                                            )
                                        ]
                                        : formConfig).filter(f => !LOGIN_FIELD_IDS.includes(f.id) && f.id !== 'name');

                                    const renderField = (fieldId: string, forceRequired?: boolean) => {
                                        const field = POSSIBLE_FIELDS.find(f => f.id === fieldId);
                                        if (!field) return null;

                                        const isTopLevel = ['name', 'email', 'password', 'phone'].includes(field.id);
                                        const fieldValue = isTopLevel ? (formData as any)[field.id] : formData.metadata[field.id];
                                        const isRequired = forceRequired || field.required;

                                        const isEmailField = field.id === 'email';
                                        const isStudentPhoneField = field.id === 'studentPhone';
                                        const isGuardianPhoneField = field.id === 'guardianPhone';
                                        const isLoginField = isEmailField || isStudentPhoneField || isGuardianPhoneField;

                                        const hasGuardian = !!formData.metadata?.guardianPhone;
                                        const hasEmail = !!(formData.email || formData.metadata?.email);
                                        const hasStudentPhone = !!(formData.metadata?.studentPhone || formData.phone);

                                        const isOptionalLogin =
                                            (isEmailField && (hasGuardian || hasStudentPhone)) ||
                                            (isStudentPhoneField && (hasGuardian || hasEmail));


                                        return (
                                            <div key={field.id} className="space-y-2 group/field">
                                                {!formConfig.some(cf => cf.id === field.id) && !LOGIN_FIELD_IDS.includes(field.id) && field.id !== 'name' && field.id !== 'phone' && (
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded uppercase tracking-wider border border-amber-200 italic">
                                                            Config Missing
                                                        </span>
                                                        <span className="text-[10px] text-slate-600 font-bold">This field is not in current form config but is used for account</span>
                                                    </div>
                                                )}

                                                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex justify-between">
                                                    <span>{field.label} {(isRequired || (isLoginField && !isOptionalLogin)) && <span className="text-red-600 font-black">*</span>}</span>
                                                    {isOptionalLogin && (
                                                        <span className="text-[10px] font-medium text-slate-400 font-sans ml-auto bg-slate-100 px-1.5 py-0.5 rounded uppercase">ঐচ্ছিক</span>
                                                    )}
                                                    {field.id === 'password' && !editingStudent && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const sPhone = formData.metadata?.studentPhone || formData.phone;
                                                                if (sPhone && sPhone.length >= 4) {
                                                                    const last4 = sPhone.slice(-4);
                                                                    setFormData({ ...formData, password: last4 });
                                                                } else {
                                                                    setToast({ message: 'শিক্ষার্থীর মোবাইল নম্বর (কমপক্ষে ৪ ডিজিট) দিন।', type: 'error' });
                                                                }
                                                            }}
                                                            className="text-[10px] text-[#045c84] hover:underline"
                                                        >
                                                            জেনারেট করুন
                                                        </button>
                                                    )}
                                                </label>

                                                {field.type === 'select' ? (
                                                    <div className="relative">
                                                        <select
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-bold text-slate-900 appearance-none"
                                                            value={fieldValue || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (isTopLevel) setFormData({ ...formData, [field!.id]: val });
                                                                else setFormData({ ...formData, metadata: { ...formData.metadata, [field!.id]: val } });
                                                            }}
                                                            required={isRequired && !isOptionalLogin}
                                                        >
                                                            <option value="">নির্বাচন করুন</option>
                                                            {field.options?.map((opt: string) => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <ChevronDown size={18} />
                                                        </div>
                                                    </div>
                                                ) : field.type === 'attachment' ? (
                                                    field.id === 'studentPhoto' ? (
                                                        <div className="space-y-4 w-full">
                                                            <div className="grid grid-cols-3 gap-4">
                                                                {/* Left Face Photo Box */}
                                                                {(() => {
                                                                    const subFieldId = 'studentPhotoLeft';
                                                                    const subFieldValue = formData.metadata[subFieldId];
                                                                    const isProcessing = processingFieldId === subFieldId;
                                                                    return (
                                                                        <div className="relative group/attachment flex flex-col items-center gap-1.5 w-full">
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">বাম পাশ (Left)</span>
                                                                            <div className={`relative w-full aspect-[2/3] max-w-[120px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[20px] overflow-hidden transition-all duration-500 ${subFieldValue ? 'border-none ring-2 ring-[#045c84]/10 shadow-lg' : 'hover:border-[#045c84] hover:bg-slate-100/50'}`}>
                                                                                <input
                                                                                    type="file"
                                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                                                    onChange={(e) => handleFileUpload(e, subFieldId)}
                                                                                />
                                                                                {subFieldValue ? (
                                                                                    <div className="absolute inset-0 w-full h-full">
                                                                                        <img src={subFieldValue} alt="Left Profile" className="w-full h-full object-cover group-hover/attachment:scale-105 transition-transform" />
                                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/attachment:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[1px]">
                                                                                            <CloudUpload size={16} className="text-white mb-1" />
                                                                                            <span className="text-white text-[8px] font-black uppercase tracking-wider text-center">পরিবর্তন</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-slate-50/50">
                                                                                        <CloudUpload size={18} className="text-slate-400 group-hover/attachment:text-[#045c84] transition-colors" />
                                                                                    </div>
                                                                                )}
                                                                                {isProcessing && (
                                                                                    <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
                                                                                        <div className="w-5 h-5 rounded-full border border-[#045c84] border-t-transparent animate-spin" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {/* Middle Face Photo Box (Required) */}
                                                                {(() => {
                                                                    const subFieldId = 'studentPhoto';
                                                                    const subFieldValue = formData.metadata[subFieldId];
                                                                    const isProcessing = processingFieldId === subFieldId;
                                                                    return (
                                                                        <div className="relative group/attachment flex flex-col items-center gap-1.5 w-full">
                                                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-0.5">
                                                                                সামনে (Middle) <span className="text-red-500 font-bold">*</span>
                                                                            </span>
                                                                            <div className={`relative w-full aspect-[2/3] max-w-[120px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[20px] overflow-hidden transition-all duration-500 ${subFieldValue ? 'border-none ring-2 ring-[#045c84]/10 shadow-lg' : 'hover:border-[#045c84] hover:bg-slate-100/50'}`}>
                                                                                <input
                                                                                    type="file"
                                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                                                    onChange={(e) => handleFileUpload(e, subFieldId)}
                                                                                    required={isRequired && !subFieldValue && !isOptionalLogin}
                                                                                />
                                                                                {subFieldValue ? (
                                                                                    <div className="absolute inset-0 w-full h-full">
                                                                                        <img src={subFieldValue} alt="Front Profile" className="w-full h-full object-cover group-hover/attachment:scale-105 transition-transform" />
                                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/attachment:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[1px]">
                                                                                            <CloudUpload size={16} className="text-white mb-1" />
                                                                                            <span className="text-white text-[8px] font-black uppercase tracking-wider text-center">পরিবর্তন</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-slate-50/50">
                                                                                        <CloudUpload size={18} className="text-[#045c84] group-hover/attachment:scale-105 transition-all" />
                                                                                    </div>
                                                                                )}
                                                                                {isProcessing && (
                                                                                    <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
                                                                                        <div className="w-5 h-5 rounded-full border border-[#045c84] border-t-transparent animate-spin" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {/* Right Face Photo Box */}
                                                                {(() => {
                                                                    const subFieldId = 'studentPhotoRight';
                                                                    const subFieldValue = formData.metadata[subFieldId];
                                                                    const isProcessing = processingFieldId === subFieldId;
                                                                    return (
                                                                        <div className="relative group/attachment flex flex-col items-center gap-1.5 w-full">
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">ডান পাশ (Right)</span>
                                                                            <div className={`relative w-full aspect-[2/3] max-w-[120px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[20px] overflow-hidden transition-all duration-500 ${subFieldValue ? 'border-none ring-2 ring-[#045c84]/10 shadow-lg' : 'hover:border-[#045c84] hover:bg-slate-100/50'}`}>
                                                                                <input
                                                                                    type="file"
                                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                                                    onChange={(e) => handleFileUpload(e, subFieldId)}
                                                                                />
                                                                                {subFieldValue ? (
                                                                                    <div className="absolute inset-0 w-full h-full">
                                                                                        <img src={subFieldValue} alt="Right Profile" className="w-full h-full object-cover group-hover/attachment:scale-105 transition-transform" />
                                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/attachment:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[1px]">
                                                                                            <CloudUpload size={16} className="text-white mb-1" />
                                                                                            <span className="text-white text-[8px] font-black uppercase tracking-wider text-center">পরিবর্তন</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-slate-50/50">
                                                                                        <CloudUpload size={18} className="text-slate-400 group-hover/attachment:text-[#045c84] transition-colors" />
                                                                                    </div>
                                                                                )}
                                                                                {isProcessing && (
                                                                                    <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
                                                                                        <div className="w-5 h-5 rounded-full border border-[#045c84] border-t-transparent animate-spin" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="relative group/attachment">
                                                            <div className={`relative w-[120px] h-[180px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[20px] overflow-hidden transition-all duration-500 ${fieldValue ? 'border-none ring-2 ring-[#045c84]/10 shadow-lg' : 'hover:border-[#045c84] hover:bg-slate-100/50'}`}>
                                                                <input
                                                                    type="file"
                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                                    onChange={(e) => handleFileUpload(e, field!.id)}
                                                                    required={isRequired && !fieldValue && !isOptionalLogin}
                                                                />

                                                                {fieldValue ? (
                                                                    <div className="absolute inset-0 w-full h-full">
                                                                        <img
                                                                            src={fieldValue}
                                                                            alt="Preview"
                                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/attachment:scale-110"
                                                                            onError={(e) => {
                                                                                (e.target as any).style.display = 'none';
                                                                            }}
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/attachment:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[1px]">
                                                                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-2">
                                                                                <CloudUpload size={20} />
                                                                            </div>
                                                                            <span className="text-white text-[10px] font-black uppercase tracking-widest text-center px-4">ছবি পরিবর্তন করুন</span>
                                                                        </div>
                                                                        <div className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-green-600">
                                                                            <CheckCircle2 size={16} />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-slate-50/50">
                                                                        <div className="w-12 h-12 rounded-[16px] bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover/attachment:text-[#045c84] group-hover/attachment:scale-110 transition-all duration-500">
                                                                            <CloudUpload size={24} />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[10px] font-black text-slate-700 leading-tight">{field.label}</p>
                                                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic font-black">Photo Box</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                ) : field.type === 'class-lookup' ? (
                                                    <div className="relative">
                                                        <select
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-bold text-slate-900 appearance-none"
                                                            value={fieldValue || ''}
                                                            onChange={(e) => {
                                                                const classId = e.target.value;
                                                                setFormData({
                                                                    ...formData,
                                                                    metadata: { ...formData.metadata, [field!.id]: classId, groupId: '' }
                                                                });
                                                                if (classId) {
                                                                    fetchGroups(classId);
                                                                    handleAutoGenerate('rollNumber', classId, true);
                                                                } else setGroups([]);
                                                            }}
                                                            required={isRequired}
                                                        >
                                                            <option value="">শ্রেণী নির্বাচন করুন</option>
                                                            {classes.filter(c => canManageClass(c.id)).map(c => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <ChevronDown size={18} />
                                                        </div>
                                                    </div>
                                                ) : field.type === 'group-lookup' ? (
                                                    <div className="relative">
                                                        <select
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-bold text-slate-900 appearance-none"
                                                            value={fieldValue || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                metadata: { ...formData.metadata, [field!.id]: e.target.value }
                                                            })}
                                                            required={isRequired}
                                                            disabled={!formData.metadata.classId}
                                                        >
                                                            <option value="">গ্রুপ নির্বাচন করুন</option>
                                                            {groups.map(g => (
                                                                <option key={g.id} value={g.id}>{g.name}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <ChevronDown size={18} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative group/field">
                                                        <input
                                                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300"
                                                            placeholder={field.placeholder || `${field.label} দিন`}
                                                            value={fieldValue || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (isTopLevel) {
                                                                    setFormData({ ...formData, [field.id]: val });
                                                                } else {
                                                                    setFormData({
                                                                        ...formData,
                                                                        metadata: { ...formData.metadata, [field.id]: val }
                                                                    });
                                                                }
                                                            }}
                                                            required={isRequired}
                                                        />
                                                        {(field.id === 'rollNumber' || field.id === 'studentId') && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAutoGenerate(field.id, undefined, true)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white border border-slate-200 text-[#045c84] text-[10px] font-bold rounded-xl shadow-sm hover:bg-[#045c84] hover:text-white transition-all opacity-0 group-hover/field:opacity-100"
                                                            >
                                                                AUTO
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    };

                                    return (
                                        <div className="space-y-8">
                                            {activeFormTab === 'profile' ? (
                                                <div className="space-y-8">
                                                    {/* Name (Fixed at top) */}
                                                    {renderField('name')}

                                                    {/* Default Academic Fields */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {renderField('classId', true)}
                                                        {renderField('groupId')}
                                                    </div>

                                                    {/* Fee Tier Selector */}
                                                    <div className="space-y-3">
                                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">৳</span>
                                                            ফি স্তর নির্ধারণ করুন
                                                        </label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[
                                                                { value: 'full', label: 'পূর্ণ ফি', sublabel: '100%', color: 'bg-blue-500 border-blue-500 text-white', idle: 'border-slate-200 text-blue-600 hover:border-blue-300 bg-slate-50' },
                                                                { value: 'half', label: 'অর্ধ ফি', sublabel: '50%', color: 'bg-amber-500 border-amber-500 text-white', idle: 'border-slate-200 text-amber-600 hover:border-amber-300 bg-slate-50' },
                                                                { value: 'free', label: 'বিনামূল্যে', sublabel: '০%', color: 'bg-emerald-500 border-emerald-500 text-white', idle: 'border-slate-200 text-emerald-600 hover:border-emerald-300 bg-slate-50' },
                                                            ].map(tier => {
                                                                const current = formData.metadata?.feeTier || 'full';
                                                                const isActive = current === tier.value;
                                                                return (
                                                                    <button
                                                                        key={tier.value}
                                                                        type="button"
                                                                        onClick={() => setFormData({ ...formData, metadata: { ...formData.metadata, feeTier: tier.value } })}
                                                                        className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 font-black transition-all ${isActive ? tier.color + ' shadow-md scale-[1.02]' : tier.idle}`}
                                                                    >
                                                                        <span className="text-sm">{tier.label}</span>
                                                                        <span className={`text-[10px] font-bold ${isActive ? 'opacity-80' : 'opacity-60'}`}>{tier.sublabel}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Dynamic Profile Fields Section */}
                                                    {effectiveFields.length > 0 && (
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                                    <User size={18} />
                                                                </div>
                                                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">প্রোফাইল তথ্য (Profile Data)</h4>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4">
                                                                {effectiveFields.map((field) => (
                                                                    <React.Fragment key={field.id}>
                                                                        {field.id === 'guardianName' && (
                                                                            <div className="md:col-span-2 flex gap-2 mb-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (formData.metadata.fathersName || formData.metadata.fathersPhone) {
                                                                                            setFormData({
                                                                                                ...formData,
                                                                                                metadata: {
                                                                                                    ...formData.metadata,
                                                                                                    guardianName: formData.metadata.fathersName || formData.metadata.guardianName,
                                                                                                    guardianPhone: formData.metadata.fathersPhone || formData.metadata.guardianPhone,
                                                                                                    guardianRelation: 'বাবা'
                                                                                                }
                                                                                            });
                                                                                        } else {
                                                                                            setToast({ message: 'পিতার তথ্য আগে পূরণ করুন।', type: 'error' });
                                                                                        }
                                                                                    }}
                                                                                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                                                                >
                                                                                    অভিভাবক হিসেবে পিতা
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (formData.metadata.mothersName || formData.metadata.mothersPhone) {
                                                                                            setFormData({
                                                                                                ...formData,
                                                                                                metadata: {
                                                                                                    ...formData.metadata,
                                                                                                    guardianName: formData.metadata.mothersName || formData.metadata.guardianName,
                                                                                                    guardianPhone: formData.metadata.mothersPhone || formData.metadata.guardianPhone,
                                                                                                    guardianRelation: 'মা'
                                                                                                }
                                                                                            });
                                                                                        } else {
                                                                                            setToast({ message: 'মাতার তথ্য আগে পূরণ করুন।', type: 'error' });
                                                                                        }
                                                                                    }}
                                                                                    className="px-3 py-1 bg-pink-50 text-pink-600 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors"
                                                                                >
                                                                                    অভিভাবক হিসেবে মাতা
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        {renderField(field.id)}
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-8">
                                                    {/* Login Credentials Section */}
                                                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-6">
                                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-xl bg-[#045c84] flex items-center justify-center text-white">
                                                                    <Key size={18} />
                                                                </div>
                                                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">লগইন তথ্য (Login Credentials)</h4>
                                                            </div>
                                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#045c84] transition-colors">এড়িয়ে যান (Skip)</span>
                                                                <div className="relative">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="sr-only"
                                                                        checked={!!formData.skipAccountSetup}
                                                                        onChange={(e) => setFormData({ ...formData, skipAccountSetup: e.target.checked })}
                                                                    />
                                                                    <div className={`w-10 h-5 rounded-full transition-colors ${formData.skipAccountSetup ? 'bg-amber-500' : 'bg-slate-200'}`} />
                                                                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${formData.skipAccountSetup ? 'translate-x-5' : ''}`} />
                                                                </div>
                                                            </label>
                                                        </div>

                                                        {formData.skipAccountSetup ? (
                                                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 items-center">
                                                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                                                    <Info size={20} />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <p className="text-xs font-black text-amber-900">লগইন অ্যাকাউন্ট তৈরি হবে না</p>
                                                                    <p className="text-[10px] font-bold text-amber-700/70">শুধুমাত্র শিক্ষার্থীর বেসিক প্রোফাইল ডাটাবেজে সংরক্ষিত হবে। পরে একাডেমিক সেকশন থেকে লগইন তথ্য যুক্ত করা যাবে।</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="grid grid-cols-1 gap-4">
                                                                    {renderField('studentId', true)}
                                                                    {renderField('rollNumber', true)}
                                                                    {renderField('studentPhone', true)}
                                                                    {renderField('email')}
                                                                    {renderField('password')}
                                                                </div>

                                                                <div className="pt-4 space-y-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">অভিভাবকের লগইন</p>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-4">
                                                                        {renderField('guardianName', true)}
                                                                        {renderField('guardianRelation', true)}
                                                                        {renderField('guardianPhone', true)}
                                                                        {renderField('guardianPassword')}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                                {activeFormTab === 'profile' ? (
                                    <button
                                        type="button"
                                        onClick={() => setActiveFormTab('account')}
                                        className="px-8 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <span>পরবর্তী (Next)</span>
                                        <ChevronRight size={20} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setActiveFormTab('profile')}
                                        className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <ChevronLeft size={20} />
                                        <span>পূর্ববর্তী (Back)</span>
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-8 py-4 bg-[#045c84] hover:bg-[#034d6e] text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    <span>সংরক্ষণ করুন</span>
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </Modal>

            <FieldLibrary
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                currentFields={formConfig}
                onAddField={handleAddField}
                onRemoveField={handleRemoveField}
            />

            {/* Import Summary Modal */}
            <Modal
                isOpen={isImportSummaryOpen}
                onClose={() => setIsImportSummaryOpen(false)}
                title="ইম্পোর্ট রিপোর্ট"
                maxWidth="max-w-4xl"
            >
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900">কিছু শিক্ষার্থী ইম্পোর্ট করা সম্ভব হয়নি</h3>
                            <p className="text-sm text-slate-600 font-bold">নিচের তালিকার ডাটাগুলো চেক করে পুনরায় ইম্পোর্ট করুন।</p>
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-black text-slate-900 uppercase tracking-wider">নাম</th>
                                        <th className="px-4 py-3 text-left font-black text-slate-900 uppercase tracking-wider">ব্যর্থ হওয়ার কারণ</th>
                                        <th className="px-4 py-3 text-left font-black text-slate-900 uppercase tracking-wider">ডাটা</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {importFails.map((fail, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-slate-950 font-black">{fail.name}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-black rounded-lg border border-red-100 italic">
                                                    {fail.reason}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                                                <div className="max-w-[200px] truncate" title={JSON.stringify(fail.data)}>
                                                    {Array.isArray(fail.data) ? fail.data.join(' | ') : String(fail.data || '')}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={() => setIsImportSummaryOpen(false)}
                            className="px-6 py-2.5 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"
                        >
                            বুঝেছি
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Quick Class Add Modal */}
            <Modal
                isOpen={isClassModalOpen}
                onClose={() => {
                    setIsClassModalOpen(false);
                    setEditingClass(null);
                    setClassData({ name: '' });
                }}
                title={editingClass ? "ক্লাস আপডেট করুন" : "নতুন ক্লাস তৈরি করুন"}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleQuickClassCreate} className="p-5 md:p-8 space-y-6">
                    {!editingClass && (
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider ml-2">বাল্ক অ্যাড (Bulk)</span>
                            <button
                                type="button"
                                onClick={() => setIsBulkClassMode(!isBulkClassMode)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isBulkClassMode ? 'bg-[#045c84]' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBulkClassMode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    )}

                    {!isBulkClassMode ? (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">ক্লাসের নাম</label>
                            <input
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-slate-900"
                                placeholder="যেমন: ষষ্ঠ শ্রেণী"
                                value={classData.name}
                                onChange={(e) => setClassData({ ...classData, name: e.target.value })}
                                required={!isBulkClassMode}
                            />
                        </div>
                    ) : (
                        <textarea
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-slate-900 min-h-[150px] resize-none"
                            placeholder={"যেমন:\n1. Class One\n2. Class Two"}
                            value={bulkClassText}
                            onChange={(e) => setBulkClassText(e.target.value)}
                            required={isBulkClassMode}
                        />
                    )}
                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-4 bg-[#045c84] text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                    >
                        {actionLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : editingStudent?.metadata?.admissionStatus === 'PENDING' ? (
                            <CheckCircle size={20} />
                        ) : (
                            <Save size={20} />
                        )}
                        <span>
                            {editingStudent?.metadata?.admissionStatus === 'PENDING'
                                ? 'মঞ্জুর ও নিশ্চিত করুন'
                                : 'সেভ করুন'}
                        </span>
                    </button>
                </form>
            </Modal>

            {/* Quick Group Modal (Add/Edit) */}
            <Modal
                isOpen={isGroupModalOpen}
                onClose={() => {
                    setIsGroupModalOpen(false);
                    setEditingGroup(null);
                    setGroupData({ name: '' });
                }}
                title={editingGroup ? "গ্রুপ আপডেট করুন" : "নতুন গ্রুপ যোগ করুন"}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleQuickGroupCreate} className="p-5 md:p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">গ্রুপের নাম</label>
                        <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-slate-900"
                            placeholder="যেমন: বিজ্ঞান"
                            value={groupData.name}
                            onChange={(e) => setGroupData({ ...groupData, name: e.target.value })}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-4 bg-[#045c84] text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                    >
                        {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span>{editingGroup ? 'আপডেট করুন' : 'সেভ করুন'}</span>
                    </button>
                </form>
            </Modal>

            {/* Student Profile Modal */}
            <StudentProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                student={selectedStudent}
                onUpdate={async () => {
                    if (selectedStudent?.id) {
                        try {
                            const res = await fetch(`/api/admin/users?id=${selectedStudent.id}`);
                            if (res.ok) {
                                const data = await res.json();
                                const updatedStudent = Array.isArray(data) ? data[0] : data;
                                if (updatedStudent) {
                                    setStudents((prev: any[]) => prev.map(s => s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s));
                                    setSelectedStudent((prev: any) => prev?.id === updatedStudent.id ? { ...prev, ...updatedStudent } : prev);
                                }
                            }
                        } catch (e) {
                            console.error("Failed to fetch updated student", e);
                        }
                    }
                }}
                onEdit={canManageClass(selectedStudent?.metadata?.classId) ? (s, context) => {
                    setIsProfileModalOpen(false);
                    setEditingStudent(s);

                    let updatedMetadata = { ...(s.metadata || {}) };

                    if (context?.linkGuardian) {
                        // Auto-populate from father/mother if guardian info is missing
                        if (!updatedMetadata.guardianName) {
                            updatedMetadata.guardianName = updatedMetadata.fathersName || updatedMetadata.mothersName || '';
                            updatedMetadata.guardianPhone = updatedMetadata.fathersPhone || updatedMetadata.mothersPhone || '';
                            updatedMetadata.guardianRelation = updatedMetadata.fathersName ? 'বাবা' : (updatedMetadata.mothersName ? 'মা' : '');
                        }
                    }

                    setFormData({
                        name: s.name || '',
                        email: s.email || '',
                        password: s.password || '',
                        faceDescriptor: s.faceDescriptor || [],
                        metadata: updatedMetadata
                    });
                    if (s.metadata?.classId) fetchGroups(s.metadata.classId);
                    setIsAddModalOpen(true);
                } : undefined}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <BookDetailsModal
                isOpen={isBookDetailsModalOpen}
                onClose={() => setIsBookDetailsModalOpen(false)}
                book={selectedBook}
                isAdmin={activeRole === 'ADMIN'}
                onUpdate={fetchBooks}
                setToast={setToast}
            />

            {
                selectedBook && selectedBook.pdfUrl && (
                    <PdfReaderModal
                        isOpen={isReaderOpen}
                        onClose={() => setIsReaderOpen(false)}
                        pdfUrl={selectedBook.pdfUrl || ''}
                        title={selectedBook.name || 'বই'}
                        bookmarks={selectedBook.bookmarks || []}
                        onUpdateBookmarks={async (newBookmarks) => {
                            try {
                                const updatedBook = { ...selectedBook, bookmarks: newBookmarks };
                                setSelectedBook(updatedBook);

                                // Persist to database
                                await fetch(`/api/admin/books/${selectedBook.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ bookmarks: newBookmarks })
                                });

                                // Refresh context if needed
                                fetchBooks();
                            } catch (error) {
                                console.error('Failed to update bookmarks:', error);
                            }
                        }}
                    />
                )
            }

            {/* Action Menu Portal */}
            {
                isActionMenuOpen && menuPosition && createPortal(
                    <>
                        <div className="fixed inset-0 z-[999998]" onClick={() => setIsActionMenuOpen(null)} />
                        <div
                            className="fixed w-[220px] bg-white rounded-xl shadow-2xl border border-slate-100 py-1 z-[999999] overflow-hidden text-slate-700 animate-in fade-in zoom-in duration-100"
                            style={{
                                top: `${menuPosition.top}px`,
                                left: `${menuPosition.left}px`
                            }}
                        >
                            {isActionMenuOpen && students.some(s => s.id === isActionMenuOpen) ? (
                                students.filter(s => s.id === isActionMenuOpen).map(s => (
                                    <div key={s.id}>
                                        {canManageClass(s.metadata?.classId) && (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const hasGuardian = !!s.metadata?.guardianId;
                                                        const studentPhone = s.email || s.phone || s.metadata?.studentId || 'N/A';
                                                        const studentPassword = s.password || 'N/A';
                                                        const guardianPhone = hasGuardian ? (s.metadata?.guardianPhone || 'N/A') : 'N/A';
                                                        const guardianPassword = hasGuardian ? (s.metadata?.guardianPassword || 'N/A') : 'N/A';

                                                        setCredentialsData({
                                                            studentPhone,
                                                            studentPassword,
                                                            guardianPhone,
                                                            guardianPassword
                                                        });
                                                        setIsCredentialsModalOpen(true);
                                                        setIsActionMenuOpen(null);
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-[13px] font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                                        <Key size={16} />
                                                    </div>
                                                    <span>লগইন তথ্য (Credentials)</span>
                                                </button>
                                                <div className="h-[1px] bg-slate-100 my-1 mx-2" />
                                            </>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `tel:${s.phone || s.metadata?.studentPhone || s.metadata?.guardianPhone}`;
                                                setIsActionMenuOpen(null);
                                            }}
                                            className="w-full px-4 py-3 text-left text-[13px] font-bold hover:bg-slate-50 flex items-center gap-3 transition-colors text-emerald-600"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                                <Phone size={16} />
                                            </div>
                                            <span>কল করুন (Call)</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `sms:${s.phone || s.metadata?.studentPhone || s.metadata?.guardianPhone}`;
                                                setIsActionMenuOpen(null);
                                            }}
                                            className="w-full px-4 py-3 text-left text-[13px] font-bold hover:bg-slate-50 flex items-center gap-3 transition-colors text-blue-600"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <MessageSquare size={16} />
                                            </div>
                                            <span>মেসেজ পাঠান (SMS)</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const phone = s.phone || s.metadata?.studentPhone || s.metadata?.guardianPhone;
                                                window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank');
                                                setIsActionMenuOpen(null);
                                            }}
                                            className="w-full px-4 py-3 text-left text-[13px] font-bold hover:bg-slate-50 flex items-center gap-3 transition-colors text-green-600"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                                <MessageCircle size={16} />
                                            </div>
                                            <span>হোয়াটসঅ্যাপ (WhatsApp)</span>
                                        </button>
                                        {canManageClass(s.metadata?.classId) && (
                                            <>
                                                <div className="h-[1px] bg-slate-100 my-1 mx-2" />
                                                {selectedGroupId !== 'all' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveFromGroup(s);
                                                            setIsActionMenuOpen(null);
                                                        }}
                                                        className="w-full px-4 py-3 text-left text-[13px] font-bold hover:bg-slate-50 flex items-center gap-3 transition-colors text-orange-600"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                                            <FileX size={16} />
                                                        </div>
                                                        <span>গ্রুপ থেকে বাদ দিন (Remove)</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteStudent(s.id);
                                                        setIsActionMenuOpen(null);
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-[13px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                                        <Trash2 size={16} />
                                                    </div>
                                                    <span>মুছে ফেলুন (Delete)</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))
                            ) : isActionMenuOpen === 'all' ? (
                                <div className="py-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setManagedClasses([...classes]);
                                            setIsClassManagementModalOpen(true);
                                            setIsActionMenuOpen(null);
                                        }}
                                        className="w-full px-4 py-3 text-[13px] font-bold text-[#045c84] hover:bg-blue-50/50 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#045c84]">
                                            <Settings2 size={16} />
                                        </div>
                                        <span>ক্লাস ম্যানেজমেন্ট (Manage)</span>
                                    </button>
                                </div>
                            ) : classes.filter(c => c.id === isActionMenuOpen).length > 0 ? (
                                classes.filter(c => c.id === isActionMenuOpen).map(c => (
                                    <div key={c.id}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingClass(c);
                                                setClassData({ name: c.name });
                                                setIsBulkClassMode(false);
                                                setIsClassModalOpen(true);
                                                setIsActionMenuOpen(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                        >
                                            <Edit size={14} />
                                            <span>এডিট</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClass(c.id);
                                                setIsActionMenuOpen(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                            <span>ডিলিট</span>
                                        </button>
                                    </div>
                                ))
                            ) : isActionMenuOpen.startsWith('group-') ? (
                                groups.filter(g => `group-${g.id}` === isActionMenuOpen).map(g => (
                                    <div key={g.id}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingGroup(g);
                                                setGroupData({ name: g.name });
                                                setIsGroupModalOpen(true);
                                                setIsActionMenuOpen(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                        >
                                            <Edit size={14} />
                                            <span>এডিট (Edit Group)</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteGroup(g.id, g.name);
                                                setIsActionMenuOpen(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                            <span>ডিলিট (Delete Group)</span>
                                        </button>
                                    </div>
                                ))
                            ) : books.filter(b => b.id === isActionMenuOpen).length > 0 ? (
                                books.filter(b => b.id === isActionMenuOpen).map(b => (
                                    <div key={b.id} className="py-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setGradingSubjectId(b.id);
                                                setIsGradingModalOpen(true);
                                                setIsActionMenuOpen(null);
                                            }}
                                            className="w-full px-4 py-3 text-left text-[13px] font-bold text-[#045c84] hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#045c84]">
                                                <GraduationCap size={16} />
                                            </div>
                                            <span>গ্রেডিং সিস্টেম (Grading)</span>
                                        </button>
                                        <div className="h-[1px] bg-slate-50 my-1 mx-2" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBookDelete(b.id);
                                                setIsActionMenuOpen(null);
                                            }}
                                            className="w-full px-4 py-3 text-left text-[13px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                                <Trash2 size={16} />
                                            </div>
                                            <span>মুছে ফেলুন (Delete)</span>
                                        </button>
                                    </div>
                                ))
                            ) : null
                            }
                        </div >
                    </>,
                    document.body
                )
            }
            {/* Book Bulk Add Modal */}
            <Modal
                isOpen={isBookModalOpen}
                onClose={() => setIsBookModalOpen(false)}
                title="বই যুক্ত করুন (Bulk)"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleBookSubmit} className="p-5 md:p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">ক্লাস নির্বাচন করুন</label>
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                            value={bookData.classId}
                            onChange={(e) => setBookData({ ...bookData, classId: e.target.value })}
                            required
                        >
                            <option value="">ক্লাস সিলেক্ট করুন</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">লেখক/ক্যাটাগরি (ঐচ্ছিক)</label>
                        <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                            placeholder="যেমন: হুমায়ূন আহমেদ বা উপন্যাস"
                            value={bookData.author}
                            onChange={(e) => setBookData({ ...bookData, author: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">বইয়ের তালিকা (প্রতি লাইনে একটি)</label>
                        <textarea
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black min-h-[150px] resize-none"
                            placeholder={"যেমন:\nBangla\nEnglish\nMathematics"}
                            value={bookData.names}
                            onChange={(e) => setBookData({ ...bookData, names: e.target.value })}
                            required
                        />
                    </div>

                    {selectedClassId !== 'all' && groups.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider ml-2">গ্রুপ (Group Selection)</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-slate-900 appearance-none cursor-pointer"
                                value={bookData.groupId}
                                onChange={(e) => setBookData({ ...bookData, groupId: e.target.value })}
                            >
                                <option value="">সকল গ্রুপ (General)</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">কভার ইমেজ (ঐচ্ছিক)</label>
                        <div className="flex items-center gap-4">
                            {bookData.coverImage ? (
                                <div className="relative w-20 h-24 rounded-xl overflow-hidden border border-slate-200 group/cover">
                                    <img src={bookData.coverImage} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setBookData({ ...bookData, coverImage: '' })}
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ) : (
                                <label className="w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-[#045c84] hover:text-[#045c84] transition-all cursor-pointer">
                                    <CloudUpload size={24} className="mb-1" />
                                    <span className="text-[10px] font-bold uppercase">কভার আপলোড</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const uploadData = new FormData();
                                            uploadData.append('file', file);
                                            try {
                                                setActionLoading(true);
                                                const res = await fetch('/api/upload', {
                                                    method: 'POST',
                                                    body: uploadData
                                                });
                                                const data = await res.json();
                                                if (data.url) {
                                                    setBookData({ ...bookData, coverImage: data.url });
                                                }
                                            } catch (error) {
                                                console.error('Upload failed', error);
                                            } finally {
                                                setActionLoading(false);
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium ml-2">টিপস: একটি কভার ইমেজ আপলোড করলে তা সবগুলো বইয়ের জন্য প্রযোজ্য হবে।</p>
                    </div>

                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-4 bg-[#045c84] text-white rounded-2xl font-bold hover:bg-[#034a6b] shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span>সেভ করুন</span>
                    </button>
                </form>
            </Modal>
            <TeacherPermissionModal
                isOpen={!!permissionModalData}
                onClose={() => setPermissionModalData(null)}
                teacher={permissionModalData}
                classes={classes}
                allBooks={books}
                onSave={handleUpdateTeacherPermissions}
                isReadOnly={!isOwner}
                canToggleAdminPower={isOwner}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Class Management Modal with DnD */}
            <Modal
                isOpen={isClassManagementModalOpen}
                onClose={() => setIsClassManagementModalOpen(false)}
                title="ক্লাস ম্যানেজমেন্ট (Manage Classes)"
                maxWidth="max-w-2xl"
            >
                <div className="p-5 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar p-1">
                        {managedClasses.map((c, index) => (
                            <div
                                key={c.id}
                                draggable
                                onDragStart={(e) => {
                                    if (!canDrag.current) {
                                        e.preventDefault();
                                        return;
                                    }
                                    setDraggedIndex(index);
                                    e.currentTarget.classList.add('opacity-40', 'scale-95');
                                }}
                                onDragEnd={(e) => {
                                    setDraggedIndex(null);
                                    canDrag.current = false;
                                    e.currentTarget.classList.remove('opacity-40', 'scale-95');
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    if (draggedIndex === null || draggedIndex === index) return;

                                    const newItems = [...managedClasses];
                                    const [movedItem] = newItems.splice(draggedIndex, 1);
                                    newItems.splice(index, 0, movedItem);
                                    setDraggedIndex(index);
                                    setManagedClasses(newItems);
                                }}
                                className={`group relative flex items-center p-3 bg-white border border-slate-200 rounded-2xl gap-3 transition-all duration-300 hover:shadow-lg hover:border-[#045c84] border-b-4 active:border-b-0 active:translate-y-1 ${draggedIndex === index ? 'opacity-0' : ''}`}
                            >
                                <div
                                    onMouseDown={() => { canDrag.current = true; }}
                                    onMouseUp={() => { canDrag.current = false; }}
                                    className="drag-handle text-slate-300 group-hover:text-[#045c84] transition-colors shrink-0 cursor-grab active:cursor-grabbing p-1.5 -ml-1 rounded-lg hover:bg-slate-50"
                                >
                                    <GripVertical size={20} />
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 font-black text-[10px] shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <input
                                        id={`class-input-${index}`}
                                        className="w-full px-0 bg-transparent border-none focus:ring-0 transition-all outline-none font-bold text-slate-700 text-sm"
                                        value={c.name}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="ক্লাসের নাম লিখুন..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                if (e.key === 'ArrowDown' && index < managedClasses.length - 1) {
                                                    document.getElementById(`class-input-${index + 1}`)?.focus();
                                                    return;
                                                }
                                                if (e.key === 'ArrowDown') return;

                                                e.preventDefault();
                                                const newItems = [...managedClasses];
                                                const newClass = { id: `new-${Date.now()}`, name: '', order: managedClasses.length };
                                                newItems.splice(index + 1, 0, newClass);
                                                setManagedClasses(newItems);
                                                setTimeout(() => {
                                                    document.getElementById(`class-input-${index + 1}`)?.focus();
                                                }, 0);
                                            } else if (e.key === 'ArrowUp' && index > 0) {
                                                document.getElementById(`class-input-${index - 1}`)?.focus();
                                            }
                                        }}
                                        onChange={(e) => {
                                            const newItems = [...managedClasses];
                                            newItems[index] = { ...newItems[index], name: e.target.value };
                                            setManagedClasses(newItems);
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (e.shiftKey || !c.id.startsWith('new-')) {
                                            const isConfirmed = await confirm('আপনি কি এই ক্লাসটি মুছে ফেলতে চান?');
                                            if (!isConfirmed) return;
                                        }
                                        const newItems = managedClasses.filter((_, i) => i !== index);
                                        setManagedClasses(newItems);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={() => setIsClassManagementModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-[0.98]"
                        >
                            বাতিল
                        </button>
                        <button
                            onClick={handleSaveClassManagement}
                            disabled={actionLoading}
                            className="flex-[2] py-4 bg-[#045c84] text-white rounded-2xl font-bold hover:bg-[#034a6b] shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            <span>পরিবর্তনগুলো সেভ করুন</span>
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Subject Grading Modal */}
            <SubjectGradingModal
                isOpen={isGradingModalOpen}
                onClose={() => {
                    setIsGradingModalOpen(false);
                    setGradingSubjectId(null);
                }}
                subjects={books}
                initialSubjectId={gradingSubjectId}
                onSave={handleSaveGrading}
            />

            {/* Student Selection Modal for Groups */}
            <Modal
                isOpen={isStudentSelectionModalOpen}
                onClose={() => setIsStudentSelectionModalOpen(false)}
                title="গ্রুপের জন্য শিক্ষার্থী নির্বাচন করুন"
                maxWidth="max-w-2xl"
            >
                <div className="p-6 space-y-6">
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {allStudentsInClass.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">শিক্ষার্থী পাওয়া যায়নি</div>
                        ) : allStudentsInClass.map(student => (
                            <div
                                key={student.id}
                                onClick={() => {
                                    setSelectedStudentsForGroup(prev =>
                                        prev.includes(student.id)
                                            ? prev.filter(id => id !== student.id)
                                            : [...prev, student.id]
                                    );
                                }}
                                className={`flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer ${selectedStudentsForGroup.includes(student.id)
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-white border-slate-100 hover:border-blue-100'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedStudentsForGroup.includes(student.id)
                                    ? 'bg-[#045c84] border-[#045c84]'
                                    : 'border-slate-200'
                                    }`}>
                                    {selectedStudentsForGroup.includes(student.id) && <Plus size={12} className="text-white" />}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden">
                                    {student.metadata?.studentPhoto ? (
                                        <img src={student.metadata.studentPhoto} alt={student.name} className="w-full h-full object-cover" />
                                    ) : student.name?.[0]}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800">{student.name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">
                                        ID: {student.metadata?.studentId} | Roll: {student.metadata?.rollNumber}
                                    </div>
                                </div>
                                {student.metadata?.groupId && (
                                    <div className="px-2 py-0.5 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400">
                                        {groups.find((g: any) => g.id === student.metadata?.groupId)?.name || 'অন্য গ্রুপে আছে'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsStudentSelectionModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                        >
                            বাতিল
                        </button>
                        <button
                            onClick={handleBulkGroupAssign}
                            disabled={actionLoading || selectedStudentsForGroup.length === 0}
                            className="flex-[2] py-4 bg-[#045c84] text-white rounded-2xl font-bold hover:bg-[#034a6b] shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            <span>গ্রুপে যুক্ত করুন ({selectedStudentsForGroup.length})</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Dynamic FAB System */}
            {
                mounted && pathname?.includes('/dashboard/students') && (
                    (activeTab === 'students' && (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || (selectedClassId !== 'all' ? canManageClass(selectedClassId) : classes.some(c => canManageClass(c.id))))) ||
                    (activeTab === 'books' && (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN')) ||
                    (activeTab === 'applications' && (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' || (selectedClassId !== 'all' ? canManageClass(selectedClassId) : classes.some(c => canManageClass(c.id)))))
                ) && createPortal(
                    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4 pointer-events-none">
                        <button
                            onClick={() => {
                                if (activeTab === 'students') {
                                    if (selectedClassId !== 'all') {
                                        setFormData({
                                            name: '',
                                            email: '',
                                            password: '',
                                            metadata: { classId: selectedClassId }
                                        });
                                    } else {
                                        setFormData({ name: '', email: '', password: '', metadata: {} });
                                    }
                                    setIsAddModalOpen(true);
                                } else if (activeTab === 'books') {
                                    setBookData({ names: '', classId: selectedClassId !== 'all' ? selectedClassId : '', groupId: '', coverImage: '', author: '' });
                                    setIsBookModalOpen(true);
                                } else if (activeTab === 'applications') {
                                    if (activeInstitute?.id) {
                                        const link = `${window.location.origin}/admission/${activeInstitute.id}`;
                                        if (navigator.clipboard) {
                                            navigator.clipboard.writeText(link).then(() => {
                                                setToast({ message: 'ভর্তি ফরমের লিঙ্ক কপি হয়েছে!', type: 'success' });
                                            }).catch(err => {
                                                console.error('Failed to copy text: ', err);
                                            });
                                        } else {
                                            const textArea = document.createElement("textarea");
                                            textArea.value = link;
                                            document.body.appendChild(textArea);
                                            textArea.focus();
                                            textArea.select();
                                            try {
                                                document.execCommand('copy');
                                                setToast({ message: 'ভর্তি ফরমের লিঙ্ক কপি হয়েছে!', type: 'success' });
                                            } catch (err) {
                                                console.error('Fallback: Oops, unable to copy', err);
                                            }
                                            document.body.removeChild(textArea);
                                        }
                                    }
                                }
                            }}
                            className="pointer-events-auto flex items-center justify-center w-16 h-16 bg-[#045c84] text-white rounded-full shadow-2xl hover:shadow-[#045c84]/30 hover:-translate-y-1 transition-all duration-300 active:scale-95 border-b-4 border-[#034a6b] active:border-b-0 animate-in slide-in-from-bottom-6"
                            title={activeTab === 'students' ? 'শিক্ষার্থী যোগ করুন' : activeTab === 'books' ? 'বই যোগ করুন' : 'ভর্তি লিঙ্ক কপি করুন'}
                        >
                            {activeTab === 'students' ? (
                                <div className="relative">
                                    <UserPlus size={28} />
                                </div>
                            ) : activeTab === 'books' ? (
                                <div className="relative">
                                    <BookOpen size={28} />
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#045c84] border-2 border-white rounded-full flex items-center justify-center -mr-0.5 -mt-0.5">
                                        <Plus size={12} strokeWidth={4} />
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Link size={28} />
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#045c84] border-2 border-white rounded-full flex items-center justify-center -mr-0.5 -mt-0.5">
                                        <Plus size={12} strokeWidth={4} />
                                    </div>
                                </div>
                            )}
                        </button>
                    </div>,
                    document.body
                )
            }

            {/* Login Credentials Modal */}
            <Modal
                isOpen={isCredentialsModalOpen}
                onClose={() => setIsCredentialsModalOpen(false)}
                title="লগইন তথ্য"
                maxWidth="max-w-md"
            >
                {credentialsData && (
                    <div className="p-6 space-y-6">
                        {/* Student Login Info */}
                        <div className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                                    <GraduationCap size={24} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900">শিক্ষার্থী লগইন</h3>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">ইউজারনেম (মোবাইল নম্বর)</label>
                                    <div className="mt-1 px-4 py-3 bg-white rounded-xl border border-blue-200 font-mono text-lg font-bold text-slate-900 select-all">
                                        {credentialsData.studentPhone}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">পাসওয়ার্ড</label>
                                    <div className="mt-1 px-4 py-3 bg-white rounded-xl border border-blue-200 font-mono text-lg font-bold text-slate-900 select-all">
                                        {credentialsData.studentPassword}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guardian Login Info */}
                        {credentialsData.guardianPhone !== 'N/A' && (
                            <div className="bg-purple-50 rounded-2xl p-5 border-2 border-purple-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                                        <Users size={24} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900">অভিভাবক লগইন</h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">ইউজারনেম (মোবাইল নম্বর)</label>
                                        <div className="mt-1 px-4 py-3 bg-white rounded-xl border border-purple-200 font-mono text-lg font-bold text-slate-900 select-all">
                                            {credentialsData.guardianPhone}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">পাসওয়ার্ড</label>
                                        <div className="mt-1 px-4 py-3 bg-white rounded-xl border border-purple-200 font-mono text-lg font-bold text-slate-900 select-all">
                                            {credentialsData.guardianPassword}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const text = `Student Login:\nUsername: ${credentialsData.studentPhone}\nPassword: ${credentialsData.studentPassword}\n\nGuardian Login:\nUsername: ${credentialsData.guardianPhone}\nPassword: ${credentialsData.guardianPassword}`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex-1 py-3 bg-[#25D366] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors"
                            >
                                <MessageCircle size={18} />
                                <span>WhatsApp</span>
                            </button>
                            <button
                                onClick={() => {
                                    const text = `Student Login: Username: ${credentialsData.studentPhone}, Password: ${credentialsData.studentPassword} | Guardian Login: Username: ${credentialsData.guardianPhone}, Password: ${credentialsData.guardianPassword}`;
                                    window.location.href = `sms:?body=${encodeURIComponent(text)}`;
                                }}
                                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                            >
                                <MessageSquare size={18} />
                                <span>SMS</span>
                            </button>
                        </div>

                        <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <Info size={20} className="text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-amber-800 font-bold">
                                এই তথ্য ব্যবহার করে শিক্ষার্থী ও অভিভাবক সিস্টেমে লগইন করতে পারবেন।
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </div >
    );
}
