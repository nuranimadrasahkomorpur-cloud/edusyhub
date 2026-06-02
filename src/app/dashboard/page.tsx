'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    TrendingUp,
    GraduationCap,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    Building2,
    ShieldCheck,
    Loader2,
    Calendar,
    Bell,
    Activity,
    Server,
    AlertCircle,
    MapPin,
    FileText,
    ClipboardList,
    MoreVertical,
    LogOut,
    CheckCircle2,
    UserPlus,
    Plus,
    ArrowRight,
    Search,
    ChevronRight,
    Zap,
    Briefcase,
    School
} from 'lucide-react';
import { useSession } from '@/components/SessionProvider';
import { useUI } from '@/components/UIProvider';
import InstituteProfileModal from '@/components/InstituteProfileModal';
import InstituteSwitcher from '@/components/InstituteSwitcher';
import StudentAssignmentProgress from '@/components/StudentAssignmentProgress';
import { useRouter } from 'next/navigation';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';

export default function DashboardPage() {
    const { activeRole, activeInstitute, switchInstitute, user, setAllInstitutes, isLoading } = useSession();
    const router = useRouter();
    const [statsData, setStatsData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const hasFetchedInstitutes = React.useRef(false);

    // Role-based redirection
    useEffect(() => {
        if (!isLoading && activeRole) {
            if (activeRole === 'GUARDIAN') {
                router.replace('/dashboard/guardian');
            } else if (activeRole === 'STUDENT') {
                router.replace('/dashboard/student');
            } else if (activeRole === 'TEACHER') {
                router.replace('/dashboard/teacher');
            }
        }
    }, [activeRole, isLoading, router]);

    // Effect 1: Auto-fetch institutes if missing OR empty in session (Teachers initially have empty array)
    useEffect(() => {
        if (user?.id && (!user.institutes || user.institutes.length === 0) && !hasFetchedInstitutes.current) {
            hasFetchedInstitutes.current = true;
            fetch(`/api/institute?userId=${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        console.log('Auto-fetched institutes:', data);
                        setAllInstitutes(data);
                        // Also set active institute if none selected
                        if (!activeInstitute && data.length > 0) {
                            const defaultInst = data.find((i: any) => i.id === user.defaultInstituteId) || data[0];
                            switchInstitute(defaultInst);
                        }
                    }
                })
                .catch(err => {
                    console.error('Failed to auto-fetch institutes:', err);
                    // improved error handling: don't reset flag on error to avoid infinite retry loop
                });
        }
    }, [user?.id, user?.institutes, setAllInstitutes, switchInstitute, activeInstitute, user?.defaultInstituteId]);

    // Effect 2: Initialize active institute for non-Super Admins if null (and institutes already exist)
    useEffect(() => {
        if (activeRole !== 'SUPER_ADMIN' && !activeInstitute && user?.institutes && user.institutes.length > 0) {
            const defaultInst = user.institutes.find((i: any) => i.id === user.defaultInstituteId) || user.institutes[0];
            switchInstitute(defaultInst);
        }
    }, [activeRole, activeInstitute, user?.institutes, user?.defaultInstituteId, switchInstitute]);

    // Effect 3: Super Admin Stats
    useEffect(() => {
        if (activeRole === 'SUPER_ADMIN') {
            setLoading(true);
            fetch('/api/admin/stats')
                .then(res => res.json())
                .then(data => {
                    setStatsData(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch stats:', err);
                    setLoading(false);
                });
        }
    }, [activeRole]);

    if (isLoading || !activeRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    if (activeRole === 'SUPER_ADMIN') {
        return <SuperAdminDashboard statsData={statsData} loading={loading} />;
    }

    if (activeRole === 'ADMIN' || activeRole === 'ACCOUNTANT') {
        return <AdminDashboard activeInstitute={activeInstitute} />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );
}





// --- Super Admin Dashboard (System Oversight) ---
function SuperAdminDashboard({ statsData, loading }: { statsData: any, loading: boolean }) {
    const stats = statsData ? [
        { name: 'মোট প্রতিষ্ঠান', value: statsData.institutes.toLocaleString('bn-BD'), icon: Building2, color: 'blue', change: '+২', up: true },
        { name: 'মোট ইউজার', value: statsData.users.toLocaleString('bn-BD'), icon: Users, color: 'sky', change: '+৫%', up: true },
        { name: 'অ্যাডমিন ইউজার', value: (statsData.roleBreakdown.ADMIN || 0).toLocaleString('bn-BD'), icon: ShieldCheck, color: 'teal', change: '+১', up: true },
        { name: 'শিক্ষার্থী', value: (statsData.roleBreakdown.STUDENT || 0).toLocaleString('bn-BD'), icon: GraduationCap, color: 'cyan', change: '+১০%', up: true },
    ] : [];

    return (
        <div className="p-8 space-y-8 animate-fade-in font-bengali">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                        <ShieldCheck className="text-[#045c84]" size={36} />
                        সিস্টেম ওভারসাইট
                    </h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">মাস্টার কন্ট্রোল ড্যাশবোর্ড</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-right">সার্ভার স্ট্যাটাস</span>
                        <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            সিস্টেম অনলাইন
                        </span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-[#045c84] mb-4" size={40} />
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">তথ্য লোড হচ্ছে...</p>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat) => (
                            <div key={stat.name} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-50 rounded-bl-[100px] -z-0 opacity-50 transition-all group-hover:scale-150`}></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:bg-${stat.color}-600 group-hover:text-white transition-all shadow-sm`}>
                                            <stat.icon size={26} />
                                        </div>
                                        <div className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-tighter ${stat.up ? 'text-emerald-700' : 'text-orange-600'}`}>
                                            {stat.change}
                                            {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        </div>
                                    </div>
                                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{stat.name}</p>
                                    <h3 className="text-4xl font-black text-slate-800 mt-1">{stat.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Server Health */}
                        <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm p-10 flex flex-col min-h-[450px]">
                            <div className="flex items-center justify-between mb-10">
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                    <Server size={24} className="text-[#045c84]" />
                                    সার্ভার পারফরম্যান্স
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-[#045c84] rounded-full" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">রিয়েল টাইম</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-10">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">CPU ইউসেজ</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">ইনটেল জেনন গোল্ড ৬৩৩০</p>
                                        </div>
                                        <span className="text-xl font-black text-[#045c84]">২৫%</span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                        <div className="h-full bg-gradient-to-r from-[#045c84] to-sky-400 w-1/4 rounded-full shadow-inner"></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">মেমোরি ইউসেজ</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">১২৮জিবি ডিডিআর৪ ইসিসি</p>
                                        </div>
                                        <span className="text-xl font-black text-sky-500">৪২%</span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                        <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-400 w-[42%] rounded-full shadow-inner"></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">নেটওয়ার্ক ট্রাফিক</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">১০ জিবিপিএস আপলিঙ্ক</p>
                                        </div>
                                        <span className="text-xl font-black text-emerald-500">০৮%</span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 w-[8%] rounded-full shadow-inner"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent System Alerts */}
                        <div className="bg-[#045c84] rounded-[40px] shadow-2xl p-10 text-white relative overflow-hidden group">
                            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                            <h3 className="text-xl font-black mb-10 uppercase tracking-tight flex items-center gap-3">
                                <AlertCircle size={24} className="text-sky-300" />
                                গুরুত্বপূর্ণ এলার্ট
                            </h3>
                            <div className="space-y-6 relative z-10">
                                <div className="p-5 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-xl hover:bg-white/15 transition-all cursor-pointer">
                                    <p className="text-sm font-black leading-relaxed">নতুন ৫টি প্রতিষ্ঠান অনুমোদনের অপেক্ষায় আছে</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                                        <p className="text-[10px] font-black text-sky-300 uppercase tracking-widest">২ ঘণ্টা আগে</p>
                                    </div>
                                </div>
                                <div className="p-5 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-xl hover:bg-white/15 transition-all cursor-pointer text-emerald-100">
                                    <p className="text-sm font-black leading-relaxed">সার্ভার ব্যাকআপ সম্পন্ন হয়েছে সফলভাবে</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                        <p className="text-[10px] font-black text-sky-300 uppercase tracking-widest">৫ ঘণ্টা আগে</p>
                                    </div>
                                </div>
                                <div className="p-5 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-xl hover:bg-white/15 transition-all cursor-pointer text-amber-100">
                                    <p className="text-sm font-black leading-relaxed">ডাটাবেজ মেইনটেন্যান্স শিডিউল করা হয়েছে</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                        <p className="text-[10px] font-black text-sky-300 uppercase tracking-widest">আগামীকাল</p>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full mt-10 py-5 bg-white text-[#045c84] font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] hover:bg-sky-50 transition-all shadow-xl active:scale-95">
                                সমস্ত লগ আর্কাইভ দেখুন
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

import InstituteOnboarding from '@/components/InstituteOnboarding';
import PublicInstituteSearch from '@/components/PublicInstituteSearch';

function OnboardingRouter({ role, user, onComplete }: { role: string, user: any, onComplete: () => void }) {
    const [view, setView] = useState<'CHOICE' | 'CREATE' | 'SEARCH'>(
        role === 'ADMIN' ? 'CREATE' : (role === 'STUDENT' || role === 'GUARDIAN' ? 'SEARCH' : 'CHOICE')
    );
    const router = useRouter();

    if (view === 'CREATE') {
        return <InstituteOnboarding onComplete={onComplete} />;
    }

    if (view === 'SEARCH') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col pt-20">
                <PublicInstituteSearch
                    role={role}
                    onBack={role === 'TEACHER' ? () => setView('CHOICE') : undefined}
                    onSelect={(inst) => {
                        if (role === 'STUDENT' || role === 'GUARDIAN') {
                            router.push(`/admission/${inst.id}`);
                        } else if (role === 'TEACHER') {
                            // Link as teacher logic? For now, redirect to institute page or show apply modal
                            router.push(`/admission/${inst.id}`); // They can apply as teacher via public form for now or we add Join API
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-bengali">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                <button
                    onClick={() => setView('CREATE')}
                    className="group bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl hover:shadow-2xl transition-all flex flex-col items-center text-center gap-6 hover:-translate-y-2 active:scale-95"
                >
                    <div className="w-24 h-24 bg-blue-50 text-[#045c84] rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/5">
                        <School size={48} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">নতুন প্রতিষ্ঠান তৈরি করুন</h3>
                        <p className="text-slate-500 font-medium leading-relaxed">আপনার নিজের মাদরাসা বা স্কুলের জন্য একটি নতুন এডুসি প্রোফাইল প্রোফাইল খুলুন।</p>
                    </div>
                </button>

                <button
                    onClick={() => setView('SEARCH')}
                    className="group bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl hover:shadow-2xl transition-all flex flex-col items-center text-center gap-6 hover:-translate-y-2 active:scale-95"
                >
                    <div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-teal-900/5">
                        <Briefcase size={48} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">প্রতিষ্ঠানে যোগ দিন</h3>
                        <p className="text-slate-500 font-medium leading-relaxed">সার্চ করে আপনার পছন্দের প্রতিষ্ঠানে শিক্ষক বা স্টাফ হিসেবে যোগ দেওয়ার জন্য আবেদন করুন।</p>
                    </div>
                </button>
            </div>
        </div>
    );
}

// ... (other imports)

// --- Admin Dashboard ---
function AdminDashboard({ activeInstitute }: { activeInstitute: any }) {
    const { user, setAllInstitutes } = useSession();
    const { openAssignmentModal } = useUI();
    const router = useRouter();
    const [isInstModalOpen, setIsInstModalOpen] = useState(false);
    const [showInstituteSwitcher, setShowInstituteSwitcher] = useState(false);

    // Check if user has institutes (or activeInstitute found). 
    // If not, show Onboarding.
    // Note: session provider usually auto-fetches, so we rely on user.institutes length check
    // Logic: if loaded user but no institutes -> onboarding

    // We need to double check if "loading" state allows this check.
    // user.institutes can be undefined initially.
    // Assuming if activeInstitute is null AND user.institutes is explicitly empty array

    const [statsData, setStatsData] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchStats = async (showLoading = false) => {
            if (!activeInstitute?.id) return;
            if (showLoading) setStatsLoading(true);

            try {
                const res = await fetch(`/api/admin/institutes/stats?instituteId=${activeInstitute.id}&t=${Date.now()}`);
                const data = await res.json();
                if (isMounted) {
                    setStatsData(data);
                }
            } catch (err) {
                console.error('Failed to fetch institute stats:', err);
            } finally {
                if (isMounted && showLoading) {
                    setStatsLoading(false);
                }
            }
        };

        fetchStats(true); // Initial load with spinner text

        // Poll every 15 seconds for real-time updates without showing loading spinner
        const intervalId = setInterval(() => {
            fetchStats(false);
        }, 15000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [activeInstitute?.id]);

    const showOnboarding = user?.institutes && user.institutes.length === 0;

    const handleOnboardingComplete = () => {
        // Force reload of page or re-fetch institutes is handled by the component calling refreshSession
        // But we might need to update local state here if not fully reactive
        window.location.reload();
    };

    if (showOnboarding) {
        return <OnboardingRouter role={user.role} user={user} onComplete={handleOnboardingComplete} />;
    }

    const stats = [
        {
            name: 'মোট শিক্ষার্থী',
            value: statsLoading ? '...' : (statsData?.students ?? 0).toLocaleString('bn-BD'),
            icon: Users,
            color: 'blue',
            change: (statsData?.pendingStudents > 0) ? `অপেক্ষমাণ: ${(statsData.pendingStudents).toLocaleString('bn-BD')}` : '+০%',
            up: true
        },
        {
            name: 'মোট শিক্ষক',
            value: statsLoading ? '...' : (statsData?.teachers ?? 0).toLocaleString('bn-BD'),
            icon: GraduationCap,
            color: 'sky',
            change: '+০',
            up: true
        },
        {
            name: 'মোট আয়',
            value: statsLoading ? '...' : `৳${(statsData?.revenue ?? 0).toLocaleString('bn-BD')}`,
            icon: CreditCard,
            color: 'teal',
            change: '০%',
            up: true
        },
        {
            name: 'উপস্থিতি',
            value: statsLoading ? '...' : (statsData?.attendance !== undefined && statsData?.attendance !== null ? `${statsData.attendance.toLocaleString('bn-BD')}%` : '০%'),
            icon: TrendingUp,
            color: 'cyan',
            change: '০%',
            up: true
        },
    ];

    console.log('ADMIN DASHBOARD ACTIVE INST:', activeInstitute);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">

            {/* Header Section with Cover Image */}
            <div className="relative">
                {activeInstitute?.coverImage ? (
                    <div className="w-full h-[150px] relative overflow-hidden group">
                        <img
                            src={activeInstitute.coverImage}
                            alt="Cover"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                ) : (
                    <div className="w-full h-[150px] bg-gradient-to-r from-[#045c84] via-[#047cac] to-[#639fb0] relative overflow-hidden shadow-[inset_0_-60px_60px_-30px_rgba(0,0,0,0.3)]">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    </div>
                )}

                {/* Switch Institute Button - Top Right on Cover (Mobile Only) */}
                <div className="md:hidden absolute top-4 right-4 z-20">
                    <button
                        onClick={() => setShowInstituteSwitcher(true)}
                        className="px-4 py-2 bg-white/90 backdrop-blur-md border border-white/50 text-slate-700 font-bold rounded-xl shadow-lg hover:bg-white transition-all active:scale-95 text-xs uppercase tracking-wider font-bengali"
                    >
                        প্রতিষ্ঠান পরিবর্তন
                    </button>
                </div>

                {/* Profile Circle and Info */}
                <div className="px-4 md:px-8 flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 relative z-10">
                    {/* Logo - Centered on Mobile */}
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-[6px] border-white bg-slate-100 shadow-xl overflow-hidden relative flex items-center justify-center text-[#045c84] text-5xl font-black italic shadow-blue-900/10">
                            {activeInstitute?.logo ? (
                                <img src={activeInstitute.logo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                activeInstitute?.name ? activeInstitute.name[0] : 'E'
                            )}
                        </div>
                    </div>

                    {/* Institute Info - Centered on Mobile */}
                    <div className="flex-1 pb-2 text-center md:text-left">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">
                            {activeInstitute?.name || 'এডুসি ইনস্টিটিউট'}
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-4 mt-1 text-slate-500 font-medium font-bengali flex-wrap">
                            <span className="flex items-center gap-1 text-sm bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                <Building2 size={14} className="text-[#045c84]" />
                                {activeInstitute?.type || 'জেনারেল প্রোফাইল'}
                            </span>
                            <span className="flex items-center gap-1 text-sm bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                <Users size={14} className="text-[#045c84]" />
                                {statsLoading ? '...' : (statsData?.students ?? 0).toLocaleString('bn-BD')} শিক্ষার্থী
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons - Hidden on Mobile, Shown on Desktop */}
                    <div className="hidden md:flex pb-2 items-center gap-3">
                        <button
                            onClick={() => setShowInstituteSwitcher(true)}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-black rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-95 text-sm uppercase tracking-wider font-bengali"
                        >
                            প্রতিষ্ঠান পরিবর্তন
                        </button>

                        <button className="px-6 py-3 bg-[#045c84] text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all active:scale-95 text-sm uppercase tracking-wider font-bengali">
                            রিপোর্ট ডাউনলোড
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Stats and Content */}
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in-up font-bengali">
                <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {stats.map((stat) => (
                        <div key={stat.name} className="bg-white p-3 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center justify-between mb-2 md:mb-4">
                                <div className={`p-2 md:p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:bg-${stat.color}-600 group-hover:text-white transition-all`}>
                                    <stat.icon size={20} className="md:w-[26px] md:h-[26px]" />
                                </div>
                                <div className={`flex items-center gap-1 text-xs md:text-sm font-medium ${stat.up ? 'text-emerald-700' : 'text-orange-600'}`}>
                                    {stat.change}
                                    {stat.up ? <ArrowUpRight size={12} className="md:w-[14px] md:h-[14px]" /> : <ArrowDownRight size={12} className="md:w-[14px] md:h-[14px]" />}
                                </div>
                            </div>
                            <p className="text-slate-600 font-bold uppercase text-[10px] md:text-xs tracking-wider">{stat.name}</p>
                            <h3 className="text-xl md:text-3xl font-black text-slate-800 mt-1 break-words">{stat.value}</h3>
                        </div>
                    ))}
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Main Content Area (Left 3 cols) */}
                    <div className="lg:col-span-3 space-y-8">

                        {/* Summary Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Admission Trends */}
                            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 flex flex-col min-h-[400px] hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                            <TrendingUp className="text-[#045c84]" />
                                            ভর্তি সংক্রান্ত তথ্য
                                        </h3>
                                        <p className="text-slate-600 text-[10px] font-bold mt-1 uppercase tracking-widest">গত ৭ দিনের আপডেট</p>
                                    </div>
                                    <select className="bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black px-4 py-2 outline-none text-slate-700 uppercase tracking-widest">
                                        <option>এই সপ্তাহ</option>
                                        <option>এই মাস</option>
                                    </select>
                                </div>
                                <div className="flex-1 w-full min-h-[300px] h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={300}>
                                        <AreaChart data={statsData?.admissionTrends || []}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#045c84" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#045c84" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" hide />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#045c84" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                        মোট নতুন ভর্তি: {(statsData?.admissionTrends?.reduce((acc: number, curr: any) => acc + curr.value, 0) ?? 0).toLocaleString('bn-BD')} জন
                                    </span>
                                    <button className="text-[10px] font-black text-[#045c84] uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                                        বিশদ দেখুন <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* Attendance Quick View */}
                            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 flex flex-col min-h-[400px] hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                            <Zap className="text-amber-500" />
                                            হাজিরা স্ট্যাটাস
                                        </h3>
                                        <p className="text-slate-600 text-[10px] font-bold mt-1 uppercase tracking-widest">আজকের দিন</p>
                                    </div>
                                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        লাইভ
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <div className="flex items-center justify-around mb-8">
                                        <div className="text-center">
                                            <p className="text-4xl font-black text-slate-800">{(statsData?.attendance ?? 0).toLocaleString('bn-BD')}%</p>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">উপস্থিতি হার</p>
                                        </div>
                                        <div className="w-px h-12 bg-slate-100"></div>
                                        <div className="text-center">
                                            <p className="text-4xl font-black text-rose-500">
                                                {(100 - (statsData?.attendance ?? 0)).toLocaleString('bn-BD')}%
                                            </p>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">অনুপস্থিতি হার</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-[11px] font-bold">
                                            <span className="text-slate-700 uppercase">উপস্থিত শিক্ষার্থী</span>
                                            <span className="text-slate-800">{(statsData?.presentCount ?? 0).toLocaleString('bn-BD')} জন</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#045c84]" style={{ width: `${statsData?.attendance ?? 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <a href="/dashboard/attendance/summary" className="mt-8 py-4 bg-slate-50 text-[#045c84] font-black rounded-2xl text-[10px] text-center uppercase tracking-widest hover:bg-[#045c84] hover:text-white transition-all">
                                    পূর্ণাঙ্গ রিপোর্ট দেখুন
                                </a>
                            </div>
                        </div>

                        {/* Recent Activity / Progress */}
                        {activeInstitute?.id && (
                            <StudentAssignmentProgress instituteId={activeInstitute.id} title="শিক্ষার্থী ক্লাস ডাইরি প্রগ্রেস" />
                        )}
                    </div>

                    {/* Sidebar Area (Right 1 col) */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Quick Shortcuts */}
                        <div className="bg-[#045c84] rounded-[40px] shadow-xl p-8 text-white relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                            <h3 className="text-xl font-black mb-8 uppercase tracking-tight flex items-center gap-2">
                                <Plus size={20} />
                                দ্রুত কাজ
                            </h3>
                            <div className="space-y-4 relative z-10">
                                <button
                                    onClick={() => router.push('/dashboard/students')}
                                    className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md flex items-center gap-4 hover:bg-white hover:text-[#045c84] transition-all group/btn"
                                >
                                    <div className="p-2 bg-white/20 rounded-xl group-hover/btn:bg-[#045c84]/10">
                                        <UserPlus size={18} />
                                    </div>
                                    <span className="text-sm font-bold">নতুন শিক্ষার্থী ভর্তি</span>
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard/attendance')}
                                    className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md flex items-center gap-4 hover:bg-white hover:text-[#045c84] transition-all group/btn"
                                >
                                    <div className="p-2 bg-white/20 rounded-xl group-hover/btn:bg-[#045c84]/10">
                                        <Zap size={18} />
                                    </div>
                                    <span className="text-sm font-bold">আজকের হাজিরা দিন</span>
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard/attendance/summary')}
                                    className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md flex items-center gap-4 hover:bg-white hover:text-[#045c84] transition-all group/btn"
                                >
                                    <div className="p-2 bg-white/20 rounded-xl group-hover/btn:bg-[#045c84]/10">
                                        <FileText size={18} />
                                    </div>
                                    <span className="text-sm font-bold">রিপোর্ট জেনারেট করুন</span>
                                </button>
                            </div>
                        </div>

                        {/* System Health / Message */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Activity size={16} className="text-emerald-500" />
                                প্রোফাইল পূর্ণতা
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-600 tracking-widest">
                                        <span>প্রোফাইল পূর্ণতা</span>
                                        <span>{(statsData?.profileHealth ?? 0).toLocaleString('bn-BD')}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${statsData?.profileHealth ?? 0}%` }}></div>
                                    </div>
                                </div>
                                {statsData?.profileHealth < 100 && (
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <p className="text-[11px] font-bold text-[#045c84] leading-relaxed">
                                            আপনার প্রতিষ্ঠানের প্রোফাইল আরও প্রফেশনাল করতে প্রয়োজনীয় তথ্যগুলো আপডেট করুন।
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming Events (Assignments) */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
                            <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Calendar size={16} className="text-rose-500" />
                                আসন্ন ঘটনা
                            </h3>
                            <div className="space-y-4">
                                {statsData?.upcomingAssignments?.length > 0 ? (
                                    statsData.upcomingAssignments.map((assignment: any) => {
                                        const date = new Date(assignment.deadline);
                                        const day = date.getDate().toLocaleString('bn-BD');
                                        const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
                                        const month = monthNames[date.getMonth()];
                                        const time = date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

                                        return (
                                            <div key={assignment.id} className="flex gap-4">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{month}</span>
                                                    <span className="text-sm font-black text-slate-800 leading-none mt-1">{day}</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-700">{assignment.title || 'অ্যাসাইনমেন্ট'}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{time}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-4 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">কোন আসন্ন ইভেন্ট নেই</p>
                                    </div>
                                )}
                            </div>
                            <button className="w-full mt-6 text-[10px] font-black text-[#045c84] uppercase tracking-widest border border-blue-50 py-3 rounded-2xl hover:bg-blue-50 transition-all">
                                ক্যালেন্ডার দেখুন
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Institute Profile Modal */}
            <InstituteProfileModal
                isOpen={isInstModalOpen}
                onClose={() => setIsInstModalOpen(false)}
                institute={activeInstitute}
            />

            <SwitchInstituteModal
                isOpen={showInstituteSwitcher}
                onClose={() => setShowInstituteSwitcher(false)}
            />
        </div>
    );
}

// --- Switch Institute Modal ---
function SwitchInstituteModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { user, switchInstitute, activeInstitute } = useSession();
    const { alert, confirm } = useUI();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 font-bengali">
                        <Building2 className="text-[#045c84]" size={20} />
                        প্রতিষ্ঠান পরিবর্তন করুন
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowDownRight className="rotate-45" size={20} />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                    {user?.institutes?.map((inst: any, index: number) => (
                        <div
                            key={inst?.id || `institute-${index}`}
                            className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group relative overflow-hidden cursor-pointer ${activeInstitute?.id === inst.id
                                ? 'bg-[#045c84] border-[#045c84] text-white shadow-lg shadow-blue-900/20'
                                : 'bg-white border-slate-200 hover:border-[#045c84] hover:shadow-md'
                                }`}
                        >
                            {/* Clickable overlay for switching */}
                            <div
                                onClick={() => {
                                    switchInstitute(inst);
                                    onClose();
                                }}
                                className="absolute inset-0 z-10 cursor-pointer"
                            />

                            {/* Cover Image Background */}
                            {inst.coverImage && (
                                <div className="absolute inset-0 z-0 pointer-events-none">
                                    <img src={inst.coverImage} className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />
                                    <div className={`absolute inset-0 ${activeInstitute?.id === inst.id ? 'bg-[#045c84]/80' : 'bg-white/40 group-hover:bg-white/20'}`}></div>
                                </div>
                            )}

                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 relative z-10 pointer-events-none ${activeInstitute?.id === inst.id
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-[#045c84] group-hover:bg-[#045c84] group-hover:text-white transition-colors'
                                }`}>
                                {inst.logo ? (
                                    <img src={inst.logo} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    inst.name[0]
                                )}
                            </div>

                            <div className="flex-1 min-w-0 relative z-10 pointer-events-none">
                                <p className={`font-bold text-sm truncate ${activeInstitute?.id === inst.id ? 'text-white' : 'text-slate-800'}`}>
                                    {inst.name}
                                </p>
                                <p className={`text-xs mt-0.5 truncate ${activeInstitute?.id === inst.id ? 'text-blue-100' : 'text-slate-500 font-medium'}`}>
                                    {inst.type}
                                </p>
                            </div>

                            {/* Three-dot menu for joined institutes */}
                            {inst.isOwner === false && (
                                <div className="relative z-20">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const menuId = `menu-${inst.id}`;
                                            const menu = document.getElementById(menuId);
                                            if (menu) {
                                                menu.classList.toggle('hidden');
                                            }
                                        }}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="বিকল্প"
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {/* Dropdown menu */}
                                    <div
                                        id={`menu-${inst.id}`}
                                        className="hidden absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden min-w-[150px]"
                                    >
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!await confirm(`আপনি কি নিশ্চিত যে ${inst.name} থেকে চলে যেতে চান?`)) return;

                                                try {
                                                    const res = await fetch('/api/teacher/leave', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            userId: user.id,
                                                            instituteId: inst.id
                                                        })
                                                    });

                                                    if (res.ok) {
                                                        window.location.reload();
                                                    } else {
                                                        const data = await res.json();
                                                        await alert(data.message || 'ত্রুটি ঘটেছে');
                                                    }
                                                } catch (err) {
                                                    await alert('সার্ভার এরর');
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                        >
                                            <LogOut size={14} />
                                            প্রতিষ্ঠান ত্যাগ করুন
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeInstitute?.id === inst.id && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-[#045c84] p-1.5 rounded-full shadow-sm z-10 pointer-events-none">
                                    <ShieldCheck size={14} />
                                </div>
                            )}
                        </div>
                    ))}

                    {(!user?.institutes || user.institutes.length === 0) && (
                        <div className="text-center py-8 text-slate-400 font-medium italic">
                            কোন প্রতিষ্ঠান পাওয়া যায়নি
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest"
                    >
                        বাতিল করুন
                    </button>
                </div>
            </div>
        </div>
    );
}
