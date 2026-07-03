'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionProvider';
import {
    BookOpen,
    Plus,
    Loader2,
    Clock,
    Save,
    LayoutGrid,
    Settings2
} from 'lucide-react';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import ClassScheduleSettingsModal from '@/components/ClassScheduleSettingsModal';

const PRESET_CLASSES = {
    school: {
        bn: ['প্লে', 'নার্সারি', 'প্রথম শ্রেণী', 'দ্বিতীয় শ্রেণী', 'তৃতীয় শ্রেণী', 'চতুর্থ শ্রেণী', 'পঞ্চম শ্রেণী', 'ষষ্ঠ শ্রেণী', 'সপ্তম শ্রেণী', 'অষ্টম শ্রেণী', 'নবম শ্রেণী', 'দশম শ্রেণী', 'একাদশ শ্রেণী', 'দ্বাদশ শ্রেণী'],
        en: ['Play', 'Nursery', 'Class One', 'Class Two', 'Class Three', 'Class Four', 'Class Five', 'Class Six', 'Class Seven', 'Class Eight', 'Class Nine', 'Class Ten', 'Class Eleven', 'Class Twelve'],
        ar: ['روصة', 'تمهيدي', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس', 'الصف السابع', 'الصف الثامن', 'الصف التاسع', 'الصف العاشر', 'الحادي عشر', 'الثاني عشر']
    },
    alia: {
        bn: ['প্লে', 'নার্সারি', 'ইবতেদায়ী ১ম', 'ইবতেদায়ী ২য়', 'ইবতেদায়ী ৩য়', 'ইবতেদায়ী ৪র্থ', 'ইবতেদায়ী ৫ম', 'দাখিল ৬ষ্ঠ', 'দাখিল ৭ম', 'দাখিল ৮ম', 'দাখিল ৯ম', 'দাখিল ১০ম', 'আলিম ১ম বর্ষ', 'আলিম ২য় বর্ষ', 'ফাযিল', 'কামিল', 'হিফজ', 'নূরানী', 'মক্তব'],
        en: ['Play', 'Nursery', 'Ibtedayi One', 'Ibtedayi Two', 'Ibtedayi Three', 'Ibtedayi Four', 'Ibtedayi Five', 'Dakhil Six', 'Dakhil Seven', 'Dakhil Eight', 'Dakhil Nine', 'Dakhil Ten', 'Alim First Year', 'Alim Second Year', 'Fazil', 'Kamil', 'Hifz', 'Noorani', 'Maktab'],
        ar: ['روصة', 'تمهيدي', 'الابتدائي الأول', 'الابتدائي الثاني', 'الابتدائي الثالث', 'الابتدائي الرابع', 'الابتدائي الخامس', 'الداخل السادس', 'الداخل السابع', 'الداخل الثامن', 'الداخل التاسع', 'الداخل العاشر', 'عالم سنة أولى', 'عالم سنة ثانية', 'فاضل', 'كامل', 'حفظ', 'نوراني', 'مكتب']
    },
    qawmi: {
        bn: ['নূরানী / মক্তব', 'নাজেরা', 'হিফজ', 'আউয়াল (১ম)', 'ছানী (২য়)', 'ছালেছ (৩য়)', 'রাবে (৪র্থ)', 'খামেস (৫ম)', 'নাহবেমীর', 'হেদায়াতুন নাহু', 'কাফিয়া', 'শরহে জামী', 'শরহে বেকায়া', 'জালালাইন', 'মিশকাত', 'দাওরায়ে হাদীস', 'ইফতা'],
        en: ['Noorani / Maktab', 'Nazira', 'Hifz', 'Awwal', 'Sani', 'Salis', 'Rabi', 'Khamis', 'Nahw-e-Mir', 'Hidayatun Nahw', 'Kafiyah', 'Sharh-e-Jami', 'Sharh-e-Wiqayah', 'Jalalain', 'Mishkat', 'Dawra-e-Hadith', 'Ifta'],
        ar: ['نوراني / مكتب', 'ناظرة', 'حفظ', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'نحو مير', 'هداية النحو', 'كافية', 'شرح جامي', 'شرح وقاية', 'جلالين', 'مشكاة', 'دورة الحديث', 'إفتاء']
    }
};

export default function ClassesPage() {
    const { activeInstitute, activeRole } = useSession();
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [classPresetType, setClassPresetType] = useState<'school' | 'alia' | 'qawmi' | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [classLanguage, setClassLanguage] = useState<'bn' | 'en' | 'ar'>('bn');
    const [bulkClassText, setBulkClassText] = useState('');
    const [groupData, setGroupData] = useState({ name: '' });
    const [startTimeInput, setStartTimeInput] = useState('');

    const fetchClasses = async () => {
        if (!activeInstitute?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/classes?instituteId=${activeInstitute.id}`);
            const data = await res.json();
            setClasses(data || []);
        } catch (error) {
            console.error('Fetch classes error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeInstitute?.id) {
            fetchClasses();
        }
    }, [activeInstitute?.id]);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeInstitute?.id) return;
        setActionLoading(true);
        try {
            let payload: any = { instituteId: activeInstitute.id };

            const items = bulkClassText
                .split('\n')
                .map(line => {
                    const slMatch = line.match(/^(\d+)[\.\)\s-]+/);
                    const order = slMatch ? parseInt(slMatch[1]) : 0;
                    const name = line.replace(/^\d+[\.\)\s-]+/, '').trim();
                    return { name, order };
                })
                .filter(item => item.name.length > 0);

            if (items.length === 0) {
                setToast({ message: 'অনুগ্রহ করে ক্লাস লিস্ট বা সঠিক ফরম্যাট দিন।', type: 'error' });
                setActionLoading(false);
                return;
            }
            payload.names = items;

            const res = await fetch('/api/admin/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setToast({ message: 'ক্লাসগুলো সফলভাবে তৈরি হয়েছে!', type: 'success' });
                setIsClassModalOpen(false);
                setBulkClassText('');
                fetchClasses();
            }
        } catch (error) {
            setToast({ message: 'ক্রুটি হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass?.id) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...groupData, classId: selectedClass.id })
            });
            if (res.ok) {
                setToast({ message: 'গ্রুপ সফলভাবে তৈরি হয়েছে!', type: 'success' });
                setIsGroupModalOpen(false);
                setGroupData({ name: '' });
                fetchClasses();
            }
        } catch (error) {
            setToast({ message: 'ক্রুটি হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSettingsSuccess = () => {
        setToast({ message: 'ক্লাস সেটিংস সফলভাবে সেভ হয়েছে!', type: 'success' });
        fetchClasses();
    };

    const isAdmin = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN';

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in-up font-bengali">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {isAdmin && (
                    <button
                        onClick={() => setIsClassModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-[#045c84] text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        <span>নতুন ক্লাস</span>
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="animate-spin mb-4" size={48} />
                    <p className="font-bold">লোড হচ্ছে...</p>
                </div>
            ) : classes.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center text-slate-400">
                    <BookOpen className="mx-auto mb-4 opacity-20" size={64} />
                    <p className="text-xl font-bold">কোন ক্লাস পাওয়া যায়নি।</p>
                    {isAdmin && (
                        <button
                            onClick={() => setIsClassModalOpen(true)}
                            className="mt-4 text-[#045c84] font-bold hover:underline"
                        >
                            প্রথম ক্লাস তৈরি করুন &rarr;
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((c) => (
                        <div key={c.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#045c84] rounded-xl flex items-center justify-center text-white">
                                        <BookOpen size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">{c.name}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isAdmin && (
                                        <button
                                            onClick={() => {
                                                setSelectedClass(c);
                                                setIsSettingsModalOpen(true);
                                            }}
                                            className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:text-[#045c84] hover:border-[#045c84] transition-all"
                                            title="ক্লাস সেটিংস"
                                        >
                                            <Settings2 size={16} />
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => {
                                                setSelectedClass(c);
                                                setIsGroupModalOpen(true);
                                            }}
                                            className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:text-[#045c84] hover:border-[#045c84] transition-all"
                                            title="গ্রুপ যোগ করুন"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Start time badge */}
                            {c.startTime && (
                                <div className="px-6 pt-3 flex items-center gap-1.5">
                                    <Clock size={12} className="text-[#045c84]" />
                                    <span className="text-[10px] font-black text-[#045c84] uppercase tracking-wide">
                                        ক্লাস শুরু: {c.startTime}
                                    </span>
                                </div>
                            )}

                            <div className="p-6 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <LayoutGrid size={12} />
                                    <span>গ্রুপসমূহ</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(c.groups && c.groups.length > 0) ? c.groups.map((g: any) => (
                                        <span key={g.id} className="px-3 py-1 bg-blue-50 text-[#045c84] text-xs font-bold rounded-full border border-blue-100">
                                            {g.name}
                                        </span>
                                    )) : (
                                        <span className="text-xs text-slate-400 italic">কোন গ্রুপ নেই</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Class Modal */}
            <Modal
                isOpen={isClassModalOpen}
                onClose={() => {
                    setIsClassModalOpen(false);
                    setBulkClassText('');
                }}
                title="নতুন ক্লাস তৈরি করুন"
                maxWidth="max-w-xl"
                noScroll={true}
            >
                <form onSubmit={handleCreateClass} className="flex flex-col h-full max-h-[90vh] sm:max-h-[85vh]">
                    <div className="p-5 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">দ্রুত নির্বাচন করুন</label>
                            
                            <div className="flex flex-col-reverse sm:flex-row gap-2">
                                <div className="flex-1 flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setClassPresetType(classPresetType === 'school' ? null : 'school')}
                                        className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${classPresetType === 'school' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        জেনারেল/স্কুল
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClassPresetType(classPresetType === 'alia' ? null : 'alia')}
                                        className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${classPresetType === 'alia' ? 'bg-white text-[#107044] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        আলিয়া
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClassPresetType(classPresetType === 'qawmi' ? null : 'qawmi')}
                                        className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${classPresetType === 'qawmi' ? 'bg-white text-[#107044] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        কওমি
                                    </button>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setClassLanguage('bn')}
                                        className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${classLanguage === 'bn' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        BN
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClassLanguage('en')}
                                        className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${classLanguage === 'en' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        EN
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClassLanguage('ar')}
                                        className={`px-3 py-2 text-[14px] font-arabic font-bold rounded-lg transition-all ${classLanguage === 'ar' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        عربي
                                    </button>
                                </div>
                            </div>
                            
                            {classPresetType && PRESET_CLASSES[classPresetType] && (
                                <div className="grid grid-cols-2 gap-2 mt-2 max-h-[320px] overflow-y-auto p-1 custom-scrollbar bg-slate-50 border border-slate-200 rounded-xl">
                                    {PRESET_CLASSES[classPresetType][classLanguage]?.map(cls => {
                                        const isSelected = bulkClassText.includes(cls);
                                        return (
                                            <button
                                                key={cls}
                                                type="button"
                                                onClick={() => {
                                                    if (!isSelected) {
                                                        setBulkClassText(prev => prev ? prev + '\n' + cls : cls);
                                                    } else {
                                                        setBulkClassText(prev => prev.split('\n').filter(line => line.trim() && !line.includes(cls)).join('\n'));
                                                    }
                                                }}
                                                className={`p-2 text-[11px] ${classLanguage === 'ar' ? 'font-arabic text-[14px]' : 'font-bold'} rounded-lg border text-left transition-all ${isSelected ? 'border-red-500 bg-red-50 text-red-600 shadow-sm' : 'border-transparent bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm'}`}
                                            >
                                                {cls}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ক্লাস লিস্ট (বা নিজে লিখুন)</label>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">ইংরেজি SL নম্বর থাকলে সমস্যা নেই</span>
                            </div>
                            <textarea
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black min-h-[250px] resize-none"
                                placeholder={"যেমন:\n1. Class One\n2. Class Two"}
                                value={bulkClassText}
                                onChange={(e) => setBulkClassText(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="p-5 md:p-8 pt-4 border-t border-slate-100 bg-white shrink-0 rounded-b-2xl">
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="w-full py-4 bg-[#045c84] text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                        >
                            {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            <span>সেভ করুন</span>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Group Modal */}
            <Modal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                title={`নতুন গ্রুপ যোগ করুন (${selectedClass?.name})`}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleCreateGroup} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">গ্রুপের নাম</label>
                        <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black"
                            placeholder="যেমন: বিজ্ঞান"
                            value={groupData.name}
                            onChange={(e) => setGroupData({ ...groupData, name: e.target.value })}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-4 bg-[#045c84] text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                    >
                        {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span>সেভ করুন</span>
                    </button>
                </form>
            </Modal>

            {/* Class Settings Modal */}
            {selectedClass && (
                <ClassScheduleSettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    classId={selectedClass.id}
                    className={selectedClass.name}
                    existingData={selectedClass}
                    onSuccess={handleSettingsSuccess}
                />
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
