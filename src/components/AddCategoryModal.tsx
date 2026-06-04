'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    TrendingUp, 
    TrendingDown, 
    Plus, 
    Calendar, 
    Clock, 
    Users,
    ChevronDown,
    Search,
    Loader2,
    Check
} from 'lucide-react';
import { useSession } from '@/components/SessionProvider';
import { normalizeBengaliDigits } from '@/utils/digit-utils';

interface AddCategoryModalProps {
    onClose: () => void;
    initialData?: any;
    onSave: (data: any) => void;
}

export default function AddCategoryModal({ onClose, initialData, onSave }: AddCategoryModalProps) {
    const { activeInstitute } = useSession();
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: (initialData?.type?.toLowerCase() as 'income' | 'expense') || 'income',
        frequencyType: initialData?.config?.frequencyType || (initialData as any)?.frequencyType || 'fixed',
        interval: initialData?.config?.interval || (initialData as any)?.interval || 'monthly',
        provider: initialData?.config?.provider || (initialData as any)?.provider || 'anyone',
        studentAmountType: initialData?.config?.studentAmountType || (initialData as any)?.provider === 'students' ? (initialData?.config?.studentAmountType || 'flat') : 'flat',
        customGroupAllowed: initialData?.config?.customGroupAllowed || false,
        customGroupName: initialData?.config?.customGroupName || '',
        customGroupScope: initialData?.config?.customGroupScope || 'institute',
        startDate: initialData?.config?.startDate || '',
        endDate: initialData?.config?.endDate || '',
        dueDays: initialData?.config?.dueDays || 5,
        dueTiming: initialData?.config?.dueTiming || 'start',
        alertDays: initialData?.config?.alertDays || 2,
        alertType: initialData?.config?.alertType || 'before',
        amount: (initialData?.amount === 'variable' || typeof initialData?.amount === 'string') ? 0 : (initialData?.amount || 0),
        studentClassAmounts: initialData?.config?.studentClassAmounts || {},
        studentGroupAmounts: initialData?.config?.studentGroupAmounts || {},
        teacherAmounts: initialData?.config?.teacherAmounts || {},
        customRecipients: initialData?.config?.customRecipients || [{ id: Date.now().toString(), name: '', amount: undefined }],
        deselectedStudents: initialData?.config?.deselectedStudents || {},
        customStudentAmounts: initialData?.config?.customStudentAmounts || {},
        studentWaivers: initialData?.config?.studentWaivers || {},
        thresholdDays: initialData?.config?.thresholdDays || 0,
        isExcludedFromSummary: initialData?.config?.isExcludedFromSummary || false
    });

    const [targetCycles, setTargetCycles] = useState(1);

    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [classGroups, setClassGroups] = useState<{[key: string]: any[]}>({});
    const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    const [classStudents, setClassStudents] = useState<Record<string, any[]>>({});
    const [loadingStudents, setLoadingStudents] = useState<Record<string, boolean>>({});
    const [studentSearch, setStudentSearch] = useState('');

    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

    const handleExpandClass = async (classId: string) => {
        if (expandedClassId === classId) {
            setExpandedClassId(null);
            return;
        }
        setExpandedClassId(classId);
        setStudentSearch('');
        if (!classStudents[classId]) {
            setLoadingStudents(prev => ({ ...prev, [classId]: true }));
            try {
                const res = await fetch(`/api/admin/users?role=STUDENT&classId=${classId}&instituteId=${activeInstitute?.id || ''}`);
                const data = await res.json();
                setClassStudents(prev => ({ ...prev, [classId]: Array.isArray(data) ? data : [] }));
            } catch (err) {
                console.error('Failed to fetch students', err);
            } finally {
                setLoadingStudents(prev => ({ ...prev, [classId]: false }));
            }
        }
    };

    const { totalRecipients, totalDue } = useMemo(() => {
        let recipients = 0;
        let due = 0;

        if (formData.provider === 'students') {
            if (formData.studentAmountType === 'flat') {
                const amount = typeof formData.amount === 'number' ? formData.amount : 0;
                if (amount > 0) {
                    recipients = availableClasses.reduce((sum, cls) => sum + (cls._count?.students || 0), 0);
                    due = recipients * amount;
                }
            } else if (formData.studentAmountType === 'per-class') {
                availableClasses.forEach(cls => {
                    const baseAmt = formData.studentClassAmounts?.[cls.id] || 0;
                    let classRecipients = cls._count?.students || 0;
                    const deselected = formData.deselectedStudents?.[cls.id] || [];
                    
                    classRecipients = Math.max(0, classRecipients - deselected.length);
                    recipients += classRecipients;
                    
                    let classDue = classRecipients * baseAmt;
                    
                    const customAmts = formData.customStudentAmounts?.[cls.id] || {};
                    Object.entries(customAmts).forEach(([stuId, customAmt]) => {
                        if (!deselected.includes(stuId)) {
                            classDue -= baseAmt;
                            classDue += (typeof customAmt === 'number' ? customAmt : 0);
                        }
                    });
                    
                    due += Math.max(0, classDue);
                });
            } else if (formData.studentAmountType === 'per-group') {
                availableClasses.forEach(cls => {
                    const clsGroups = classGroups[cls.id] || [];
                    const totalGroupStudents = clsGroups.reduce((gSum, grp) => gSum + (grp._count?.students || 0), 0);
                    const classBaseStudents = Math.max(0, (cls._count?.students || 0) - totalGroupStudents);
                    
                    const baseAmt = formData.studentClassAmounts?.[cls.id] || 0;
                    if (baseAmt > 0) {
                        recipients += classBaseStudents;
                        due += (classBaseStudents * baseAmt);
                    }

                    clsGroups.forEach(grp => {
                        const grpAmt = formData.studentGroupAmounts?.[`${cls.id}-${grp.id}`] || 0;
                        if (grpAmt > 0) {
                            const grpCount = grp._count?.students || 0;
                            recipients += grpCount;
                            due += (grpCount * grpAmt);
                        }
                    });
                });
            }
        } else if (formData.provider === 'teachers') {
            const baseAmount = typeof formData.amount === 'number' ? formData.amount : 0;
            availableTeachers.forEach((t: any) => {
                const amt = formData.teacherAmounts?.[t.id] || baseAmount;
                if (amt > 0) {
                    recipients += 1;
                    due += amt;
                }
            });
        } else if (formData.provider === 'custom') {
            formData.customRecipients.forEach((r: any) => {
                const amt = r.amount || 0;
                if (amt > 0) {
                    recipients += 1;
                    due += amt;
                }
            });
        } else if (formData.provider === 'anyone') {
            recipients = 0;
            due = 0;
        }

        // If no recipients exist at all, the total potential amount for the system is exactly 0.
        if (recipients === 0) {
            due = 0;
        }

        const finalDue = formData.frequencyType === 'fixed' ? (due * targetCycles) : due;

        return { totalRecipients: recipients, totalDue: finalDue };
    }, [formData, availableClasses, classGroups, availableTeachers, targetCycles]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!activeInstitute?.id) return;
            setLoadingData(true);
            try {
                const res = await fetch(`/api/admin/classes?instituteId=${activeInstitute.id}`);
                const data = await res.json();
                const clsList = Array.isArray(data) ? data : [];
                setAvailableClasses(clsList);

                const groupsMap: {[key: string]: any[]} = {};
                clsList.forEach((cls: any) => {
                    groupsMap[cls.id] = Array.isArray(cls.groups) ? cls.groups : [];
                });
                setClassGroups(groupsMap);

                const tRes = await fetch(`/api/teacher?instituteId=${activeInstitute.id}`);
                const tData = await tRes.json();
                setAvailableTeachers(Array.isArray(tData) ? tData : []);

            } catch (error) {
                console.error('Fetch data error:', error);
            } finally {
                setLoadingData(false);
            }
        };

        fetchAllData();
    }, [activeInstitute?.id]);

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-scale-in flex flex-col font-bengali h-[90vh]">
                {/* Modal Header */}
                <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
                    <div className="flex items-center gap-8">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter whitespace-nowrap">নতুন খাত যোগ করুন</h2>
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl">
                            <button 
                                onClick={() => setFormData({...formData, type: 'income'})}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    formData.type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-emerald-500'
                                }`}
                            >
                                <TrendingUp size={16} /> আয় / ফি
                            </button>
                            <button 
                                onClick={() => setFormData({...formData, type: 'expense'})}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    formData.type === 'expense' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-rose-500'
                                }`}
                            >
                                <TrendingDown size={16} /> ব্যয়
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                        <Plus className="rotate-45" size={24} />
                    </button>
                </div>

                {/* Modal Content - Scrollable Unified View */}
                <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar text-slate-800 pb-20 relative" data-lenis-prevent>
                    
                    {/* SECTION 1: BASIC INFO */}
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] px-4">খাতের নাম</label>
                        <input 
                            type="text" 
                            placeholder="যেমন: মাসিক বেতন বা বিদ্যুৎ বিল"
                            className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-lg font-black placeholder:text-slate-300 focus:ring-4 focus:ring-[#045c84]/10 focus:border-[#045c84]/30 transition-all outline-none"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    {/* SECTION 2: SCHEDULE */}
                    <div className="space-y-6 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] px-4">ফ্রিকোয়েন্সি ধরণ</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setFormData({...formData, frequencyType: 'fixed'})}
                                className={`p-6 rounded-3xl border-2 transition-all text-left space-y-2 ${
                                    formData.frequencyType === 'fixed' ? 'border-[#045c84] bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'
                                }`}
                            >
                                <p className="font-black text-slate-800">নির্দিষ্ট সময়সাপেক্ষ</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">প্রতিদিন, মাস বা বছর হিসেবে নিয়মিত লেনদেন</p>
                            </button>
                            <button 
                                onClick={() => setFormData({...formData, frequencyType: 'unpredictable'})}
                                className={`p-6 rounded-3xl border-2 transition-all text-left space-y-2 ${
                                    formData.frequencyType === 'unpredictable' ? 'border-[#045c84] bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'
                                }`}
                            >
                                <p className="font-black text-slate-800">অনির্ধারিত সময়</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">যেকোনো সময় যেকোনো পরিমাণে লেনদেন</p>
                            </button>
                        </div>

                        {formData.frequencyType === 'fixed' && (
                            <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 space-y-8 mt-4 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] px-2">সময়কাল নির্বাচন করুন</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {[
                                            { id: 'weekly', label: 'সাপ্তাহিক' },
                                            { id: 'monthly', label: 'মাসিক' },
                                            { id: 'semester', label: 'সামাসিক' },
                                            { id: 'yearly', label: 'বার্ষিক' },
                                            { id: 'one_time_year', label: 'বছরে একবার' },
                                            { id: 'one_time_ever', label: 'এককালীন' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setFormData({...formData, interval: opt.id})}
                                                className={`px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    formData.interval === opt.id ? 'bg-white border-2 border-[#045c84] text-[#045c84] shadow-sm' : 'border-2 border-transparent bg-white text-slate-400 hover:border-slate-200'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-200/50">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">শুরুর তারিখ</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                                type="date" 
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-[#045c84]/10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">শেষের তারিখ (ঐচ্ছিক)</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                                type="date" 
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-[#045c84]/10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 pt-6 border-t border-slate-200/50">
                                {formData.type === 'income' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] px-2 truncate block">বকেয়া সময়সীমা</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative group w-16 shrink-0">
                                                <input 
                                                    type="number" 
                                                    value={formData.dueDays === 0 ? '' : formData.dueDays}
                                                    onChange={(e) => setFormData({...formData, dueDays: (e.target.value === '' ? '' : (parseInt(e.target.value) || 0)) as any})}
                                                    className="w-full px-2 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-[#045c84]/10 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 shrink-0">দিন</span>
                                            <div className="flex-1 flex items-center p-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setFormData({...formData, dueTiming: 'start'}); }}
                                                    className={`flex-1 px-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                                                        formData.dueTiming === 'start' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    শুরুর তারিখ থেকে
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setFormData({...formData, dueTiming: 'end'}); }}
                                                    className={`flex-1 px-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                                                        formData.dueTiming === 'end' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    সাইকেল শেষের পর
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] px-2 truncate block">{formData.type === 'income' ? 'অ্যালার্ট সেটিংস' : 'পেমেন্ট রিমাইন্ডার'}</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative group w-16 shrink-0">
                                                <input 
                                                    type="number" 
                                                    value={formData.alertDays === 0 ? '' : formData.alertDays}
                                                    onChange={(e) => setFormData({...formData, alertDays: (e.target.value === '' ? '' : (parseInt(e.target.value) || 0)) as any})}
                                                    className="w-full px-2 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-[#045c84]/10 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 shrink-0">দিন</span>
                                            <div className="flex-1 flex items-center p-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setFormData({...formData, alertType: 'before'}); }}
                                                    className={`flex-1 px-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                                                        formData.alertType === 'before' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    আগে (BEFORE)
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setFormData({...formData, alertType: 'after'}); }}
                                                    className={`flex-1 px-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                                                        formData.alertType === 'after' ? 'bg-white text-[#045c84] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    পরে (AFTER)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: RECIPIENTS / PROVIDERS */}
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] px-4">
                            {formData.type === 'income' ? 'প্রদানকারী (Provider)' : 'গ্রহণকারী (Recipient)'}
                        </label>
                        <div className="flex flex-wrap gap-3 px-2">
                            {['anyone', 'students', 'teachers', 'custom'].map((p) => (
                                <button 
                                    key={p}
                                    onClick={() => setFormData({...formData, provider: p})}
                                    className={`px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
                                        formData.provider === p ? 'border-[#045c84] bg-[#045c84] text-white shadow-xl shadow-[#045c84]/20 scale-105' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {p === 'anyone' ? 'উন্মুক্ত (Anyone)' : p === 'students' ? 'শিক্ষার্থী' : p === 'teachers' ? 'শিক্ষক' : 'অন্যান্য'}
                                </button>
                            ))}
                        </div>

                        {formData.provider === 'anyone' && (
                            <div className="bg-[#045c84]/5 p-8 rounded-[40px] border border-[#045c84]/10 text-center space-y-4 animate-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 bg-white text-[#045c84] rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-sm border border-[#045c84]/10">
                                    <Users size={28} />
                                </div>
                                <h3 className="text-lg font-black text-[#045c84]">উন্মুক্ত লেনদেন</h3>
                                <p className="text-xs font-bold text-slate-600 max-w-sm mx-auto leading-relaxed">
                                    এই খাতের অধীনে যে কেউ লেনদেন করতে পারবে। ট্রানজেকশনের সময় {formData.type === 'income' ? 'প্রদানকারীর' : 'গ্রহণকারীর'} নাম সরাসরি ভাউচারে এন্ট্রি করা যাবে।
                                </p>
                                <div className="pt-6 max-w-xs mx-auto text-left">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] mb-3 block pl-2">নির্ধারিত পরিমাণ (ঐচ্ছিক)</label>
                                    <input 
                                        type="number" 
                                        placeholder="৳ ০.০০"
                                        className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-lg font-black text-[#045c84] focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none"
                                        value={formData.amount || ''}
                                        onChange={(e) => setFormData({...formData, amount: normalizeBengaliDigits(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                        )}

                        {formData.provider === 'students' && (
                            <div className="space-y-6 bg-slate-50 p-8 rounded-[40px] border border-slate-100 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] px-2">পরিমাণ নির্ধারণ পদ্ধতি</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'flat', label: 'সবার জন্য সমান পরিমাণ', sub: 'প্রতিষ্ঠানের সকল শিক্ষার্থীর জন্য একই পরিমাণ' },
                                            { id: 'per-class', label: 'শ্রেণী অনুযায়ী ভিন্ন পরিমাণ', sub: 'প্রাথমিক, মাধ্যমিক ইত্যাদি অনুযায়ী আলাদা রেট' },
                                            { id: 'per-group', label: 'গ্রুপ অনুযায়ী ভিন্ন পরিমাণ', sub: 'বিজ্ঞান, মানবিক ইত্যাদি গ্রুপ অনুযায়ী আলাদা রেট' },
                                        ].map((opt) => (
                                            <button 
                                                key={opt.id}
                                                onClick={() => setFormData({...formData, studentAmountType: opt.id as any})}
                                                className={`w-full p-6 rounded-3xl border-2 transition-all text-left flex items-center justify-between ${
                                                    formData.studentAmountType === opt.id ? 'border-[#045c84] bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'
                                                }`}
                                            >
                                                <div>
                                                    <p className="font-black text-slate-800">{opt.label}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{opt.sub}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.studentAmountType === 'flat' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 pt-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] px-2">সবার জন্য নির্ধারিত পরিমাণ (৳)</label>
                                        <input 
                                            type="number" 
                                            placeholder="৳ ০.০০"
                                            className="w-full px-8 py-5 bg-white border border-slate-100 rounded-2xl text-xl font-black text-[#045c84] outline-none focus:ring-4 focus:ring-[#045c84]/10 transition-all"
                                            value={formData.amount || ''}
                                            onChange={(e) => setFormData({...formData, amount: normalizeBengaliDigits(e.target.value)})}
                                        />
                                    </div>
                                )}

                                {/* Threshold Days Setting */}
                                <div className="space-y-2 pt-6 border-t border-slate-200/50">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] block">থ্রেশহোল্ড দিন (Admission Threshold)</label>
                                            <p className="text-[9px] font-bold text-slate-400 italic">মাসের কত তারিখের পর ভর্তি হলে হাফ ফি?</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                            <div className="relative group w-20 shrink-0">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    max="31"
                                                    className="w-full pl-8 pr-2 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-[#045c84] outline-none focus:ring-4 focus:ring-[#045c84]/10 transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={formData.thresholdDays === 0 ? '' : formData.thresholdDays}
                                                    onChange={(e) => setFormData({...formData, thresholdDays: (e.target.value === '' ? '' : (Math.floor(normalizeBengaliDigits(e.target.value)) || 0)) as any})}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 shrink-0">তারিখ</span>
                                        </div>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 px-2 pt-1 leading-relaxed italic">
                                        * শিক্ষার্থী যদি এই দিনের (যেমন ১০ তারিখ) পরে ভর্তি হয়, তবে বর্তমান মাসের ফি স্বয়ংক্রিয়ভাবে হাফ (৫০%) হিসেবে গণ্য হবে।
                                    </p>
                                </div>

                                {formData.studentAmountType === 'per-class' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 pt-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar" data-lenis-prevent>
                                        {availableClasses.map((cls: any) => {
                                            const isExpanded = expandedClassId === cls.id;
                                            const students = classStudents[cls.id] || [];
                                            const filteredStudents = studentSearch ? students.filter(s => (s.name || s.user?.name || '').toLowerCase().includes(studentSearch.toLowerCase())) : students;
                                            const deselected = formData.deselectedStudents?.[cls.id] || [];
                                            const customAmounts = formData.customStudentAmounts?.[cls.id] || {};
                                            
                                            // Compute how many are selected in this class manually from total
                                            const totalInClass = cls._count?.students || 0;
                                            const selectedCount = Math.max(0, totalInClass - deselected.length);

                                            return (
                                                <div key={cls.id} className="flex flex-col gap-0 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                                                    <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 relative group" onClick={() => handleExpandClass(cls.id)}>
                                                        <ChevronDown className={`text-slate-400 transition-transform shrink-0 ${isExpanded ? '-rotate-180' : ''}`} size={18} />
                                                        {/* Whole-class select/deselect toggle */}
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                const loadedStudents = classStudents[cls.id] || [];
                                                                if (selectedCount === 0) {
                                                                    // Select all: clear deselected list for this class
                                                                    const newDeselected = { ...formData.deselectedStudents };
                                                                    delete newDeselected[cls.id];
                                                                    setFormData({ ...formData, deselectedStudents: newDeselected });
                                                                } else {
                                                                    // Deselect all: if students loaded, use their IDs; otherwise use a sentinel
                                                                    if (loadedStudents.length > 0) {
                                                                        setFormData({
                                                                            ...formData,
                                                                            deselectedStudents: {
                                                                                ...formData.deselectedStudents,
                                                                                [cls.id]: loadedStudents.map((s: any) => s.id)
                                                                            }
                                                                        });
                                                                    } else {
                                                                        // Not yet loaded — mark as fully deselected via a special sentinel key
                                                                        setFormData({
                                                                            ...formData,
                                                                            deselectedStudents: {
                                                                                ...formData.deselectedStudents,
                                                                                [cls.id]: ['__ALL_DESELECTED__']
                                                                            }
                                                                        });
                                                                    }
                                                                }
                                                            }}
                                                            title={selectedCount === 0 ? 'সব যোগ করুন' : 'সব বাদ দিন'}
                                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                                                                selectedCount === 0 
                                                                ? 'bg-slate-50 border-slate-200 hover:border-slate-400'
                                                                : selectedCount === totalInClass
                                                                    ? 'bg-[#045c84] border-[#045c84] text-white shadow-sm'
                                                                    : 'bg-[#045c84]/20 border-[#045c84]/40 text-[#045c84]'
                                                            }`}
                                                        >
                                                            {selectedCount > 0 && <Check size={12} strokeWidth={3} />}
                                                        </button>
                                                        <span className="text-sm font-black text-slate-700 flex-1">{cls.name} <span className={`text-[10px] px-2 py-0.5 rounded-full ml-2 transition-colors ${selectedCount === 0 && totalInClass > 0 ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>{selectedCount} / {totalInClass} জন</span></span>
                                                        <div onClick={e => e.stopPropagation()}>
                                                            <input 
                                                                type="number" 
                                                                placeholder="৳ ০.০০"
                                                                value={formData.studentClassAmounts?.[cls.id] === 0 ? '' : formData.studentClassAmounts?.[cls.id] || ''}
                                                                onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    studentClassAmounts: { ...formData.studentClassAmounts, [cls.id]: normalizeBengaliDigits(e.target.value) }
                                                                })}
                                                                className="w-32 bg-slate-50 border border-slate-100 focus:border-[#045c84]/30 rounded-2xl p-3 text-sm font-black text-[#045c84] outline-none focus:ring-4 focus:ring-[#045c84]/10 transition-all text-right group-hover:bg-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative flex-1">
                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="শিক্ষার্থীর নাম খুঁজুন..." 
                                                                        value={studentSearch}
                                                                        onChange={e => setStudentSearch(e.target.value)}
                                                                        className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#045c84]/30 focus:ring-2 focus:ring-[#045c84]/10 shadow-sm"
                                                                    />
                                                                </div>
                                                                {/* Select All / Deselect All inside expanded panel */}
                                                                {students.length > 0 && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const allSelected = deselected.length === 0;
                                                                            if (allSelected) {
                                                                                // Deselect all
                                                                                setFormData({
                                                                                    ...formData,
                                                                                    deselectedStudents: {
                                                                                        ...formData.deselectedStudents,
                                                                                        [cls.id]: students.map((s: any) => s.id)
                                                                                    }
                                                                                });
                                                                            } else {
                                                                                // Select all: clear deselected
                                                                                const updated = { ...formData.deselectedStudents };
                                                                                delete updated[cls.id];
                                                                                setFormData({ ...formData, deselectedStudents: updated });
                                                                            }
                                                                        }}
                                                                        className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap px-3 py-2 rounded-xl border transition-all ${
                                                                            deselected.length === 0
                                                                                ? 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100'
                                                                                : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                                                                        }`}
                                                                    >
                                                                        {deselected.length === 0 ? 'সব বাদ' : 'সব যোগ'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            
                                                            {loadingStudents[cls.id] ? (
                                                                <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
                                                                    <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                                                                    <span className="text-xs font-bold">শিক্ষার্থী তালিকা লোড হচ্ছে...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1" data-lenis-prevent>
                                                                    {filteredStudents.length === 0 ? (
                                                                        <div className="py-6 bg-white rounded-2xl border border-slate-100 text-center text-xs font-bold text-slate-400 shadow-sm">কোনো শিক্ষার্থী পাওয়া যায়নি</div>
                                                                    ) : filteredStudents.map(student => {
                                                                        const isSelected = !deselected.includes(student.id);
                                                                        const stuName = student.name || student.user?.name || 'অজানা শিক্ষার্থী';
                                                                        return (
                                                                            <div key={student.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 transition-all shadow-sm">
                                                                                <button 
                                                                                    onClick={() => {
                                                                                        const newDeselected = isSelected 
                                                                                            ? [...deselected, student.id] 
                                                                                            : deselected.filter((id: string) => id !== student.id);
                                                                                        setFormData({
                                                                                            ...formData,
                                                                                            deselectedStudents: {
                                                                                                ...formData.deselectedStudents,
                                                                                                [cls.id]: newDeselected
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-[#045c84] border-[#045c84] text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-transparent hover:border-slate-300'}`}
                                                                                >
                                                                                    <Check size={14} strokeWidth={3} />
                                                                                </button>
                                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-colors ${isSelected ? 'bg-[#045c84]/10 text-[#045c84]' : 'bg-slate-100 text-slate-400'}`}>
                                                                                    {stuName.charAt(0)}
                                                                                </div>
                                                                                <span className={`text-[11px] font-black flex-1 truncate transition-colors ${isSelected ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{stuName}</span>
                                                                                
                                                                                {/* Fee Tier badge from admission */}
                                                                                {(() => {
                                                                                    const tier = student.metadata?.feeTier;
                                                                                    if (!tier || tier === 'full') return null;
                                                                                    return (
                                                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                                                                                            tier === 'half' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                                                        }`}>
                                                                                            {tier === 'half' ? '50%' : 'বিনামূল্যে'}
                                                                                        </span>
                                                                                    );
                                                                                })()}

                                                                                {isSelected && (
                                                                                    <div className="flex flex-col items-end gap-1">
                                                                                        {(() => {
                                                                                            const baseClassAmt = formData.studentClassAmounts?.[cls.id] || 0;
                                                                                            const tierMultiplier = student.metadata?.feeTier === 'half' ? 0.5 : student.metadata?.feeTier === 'free' ? 0 : 1;
                                                                                            const effectiveBaseAmt = baseClassAmt * tierMultiplier;
                                                                                            
                                                                                            return (
                                                                                                <input 
                                                                                                    type="number"
                                                                                                    placeholder={baseClassAmt > 0 ? `৳ ${effectiveBaseAmt}` : 'নিজস্ব পরিমাণ'}
                                                                                                    value={customAmounts[student.id] === undefined ? '' : customAmounts[student.id]}
                                                                                                    onChange={e => {
                                                                                                        const val = e.target.value;
                                                                                                        const newAmts = { ...customAmounts };
                                                                                                        const newWaivers = { ...(formData.studentWaivers?.[cls.id] || {}) };
                                                                                                        if (val === '') {
                                                                                                            delete newAmts[student.id];
                                                                                                            delete newWaivers[student.id];
                                                                                                        } else {
                                                                                                            const customVal = normalizeBengaliDigits(val);
                                                                                                            newAmts[student.id] = customVal;
                                                                                                            // Compute waiver only if custom < effective base
                                                                                                            if (effectiveBaseAmt > 0 && customVal < effectiveBaseAmt) {
                                                                                                                newWaivers[student.id] = effectiveBaseAmt - customVal;
                                                                                                            } else {
                                                                                                                delete newWaivers[student.id];
                                                                                                            }
                                                                                                        }
                                                                                                        setFormData({
                                                                                                            ...formData,
                                                                                                            customStudentAmounts: {
                                                                                                                ...formData.customStudentAmounts,
                                                                                                                [cls.id]: newAmts
                                                                                                            },
                                                                                                            studentWaivers: {
                                                                                                                ...formData.studentWaivers,
                                                                                                                [cls.id]: newWaivers
                                                                                                            }
                                                                                                        });
                                                                                                    }}
                                                                                                    className="w-24 bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-black text-[#045c84] outline-none text-right focus:bg-white focus:border-[#045c84]/30 focus:ring-4 focus:ring-[#045c84]/10 placeholder:text-slate-300 transition-all"
                                                                                                />
                                                                                            );
                                                                                        })()}
                                                                                        {/* Waiver badge */}  
                                                                                        {formData.studentWaivers?.[cls.id]?.[student.id] > 0 && (
                                                                                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                                                ডিসকাউন্ট ৳{formData.studentWaivers[cls.id][student.id].toLocaleString('bn-BD')}
                                                                                            </span>
                                                                                        )}
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
                                            );
                                        })}
                                    </div>
                                )}

                                {formData.studentAmountType === 'per-group' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200 pt-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar" data-lenis-prevent>
                                        {availableClasses.map((cls: any) => (
                                            <div key={cls.id} className="bg-white border border-slate-200 shadow-sm rounded-[32px] p-6 space-y-4">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                    <span className="text-sm font-black text-slate-800">{cls.name}</span>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Base ৳"
                                                        value={formData.studentClassAmounts?.[cls.id] || ''}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            studentClassAmounts: { ...formData.studentClassAmounts, [cls.id]: normalizeBengaliDigits(e.target.value) }
                                                        })}
                                                        className="w-24 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-black text-[#045c84] outline-none focus:ring-4 focus:ring-[#045c84]/10 transition-all"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {(classGroups[cls.id] || []).map((grp: any) => (
                                                        <div key={grp.id} className="bg-slate-50 p-3.5 rounded-2xl flex items-center gap-2 border border-slate-100">
                                                            <span className="text-[10px] font-black text-slate-500 flex-1">{grp.name}</span>
                                                            <input 
                                                                type="number" 
                                                                placeholder="৳"
                                                                value={formData.studentGroupAmounts?.[`${cls.id}-${grp.id}`] || ''}
                                                                onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    studentGroupAmounts: { ...formData.studentGroupAmounts, [`${cls.id}-${grp.id}`]: normalizeBengaliDigits(e.target.value) }
                                                                })}
                                                                className="w-20 bg-white border border-slate-200 rounded-xl p-2 text-xs font-black text-[#045c84] outline-none focus:border-[#045c84]/40"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {formData.provider === 'teachers' && (
                            <div className="space-y-6 bg-slate-50 p-8 rounded-[40px] border border-slate-100 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84] px-2">বেস অ্যামাউন্ট (৳)</label>
                                    <input 
                                        type="number" 
                                        placeholder="৳ ০.০০"
                                        className="w-full px-8 py-5 bg-white border border-slate-100 rounded-2xl text-xl font-black text-[#045c84] outline-none focus:ring-4 focus:ring-[#045c84]/10 transition-all"
                                        value={formData.amount || ''}
                                        onChange={(e) => setFormData({...formData, amount: normalizeBengaliDigits(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar" data-lenis-prevent>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 block mb-4">শিক্ষক অনুযায়ী আলাদা অ্যামাউন্ট (ঐচ্ছিক)</label>
                                    {availableTeachers.map((teacher: any) => (
                                        <div key={teacher.id} className="flex items-center gap-3 bg-white p-4 rounded-3xl border border-slate-100 transition-all hover:border-[#045c84]/30">
                                            <div className="w-12 h-12 rounded-2xl bg-[#045c84]/5 flex items-center justify-center text-[#045c84] font-black text-sm">
                                                {(teacher.name || teacher.user?.name || 'T').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-black text-slate-700 flex-1">{teacher.name || teacher.user?.name || 'অজানা শিক্ষক'}</span>
                                            <input 
                                                type="number" 
                                                placeholder="৳ বেস"
                                                value={formData.teacherAmounts?.[teacher.id] || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    teacherAmounts: { ...formData.teacherAmounts, [teacher.id]: normalizeBengaliDigits(e.target.value) }
                                                })}
                                                className="w-28 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-black text-[#045c84] outline-none focus:ring-4 focus:ring-[#045c84]/10"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.provider === 'custom' && (
                            <div className="space-y-6 bg-slate-50 p-8 rounded-[40px] border border-slate-100 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2 pb-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#045c84]">প্রাপক তালিকা</label>
                                        <button 
                                            onClick={() => setFormData({
                                                ...formData,
                                                customRecipients: [...formData.customRecipients, { id: Date.now().toString(), name: '', amount: undefined }]
                                            })}
                                            className="px-5 py-2.5 bg-white text-[#045c84] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all border border-slate-200 active:scale-95 flex items-center gap-1"
                                        >
                                            <Plus size={14} /> নতুন যুক্ত করুন
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.customRecipients.map((rec: any, idx: number) => (
                                            <div key={rec.id} className="flex items-center gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                                <input 
                                                    type="text" 
                                                    placeholder="প্রাপকের নাম"
                                                    value={rec.name}
                                                    onChange={(e) => {
                                                        const newRecs = [...formData.customRecipients];
                                                        newRecs[idx].name = e.target.value;
                                                        setFormData({...formData, customRecipients: newRecs});
                                                    }}
                                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:border-[#045c84]/30 focus:ring-4 focus:ring-[#045c84]/10"
                                                />
                                                <input 
                                                    type="number" 
                                                    placeholder="৳ পরিমাণ"
                                                    value={rec.amount === undefined ? '' : rec.amount}
                                                    onChange={(e) => {
                                                        const newRecs = [...formData.customRecipients];
                                                        newRecs[idx].amount = normalizeBengaliDigits(e.target.value);
                                                        setFormData({...formData, customRecipients: newRecs});
                                                    }}
                                                    className="w-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-black text-[#045c84] outline-none focus:border-[#045c84]/30 focus:ring-4 focus:ring-[#045c84]/10"
                                                />
                                                {formData.customRecipients.length > 1 && (
                                                    <button 
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            customRecipients: formData.customRecipients.filter((_: any, i: number) => i !== idx)
                                                        })}
                                                        className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95 shrink-0"
                                                    >
                                                        <Plus className="rotate-45" size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* EXCLUSION SETTING */}
                    <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4 mt-8 animate-in fade-in zoom-in-95 duration-300">
                        <div className="mt-1">
                            <input 
                                type="checkbox" 
                                id="excludeSummary"
                                className="w-5 h-5 text-amber-500 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                                checked={formData.isExcludedFromSummary}
                                onChange={(e) => setFormData({...formData, isExcludedFromSummary: e.target.checked})}
                            />
                        </div>
                        <div>
                            <label htmlFor="excludeSummary" className="text-sm font-black text-slate-800 cursor-pointer block mb-1">
                                মূল হিসাব থেকে বাদ দিন (ব্যক্তিগত হিসাব)
                            </label>
                            <p className="text-xs font-bold text-slate-500 leading-relaxed">
                                এই খাতের লেনদেনগুলো শুধুমাত্র এই খাতেই দেখা যাবে। প্রতিষ্ঠানের মূল আয়-ব্যয়ের সামারি বা ব্যালেন্সে এই টাকা যোগ হবে না। শিক্ষক বা একাউন্ট্যান্টের নিজস্ব লেনদেনের জন্য ব্যবহার করুন।
                            </p>
                        </div>
                    </div>

                    {/* SUMMARY CARD (Bottom of scrollable area) */}
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col gap-5 mt-12 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#045c84] shadow-sm border border-slate-100 shrink-0">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formData.type === 'income' ? 'মোট সম্ভাব্য প্রদানকারী' : 'মোট সম্ভাব্য গ্রহণকারী'}</p>
                                    <p className="text-sm font-black text-slate-800">{formData.provider === 'anyone' ? 'উন্মুক্ত (0)' : `${totalRecipients.toLocaleString('bn-BD')} জন`}</p>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto flex flex-col items-end text-right">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        মোট সম্ভাব্য {formData.frequencyType === 'fixed' && targetCycles > 1 ? `${targetCycles} টি মেয়াদ` : 'লেনদেন'}
                                    </p>
                                    <p className="text-2xl font-black text-emerald-600">
                                        ৳ {formData.frequencyType === 'unpredictable' && totalDue === 0 && formData.provider !== 'anyone' ? 'ভ্যারিয়েবল' : totalDue.toLocaleString('bn-BD')}
                                    </p>
                                    {/* Show total waiver if any waivers are applied */}
                                    {(() => {
                                        const totalWaiver = Object.values(formData.studentWaivers || {}).reduce((sum: number, classWaivers: any) => {
                                            return sum + Object.values(classWaivers || {}).reduce((cSum: number, w: any) => cSum + (typeof w === 'number' ? w : 0), 0);
                                        }, 0);
                                        return totalWaiver > 0 ? (
                                            <p className="text-[10px] font-black text-amber-600 mt-1">
                                                মোট ডিসকাউন্ট: ৳{(totalWaiver * targetCycles).toLocaleString('bn-BD')}
                                            </p>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                        </div>
                        
                        {formData.frequencyType === 'fixed' && (
                            <div className="w-full flex flex-col gap-2 bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm mt-1 transition-all hover:shadow-md">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <span className="text-[10px] font-black text-[#045c84] uppercase tracking-widest whitespace-nowrap">
                                        টার্গেট এস্টিমেটর (সাইকেল): {targetCycles}x
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 italic">
                                        (এটি শুধুমাত্র হিসাব দেখার জন্য, সেটিংসে সেভ হবে না)
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="12" 
                                    value={targetCycles}
                                    onChange={(e) => setTargetCycles(parseInt(e.target.value) || 1)}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#045c84] mt-1"
                                />
                            </div>
                        )}
                    </div>

                </div>

                {/* MODAL BOTTOM ACTIONS */}
                <div className="px-10 py-6 border-t border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-8 py-4 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        বাতিল করুন
                    </button>
                    <button 
                        onClick={() => {
                            if (initialData?.id) {
                                setShowUpdatePrompt(true);
                            } else {
                                const selectedClasses = formData.studentAmountType === 'flat' 
                                    ? availableClasses.map(c => c.id) 
                                    : availableClasses.map(c => c.id).filter(id => {
                                          if (formData.studentClassAmounts?.[id]) return true;
                                          const customAmts = formData.customStudentAmounts?.[id] || {};
                                          if (Object.keys(customAmts).length > 0) return true;
                                          const groups = classGroups[id] || [];
                                          if (groups.some((g: any) => formData.studentGroupAmounts?.[`${id}-${g.id}`])) return true;
                                          return false;
                                      });

                                onSave({ 
                                    ...formData, 
                                    id: Date.now().toString(),
                                    selectedClasses,
                                    totalRecipients: formData.provider === 'anyone' ? 'উন্মুক্ত' : totalRecipients.toLocaleString('bn-BD'),
                                    totalDue: (formData.frequencyType === 'unpredictable' && totalDue === 0) ? 'ভ্যারিয়েবল' : totalDue.toLocaleString('bn-BD'),
                                    amount: formData.frequencyType === 'unpredictable' ? 'variable' : formData.amount.toString()
                                });
                            }
                        }}
                        className="px-12 py-4 bg-[#045c84] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#045c84]/20 hover:shadow-[#045c84]/40 transition-all active:scale-95"
                    >
                        খাত সংরক্ষণ করুন
                    </button>
                </div>
            </div>

            {/* UPDATE PROMPT OVERLAY */}
            {showUpdatePrompt && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowUpdatePrompt(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-slate-800 mb-2">পরিবর্তন প্রয়োগ পদ্ধতি</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
                            আপনি খাতের সেটিংসে কিছু পরিবর্তন করেছেন (যেমন টাকার পরিমাণ)। এই পরিবর্তনগুলো পূর্বের বকেয়া লেনদেনে কীভাবে প্রয়োগ করবেন?
                        </p>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => {
                                    const selectedClasses = formData.studentAmountType === 'flat' 
                                        ? availableClasses.map(c => c.id) 
                                        : availableClasses.map(c => c.id).filter(id => {
                                              if (formData.studentClassAmounts?.[id]) return true;
                                              const customAmts = formData.customStudentAmounts?.[id] || {};
                                              if (Object.keys(customAmts).length > 0) return true;
                                              const groups = classGroups[id] || [];
                                              if (groups.some((g: any) => formData.studentGroupAmounts?.[`${id}-${g.id}`])) return true;
                                              return false;
                                          });

                                    onSave({ 
                                        ...formData, 
                                        id: initialData?.id,
                                        selectedClasses,
                                        applyFrom: 'today',
                                        totalRecipients: formData.provider === 'anyone' ? 'উন্মুক্ত' : totalRecipients.toLocaleString('bn-BD'),
                                        totalDue: (formData.frequencyType === 'unpredictable' && totalDue === 0) ? 'ভ্যারিয়েবল' : totalDue.toLocaleString('bn-BD'),
                                        amount: formData.frequencyType === 'unpredictable' ? 'variable' : formData.amount.toString()
                                    });
                                    setShowUpdatePrompt(false);
                                }}
                                className="w-full text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-[#045c84] hover:bg-blue-50/50 transition-all group"
                            >
                                <p className="font-black text-slate-800 group-hover:text-[#045c84]">আজ থেকে প্রয়োগ করুন</p>
                                <p className="text-xs font-bold text-slate-500 mt-1">পুরোনো বকেয়া লেনদেনগুলোতে পুরোনো ফি-ই বহাল থাকবে। শুধুমাত্র আজকের পর থেকে তৈরি হওয়া বকেয়াগুলোতে নতুন ফি প্রযোজ্য হবে।</p>
                            </button>
                            
                            <button 
                                onClick={() => {
                                    const selectedClasses = formData.studentAmountType === 'flat' 
                                        ? availableClasses.map(c => c.id) 
                                        : availableClasses.map(c => c.id).filter(id => {
                                              if (formData.studentClassAmounts?.[id]) return true;
                                              const customAmts = formData.customStudentAmounts?.[id] || {};
                                              if (Object.keys(customAmts).length > 0) return true;
                                              const groups = classGroups[id] || [];
                                              if (groups.some((g: any) => formData.studentGroupAmounts?.[`${id}-${g.id}`])) return true;
                                              return false;
                                          });

                                    onSave({ 
                                        ...formData, 
                                        id: initialData?.id,
                                        selectedClasses,
                                        applyFrom: 'start',
                                        totalRecipients: formData.provider === 'anyone' ? 'উন্মুক্ত' : totalRecipients.toLocaleString('bn-BD'),
                                        totalDue: (formData.frequencyType === 'unpredictable' && totalDue === 0) ? 'ভ্যারিয়েবল' : totalDue.toLocaleString('bn-BD'),
                                        amount: formData.frequencyType === 'unpredictable' ? 'variable' : formData.amount.toString()
                                    });
                                    setShowUpdatePrompt(false);
                                }}
                                className="w-full text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-rose-500 hover:bg-rose-50/50 transition-all group"
                            >
                                <p className="font-black text-slate-800 group-hover:text-rose-600">শুরু থেকে (সব) প্রয়োগ করুন</p>
                                <p className="text-xs font-bold text-slate-500 mt-1">আগের তৈরি হওয়া সমস্ত অপরিশোধিত (Pending) বকেয়া লেনদেন ডিলিট হয়ে নতুন ফি অনুযায়ী স্বয়ংক্রিয়ভাবে পুনরায় তৈরি হবে।</p>
                            </button>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={() => setShowUpdatePrompt(false)}
                                className="px-6 py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                বাতিল করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
