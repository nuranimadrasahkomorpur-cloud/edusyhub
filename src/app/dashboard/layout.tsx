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
    BarChart3
} from 'lucide-react';

import { useSession } from '@/components/SessionProvider';
import RoleSwitcher from '@/components/RoleSwitcher';
import ProfileModal from '@/components/ProfileModal';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';
import GlobalAssignmentModal from '@/components/GlobalAssignmentModal';
import { useUI } from '@/components/UIProvider';



export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const { openAssignmentModal } = useUI();
    const { user, activeRole, logout, isLoading } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const handleOpenProfile = () => setIsProfileModalOpen(true);
        window.addEventListener('open-user-profile', handleOpenProfile);
        return () => window.removeEventListener('open-user-profile', handleOpenProfile);
    }, []);

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
        { name: 'ক্লাস ডাইরি', icon: ClipboardList, href: '/dashboard/assignments', section: 'দৈনন্দিন কার্যক্রম' },
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
            return ['/dashboard', '/dashboard/notices', '/dashboard/classroom', '/dashboard/library', '/dashboard/assignments'].includes(item.href);
        }
        if (activeRole === 'GUARDIAN') {
            return ['/dashboard', '/dashboard/guardian/children', '/dashboard/assignments', '/dashboard/settings'].includes(item.href);
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
                '/dashboard/settings',
                '/dashboard/calendar',
                '/dashboard/attendance/summary'
            ];
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
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 text-black transition-transform duration-300 lg:translate-x-0 shadow-lg ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} h-screen`}>
                <div className="flex flex-col h-full">
                    <div className="p-8 flex items-center gap-4 bg-primary text-white shrink-0">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                            <GraduationCap size={24} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-widest flex-1">
                            {activeRole === 'GUARDIAN' ? 'অভিভাবক' : 'EDUSY'}
                        </h1>
                        <button className="lg:hidden text-white/80 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}>
                            <X size={24} />
                        </button>
                    </div>


                    {/* Scrollable Content Area */}
                    <div
                        className="flex-1 overflow-y-auto custom-scrollbar py-4"
                        data-lenis-prevent
                    >
                        <nav className="px-4 space-y-6 pb-8">
                            {Array.from(new Set(filteredMenuItems.map(item => item.section))).map((section) => (
                                <div key={section} className="space-y-2">
                                    {section !== 'ওভারভিউ' && (
                                        <h3 className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                                            {section}
                                        </h3>
                                    )}
                                    <div className="space-y-1">
                                        {filteredMenuItems
                                            .filter(item => item.section === section)
                                            .map((item) => {
                                                const isActive = item.href === '/dashboard'
                                                    ? ['/dashboard', '/dashboard/teacher', '/dashboard/student', '/dashboard/guardian'].includes(pathname)
                                                    : pathname?.startsWith(item.href);

                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={
                                                            activeRole === 'GUARDIAN' && item.href === '/dashboard' ? '/dashboard/guardian' :
                                                                activeRole === 'GUARDIAN' && item.href === '/dashboard/guardian/children' ? '/dashboard/guardian/children' :
                                                                    activeRole === 'STUDENT' && item.href === '/dashboard/students' ? '/dashboard/student' :
                                                                        item.href
                                                        }
                                                        onClick={() => setIsSidebarOpen(false)}
                                                        className={`flex items-center gap-5 px-5 py-3 rounded-2xl transition-all font-medium group text-lg ${isActive
                                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                            : 'text-zinc-900 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        <item.icon size={22} className={`transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-primary'}`} />
                                                        <span>{activeRole === 'GUARDIAN' && item.name === 'শিক্ষার্থী / বই' ? 'আমার সন্তান' : item.name}</span>
                                                    </Link>
                                                );
                                            })}
                                    </div>
                                </div>
                            ))}
                        </nav>

                        <RoleSwitcher />

                        <div className="p-4 mt-4 lg:hidden">
                            <button
                                onClick={logout}
                                className="flex items-center gap-5 w-full px-5 py-4 rounded-2xl hover:bg-red-50 transition-all font-medium text-red-600 text-lg"
                            >
                                <LogOut size={24} />
                                <span>লগ আউট</span>
                            </button>
                        </div>
                    </div>



                    <div className="p-6 border-t border-slate-100 hidden lg:block shrink-0 bg-white">
                        <button
                            onClick={logout}
                            className="flex items-center gap-5 w-full px-5 py-4 rounded-2xl hover:bg-red-50 transition-all font-medium text-red-600 text-lg"
                        >
                            <LogOut size={24} />
                            <span>লগ আউট</span>
                        </button>
                    </div>

                </div>
            </aside>


            {/* Main Content */}
            <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <button className="lg:hidden p-2 text-slate-500 shrink-0" onClick={() => setIsSidebarOpen(true)}>
                            <Menu size={24} />
                        </button>

                        {/* Page Title */}
                        <div className="flex items-center min-w-0">
                            <h2 className="text-xl font-black text-slate-800 font-bengali">
                                {pathname === '/dashboard/guardian' ? 'অভিভাবক ড্যাশবোর্ড' :
                                    pathname?.includes('/dashboard/students') ? (activeRole === 'GUARDIAN' ? 'আমার সন্তান' : 'শিক্ষার্থী / বই') :
                                        pathname?.includes('/dashboard/teachers') ? 'শিক্ষক' :
                                            pathname?.includes('/dashboard/institute') ? 'প্রতিষ্ঠানসমূহ' :
                                                pathname?.includes('/dashboard/accounts') ? 'হিসাব' :
                                                    pathname?.includes('/dashboard/settings') ? 'সেটিংস' :
                                                        pathname?.includes('/dashboard/guardians') ? 'অভিভাবক' :
                                                            pathname?.includes('/dashboard/calendar') ? 'ক্যালেন্ডার' :
                                                                pathname?.includes('/dashboard/assignments') ? 'ক্লাস ডাইরি' :
                                                                    pathname?.includes('/dashboard/attendance') ? 'হাজিরা' :
                                                                        pathname?.includes('/dashboard') ? 'ড্যাশবোর্ড' : ''}
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
                <main className="flex-1">
                    {children}
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
