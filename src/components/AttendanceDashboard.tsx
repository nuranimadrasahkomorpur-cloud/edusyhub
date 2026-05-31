'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Camera,
    QrCode,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Clock,
    XCircle,
    UserCheck,
    Calendar as CalendarIcon,
    LayoutGrid,
    Search,
    Building2,
    Lock
} from 'lucide-react';
import { useSession } from './SessionProvider';
import dynamic from 'next/dynamic';

const FRSAttendanceScanner = dynamic<{ classId?: string, selectedDate?: string }>(() => import('@/components/FRSAttendanceScanner'), { ssr: false });
const ManualAttendance = dynamic<{ classId: string; selectedDate: string }>(() => import('@/components/ManualAttendance'), { ssr: false });

type AttendanceMode = 'MANUAL' | 'FRS' | 'QR';

export default function AttendanceDashboard() {
    const { user, activeRole, activeInstitute } = useSession();
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [activeMode, setActiveMode] = useState<AttendanceMode>('MANUAL');
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeInstitute) {
            fetchClasses();
        }
    }, [activeInstitute]);

    const isOwner = (activeInstitute?.adminIds || []).includes(user?.id) || activeInstitute?.isOwner === true;

    const isAdminUser = isOwner || (() => {
        const profile = (user?.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
        return profile?.status === 'ACTIVE' && profile?.isAdmin === true;
    })();

    const canTakeAttendanceForClass = (classId: string) => {
        if (!classId) {
            return isAdminUser;
        }
        if (isOwner) return true;
        if (user?.teacherProfiles) {
            const profile = (user.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            if (!profile || profile.status !== 'ACTIVE') return false;
            if (profile.isAdmin) return true;
            if (!profile.permissions?.classWise) return false;

            const classPermissions = profile.permissions.classWise[classId];
            if (!classPermissions) return false;

            // New structure check
            if (classPermissions && typeof classPermissions === 'object' && classPermissions.permissions && Array.isArray(classPermissions.permissions)) {
                return classPermissions.permissions.includes('canTakeAttendance');
            }

            // Older structures
            if (Array.isArray(classPermissions)) {
                return classPermissions.includes('canTakeAttendance');
            }
            if (classPermissions && typeof classPermissions === 'object') {
                return classPermissions.canTakeAttendance === true;
            }
            if (typeof classPermissions === 'string') {
                return classPermissions === 'canTakeAttendance';
            }
        }
        return false;
    };

    const isClassAssignedToTeacher = (classId: string) => {
        if (!classId) return isAdminUser;
        if (isOwner) return true;
        if (user?.teacherProfiles) {
            const profile = (user.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute?.id);
            if (!profile || profile.status !== 'ACTIVE') return false;
            if (profile.isAdmin) return true;
            
            // Check if class is in assignedClassIds or has class-wise permission config
            const isAssigned = (profile.assignedClassIds || []).includes(classId);
            const hasClassWiseConfig = !!profile.permissions?.classWise?.[classId];
            return isAssigned || hasClassWiseConfig;
        }
        return false;
    };

    const fetchClasses = async () => {
        try {
            const res = await fetch(`/api/admin/classes?instituteId=${activeInstitute?.id}`);
            if (res.ok) {
                const data = await res.json();
                const allClasses = Array.isArray(data) ? data : [];
                setClasses(allClasses);
                if (selectedClassId === null) {
                    if (isAdminUser) {
                        setSelectedClassId('');
                    } else if (allClasses.length > 0) {
                        // Find first class that is permitted, fallback to first class in list
                        const firstPermitted = allClasses.find((c: any) => canTakeAttendanceForClass(c.id));
                        setSelectedClassId(firstPermitted ? firstPermitted.id : allClasses[0].id);
                    } else {
                        setSelectedClassId('');
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 200;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const hasPermissionForSelectedClass = selectedClassId ? canTakeAttendanceForClass(selectedClassId) : isAdminUser;

    useEffect(() => {
        if (!hasPermissionForSelectedClass && activeMode !== 'MANUAL') {
            setActiveMode('MANUAL');
        }
    }, [hasPermissionForSelectedClass, activeMode]);

    // Center active tab when it changes
    useEffect(() => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const activeBtn = container.querySelector(`[data-class-id="${selectedClassId || ''}"]`) as HTMLElement;
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
    }, [selectedClassId, classes]);

    return (
        <div className="min-h-screen bg-[#f8fafc] font-bengali">
            {/* Ultra-Compact Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 md:px-6 py-2 shadow-sm">
                <div className="max-w-[1640px] mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#045c84] rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-900/10 shrink-0">
                            <Building2 size={18} />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none truncate max-w-[120px] md:max-w-none">
                                {activeInstitute?.name || 'হাজিরা'}
                            </h1>
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs md:text-sm font-black text-slate-600 px-3 py-1 cursor-pointer focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    {hasPermissionForSelectedClass && (
                        <div className="flex items-center gap-2">
                            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-hidden">
                                {[
                                    { id: 'MANUAL', label: 'ম্যানুয়াল', icon: LayoutGrid },
                                    { id: 'FRS', label: 'ফেস রিডিং', icon: Camera },
                                    { id: 'QR', label: 'কিউআর কোড', icon: QrCode },
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setActiveMode(mode.id as AttendanceMode)}
                                        className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all duration-300 ${activeMode === mode.id
                                            ? 'bg-white text-[#045c84] shadow-sm font-black ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:text-slate-700 font-bold opacity-70'
                                            }`}
                                    >
                                        <mode.icon size={16} />
                                        <span className="text-xs font-black whitespace-nowrap hidden sm:inline">{mode.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {classes.length === 0 && !isAdminUser ? (
                <div className="max-w-md mx-auto py-20 text-center px-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                        <Users className="opacity-20 text-[#045c84]" size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">কোনো ক্লাস অ্যাসাইন করা হয়নি</h3>
                    <p className="text-slate-500 font-bold text-sm mt-2 leading-relaxed">
                        আপনাকে কোনো ক্লাস অ্যাসাইন করা হয়নি। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।
                    </p>
                </div>
            ) : (
                <>
                    {/* Class Tabs - Horizontal Scrolling */}
                    <div className="bg-white border-b border-slate-200 relative group overflow-hidden">
                        <div className="max-w-[1640px] mx-auto px-4 py-3 relative">
                            <div
                                ref={scrollRef}
                                className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap relative"
                            >
                                {user && (
                                    <button
                                        data-class-id=""
                                        onClick={() => setSelectedClassId('')}
                                        className={`px-8 py-3.5 rounded-2xl text-base transition-all duration-300 relative flex items-center gap-2 ${selectedClassId === ''
                                            ? 'bg-[#045c84]/10 text-[#045c84] font-black border-2 border-[#045c84]/40 shadow-lg shadow-[#045c84]/5'
                                            : 'bg-[#f1f5f9] text-slate-500 font-bold border-2 border-transparent hover:bg-slate-200 hover:text-slate-700'
                                            }`}
                                    >
                                        {!isAdminUser && <Lock size={14} className="text-red-500 shrink-0" />}
                                        সব ক্লাস
                                        {selectedClassId === '' && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#045c84] rounded-full"
                                            />
                                        )}
                                    </button>
                                )}
                                {classes.map((cls) => {
                                    const hasPerm = canTakeAttendanceForClass(cls.id);
                                    return (
                                        <button
                                            key={cls.id}
                                            data-class-id={cls.id}
                                            onClick={() => setSelectedClassId(cls.id)}
                                            className={`px-8 py-3.5 rounded-2xl text-base transition-all duration-300 relative flex items-center gap-2 ${
                                                selectedClassId === cls.id
                                                    ? 'bg-[#045c84]/10 text-[#045c84] font-black border-2 border-[#045c84]/40 shadow-lg shadow-[#045c84]/5'
                                                    : 'bg-[#f1f5f9] text-slate-500 font-bold border-2 border-transparent hover:bg-slate-200 hover:text-slate-700'
                                            }`}
                                        >
                                            {!hasPerm && <Lock size={14} className="text-red-500 shrink-0" />}
                                            {cls.name}
                                            {selectedClassId === cls.id && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#045c84] rounded-full"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="max-w-[1640px] mx-auto px-3 py-6 sm:px-6">
                        <AnimatePresence mode="wait">
                            {activeMode === 'MANUAL' && (
                                <motion.div
                                    key="manual"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <ManualAttendance classId={selectedClassId || ''} selectedDate={selectedDate} />
                                </motion.div>
                            )}

                            {activeMode === 'FRS' && (
                                <motion.div
                                    key="frs"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                >
                                    <FRSAttendanceScanner classId={selectedClassId || ''} selectedDate={selectedDate} />
                                </motion.div>
                            )}

                            {activeMode === 'QR' && (
                                <motion.div
                                    key="qr"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-white rounded-2xl border-4 border-white shadow-2xl p-20 flex flex-col items-center justify-center text-center"
                                >
                                    <div className="w-32 h-32 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-8 ring-8 ring-slate-50/50">
                                        <QrCode size={64} />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-800 mb-4 italic uppercase tracking-tighter">কিউআর কোড স্ক্যানার</h2>
                                    <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">এই মোডটি বর্তমানে ডেভেলপমেন্ট পর্যায়ে আছে। শীঘ্রই আপনি আইডি কার্ড স্ক্যান করে হাজিরা নিতে পারবেন।</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
