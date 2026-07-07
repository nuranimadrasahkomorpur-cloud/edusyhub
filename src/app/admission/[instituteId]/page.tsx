'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Save, CloudUpload, CheckCircle2, Building2, Printer, LogIn, Search, Info } from 'lucide-react';
import { FieldDefinition, POSSIBLE_FIELDS } from '@/components/FieldLibrary';
import Toast from '@/components/Toast';
import PrintLayout from '@/components/PrintLayout';

export default function PublicAdmissionPage() {
    const params = useParams();
    const instituteId = params.instituteId as string;

    const [loading, setLoading] = useState(true);
    const [institute, setInstitute] = useState<any>(null);
    const [formConfig, setFormConfig] = useState<FieldDefinition[]>([]);
    const [credentials, setCredentials] = useState<{ studentId: string; password: string } | null>(null);
    const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'recovered' | null>(null);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [formNumber, setFormNumber] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');

    const [formData, setFormData] = useState<any>({
        name: '',
        phone: '',
        studentPhone: '',
        email: '',
        studentEmail: '',
        guardianName: '',
        guardianPhone: '',
        guardianPassword: '',
        metadata: {}
    });
    const [actionLoading, setActionLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printMode, setPrintMode] = useState<'receipt' | 'form'>('receipt');

    const draftKey = `edusy_admission_draft_${instituteId}`;

    useEffect(() => {
        const fetchData = async () => {
            if (!instituteId) return;
            try {
                // Fetch Institute Summary (Public API)
                const summaryRes = await fetch(`/api/public/institute/${instituteId}/summary`);
                if (summaryRes.ok) {
                    const summaryData = await summaryRes.json();
                    setInstitute(summaryData);
                }

                // Fetch Form Config
                const configRes = await fetch(`/api/admin/institutes/form-config?instituteId=${instituteId}`);
                if (configRes.ok) {
                    const configData = await configRes.json();
                    setFormConfig(Array.isArray(configData) ? configData : []);
                }

                // Fetch Classes for dropdowns
                const classesRes = await fetch(`/api/admin/classes?instituteId=${instituteId}`);
                if (classesRes.ok) {
                    const classesData = await classesRes.json();
                    setClasses(Array.isArray(classesData) ? classesData : []);
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Load Draft from LocalStorage
        let hasLocalDraft = false;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                setFormData(parsed);
                if (parsed.draftId) setDraftId(parsed.draftId);
                if (parsed.formNumber) setFormNumber(parsed.formNumber);
                hasLocalDraft = true;
                setDraftStatus('recovered');
                setTimeout(() => setDraftStatus(null), 3000);
            } catch (e) {
                console.error("Draft recovery error", e);
            }
        }

        // Initialize a new Draft in the backend if none exists locally
        if (!hasLocalDraft && instituteId) {
            const initDraft = async () => {
                try {
                    const res = await fetch('/api/public/admission/draft', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ instituteId })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setDraftId(data.draftId);
                        setFormNumber(data.formNumber);
                        setFormData((prev: any) => ({
                            ...prev,
                            draftId: data.draftId,
                            formNumber: data.formNumber
                        }));
                    }
                } catch (err) {
                    console.error("Failed to initialize draft", err);
                }
            };
            initDraft();
        }
    }, [instituteId]);

    // Auto-save logic
    useEffect(() => {
        if (!instituteId || submitted) return;

        const timer = setTimeout(() => {
            setDraftStatus('saving');
            localStorage.setItem(draftKey, JSON.stringify(formData));
            setTimeout(() => setDraftStatus('saved'), 500);
            setTimeout(() => setDraftStatus(null), 2500);
        }, 1000);

        return () => clearTimeout(timer);
    }, [formData, instituteId, submitted]);

    // Auto-fill logic from Tab 1 to Tab 2
    useEffect(() => {
        if (activeTab === 'account') {
            const updates: any = {};

            // Auto-fill Name and Phone if Tab 2 is empty
            if (!formData.name && formData.metadata.name) updates.name = formData.metadata.name;
            if (!formData.phone && formData.metadata.studentPhone) updates.phone = formData.metadata.studentPhone;
            if (!formData.email && formData.metadata.studentEmail) updates.email = formData.metadata.studentEmail;

            // Auto-fill Guardian info
            if (!formData.guardianName) {
                updates.guardianName = formData.metadata.guardianName || formData.metadata.fathersName || formData.metadata.mothersName || '';
            }
            if (!formData.guardianPhone) {
                updates.guardianPhone = formData.metadata.guardianPhone || formData.metadata.fathersPhone || formData.metadata.mothersPhone || '';
            }

            if (Object.keys(updates).length > 0) {
                setFormData((prev: any) => ({ ...prev, ...updates }));
            }
        }
    }, [activeTab]);

    const fetchGroups = async (classId: string) => {
        try {
            const res = await fetch(`/api/admin/groups?classId=${classId}`);
            const data = await res.json();
            setGroups(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch groups error:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        // Create local preview
        const localUrl = URL.createObjectURL(file);
        setFormData((prev: any) => ({
            ...prev,
            metadata: { ...prev.metadata, [fieldId]: localUrl }
        }));

        setActionLoading(true);
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData
            });
            const data = await res.json();
            if (res.ok && data.url) {
                // Update with permanent URL
                setFormData((prev: any) => ({
                    ...prev,
                    metadata: { ...prev.metadata, [fieldId]: data.url }
                }));
            } else {
                // Clear local preview if upload failed
                setFormData((prev: any) => ({
                    ...prev,
                    metadata: { ...prev.metadata, [fieldId]: '' }
                }));
                setToast({ message: data.message || 'আপলোড ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            console.error('Upload failed', error);
            // Clear local preview on error
            setFormData((prev: any) => ({
                ...prev,
                metadata: { ...prev.metadata, [fieldId]: '' }
            }));
            setToast({ message: 'ফাইল আপলোড ব্যর্থ হয়েছে।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleAutoGenerate = async (fieldId: string, providedClassId?: string, force = false) => {
        if (!instituteId) return;

        // Suggest if empty or forced
        const currentValue = formData.metadata?.[fieldId];
        if (currentValue && !force) return;

        try {
            const classId = providedClassId || formData.metadata?.classId || '';
            const res = await fetch(`/api/admin/students/next-ids?instituteId=${instituteId}&classId=${classId}`);
            const data = await res.json();

            if (fieldId === 'studentId') {
                setFormData((prev: any) => ({
                    ...prev,
                    metadata: { ...prev.metadata, studentId: data.nextStudentId }
                }));
            } else if (fieldId === 'rollNumber') {
                if (!classId) return;
                setFormData((prev: any) => ({
                    ...prev,
                    metadata: { ...prev.metadata, rollNumber: data.nextRollNumber }
                }));
            }
        } catch (error) {
            console.error('Auto generate failed', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            const res = await fetch('/api/public/admission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    instituteId,
                    draftId
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSubmitted(true);
                setCredentials(data.credentials);
                localStorage.removeItem(draftKey);
            } else {
                setToast({ message: data.message || 'আবেদন ব্যর্থ হয়েছে।', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'সার্ভার এরর।', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handlePrint = (mode: 'receipt' | 'form' = 'receipt') => {
        setPrintMode(mode);
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
    };

    const handleReapply = () => {
        setSubmitted(false);
        setFormData({
            name: '',
            phone: '',
            email: '',
            metadata: {}
        });
        localStorage.removeItem(draftKey);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderField = (fieldId: string) => {
        let field = formConfig.find(f => f.id === fieldId) || POSSIBLE_FIELDS.find(f => f.id === fieldId);
        if (!field) return null;

        const isTopLevel = ['name', 'email', 'phone'].includes(field.id);
        const fieldValue = isTopLevel ? (formData as any)[field.id] : formData.metadata[field.id];

        const isEmailField = field.id === 'email';
        const isStudentPhoneField = field.id === 'phone';
        const isGuardianPhoneField = field.id === 'guardianPhone';
        const isLoginField = isEmailField || isStudentPhoneField || isGuardianPhoneField;

        const hasGuardian = !!formData.guardianPhone;
        const hasEmail = !!formData.email;
        const hasStudentPhone = !!formData.phone;

        const isOptionalLogin =
            (isEmailField && (hasGuardian || hasStudentPhone)) ||
            (isStudentPhoneField && (hasGuardian || hasEmail));

        return (
            <div key={field.id} className="space-y-2 group/field">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>{field.label} {(field.required && !isOptionalLogin) && <span className="text-red-500">*</span>}</span>
                    {isOptionalLogin && (
                        <span className="text-[10px] font-medium text-slate-400 font-sans ml-auto bg-slate-100 px-1.5 py-0.5 rounded uppercase">ঐচ্ছিক</span>
                    )}
                </label>

                {field.type === 'select' ? (
                    <div className="relative">
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black appearance-none"
                            value={fieldValue || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (isTopLevel) setFormData({ ...formData, [field!.id]: val });
                                else setFormData({ ...formData, metadata: { ...formData.metadata, [field!.id]: val } });
                            }}
                            required={(field.required && !isOptionalLogin)}
                        >
                            <option value="">নির্বাচন করুন</option>
                            {field.options?.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                ) : field.type === 'attachment' ? (
                    <div className="relative group/attachment">
                        <div className={`relative w-[120px] h-[180px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[20px] overflow-hidden transition-all duration-500 ${fieldValue ? 'border-none ring-2 ring-[#045c84]/10 shadow-lg' : 'hover:border-[#045c84] hover:bg-slate-100/50'}`}>
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                onChange={(e) => handleFileUpload(e, field!.id)}
                                required={(field.required && !fieldValue && !isOptionalLogin)}
                            />

                            {fieldValue ? (
                                <div className="absolute inset-0 w-full h-full">
                                    <img
                                        src={fieldValue}
                                        alt="Preview"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/attachment:scale-110"
                                        onError={(e) => {
                                            (e.target as any).style.display = 'none';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/attachment:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[1px]">
                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-2">
                                            <CloudUpload size={20} />
                                        </div>
                                        <span className="text-white text-[10px] font-black uppercase tracking-widest text-center px-4">ছবি পরিবর্তন করুন</span>
                                    </div>
                                    <div className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-green-600">
                                        <CheckCircle2 size={16} />
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-slate-50/50">
                                    <div className="w-12 h-12 rounded-[16px] bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover/attachment:text-[#045c84] group-hover/attachment:scale-110 transition-all duration-500">
                                        <CloudUpload size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-700 leading-tight">{field.label}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic font-black">Photo Box</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : field.type === 'class-lookup' ? (
                    <div className="relative">
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black appearance-none"
                            value={fieldValue || ''}
                            onChange={(e) => {
                                const classId = e.target.value;
                                setFormData({
                                    ...formData,
                                    metadata: { ...formData.metadata, [field!.id]: classId, groupId: '' }
                                });
                                if (classId) {
                                    fetchGroups(classId);
                                    handleAutoGenerate('rollNumber', classId, true);
                                } else setGroups([]);
                            }}
                            required={field.required}
                        >
                            <option value="">শ্রেণী নির্বাচন করুন</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                ) : field.type === 'group-lookup' ? (
                    <div className="relative">
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black appearance-none"
                            value={fieldValue || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                metadata: { ...formData.metadata, [field!.id]: e.target.value }
                            })}
                            required={field.required}
                            disabled={!formData.metadata.classId}
                        >
                            <option value="">গ্রুপ নির্বাচন করুন</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        {!formData.metadata.classId && (
                            <p className="text-[10px] text-amber-600 font-bold mt-1">প্রথমে শ্রেণী নির্বাচন করুন</p>
                        )}
                    </div>
                ) : (
                    <div className="relative group/field">
                        <input
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black placeholder:text-slate-300 placeholder:font-normal"
                            placeholder={field.placeholder || `${field.label}`}
                            value={fieldValue || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (isTopLevel) setFormData({ ...formData, [field!.id]: val });
                                else setFormData({ ...formData, metadata: { ...formData.metadata, [field!.id]: val } });
                            }}
                            required={field.required}
                        />
                        {(field.id === 'rollNumber' || field.id === 'studentId') && (
                            <button
                                type="button"
                                onClick={() => handleAutoGenerate(field!.id, undefined, true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white border border-slate-200 text-[#045c84] text-[10px] font-bold rounded-xl shadow-sm hover:bg-[#045c84] hover:text-white transition-all md:opacity-0 md:group-hover/field:opacity-100 opacity-60"
                            >
                                AUTO
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bengali">
                <Loader2 className="animate-spin text-[#045c84]" size={40} />
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-bengali">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <CheckCircle2 size={40} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 mb-2">আবেদন সফল হয়েছে!</h1>
                        <p className="text-slate-500">আপনার ভর্তি আবেদনটি সফলভাবে জমা দেওয়া হয়েছে এবং বর্তমানে <b>পেন্ডিং (Pending)</b> অবস্থায় আছে। প্রতিষ্ঠান কর্তৃপক্ষ শীঘ্রই আপনার সাথে যোগাযোগ করবে।</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-left space-y-2">
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">লগইন তথ্য (যেকোন সময় চেক করার জন্য)</p>
                        <p className="text-sm text-slate-700 font-bold">আইডি: <span className="bg-white px-2 py-0.5 rounded border border-blue-200">{credentials?.studentId || formData.phone}</span></p>
                        <p className="text-sm text-slate-700 font-bold">পাসওয়ার্ড: <span className="bg-white px-2 py-0.5 rounded border border-blue-200">{credentials?.password || formData.phone}</span></p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-4">
                        <Link
                            href="/admission/status"
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#045c84] to-[#047cac] text-white font-black rounded-2xl shadow-lg shadow-blue-100 hover:shadow-xl transition-all active:scale-95"
                        >
                            <Search size={20} />
                            <span>ভর্তি স্ট্যাটাস চেক করুন</span>
                        </Link>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handlePrint('receipt')}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-[#045c84] font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 text-xs"
                            >
                                <Printer size={16} />
                                <span>রশিদ প্রিন্ট</span>
                            </button>
                            <button
                                onClick={() => handlePrint('form')}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-[#045c84] font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 text-xs"
                            >
                                <Printer size={16} />
                                <span>ফর্ম প্রিন্ট</span>
                            </button>
                        </div>
                        <button
                            onClick={handleReapply}
                            className="w-full px-6 py-2 bg-transparent text-slate-400 font-bold rounded-2xl hover:text-slate-600 transition-all active:scale-95 text-xs"
                        >
                            পূনরায় আবেদন করুন
                        </button>
                    </div>
                </div>

                {isPrinting && (
                    <div className="hidden">
                        <PrintLayout title={printMode === 'receipt' ? "ভর্তি আবেদন রশিদ (Admission Receipt)" : "ভর্তি আবেদন ফর্ম (Admission Application)"} institute={institute}>
                            {printMode === 'receipt' ? (
                                <div className="space-y-10">
                                    <div className="p-8 border-2 border-slate-100 rounded-3xl space-y-8 bg-slate-50/30">
                                        <div className="grid grid-cols-2 gap-12">
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">নাম (Name)</p>
                                                    <p className="text-2xl font-black text-slate-900">{formData.name}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">মোবাইল (Mobile)</p>
                                                    <p className="text-xl font-bold text-slate-700">{formData.phone}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">আবেদন আইডি (App ID)</p>
                                                    <p className="text-xl font-bold text-slate-700">ADM-{Date.now().toString().slice(-6)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">লগইন পাসওয়ার্ড</p>
                                                    <p className="text-xl font-bold text-[#045c84]">{credentials?.password || formData.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="flex justify-between border-b border-slate-100 py-2">
                                            <span className="text-slate-500 font-bold">শ্রেণী:</span>
                                            <span className="text-slate-900 font-black">{classes.find(c => c.id === formData.metadata.classId)?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-100 py-2">
                                            <span className="text-slate-500 font-bold">গ্রুপ:</span>
                                            <span className="text-slate-900 font-black">{groups.find(g => g.id === formData.metadata.groupId)?.name || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">নাম (Full Name)</p>
                                                <p className="text-lg font-black text-slate-900">{formData.name}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">মোবাইল (Mobile)</p>
                                                <p className="text-lg font-bold text-slate-800">{formData.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="w-32 h-40 border-2 border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden">
                                                {formData.metadata.studentPhoto && <img src={formData.metadata.studentPhoto} alt="Student" className="w-full h-full object-cover" />}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-10">
                                        {formConfig
                                            .filter(f => !['name', 'email', 'password', 'studentPhoto'].includes(f.id))
                                            .map(field => (
                                                <div key={field.id} className="border-b border-slate-100 pb-1 flex justify-between gap-4">
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase">{field.label}:</span>
                                                    <span className="text-[11px] font-black text-slate-900 text-right">{formData.metadata[field.id] || '-'}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </PrintLayout>
                    </div>
                )}
            </div>
        );
    }

    const LOGIN_FIELD_IDS = ['studentId', 'rollNumber', 'email', 'phone', 'studentPhone', 'guardianPhone', 'guardianPassword', 'password', 'classId', 'groupId'];
    const effectiveFields = formConfig.filter((f: FieldDefinition) => !LOGIN_FIELD_IDS.includes(f.id) && f.id !== 'name');

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 font-bengali">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-6">
                    <div className="relative inline-block">
                        <div className="w-28 h-28 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto text-[#045c84] overflow-hidden border-4 border-white ring-8 ring-slate-100/50">
                            {institute?.logo ? <img src={institute.logo} alt={institute.name} className="w-full h-full object-cover" /> : <Building2 size={48} className="opacity-20" />}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">{institute?.name || 'ভর্তি ফর্ম'}</h1>
                        {institute?.address && <p className="text-slate-500 font-medium max-w-xl mx-auto leading-relaxed text-lg">{institute.address}</p>}
                    </div>
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-[#045c84] text-white rounded-full text-sm font-bold uppercase tracking-widest shadow-lg shadow-blue-100 italic relative">
                        <span className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" />
                        ভর্তি আবেদনপত্র
                        {draftStatus && (
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-100 text-[#045c84] text-[10px] font-black rounded-xl shadow-sm animate-fade-in whitespace-nowrap not-italic">
                                {draftStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
                                {draftStatus === 'saved' && <Save size={12} />}
                                {draftStatus === 'recovered' && <CheckCircle2 size={12} />}
                                <span>{draftStatus === 'saving' ? 'ড্রাফট সেভ হচ্ছে...' : draftStatus === 'saved' ? 'ড্রাফট সেভ হয়েছে' : 'আগের ড্রাফট লোড হয়েছে'}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="h-2 bg-[#045c84] w-full" />
                    <div className="flex border-b border-slate-100 bg-slate-50/50">
                        <button type="button" onClick={() => setActiveTab('profile')} className={`flex-1 py-6 text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'bg-white text-[#045c84] border-b-4 border-[#045c84]' : 'text-slate-400 hover:text-slate-600'}`}>
                            <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">০১</span>ব্যক্তিগত তথ্যাদি (Profile Info)
                        </button>
                        <button type="button" onClick={() => setActiveTab('account')} className={`flex-1 py-6 text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'account' ? 'bg-white text-[#045c84] border-b-4 border-[#045c84]' : 'text-slate-400 hover:text-slate-600'}`}>
                            <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">০২</span>অ্যাকাউন্ট সেটআপ (Account Setup)
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-10">
                        {activeTab === 'profile' ? (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2 cursor-default">শিক্ষার্থীর তথ্যাদি</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                                        <div className="md:col-span-2">{renderField('name')}</div>
                                        {renderField('classId')}
                                        {renderField('groupId')}
                                    </div>
                                </div>
                                {effectiveFields.length > 0 && (
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2">বিস্তারিত তথ্য (Profile Data)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                                            {effectiveFields.map(field => {
                                                if (field.id === 'guardianName') {
                                                    return (
                                                        <div key={field.id} className="space-y-4">
                                                            <div className="flex gap-2">
                                                                <button type="button" onClick={() => {
                                                                    const m = formData.metadata;
                                                                    if (m.fathersName || m.fathersPhone) {
                                                                        setFormData({ ...formData, metadata: { ...m, guardianName: m.fathersName || m.guardianName, guardianPhone: m.fathersPhone || m.guardianPhone, guardianRelation: 'বাবা' } });
                                                                    } else setToast({ message: 'পিতার তথ্য আগে পূরণ করুন।', type: 'error' });
                                                                }} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">অভিভাবক হিসেবে পিতা</button>
                                                                <button type="button" onClick={() => {
                                                                    const m = formData.metadata;
                                                                    if (m.mothersName || m.mothersPhone) {
                                                                        setFormData({ ...formData, metadata: { ...m, guardianName: m.mothersName || m.guardianName, guardianPhone: m.mothersPhone || m.guardianPhone, guardianRelation: 'মা' } });
                                                                    } else setToast({ message: 'মাতার তথ্য আগে পূরণ করুন।', type: 'error' });
                                                                }} className="px-3 py-1 bg-pink-50 text-pink-600 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors">অভিভাবক হিসেবে মাতা</button>
                                                            </div>
                                                            {renderField(field.id)}
                                                        </div>
                                                    );
                                                }
                                                return renderField(field.id);
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-slate-50 p-6 md:p-8 rounded-[32px] border border-slate-100 space-y-8 shadow-inner">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-[#045c84] flex items-center justify-center text-white"><LogIn size={18} /></div>
                                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">শিক্ষার্থীর লগইন তথ্য</h4>
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#045c84] transition-colors">এড়িয়ে যান (Skip)</span>
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={!!formData.skipAccountSetup}
                                                        onChange={(e) => setFormData({ ...formData, skipAccountSetup: e.target.checked })}
                                                    />
                                                    <div className={`w-10 h-5 rounded-full transition-colors ${formData.skipAccountSetup ? 'bg-amber-500' : 'bg-slate-200'}`} />
                                                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${formData.skipAccountSetup ? 'translate-x-5' : ''}`} />
                                                </div>
                                            </label>
                                        </div>

                                        {formData.skipAccountSetup ? (
                                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-[24px] flex gap-4 items-center">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                                    <Info size={24} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-amber-900">লগইন অ্যাকাউন্ট ছাড়াই আবেদন করুন</p>
                                                    <p className="text-xs font-bold text-amber-700/70 leading-relaxed">আপনার কোনো লগইন অ্যাকাউন্ট তৈরি হবে না। ভর্তির সময় প্রতিষ্ঠান থেকে আপনাকে লগইন তথ্য প্রদান করা হবে।</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {(() => {
                                                        const hasGuardian = !!formData.guardianPhone;
                                                        const hasEmail = !!formData.email;
                                                        const hasPhone = !!formData.phone;
                                                        const isEmailOptional = hasGuardian || hasPhone;
                                                        const isPhoneOptional = hasGuardian || hasEmail;

                                                        return (
                                                            <>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex justify-between">
                                                                        <span>মোবাইল নম্বর {!isPhoneOptional && <span className="text-red-500">*</span>}</span>
                                                                        {isPhoneOptional && <span className="text-[10px] font-medium text-slate-400 font-sans ml-auto bg-white px-1.5 py-0.5 rounded uppercase">ঐচ্ছিক</span>}
                                                                    </label>
                                                                    <input type="text" required={!isPhoneOptional} placeholder="শিক্ষার্থীর মোবাইল বা আইডি" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black placeholder:text-slate-300 placeholder:font-normal" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex justify-between">
                                                                        <span>ইমেইল {!isEmailOptional && <span className="text-red-500">*</span>}</span>
                                                                        {isEmailOptional && <span className="text-[10px] font-medium text-slate-400 font-sans ml-auto bg-white px-1.5 py-0.5 rounded uppercase">ঐচ্ছিক</span>}
                                                                    </label>
                                                                    <input type="email" required={!isEmailOptional} placeholder="শিক্ষার্থীর ইমেইল" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black placeholder:text-slate-300 placeholder:font-normal" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider">শিক্ষার্থীর পাসওয়ার্ড <span className="text-red-500">*</span></label>
                                                        <input type="password" required placeholder="পাসওয়ার্ড সেট করুন" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black placeholder:text-slate-300 placeholder:font-normal" value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                                    </div>
                                                </div>

                                                <div className="pt-4 space-y-6">
                                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                                                        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white"><CheckCircle2 size={18} /></div>
                                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">অভিভাবকের অ্যাকাউন্ট (বাধ্যতামূলক)</h4>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">অভিভাবকের নাম <span className="text-red-500">*</span></label>
                                                            <input type="text" required placeholder="অভিভাবকের নাম লিখুন" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black placeholder:text-slate-300 placeholder:font-normal" value={formData.guardianName || ''} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">অভিভাবকের মোবাইল <span className="text-red-500">*</span></label>
                                                            <input type="text" required placeholder="অভিভাবকের মোবাইল নম্বর" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black placeholder:text-slate-300 placeholder:font-normal" value={formData.guardianPhone || ''} onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">লগইন পাসওয়ার্ড <span className="text-red-500">*</span></label>
                                                            <input type="password" required placeholder="পাসওয়ার্ড সেট করুন" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#045c84]/10 transition-all outline-none font-medium text-black placeholder:text-slate-300 placeholder:font-normal" value={formData.guardianPassword || ''} onChange={(e) => setFormData({ ...formData, guardianPassword: e.target.value })} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                            {activeTab === 'account' && (
                                <button type="button" onClick={() => setActiveTab('profile')} className="w-full md:w-auto px-10 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95">আগের ধাপে ফিরে যান</button>
                            )}
                            <button type={activeTab === 'profile' ? 'button' : 'submit'} onClick={() => activeTab === 'profile' && setActiveTab('account')} disabled={actionLoading} className="w-full md:w-auto px-10 py-4 bg-[#045c84] hover:bg-[#034d6e] text-white font-black rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                <span>{activeTab === 'profile' ? 'পরবর্তী ধাপ' : 'ভর্তি আবেদন জমা দিন'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
