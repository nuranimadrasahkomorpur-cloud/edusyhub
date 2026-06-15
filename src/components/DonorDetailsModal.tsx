'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, HeartPulse, Save, Trash2, Loader2, Check } from 'lucide-react';
import Modal from './Modal';
import { useSession } from './SessionProvider';

interface DonorDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    donor: any;
    onDelete?: (id: string, name: string) => void;
    onRefresh?: () => void;
}

export default function DonorDetailsModal({
    isOpen,
    onClose,
    donor,
    onDelete,
    onRefresh
}: DonorDetailsModalProps) {
    const { activeInstitute } = useSession();
    const [activeTab, setActiveTab] = useState<'profile' | 'optional_fees'>('profile');
    const [optionalCategories, setOptionalCategories] = useState<any[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [savingFees, setSavingFees] = useState(false);
    const [localDonor, setLocalDonor] = useState<any>(null);

    useEffect(() => {
        setLocalDonor(donor);
    }, [donor]);

    const fetchCategories = async () => {
        if (!activeInstitute?.id || !isOpen) return;
        setLoadingCategories(true);
        try {
            const res = await fetch(`/api/admin/accounts/categories?instituteId=${activeInstitute.id}`);
            const data = await res.json();
            if (res.ok) {
                // Filter optional categories where provider is 'donors' or 'anyone'
                setOptionalCategories(data.filter((c: any) => c.config?.isOptional && (c.config?.provider === 'donors' || c.config?.provider === 'anyone')));
            }
        } catch (error) {
            console.error('Fetch categories error:', error);
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === 'optional_fees') {
            fetchCategories();
        }
    }, [isOpen, activeTab, activeInstitute?.id]);

    if (!localDonor) return null;

    const name = localDonor.name || 'অজানা দাতা';
    const phone = localDonor.phone;
    const initials = name[0]?.toUpperCase() || 'D';

    const handleCall = () => {
        if (phone) window.open(`tel:${phone}`, '_self');
    };

    const handleToggleOptionalFee = async (categoryId: string) => {
        setSavingFees(true);
        try {
            const currentFees = localDonor.metadata?.optionalFees || {};
            const feeData = currentFees[categoryId] || { history: [] };
            
            // Check if currently active
            const isActive = feeData.history.length > 0 && !feeData.history[feeData.history.length - 1].end;
            
            const newHistory = [...feeData.history];
            if (isActive) {
                // Stop it
                newHistory[newHistory.length - 1].end = new Date().toISOString();
            } else {
                // Start it
                newHistory.push({ start: new Date().toISOString(), end: null });
            }

            const updatedMetadata = {
                ...localDonor.metadata,
                optionalFees: {
                    ...currentFees,
                    [categoryId]: { history: newHistory }
                }
            };

            const res = await fetch(`/api/admin/users`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: localDonor.id,
                    metadata: updatedMetadata
                })
            });

            if (res.ok) {
                setLocalDonor({ ...localDonor, metadata: updatedMetadata });
                onRefresh?.();
            } else {
                alert('আপডেট করতে সমস্যা হয়েছে।');
            }
        } catch (error) {
            console.error('Toggle fee error:', error);
            alert('সার্ভার এরর।');
        } finally {
            setSavingFees(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="দাতার বিস্তারিত তথ্য"
            maxWidth="max-w-2xl"
        >
            <div className="flex border-b border-slate-100 px-6 pt-2">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'profile' ? 'border-[#045c84] text-[#045c84]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    প্রোফাইল
                </button>
                <button
                    onClick={() => setActiveTab('optional_fees')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'optional_fees' ? 'border-[#045c84] text-[#045c84]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    ঐচ্ছিক খাত
                </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white flex items-center justify-center text-4xl font-black shadow-xl shadow-rose-900/20 ring-4 ring-white">
                                {initials}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">{name}</h3>
                                <div className="inline-flex items-center px-3 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-full border border-rose-100 mt-2 uppercase tracking-wider">
                                    দাতা (DONOR)
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {phone && (
                                <button
                                    onClick={handleCall}
                                    className="flex items-center justify-center gap-2 px-4 py-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-95"
                                >
                                    <Phone size={18} className="text-[#045c84]" />
                                    <span>{phone}</span>
                                </button>
                            )}
                        </div>

                        <div className="pt-4 flex flex-col gap-3 border-t border-slate-100">
                            {onDelete && (
                                <button
                                    onClick={() => {
                                        if (confirm('আপনি কি নিশ্চিত যে আপনি এই দাতাকে মুছে ফেলতে চান?')) {
                                            onDelete(localDonor.id, name);
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 p-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 group"
                                >
                                    <Trash2 size={18} className="group-hover:shake" />
                                    <span>দাতা মুছে ফেলুন</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'optional_fees' && (
                    <div className="space-y-4">
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                            <h4 className="text-sm font-bold text-[#045c84] mb-1">নিয়মিত অনুদান / ঐচ্ছিক খাত</h4>
                            <p className="text-xs text-slate-500 font-medium">
                                দাতা যে খাতগুলোতে নিয়মিত অনুদান দেবেন, সেগুলো চালু করে দিন। চালু থাকলে স্বয়ংক্রিয়ভাবে বকেয়া যুক্ত হবে।
                            </p>
                        </div>

                        {loadingCategories ? (
                            <div className="py-12 flex justify-center">
                                <Loader2 className="animate-spin text-slate-300" size={32} />
                            </div>
                        ) : optionalCategories.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                কোনো ঐচ্ছিক খাত পাওয়া যায়নি।
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {optionalCategories.map(cat => {
                                    const feeData = localDonor.metadata?.optionalFees?.[cat.id] || { history: [] };
                                    const isActive = feeData.history.length > 0 && !feeData.history[feeData.history.length - 1].end;

                                    return (
                                        <div key={cat.id} className={`p-4 rounded-2xl border transition-all ${isActive ? 'bg-[#045c84]/5 border-[#045c84]/20' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{cat.name}</h4>
                                                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                                                        পরিমাণ: ৳{cat.amount || 0}
                                                        {cat.config?.interval && <span className="ml-2 uppercase tracking-wider text-[9px] bg-slate-100 px-1.5 py-0.5 rounded">{cat.config.interval}</span>}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleOptionalFee(cat.id)}
                                                    disabled={savingFees}
                                                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${isActive ? 'bg-[#045c84]' : 'bg-slate-200'}`}
                                                >
                                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : ''}`} />
                                                </button>
                                            </div>
                                            
                                            {feeData.history.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-slate-100/50">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">হিস্ট্রি</p>
                                                    <div className="space-y-1.5">
                                                        {[...feeData.history].reverse().map((h: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between text-xs">
                                                                <span className="text-slate-600 font-medium">
                                                                    {new Date(h.start).toLocaleDateString('bn-BD')} থেকে {h.end ? new Date(h.end).toLocaleDateString('bn-BD') : 'বর্তমান'}
                                                                </span>
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${!h.end ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                    {!h.end ? 'চালু' : 'বন্ধ'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
