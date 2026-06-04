'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionProvider';
import {
    Users,
    Building2,
    Plus,
    Star,
    MapPin,
    Phone,
    MoreVertical,
    X,
    Camera,
    Loader2,
    Globe,
    AlertCircle,
    ChevronDown,
    Save,
    Copy,
    Link2,
    CheckCheck
} from 'lucide-react';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';


export default function MultiInstitutePage() {
    const { user, activeRole, activeInstitute, switchInstitute, refreshInstitutes, setAllInstitutes, login } = useSession();
    const [institutes, setInstitutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [editingInst, setEditingInst] = useState<any>(null);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'Madrasa',
        address: '',
        phone: '',
        website: '',
        logo: '',
        coverImage: ''
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'coverImage') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            // Create local preview
            const localUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, [field]: localUrl }));

            // preventing submit while uploading
            setCreateLoading(true);
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    // Update with permanent URL
                    setFormData(prev => ({ ...prev, [field]: data.url }));
                } else {
                    setFormData(prev => ({ ...prev, [field]: '' }));
                    setToast({ message: 'আপলোড ব্যর্থ হয়েছে', type: 'error' });
                }
            } else {
                const errorData = await res.json();
                setFormData(prev => ({ ...prev, [field]: '' }));
                setToast({ message: `আপলোড ব্যর্থ: ${errorData.message || 'Cloudinary কনফিগারেশন চেক করুন'}`, type: 'error' });
            }
        } catch (error) {
            console.error('Upload failed', error);
            setFormData(prev => ({ ...prev, [field]: '' }));
            setToast({ message: 'আপলোড এরর: নেটওয়ার্ক সমস্যা', type: 'error' });
        } finally {
            setCreateLoading(false);
        }
    };

    const fetchInstitutes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/institute?userId=${user?.id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setInstitutes(data);
                // Also update the session state so the switcher has access to these
                setAllInstitutes(data);
            } else {
                console.warn('Institute fetch returned non-array:', data);
                setInstitutes([]); // Force empty state on error/non-array response
            }
        } catch (error) {
            console.error('Fetch institutes error:', error);
            setInstitutes([]); // Force empty state on network error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchInstitutes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            setToast({ message: 'ইউজার আইডি পাওয়া যায়নি। অনুগ্রহ করে রিলোড দিন।', type: 'error' });
            return;
        }

        console.log('HANDLING SAVE:', { editingInst, formData, userId: user.id });

        setCreateLoading(true);
        try {
            const method = editingInst ? 'PATCH' : 'POST';
            const body = editingInst
                ? { id: editingInst.id, ...formData }
                : { ...formData, userId: user.id };

            console.log('SENDING BODY:', body);

            const res = await fetch('/api/institute', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                const { institute, user: updatedUser } = await res.json();

                if (updatedUser) {
                    // This will refresh the entire session including role and institutes
                    login(updatedUser);
                } else if (institute) {
                    refreshInstitutes({ ...institute });
                }

                fetchInstitutes();
                setIsCreateModalOpen(false);
                setEditingInst(null);
                setFormData({ name: '', type: 'Madrasa', address: '', phone: '', website: '', logo: '', coverImage: '' });
                setToast({
                    message: editingInst ? 'প্রতিষ্ঠান আপডেট করা হয়েছে!' : 'নতুন প্রতিষ্ঠান যুক্ত হয়েছে!',
                    type: 'success'
                });
            } else {
                const error = await res.json();
                console.error('SAVE ERROR:', error);
                setToast({ message: error.message || 'সেভ করতে সমস্যা হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Save institute error:', error);
            setToast({ message: 'সার্ভার এরর হয়েছে।', type: 'error' });
        } finally {
            setCreateLoading(false);
        }
    };

    const handleOpenEdit = (inst: any) => {
        console.log('OPENING EDIT FOR:', inst);
        setEditingInst(inst);
        setFormData({
            name: inst.name || '',
            type: inst.type || 'Madrasa',
            address: inst.address || '',
            phone: inst.phone || '',
            website: inst.website || '',
            logo: inst.logo || '',
            coverImage: inst.coverImage || ''
        });
        setIsCreateModalOpen(true);
    };

    const handleSetDefault = async (inst: any) => {
        try {
            const res = await fetch('/api/institute', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: inst.id, isDefault: true, userId: user?.id }),
            });
            if (res.ok) {
                switchInstitute(inst);
                refreshInstitutes({ ...inst, id: inst.id }); // Ensure list is updated if needed (though default ID is on user)
                setToast({ message: 'ডিফল্ট প্রতিষ্ঠান সেট করা হয়েছে!', type: 'success' });
            }
        } catch (error) {
            console.error('Set default error:', error);
        }
    };

    if (activeRole !== 'ADMIN' && activeRole !== 'SUPER_ADMIN' && activeRole !== 'TEACHER') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <Building2 size={64} className="mb-4 opacity-20" />
                <p className="text-xl font-medium">আপনার এই পেজটি দেখার অনুমতি নেই।</p>
            </div>
        );
    }

    return (
        <div className="font-bengali">
            <div className="p-8 space-y-8 animate-fade-in-up">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button
                        onClick={() => {
                            setEditingInst(null);
                            setFormData({ name: '', type: 'Madrasa', address: '', phone: '', website: '', logo: '', coverImage: '' });
                            setIsCreateModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-4 bg-[#045c84] text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        <span>নতুন প্রতিষ্ঠান</span>
                    </button>
                </div>

                {loading ? (
                    <div className="py-20 text-center text-slate-400">
                        <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                        <span>লোড হচ্ছে...</span>
                    </div>
                ) : Array.isArray(institutes) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {institutes.length === 0 ? (
                            <div className="md:col-span-2 lg:col-span-3 py-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                                <Building2 className="mx-auto mb-4 opacity-10" size={64} />
                                <p className="text-lg font-medium">আপনার কোন প্রতিষ্ঠান যুক্ত করা নেই।</p>
                                <button onClick={() => {
                                    setEditingInst(null);
                                    setFormData({ name: '', type: 'Madrasa', address: '', phone: '', website: '', logo: '', coverImage: '' });
                                    setIsCreateModalOpen(true);
                                }} className="mt-4 text-[#045c84] font-black underline">প্রথমটি যুক্ত করুন</button>
                            </div>
                        ) : institutes.map((inst) => (

                            <div key={inst.id} className={`bg-white rounded-3xl border-2 transition-all relative group overflow-hidden ${activeInstitute?.id === inst.id ? 'border-[#045c84] shadow-xl shadow-blue-900/5' : 'border-slate-100 hover:border-slate-200 hover:shadow-lg'}`}>
                                {/* Cover Image Header */}
                                <div className="h-32 w-full relative bg-slate-100 overflow-hidden">
                                    {inst.coverImage ? (
                                        <>
                                            <img src={inst.coverImage} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-r from-[#045c84] to-[#047cac] opacity-10"></div>
                                    )}

                                    {/* Default Badge */}
                                    {activeInstitute?.id === inst.id && (
                                        <div className="absolute top-4 right-4 text-[#045c84] bg-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                            <Star size={10} fill="currentColor" />
                                            ডিফল্ট
                                        </div>
                                    )}

                                    {/* Owner/Joined Badge */}
                                    <div className={`absolute top-4 ${activeInstitute?.id === inst.id ? 'right-28' : 'right-4'}`}>
                                        {inst.isOwner !== false ? (
                                            <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm border border-amber-200">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                                </svg>
                                                মালিক
                                            </div>
                                        ) : (
                                            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm border border-blue-200">
                                                <Users size={10} />
                                                যুক্ত
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 pt-0 relative">
                                    {/* Logo overlapping cover */}
                                    <div className="flex justify-between items-end -mt-8 mb-4">
                                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-[#045c84] font-black text-3xl border-[4px] border-white shadow-md overflow-hidden relative z-10">
                                            {inst.logo ? (
                                                <img src={inst.logo} alt={inst.name} className="w-full h-full object-cover" />
                                            ) : (
                                                inst.name[0]
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="mb-6">
                                        <h3 className="font-black text-slate-800 tracking-tight text-lg leading-tight mb-1">{inst.name}</h3>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">{inst.type}</span>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                                                <MapPin size={14} />
                                            </div>
                                            <span className="truncate">{inst.address || 'ঠিকানা দেওয়া নেই'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                                                <Phone size={14} />
                                            </div>
                                            <span>{inst.phone || 'ফোন নম্বর নেই'}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-slate-50">
                                        <button
                                            onClick={() => handleSetDefault(inst)}
                                            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${activeInstitute?.id === inst.id ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-slate-50 text-slate-600 hover:bg-[#045c84] hover:text-white'}`}
                                        >
                                            {activeInstitute?.id === inst.id ? 'সক্রিয়' : 'ডিফল্ট করুন'}
                                        </button>
                                        <button
                                            title="Easy-Q এর জন্য API Link কপি করুন"
                                            onClick={async () => {
                                                const apiUrl = `${window.location.origin}/api/provider/sync?instituteId=${inst.id}`;
                                                await navigator.clipboard.writeText(apiUrl);
                                                setCopiedId(inst.id);
                                                setToast({ message: 'API লিংক কপি হয়েছে! Easy-Q তে পেস্ট করুন।', type: 'success' });
                                                setTimeout(() => setCopiedId(null), 3000);
                                            }}
                                            className={`px-3 py-3 rounded-xl transition-all flex items-center gap-1 text-xs font-black ${
                                                copiedId === inst.id
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-blue-50 text-[#045c84] hover:bg-[#045c84] hover:text-white'
                                            }`}
                                        >
                                            {copiedId === inst.id ? <CheckCheck size={16} /> : <Link2 size={16} />}
                                            <span>{copiedId === inst.id ? 'কপি!' : 'API'}</span>
                                        </button>
                                        <button
                                            onClick={() => handleOpenEdit(inst)}
                                            className="px-4 py-3 bg-slate-50 text-slate-400 hover:text-[#045c84] hover:bg-slate-100 rounded-xl transition-all"
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-red-500 bg-red-50 rounded-3xl border border-red-100">
                        <AlertCircle className="mx-auto mb-2" />
                        <p className="font-bold">তথ্য লোড করতে সমস্যা হয়েছে।</p>
                        <button onClick={fetchInstitutes} className="mt-2 text-red-600 underline text-sm">আবার চেষ্টা করুন</button>
                    </div>
                )}


            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingInst ? 'প্রতিষ্ঠান তথ্য আপডেট' : 'নতুন প্রতিষ্ঠান যুক্ত করুন'}
            >
                <form onSubmit={handleSave} className="p-8 space-y-6">

                    {/* Cover Image Upload */}
                    <div className="relative w-full h-32 bg-slate-100 rounded-2xl overflow-hidden group border-2 border-dashed border-slate-200 hover:border-[#045c84] transition-all">
                        {formData.coverImage ? (
                            <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Camera size={24} />
                                <span className="text-xs font-bold uppercase mt-1">কভার ফটো দিন</span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'coverImage')}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {createLoading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
                    </div>

                    <div className="flex gap-6">
                        {/* Logo Upload */}
                        <div className="shrink-0 relative w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden group border-2 border-dashed border-slate-200 hover:border-[#045c84] transition-all -mt-12 bg-white shadow-lg z-10">
                            {formData.logo ? (
                                <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <Camera size={20} />
                                    <span className="text-[10px] font-bold uppercase mt-1">লোগো</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'logo')}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>

                        <div className="flex-1 pt-2">
                            <p className="text-sm text-slate-500">আপনার প্রতিষ্ঠানের লোগো এবং কভার ফটো যুক্ত করুন। (সর্বোচ্চ ৫ মেগাবাইট)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">প্রতিষ্ঠানের নাম</label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="যেমন: এডুসি আইডিয়াল স্কুল"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">ধরণ</label>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white transition-all outline-none font-medium text-black appearance-none cursor-pointer"
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                >
                                    <option value="Madrasa">মাদ্রাসা</option>
                                    <option value="School">স্কুল</option>
                                    <option value="College">কলেজ</option>
                                    <option value="Kindergarten">কিন্ডারগার্টেন</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">ফোন নম্বর</label>
                            <input
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white transition-all outline-none font-medium text-black"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="০১৩********"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">ঠিকানা</label>
                            <textarea
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white transition-all outline-none font-medium text-black min-h-[80px]"
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                placeholder="প্রতিষ্ঠানের সম্পূর্ণ ঠিকানা..."
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={createLoading}
                            className="px-8 py-4 bg-[#045c84] hover:bg-[#034d6e] text-white font-black rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {createLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            <span>{editingInst ? 'আপডেট করুন' : 'প্রতিষ্ঠান যুক্ত করুন'}</span>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
