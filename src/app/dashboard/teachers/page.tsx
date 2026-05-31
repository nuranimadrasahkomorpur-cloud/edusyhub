'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Shield, Settings, Trash2, ChevronDown, GraduationCap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/SessionProvider';
import AddTeacherModal from '@/components/AddTeacherModal';
import TeacherPermissionModal from '@/components/TeacherPermissionModal';
import Toast from '@/components/Toast';
import TeacherCard from '@/components/TeacherCard';
import { useUI } from '@/components/UIProvider';

export default function TeachersPage() {
    const { user, activeInstitute, activeRole } = useSession();
    const router = useRouter();
    const { confirm } = useUI();

    useEffect(() => {
        if (activeRole && activeRole !== 'ADMIN' && activeRole !== 'SUPER_ADMIN' && activeRole !== 'TEACHER') {
            if (activeRole === 'GUARDIAN') window.location.replace('/dashboard/guardian');
            else if (activeRole === 'STUDENT') window.location.replace('/dashboard/student');
            else window.location.replace('/dashboard');
        }
    }, [activeRole]);

    const [teachers, setTeachers] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('all');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [permissionModalData, setPermissionModalData] = useState<any>(null); // null means closed

    // Toast
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchTeachers = async () => {
        if (!activeInstitute?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/teacher?instituteId=${activeInstitute.id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setTeachers(data);
            }
        } catch (error) {
            console.error(error);
            showToast('শিক্ষক তালিকা লোড করতে সমস্যা হয়েছে', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        if (!activeInstitute?.id) return;
        try {
            const res = await fetch(`/api/admin/classes?instituteId=${activeInstitute.id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setClasses(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchBooks = async () => {
        if (!activeInstitute?.id) return;
        try {
            const res = await fetch(`/api/admin/books?instituteId=${activeInstitute.id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setBooks(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchTeachers();
        fetchClasses();
        fetchBooks();
    }, [activeInstitute?.id]);

    const handleAddTeacher = async (data: any) => {
        if (!activeInstitute?.id) return;
        try {
            const res = await fetch('/api/teacher/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, instituteId: activeInstitute.id }),
            });
            const result = await res.json();

            if (res.ok) {
                showToast('শিক্ষক সফলভাবে যুক্ত করা হয়েছে', 'success');
                fetchTeachers(); // Refresh list
            } else {
                showToast(result.error || 'শিক্ষক যুক্ত করতে ব্যর্থ হয়েছে', 'error');
            }
        } catch (error) {
            showToast('সার্ভার এরর, পুনরায় চেষ্টা করুন', 'error');
        }
    };

    const handleUpdatePermissions = async (teacherId: string, updates: any) => {
        try {
            const res = await fetch(`/api/teacher/${teacherId}/permissions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...updates,
                    adminId: user?.id,
                    instituteId: activeInstitute?.id
                }),
            });

            if (res.ok) {
                showToast('পারমিশন আপডেট করা হয়েছে', 'success');
                fetchTeachers(); // Refresh to update local state logic if needed
            } else {
                const data = await res.json();
                showToast(data.error || 'পারমিশন আপডেট ব্যর্থ হয়েছে', 'error');
            }
        } catch (error) {
            showToast('আপডেট ব্যর্থ হয়েছে', 'error');
        }
    };

    const filteredTeachers = teachers.filter(t => {
        const query = searchQuery.toLowerCase().trim();

        const matchesSearch = !query ||
            (t.user.name?.toLowerCase() || '').includes(query) ||
            (t.user.email?.toLowerCase() || '').includes(query) ||
            (t.user.phone || '').includes(query);

        const matchesClass = selectedClassId === 'all' ||
            t.assignedClassIds?.includes(selectedClassId) ||
            t.permissions?.classWise?.[selectedClassId];

        return matchesSearch && matchesClass;
    });

    const isOwner = (activeInstitute?.adminIds || []).includes(user?.id) || activeInstitute?.isOwner === true;
    const canManageTeachers = isOwner;

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in-up font-bengali min-h-screen pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none text-black font-medium shadow-sm w-full md:w-64 placeholder:text-slate-400"
                            placeholder="শিক্ষক খুঁজুন..."
                        />
                    </div>
                    {/* Class Filter */}
                    <div className="relative flex-1 md:flex-none min-w-[150px]">
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none text-black font-medium shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="all">সব ক্লাস</option>
                            {classes.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>

                    {canManageTeachers && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-6 py-3 bg-[#045c84] text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:bg-[#034a6b] transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={20} />
                            <span className="hidden md:inline">নতুন শিক্ষক</span>
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-[#045c84]/30 border-t-[#045c84] rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400 font-bold">লোড হচ্ছে...</p>
                </div>
            ) : filteredTeachers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTeachers.map((teacher) => (
                        <TeacherCard
                            key={teacher.id}
                            teacher={teacher}
                            currentUser={user}
                            onCardClick={(t: any) => setPermissionModalData(t)}
                            canManage={canManageTeachers}
                            classes={classes}
                            onDelete={async (teacherId: string, name: string) => {
                                if (!await confirm(`আপনি কি নিশ্চিত যে ${name} কে সরাতে চান?`)) return;

                                try {
                                    const res = await fetch(`/api/teacher/${teacherId}?instituteId=${activeInstitute.id}&adminId=${user?.id}`, {
                                        method: 'DELETE'
                                    });

                                    if (res.ok) {
                                        showToast('শিক্ষক সফলভাবে সরানো হয়েছে', 'success');
                                        fetchTeachers();
                                    } else {
                                        const data = await res.json();
                                        showToast(data.error || 'সরাতে ব্যর্থ হয়েছে', 'error');
                                    }
                                } catch (err) {
                                    showToast('সার্ভার এরর', 'error');
                                }
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center text-slate-400">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <GraduationCap className="opacity-20 text-slate-600" size={40} />
                    </div>
                    <p className="text-xl font-bold text-slate-600">কোনো শিক্ষক পাওয়া যায়নি</p>
                    <p className="text-sm mt-2 max-w-sm mx-auto">নতুন শিক্ষক যুক্ত করতে উপরের "নতুন শিক্ষক" বাটনে ক্লিক করুন।</p>
                </div>
            )}

            <AddTeacherModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddTeacher}
                instituteId={activeInstitute?.id}
                instituteName={activeInstitute?.name}
            />

            <TeacherPermissionModal
                isOpen={!!permissionModalData}
                onClose={() => setPermissionModalData(null)}
                teacher={permissionModalData}
                classes={classes}
                allBooks={books}
                onSave={handleUpdatePermissions}
                isReadOnly={!isOwner}
                canToggleAdminPower={isOwner}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
