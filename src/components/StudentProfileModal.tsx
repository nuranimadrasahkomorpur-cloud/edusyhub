'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, BookOpen, CreditCard, TrendingUp, ChevronRight, User, Edit, ChevronDown, ChevronUp, Printer, Trash2, Loader2, Check, Key, LogIn, Disc, ScanFace, Sparkles, AlertCircle, RefreshCw, Clock, History, Settings, Percent, Camera } from 'lucide-react';
import { useSession } from './SessionProvider';
import { useUI } from './UIProvider';
import dynamic from 'next/dynamic';
import PrintLayout from './PrintLayout';
import { getCleanId } from '@/utils/digit-utils';

const FaceEnrollment = dynamic(() => import('./FaceEnrollment'), { ssr: false });

const BENGALI_MONTHS = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

function TransactionItem({ label, date, status, amount, isPaid, isDeleted }: { label: string, date: string, status: string, amount: string, isPaid: boolean, isDeleted?: boolean }) {
    return (
        <div className={`flex items-center justify-between p-4 rounded-xl border border-slate-50 transition-all ${isDeleted ? 'bg-red-50/50 border-red-100 scale-[0.98]' : 'hover:bg-slate-50 hover:border-slate-100'}`}>
            <div className="flex-1">
                <p className={`text-sm font-bold ${isDeleted ? 'text-red-400' : 'text-slate-800'}`}>{label}</p>
                <p className={`text-[10px] font-medium ${isDeleted ? 'text-red-300' : (isPaid ? 'text-slate-400' : 'text-red-400')}`}>{date}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                    <p className={`text-sm font-bold ${isDeleted ? 'text-red-300' : 'text-slate-700'}`}>{amount}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isDeleted ? 'text-red-300' : (isPaid ? 'text-green-500' : 'text-red-500')}`}>
                        {status}
                    </p>
                </div>
                {!isDeleted && (
                    <div className="flex items-center gap-1 border-l border-slate-100 pl-3">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="রশিদ প্রিন্ট">
                            <Printer size={16} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="মুছে ফেলুন">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
                {isDeleted && (
                    <div className="text-[10px] font-bold text-red-400 italic px-2">
                        ৭ দিনের মধ্যে মুছে ফেলা হবে
                    </div>
                )}
            </div>
        </div>
    );
}

interface StudentProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    onEdit?: (student: any, context?: any) => void;
    onUpdate?: () => void;
    initialTab?: 'fees' | 'attendance' | 'assignments' | 'login' | 'face';
}

export default function StudentProfileModal({ isOpen, onClose, student, onEdit, onUpdate, initialTab }: StudentProfileModalProps) {
    const { activeInstitute, user: currentUser, activeRole, login } = useSession();
    const { alert, confirm } = useUI();
    const [activeTab, setActiveTab] = useState<'fees' | 'attendance' | 'assignments' | 'login' | 'face'>(initialTab || 'fees');
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [showTierSettings, setShowTierSettings] = useState(false);
    const [showEnrollment, setShowEnrollment] = useState(false);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [showStatusHistory, setShowStatusHistory] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [guardianInfo, setGuardianInfo] = useState<any>(null);
    const [loadingGuardian, setLoadingGuardian] = useState(false);
    const [editingLogin, setEditingLogin] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loadingFees, setLoadingFees] = useState(false);
    const [feeTier, setFeeTier] = useState(student?.metadata?.feeTier || 'full');
    const [showTierPrompt, setShowTierPrompt] = useState(false);
    const [pendingTier, setPendingTier] = useState<string | null>(null);
    const [showSettlement, setShowSettlement] = useState(false);
    const [applyFrom, setApplyFrom] = useState<'admission' | 'now' | 'custom'>('now');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const printRef = useRef<HTMLDivElement>(null);
    const tabButtonsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const profilePhotoInputRef = useRef<HTMLInputElement>(null);

    // --- FEE & TRANSACTION LOGIC ---
    const dueTransactions = transactions.filter(t => 
        (t.status?.toString().toUpperCase() === 'PENDING') && 
        (t.type?.toString().toUpperCase() === 'INCOME')
    );
    const totalDue = dueTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const fetchGuardianInfo = async () => {
        if (!student?.metadata?.guardianId) {
            setGuardianInfo(null);
            return;
        }
        setLoadingGuardian(true);
        try {
            const res = await fetch(`/api/admin/users?id=${student.metadata.guardianId}`);
            if (res.ok) {
                const data = await res.json();
                setGuardianInfo(data);
            }
        } catch (error) {
            console.error('Failed to fetch guardian info:', error);
        } finally {
            setLoadingGuardian(false);
        }
    };

    const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSaving(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;
                const res = await fetch('/api/admin/users', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: student.id,
                        metadata: {
                            ...(student.metadata || {}),
                            studentPhoto: base64,
                            photo: base64
                        }
                    })
                });
                if (res.ok) {
                    onUpdate?.();
                } else {
                    await alert('ছবি আপলোড করা সম্ভব হয়নি।');
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Failed to upload photo:', error);
            await alert('একটি ত্রুটি হয়েছে।');
        } finally {
            setIsSaving(false);
            if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = '';
        }
    };

    const handleUpdateCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLogin) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingLogin)
            });
            if (res.ok) {
                if (editingLogin.id === student.id) {
                    onUpdate?.();
                } else if (editingLogin.id === guardianInfo?.id) {
                    fetchGuardianInfo();
                }
                setEditingLogin(null);
            }
        } catch (error) {
            console.error('Failed to update credentials:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleQuickLogin = async (identifier: string, password: string) => {
        if (!identifier || !password) {
            await alert('আইডি বা পাসওয়ার্ড পাওয়া যায়নি।');
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier, password })
            });
            if (res.ok) {
                const data = await res.json();
                login(data.user);
                window.location.href = '/dashboard';
            } else {
                const err = await res.json();
                await alert(err.message || 'লগইন ব্যর্থ হয়েছে।');
            }
        } catch (error) {
            console.error('Quick login failed:', error);
            await alert('লগইন করার সময় একটি সমস্যা হয়েছে।');
        } finally {
            setIsSaving(false);
        }
    };

    const canManageStudent = () => {
        if (!student?.metadata?.classId) return false;
        if (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN') return true;

        if (activeRole === 'TEACHER' && currentUser?.teacherProfiles) {
            const profile = (currentUser.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            if (!profile) return false;
            if (profile.isAdmin) return true;
            if (!profile.permissions?.classWise) return false;

            const classId = getCleanId(student.metadata.classId);
            const classPermissions = profile.permissions.classWise[classId];
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

    const isAdmin = activeRole === 'SUPER_ADMIN' || activeRole === 'ADMIN' || (activeRole === 'TEACHER' && canManageStudent());

    const guardianLoginPassword = (guardian: any) => {
        return guardian.password || 'নেই';
    };

    const handleSaveTier = async () => {
        if (!pendingTier) return;
        setIsSaving(true);
        try {
            const updatedMetadata = {
                ...(student.metadata || {}),
                feeTier: pendingTier,
                feeTierApplyFrom: applyFrom,
                feeTierApplyDate: applyFrom === 'custom' ? customDate : applyFrom === 'admission' ? (student?.metadata?.admissionDate || student?.createdAt) : new Date().toISOString()
            };

            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: student.id,
                    metadata: updatedMetadata
                })
            });

            if (res.ok) {
                setFeeTier(pendingTier);
                setShowTierPrompt(false);
                setPendingTier(null);
                onUpdate?.();
            } else {
                await alert('ফি টায়ার আপডেট করা সম্ভব হয়নি।');
            }
        } catch (error) {
            console.error('Failed to update fee tier:', error);
            await alert('একটি ত্রুটি হয়েছে।');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!student?.id) return;
        const currentStatus = student.metadata?.status || 'ACTIVE';
        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        
        if (newStatus === 'INACTIVE') {
            setShowSettlement(true);
            return;
        }

        const reason = window.prompt(`সক্রিয় করার কারণ লিখুন (ঐচ্ছিক):`, '');
        if (reason === null) return; 
        
        if (!await confirm(`আপনি কি নিশ্চিত যে শিক্ষার্থীকে পুনরায় সক্রিয় করতে চান?`)) return;
        
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: student.id,
                    metadata: {
                        ...(student.metadata || {}),
                        status: newStatus,
                        statusLastChangedAt: new Date().toISOString(),
                        statusHistory: [
                            ...(student.metadata?.statusHistory || []),
                            {
                                status: newStatus,
                                timestamp: new Date().toISOString(),
                                changedBy: currentUser?.name || currentUser?.id || 'Admin',
                                reason: reason || 'অ্যাকাউন্ট পুনরায় সক্রিয় করা হয়েছে'
                            }
                        ]
                    }
                })
            });

            if (res.ok) {
                onUpdate?.();
            } else {
                const data = await res.json();
                await alert(data.message || 'স্ট্যাটাস আপডেট করা সম্ভব হয়নি।');
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
            await alert('একটি ত্রুটি হয়েছে।');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (student?.metadata?.feeTier) {
            setFeeTier(student.metadata.feeTier);
        }
    }, [student?.id, student?.metadata?.feeTier]);

    useEffect(() => {
        if (activeTab === 'login' && student?.metadata?.guardianId) {
            fetchGuardianInfo();
        }
    }, [activeTab, student?.metadata?.guardianId]);

    useEffect(() => {
        const fetchCategories = async () => {
            if (!activeInstitute?.id) return;
            try {
                const res = await fetch(`/api/admin/accounts/categories?instituteId=${activeInstitute.id}`);
                const data = await res.json();
                setCategories(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Fetch categories error:', err);
            }
        };
        fetchCategories();
    }, [activeInstitute?.id]);

    const fetchAssignmentsAndSubmissions = async () => {
        if (!student?.id || !activeInstitute?.id) return;
        setLoadingAssignments(true);
        try {
            const classId = student.metadata?.classId;
            const groupId = student.metadata?.groupId;

            let assignmentUrl = `/api/assignments?instituteId=${activeInstitute.id}&role=STUDENT`;
            if (classId) assignmentUrl += `&classId=${classId}`;
            if (groupId) assignmentUrl += `&groupId=${groupId}`;

            const [assignRes, subRes] = await Promise.all([
                fetch(assignmentUrl),
                fetch(`/api/submissions?studentId=${student.id}`)
            ]);

            const assignData = await assignRes.json();
            const subData = await subRes.json();

            setAssignments(Array.isArray(assignData) ? assignData : []);
            setSubmissions(Array.isArray(subData) ? subData : []);
        } catch (error) {
            console.error('Failed to fetch assignment data:', error);
        } finally {
            setLoadingAssignments(false);
        }
    };

    const fetchFees = async () => {
        if (!student?.id || !activeInstitute?.id) return;
        setLoadingFees(true);
        try {
            const res = await fetch(`/api/admin/accounts?instituteId=${activeInstitute.id}&studentId=${student.id}`);
            if (res.ok) {
                const data = await res.json();
                setTransactions(data.transactions || []);
            }
        } catch (error) {
            console.error('Failed to fetch fee data:', error);
        } finally {
            setLoadingFees(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'fees' && isOpen && student?.id && activeInstitute?.id) {
            const fetchKey = `${student.id}-${activeTab}`;
            if (lastFetchedFees.current !== fetchKey) {
                fetchFees();
                lastFetchedFees.current = fetchKey;
            }
        } else if (activeTab !== 'fees') {
            lastFetchedFees.current = null;
        }
    }, [activeTab, isOpen, student?.id, activeInstitute?.id]);

    useEffect(() => {
        if (activeTab === 'assignments' && isOpen && student?.id && activeInstitute?.id) {
            const fetchKey = `${student.id}-${activeTab}`;
            if (lastFetchedAssignments.current !== fetchKey) {
                fetchAssignmentsAndSubmissions();
                lastFetchedAssignments.current = fetchKey;
            }
        } else if (activeTab !== 'assignments') {
            lastFetchedAssignments.current = null;
        }
    }, [activeTab, isOpen, student?.id, activeInstitute?.id]);

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
    };

    useEffect(() => {
        if (isOpen && activeTab && tabButtonsRef.current[activeTab]) {
            tabButtonsRef.current[activeTab]?.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    }, [isOpen, activeTab]);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const lastFetchedFees = useRef<string | null>(null);
    const lastFetchedAssignments = useRef<string | null>(null);

    if (!mounted || !isOpen || !student) return null;

    const ALL_TAGS = [
        { id: 'read', label: 'পড়া', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        { id: 'write', label: 'লেখা', color: 'bg-blue-50 text-[#045c84] border-blue-100' },
        { id: 'memo', label: 'মুখস্থ', color: 'bg-purple-50 text-purple-600 border-purple-100' },
        { id: 'notes', label: 'নোট', color: 'bg-slate-50 text-slate-600 border-slate-200' },
        { id: 'exercise', label: 'অনুশীলনী', color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
        { id: 'chapter', label: 'অধ্যায়', color: 'bg-amber-50 text-amber-600 border-amber-100' },
        { id: 'lesson', label: 'পাঠ', color: 'bg-orange-50 text-orange-600 border-orange-100' },
        { id: 'meaning', label: 'শব্দার্থ', color: 'bg-lime-50 text-lime-600 border-lime-100' },
        { id: 'qa', label: 'প্রশ্ন-উত্তর', color: 'bg-violet-50 text-violet-600 border-violet-100' },
        { id: 'grammar', label: 'ব্যাকরণ', color: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100' },
        { id: 'test', label: 'পরীক্ষা', color: 'bg-red-50 text-red-600 border-red-100' },
        { id: 'correction', label: 'সংশোধন', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        { id: 'drawing', label: 'ছবি/চিত্র', color: 'bg-pink-50 text-pink-600 border-pink-100' },
        { id: 'map', label: 'মানচিত্র', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { id: 'mcq', label: 'MCQ', color: 'bg-rose-50 text-rose-600 border-rose-100' },
        { id: 'creative', label: 'সৃজনশীল', color: 'bg-teal-50 text-teal-600 border-teal-100' },
        { id: 'excellent', label: 'চমৎকার', color: 'bg-blue-50 text-[#045c84] border-blue-100' },
        { id: 'attentive', label: 'মনোযোগী', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        { id: 'improving', label: 'উন্নতি করছে', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
        { id: 'incomplete', label: 'অসম্পূর্ণ', color: 'bg-amber-50 text-amber-600 border-amber-100' },
        { id: 'late', label: 'দেরি', color: 'bg-slate-50 text-slate-600 border-slate-200' },
        { id: 'parent-call', label: 'অভিভাবক সাক্ষাত', color: 'bg-rose-50 text-rose-600 border-rose-100' },
        { id: 'behavior', label: 'আচরণ ভালো', color: 'bg-cyan-50 text-cyan-600 border-cyan-100' }
    ];

    const renderDescription = (description: string) => {
        if (!description) return <p className="text-slate-400 italic">কোনো বর্ণনা নেই</p>;
        try {
            const parsed = JSON.parse(description);
            if (parsed.version === '2.0' && parsed.sections) {
                return (
                    <div className="space-y-4">
                        {Array.isArray(parsed.sections) && parsed.sections.map((section: any, idx: number) => {
                            const validTasks = (section.tasks || []).filter((t: any) =>
                                t && t.segments && Array.isArray(t.segments) && (
                                    t.segments.some((s: any) => s.value && s.value.trim() !== '') ||
                                    t.segments.some((s: any) => s.type === 'tag')
                                )
                            );
                            if (validTasks.length === 0) return null;

                            const bengaliTitle = section.title.includes('Classwork') ? 'ক্লাসের কাজ' :
                                section.title.includes('Preparation') ? 'প্রস্তুতি' :
                                section.title.includes('Homework') ? 'বাড়ির কাজ' : section.title;

                            return (
                                <div key={idx} className="space-y-2">
                                    <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${section.title.includes('Classwork') ? 'bg-blue-600' :
                                            section.title.includes('Preparation') ? 'bg-purple-600' :
                                            section.title.includes('Homework') ? 'bg-orange-600' : 'bg-slate-600'
                                        }`} />
                                        {bengaliTitle}
                                    </h6>
                                    <ul className="space-y-2">
                                        {validTasks.map((task: any, tIdx: number) => (
                                            <li key={tIdx} className="flex items-start gap-3 text-[13px] text-slate-800 leading-relaxed font-semibold">
                                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {(task.segments || []).map((seg: any, sIdx: number) => {
                                                        if (seg.type === 'tag') {
                                                            const tag = ALL_TAGS.find(t => t.id === seg.value);
                                                            if (!tag) return null;
                                                            return (
                                                                <span key={sIdx} className={`px-2.5 py-1 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest shadow-sm ${tag.color}`}>
                                                                    {tag.label}
                                                                </span>
                                                            );
                                                        }
                                                        return <span key={sIdx}>{seg.value}</span>;
                                                    })}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                );
            }
            return <p className="text-slate-600 font-medium whitespace-pre-wrap">{description}</p>;
        } catch (e) {
            return <p className="text-slate-600 font-medium whitespace-pre-wrap">{description}</p>;
        }
    };

    const tabs = [
        { id: 'fees', label: 'ফি', icon: CreditCard },
        { id: 'attendance', label: 'উপস্থিতি', icon: Calendar },
        { id: 'assignments', label: 'ক্লাস ডাইরি', icon: BookOpen },
        ...(isAdmin ? [
            { id: 'login', label: 'লগইন তথ্য', icon: Key },
            { id: 'face', label: 'ফেস আইডি', icon: ScanFace }
        ] : []),
    ];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            <div className="bg-white w-full md:max-w-4xl max-w-[95vw] rounded-[32px] shadow-2xl animate-scale-in overflow-hidden relative z-10 flex flex-col h-[85vh] max-h-[85vh]">
                {/* Header - Fixed */}
                <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 font-bengali">শিক্ষার্থীর প্রোফাইল</h2>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button onClick={() => onEdit?.(student)} className="p-2 text-slate-400 hover:text-[#045c84] hover:bg-slate-100 rounded-full transition-all">
                                <Edit size={20} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Hidden File Input for Profile Photo */}
                <input
                    type="file"
                    ref={profilePhotoInputRef}
                    onChange={handleProfilePhotoUpload}
                    accept="image/*"
                    className="hidden"
                />

                {/* Scrollable Container */}
                <div className="flex-1 overflow-y-auto scrollbar-hide" data-lenis-prevent>
                    {/* Profile Hero */}
                    <div className="flex flex-col items-center py-8 font-bengali">
                        <div className="relative mb-4">
                            <div className="w-24 h-24 rounded-full bg-[#CCF2F4] border-4 border-white shadow-sm flex items-center justify-center text-[#045c84] font-bold text-3xl overflow-hidden relative group">
                                {student.metadata?.studentPhoto || student.metadata?.photo ? (
                                    <img src={student.metadata.studentPhoto || student.metadata.photo} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                    student.name?.[0] || 'S'
                                )}
                                {isAdmin && (
                                    <div 
                                        onClick={() => profilePhotoInputRef.current?.click()}
                                        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity cursor-pointer ${isSaving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    >
                                        {isSaving ? <Loader2 className="text-white animate-spin" size={24} /> : <Camera className="text-white" size={24} />}
                                    </div>
                                )}
                            </div>
                            {(() => {
                                const isOnline = student.updatedAt && (new Date().getTime() - new Date(student.updatedAt).getTime() < 5 * 60 * 1000);
                                const status = student.metadata?.status || 'ACTIVE';
                                const indicatorColor = isOnline ? 'bg-emerald-500' : (status === 'ACTIVE' ? 'bg-blue-500' : 'bg-red-500');
                                return <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white shadow-md ${indicatorColor} ${isOnline ? 'animate-pulse' : ''}`} />;
                            })()}
                        </div>
                        <h3 className="text-18px font-bold text-slate-800 uppercase tracking-tight">{student.name}</h3>
                        <p className="text-slate-500 text-[9px] font-bold">শিক্ষার্থী আইডি: {student.metadata?.studentId || 'নেই'}</p>
                        
                        {isAdmin && (
                            <div className="flex items-center gap-2 mt-4">
                                <button onClick={handleToggleStatus} disabled={isSaving} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                                    (student.metadata?.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${(student.metadata?.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    {(student.metadata?.status || 'ACTIVE') === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                                </button>
                                <button onClick={() => setShowStatusHistory(!showStatusHistory)} className={`p-1.5 rounded-full border transition-all ${showStatusHistory ? 'bg-[#045c84] text-white' : 'bg-white text-slate-400'}`}>
                                    <History size={16} />
                                </button>
                            </div>
                        )}

                        {showStatusHistory && (
                            <div className="mt-4 w-full max-w-[280px] bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100 animate-fade-in relative z-10">
                                {student.metadata?.statusHistory?.map((h: any, i: number) => (
                                    <div key={i} className="bg-white p-2 rounded-xl border border-slate-100 text-[9px]">
                                        <div className="flex justify-between mb-1 font-black">
                                            <span className={h.status === 'ACTIVE' ? 'text-emerald-500' : 'text-red-500'}>{h.status}</span>
                                            <span className="text-slate-400">{new Date(h.timestamp).toLocaleDateString('bn-BD')}</span>
                                        </div>
                                        <p className="text-slate-500">পরিবর্তন করেছেন: {h.changedBy}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tabs - Sticky */}
                    <div className="sticky top-0 bg-white border-b border-slate-100 px-4 flex overflow-x-auto no-scrollbar z-20">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    ref={el => { tabButtonsRef.current[tab.id] = el; }}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all shrink-0 font-bengali ${
                                        activeTab === tab.id ? 'text-[#045c84] border-[#045c84]' : 'text-slate-400 border-transparent hover:text-slate-600'
                                    }`}
                                >
                                    <Icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                                    <span className="text-sm font-black">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 font-bengali">
                        {activeTab === 'fees' && (
                            <div className="space-y-6 animate-fade-in">

                                {loadingFees ? (
                                    <div className="flex flex-col items-center py-12 text-slate-400">
                                        <Loader2 size={24} className="animate-spin mb-2" />
                                        <p className="text-xs">ফি সংক্রান্ত তথ্য লোড হচ্ছে...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-8 px-2">
                                            <h4 className="text-xl font-black text-slate-800 font-bengali">বকেয়া ও লেনদেন বিবরণ</h4>
                                            <button onClick={() => setShowTierSettings(!showTierSettings)} className={`p-2.5 rounded-xl transition-all ${showTierSettings ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                                                <Settings size={20} />
                                            </button>
                                        </div>

                                        {/* Grand Total Summary Card - Moved to Top */}
                                        {(() => {
                                            const statusMap: Record<string, any> = {};
                                            (transactions || []).forEach(t => {
                                                const key = `${t.category}-${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`;
                                                statusMap[key] = { status: t.status?.toString().toUpperCase(), amount: t.amount };
                                            });

                                            const groupedByType = (transactions || []).reduce((acc: any, t: any) => {
                                                if (t.status?.toString().toUpperCase() === 'PENDING' && t.type?.toString().toUpperCase() === 'INCOME') {
                                                    const key = t.originalCategory || t.category || 'অন্যান্য';
                                                    if (!acc[key]) acc[key] = { items: [], total: 0 };
                                                    acc[key].items.push(t);
                                                    acc[key].total += (Number(t.amount) || 0);
                                                }
                                                return acc;
                                            }, {});

                                            const tierMultiplier = feeTier === 'half' ? 0.5 : feeTier === 'free' ? 0 : 1;
                                            const grandAggregateTotal = Object.entries(groupedByType).reduce((acc, [category, data]: [any, any]) => {
                                                const categoryObj = categories.find(c => c.name === category);
                                                if (!categoryObj) return acc; // Skip if category was deleted
                                                const catConfig = categoryObj?.config || {};
                                                const catStartDate = catConfig.startDate ? new Date(catConfig.startDate) : null;
                                                const admissionDate = new Date(student.metadata?.admissionDate || student.createdAt);
                                                let effectiveStart = catStartDate || admissionDate;
                                                const today = new Date();
                                                const cycles = [];
                                                const interval = catConfig.interval || categoryObj?.frequency || 'monthly';
                                                const isMonthly = interval === 'monthly' || category.includes('মাসিক');

                                                if (isMonthly) {
                                                    let curr = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
                                                    const end = new Date(today.getFullYear(), today.getMonth(), 1);
                                                    while (curr <= end) {
                                                        cycles.push(new Date(curr));
                                                        curr.setMonth(curr.getMonth() + 1);
                                                        if (cycles.length > 120) break;
                                                    }
                                                } else {
                                                    data.items.forEach((it: any) => cycles.push(new Date(it.date)));
                                                }

                                                return acc + cycles.reduce((subTotal, mDate) => {
                                                    const key = `${category}-${mDate.getFullYear()}-${mDate.getMonth()}`;
                                                    if (statusMap[key]?.status === 'COMPLETED') return subTotal;
                                                    const amount = statusMap[key]?.amount || data.items[0]?.amount || categoryObj?.amount || 0;
                                                    
                                                    // Threshold Logic
                                                    const admissionDay = admissionDate.getDate();
                                                    const threshold = catConfig.thresholdDays || 0;
                                                    const isFirstMonth = mDate.getFullYear() === admissionDate.getFullYear() && mDate.getMonth() === admissionDate.getMonth();
                                                    const thresholdMultiplier = (isFirstMonth && threshold > 0 && admissionDay > threshold) ? 0.5 : 1;

                                                    return subTotal + (Number(amount) * tierMultiplier * thresholdMultiplier || 0);
                                                }, 0);
                                            }, 0);

                                            if (grandAggregateTotal === 0) return null;

                                            return (
                                                <div className="mb-8 p-8 rounded-[40px] bg-red-50/50 border-2 border-red-100/50 relative overflow-hidden group/total">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover/total:bg-red-200/20 transition-colors duration-700"></div>
                                                    <div className="relative flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-black text-red-500 uppercase tracking-widest font-bengali">মোট বকেয়া</p>
                                                            <h2 className="text-4xl font-black text-slate-900 tracking-tight font-bengali">
                                                                ৳{grandAggregateTotal?.toLocaleString('bn-BD')}
                                                            </h2>
                                                        </div>
                                                        <button className="px-8 py-4 bg-red-500 text-white rounded-[24px] font-black text-sm shadow-lg shadow-red-200 hover:bg-red-600 hover:scale-105 active:scale-95 transition-all font-bengali">
                                                            পরিশোধ করুন
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Dues List */}
                                        <div className="space-y-4">
                                            
                                            <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar p-1">
                                                {(() => {
                                                    const statusMap: Record<string, any> = {};
                                                    (transactions || []).forEach(t => {
                                                        const key = `${t.category}-${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`;
                                                        statusMap[key] = { status: t.status?.toString().toUpperCase(), amount: t.amount };
                                                    });

                                                    const groupedByType = (transactions || []).reduce((acc: any, t: any) => {
                                                        if (t.status?.toString().toUpperCase() === 'PENDING' && t.type?.toString().toUpperCase() === 'INCOME') {
                                                            const key = t.originalCategory || t.category || 'অন্যান্য';
                                                            if (!acc[key]) acc[key] = { items: [], total: 0 };
                                                            acc[key].items.push(t);
                                                            acc[key].total += (Number(t.amount) || 0);
                                                        }
                                                        return acc;
                                                    }, {});

                                                    const entries = Object.entries(groupedByType);
                                                    if (entries.length === 0) {
                                                        return (
                                                            <div className="p-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100 text-slate-300 text-xs font-bold font-bengali">
                                                                বর্তমানে কোনো বকেয়া নেই
                                                            </div>
                                                        );
                                                    }
                                                    return entries.map(([category, data]: [any, any], idx) => {
                                                        const categoryObj = categories.find(c => c.name === category);
                                                        if (!categoryObj) return null; // Skip deleted categories

                                                        const catConfig = categoryObj?.config || {};
                                                        const catStartDate = catConfig.startDate ? new Date(catConfig.startDate) : null;
                                                        const admissionDate = new Date(student.metadata?.admissionDate || student.createdAt);
                                                        
                                                        // Prioritize category start date (session start) if it exists
                                                        let effectiveStart = catStartDate || admissionDate;
                                                        
                                                        const today = new Date();
                                                        const cyclesToDisplay: any[] = [];
                                                        
                                                        const interval = catConfig.interval || categoryObj?.frequency || 'monthly';
                                                        const isMonthly = interval === 'monthly' || category.includes('মাসিক');

                                                        if (isMonthly) {
                                                            let curr = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
                                                            const end = new Date(today.getFullYear(), today.getMonth(), 1);
                                                            while (curr <= end) {
                                                                cyclesToDisplay.push(new Date(curr));
                                                                curr.setMonth(curr.getMonth() + 1);
                                                                if (cyclesToDisplay.length > 120) break;
                                                            }
                                                        } else {
                                                            data.items.forEach((it: any) => cyclesToDisplay.push(new Date(it.date)));
                                                        }

                                                        const tierMultiplier = feeTier === 'half' ? 0.5 : feeTier === 'free' ? 0 : 1;
                                                        const aggregateTotal = cyclesToDisplay.reduce((sum, mDate) => {
                                                            const key = `${category}-${mDate.getFullYear()}-${mDate.getMonth()}`;
                                                            const info = statusMap[key];
                                                            if (info?.status === 'COMPLETED') return sum;
                                                            const amount = info?.amount || data.items[0]?.amount || categoryObj?.amount || 0;
                                                            
                                                            // Threshold Logic
                                                            const admissionDay = admissionDate.getDate();
                                                            const threshold = catConfig.thresholdDays || 0;
                                                            const isFirstMonth = mDate.getFullYear() === admissionDate.getFullYear() && mDate.getMonth() === admissionDate.getMonth();
                                                            const thresholdMultiplier = (isFirstMonth && threshold > 0 && admissionDay > threshold) ? 0.5 : 1;

                                                            return sum + (Number(amount) * tierMultiplier * thresholdMultiplier || 0);
                                                        }, 0);

                                                        const isExpanded = expandedCategories.includes(category);

                                                        const toggleExpansion = (e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            setExpandedCategories(prev => 
                                                                prev.includes(category) 
                                                                    ? prev.filter(c => c !== category)
                                                                    : [...prev, category]
                                                            );
                                                        };

                                                        return (
                                                            <div key={idx} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden font-bengali group/card">
                                                                <div 
                                                                    onClick={toggleExpansion}
                                                                    className="px-6 py-5 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 transition-colors"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <h6 className="text-[13px] font-black text-slate-500 uppercase tracking-tight">
                                                                            {category} <span className="opacity-50 text-[10px]">({category.toUpperCase()})</span>
                                                                        </h6>
                                                                        {!isExpanded && <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{cyclesToDisplay.length} টি মাস বাকি</p>}
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <p className="text-sm font-black text-red-500">৳{aggregateTotal?.toLocaleString('bn-BD')}</p>
                                                                        <div className={`p-1 rounded-lg transition-all ${isExpanded ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-300 group-hover/card:text-slate-500'}`}>
                                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                {isExpanded && (
                                                                    <div className="divide-y divide-slate-50 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                                                                        {cyclesToDisplay.sort((a: any, b: any) => b.getTime() - a.getTime()).map((mDate: any, mIdx: number) => {
                                                                            const key = `${category}-${mDate.getFullYear()}-${mDate.getMonth()}`;
                                                                            const info = statusMap[key];
                                                                            const isPaid = info?.status === 'COMPLETED';
                                                                            const amount = info?.amount || data.items[0]?.amount || 0;

                                                                            return (
                                                                                <div key={mIdx} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                                                                    <p className="text-xs font-bold text-slate-700">
                                                                                        {isMonthly ? `${BENGALI_MONTHS[mDate.getMonth()]} '${mDate.getFullYear().toString().slice(-2)}` : mDate.toLocaleDateString('bn-BD')}
                                                                                    </p>
                                                                                    <div className="flex items-center gap-4">
                                                                                        {/* Show original amount faded only if there's a discount, or always? The image shows it always. */}
                                                                                        <span className="text-[10px] font-bold text-slate-300">৳{amount?.toLocaleString('bn-BD')}</span>
                                                                                        
                                                                                        {isPaid ? (
                                                                                            <div className="px-3 py-1.5 bg-[#f0fdf4] text-[#22c55e] text-[10px] font-black rounded-lg border border-[#dcfce7] flex items-center gap-1.5 shadow-sm">
                                                                                                <Check size={12} strokeWidth={3} />
                                                                                                PAID
                                                                                            </div>
                                                                                        ) : (
                                                                                            <button className="px-4 py-1.5 bg-slate-50 text-slate-800 text-[11px] font-black rounded-lg border border-slate-100 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                                                                                {/* Individual threshold indicator for first month */}
                                                                                                {(() => {
                                                                                                    const admissionDay = admissionDate.getDate();
                                                                                                    const threshold = catConfig.thresholdDays || 0;
                                                                                                    const isFirstMonth = mDate.getFullYear() === admissionDate.getFullYear() && mDate.getMonth() === admissionDate.getMonth();
                                                                                                    const tMultiplier = (isFirstMonth && threshold > 0 && admissionDay > threshold) ? 0.5 : 1;
                                                                                                    return `৳${(amount * tierMultiplier * tMultiplier)?.toLocaleString('bn-BD')}`;
                                                                                                })()}
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>

                                        {/* History Toggle */}
                                        <div className="mt-8 border-t border-slate-50 pt-4">
                                            <button onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} className="w-full flex justify-between py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 font-bengali transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <History size={14} />
                                                    <span>লেনদেনের ইতিহাস</span>
                                                </div>
                                                {isHistoryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>

                                        {isHistoryExpanded && (
                                            <div className="space-y-2 animate-fade-in mt-2">
                                                {transactions.filter(t => t.status !== 'PENDING' && t.status !== 'FAILED').map((t, idx) => (
                                                    <TransactionItem key={idx} label={t.category} date={new Date(t.date).toLocaleDateString('bn-BD')} status={t.status} amount={`৳${t.amount}`} isPaid={t.status === 'COMPLETED'} />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div className="space-y-6 animate-fade-in text-center py-12">
                                <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-sm font-bold text-slate-400">উপস্থিতি তালিকা শীঘ্রই আসছে</p>
                            </div>
                        )}

                        {activeTab === 'assignments' && (
                            <div className="space-y-4 animate-fade-in">
                                {loadingAssignments ? (
                                    <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
                                ) : assignments.length === 0 ? (
                                    <p className="text-center py-12 text-slate-300 text-sm">কোনো ক্লাস ডাইরি পাওয়া যায়নি</p>
                                ) : assignments.map(a => (
                                    <div key={a.id} className="bg-white p-6 border border-slate-100 rounded-[28px] space-y-3 shadow-sm">
                                        <h5 className="text-lg font-black text-[#045c84] leading-tight">{a.book?.name || a.title}</h5>
                                        <div className="text-slate-600">{renderDescription(a.description)}</div>
                                        <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] font-black text-slate-400">
                                            <span>শেষ সময়: {new Date(a.deadline).toLocaleDateString('bn-BD')}</span>
                                            <button className="text-[#045c84] flex items-center gap-1">বিস্তারিত <ChevronRight size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'login' && isAdmin && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Login Info Section */}
                                <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">শিক্ষার্থীর লগইন আইডি</label>
                                        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-widest">ACTIVE</span>
                                    </div>
                                    <div className="flex items-center justify-between font-black bg-white p-4 rounded-2xl border border-slate-100">
                                        <span className="tracking-widest text-[#045c84]">{student.email || student.username || 'নেই'}</span>
                                        <button onClick={() => handleQuickLogin(student.email || student.username, student.password || '123456')} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><LogIn size={18} /></button>
                                    </div>
                                </div>
                                {guardianInfo && (
                                    <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">অভিভাবকের লগইন আইডি</label>
                                        <div className="flex items-center justify-between font-black bg-white p-4 rounded-2xl border border-slate-100">
                                            <span className="tracking-widest text-[#045c84]">{guardianInfo.email || guardianInfo.username}</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setEditingLogin(guardianInfo)} className="p-2 text-slate-400 hover:text-[#045c84]"><Key size={18} /></button>
                                                <button onClick={() => handleQuickLogin(guardianInfo.email || guardianInfo.username, guardianInfo.password || '123456')} className="p-2 text-slate-400 hover:text-blue-500"><LogIn size={18} /></button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'face' && isAdmin && (() => {
                            const hasFaceId = student.metadata?.hasFaceId || (student.faceDescriptor && student.faceDescriptor.length > 0);
                            return (
                                <div className="animate-fade-in space-y-6">
                                    <div className="bg-[#F0FDF4] p-8 rounded-[32px] text-center border-2 border-emerald-50 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform" />
                                        <div className="relative z-10 flex flex-col items-center gap-4">
                                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 ${hasFaceId ? 'bg-emerald-500 text-white rotate-6' : 'bg-white text-slate-300 shadow-sm'}`}>
                                                <ScanFace size={40} className={hasFaceId ? 'animate-pulse' : ''} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-800">ফেস আইডি স্ট্যাটাস</h4>
                                                <p className={`text-[11px] font-bold mt-1 uppercase tracking-widest ${hasFaceId ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    {hasFaceId ? 'সফলভাবে নিবন্ধিত' : 'নিবন্ধিত নয়'}
                                                </p>
                                            </div>
                                            <button onClick={() => setShowEnrollment(true)} className="mt-2 px-8 py-3 bg-white text-[#045c84] text-[11px] font-black rounded-2xl shadow-xl shadow-emerald-500/10 border-2 border-emerald-100/50 hover:bg-emerald-50 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2">
                                                <Disc size={16} className="text-emerald-500" />
                                                নতুন ডাটা যুক্ত করুন
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Footer Actions - Fixed */}
                <div className="p-6 border-t border-slate-50 bg-white shrink-0 flex items-center gap-3 relative z-10">
                    <button onClick={handlePrint} className="flex-1 h-14 bg-slate-50 text-slate-500 rounded-2xl font-black text-[13px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-100 active:scale-95 whitespace-nowrap">
                        <Printer size={18} strokeWidth={2.5} />
                        প্রিন্ট প্রোফাইল
                    </button>
                    <button onClick={onClose} className="w-24 h-14 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95">বন্ধ</button>
                </div>
            </div>

            {/* Sub-modals via Portals */}
            {showTierPrompt && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={() => { setShowTierPrompt(false); setPendingTier(null); }} />
                    <div className="bg-[#045c84] w-full max-w-sm p-8 rounded-[32px] text-white shadow-2xl animate-scale-in relative border border-white/10">
                        <h5 className="font-black text-lg text-center uppercase tracking-wide leading-tight mb-6">পরিবর্তন কখন থেকে কার্যকর হবে?</h5>
                        <div className="space-y-2 mb-6">
                            {[
                                { id: 'admission', label: 'ভর্তির তারিখ থেকে', sub: 'পূর্বের সকল ফি আপডেট হবে' },
                                { id: 'now', label: 'আজ থেকে', sub: 'শুধুমাত্র বর্তমান ও ভবিষ্যৎ ফি' },
                                { id: 'custom', label: 'নির্দিষ্ট তারিখ থেকে', sub: 'আপনার পছন্দমতো সময়' }
                            ].map(o => (
                                <button key={o.id} onClick={() => setApplyFrom(o.id as any)} className={`w-full p-4 rounded-2xl text-left border-2 transition-all ${applyFrom === o.id ? 'bg-white text-[#045c84] border-white' : 'border-white/10 hover:bg-white/5'}`}>
                                    <p className="text-[11px] font-black uppercase">{o.label}</p>
                                    <p className={`text-[9px] font-bold ${applyFrom === o.id ? 'opacity-60' : 'opacity-40'}`}>{o.sub}</p>
                                </button>
                            ))}
                        </div>
                        {applyFrom === 'custom' && <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full mb-6 p-4 bg-white/10 border border-white/20 rounded-2xl text-white outline-none focus:bg-white focus:text-[#045c84]" />}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => { setShowTierPrompt(false); setPendingTier(null); }} className="py-4 bg-white/10 rounded-2xl text-[11px] font-black uppercase">বাতিল</button>
                            <button onClick={handleSaveTier} disabled={isSaving} className="py-4 bg-white text-[#045c84] rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'নিশ্চিত করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSettlement && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowSettlement(false)} />
                    <div className="bg-white w-full max-w-lg p-8 rounded-[40px] shadow-2xl animate-scale-in relative border border-slate-100/50 font-bengali flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight">ফি সেটেলমেন্ট ও নিষ্ক্রিয়করণ</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">শিক্ষার্থীকে নিষ্ক্রিয় করার পূর্বে বকেয়া নিশ্চিত করুন</p>
                            </div>
                            <button onClick={() => setShowSettlement(false)} className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar" data-lenis-prevent>
                            {/* Dues Summary in Settlement */}
                            {(() => {
                                const statusMap: Record<string, any> = {};
                                (transactions || []).forEach(t => {
                                    const key = `${t.category}-${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`;
                                    statusMap[key] = { status: t.status?.toString().toUpperCase(), amount: t.amount };
                                });

                                const groupedByType = (transactions || []).reduce((acc: any, t: any) => {
                                    if (t.status?.toString().toUpperCase() === 'PENDING' && t.type?.toString().toUpperCase() === 'INCOME') {
                                        const key = t.originalCategory || t.category || 'অন্যান্য';
                                        if (!acc[key]) acc[key] = { items: [], total: 0 };
                                        acc[key].items.push(t);
                                        acc[key].total += (Number(t.amount) || 0);
                                    }
                                    return acc;
                                }, {});

                                const tierMultiplier = feeTier === 'half' ? 0.5 : feeTier === 'free' ? 0 : 1;
                                let totalSettlementAmount = 0;

                                const settlementItems = Object.entries(groupedByType).map(([category, data]: [any, any]) => {
                                    const categoryObj = categories.find(c => c.name === category);
                                    const catConfig = categoryObj?.config || {};
                                    const catStartDate = catConfig.startDate ? new Date(catConfig.startDate) : null;
                                    const admissionDate = new Date(student.metadata?.admissionDate || student.createdAt);
                                    let effectiveStart = catStartDate || admissionDate;
                                    const today = new Date();
                                    const cycles = [];
                                    const isMonthly = (catConfig.interval || categoryObj?.frequency || 'monthly') === 'monthly' || category.includes('মাসিক');

                                    if (isMonthly) {
                                        let curr = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
                                        const end = new Date(today.getFullYear(), today.getMonth(), 1);
                                        while (curr <= end) {
                                            const key = `${category}-${curr.getFullYear()}-${curr.getMonth()}`;
                                            if (statusMap[key]?.status !== 'COMPLETED') cycles.push(new Date(curr));
                                            curr.setMonth(curr.getMonth() + 1);
                                            if (cycles.length > 120) break;
                                        }
                                    } else {
                                        data.items.forEach((it: any) => cycles.push(new Date(it.date)));
                                    }

                                    const catTotal = cycles.reduce((sum, mDate) => {
                                        const amount = statusMap[`${category}-${mDate.getFullYear()}-${mDate.getMonth()}`]?.amount || data.items[0]?.amount || categoryObj?.amount || 0;
                                        const admissionDay = admissionDate.getDate();
                                        const threshold = catConfig.thresholdDays || 0;
                                        const isFirstMonth = mDate.getFullYear() === admissionDate.getFullYear() && mDate.getMonth() === admissionDate.getMonth();
                                        const tMultiplier = (isFirstMonth && threshold > 0 && admissionDay > threshold) ? 0.5 : 1;
                                        return sum + (Number(amount) * tierMultiplier * tMultiplier || 0);
                                    }, 0);

                                    totalSettlementAmount += catTotal;
                                    return { category, total: catTotal, cycles };
                                });

                                return (
                                    <div className="space-y-4">
                                        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">মোট বকেয়া পরিমাণ</p>
                                                <h2 className="text-3xl font-black text-slate-800">৳{totalSettlementAmount.toLocaleString('bn-BD')}</h2>
                                            </div>
                                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-red-100">
                                                <AlertCircle size={24} className="text-red-500" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">বকেয়া খাতের বিবরণী</p>
                                            <div className="divide-y divide-slate-50 bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
                                                {settlementItems.length === 0 ? (
                                                    <p className="p-8 text-center text-xs font-bold text-slate-400 italic">কোনো বকেয়া নেই</p>
                                                ) : settlementItems.map((item, i) => (
                                                    <div key={i} className="p-4 flex justify-between items-center bg-white/50">
                                                        <div>
                                                            <p className="text-sm font-black text-slate-700">{item.category}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{item.cycles.length} টি মাস/সাইকেল বাকি</p>
                                                        </div>
                                                        <p className="text-sm font-black text-red-500">৳{item.total.toLocaleString('bn-BD')}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">নিষ্ক্রিয় করার কারণ ও নোট</label>
                                            <textarea 
                                                id="deactivation-reason"
                                                placeholder="যেমন: পড়ালেখা বন্ধ, অন্য প্রতিষ্ঠানে ভর্তি ইত্যাদি..."
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:ring-4 focus:ring-[#045c84]/5 transition-all min-h-[100px]"
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50 shrink-0 grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setShowSettlement(false)}
                                className="py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                            >
                                বাতিল
                            </button>
                            <button 
                                onClick={async () => {
                                    const reason = (document.getElementById('deactivation-reason') as HTMLTextAreaElement)?.value;
                                    if (!reason) {
                                        await alert('অনুগ্রহ করে নিষ্ক্রিয় করার কারণ উল্লেখ করুন।');
                                        return;
                                    }
                                    if (!await confirm('আপনি কি নিশ্চিত যে এই শিক্ষার্থীকে নিষ্ক্রিয় করতে চান? সকল বকেয়া ফি সয়ংক্রিয়ভাবে সংরক্ষিত থাকবে।')) return;
                                    
                                    setIsSaving(true);
                                    try {
                                        const res = await fetch('/api/admin/users', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                id: student.id,
                                                metadata: {
                                                    ...(student.metadata || {}),
                                                    status: 'INACTIVE',
                                                    statusLastChangedAt: new Date().toISOString(),
                                                    statusHistory: [
                                                        ...(student.metadata?.statusHistory || []),
                                                        {
                                                            status: 'INACTIVE',
                                                            timestamp: new Date().toISOString(),
                                                            changedBy: currentUser?.name || currentUser?.id || 'Admin',
                                                            reason: reason
                                                        }
                                                    ]
                                                }
                                            })
                                        });
                                        if (res.ok) {
                                            setShowSettlement(false);
                                            onUpdate?.();
                                        } else {
                                            const data = await res.json();
                                            await alert(data.message || 'নিষ্ক্রিয় করা সম্ভব হয়নি।');
                                        }
                                    } catch (err) {
                                        console.error('Deactivation error:', err);
                                        await alert('একটি ত্রুটি হয়েছে।');
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                disabled={isSaving}
                                className="py-4 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-100 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'নিশ্চিত ও নিষ্ক্রিয় করুন'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTierSettings && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowTierSettings(false)} />
                    <div className="bg-white w-full max-w-sm p-8 rounded-[40px] shadow-2xl animate-scale-in relative border border-slate-100/50 font-bengali">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 leading-tight">ফি টায়ার প্রোফাইল</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">শিক্ষার্থীর জন্য প্রযোজ্য ফি লেভেল</p>
                            </div>
                            <button onClick={() => setShowTierSettings(false)} className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'full', label: 'ফুল ফি', sub: '১০০% প্রযোজ্য', icon: CreditCard, color: 'blue' },
                                { id: 'half', label: 'হাফ ফি', sub: '৫০% ডিসকাউন্ট', icon: Percent, color: 'amber' },
                                { id: 'free', label: 'ফ্রি স্কলারশিপ', sub: '০% ফি (সম্পূর্ণ ফ্রি)', icon: Sparkles, color: 'emerald' }
                            ].map(opt => (
                                <button 
                                    key={opt.id} 
                                    onClick={() => { setPendingTier(opt.id); setShowTierPrompt(true); setShowTierSettings(false); }} 
                                    className={`group flex items-center gap-4 p-5 rounded-3xl border-2 transition-all duration-300 ${
                                        feeTier === opt.id 
                                            ? 'border-[#045c84] bg-[#eff6ff] shadow-xl shadow-blue-50/50' 
                                            : 'bg-white border-slate-50 hover:border-slate-200 hover:bg-slate-50/50'
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                        feeTier === opt.id ? 'bg-[#045c84] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600'
                                    }`}>
                                        <opt.icon size={22} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={`text-sm font-black transition-colors ${feeTier === opt.id ? 'text-slate-900' : 'text-slate-600'}`}>{opt.label}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{opt.sub}</p>
                                    </div>
                                    {feeTier === opt.id && (
                                        <div className="w-6 h-6 rounded-full bg-[#045c84] flex items-center justify-center text-white">
                                            <Check size={14} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50">
                            <p className="text-[9px] text-center font-bold text-slate-300 leading-relaxed">
                                টায়ার পরিবর্তন করলে পরবর্তী সকল বকেয়া ফি সয়ংক্রিয়ভাবে নতুন হারে গণনা করা হবে।
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showEnrollment && (
                <div className="fixed inset-0 z-[10000]">
                    <FaceEnrollment studentId={student.id} studentName={student.name} onClose={() => setShowEnrollment(false)} onSuccess={() => { setShowEnrollment(false); onUpdate?.(); }} />
                </div>
            )}

            {isPrinting && (
                <div className="hidden">
                    <div ref={printRef}>
                        <PrintLayout title="শিক্ষার্থীর প্রোফাইল" institute={activeInstitute}>
                            <div className="space-y-8 font-bengali">
                                {/* Student Info Card */}
                                <div className="grid grid-cols-2 gap-8 border-2 border-slate-100 p-8 rounded-[32px] bg-slate-50/30">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">শিক্ষার্থীর নাম</p>
                                            <h2 className="text-2xl font-black text-[#045c84]">{student.name}</h2>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">শিক্ষার্থী আইডি</p>
                                                <p className="text-sm font-bold">{student.metadata?.studentId || 'নেই'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">শ্রেণী</p>
                                                <p className="text-sm font-bold">{student.metadata?.className || 'নেই'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <div className="w-32 h-32 rounded-[24px] border-4 border-white shadow-sm overflow-hidden bg-white flex items-center justify-center text-[#045c84] font-black text-2xl">
                                            {student.metadata?.studentPhoto ? (
                                                <img src={student.metadata.studentPhoto} alt={student.name} className="w-full h-full object-cover" />
                                            ) : (
                                                student.name?.[0] || 'S'
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Fee Statement Table */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide border-b-4 border-[#045c84] inline-block pb-1">ফি বিবরণী (FEE STATEMENT)</h3>
                                    
                                    {(() => {
                                        const statusMap: Record<string, any> = {};
                                        (transactions || []).forEach(t => {
                                            const key = `${t.category}-${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`;
                                            statusMap[key] = { status: t.status?.toString().toUpperCase(), amount: t.amount };
                                        });

                                        const grouped = (transactions || []).reduce((acc: any, t: any) => {
                                            if (t.status?.toString().toUpperCase() === 'PENDING' && t.type?.toString().toUpperCase() === 'INCOME') {
                                                const key = t.category || 'অন্যান্য';
                                                if (!acc[key]) acc[key] = { items: [], total: 0 };
                                                acc[key].items.push(t);
                                                acc[key].total += (Number(t.amount) || 0);
                                            }
                                            return acc;
                                        }, {});

                                        const entries = Object.entries(grouped);
                                        const tierMultiplier = feeTier === 'half' ? 0.5 : feeTier === 'free' ? 0 : 1;
                                        const overallGrandTotal = entries.reduce((total, [category, data]: [string, any]) => {
                                            const categoryObj = categories.find(c => c.name === category);
                                            const catConfig = categoryObj?.config || {};
                                            const catStartDate = catConfig.startDate ? new Date(catConfig.startDate) : null;
                                            const admissionDate = new Date(student.metadata?.admissionDate || student.createdAt);
                                            let effectiveStart = catStartDate || admissionDate;
                                            
                                            const today = new Date();
                                            const cyclesToShow: any[] = [];
                                            const interval = catConfig.interval || 'monthly';
                                            if (interval === 'monthly' || category.includes('মাসিক')) {
                                                let curr = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
                                                const end = new Date(today.getFullYear(), today.getMonth(), 1);
                                                while (curr <= end) {
                                                    cyclesToShow.push(new Date(curr));
                                                    curr.setMonth(curr.getMonth() + 1);
                                                    if (cyclesToShow.length > 120) break;
                                                }
                                            } else {
                                                data.items.forEach((it: any) => cyclesToShow.push(new Date(it.date)));
                                            }

                                            const filteredCycles = cyclesToShow.filter(m => {
                                                const key = `${category}-${m.getFullYear()}-${m.getMonth()}`;
                                                return statusMap[key]?.status !== 'COMPLETED';
                                            });

                                            const aggregateTotal = filteredCycles.reduce((sum, mDate) => {
                                                const key = `${category}-${mDate.getFullYear()}-${mDate.getMonth()}`;
                                                const info = statusMap[key];
                                                const amount = info?.amount || data.items[0]?.amount || categoryObj?.amount || 0;
                                                
                                                // Threshold Logic
                                                const admissionDay = admissionDate.getDate();
                                                const threshold = catConfig.thresholdDays || 0;
                                                const isFirstMonth = mDate.getFullYear() === admissionDate.getFullYear() && mDate.getMonth() === admissionDate.getMonth();
                                                const thresholdMultiplier = (isFirstMonth && threshold > 0 && admissionDay > threshold) ? 0.5 : 1;

                                                return sum + (Number(amount) * tierMultiplier * thresholdMultiplier || 0);
                                            }, 0);

                                            return total + aggregateTotal;
                                        }, 0);

                                        if (entries.length === 0) {
                                            return <p className="p-8 text-center text-slate-300 font-bold italic font-bengali">কোনো বকেয়া তথ্য পাওয়া যায়নি</p>;
                                        }

                                        return (
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-[#045c84] text-white">
                                                        <th className="p-4 text-left text-xs font-black uppercase tracking-widest rounded-tl-2xl">বিবরণ (Particulars)</th>
                                                        <th className="p-4 text-center text-xs font-black uppercase tracking-widest">মাস/সাইকেল (Cycle)</th>
                                                        <th className="p-4 text-right text-xs font-black uppercase tracking-widest rounded-tr-2xl">পরিমাণ (Amount)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {entries.map(([category, data]: [any, any], idx) => {
                                                        const categoryObj = categories.find(c => c.name === category);
                                                        const catConfig = categoryObj?.config || {};
                                                        const catStartDate = catConfig.startDate ? new Date(catConfig.startDate) : null;
                                                        const admissionDate = new Date(student.metadata?.admissionDate || student.createdAt);
                                                        let effectiveStart = catStartDate || admissionDate;
                                                        const today = new Date();
                                                        const cyclesToShow: any[] = [];
                                                        const interval = catConfig.interval || categoryObj?.frequency || 'monthly';
                                                        const isMonthly = interval === 'monthly' || category.includes('মাসিক');

                                                        if (isMonthly) {
                                                            let curr = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
                                                            const end = new Date(today.getFullYear(), today.getMonth(), 1);
                                                            while (curr <= end) {
                                                                cyclesToShow.push(new Date(curr));
                                                                curr.setMonth(curr.getMonth() + 1);
                                                                if (cyclesToShow.length > 120) break;
                                                            }
                                                        } else {
                                                            data.items.forEach((it: any) => cyclesToShow.push(new Date(it.date)));
                                                        }

                                                        const filteredCycles = cyclesToShow.filter(m => {
                                                            const key = `${category}-${m.getFullYear()}-${m.getMonth()}`;
                                                            return statusMap[key]?.status !== 'COMPLETED';
                                                        });

                                                        const aggregateTotal = filteredCycles.reduce((sum, mDate) => {
                                                            const key = `${category}-${mDate.getFullYear()}-${mDate.getMonth()}`;
                                                            const info = statusMap[key];
                                                            const amount = info?.amount || data.items[0]?.amount || categoryObj?.amount || 0;
                                                            
                                                            // Threshold Logic
                                                            const admissionDay = admissionDate.getDate();
                                                            const threshold = catConfig.thresholdDays || 0;
                                                            const isFirstMonth = mDate.getFullYear() === admissionDate.getFullYear() && mDate.getMonth() === admissionDate.getMonth();
                                                            const thresholdMultiplier = (isFirstMonth && threshold > 0 && admissionDay > threshold) ? 0.5 : 1;

                                                            return sum + (Number(amount) * tierMultiplier * thresholdMultiplier || 0);
                                                        }, 0);

                                                        return (
                                                            <tr key={idx} className="border-b border-slate-100 font-bengali">
                                                                <td className="p-4">
                                                                    <p className="font-black text-slate-800">{category}</p>
                                                                    <p className="text-[10px] text-slate-400">ব্যালেন্স ট্রান্সফার বা সরাসরি ফি</p>
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <div className="flex flex-wrap justify-center gap-1">
                                                                        {filteredCycles.sort((a: any, b: any) => a.getTime() - b.getTime()).map((date: any, iIdx: number) => (
                                                                            <span key={iIdx} className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100">
                                                                                {isMonthly ? BENGALI_MONTHS[date.getMonth()] : date.toLocaleDateString('bn-BD')}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <p className="text-sm font-black text-slate-800">৳{aggregateTotal?.toLocaleString('bn-BD')}</p>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-900 font-bengali text-white">
                                                        <td colSpan={2} className="p-4 text-right font-black uppercase tracking-widest rounded-bl-2xl">মোট বকেয়া (TOTAL DUE)</td>
                                                        <td className="p-4 text-right font-black text-xl rounded-br-2xl">৳{overallGrandTotal?.toLocaleString('bn-BD')}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        );
                                    })()}
                                </div>
                            </div>
                        </PrintLayout>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
