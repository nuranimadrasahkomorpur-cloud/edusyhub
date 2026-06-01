import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Check, Shield, BookOpen, CreditCard, Calendar, FileText, UserCheck, AlertCircle, ChevronDown, ChevronRight, Layers, GraduationCap, Settings2, Search, Info, Lock } from 'lucide-react';

interface Class {
    id: string;
    name: string;
    groups?: { id: string; name: string }[];
}

interface Book {
    id: string;
    name: string;
    classId: string;
    groupId?: string;
}

interface TeacherProfile {
    id: string;
    userId: string;
    instituteId: string;
    designation: string;
    permissions: any;
    assignedClassIds: string[];
    isAdmin: boolean;
    user: {
        name: string;
        email: string;
        phone: string;
    }
}

interface TeacherPermissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: TeacherProfile | null;
    classes: Class[];
    allBooks: Book[];
    onSave: (teacherId: string, updates: any) => Promise<void>;
    isReadOnly?: boolean;
    /** Only the true owner of the current institute can see & toggle admin power */
    canToggleAdminPower?: boolean;
}

const PERMISSION_CONFIG = [
    { key: 'canTakeAttendance', label: 'উপস্থিতি', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'canManageResult', label: 'ফলাফল', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'canCollectFees', label: 'ফি কালেকশন', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'canManageAdmission', label: 'ভর্তি ও স্টুডেন্ট', icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { key: 'canManageExam', label: 'পরীক্ষা', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { key: 'canManageRoutine', label: 'রুটিন', icon: Calendar, color: 'text-pink-600', bg: 'bg-pink-50' },
];

type SectionTab = 'permissions' | 'subjects' | 'groups';

export default function TeacherPermissionModal({
    isOpen,
    onClose,
    teacher,
    classes,
    allBooks = [],
    onSave,
    isReadOnly = false,
    canToggleAdminPower = false
}: TeacherPermissionModalProps) {
    const [classWiseData, setClassWiseData] = useState<Record<string, any>>({});
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeClassId, setActiveClassId] = useState<string | null>(null);
    const [activeSectionTab, setActiveSectionTab] = useState<SectionTab>('permissions');
    const [showInfo, setShowInfo] = useState<Record<string, boolean>>({});

    const toggleInfo = (id: string) => {
        setShowInfo(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        if (teacher) {
            setIsAdmin(teacher.isAdmin || false);

            if (teacher.permissions?.classWise) {
                const oldClassWise = teacher.permissions.classWise;
                const isNewStructure = Object.values(oldClassWise).every(val =>
                    typeof val === 'object' && !Array.isArray(val)
                );

                if (isNewStructure) {
                    setClassWiseData(oldClassWise);
                } else {
                    const migrated: Record<string, any> = {};
                    Object.keys(oldClassWise).forEach(clsId => {
                        migrated[clsId] = {
                            permissions: Array.isArray(oldClassWise[clsId]) ? oldClassWise[clsId] : [],
                            groupIds: [],
                            bookIds: []
                        };
                    });
                    setClassWiseData(migrated);
                }
            } else {
                const initialData: Record<string, any> = {};
                if (teacher.assignedClassIds && teacher.assignedClassIds.length > 0) {
                    teacher.assignedClassIds.forEach(classId => {
                        initialData[classId] = {
                            permissions: [],
                            groupIds: [],
                            bookIds: []
                        };
                    });
                }
                setClassWiseData(initialData);
            }
        }
    }, [teacher, isOpen]);

    // Set initial active class
    useEffect(() => {
        if (isOpen && !activeClassId) {
            const assignedIds = Object.keys(classWiseData);
            if (assignedIds.length > 0) {
                setActiveClassId(assignedIds[0]);
            } else if (classes.length > 0) {
                setActiveClassId(classes[0].id);
            }
        }
    }, [isOpen, classWiseData, classes]);

    const togglePermission = (classId: string, permKey: string) => {
        if (isReadOnly) return;
        setClassWiseData(prev => {
            const current = prev[classId] || { permissions: [], groupIds: [], bookIds: [] };
            const currentPerms = (Array.isArray(current.permissions) ? current.permissions : []) as string[];
            const isEnabled = currentPerms.includes(permKey);
            const newPerms = isEnabled ? currentPerms.filter((k: string) => k !== permKey) : [...currentPerms, permKey];

            return {
                ...prev,
                [classId]: { ...current, permissions: newPerms }
            };
        });
    };

    const toggleGroup = (classId: string, groupId: string) => {
        if (isReadOnly) return;
        setClassWiseData(prev => {
            const current = prev[classId] || { permissions: [], groupIds: [], bookIds: [] };
            const currentGroups = (Array.isArray(current.groupIds) ? current.groupIds : []) as string[];
            const isEnabled = currentGroups.includes(groupId);
            const newGroups = isEnabled ? currentGroups.filter((id: string) => id !== groupId) : [...currentGroups, groupId];

            return {
                ...prev,
                [classId]: { ...current, groupIds: newGroups }
            };
        });
    };

    const toggleBook = (classId: string, bookId: string) => {
        if (isReadOnly) return;
        setClassWiseData(prev => {
            const current = prev[classId] || { permissions: [], groupIds: [], bookIds: [] };
            const currentBooks = (Array.isArray(current.bookIds) ? current.bookIds : []) as string[];
            const isEnabled = currentBooks.includes(bookId);

            let newBooks = isEnabled ? currentBooks.filter((id: string) => id !== bookId) : [...currentBooks, bookId];
            let newGroups = (Array.isArray(current.groupIds) ? current.groupIds : []) as string[];

            // Auto-select group if book is being selected
            if (!isEnabled) {
                const book = allBooks.find(b => b.id === bookId);
                if (book?.groupId && !newGroups.includes(book.groupId)) {
                    newGroups = [...newGroups, book.groupId];
                }
            }

            return {
                ...prev,
                [classId]: { ...current, bookIds: newBooks, groupIds: newGroups }
            };
        });
    };

    const toggleAllForClass = (classId: string) => {
        if (isReadOnly) return;
        setClassWiseData(prev => {
            const current = prev[classId] || { permissions: [], groupIds: [], bookIds: [] };
            const currentPerms = Array.isArray(current.permissions) ? current.permissions : [];
            const allKeys = PERMISSION_CONFIG.map(p => p.key);
            const isAllSelected = allKeys.every(k => currentPerms.includes(k));

            return {
                ...prev,
                [classId]: { ...current, permissions: isAllSelected ? [] : allKeys }
            };
        });
    };

    const handleSave = async () => {
        if (!teacher) return;
        setLoading(true);
        try {
            const derivedAssignedClassIds = Object.keys(classWiseData);

            await onSave(teacher.id, {
                permissions: {
                    classWise: classWiseData
                },
                assignedClassIds: derivedAssignedClassIds,
                isAdmin
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const isClassActive = (classId: string) => {
        return classWiseData[classId] !== undefined;
    };

    const toggleClassAssignment = (classId: string) => {
        if (isReadOnly) return;
        setClassWiseData(prev => {
            const next = { ...prev };
            if (next[classId] !== undefined) {
                delete next[classId];
            } else {
                // Inherit permissions from currently active class to prevent accidental empty permissions
                const inheritedPerms = activeClassId && prev[activeClassId] ? [...(prev[activeClassId].permissions || [])] : [];
                next[classId] = { permissions: inheritedPerms, groupIds: [], bookIds: [] };
            }
            return next;
        });
    };

    if (!isOpen || !teacher) return null;

    const activeClass = classes.find(c => c.id === activeClassId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="শিক্ষকের পারমিশন ও ক্লাস" maxWidth="max-w-5xl">
            <div className="space-y-6 md:space-y-8 p-1 font-bengali">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/60 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#045c84] text-white flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0 shadow-sm border border-white/20">
                            {teacher.user.name[0]}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg sm:text-xl text-slate-800 line-clamp-1">{teacher.user.name}</h3>
                            <p className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-widest mt-0.5 sm:mt-1">{teacher.designation || 'শিক্ষক'} • {teacher.user.phone || teacher.user.email}</p>
                        </div>
                    </div>
                    {canToggleAdminPower ? (
                        <label className={`sm:ml-auto flex items-center gap-2.5 group p-2.5 rounded-2xl transition-all ${isAdmin ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-100'}`}>
                            <div className={`w-11 h-6 rounded-full p-1 transition-colors ${isAdmin ? 'bg-red-500' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isAdmin ? 'translate-x-[1.25rem]' : ''}`} />
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={isAdmin}
                                onChange={(e) => {
                                    if (isReadOnly) return;
                                    setIsAdmin(e.target.checked);
                                }}
                                disabled={isReadOnly}
                            />
                            <div className="flex flex-col">
                                <span className={`text-[11px] font-bold uppercase tracking-widest leading-none ${isAdmin ? 'text-red-600' : 'text-slate-700'}`}>অ্যাডমিন পাওয়ার</span>
                                <span className="text-[9px] text-slate-500 font-medium mt-0.5">রোল ও পারমিশন কন্ট্রোল</span>
                            </div>
                        </label>
                    ) : isAdmin ? (
                        /* Non-owners see a locked badge if admin is already active */
                        <div className="sm:ml-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-red-50 border border-red-100">
                            <Shield size={14} className="text-red-500 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold uppercase tracking-widest leading-none text-red-600">অ্যাডমিন সক্রিয়</span>
                                <span className="text-[9px] text-slate-500 font-medium mt-0.5">শুধু মালিক পরিবর্তন করতে পারবেন</span>
                            </div>
                        </div>
                    ) : isReadOnly ? (
                        /* Show lock badge when read-only */
                        <div className="sm:ml-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200">
                            <Lock size={14} className="text-slate-400 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold uppercase tracking-widest leading-none text-slate-600">লকড প্যানেল</span>
                                <span className="text-[9px] text-slate-500 font-medium mt-0.5">শুধু মালিক পরিবর্তন করতে পারবেন</span>
                            </div>
                        </div>
                    ) : null}
                </div>

                {isAdmin && canToggleAdminPower && (
                    <div className="bg-red-50/40 border border-red-100/60 rounded-3xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white border border-red-100 flex items-center justify-center shrink-0">
                                    <Shield size={16} className="text-red-500" />
                                </div>
                                <p className="font-bold text-[12px] uppercase tracking-wider text-red-900">ফুল অ্যাডমিন এক্সেস সক্রিয়</p>
                            </div>
                            <button
                                onClick={() => toggleInfo('admin')}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${showInfo['admin'] ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-white border border-red-100 text-red-400 hover:text-red-500'}`}
                            >
                                <Info size={16} />
                            </button>
                        </div>
                        {showInfo['admin'] && (
                            <div className="pl-11 pr-2 pb-1 animate-in slide-in-from-top-2 duration-300">
                                <p className="text-[11px] text-red-700/80 leading-relaxed font-semibold">
                                    অ্যাডমিন হিসেবে সিলেক্ট করলে শিক্ষক সকল ফিচারে পূর্ণ এক্সেস পাবেন। নিচের ক্লাস বা বিষয়ভিত্তিক সেটিংস এক্ষেত্রে কার্যকর হবে না।
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-6 md:gap-8 min-h-[500px] h-auto md:h-[600px] relative">
                    {isReadOnly && (
                        <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl border border-slate-100">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 border border-slate-100">
                                <Lock size={28} className="text-slate-400" />
                            </div>
                            <h3 className="text-slate-800 font-bold text-lg">প্যানেলটি লক করা আছে</h3>
                            <p className="text-slate-500 text-[11px] font-bold tracking-wider uppercase mt-1">শুধুমাত্র প্রতিষ্ঠানের মালিক এটি এডিট করতে পারবেন</p>
                        </div>
                    )}
                    {/* Sidebar: Class List */}
                    <div className="md:w-64 shrink-0 flex flex-col space-y-2.5 h-auto md:h-full border-r border-slate-50 md:pr-4 m-[5px]">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none">ক্লাস</h4>
                            <span className="text-[8px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">{Object.keys(classWiseData).length}</span>
                        </div>
                        <div className="flex overflow-x-auto md:flex-col gap-1.5 pb-2 md:pb-0 custom-scrollbar md:overflow-y-auto">
                            {classes.map(cls => {
                                const isAssigned = isClassActive(cls.id);
                                const isActive = activeClassId === cls.id;
                                const data = classWiseData[cls.id];
                                return (
                                    <div
                                        key={cls.id}
                                        onClick={() => setActiveClassId(cls.id)}
                                        className={`
                                            group relative flex items-center gap-2 p-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap min-w-[130px] md:min-w-0
                                            ${isActive
                                                ? 'bg-[#045c84] border-[#045c84] text-white'
                                                : isAssigned
                                                    ? 'bg-[#045c84]/5 border-blue-100 text-[#045c84]'
                                                    : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'}
                                        `}
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleClassAssignment(cls.id);
                                            }}
                                            disabled={isReadOnly}
                                            className={`
                                                w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 border
                                                ${isAssigned
                                                    ? isActive
                                                        ? 'bg-white text-[#045c84] border-white'
                                                        : 'bg-[#045c84] text-white border-[#045c84]'
                                                    : 'bg-white border-slate-200'}
                                            `}
                                        >
                                            {isAssigned && <Check size={12} strokeWidth={3} />}
                                        </button>
                                        <div className="flex-1 overflow-hidden">
                                            <p className={`font-semibold text-[12px] ${isActive ? 'text-white' : 'text-slate-800'} truncate`}>{cls.name}</p>
                                            {isAssigned && (
                                                <div className={`flex items-center gap-1.5 mt-0.5 text-[7px] font-medium uppercase tracking-tight ${isActive ? 'text-white/50' : 'text-slate-600'}`}>
                                                    <span>{data?.permissions?.length || 0} p</span>
                                                    <span>•</span>
                                                    <span>{data?.bookIds?.length || 0} s</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0 h-auto md:h-full relative">
                        {activeClass ? (
                            <div className={`flex flex-col h-auto md:h-full overflow-hidden m-[5px] ${isAdmin ? 'opacity-30 pointer-events-none grayscale select-none' : ''}`}>
                                {/* Tab Header */}
                                <div className="border-b border-slate-100 shrink-0">
                                    <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-slate-100 text-[#045c84] flex items-center justify-center shrink-0">
                                            <Settings2 size={20} className="sm:w-6 sm:h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg sm:text-xl leading-tight">{activeClass.name}</h4>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5 sm:mt-1">ম্যানেজমেন্ট প্যানেল</p>
                                        </div>
                                        {!isClassActive(activeClass.id) && (
                                            <div className="ml-auto flex items-center gap-2 bg-white text-amber-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-amber-200">
                                                <AlertCircle size={12} className="sm:w-3.5 sm:h-3.5" />
                                                <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider">অ্যাসাইন করা হয়নি</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-1 overflow-x-auto scrollbar-hide px-2 sm:px-4">
                                    {[
                                        { id: 'permissions', label: 'পারমিশন', icon: Shield },
                                        { id: 'subjects', label: 'বই/বিষয়', icon: BookOpen },
                                        { id: 'groups', label: 'গ্রুপ', icon: Layers }
                                    ].map(tab => {
                                        const isActive = activeSectionTab === tab.id;
                                        const activeClassData = classWiseData[activeClass.id];
                                        const count = tab.id === 'permissions' ? activeClassData?.permissions?.length || 0
                                            : tab.id === 'subjects' ? activeClassData?.bookIds?.length || 0
                                                : activeClassData?.groupIds?.length || 0;

                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveSectionTab(tab.id as SectionTab)}
                                                className={`
                                                        relative flex items-center gap-2 px-4 sm:px-6 py-4 text-[13px] sm:text-sm font-bold transition-all rounded-t-3xl whitespace-nowrap
                                                        ${isActive
                                                        ? 'bg-white text-[#045c84] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#045c84]'
                                                        : 'text-slate-600 hover:text-slate-800'}
                                                    `}
                                            >
                                                <tab.icon size={16} className={isActive ? 'text-[#045c84]' : 'text-slate-400'} />
                                                <span className={isActive ? 'text-slate-800' : ''}>{tab.label}</span>
                                                {count > 0 && (
                                                    <span className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold ${isActive ? 'bg-[#045c84] text-white' : 'bg-slate-200 text-slate-700'}`}>
                                                        {count}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Tab Content Area */}
                                <div
                                    className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar relative"
                                    data-lenis-prevent
                                >
                                    {!isClassActive(activeClass.id) ? (
                                        <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center opacity-60">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                                                <Check size={28} className="sm:w-8 sm:h-8" />
                                            </div>
                                            <p className="font-bold text-slate-500 mb-4 text-sm sm:text-base">এই শিক্ষককে {activeClass.name} এ অ্যাসাইন করা নেই</p>
                                            <button
                                                onClick={() => toggleClassAssignment(activeClass.id)}
                                                className="px-6 py-2.5 bg-[#045c84] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:shadow-xl transition-all"
                                            >
                                                এখনই অ্যাসাইন করুন
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            {activeSectionTab === 'permissions' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">উপলব্ধ পারমিশন</p>
                                                        {!isReadOnly && (
                                                            <button
                                                                onClick={() => toggleAllForClass(activeClass.id)}
                                                                className="text-[11px] font-bold uppercase tracking-widest text-[#045c84] hover:text-[#034a6b] hover:underline decoration-2 underline-offset-4 transition-all"
                                                            >
                                                                {classWiseData[activeClass.id].permissions.length === PERMISSION_CONFIG.length ? 'সব মুছুন' : 'সব সিলেক্ট করুন'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {PERMISSION_CONFIG.map((perm) => {
                                                            const isPermActive = classWiseData[activeClass.id].permissions.includes(perm.key);
                                                            return (
                                                                <label
                                                                    key={perm.key}
                                                                    className={`
                                                                        flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all select-none
                                                                        ${isPermActive
                                                                            ? 'bg-white border-[#045c84]'
                                                                            : 'bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-300'}
                                                                        ${!isReadOnly ? 'cursor-pointer active:scale-[0.98]' : ''}
                                                                    `}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={isPermActive}
                                                                        onChange={() => togglePermission(activeClass.id, perm.key)}
                                                                        disabled={isReadOnly}
                                                                    />
                                                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-slate-50 ${perm.bg} ${perm.color}`}>
                                                                        <perm.icon size={20} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <span className={`text-[13px] font-bold block ${isPermActive ? 'text-slate-800' : 'text-slate-600'}`}>
                                                                            {perm.label}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5 block">এডিট ও ভিউ এক্সেস</span>
                                                                    </div>
                                                                    {isPermActive ? (
                                                                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-in zoom-in-50">
                                                                            <Check size={14} strokeWidth={4} />
                                                                        </div>
                                                                    ) : isReadOnly ? (
                                                                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                                                            <Lock size={12} strokeWidth={2.5} />
                                                                        </div>
                                                                    ) : null}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSectionTab === 'subjects' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#045c84] flex items-center justify-center shrink-0">
                                                                <GraduationCap size={18} />
                                                            </div>
                                                            <p className="text-[11px] text-slate-800 font-bold uppercase tracking-widest italic">বিষয়ভিত্তিক এক্সেস</p>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleInfo('subjects')}
                                                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${showInfo['subjects'] ? 'bg-[#045c84] text-white shadow-lg shadow-blue-100' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            <Info size={16} />
                                                        </button>
                                                    </div>

                                                    {showInfo['subjects'] && (
                                                        <div className="px-5 py-3 bg-blue-50/50 border border-blue-100/50 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                                            <p className="text-[11px] text-slate-600 font-bold leading-relaxed uppercase tracking-widest">
                                                                নির্ধারিত বিষয়ের ফলাফল ও কন্টেন্ট ম্যানেজমেন্ট। কোনো বিষয় সিলেক্ট না করলে শিক্ষক <strong className="text-slate-800">সকল বিষয়ের</strong> এক্সেস পাবেন।
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {(allBooks || []).filter(b => b.classId === activeClass.id).map(book => {
                                                            const isSelected = classWiseData[activeClass.id].bookIds.includes(book.id);
                                                            return (
                                                                <div
                                                                    key={book.id}
                                                                    onClick={() => toggleBook(activeClass.id, book.id)}
                                                                    className={`
                                                                        group relative bg-white rounded-2xl p-2.5 border transition-all duration-300 cursor-pointer flex gap-3 items-center
                                                                        ${isSelected
                                                                            ? 'border-[#045c84] bg-blue-50/50 ring-1 ring-[#045c84]'
                                                                            : 'border-slate-100 hover:border-[#045c84]/30 hover:shadow-md'}
                                                                    `}
                                                                >
                                                                    <div className={`
                                                                        absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all z-10
                                                                        ${isSelected
                                                                            ? 'bg-[#045c84] text-white scale-100'
                                                                            : 'bg-white text-slate-200 border border-slate-200 scale-0 group-hover:scale-100'}
                                                                    `}>
                                                                        <Check size={12} strokeWidth={4} />
                                                                    </div>

                                                                    <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                                                                        {(book as any).coverImage ? (
                                                                            <img src={(book as any).coverImage} alt={book.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                                <BookOpen size={16} />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <h3 className={`text-[13px] font-bold truncate transition-colors ${isSelected ? 'text-[#045c84]' : 'text-slate-800'}`}>
                                                                            {book.name}
                                                                        </h3>
                                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                                                                            {(book as any).author || 'নির্ধারিত নয়'}
                                                                        </p>
                                                                        {book.groupId && (
                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[8px] font-bold uppercase">
                                                                                    {activeClass.groups?.find(g => g.id === book.groupId)?.name || 'গ্রুপ'}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {(allBooks || []).filter(b => b.classId === activeClass.id).length === 0 && (
                                                        <div className="w-full bg-white border border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                                                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                <BookOpen size={24} className="text-slate-400" />
                                                            </div>
                                                            <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">এই ক্লাসে কোনো বই যুক্ত করা হয়নি</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeSectionTab === 'groups' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#045c84] flex items-center justify-center shrink-0">
                                                                <Layers size={18} />
                                                            </div>
                                                            <p className="text-[11px] text-slate-800 font-bold uppercase tracking-widest italic">ভার্চুয়াল গ্রুপ এক্সেস</p>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleInfo('groups')}
                                                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${showInfo['groups'] ? 'bg-[#045c84] text-white shadow-lg shadow-blue-100' : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            <Info size={16} />
                                                        </button>
                                                    </div>

                                                    {showInfo['groups'] && (
                                                        <div className="px-5 py-3 bg-slate-100/50 border border-slate-200/50 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                                            <p className="text-[11px] text-slate-600 font-bold leading-relaxed uppercase tracking-widest">
                                                                ভার্চুয়াল গ্রুপ এক্সেস। কোনো গ্রুপ সিলেক্ট না করলে শিক্ষক <strong className="text-slate-800">সকল স্টুডেন্টের</strong> এক্সেস পাবেন।
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap gap-3">
                                                        {(activeClass.groups || []).map(group => {
                                                            const isSelected = classWiseData[activeClass.id].groupIds.includes(group.id);
                                                            return (
                                                                <button
                                                                    key={group.id}
                                                                    onClick={() => toggleGroup(activeClass.id, group.id)}
                                                                    disabled={isReadOnly}
                                                                    className={`
                                                                        px-6 py-3 rounded-2xl text-[13px] font-bold transition-all border flex items-center gap-3
                                                                        ${isSelected
                                                                            ? 'bg-[#045c84] border-[#045c84] text-white shadow-lg shadow-blue-100'
                                                                            : 'bg-white border-slate-200 text-slate-600 hover:border-[#045c84] hover:text-[#045c84]'}
                                                                    `}
                                                                >
                                                                    {isSelected && <Check size={16} strokeWidth={4} className="animate-in zoom-in-50" />}
                                                                    <span>{group.name}</span>
                                                                </button>
                                                            );
                                                        })}

                                                        {(activeClass.groups || []).length === 0 && (
                                                            <div className="w-full bg-white border border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                                                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                    <Layers size={24} className="text-slate-400" />
                                                                </div>
                                                                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">এই ক্লাসে কোনো গ্রুপ নেই</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center">
                                <Search className="text-slate-300 mb-4" size={48} />
                                <p className="font-bold text-slate-500">বাম পাশ থেকে একটি ক্লাস নির্বাচন করুন</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 sm:pt-8 border-t border-slate-100">
                    <div className="flex items-center gap-3 opacity-40">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Shield size={12} className="text-slate-400" />
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Edusy Role Core v2.4</p>
                    </div>
                    <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                        <button onClick={onClose} className="flex-1 sm:flex-none px-6 sm:px-10 py-3.5 sm:py-4 rounded-[1.25rem] sm:rounded-[1.5rem] font-bold text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-800 transition-all border border-transparent hover:bg-slate-50">
                            {isReadOnly ? 'বন্ধ করুন' : 'বাতিল'}
                        </button>
                        {!isReadOnly && (
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-[2] sm:flex-none px-8 sm:px-12 py-3.5 sm:py-4 rounded-[1.25rem] sm:rounded-[1.5rem] font-bold text-[10px] sm:text-[11px] uppercase tracking-widest bg-[#045c84] text-white transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 sm:gap-3"
                            >
                                {loading ? (
                                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Check size={14} strokeWidth={4} />
                                )}
                                পরিবর্তন সেভ করুন
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
