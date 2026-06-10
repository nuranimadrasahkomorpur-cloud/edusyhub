'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Edit,
    Trash2,
    ShieldCheck,
    Key,
    Mail,
    Building2,
    Loader2,
    X,
    Save,
    UserPlus,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import Modal from '@/components/Modal';
import { useUI } from '@/components/UIProvider';
import { useSession } from '@/components/SessionProvider';

export default function GlobalUserManagement() {
    const { confirm } = useUI();
    const { activeRole } = useSession();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [institutes, setInstitutes] = useState<any[]>([]);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'ADMIN',
        instituteIds: [] as string[]
    });

    const fetchInstitutes = async () => {
        try {
            const res = await fetch(`/api/admin/institutes?role=${activeRole || ''}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setInstitutes(data);
            } else {
                console.error('Expected array from institutes API, got:', data);
                setInstitutes([]);
            }
        } catch (error) {
            console.error('Fetch institutes error:', error);
            setInstitutes([]);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?search=${search}&activeRole=${activeRole || ''}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.error('Expected array from users API, got:', data);
                setUsers([]);
            }
        } catch (error) {
            console.error('Fetch users error:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstitutes();
    }, [activeRole]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, activeRole]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateLoading(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            });
            if (res.ok) {
                setIsAddModalOpen(false);
                setNewUser({ name: '', email: '', phone: '', password: '', role: 'ADMIN', instituteIds: [] });
                fetchUsers();
            }
        } catch (error) {
            console.error('Create user error:', error);
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateLoading(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingUser),
            });
            if (res.ok) {
                setIsEditModalOpen(false);
                fetchUsers();
            }
        } catch (error) {
            console.error('Update user error:', error);
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleUpdateUserRole = async (id: string, newRole: string) => {
        const confirmMsg = newRole === 'SUPER_ADMIN'
            ? 'আপনি কি নিশ্চিত যে আপনি এই ইউজার কে "সুপার অ্যাডমিন" করতে চান? এটি একটি অতি সংবেদনশীল অ্যাকশন।'
            : `আপনি কি রোল পরিবর্তন করে "${newRole}" করতে চান?`;

        if (!await confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, role: newRole }),
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error('Update role error:', error);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!await confirm('আপনি কি নিশ্চিত যে আপনি এই ইউজারটি ডিলিট করতে চান?')) return;
        try {
            await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
            fetchUsers();
        } catch (error) {
            console.error('Delete user error:', error);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">ইউজার ডাটাবেস</h1>
                    <p className="text-slate-500 font-medium">সিস্টেমের সকল ব্যবহারকারী এখান থেকে পরিচালনা করুন।</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none text-black font-medium shadow-sm"
                            placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-[#045c84] text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all active:scale-95 whitespace-nowrap"
                    >
                        <UserPlus size={20} />
                        <span>নতুন ইউজার</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">ব্যবহারকারী</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">রোল</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">প্রতিষ্ঠান</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">যোগদান</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">অ্যাকশন</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                                        <span>লোড হচ্ছে...</span>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Users className="mx-auto mb-2 opacity-20" size={48} />
                                        <span>কোন ব্যবহারকারী পাওয়া যায়নি।</span>
                                    </td>
                                </tr>
                            ) : users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[#045c84] font-black text-lg">
                                                {u.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{u.name || 'নাম নেই'}</div>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                                        <Mail size={12} className="shrink-0" />
                                                        {u.email || u.phone || 'ID নেই'}
                                                    </div>
                                                    <div className="text-[11px] text-[#045c84] font-bold flex items-center gap-1">
                                                        <Key size={12} className="shrink-0" />
                                                        {u.password || 'পাসওয়ার্ড নেই'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                            u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                            <Building2 size={16} className="text-slate-400" />
                                            {u.institute?.name || 'প্রতিষ্ঠান নেই'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                        {new Date(u.createdAt).toLocaleDateString('bn-BD')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {u.role === 'ADMIN' && (
                                                <button
                                                    onClick={() => handleUpdateUserRole(u.id, 'SUPER_ADMIN')}
                                                    title="সুপার অ্যাডমিন করুন"
                                                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                >
                                                    <ShieldCheck size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { setEditingUser(u); setIsEditModalOpen(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="ইউজার আপডেট"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">পুরো নাম</label>
                            <input
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                                value={editingUser?.name || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">ইমেইল</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                                    value={editingUser?.email || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">মোবাইল নম্বর</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                                    placeholder="01XXXXXXXXX"
                                    value={editingUser?.phone || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">রোল</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black appearance-none cursor-pointer"
                                    value={editingUser?.role || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                >
                                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="TEACHER">TEACHER</option>
                                    <option value="STUDENT">STUDENT</option>
                                    <option value="GUARDIAN">GUARDIAN</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">পাসওয়ার্ড রিসেট</label>
                                <input
                                    type="password"
                                    placeholder="নতুন পাসওয়ার্ড"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={updateLoading}
                            className="px-8 py-4 bg-[#045c84] hover:bg-[#034d6e] text-white font-black rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {updateLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <Save size={20} />
                            )}
                            <span>আপডেট করুন</span>
                        </button>
                    </div>
                </form>
            </Modal>
            {/* Add User Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="নতুন ইউজার যুক্ত করুন"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">পুরো নাম</label>
                            <input
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                                placeholder="ইউজারের নাম"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">ইমেইল</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                                    placeholder="email@example.com"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">মোবাইল নম্বর</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                                    placeholder="01XXXXXXXXX"
                                    value={newUser.phone}
                                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">রোল</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white transition-all outline-none font-medium text-black cursor-pointer"
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="TEACHER">TEACHER</option>
                                    <option value="STUDENT">STUDENT</option>
                                    <option value="GUARDIAN">GUARDIAN</option>
                                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">পাসওয়ার্ড</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                                    placeholder="পাসওয়ার্ড দিন"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">প্রতিষ্ঠান (যদি থাকে)</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white transition-all outline-none font-medium text-black cursor-pointer"
                                value={newUser.instituteIds[0] || ''}
                                onChange={(e) => setNewUser({ ...newUser, instituteIds: e.target.value ? [e.target.value] : [] })}
                            >
                                <option value="">কোনটিই নয়</option>
                                {institutes.map((inst: any) => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={updateLoading}
                            className="px-8 py-4 bg-[#045c84] hover:bg-[#034d6e] text-white font-black rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {updateLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            <span>সংরক্ষণ করুন</span>
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
