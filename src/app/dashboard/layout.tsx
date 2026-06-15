'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Users,
    BookOpen,
    LayoutDashboard,
    Settings,
    LogOut,
    Bell,
    Search,
    Menu,
    X,
    CreditCard,
    GraduationCap,
    Calendar,
    Building2,
    ShieldCheck,
    HeartPulse,
    Presentation, // Classroom
    Library,      // Library
    ClipboardList,// Assignment
    Megaphone,    // Notice
    Zap,           // Attendance
    TrendingUp,
    MessageSquare,
    PenTool,
    BarChart3,
    Loader2
} from 'lucide-react';

import { useSession } from '@/components/SessionProvider';
import RoleSwitcher from '@/components/RoleSwitcher';
import ProfileModal from '@/components/ProfileModal';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';
import GlobalAssignmentModal from '@/components/GlobalAssignmentModal';
import { useUI } from '@/components/UIProvider';
import dynamic from 'next/dynamic';

const PageLoader = () => (
    <div className="flex h-[50vh] w-full items-center justify-center bg-slate-50/50">
        <Loader2 className="animate-spin text-primary" size={32} />
    </div>
);

const DashboardOverview = dynamic(() => import('./page'), { ssr: false, loading: PageLoader });
const StudentDashboard = dynamic(() => import('./student/page'), { ssr: false, loading: PageLoader });
const TeacherDashboard = dynamic(() => import('./teacher/page'), { ssr: false, loading: PageLoader });
const GuardianDashboard = dynamic(() => import('./guardian/page'), { ssr: false, loading: PageLoader });
const StudentManagementPage = dynamic(() => import('./students/page'), { ssr: false, loading: PageLoader });
const GuardianChildrenPage = dynamic(() => import('./guardian/children/page'), { ssr: false, loading: PageLoader });
const AttendanceScanPage = dynamic(() => import('./attendance/scan/page'), { ssr: false, loading: PageLoader });
const AttendanceSummaryPage = dynamic(() => import('./attendance/summary/page'), { ssr: false, loading: PageLoader });
const AccountsPage = dynamic(() => import('./accounts/page'), { ssr: false, loading: PageLoader });
const AssignmentsPage = dynamic(() => import('./assignments/page'), { ssr: false, loading: PageLoader });
const ClassroomPage = dynamic(() => import('./classroom/page'), { ssr: false, loading: PageLoader });
const LibraryPage = dynamic(() => import('./library/page'), { ssr: false, loading: PageLoader });
const AdminLibraryPage = dynamic(() => import('./admin/library/page'), { ssr: false, loading: PageLoader });
const NoticesPage = dynamic(() => import('./notices/page'), { ssr: false, loading: PageLoader });
const InstitutePage = dynamic(() => import('./institute/page'), { ssr: false, loading: PageLoader });
const AdminInstitutesPage = dynamic(() => import('./admin/institutes/page'), { ssr: false, loading: PageLoader });
const TeachersPage = dynamic(() => import('./teachers/page'), { ssr: false, loading: PageLoader });
const GuardiansPage = dynamic(() => import('./guardians/page'), { ssr: false, loading: PageLoader });
const DonorsPage = dynamic(() => import('./donors/page'), { ssr: false, loading: PageLoader });
const AdminUsersPage = dynamic(() => import('./admin/users/page'), { ssr: false, loading: PageLoader });
const BrandingSettingsPage = dynamic(() => import('./admin/settings/branding/page'), { ssr: false, loading: PageLoader });
const NotificationSettingsPage = dynamic(() => import('./admin/settings/notifications/page'), { ssr: false, loading: PageLoader });
const NotificationAnalyticsPage = dynamic(() => import('./admin/notifications/analytics/page'), { ssr: false, loading: PageLoader });
const ReportsPage = dynamic(() => import('./reports/page'), { ssr: false, loading: PageLoader });
const CalendarPage = dynamic(() => import('./calendar/page'), { ssr: false, loading: PageLoader });
const SettingsPage = dynamic(() => import('./settings/page'), { ssr: false, loading: PageLoader });
const ClassesPage = dynamic(() => import('./classes/page'), { ssr: false, loading: PageLoader });

const KEEPALIVE_PATHS = [
    '/dashboard',
    '/dashboard/guardian',
    '/dashboard/student',
    '/dashboard/teacher',
    '/dashboard/students',
    '/dashboard/guardian/children',
    '/dashboard/attendance/scan',
    '/dashboard/attendance/summary',
    '/dashboard/accounts',
    '/dashboard/assignments',
    '/dashboard/classroom',
    '/dashboard/library',
    '/dashboard/admin/library',
    '/dashboard/notices',
    '/dashboard/institute',
    '/dashboard/admin/institutes',
    '/dashboard/teachers',
    '/dashboard/guardians',
    '/dashboard/donors',
    '/dashboard/admin/users',
    '/dashboard/admin/settings/branding',
    '/dashboard/admin/settings/notifications',
    '/dashboard/admin/notifications/analytics',
    '/dashboard/reports',
    '/dashboard/calendar',
    '/dashboard/settings',
    '/dashboard/classes'
];

const getKeepAliveComponent = (path: string) => {
    switch (path) {
        case '/dashboard':
            return <DashboardOverview />;
        case '/dashboard/guardian':
            return <GuardianDashboard />;
        case '/dashboard/student':
            return <StudentDashboard />;
        case '/dashboard/teacher':
            return <TeacherDashboard />;
        case '/dashboard/students':
            return <StudentManagementPage />;
        case '/dashboard/guardian/children':
            return <GuardianChildrenPage />;
        case '/dashboard/attendance/scan':
            return <AttendanceScanPage />;
        case '/dashboard/attendance/summary':
            return <AttendanceSummaryPage />;
        case '/dashboard/accounts':
            return <AccountsPage />;
        case '/dashboard/assignments':
            return <AssignmentsPage />;
        case '/dashboard/classroom':
            return <ClassroomPage />;
        case '/dashboard/library':
            return <LibraryPage />;
        case '/dashboard/admin/library':
            return <AdminLibraryPage />;
        case '/dashboard/notices':
            return <NoticesPage />;
        case '/dashboard/institute':
            return <InstitutePage />;
        case '/dashboard/admin/institutes':
            return <AdminInstitutesPage />;
        case '/dashboard/teachers':
            return <TeachersPage />;
        case '/dashboard/guardians':
            return <GuardiansPage />;
        case '/dashboard/donors':
            return <DonorsPage />;
        case '/dashboard/admin/users':
            return <AdminUsersPage />;
        case '/dashboard/admin/settings/branding':
            return <BrandingSettingsPage />;
        case '/dashboard/admin/settings/notifications':
            return <NotificationSettingsPage />;
        case '/dashboard/admin/notifications/analytics':
            return <NotificationAnalyticsPage />;
        case '/dashboard/reports':
            return <ReportsPage />;
        case '/dashboard/calendar':
            return <CalendarPage />;
        case '/dashboard/settings':
            return <SettingsPage />;
        case '/dashboard/classes':
            return <ClassesPage />;
        default:
            return null;
    }
};



export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const { openAssignmentModal } = useUI();
    const { user, activeRole, activeInstitute, logout, isLoading } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<string>('');
    const [visitedPaths, setVisitedPaths] = useState<string[]>([]);

    // Determine teacher permissions globally
    const teacherProfile = activeRole === 'TEACHER' ? user?.teacherProfiles?.find((p: any) => p.instituteId === activeInstitute?.id) : null;
    const isTeacherAdmin = teacherProfile?.isAdmin === true;

    const hasTeacherPermission = useMemo(() => {
        return (permId: string) => {
            if (activeRole !== 'TEACHER') return true;
            if (isTeacherAdmin) return true;
            if (!teacherProfile || !teacherProfile.permissions?.classWise) return false;
            
            return Object.values(teacherProfile.permissions.classWise).some((classData: any) => {
                const perms = classData?.permissions;
                return Array.isArray(perms) && perms.includes(permId);
            });
        };
    }, [activeRole, isTeacherAdmin, teacherProfile]);

    useEffect(() => {
        const handleOpenProfile = () => setIsProfileModalOpen(true);
        window.addEventListener('open-user-profile', handleOpenProfile);
        return () => window.removeEventListener('open-user-profile', handleOpenProfile);
    }, []);

    // Sync activeTab and visitedPaths on mount and Next.js route change
    useEffect(() => {
        if (pathname) {
            setActiveTab(pathname);
            if (KEEPALIVE_PATHS.includes(pathname)) {
                setVisitedPaths(prev => {
                    if (!prev.includes(pathname)) {
                        return [...prev, pathname];
                    }
                    return prev;
                });
            }
        }
    }, [pathname]);

    // Dispatch event to pause heavy background processes (like Face Scanner) when sidebar opens on mobile
    useEffect(() => {
        if (isSidebarOpen) {
            window.dispatchEvent(new CustomEvent('dashboard-sidebar-open'));
        } else {
            window.dispatchEvent(new CustomEvent('dashboard-sidebar-close'));
        }
    }, [isSidebarOpen]);

    // Handle popstate for browser back/forward history transitions
    useEffect(() => {
        const handlePopState = () => {
            const currentPath = window.location.pathname;
            setActiveTab(currentPath);
            if (KEEPALIVE_PATHS.includes(currentPath)) {
                setVisitedPaths(prev => {
                    if (!prev.includes(currentPath)) {
                        return [...prev, currentPath];
                    }
                    return prev;
                });
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [pathname]);

    const isKeepAlive = KEEPALIVE_PATHS.includes(activeTab);

    const menuItems = [
        // ওভারভিউ
        { name: 'ড্যাশবোর্ড', icon: LayoutDashboard, href: '/dashboard', section: 'ওভারভিউ' },

        // দৈনন্দিন কার্যক্রম
        {
            name: activeRole === 'GUARDIAN' ? 'আমার সন্তান' : 'শিক্ষার্থী / বই',
            icon: Users,
            href: activeRole === 'GUARDIAN' ? '/dashboard/guardian/children' : '/dashboard/students',
            section: 'দৈনন্দিন কার্যক্রম'
        },
        { name: 'হাজিরা', icon: Zap, href: '/dashboard/attendance/scan', roles: ['ADMIN', 'TEACHER'], section: 'দৈনন্দিন কার্যক্রম' },
        { name: 'হিসাব', icon: CreditCard, href: '/dashboard/accounts', section: 'দৈনন্দিন কার্যক্রম' },
        // { name: 'ক্লাস ডাইরি', icon: ClipboardList, href: '/dashboard/assignments', section: 'দৈনন্দিন কার্যক্রম' },
        { name: 'ক্লাস রুম', icon: Presentation, href: '/dashboard/classroom', section: 'দৈনন্দিন কার্যক্রম' },

        // একাডেমিক
        { name: 'পরীক্ষা', icon: PenTool, href: '/dashboard/exams', section: 'একাডেমিক' },
        { name: 'লাইব্রেরি', icon: Library, href: '/dashboard/library', roles: ['STUDENT'], section: 'একাডেমিক' },
        { name: 'লাইব্রেরি', icon: Library, href: '/dashboard/admin/library', roles: ['ADMIN', 'SUPER_ADMIN'], section: 'একাডেমিক' },
        { name: 'নোটিশ', icon: Megaphone, href: '/dashboard/notices', section: 'একাডেমিক' },

        // ব্যবস্থাপনা
        { name: 'প্রতিষ্ঠান', icon: Building2, href: activeRole === 'SUPER_ADMIN' ? '/dashboard/admin/institutes' : '/dashboard/institute', roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER'], section: 'ব্যবস্থাপনা' },
        { name: 'শিক্ষক', icon: GraduationCap, href: '/dashboard/teachers', roles: ['ADMIN', 'SUPER_ADMIN'], section: 'ব্যবস্থাপনা' },
        { name: 'অভিভাবক', icon: HeartPulse, href: '/dashboard/guardians', roles: ['ADMIN', 'SUPER_ADMIN'], section: 'ব্যবস্থাপনা' },
        { name: 'দাতা', icon: HeartPulse, href: '/dashboard/donors', roles: ['ADMIN', 'SUPER_ADMIN'], section: 'ব্যবস্থাপনা' },
        { name: 'ইউজার ডাটাবেস', icon: Users, href: '/dashboard/admin/users', roles: ['ADMIN', 'SUPER_ADMIN'], section: 'ব্যবস্থাপনা' },
        { name: 'অ্যাপ ব্র্যান্ডিং', icon: Settings, href: '/dashboard/admin/settings/branding', roles: ['SUPER_ADMIN'], section: 'ব্যবস্থাপনা' },
        { name: 'নোটিফিকেশন সেট', icon: Bell, href: '/dashboard/admin/settings/notifications', roles: ['ADMIN', 'SUPER_ADMIN'], section: 'ব্যবস্থাপনা' },
        { name: 'নোটিফিকেশন এনালিটিক্স', icon: BarChart3, href: '/dashboard/admin/notifications/analytics', roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER'], section: 'বিশ্লেষণ ও রিপোর্ট' },

        // যোগাযোগ
        { name: 'যোগাযোগ', icon: MessageSquare, href: '/dashboard/communication', section: 'যোগাযোগ' },

        // বিশ্লেষণ ও রিপোর্ট
        { name: 'রিপোর্টস', icon: TrendingUp, href: '/dashboard/reports', roles: ['ADMIN', 'TEACHER'], section: 'বিশ্লেষণ ও রিপোর্ট' },

        // সেটিংস ও অন্যান্য
        { name: 'ক্যালেন্ডার', icon: Calendar, href: '/dashboard/calendar', section: 'সেটিংস ও অন্যান্য' },
        { name: 'সেটিংস', icon: Settings, href: '/dashboard/settings', section: 'সেটিংস ও অন্যান্য' },
    ];

    const filteredMenuItems = menuItems.filter(item => {
        // Role based filtering if 'roles' property exists
        if ((item as any).roles && !(item as any).roles.includes(activeRole)) {
            return false;
        }

        if (activeRole === 'SUPER_ADMIN') {
            const allowed = ['/dashboard', '/dashboard/admin/library', '/dashboard/admin/users', '/dashboard/admin/institutes', '/dashboard/admin/settings/branding', '/dashboard/admin/settings/notifications', '/dashboard/admin/notifications/analytics'];
            return allowed.includes(item.href);
        }
        if (activeRole === 'STUDENT') {
            return ['/dashboard', '/dashboard/notices', '/dashboard/classroom', '/dashboard/library'].includes(item.href);
        }
        if (activeRole === 'GUARDIAN') {
            return ['/dashboard', '/dashboard/guardian/children', '/dashboard/settings'].includes(item.href);
        }
        if (activeRole === 'TEACHER') {
            if (item.href.startsWith('/dashboard/attendance') && !hasTeacherPermission('canTakeAttendance')) return false;
            if (item.href.startsWith('/dashboard/accounts') && !hasTeacherPermission('canCollectFees')) return false;
            if (item.href.startsWith('/dashboard/students') && !hasTeacherPermission('canManageAdmission')) return false;
            if (item.href.startsWith('/dashboard/exams') && !hasTeacherPermission('canManageExam') && !hasTeacherPermission('canManageResult')) return false;
            if (item.href.startsWith('/dashboard/calendar') && !hasTeacherPermission('canManageRoutine')) return false;
        }
        return true;
    });

    const isAllowed = useMemo(() => {
        if (!activeRole || !pathname) return false;

        // Base dashboard route is always allowed, it has its own redirect logic
        if (pathname === '/dashboard') return true;

        // Check if the exact pathname or its parent path matches an item in filteredMenuItems
        const hasMenuMatch = filteredMenuItems.some(item => {
            if (item.href === '/dashboard') return false; // already handled
            return pathname === item.href || pathname.startsWith(item.href + '/');
        });

        if (hasMenuMatch) return true;

        // Custom pages that might not be directly in the filtered menu items list but are allowed for specific roles
        if (activeRole === 'STUDENT') {
            const allowedExtra = [
                '/dashboard/student',
                '/dashboard/settings',
                '/dashboard/calendar'
            ];
            return allowedExtra.some(p => pathname === p || pathname.startsWith(p + '/'));
        }

        if (activeRole === 'GUARDIAN') {
            const allowedExtra = [
                '/dashboard/guardian',
                '/dashboard/settings',
                '/dashboard/calendar'
            ];
            return allowedExtra.some(p => pathname === p || pathname.startsWith(p + '/'));
        }

        if (activeRole === 'TEACHER') {
            const allowedExtra = [
                '/dashboard/teacher',
                '/dashboard/settings'
            ];
            if (hasTeacherPermission('canManageRoutine')) allowedExtra.push('/dashboard/calendar');
            if (hasTeacherPermission('canTakeAttendance')) allowedExtra.push('/dashboard/attendance/summary');
            
            return allowedExtra.some(p => pathname === p || pathname.startsWith(p + '/'));
        }

        if (activeRole === 'ADMIN' || activeRole === 'ACCOUNTANT' || activeRole === 'DEMO') {
            const forbiddenPaths = [
                '/dashboard/student',
                '/dashboard/guardian',
                '/dashboard/teacher',
                '/dashboard/admin/institutes',
                '/dashboard/admin/settings/branding'
            ];
            
            const isForbidden = forbiddenPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
            if (isForbidden) return false;

            return true;
        }

        if (activeRole === 'SUPER_ADMIN') {
            const superAdminExtra = [
                '/dashboard/settings'
            ];
            return superAdminExtra.some(p => pathname === p || pathname.startsWith(p + '/'));
        }

        return false;
    }, [activeRole, pathname, filteredMenuItems]);

    // Redirect unauthorized users to their correct homepage
    useEffect(() => {
        if (!isLoading && activeRole && !isAllowed) {
            let redirectPath = '/dashboard';
            if (activeRole === 'STUDENT') {
                redirectPath = '/dashboard/student';
            } else if (activeRole === 'GUARDIAN') {
                redirectPath = '/dashboard/guardian';
            } else if (activeRole === 'TEACHER') {
                redirectPath = '/dashboard/teacher';
            }
            router.replace(redirectPath);
        }
    }, [isLoading, activeRole, isAllowed, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <GraduationCap className="absolute inset-0 m-auto text-primary animate-pulse" size={24} />
                    </div>
                    <p className="text-slate-500 font-black text-xs uppercase tracking-[0.3em] animate-pulse">EDUSY লোড হচ্ছে...</p>
                </div>
            </div>
        );
    }

    // Client-side auth guard: if the session loaded but no user found, redirect to login
    if (!user) {
        if (typeof window !== 'undefined') {
            window.location.replace('/entrance?redirect=' + encodeURIComponent(window.location.pathname));
        }
        return null;
    }

    if (!isAllowed) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-sans">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin"></div>
                        <ShieldCheck className="absolute inset-0 m-auto text-rose-600 animate-pulse" size={24} />
                    </div>
                    <p className="text-slate-600 font-bold text-xs uppercase tracking-[0.3em] font-bengali">অ্যাক্সেস সুরক্ষিত হচ্ছে...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            {/* Backdrop Overlay - only visible on mobile when sidebar is open */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 ${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-slate-200 text-black transition-all duration-300 lg:translate-x-0 shadow-lg ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} h-screen flex flex-col group/sidebar`}>
                <div className="flex flex-col h-full">
                    <div className={`p-8 flex items-center ${isSidebarCollapsed ? 'justify-center p-4' : 'gap-4'} bg-primary text-white shrink-0 transition-all relative`}>
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner shrink-0">
                            <GraduationCap size={24} className="text-white" />
                        </div>
                        {!isSidebarCollapsed && (
                            <h1 className="text-2xl font-black tracking-widest flex-1">
                                {activeRole === 'GUARDIAN' ? 'অভিভাবক' : 'EDUSY'}
                            </h1>
                        )}
                        
                        <button 
                            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0 ${isSidebarCollapsed ? 'absolute -right-4 top-1/2 -translate-y-1/2 bg-[#045c84] shadow-md border border-slate-300 z-50 text-white hover:bg-[#034a6a]' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        >
                            {isSidebarCollapsed ? <Menu size={16} /> : <X size={20} />}
                        </button>

                        <button className="lg:hidden text-white/80 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}>
                            <X size={24} />
                        </button>
                    </div>


                    {/* Scrollable Content Area */}
                    <div
                        className={`flex-1 overflow-y-auto py-4 overscroll-contain ${isSidebarCollapsed ? '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' : 'custom-scrollbar'}`}
                        data-lenis-prevent
                    >
                        <nav className="px-4 space-y-6 pb-8">
                            {Array.from(new Set(filteredMenuItems.map(item => item.section))).map((section) => (
                                <div key={section} className="space-y-2">
                                    {section !== 'ওভারভিউ' && !isSidebarCollapsed && (
                                        <h3 className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                                            {section}
                                        </h3>
                                    )}
                                    {section !== 'ওভারভিউ' && isSidebarCollapsed && (
                                        <div className="w-full flex justify-center mb-2">
                                            <div className="w-4 h-0.5 bg-slate-200 rounded-full"></div>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        {filteredMenuItems
                                            .filter(item => item.section === section)
                                            .map((item) => {
                                                const targetHref = activeRole === 'GUARDIAN' && item.href === '/dashboard' ? '/dashboard/guardian' :
                                                    activeRole === 'GUARDIAN' && item.href === '/dashboard/guardian/children' ? '/dashboard/guardian/children' :
                                                        activeRole === 'STUDENT' && item.href === '/dashboard/students' ? '/dashboard/student' :
                                                            item.href;

                                                const isActive = item.href === '/dashboard'
                                                    ? ['/dashboard', '/dashboard/teacher', '/dashboard/student', '/dashboard/guardian'].includes(activeTab)
                                                    : activeTab?.startsWith(item.href);

                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={targetHref}
                                                        onClick={(e) => {
                                                            setIsSidebarOpen(false);
                                                            if (KEEPALIVE_PATHS.includes(targetHref)) {
                                                                e.preventDefault();
                                                                setActiveTab(targetHref);
                                                                window.history.pushState(null, '', targetHref);
                                                                if (!visitedPaths.includes(targetHref)) {
                                                                    setVisitedPaths(prev => [...prev, targetHref]);
                                                                }
                                                            }
                                                        }}
                                                        className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : 'gap-5 px-5'} py-3 rounded-2xl transition-all font-medium group text-lg relative ${isActive
                                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                            : 'text-zinc-900 hover:bg-slate-100'
                                                            }`}
                                                        title={isSidebarCollapsed ? (activeRole === 'GUARDIAN' && item.name === 'শিক্ষার্থী / বই' ? 'আমার সন্তান' : item.name) : undefined}
                                                    >
                                                        <item.icon size={22} className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-primary'}`} />
                                                        {!isSidebarCollapsed && (
                                                            <span className="truncate whitespace-nowrap">
                                                                {activeRole === 'GUARDIAN' && item.name === 'শিক্ষার্থী / বই' ? 'আমার সন্তান' : item.name}
                                                            </span>
                                                        )}

                                                    </Link>
                                                );
                                            })}
                                    </div>
                                </div>
                            ))}
                        </nav>

                        <div className={isSidebarCollapsed ? 'hidden' : 'block'}>
                            <RoleSwitcher />
                        </div>

                        <div className="p-4 mt-4 lg:hidden">
                            <button
                                onClick={logout}
                                className={`flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-5 px-5 py-4'} w-full rounded-2xl hover:bg-red-50 transition-all font-medium text-red-600 text-lg`}
                            >
                                <LogOut size={24} className="shrink-0" />
                                {!isSidebarCollapsed && <span>লগ আউট</span>}
                            </button>
                        </div>
                    </div>



                    <div className={`p-6 border-t border-slate-100 hidden lg:block shrink-0 bg-white ${isSidebarCollapsed ? 'p-4' : ''}`}>
                        <button
                            onClick={logout}
                            className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : 'gap-5 px-5 py-4'} w-full rounded-2xl hover:bg-red-50 transition-all font-medium text-red-600 text-lg group relative`}
                            title={isSidebarCollapsed ? 'লগ আউট' : undefined}
                        >
                            <LogOut size={24} className="shrink-0" />
                            {!isSidebarCollapsed && <span>লগ আউট</span>}
                                
                        </button>
                    </div>

                </div>
            </aside>


            {/* Main Content */}
            <div className={`flex-1 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'} flex flex-col min-w-0 transition-all duration-300`}>
                {/* Topbar */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <button className="lg:hidden p-2 text-slate-500 shrink-0" onClick={() => setIsSidebarOpen(true)}>
                            <Menu size={24} />
                        </button>

                        {/* Page Title */}
                        <div className="flex items-center min-w-0">
                            <h2 className="text-xl font-black text-slate-800 font-bengali">
                                {activeTab === '/dashboard/guardian' ? 'অভিভাবক ড্যাশবোর্ড' :
                                    activeTab?.includes('/dashboard/students') ? (activeRole === 'GUARDIAN' ? 'আমার সন্তান' : 'শিক্ষার্থী / বই') :
                                        activeTab?.includes('/dashboard/teachers') ? 'শিক্ষক' :
                                            activeTab?.includes('/dashboard/institute') ? 'প্রতিষ্ঠানসমূহ' :
                                                activeTab?.includes('/dashboard/accounts') ? 'হিসাব' :
                                                    activeTab?.includes('/dashboard/settings') ? 'সেটিংস' :
                                                        activeTab?.includes('/dashboard/guardians') ? 'অভিভাবক' :
                                                            activeTab?.includes('/dashboard/calendar') ? 'ক্যালেন্ডার' :
                                                                activeTab?.includes('/dashboard/assignments') ? 'ক্লাস ডাইরি' :
                                                                    activeTab?.includes('/dashboard/attendance') ? 'হাজিরা' :
                                                                        activeTab?.includes('/dashboard') ? 'ড্যাশবোর্ড' : ''}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Header Actions Portal Target */}
                        <div id="dashboard-header-actions" className="flex items-center gap-2"></div>

                        <div className="flex items-center gap-2">
                            <GlobalSearch />
                            <NotificationBell />
                        </div>
                        <div
                            onClick={() => setIsProfileModalOpen(true)}
                            className="flex items-center gap-3 pl-2 border-l border-slate-200 cursor-pointer group hover:bg-slate-50 p-1 rounded-xl transition-all"
                        >
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium text-black group-hover:text-primary transition-colors">{user?.name || 'ব্যবহারকারী'}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-tighter">
                                    {activeRole === 'SUPER_ADMIN' ? 'সুপার অ্যাডমিন' :
                                        activeRole === 'ADMIN' ? 'অ্যাডমিন' :
                                            activeRole === 'TEACHER' ? 'শিক্ষক' :
                                                activeRole === 'STUDENT' ? 'শিক্ষার্থী' :
                                                    activeRole === 'GUARDIAN' ? 'অভিভাবক' :
                                                        activeRole?.replace('_', ' ')}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-tr from-primary to-secondary rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center text-white font-black group-hover:scale-105 transition-transform">
                                {user?.name ? user.name[0] : 'U'}
                            </div>
                        </div>
                    </div>

                </header>

                {/* Page Content */}
                <main className="flex-1 relative">
                    {/* Render keep-alive tabs */}
                    {visitedPaths.map((path) => (
                        <div
                            key={path}
                            style={{ 
                                position: path === activeTab ? 'relative' : 'absolute',
                                visibility: path === activeTab ? 'visible' : 'hidden',
                                opacity: path === activeTab ? 1 : 0,
                                pointerEvents: path === activeTab ? 'auto' : 'none',
                                zIndex: path === activeTab ? 1 : -1,
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: path === activeTab ? 'auto' : '100%',
                                overflow: path === activeTab ? 'visible' : 'hidden'
                            }}
                            className={path === activeTab ? "w-full min-h-full" : "w-full h-full"}
                        >
                            {getKeepAliveComponent(path)}
                        </div>
                    ))}

                    {/* Render children for non-keep-alive routes */}
                    {!isKeepAlive && children}
                </main>

                {/* Profile Modal */}
                <ProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    user={user}
                />
                {/* Global Assignment Modal */}
                <GlobalAssignmentModal />
            </div>
        </div>
    );
}
