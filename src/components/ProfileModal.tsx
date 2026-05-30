'use client';

import React, { useState, useEffect } from 'react';
import {
    Settings,
    X,
    User,
    Mail,
    Phone,
    Lock,
    Loader2,
    Save,
    Eye,
    EyeOff
} from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
    const [updating, setUpdating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    });

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (user) {
                setEditForm({
                    name: user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    password: user.metadata?.originalPassword || ''
                });
            }
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [user, isOpen]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        setUpdating(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user.id,
                    ...editForm
                })
            });

            if (res.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Update Personal Profile Error:', error);
        } finally {
            setUpdating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in font-bengali">
            <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl animate-scale-in overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-[#045c84] rounded-2xl">
                            <Settings size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ব্যক্তিগত তথ্য আপডেট</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <form
                    onSubmit={handleUpdate}
                    className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar"
                    data-lenis-prevent
                >
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">আপনার নাম</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/5 transition-all outline-none font-bold text-slate-800"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">ইমেইল এড্রেস (লগইন আইডি)</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    required
                                    type="email"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/5 transition-all outline-none font-bold text-slate-800"
                                    value={editForm.email}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">ফোন নাম্বার (লগইন আইডি)</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/5 transition-all outline-none font-bold text-slate-800"
                                    placeholder="আপনার মোবাইল নাম্বার লিখুন"
                                    value={editForm.phone}
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">পাসওয়ার্ড (পরিবর্তন করতে চাইলে)</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/5 transition-all outline-none font-bold text-slate-800"
                                    placeholder="নতুন পাসওয়ার্ড দিন"
                                    value={editForm.password}
                                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all uppercase tracking-widest text-xs"
                        >
                            বাতিল করুন
                        </button>
                        <button
                            type="submit"
                            disabled={updating}
                            className="flex-1 py-4 bg-[#045c84] hover:bg-[#034d6e] text-white font-bold rounded-2xl shadow-xl shadow-blue-100 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                            {updating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            আপডেট করুন
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
