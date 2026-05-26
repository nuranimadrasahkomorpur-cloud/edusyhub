'use client';

import React, { useState } from 'react';
import { useSession } from './SessionProvider';
import Link from 'next/link';
import {
    Building2,
    ChevronDown,
    Plus,
    LogOut,
    Crown,
    Users,
    Loader2
} from 'lucide-react';
import Modal from './Modal';
import Toast from './Toast';

export default function InstituteSwitcher() {
    const { user, activeInstitute, switchInstitute, activeRole, setAllInstitutes } = useSession();
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [instituteToLeave, setInstituteToLeave] = useState<any>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Only show for Admins and Super Admins
    if (activeRole !== 'ADMIN' && activeRole !== 'SUPER_ADMIN') return null;

    // If user has no institutes at all, show "Create Institute" prompt
    if (!user?.institutes || user.institutes.length === 0) {
        return (
            <div className="mx-4 mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
                <div className="flex items-center gap-2 mb-3 text-blue-700">
                    <Building2 size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider font-bengali">প্রতিষ্ঠান</span>
                </div>
                <Link
                    href="/dashboard/institute"
                    className="block w-full py-3 px-4 bg-[#045c84] text-white rounded-xl font-bold hover:bg-[#034a6b] transition-colors shadow-lg shadow-blue-900/20 text-center flex items-center justify-center gap-2 font-bengali"
                >
                    <Plus size={18} />
                    প্রতিষ্ঠান তৈরি করুন
                </Link>
                <p className="mt-2 text-[10px] text-blue-600 font-bold uppercase tracking-tight opacity-70 px-1 text-center font-bengali">
                    শুরু করতে একটি প্রতিষ্ঠান তৈরি করুন
                </p>
            </div>
        );
    }

    const handleLeaveClick = (institute: any) => {
        setInstituteToLeave(institute);
        setShowLeaveModal(true);
    };

    const confirmLeave = async () => {
        if (!instituteToLeave || !user?.id) return;

        setIsLeaving(true);
        try {
            const res = await fetch('/api/teacher/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    instituteId: instituteToLeave.id
                })
            });

            const data = await res.json();

            if (res.ok) {
                // Remove from local state
                const updatedInstitutes = user.institutes?.filter(i => i.id !== instituteToLeave.id) || [];
                setAllInstitutes(updatedInstitutes);

                // If we were in this institute, switch to another
                if (activeInstitute?.id === instituteToLeave.id && updatedInstitutes.length > 0) {
                    switchInstitute(updatedInstitutes[0]);
                }

                setToast({ message: 'প্রতিষ্ঠান ত্যাগ সফল হয়েছে', type: 'success' });
                setShowLeaveModal(false);
            } else {
                setToast({ message: data.message || 'ত্যাগ করতে ব্যর্থ', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: 'কিছু ভুল হয়েছে', type: 'error' });
        } finally {
            setIsLeaving(false);
        }
    };

    // Only show switcher if user has multiple institutes
    if (user.institutes.length <= 1) return null;

    return (
        <>
            <div className="mx-4 mb-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                <div className="flex items-center gap-2 mb-3 text-emerald-700">
                    <Building2 size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider font-bengali">প্রতিষ্ঠান পরিবর্তন</span>
                </div>

                <div className="space-y-2">
                    {user.institutes.map((inst: any) => {
                        const isActive = activeInstitute?.id === inst.id;
                        const isOwner = inst.isOwner !== false; // Default to true if not set

                        return (
                            <div
                                key={inst.id}
                                className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${isActive
                                        ? 'bg-emerald-100 border-emerald-300 shadow-sm'
                                        : 'bg-white border-emerald-100 hover:border-emerald-200'
                                    }`}
                                onClick={() => switchInstitute(inst)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-800 truncate font-bengali">
                                            {inst.name}
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1 rounded border border-slate-100">
                                            #{inst.id.slice(-4)}
                                        </span>
                                        {isOwner ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md border border-amber-200">
                                                <Crown size={10} />
                                                মালিক
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">
                                                <Users size={10} />
                                                যুক্ত
                                            </span>
                                        )}
                                    </div>
                                    {inst.address && (
                                        <p className="text-[10px] text-slate-500 truncate font-bengali mt-0.5">
                                            {inst.address}
                                        </p>
                                    )}
                                </div>

                                {!isOwner && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLeaveClick(inst);
                                        }}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="প্রতিষ্ঠান ত্যাগ করুন"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                <p className="mt-3 text-[10px] text-emerald-600 font-bold uppercase tracking-tight opacity-70 px-1 font-bengali">
                    বর্তমানে আপনি <span className="underline">{activeInstitute?.name}</span> এ আছেন
                </p>
            </div>

            {/* Leave Confirmation Modal */}
            <Modal
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                title="প্রতিষ্ঠান ত্যাগ নিশ্চিত করুন"
                maxWidth="max-w-md"
            >
                <div className="space-y-4 font-bengali">
                    <p className="text-slate-600">
                        আপনি কি নিশ্চিত যে আপনি <strong>{instituteToLeave?.name}</strong> প্রতিষ্ঠান ত্যাগ করতে চান?
                    </p>
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <strong>সতর্কতা:</strong> এই প্রতিষ্ঠানে আপনার শিক্ষক প্রোফাইল মুছে যাবে। পুনরায় যুক্ত হতে নতুন আমন্ত্রণ প্রয়োজন।
                    </p>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowLeaveModal(false)}
                            disabled={isLeaving}
                            className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            বাতিল
                        </button>
                        <button
                            onClick={confirmLeave}
                            disabled={isLeaving}
                            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                            {isLeaving ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
                            ত্যাগ করুন
                        </button>
                    </div>
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
