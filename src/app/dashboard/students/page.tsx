'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { createPortal } from 'react-dom';
import { useSession } from '@/components/SessionProvider';
import { usePathname } from 'next/navigation';
import { useOfflineSync } from '@/hooks/useOfflineSync';

import {
    Users,
    Search,
    UserPlus,
    ShieldCheck,
    Mail,
    Building2,
    Loader2,
    X,
    XCircle,
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
    History,
    Wallet,
    FileUp,
    Camera,
    Scan,
    Printer
} from 'lucide-react';
import QRBarcodeScanner from '@/components/QRBarcodeScanner';
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import FieldLibrary, { FieldDefinition, POSSIBLE_FIELDS } from '@/components/FieldLibrary';
import StudentProfileModal from '@/components/StudentProfileModal';
import FaceEnrollment from '@/components/FaceEnrollment';
import TeacherCard from '@/components/TeacherCard';
import BookCard from '@/components/BookCard';
import BookDetailsModal from '@/components/BookDetailsModal';
import PdfReaderModal from '@/components/PdfReaderModal';
import TeacherPermissionModal from '@/components/TeacherPermissionModal';
import SubjectGradingModal from '@/components/SubjectGradingModal';
import FeeCollectModal from '@/components/FeeCollectModal';
import PrintReceiptModal from '@/components/PrintReceiptModal';
import StudentPrintPreviewModal from '@/components/StudentPrintPreviewModal';
import { useUI } from '@/components/UIProvider';
import { getCleanId } from '@/utils/digit-utils';

const EditableCell = ({ value, type, onSave, onClose, options }: { value: any, type: string, onSave: (val: any) => void, onClose?: () => void, options?: { id: string, name: string }[] }) => {
    const [tempValue, setTempValue] = useState(value || '');
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top' | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        if (type === 'select') {
            document.body.style.overflow = 'hidden';

            if (wrapperRef.current) {
                const rect = wrapperRef.current.getBoundingClientRect();
                const dropdownHeight = 224; // max-h-56
                const spaceBelow = window.innerHeight - rect.bottom;
                const showAbove = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight + 8;
                
                setDropdownRect({
                    top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
                    left: rect.left,
                    width: Math.max(rect.width, 200),
                });
                setDropdownPosition(showAbove ? 'top' : 'bottom');
            }

            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [type]);
    const handleBlur = () => {
        if (tempValue !== (value || '')) {
            onSave(tempValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const el = e.target as HTMLElement;
            
            e.preventDefault(); // Prevents page scroll and cursor movement
            handleBlur();

            if (type === 'select' && onClose) {
                 onClose();
            }

            const currentTd = el.closest('td');
            if (!currentTd) return;

            let targetTd: HTMLTableCellElement | null = null;
            
            if (e.key === 'ArrowLeft') {
                targetTd = currentTd.previousElementSibling as HTMLTableCellElement;
                while (targetTd && !targetTd.className.includes('cursor-cell')) {
                    targetTd = targetTd.previousElementSibling as HTMLTableCellElement;
                }
            } else if (e.key === 'ArrowRight') {
                targetTd = currentTd.nextElementSibling as HTMLTableCellElement;
                while (targetTd && !targetTd.className.includes('cursor-cell')) {
                    targetTd = targetTd.nextElementSibling as HTMLTableCellElement;
                }
            } else if (e.key === 'ArrowUp') {
                const currentTr = currentTd.closest('tr');
                const prevTr = currentTr?.previousElementSibling;
                if (prevTr) {
                    targetTd = prevTr.children[currentTd.cellIndex] as HTMLTableCellElement;
                }
            } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                const currentTr = currentTd.closest('tr');
                const nextTr = currentTr?.nextElementSibling;
                if (nextTr) {
                    targetTd = nextTr.children[currentTd.cellIndex] as HTMLTableCellElement;
                }
            }

            if (targetTd) {
                targetTd.click();
            } else {
                el.blur();
            }
        }
    };

    if (type === 'select') {
        const closeDropdown = () => {
            handleBlur();
            document.body.style.overflow = '';
            if (onClose) onClose();
        };

        const dropdownList = dropdownRect ? createPortal(
            <>
                {/* Backdrop - click outside to close */}
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        closeDropdown();
                    }}
                />

                {/* Dropdown card */}
                <div
                    style={{
                        position: 'fixed',
                        top: dropdownRect.top,
                        left: dropdownRect.left,
                        minWidth: Math.max(dropdownRect.width, 200),
                        zIndex: 9999,
                    }}
                    className={`bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-150 ${
                        dropdownPosition === null ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                    }`}
                    onWheel={(e) => e.stopPropagation()}
                >
                    {/* Close button header */}
                    <div className="flex items-center justify-end px-2 pt-2 pb-0">
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                closeDropdown();
                            }}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    {/* Options list */}
                    <div className="flex flex-col gap-0.5 p-1.5 max-h-52 overflow-y-auto custom-scrollbar">
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setTempValue('');
                                onSave('');
                                closeDropdown();
                            }}
                            className={`text-left px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${tempValue === '' ? 'bg-[#045c84] text-white shadow-sm' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                            ফাঁকা রাখুন
                        </button>
                        {options?.map(opt => (
                            <button
                                key={opt.id}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setTempValue(opt.id);
                                    onSave(opt.id);
                                    closeDropdown();
                                }}
                                className={`text-left px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${tempValue === opt.id ? 'bg-[#045c84] text-white shadow-sm' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                                {opt.name}
                            </button>
                        ))}
                    </div>
                </div>
            </>,
            document.body
        ) : null;

        return (
            <div ref={wrapperRef} tabIndex={0} autoFocus onKeyDown={handleKeyDown} className="w-full h-full min-w-0 flex items-center bg-white px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded ring-2 ring-[#045c84] cursor-pointer outline-none" onClick={(e) => e.stopPropagation()} style={{ width: '0px', minWidth: '100%', maxWidth: '100%' }}>
                <span className="text-slate-900 text-xs font-bold truncate">
                    {options?.find(o => o.id === tempValue)?.name || '-'}
                </span>
                {dropdownList}
            </div>
        );
    }

    return (
        <input
            autoFocus
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full min-w-0 bg-white px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded ring-2 ring-[#045c84] border-none outline-none focus:ring-2 focus:ring-[#045c84] text-slate-900 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            style={{ textAlign: 'inherit', width: '0px', minWidth: '100%', maxWidth: '100%' }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
                if (type === 'number') {
                    (e.target as HTMLElement).blur();
                }
            }}
        />
    );
};

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

    const { fetchWithSync } = useOfflineSync({
        onQueue: () => setToast({ message: 'ইন্টারনেট সংযোগ বিচ্ছিন্ন। তথ্য লোকালি সেভ করা হয়েছে এবং অনলাইনে সিঙ্ক হবে।', type: 'error' }),
        onSyncSuccess: () => {
            setToast({ message: 'অফলাইন ডেটা সার্ভারে সিঙ্ক করা হয়েছে!', type: 'success' });
            fetchStudents();
        }
    });

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
    const [showAllActionsInline, setShowAllActionsInline] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isFaceEnrollmentModalOpen, setIsFaceEnrollmentModalOpen] = useState(false);
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
    
    // Direct Image Upload from Table
    const [uploadingStudentId, setUploadingStudentId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!tableContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - tableContainerRef.current.offsetLeft);
        setStartY(e.pageY - tableContainerRef.current.offsetTop);
        setScrollLeft(tableContainerRef.current.scrollLeft);
        setScrollTop(tableContainerRef.current.scrollTop);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !tableContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - tableContainerRef.current.offsetLeft;
        const y = e.pageY - tableContainerRef.current.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        tableContainerRef.current.scrollLeft = scrollLeft - walkX;
        tableContainerRef.current.scrollTop = scrollTop - walkY;
    };

    const handleDirectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!uploadingStudentId) return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (isFaceModelLoaded) {
            extractFaceDescriptor(file, 'studentPhoto');
        }

        const uploadData = new FormData();
        uploadData.append('file', file);

        const studentId = uploadingStudentId;
        setUploadingStudentId(null);
        if (e.target) e.target.value = '';

        const localUrl = URL.createObjectURL(file);
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                return { ...s, metadata: { ...(s.metadata || {}), studentPhoto: localUrl } };
            }
            return s;
        }));

        try {
            setToast({ message: 'ছবি আপলোড হচ্ছে...', type: 'success' });
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData
            });
            const data = await res.json();
            if (res.ok && data.url) {
                const targetStudent = students.find(s => s.id === studentId);
                await fetch(`/api/admin/users`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: studentId,
                        metadata: {
                            ...(targetStudent?.metadata || {}),
                            studentPhoto: data.url
                        }
                    })
                });

                setStudents(prev => prev.map(s => {
                    if (s.id === studentId) {
                        return { ...s, metadata: { ...(s.metadata || {}), studentPhoto: data.url } };
                    }
                    return s;
                }));
                setToast({ message: 'ছবি আপডেট সফল হয়েছে', type: 'success' });
            } else {
                setToast({ message: data.message || 'আপলোড ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'ফাইল আপলোড ব্যর্থ হয়েছে।', type: 'error' });
        }
    };

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

    // Auto-generate IDs when classId or groupId changes
    useEffect(() => {
        if (!isAddModalOpen || !activeInstitute?.id) return;
        
        const classId = formData.metadata?.classId;
        const groupId = formData.metadata?.groupId;

        if (classId) {
            const generate = async () => {
                try {
                    const res = await fetch(`/api/admin/students/next-ids?instituteId=${activeInstitute.id}&classId=${classId}${groupId ? `&groupId=${groupId}` : ''}`);
                    if (res.ok) {
                        const data = await res.json();
                        setFormData((prev: any) => ({
                            ...prev,
                            metadata: {
                                ...prev.metadata,
                                studentId: prev.metadata.studentId || data.nextStudentId,
                                rollNumber: prev.metadata.rollNumber || data.nextRollNumber
                            }
                        }));
                    }
                } catch (error) {
                    console.error("Failed to fetch next IDs", error);
                }
            };
            generate();
        }
    }, [formData.metadata?.classId, formData.metadata?.groupId, isAddModalOpen, activeInstitute?.id]);

    const [formConfig, setFormConfig] = useState<FieldDefinition[]>([]);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    const [classes, setClasses] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [activeTab, setActiveTab] = useState<'students' | 'applications' | 'books' | 'teachers'>('students');
    const [activeFormTab, setActiveFormTab] = useState<'student' | 'guardian' | 'academic' | 'fees' | 'documents'>('student');

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

    useEffect(() => {
        setMounted(true);
    }, []);

    const [isProcessingFace, setIsProcessingFace] = useState(false);
    const [processingFieldId, setProcessingFieldId] = useState<string | null>(null);
    const [isFaceModelLoaded, setIsFaceModelLoaded] = useState(false);

    // Login Credentials Modal States
    const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
    const [loginType, setLoginType] = useState<'student' | 'guardian'>('student');
    const [credentialsData, setCredentialsData] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
    const [viewMode, setViewMode] = useState<'DEFAULT' | 'FEES_COLLECT' | 'ADMISSION'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('students_viewMode') as any) || 'DEFAULT';
        }
        return 'DEFAULT';
    });
    const [optimisticViewMode, setOptimisticViewMode] = useState<'DEFAULT' | 'FEES_COLLECT' | 'ADMISSION'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('students_viewMode') as any) || 'DEFAULT';
        }
        return 'DEFAULT';
    });
    const [visibleCount, setVisibleCount] = useState(50);
    const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
    const [selectedStudentForFee, setSelectedStudentForFee] = useState<any>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [isSearchingStudent, setIsSearchingStudent] = useState(false);
    const [selectedTransactionForPrint, setSelectedTransactionForPrint] = useState<any>(null);
    const [feesData, setFeesData] = useState<{ [studentId: string]: { totalPaid: number, totalDue: number, advance: number } } | null>(null);
    const [loadingFees, setLoadingFees] = useState(false);
    const [tableColumns, setTableColumns] = useState<Record<string, boolean>>(() => {
        const defaults = {
            ...POSSIBLE_FIELDS.reduce((acc, field) => ({ ...acc, [field.id]: false }), {}),
            sl: true,
            rollNumber: true,
            studentId: true,
            student: true,
            className: true,
            contact: true,
            action: true
        };
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('students_tableColumns');
                if (saved) return { ...defaults, ...JSON.parse(saved) };
            } catch {}
        }
        return defaults;
    });
    const [isTableEditModeState, setIsTableEditMode] = useState(false);
    const isTableEditMode = isTableEditModeState || viewMode === 'ADMISSION';
    const [editingCell, setEditingCell] = useState<{ studentId: string, fieldId: string } | null>(null);
    const [sortField, setSortField] = useState<string>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('students_sortField') || 'rollNumber';
        return 'rollNumber';
    });
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => {
        if (typeof window !== 'undefined') return (localStorage.getItem('students_sortDir') as any) || 'asc';
        return 'asc';
    });

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field) return <span className="opacity-20 ml-1">↕</span>;
        return <span className="ml-1 text-[#045c84]">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    // Persist state to localStorage
    useEffect(() => { localStorage.setItem('students_viewMode', viewMode); }, [viewMode]);
    useEffect(() => { localStorage.setItem('students_tableColumns', JSON.stringify(tableColumns)); }, [tableColumns]);
    useEffect(() => { localStorage.setItem('students_sortField', sortField); }, [sortField]);
    useEffect(() => { localStorage.setItem('students_sortDir', sortDir); }, [sortDir]);
    const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
    const [customColumns, setCustomColumns] = useState<{ id: string, label: string, type: string }[]>([]);
    const [isCustomFieldModalOpen, setIsCustomFieldModalOpen] = useState(false);
    const [newCustomColumnLabel, setNewCustomColumnLabel] = useState('');
    const [newCustomColumnType, setNewCustomColumnType] = useState('text');

    // Print preview modal state
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printPreviewPayload, setPrintPreviewPayload] = useState<any | null>(null);

    // Load custom columns from DB
    useEffect(() => {
        if (!activeInstitute?.id) return;
        fetch(`/api/admin/institutes/custom-columns?instituteId=${activeInstitute.id}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setCustomColumns(data);
                    setTableColumns(prev => {
                        const newCols: Record<string, boolean> = { ...prev };
                        data.forEach((col: any) => { newCols[col.id] = true; });
                        return newCols;
                    });
                }
            })
            .catch(() => {});
    }, [activeInstitute?.id]);

    const saveCustomColumnsToDB = async (cols: { id: string, label: string, type: string }[]) => {
        if (!activeInstitute?.id) return;
        await fetchWithSync('/api/admin/institutes/custom-columns', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instituteId: activeInstitute.id, customStudentColumns: cols })
        });
    };

    const handleAddCustomColumn = () => {
        if (!newCustomColumnLabel.trim()) return;
        const newColId = `custom_${Date.now()}`;
        const newCol = { id: newColId, label: newCustomColumnLabel.trim(), type: newCustomColumnType };
        const updated = [...customColumns, newCol];
        setCustomColumns(updated);
        setTableColumns(prev => ({ ...prev, [newColId]: true }));
        setNewCustomColumnLabel('');
        setNewCustomColumnType('text');
        setIsCustomFieldModalOpen(false);
        setIsColumnDropdownOpen(false);
        saveCustomColumnsToDB(updated);
    };

    const handleDeleteCustomColumn = (colId: string) => {
        const updated = customColumns.filter(c => c.id !== colId);
        setCustomColumns(updated);
        setTableColumns(prev => { const n = { ...prev }; delete n[colId]; return n; });
        saveCustomColumnsToDB(updated);
    };


    const fetchFeesData = () => {
        if (!activeInstitute?.id) return;
        setLoadingFees(true);
        fetch(`/api/admin/accounts?instituteId=${activeInstitute.id}&_cb=${Date.now()}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                const txns = data.transactions || [];
                const feesMap: { [studentId: string]: { totalPaid: number, totalDue: number, advance: number } } = {};
                
                txns.forEach((t: any) => {
                    if (!t.studentId) return;
                    const sId = t.studentId;
                    if (!feesMap[sId]) {
                        feesMap[sId] = { totalPaid: 0, totalDue: 0, advance: 0 };
                    }
                    
                    if (t.type === 'INCOME') {
                        if (t.status === 'COMPLETED') {
                            if (t.category && t.category.startsWith('__ADVANCE__')) {
                                feesMap[sId].advance += t.amount;
                            } else if (!t.isExcludedFromSummary) {
                                feesMap[sId].totalPaid += t.amount;
                            }
                        } else if (t.status === 'PENDING' && !t.isExcludedFromSummary) {
                            feesMap[sId].totalDue += t.amount;
                        }
                    }
                });
                
                setFeesData(feesMap);
            })
            .catch(err => console.error("Error fetching fees data:", err))
            .finally(() => setLoadingFees(false));
    };

    useEffect(() => {
        if (viewMode === 'FEES_COLLECT' && !feesData && activeInstitute?.id) {
            const syncKey = `sync_${activeInstitute.id}`;
            if (!sessionStorage.getItem(syncKey)) {
                sessionStorage.setItem(syncKey, 'true');
                fetch('/api/admin/accounts/sync-dues', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instituteId: activeInstitute.id })
                })
                .then(() => fetchFeesData())
                .catch(err => {
                    console.error('Failed to sync dues:', err);
                    sessionStorage.removeItem(syncKey);
                    fetchFeesData();
                });
            } else {
                fetchFeesData();
            }
        }
    }, [viewMode, activeInstitute?.id]);

    // Handle scanner results and external scan events (from StudentProfileModal)
    const handleScanResult = async (scannedValue: string) => {
        const cleanedValue = scannedValue.trim();
        setIsSearchingStudent(true);
        try {
            // Try local list first
            const local = students.find(s => String(s.metadata?.studentId || s.id) === cleanedValue);
            if (local) {
                setSelectedStudentForFee({
                    studentId: local.id,
                    studentName: local.name,
                    studentUniqueId: local.metadata?.studentId || local.id,
                    studentPhoto: local.metadata?.studentPhoto || local.metadata?.photo || null,
                    items: [],
                    totalAmount: 0
                });
                setIsFeeModalOpen(true);
                setShowScanner(false);
                return;
            }

            if (!activeInstitute?.id) {
                await alert('প্রতিষ্ঠান সিলেক্ট করা নেই।');
                return;
            }

            const res = await fetch(`/api/admin/users?instituteId=${activeInstitute.id}&search=${encodeURIComponent(cleanedValue)}`);
            if (res.ok) {
                const data = await res.json();
                const s = Array.isArray(data) ? data[0] : data;
                if (s) {
                    setSelectedStudentForFee({
                        studentId: s.id,
                        studentName: s.name,
                        studentUniqueId: s.metadata?.studentId || s.id,
                        studentPhoto: s.metadata?.studentPhoto || s.metadata?.photo || null,
                        items: [],
                        totalAmount: 0
                    });
                    setIsFeeModalOpen(true);
                    setShowScanner(false);
                    return;
                }
            }

            await alert(`শিক্ষার্থী নম্বর: ${cleanedValue} পাওয়া যায়নি`);
        } catch (error) {
            console.error('Error searching student:', error);
            await alert('ছাত্র খুঁজতে একটি ত্রুটি হয়েছে।');
        } finally {
            setIsSearchingStudent(false);
            setShowScanner(false);
        }
    };

    useEffect(() => {
        const handler = (evt: any) => {
            const detail = evt?.detail || {};
            if (detail.student) {
                const s = detail.student;
                setSelectedStudentForFee({
                    studentId: s.id,
                    studentName: s.name,
                    studentUniqueId: s.metadata?.studentId || s.id,
                    studentPhoto: s.metadata?.studentPhoto || s.metadata?.photo || null,
                    items: [],
                    totalAmount: 0
                });
                setIsFeeModalOpen(true);
                return;
            }
            if (detail.studentId) {
                // Delegate to scanner handler
                handleScanResult(String(detail.studentId));
            }
        };
        window.addEventListener('openFeeCollection', handler as EventListener);
        return () => window.removeEventListener('openFeeCollection', handler as EventListener);
    }, [students, activeInstitute?.id]);

    const openPrintPreview = () => {
        try {
            const payload = {
                students: students || [],
                columns: tableColumns || {},
                customColumns: customColumns || [],
                classes: classes || [],
                groups: groups || [],
                institute: activeInstitute || null,
                selectedClassId,
                selectedGroupId,
                title: `${activeInstitute?.name || 'Institute'} - শিক্ষার্থী তালিকা (${new Date().toLocaleDateString('bn-BD')})`,
                timestamp: Date.now()
            };
            // Open as modal overlay instead of new page
            setPrintPreviewPayload(payload);
            setShowPrintModal(true);
        } catch (err) {
            console.error('Open print preview error:', err);
            setToast({ message: 'প্রিভিউ খুলতে ব্যর্থ হয়েছে।', type: 'error' });
        }
    };

    useEffect(() => {
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

        // Auto-extract face if it's explicitly a face capture photo (left or right).
        // Profile image ('studentPhoto') manual upload should not override face data.
        if ((fieldId === 'studentPhotoLeft' || fieldId === 'studentPhotoRight') && isFaceModelLoaded) {
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

    const handleOfflineFaceCapture = async (data: { descriptors: number[][], middleImageBase64?: string, previewLeft?: string, previewMiddle?: string, previewRight?: string }) => {
        // Save descriptors temporarily so we can send them when saving the student
        setFormData((prev: any) => ({
            ...prev,
            metadata: {
                ...prev.metadata,
                faceDescriptors: data.descriptors
            }
        }));
        
        // Function to upload base64
        const uploadBase64 = async (base64: string, fieldId: string) => {
            try {
                const res = await fetch(base64);
                const blob = await res.blob();
                const file = new File([blob], `${fieldId}.jpg`, { type: 'image/jpeg' });
                const fakeEvent = { target: { files: [file] } } as any;
                await handleFileUpload(fakeEvent, fieldId);
            } catch(e) { console.error('Failed to upload captured face', e); }
        };

        if (data.previewLeft) await uploadBase64(data.previewLeft, 'studentPhotoLeft');
        if (data.previewMiddle || data.middleImageBase64) await uploadBase64(data.previewMiddle || data.middleImageBase64!, 'studentPhoto');
        if (data.previewRight) await uploadBase64(data.previewRight, 'studentPhotoRight');
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

            const isLoginEmpty = !finalEmail && !finalPhone && !gPhone;
            const shouldSkipAccount = formData.skipAccountSetup || isLoginEmpty;

            // Build the final faceDescriptor payload
            let finalFaceDescriptor = formData.faceDescriptor || [];
            
            // Prefer explicitly captured descriptors from OfflineFaceCapture
            if (formData.metadata?.faceDescriptors && formData.metadata.faceDescriptors.length > 0) {
                finalFaceDescriptor = formData.metadata.faceDescriptors;
            } else if (formData.faceDescriptorMiddle || formData.faceDescriptorLeft || formData.faceDescriptorRight) {
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
                skipAccountSetup: shouldSkipAccount,
                faceDescriptor: finalFaceDescriptor,
                metadata: editingStudent?.metadata?.admissionStatus === 'PENDING'
                    ? { ...cleanedMetadata, skipAccountSetup: shouldSkipAccount, admissionStatus: 'APPROVED', admissionDate: new Date().toISOString(), status: 'ACTIVE', statusLastChangedAt: new Date().toISOString(), statusHistory: [{ status: 'ACTIVE', timestamp: new Date().toISOString(), changedBy: currentUser?.name || 'System (Admission)', reason: 'প্রবেশাধিকার (Admission)' }] }
                    : (editingStudent ? { ...cleanedMetadata, skipAccountSetup: shouldSkipAccount } : { ...cleanedMetadata, skipAccountSetup: shouldSkipAccount, admissionStatus: 'APPROVED', admissionDate: new Date().toISOString(), status: 'ACTIVE', statusLastChangedAt: new Date().toISOString(), statusHistory: [{ status: 'ACTIVE', timestamp: new Date().toISOString(), changedBy: currentUser?.name || 'System (Creation)', reason: 'প্রবেশাধিকার (Admission)' }] }),
                instituteIds: editingStudent ? undefined : [activeInstitute.id] // only for POST
            };

            // Clean temporary keys from payload to prevent DB clutter
            delete (payload as any).faceDescriptorMiddle;
            delete (payload as any).faceDescriptorLeft;
            delete (payload as any).faceDescriptorRight;

            const url = '/api/admin/users';
            const method = editingStudent ? 'PATCH' : 'POST';

            const res = await fetchWithSync(url, {
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

    const handleInlineEditSave = async (studentId: string, fieldId: string, newValue: any) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        // Optimistic update
        setStudents(prev => prev.map(s => {
            if (s.id !== studentId) return s;
            if (fieldId === 'name' || fieldId === 'phone' || fieldId === 'email') {
                return { ...s, [fieldId]: newValue };
            }
            return {
                ...s,
                metadata: {
                    ...(s.metadata || {}),
                    [fieldId]: newValue
                }
            };
        }));
        setEditingCell(null);

        try {
            const payload: any = { id: studentId };
            if (fieldId === 'name' || fieldId === 'phone' || fieldId === 'email') {
                payload[fieldId] = newValue;
            } else {
                payload.metadata = {
                    ...(student.metadata || {}),
                    [fieldId]: newValue
                };
            }

            const res = await fetchWithSync('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                // Revert on fail
                setStudents(prev => prev.map(s => s.id === studentId ? student : s));
                setToast({ message: 'আপডেট ব্যর্থ হয়েছে।', type: 'error' });
            } else {
                setToast({ message: 'আপডেট করা হয়েছে!', type: 'success' });
            }
        } catch (error) {
            console.error('Inline edit failed:', error);
            // Revert on fail
            setStudents(prev => prev.map(s => s.id === studentId ? student : s));
            setToast({ message: 'সার্ভার এরর।', type: 'error' });
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
            const res = await fetchWithSync(`/api/admin/users?id=${id}`, { method: 'DELETE' });
            if (res.ok || (res as any).queued) {
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
                res = await fetchWithSync(`/api/admin/users?id=${studentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: 'STUDENT',
                        metadata: { ...student.metadata, admissionStatus: 'APPROVED', admissionDate: new Date().toISOString(), status: 'ACTIVE', statusLastChangedAt: new Date().toISOString(), statusHistory: [{ status: 'ACTIVE', timestamp: new Date().toISOString(), changedBy: currentUser?.name || 'System (Approval)', reason: 'প্রবেশাধিকার (Admission)' }] }
                    })
                });
            } else {
                // Reject means delete
                res = await fetchWithSync(`/api/admin/users?id=${studentId}`, {
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

            const res = await fetchWithSync(url, {
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
            const res = await fetchWithSync(`/api/admin/groups/${id}`, {
                method: 'DELETE'
            });
            if (res.ok || (res as any).queued) {
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
        <div className="p-3 sm:p-4 md:p-8 space-y-3 sm:space-y-4 animate-fade-in-up font-bengali w-full min-w-0 overflow-x-hidden">


            {/* Utility Bar (Search, Action, Library, Public Link) */}
            <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none text-slate-800 text-sm sm:text-base font-medium shadow-sm placeholder:text-slate-400"
                        placeholder="খুঁজুন..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {activeTab === 'students' && (
                    <div className="flex items-center gap-2 shrink-0 z-[200]">
                        {/* View Mode Toggle Button */}
                        <button
                            onClick={() => {
                                const modes = ['DEFAULT', 'FEES_COLLECT', 'ADMISSION'] as const;
                                const currentIndex = modes.indexOf(optimisticViewMode as any);
                                const nextIndex = (currentIndex + 1) % modes.length;
                                const nextMode = modes[nextIndex];
                                
                                setOptimisticViewMode(nextMode);
                                startTransition(() => {
                                    setViewMode(nextMode);
                                });
                            }}
                            className="flex items-center gap-1.5 sm:gap-2 bg-[#045c84]/5 border border-[#045c84]/20 px-3 sm:px-4 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-[#045c84] shadow-sm cursor-pointer hover:bg-[#045c84]/10 transition-all focus:outline-none shrink-0"
                            title="পরিবর্তন করতে ক্লিক করুন"
                        >
                            <span className="flex items-center gap-1.5">
                                {optimisticViewMode === 'DEFAULT' ? <><Users size={16} className="hidden sm:block" /> স্ট্যান্ডার্ড</> : optimisticViewMode === 'FEES_COLLECT' ? <><Wallet size={16} className="hidden sm:block" /> ফিস কালেকশন</> : <><UserPlus size={16} className="hidden sm:block" /> ভর্তি মোড</>}
                            </span>
                        </button>

                        {/* Status Filter Dropdown */}
                        <details className="relative shrink-0 group">
                            <summary className="list-none flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200 px-3 sm:px-4 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 shadow-sm cursor-pointer hover:border-[#045c84] hover:text-[#045c84] transition-all focus:outline-none">
                                <span className="flex items-center gap-1.5">
                                    {statusFilter === 'ACTIVE' && <><span className="w-2 h-2 rounded-full bg-emerald-500 hidden sm:inline-block"></span> সক্রিয়</>}
                                    {statusFilter === 'INACTIVE' && <><span className="w-2 h-2 rounded-full bg-rose-500 hidden sm:inline-block"></span> নিষ্ক্রিয়</>}
                                    {statusFilter === 'ALL' && <><span className="w-2 h-2 rounded-full bg-slate-500 hidden sm:inline-block"></span> সকল</>}
                                </span>
                                <ChevronDown size={16} className="text-slate-400 group-open:rotate-180 transition-transform ml-1" />
                            </summary>
                            
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
                                            const details = document.querySelectorAll('details.group[open]');
                                            details.forEach(d => d.removeAttribute('open'));
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
                        {/* Print Preview Button */}
                        <button
                            onClick={() => openPrintPreview()}
                            className="flex items-center gap-2 bg-white border border-slate-200 px-3 sm:px-4 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 shadow-sm cursor-pointer hover:border-[#045c84] hover:text-[#045c84] transition-all focus:outline-none"
                            title="প্রিভিউ ও প্রিন্ট"
                        >
                            <Printer size={16} />
                            <span className="hidden sm:inline-block">প্রিন্ট</span>
                        </button>
                    </div>
                )}
            </div>




            {/* Class & Group Tabs */}
            <div className="sticky top-0 z-[100] bg-slate-50 py-3 space-y-4 shadow-sm transition-all w-full min-w-0">
                {/* Class Dropdown */}
                <div className="flex items-center gap-2 relative z-[110] w-full">

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
                <div className="w-full relative">
                    <div className="flex items-center justify-between gap-4 w-full overflow-x-auto custom-scrollbar pb-1">
                        <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-2xl shrink-0 w-max">
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

                        {/* Column Visibility Dropdown Button */}
                        {activeTab === 'students' && viewMode === 'ADMISSION' && (
                            <div className="shrink-0">
                                <button 
                                    onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                                    className="flex items-center gap-2 bg-white border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 shadow-sm cursor-pointer hover:border-[#045c84] hover:text-[#045c84] transition-all focus:outline-none"
                                >
                                    <Settings2 size={16} />
                                    <span className="hidden sm:inline-block">কলাম</span>
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isColumnDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Dropdown Menu - Extracted to prevent clipping */}
                    {activeTab === 'students' && viewMode === 'ADMISSION' && isColumnDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-[205]" onClick={() => setIsColumnDropdownOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-64 z-[210] animate-fade-in">
                                <div 
                                    className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex flex-col gap-1 overflow-y-auto pointer-events-auto custom-scrollbar" 
                                    style={{ maxHeight: '50vh' }}
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                >
                                    {[
                                        { id: 'sl', label: 'ক্র.নং' },
                                        { id: 'rollNumber', label: 'রোল' },
                                        { id: 'studentId', label: 'আইডি' },
                                        { id: 'student', label: 'শিক্ষার্থী' },
                                        { id: 'className', label: 'ক্লাস ও গ্রুপ' },
                                        { id: 'contact', label: 'যোগাযোগ' },
                                        ...POSSIBLE_FIELDS.filter(f => !['name', 'email', 'studentPhone', 'classId', 'groupId', 'rollNumber', 'studentId', 'studentPhoto', 'guardianPhone', 'guardianPassword', 'password', 'fathersPhone', 'mothersPhone'].includes(f.id)).map(f => ({ id: f.id, label: f.label })),
                                        ...customColumns,
                                        { id: 'action', label: 'অ্যাকশন' }
                                    ].map((col) => (
                                        <label key={col.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={(tableColumns as any)[col.id]}
                                                onChange={(e) => {
                                                    setTableColumns(prev => ({ ...prev, [col.id]: e.target.checked }));
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-[#045c84] focus:ring-[#045c84]"
                                            />
                                            <span className="text-sm font-medium text-slate-700">{col.label}</span>
                                        </label>
                                    ))}
                                    
                                    <div className="pt-2 mt-1 border-t border-slate-100 sticky bottom-0 bg-white z-10">
                                        <button 
                                            onClick={() => {
                                                setIsCustomFieldModalOpen(true);
                                                setIsColumnDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#045c84] hover:bg-slate-50 rounded-lg transition-colors border border-dashed border-blue-200"
                                        >
                                            <Plus size={14} />
                                            নতুন কাস্টম ফিল্ড
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
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
                        {viewMode === 'ADMISSION' ? (
                            <div 
                                ref={tableContainerRef}
                                onMouseDown={handleMouseDown}
                                onMouseLeave={handleMouseLeave}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                data-lenis-prevent="true"
                                className={`overflow-auto overscroll-none w-full max-h-[calc(100vh-280px)] custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-300 relative ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                            >
                                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleDirectImageUpload} />
                                <table className="w-full text-left border-collapse bg-white rounded-2xl shadow-sm min-w-[800px] [&_th]:border [&_th]:border-slate-200 [&_td]:border [&_td]:border-slate-200">
                                    <thead className="bg-slate-50 sticky top-0 z-20 border-b border-[#045c84]/10 shadow-sm">
                                        <tr>
                                            {tableColumns.sl && <th className="py-4 px-3 text-xs font-black text-[#045c84] whitespace-nowrap w-[1%] text-center select-none">ক্র.নং</th>}
                                            {tableColumns.rollNumber && <th onClick={() => handleSort('rollNumber')} className="py-4 px-3 text-xs font-black text-[#045c84] whitespace-nowrap w-[10px] min-w-[10px] text-center cursor-pointer hover:bg-[#045c84]/10 transition-colors select-none">রোল<SortIcon field="rollNumber" /></th>}
                                            {tableColumns.studentId && <th onClick={() => handleSort('studentId')} className="py-4 px-3 text-xs font-black text-[#045c84] whitespace-nowrap w-[1%] text-center cursor-pointer hover:bg-[#045c84]/10 transition-colors select-none">আইডি<SortIcon field="studentId" /></th>}
                                            {viewMode === 'ADMISSION' && <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap w-[1%] text-center select-none">ছবি</th>}
                                            {tableColumns.student && <th onClick={() => handleSort('name')} className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap w-[1%] text-center cursor-pointer hover:bg-[#045c84]/10 transition-colors select-none">শিক্ষার্থী<SortIcon field="name" /></th>}
                                            {tableColumns.className && <th onClick={() => handleSort('classId')} className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap text-center cursor-pointer hover:bg-[#045c84]/10 transition-colors select-none">ক্লাস ও গ্রুপ<SortIcon field="classId" /></th>}
                                            {tableColumns.contact && <th className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap min-w-[160px] text-center select-none">যোগাযোগ</th>}
                                            {POSSIBLE_FIELDS.filter(f => !['name', 'email', 'studentPhone', 'classId', 'groupId', 'rollNumber', 'studentId', 'studentPhoto', 'guardianPhone', 'guardianPassword', 'password', 'fathersPhone', 'mothersPhone'].includes(f.id)).map(f => tableColumns[f.id] && (
                                                <th key={f.id} onClick={() => handleSort(f.id)} className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap text-center cursor-pointer hover:bg-[#045c84]/10 transition-colors select-none">{f.label}<SortIcon field={f.id} /></th>
                                            ))}
                                            {customColumns.map(f => tableColumns[f.id] && (
                                                <th key={f.id} onClick={() => handleSort(f.id)} className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap text-center cursor-pointer hover:bg-[#045c84]/10 transition-colors select-none">{f.label}<SortIcon field={f.id} /></th>
                                            ))}
                                            {tableColumns.action && (
                                                <th 
                                                    onClick={() => setShowAllActionsInline(prev => !prev)}
                                                    className="p-4 text-xs font-black text-[#045c84] whitespace-nowrap text-center select-none cursor-pointer hover:bg-[#045c84]/10 transition-colors"
                                                    title="সব অপশন একসাথে দেখুন"
                                                >
                                                    অ্যাকশন {showAllActionsInline ? '(-)' : '(+)'}
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {students
                                            .filter(s => {
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
                                            .slice().sort((a, b) => {
                                                let aVal: any, bVal: any;
                                                if (sortField === 'name') { aVal = a.name || ''; bVal = b.name || ''; }
                                                else if (sortField === 'rollNumber') { aVal = Number(a.metadata?.rollNumber) || 0; bVal = Number(b.metadata?.rollNumber) || 0; }
                                                else if (sortField === 'studentId') { aVal = a.metadata?.studentId || ''; bVal = b.metadata?.studentId || ''; }
                                                else if (sortField === 'classId') { aVal = classes.find(c => c.id === a.metadata?.classId)?.name || ''; bVal = classes.find(c => c.id === b.metadata?.classId)?.name || ''; }
                                                else { aVal = a.metadata?.[sortField] || ''; bVal = b.metadata?.[sortField] || ''; }
                                                if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
                                                if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
                                                return 0;
                                            })
                                            .map((s, index) => {
                                                const colors = ['bg-orange-500', 'bg-yellow-400', 'bg-teal-500', 'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];
                                                const colorIndex = s.name ? s.name.length % colors.length : 0;
                                                const bgColor = colors[colorIndex];
                                                
                                                return (
                                                    <tr 
                                                        key={s.id} 
                                                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                                        onClick={() => { 
                                                            if (!isTableEditMode) {
                                                                setSelectedStudent(s); setIsProfileModalOpen(true); 
                                                            }
                                                        }}
                                                    >
                                                        {tableColumns.sl && <td className="py-4 px-3 w-[1%] whitespace-nowrap text-center">
                                                            <span className="text-xs font-bold text-slate-700 block w-6 mx-auto">{index + 1}</span>
                                                        </td>}
                                                        {tableColumns.rollNumber && <td 
                                                            className={`py-4 px-3 w-[10px] min-w-[10px] whitespace-nowrap text-center ${isTableEditMode ? 'cursor-cell hover:bg-slate-100' : ''}`}
                                                            onClick={(e) => {
                                                                if (isTableEditMode) {
                                                                    e.stopPropagation();
                                                                    setEditingCell({ studentId: s.id, fieldId: 'rollNumber' });
                                                                }
                                                            }}
                                                        >
                                                            {editingCell?.studentId === s.id && editingCell?.fieldId === 'rollNumber' ? (
                                                                <EditableCell 
                                                                    value={s.metadata?.rollNumber} 
                                                                    type="number" 
                                                                    onSave={(val) => handleInlineEditSave(s.id, 'rollNumber', val)} 
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-700">{s.metadata?.rollNumber || '-'}</span>
                                                            )}
                                                        </td>}
                                                        {tableColumns.studentId && <td 
                                                            className={`py-4 px-3 w-[1%] whitespace-nowrap text-center ${isTableEditMode ? 'cursor-cell hover:bg-slate-100' : ''}`}
                                                            onClick={(e) => {
                                                                if (isTableEditMode) {
                                                                    e.stopPropagation();
                                                                    setEditingCell({ studentId: s.id, fieldId: 'studentId' });
                                                                }
                                                            }}
                                                        >
                                                            {editingCell?.studentId === s.id && editingCell?.fieldId === 'studentId' ? (
                                                                <EditableCell 
                                                                    value={s.metadata?.studentId || s.id.substring(0, 6)} 
                                                                    type="text" 
                                                                    onSave={(val) => handleInlineEditSave(s.id, 'studentId', val)} 
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-700">{s.metadata?.studentId || s.id.substring(0, 6)}</span>
                                                            )}
                                                        </td>}
                                                        {viewMode === 'ADMISSION' && (
                                                            <td className="p-4 w-[1%] whitespace-nowrap text-center">
                                                                <div 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setUploadingStudentId(s.id);
                                                                        fileInputRef.current?.click();
                                                                    }}
                                                                    className={`w-10 h-10 rounded-full ${bgColor} border-[0.5px] border-slate-600 shadow-sm overflow-hidden flex items-center justify-center text-white font-bold text-sm relative shrink-0 mx-auto group-hover:scale-105 transition-transform cursor-pointer`}
                                                                >
                                                                    <span className="absolute inset-0 flex items-center justify-center z-0">{s.name?.[0] || 'S'}</span>
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
                                                            </td>
                                                        )}
                                                        {tableColumns.student && <td 
                                                            className={`p-4 w-[1%] whitespace-nowrap ${isTableEditMode ? 'cursor-cell hover:bg-slate-100' : ''}`}
                                                            onClick={(e) => {
                                                                if (isTableEditMode) {
                                                                    e.stopPropagation();
                                                                    setEditingCell({ studentId: s.id, fieldId: 'name' });
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {viewMode !== 'ADMISSION' && (
                                                                    <div 
                                                                        onClick={(e) => {
                                                                            if (!isTableEditMode) {
                                                                                e.stopPropagation();
                                                                                setUploadingStudentId(s.id);
                                                                                fileInputRef.current?.click();
                                                                            }
                                                                        }}
                                                                        className={`w-10 h-10 rounded-full ${bgColor} border-[0.5px] border-slate-600 shadow-sm overflow-hidden flex items-center justify-center text-white font-bold text-sm relative shrink-0 group-hover:scale-105 transition-transform ${!isTableEditMode ? 'cursor-pointer' : ''}`}
                                                                    >
                                                                        <span className="absolute inset-0 flex items-center justify-center z-0">{s.name?.[0] || 'S'}</span>
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
                                                                )}
                                                                <div className="flex-1">
                                                                    {editingCell?.studentId === s.id && editingCell?.fieldId === 'name' ? (
                                                                        <EditableCell 
                                                                            value={s.name} 
                                                                            type="text" 
                                                                            onSave={(val) => handleInlineEditSave(s.id, 'name', val)} 
                                                                        />
                                                                    ) : (
                                                                        <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{s.name}</h3>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>}
                                                        {tableColumns.className && <td 
                                                            className={`p-4 whitespace-nowrap ${isTableEditMode ? 'cursor-cell hover:bg-slate-100' : ''}`}
                                                            onClick={(e) => {
                                                                if (isTableEditMode) {
                                                                    e.stopPropagation();
                                                                    if (editingCell?.studentId === s.id && editingCell?.fieldId === 'classId') {
                                                                        setEditingCell(null);
                                                                    } else {
                                                                        setEditingCell({ studentId: s.id, fieldId: 'classId' });
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {editingCell?.studentId === s.id && editingCell?.fieldId === 'classId' ? (
                                                                <EditableCell 
                                                                    value={s.metadata?.classId} 
                                                                    type="select" 
                                                                    options={classes}
                                                                    onSave={(val) => handleInlineEditSave(s.id, 'classId', val)}
                                                                    onClose={() => setEditingCell(null)}
                                                                />
                                                            ) : (
                                                                <div className="text-xs font-bold text-slate-700">
                                                                    {classes.find(c => c.id === s.metadata?.classId)?.name || 'শ্রেণী নেই'}
                                                                    {s.metadata?.groupId ? ` • ${groups.find(g => g.id === s.metadata?.groupId)?.name}` : ''}
                                                                </div>
                                                            )}
                                                        </td>}
                                                        {tableColumns.contact && <td 
                                                            className={`p-4 whitespace-nowrap min-w-[160px] ${isTableEditMode ? 'cursor-cell hover:bg-slate-100' : ''}`}
                                                            onClick={(e) => {
                                                                if (isTableEditMode) {
                                                                    e.stopPropagation();
                                                                    setEditingCell({ studentId: s.id, fieldId: 'phone' });
                                                                }
                                                            }}
                                                        >
                                                            {editingCell?.studentId === s.id && editingCell?.fieldId === 'phone' ? (
                                                                <EditableCell 
                                                                    value={s.phone || s.metadata?.phone || s.metadata?.guardianPhone || ''} 
                                                                    type="text" 
                                                                    onSave={(val) => handleInlineEditSave(s.id, 'phone', val)} 
                                                                />
                                                            ) : (
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-slate-700">{s.phone || s.metadata?.phone || s.metadata?.guardianPhone || '-'}</span>
                                                                </div>
                                                            )}
                                                        </td>}
                                                        {POSSIBLE_FIELDS.filter(f => !['name', 'email', 'studentPhone', 'classId', 'groupId', 'rollNumber', 'studentId', 'studentPhoto', 'guardianPhone', 'guardianPassword', 'password', 'fathersPhone', 'mothersPhone'].includes(f.id)).map(f => tableColumns[f.id] && (
                                                            <td 
                                                                key={f.id} 
                                                                className={`p-4 whitespace-nowrap ${isTableEditMode && f.type !== 'attachment' ? 'cursor-cell hover:bg-slate-100' : ''}`}
                                                                onClick={(e) => {
                                                                    if (isTableEditMode && f.type !== 'attachment') {
                                                                        e.stopPropagation();
                                                                        setEditingCell({ studentId: s.id, fieldId: f.id });
                                                                    }
                                                                }}
                                                            >
                                                                {editingCell?.studentId === s.id && editingCell?.fieldId === f.id ? (
                                                                    <EditableCell 
                                                                        value={s.metadata?.[f.id]} 
                                                                        type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : f.type === 'select' ? 'select' : 'text'}
                                                                        options={f.options?.map(o => ({ id: o, name: o }))}
                                                                        onSave={(val) => handleInlineEditSave(s.id, f.id, val)} 
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-medium text-slate-600">
                                                                        {f.type === 'attachment' ? (
                                                                            s.metadata?.[f.id] ? (
                                                                                <a href={s.metadata[f.id]} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">ফাইল</a>
                                                                            ) : '-'
                                                                        ) : (s.metadata?.[f.id] || '-')}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        ))}
                                                        {customColumns.map(f => tableColumns[f.id] && (
                                                            <td 
                                                                key={f.id} 
                                                                className={`p-4 whitespace-nowrap ${isTableEditMode ? 'cursor-cell hover:bg-slate-100' : ''}`}
                                                                onClick={(e) => {
                                                                    if (isTableEditMode) {
                                                                        e.stopPropagation();
                                                                        setEditingCell({ studentId: s.id, fieldId: f.id });
                                                                    }
                                                                }}
                                                            >
                                                                {editingCell?.studentId === s.id && editingCell?.fieldId === f.id ? (
                                                                    <EditableCell 
                                                                        value={s.metadata?.[f.id] || s.metadata?.[f.label]} 
                                                                        type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : f.type === 'select' ? 'select' : 'text'} 
                                                                        onSave={(val) => handleInlineEditSave(s.id, f.id, val)} 
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-medium text-slate-600">
                                                                        {s.metadata?.[f.id] || s.metadata?.[f.label] || '-'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        ))}
                                                        {tableColumns.action && <td className="p-4 text-right">
                                                            {showAllActionsInline ? (
                                                                <div className="flex justify-end items-center gap-1">
                                                                    {canManageClass(s.metadata?.classId) && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const hasGuardian = !!s.metadata?.guardianId;
                                                                                setCredentialsData({
                                                                                    studentPhone: s.email || s.phone || s.metadata?.studentId || 'N/A',
                                                                                    studentPassword: s.password || 'N/A',
                                                                                    guardianPhone: hasGuardian ? (s.metadata?.guardianPhone || 'N/A') : 'N/A',
                                                                                    guardianPassword: hasGuardian ? (s.metadata?.guardianPassword || 'N/A') : 'N/A'
                                                                                });
                                                                                setIsCredentialsModalOpen(true);
                                                                            }}
                                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                            title="লগইন তথ্য"
                                                                        >
                                                                            <Key size={16} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${s.phone || s.metadata?.studentPhone || s.metadata?.guardianPhone}`; }}
                                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                        title="কল করুন"
                                                                    >
                                                                        <Phone size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); window.location.href = `sms:${s.phone || s.metadata?.studentPhone || s.metadata?.guardianPhone}`; }}
                                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                        title="মেসেজ পাঠান"
                                                                    >
                                                                        <MessageSquare size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); const phone = s.phone || s.metadata?.studentPhone || s.metadata?.guardianPhone; window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank'); }}
                                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                        title="হোয়াটসঅ্যাপ"
                                                                    >
                                                                        <MessageCircle size={16} />
                                                                    </button>
                                                                    {canManageClass(s.metadata?.classId) && selectedGroupId !== 'all' && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleRemoveFromGroup(s); }}
                                                                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                                            title="গ্রুপ থেকে বাদ দিন"
                                                                        >
                                                                            <FileX size={16} />
                                                                        </button>
                                                                    )}
                                                                    {canManageClass(s.metadata?.classId) && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteStudent(s.id); }}
                                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                            title="মুছে ফেলুন"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-end items-center gap-2">
                                                                    {(s.phone || s.metadata?.phone || s.metadata?.guardianPhone) && (
                                                                        <a
                                                                            href={`tel:${s.phone || s.metadata?.phone || s.metadata?.guardianPhone}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                                            title="কল করুন"
                                                                        >
                                                                            <Phone size={18} />
                                                                        </a>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            const menuHeight = 280; 
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
                                                                        <MoreVertical size={18} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>}
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                        <div className="overflow-y-auto overscroll-none max-h-[calc(100vh-280px)] custom-scrollbar" data-lenis-prevent="true">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
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
                                .map((s, index) => {
                                    const isFeesMode = viewMode === 'FEES_COLLECT';
                                    
                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => {
                                                if (isFeesMode) {
                                                    setSelectedStudentForFee({
                                                        studentId: s.id,
                                                        studentName: s.name,
                                                        studentUniqueId: s.metadata?.studentId || s.id,
                                                        studentPhoto: s.metadata?.studentPhoto || null,
                                                        items: [],
                                                        totalAmount: 0
                                                    });
                                                    setIsFeeModalOpen(true);
                                                } else {
                                                    setSelectedStudent(s);
                                                    setIsProfileModalOpen(true);
                                                }
                                            }}
                                            className={`bg-white p-3.5 rounded-[24px] border shadow-sm transition-all flex items-center gap-3 md:gap-4 relative group cursor-pointer animate-staggered-fade-in w-full min-w-[280px] overflow-hidden ${
                                                isFeesMode ? 'border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100/50 hover:bg-emerald-50/10' : 'border-slate-100 hover:shadow-lg hover:border-blue-100'
                                            }`}
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

                                                {isFeesMode ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                            <span>ID: {s.metadata?.studentId || '-'}</span>
                                                        </div>
                                                        {s.metadata?.feeTier && s.metadata.feeTier !== 'full' && (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                s.metadata.feeTier === 'half' ? 'bg-amber-100 text-amber-700' :
                                                                s.metadata.feeTier === 'free' ? 'bg-emerald-100 text-emerald-700' : ''
                                                            }`}>
                                                                {s.metadata.feeTier === 'half' ? 'অর্ধ ফি' : 'বিনামূল্যে'}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
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
                                                    </>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {isFeesMode ? (
                                                    <div className="flex items-center gap-3">
                                                        {loadingFees ? (
                                                            <div className="h-10 w-20 bg-slate-50 animate-pulse rounded-lg"></div>
                                                        ) : (
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                {(feesData?.[s.id]?.totalDue || 0) > 0 && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">বকেয়া:</span>
                                                                        <span className="text-sm font-black text-rose-600 leading-none">
                                                                            ৳{feesData?.[s.id]?.totalDue?.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {(feesData?.[s.id]?.totalPaid || 0) > 0 && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">পরিশোধ:</span>
                                                                        <span className="text-sm font-black text-emerald-600 leading-none">
                                                                            ৳{feesData?.[s.id]?.totalPaid?.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {(feesData?.[s.id]?.advance || 0) > 0 && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">অগ্রিম:</span>
                                                                        <span className="text-sm font-black text-amber-600 leading-none">
                                                                            ৳{feesData?.[s.id]?.advance?.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {!((feesData?.[s.id]?.totalDue || 0) > 0) && !((feesData?.[s.id]?.totalPaid || 0) > 0) && !((feesData?.[s.id]?.advance || 0) > 0) && (
                                                                    <span className="text-xs font-bold text-slate-400">
                                                                        কোনো রেকর্ড নেই
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {(s.phone || s.metadata?.phone || s.metadata?.guardianPhone) && (
                                                            <a
                                                                href={`tel:${s.phone || s.metadata?.phone || s.metadata?.guardianPhone}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 rounded-xl transition-all shrink-0 shadow-sm"
                                                                title="কল করুন"
                                                            >
                                                                <Phone size={16} />
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
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
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                        </div>
                        )}
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
                    setActiveFormTab('student');
                }}
                title={editingStudent ? "শিক্ষার্থীর তথ্য আপডেট করুন" : "নতুন শিক্ষার্থী যুক্ত করুন"}
                maxWidth="max-w-3xl"
            >
                <form onSubmit={handleFormSubmit} className="p-5 md:p-8 space-y-6">
                    {/* Quick Action Toolbar */}
                    {activeFormTab === 'student' && !editingStudent && (
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
                                    const LOGIN_FIELD_IDS = ['email', 'password', 'studentPhone', 'guardianPhone', 'guardianPassword'];
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
                                                            {field.id === 'studentPhoto' && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setIsFaceEnrollmentModalOpen(true);
                                                                    }}
                                                                    className={`mt-3 flex items-center justify-between p-2 border rounded-[16px] w-[120px] transition-all group ${
                                                                        formData.metadata?.faceDescriptors 
                                                                            ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                                                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                                                    }`}
                                                                >
                                                                    <div className="flex flex-col items-start gap-0.5">
                                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Face Data</span>
                                                                        {formData.metadata?.faceDescriptors ? (
                                                                            <span className="flex items-center gap-1 text-[10px] font-black text-green-600">
                                                                                <CheckCircle2 size={12} />
                                                                                Added
                                                                            </span>
                                                                        ) : (
                                                                            <span className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                                                                                <XCircle size={12} />
                                                                                Pending
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                                                        formData.metadata?.faceDescriptors ? 'bg-green-200 text-green-700' : 'bg-white shadow-sm border border-slate-200 text-[#045c84] group-hover:bg-[#045c84] group-hover:border-[#045c84] group-hover:text-white'
                                                                    }`}>
                                                                        <Camera size={12} />
                                                                    </div>
                                                                </button>
                                                            )}
                                                        </div>
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
                                            {/* Form Tabs */}
                                            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl mb-8 sticky top-0 z-40 shrink-0 overflow-x-auto custom-scrollbar">
                                                {[
                                                    { id: 'student', label: 'শিক্ষার্থীর তথ্য', icon: User },
                                                    { id: 'academic', label: 'একাডেমিক তথ্য', icon: BookOpen },
                                                    { id: 'guardian', label: 'অভিভাবকের তথ্য', icon: Users },
                                                    { id: 'documents', label: 'নথিপত্র', icon: FileUp },
                                                    { id: 'fees', label: 'ফি ও লগইন', icon: Key },
                                                ].map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setActiveFormTab(tab.id as any)}
                                                        className={`flex-1 min-w-[120px] py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-2 ${activeFormTab === tab.id ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}`}
                                                    >
                                                        <tab.icon size={16} />
                                                        <span className="whitespace-nowrap">{tab.label}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {activeFormTab === 'student' && (
                                                <div className="space-y-8">
                                                    {renderField('name')}
                                                    {renderField('studentPhoto')}
                                                    {effectiveFields.filter(f => f.type !== 'attachment' && f.id !== 'studentPhoto' && !['classId', 'groupId', 'studentId', 'rollNumber', 'session', 'admissionDate', 'previousSchool', 'previousResult', 'guardianName', 'guardianPhone', 'guardianRelation', 'guardianOccupation', 'yearlyIncome', 'guardianNid', 'fathersName', 'fathersPhone', 'mothersName', 'mothersPhone'].includes(f.id)).map(f => renderField(f.id))}
                                                </div>
                                            )}

                                            {activeFormTab === 'academic' && (
                                                <div className="space-y-8">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {renderField('classId', true)}
                                                        {renderField('groupId')}
                                                        {renderField('studentId')}
                                                        {renderField('rollNumber')}
                                                    </div>
                                                    {effectiveFields.filter(f => ['session', 'admissionDate', 'previousSchool', 'previousResult'].includes(f.id)).map(f => renderField(f.id))}
                                                </div>
                                            )}

                                            {activeFormTab === 'guardian' && (
                                                <div className="space-y-8">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {effectiveFields.filter(f => ['guardianName', 'guardianPhone', 'guardianRelation', 'guardianOccupation', 'yearlyIncome', 'guardianNid', 'fathersName', 'fathersPhone', 'mothersName', 'mothersPhone'].includes(f.id)).map((field) => (
                                                            <React.Fragment key={field.id}>
                                                                {field.id === 'guardianName' && (
                                                                    <div className="md:col-span-2 flex gap-2 mb-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (formData.metadata.fathersName || formData.metadata.fathersPhone) {
                                                                                    setFormData({
                                                                                        ...formData,
                                                                                        metadata: { ...formData.metadata, guardianName: formData.metadata.fathersName || formData.metadata.guardianName, guardianPhone: formData.metadata.fathersPhone || formData.metadata.guardianPhone, guardianRelation: 'বাবা' }
                                                                                    });
                                                                                } else setToast({ message: 'পিতার তথ্য আগে পূরণ করুন।', type: 'error' });
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
                                                                                        metadata: { ...formData.metadata, guardianName: formData.metadata.mothersName || formData.metadata.guardianName, guardianPhone: formData.metadata.mothersPhone || formData.metadata.guardianPhone, guardianRelation: 'মা' }
                                                                                    });
                                                                                } else setToast({ message: 'মাতার তথ্য আগে পূরণ করুন।', type: 'error' });
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

                                            {activeFormTab === 'documents' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {effectiveFields.filter(f => f.type === 'attachment' && f.id !== 'studentPhoto').map(f => renderField(f.id))}
                                                </div>
                                            )}

                                            {activeFormTab === 'fees' && (
                                                <div className="space-y-8">
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
                                                                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => setLoginType('student')} 
                                                                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${loginType === 'student' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                                    >
                                                                        <User size={16} />
                                                                        শিক্ষার্থীর লগইন
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => setLoginType('guardian')} 
                                                                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${loginType === 'guardian' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                                    >
                                                                        <User size={16} />
                                                                        অভিভাবকের লগইন
                                                                    </button>
                                                                </div>

                                                                {loginType === 'student' ? (
                                                                    <div className="grid grid-cols-1 gap-4 animate-fade-in">
                                                                        {renderField('studentPhone', true)}
                                                                        {renderField('password')}
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 gap-4 animate-fade-in">
                                                                        {renderField('guardianPhone', true)}
                                                                        {renderField('guardianPassword')}
                                                                    </div>
                                                                )}
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
                                {(() => {
                                    const tabs: ('student' | 'academic' | 'guardian' | 'documents' | 'fees')[] = ['student', 'academic', 'guardian', 'documents', 'fees'];
                                    const currentIndex = tabs.indexOf(activeFormTab as any);
                                    const handleNext = () => setActiveFormTab(tabs[currentIndex + 1]);
                                    const handleBack = () => setActiveFormTab(tabs[currentIndex - 1]);
                                    return (
                                        <>
                                            {currentIndex > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={handleBack}
                                                    className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    <ChevronLeft size={20} />
                                                    <span>পূর্ববর্তী (Back)</span>
                                                </button>
                                            ) : <div />}
                                            {currentIndex < tabs.length - 1 && (
                                                <button
                                                    type="button"
                                                    onClick={handleNext}
                                                    className="px-8 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 ml-auto mr-4"
                                                >
                                                    <span>পরবর্তী (Next)</span>
                                                    <ChevronRight size={20} />
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}

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
                mounted && pathname?.includes('/dashboard/students') && viewMode !== 'FEES_COLLECT' && (
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
            {/* Floating Scanner Button (visible in fee-collect mode) */}
            {viewMode === 'FEES_COLLECT' && (
                <>
                    <div className="fixed bottom-20 right-6 z-[9998]">
                        <button
                            onClick={() => setShowScanner(true)}
                            title="স্ক্যান"
                            className="w-14 h-14 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            <Scan size={24} />
                        </button>
                    </div>
                    <QRBarcodeScanner
                        isOpen={showScanner}
                        onClose={() => setShowScanner(false)}
                        onScan={handleScanResult}
                    />
                </>
            )}

            {/* Fee Collect Modal */}
            {isFeeModalOpen && selectedStudentForFee && (
                <FeeCollectModal
                    student={selectedStudentForFee}
                    onClose={() => {
                        setIsFeeModalOpen(false);
                        setSelectedStudentForFee(null);
                    }}
                    onSuccess={(msg) => {
                        setIsFeeModalOpen(false);
                        setToast({ message: msg, type: 'success' });
                        fetchFeesData();
                    }}
                    onPrintReceipt={(txn) => {
                        setSelectedTransactionForPrint(txn);
                    }}
                />
            )}

            {/* Print Receipt Modal */}
            {selectedTransactionForPrint && (
                <PrintReceiptModal
                    transaction={selectedTransactionForPrint}
                    onClose={() => setSelectedTransactionForPrint(null)}
                />
            )}

            {/* In-page Print Preview Modal (over entire UI) */}
            {showPrintModal && printPreviewPayload && (
                <StudentPrintPreviewModal
                    payload={printPreviewPayload}
                    onClose={() => { setShowPrintModal(false); setPrintPreviewPayload(null); }}
                />
            )}

            {/* Create Custom Field Modal */}
            {isCustomFieldModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsCustomFieldModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slide-up overflow-hidden flex flex-col font-bengali">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">নতুন কাস্টম ফিল্ড</h2>
                                <p className="text-xs text-slate-500 mt-1">টেবিলের জন্য নতুন কলাম তৈরি করুন</p>
                            </div>
                            <button onClick={() => setIsCustomFieldModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">ফিল্ডের নাম</label>
                                <input
                                    type="text"
                                    value={newCustomColumnLabel}
                                    onChange={(e) => setNewCustomColumnLabel(e.target.value)}
                                    placeholder="যেমন: রক্তের গ্রুপ, উচ্চতা..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#045c84] focus:ring-1 focus:ring-[#045c84] text-slate-800 placeholder:text-slate-400"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddCustomColumn();
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">ফিল্ডের ধরন</label>
                                <select
                                    value={newCustomColumnType}
                                    onChange={(e) => setNewCustomColumnType(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#045c84] focus:ring-1 focus:ring-[#045c84] bg-white cursor-pointer text-slate-800"
                                >
                                    <option value="text">টেক্সট / ছোট লেখা</option>
                                    <option value="number">নম্বর (বয়স, রোল)</option>
                                    <option value="mobile">মোবাইল নম্বর</option>
                                    <option value="date">তারিখ / ক্যালেন্ডার</option>
                                    <option value="attachment">ছবি / ফাইল আপলোড</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setIsCustomFieldModalOpen(false)}
                                className="flex-1 py-3 text-slate-600 font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={handleAddCustomColumn}
                                disabled={!newCustomColumnLabel.trim()}
                                className="flex-1 py-3 bg-[#045c84] text-white font-bold rounded-xl shadow-lg shadow-[#045c84]/20 hover:shadow-xl hover:bg-[#034664] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                তৈরি করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Face Enrollment Modal in Add Student Form */}
            {isFaceEnrollmentModalOpen && (
                <FaceEnrollment
                    studentName={formData.name || 'New Student'}
                    onClose={() => setIsFaceEnrollmentModalOpen(false)}
                    onCaptureOffline={handleOfflineFaceCapture}
                />
            )}
        </div>
    );
}
