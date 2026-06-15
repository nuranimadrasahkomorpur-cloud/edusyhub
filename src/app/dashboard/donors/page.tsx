'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionProvider';
import {
    Users,
    Search,
    UserPlus,
    Loader2,
    HeartPulse
} from 'lucide-react';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import DonorCard from '@/components/DonorCard';
import DonorDetailsModal from '@/components/DonorDetailsModal';

export default function DonorsManagementPage() {
    const { user, activeRole, activeInstitute } = useSession();
    const [donors, setDonors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedDonor, setSelectedDonor] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
    });

    const fetchDonors = async () => {
        setLoading(true);
        try {
            const instituteFilter = activeInstitute?.id ? `&instituteId=${activeInstitute.id}` : '';
            const res = await fetch(`/api/admin/users?role=DONOR&search=${search}${instituteFilter}`);
            const data = await res.json();
            setDonors(Array.isArray(data) ? data : []);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Fetch donors error:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDonors();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, activeInstitute?.id]);

    const handleCreateDonor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeInstitute?.id) {
            setToast({ message: 'সক্রিয় প্রতিষ্ঠান পাওয়া যায়নি।', type: 'error' });
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    phone: formData.phone || null,
                    email: formData.email || null,
                    password: formData.password || null,
                    role: 'DONOR',
                    instituteIds: [activeInstitute.id],
                    skipAccountSetup: true
                }),
            });

            if (res.ok) {
                setToast({ message: 'দাতা সফলভাবে যুক্ত করা হয়েছে!', type: 'success' });
                setIsAddModalOpen(false);
                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    password: '',
                });
                fetchDonors();
            } else {
                const data = await res.json();
                setToast({ message: data.message || 'ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Create donor error:', error);
            setToast({ message: 'সার্ভার এরর।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteDonor = async (id: string, name: string) => {
        try {
            const res = await fetch(`/api/admin/users?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setToast({ message: 'দাতা সফলভাবে মুছে ফেলা হয়েছে!', type: 'success' });
                setIsDetailsModalOpen(false);
                fetchDonors();
            } else {
                setToast({ message: 'মুছে ফেলা ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Delete donor error:', error);
            setToast({ message: 'সার্ভার এরর।', type: 'error' });
        }
    };

    if (activeRole !== 'ADMIN' && activeRole !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 font-bengali">
                <HeartPulse size={64} className="mb-4 opacity-20" />
                <p className="text-xl font-medium">আপনার এই পেজটি দেখার অনুমতি নেই।</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-fade-in-up font-bengali min-h-screen pb-20">
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 max-w-lg">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
                        <input
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 transition-all outline-none text-black font-medium shadow-sm"
                            placeholder="খুঁজুন..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 sm:gap-4 px-4 sm:px-8 py-3 sm:py-4 bg-rose-500 text-white rounded-2xl sm:rounded-[28px] shadow-xl shadow-rose-200 hover:shadow-2xl hover:bg-rose-600 transition-all active:scale-95 group shrink-0"
                >
                    <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
                        <UserPlus size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-[10px] font-bold text-rose-200 uppercase tracking-widest hidden sm:inline">নতুন</span>
                        <span className="text-sm sm:text-lg font-black tracking-tight">দাতা যুক্ত করুন</span>
                    </div>
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Loader2 className="animate-spin text-rose-500 mb-3" size={40} />
                    <p className="text-slate-500 font-bold">লোড হচ্ছে...</p>
                </div>
            ) : donors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                    <HeartPulse className="text-slate-200 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-slate-400">কোনো দাতা পাওয়া যায়নি</h3>
                    <p className="text-slate-400 mt-1">অনুগ্রহ করে অন্য কিছু দিয়ে সার্চ করুন</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {donors.map(d => (
                        <DonorCard
                            key={d.id}
                            donor={d}
                            onDelete={handleDeleteDonor}
                            onCardClick={(donor) => {
                                setSelectedDonor(donor);
                                setIsDetailsModalOpen(true);
                            }}
                        />
                    ))}
                </div>
            )}

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setFormData({
                        name: '',
                        phone: '',
                        email: '',
                        password: '',
                    });
                }}
                title="নতুন দাতা যুক্ত করুন"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleCreateDonor} className="p-8 space-y-6">
                    <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                        <input type="email" name="fake-email" tabIndex={-1} autoComplete="off" />
                        <input type="password" name="fake-password" tabIndex={-1} autoComplete="new-password" />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">দাতার নাম</label>
                            <input
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400"
                                placeholder="যেমন: রহিম সাহেব"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">মোবাইল নম্বর (ঐচ্ছিক)</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="017xxxxxxxx"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ইমেইল (ঐচ্ছিক)</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="donor@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">পাসওয়ার্ড (ঐচ্ছিক)</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-rose-500/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400"
                                placeholder="পাসওয়ার্ড দিন"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <p className="text-[10px] text-slate-400 font-medium">পাসওয়ার্ড না দিলে মোবাইল নম্বরটিই পাসওয়ার্ড হিসেবে কাজ করবে (যদি নম্বর দেওয়া থাকে)।</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <HeartPulse size={20} />}
                            <span>দখল করুন</span>
                        </button>
                    </div>
                </form>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <DonorDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedDonor(null);
                }}
                donor={selectedDonor}
                onDelete={handleDeleteDonor}
                onRefresh={async () => {
                    const latestDonors = await fetchDonors();
                    if (selectedDonor) {
                        const updated = latestDonors.find((d: any) => d.id === selectedDonor.id);
                        if (updated) setSelectedDonor(updated);
                    }
                }}
            />
        </div>
    );
}
