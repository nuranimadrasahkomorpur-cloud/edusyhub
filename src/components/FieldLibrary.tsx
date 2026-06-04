import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Type,
    Hash,
    Calendar,
    List,
    FileUp,
    Plus,
    X,
    Info,
    Smartphone,
    Mail,
    MapPin,
    Users as UsersIcon,
    Fingerprint,
    Globe,
    Building2,
    BookOpen,
    Briefcase,
    DollarSign,
    HeartPulse,
    Award,
    Stethoscope,
    History,
    Anchor
} from 'lucide-react';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'attachment' | 'class-lookup' | 'group-lookup';

export interface FieldDefinition {
    id: string;
    label: string;
    type: FieldType;
    category: string;
    options?: string[];
    required?: boolean;
    icon?: any;
    placeholder?: string;
}

export const POSSIBLE_FIELDS: FieldDefinition[] = [
    // Core (New defaults)
    { id: 'name', label: 'শিক্ষার্থীর নাম', type: 'text', category: 'মৌলিক তথ্য', icon: UsersIcon, placeholder: 'পুরো নাম', required: true },
    { id: 'email', label: 'ইমেইল (লগইন আইডি)', type: 'text', category: 'মৌলিক তথ্য', icon: Mail, placeholder: 'পুরো ইমেইল অ্যাড্রেস দিন', required: true },
    { id: 'password', label: 'পাসওয়ার্ড', type: 'text', category: 'মৌলিক তথ্য', icon: Fingerprint, placeholder: 'লগইন পাসওয়ার্ড (ফাঁকা রাখলে স্টুডেন্ট আইডি ব্যবহার হবে)' },
    { id: 'studentPhone', label: 'শিক্ষার্থীর মোবাইল (লগইন আইডি)', type: 'text', category: 'মৌলিক তথ্য', icon: Smartphone, placeholder: 'লগইন আইডি হিসেবে ব্যবহার হবে' },

    // Basic Info
    { id: 'fathersName', label: 'পিতার নাম', type: 'text', category: 'মৌলিক তথ্য', icon: UsersIcon, placeholder: 'বাবার পুরো নাম' },
    { id: 'fathersPhone', label: 'পিতার মোবাইল', type: 'text', category: 'মৌলিক তথ্য', icon: Smartphone, placeholder: 'বাবার মোবাইল নম্বর' },
    { id: 'mothersName', label: 'মাতার নাম', type: 'text', category: 'মৌলিক তথ্য', icon: UsersIcon, placeholder: 'মায়ের পুরো নাম' },
    { id: 'mothersPhone', label: 'মাতার মোবাইল', type: 'text', category: 'মৌলিক তথ্য', icon: Smartphone, placeholder: 'মায়ের মোবাইল নম্বর' },
    { id: 'gender', label: 'লিঙ্গ', type: 'select', category: 'মৌলিক তথ্য', options: ['ছেলে', 'মেয়ে'], icon: Info },
    { id: 'bloodGroup', label: 'রক্তের গ্রুপ', type: 'select', category: 'মৌলিক তথ্য', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], icon: HeartPulse },
    { id: 'religion', label: 'ধর্ম', type: 'select', category: 'মৌলিক তথ্য', options: ['ইসলাম', 'হিন্দু', 'খ্রিস্টান', 'বৌদ্ধ', 'অন্যান্য'], icon: Anchor },
    { id: 'hobby', label: 'শখ', type: 'text', category: 'মৌলিক তথ্য', icon: HeartPulse, placeholder: 'যেমন: বই পড়া, বাগান করা' },

    // Identity
    { id: 'birthRegNo', label: 'জন্ম নিবন্ধন নম্বর', type: 'text', category: 'পরিচয়', icon: Fingerprint, placeholder: '১৭ ডিজিটের নম্বর' },
    { id: 'nationality', label: 'জাতীয়তা', type: 'text', category: 'পরিচয়', icon: Globe, placeholder: 'যেমন: বাংলাদেশী' },
    { id: 'version', label: 'ভার্সন', type: 'select', category: 'পরিচয়', options: ['বাংলা ভার্সন', 'ইংলিশ ভার্সন'], icon: BookOpen },
    { id: 'nid', label: 'এনআইডি নম্বর (প্রযোজ্য ক্ষেত্রে)', type: 'text', category: 'পরিচয়', icon: Fingerprint, placeholder: 'জাতীয় পরিচয়পত্র নম্বর' },

    // Contact
    { id: 'emergencyContact', label: 'জরুরী যোগাযোগ', type: 'text', category: 'যোগাযোগ', icon: Smartphone, placeholder: '০১৩********' },
    { id: 'presentAddress', label: 'বর্তমান ঠিকানা', type: 'text', category: 'যোগাযোগ', icon: MapPin, placeholder: 'গ্রাম, ডাকঘর, থানা, জেলা' },
    { id: 'permanentAddress', label: 'স্থায়ী ঠিকানা', type: 'text', category: 'যোগাযোগ', icon: MapPin, placeholder: 'গ্রাম, ডাকঘর, থানা, জেলা' },

    // Guardian Info
    { id: 'guardianName', label: 'অভিভাবকের নাম', type: 'text', category: 'অভিভাবক তথ্য', icon: UsersIcon, placeholder: 'অভিভাবকের নাম', required: true },
    { id: 'guardianPhone', label: 'অভিভাবকের মোবাইল (লগইন আইডি - ঐচ্ছিক)', type: 'text', category: 'অভিভাবক তথ্য', icon: Smartphone, placeholder: 'লগইন আইডি হিসেবে ব্যবহার হবে' },
    { id: 'guardianPassword', label: 'অভিভাবকের পাসওয়ার্ড', type: 'text', category: 'অভিভাবক তথ্য', icon: Fingerprint, placeholder: 'লগইন পাসওয়ার্ড (ফাঁকা রাখলে মোবাইল নম্বর ব্যবহার হবে)' },
    { id: 'guardianRelation', label: 'সম্পর্ক', type: 'select', category: 'অভিভাবক তথ্য', options: ['বাবা', 'মা', 'ভাই', 'বোন', 'চাচা', 'মামা', 'অন্যান্য'], icon: UsersIcon, required: true },
    { id: 'guardianOccupation', label: 'অভিভাবকের পেশা', type: 'text', category: 'অভিভাবক তথ্য', icon: Briefcase, placeholder: 'যেমন: শিক্ষক, ব্যবসায়ী' },
    { id: 'yearlyIncome', label: 'বার্ষিক আয়', type: 'number', category: 'অভিভাবক তথ্য', icon: DollarSign, placeholder: 'টাকায় পরিমাণ' },
    { id: 'guardianNid', label: 'অভিভাবকের এনআইডি', type: 'text', category: 'অভিভাবক তথ্য', icon: Fingerprint, placeholder: 'এনআইডি নম্বর' },

    // Academic
    { id: 'classId', label: 'শ্রেণী', type: 'class-lookup', category: 'একাডেমিক', icon: BookOpen },
    { id: 'groupId', label: 'গ্রুপ', type: 'group-lookup', category: 'একাডেমিক', icon: List },
    { id: 'rollNumber', label: 'রোল নম্বর', type: 'number', category: 'একাডেমিক', icon: Hash, placeholder: 'যেমন: 01' },
    { id: 'studentId', label: 'শিক্ষার্থী আইডি', type: 'text', category: 'একাডেমিক', icon: Fingerprint, placeholder: 'যেমন: 0001' },
    { id: 'previousSchool', label: 'পূর্ববর্তী শিক্ষা প্রতিষ্ঠান', type: 'text', category: 'একাডেমিক', icon: Building2, placeholder: 'প্রতিষ্ঠানের নাম' },
    { id: 'admissionDate', label: 'ভর্তির তারিখ', type: 'date', category: 'একাডেমিক', icon: Calendar },
    { id: 'shift', label: 'শিফট', type: 'select', category: 'একাডেমিক', options: ['প্রভাতি', 'দিবা'], icon: History },
    { id: 'previousGpa', label: 'পূর্ববর্তী জিপিএ', type: 'number', category: 'একাডেমিক', icon: Award, placeholder: '৫.০০ এর মধ্যে' },

    // Documents
    { id: 'studentPhoto', label: 'শিক্ষার্থীর ছবি', type: 'attachment', category: 'নথিপত্র', icon: FileUp },
    { id: 'birthCertificate', label: 'জন্ম নিবন্ধন কপি', type: 'attachment', category: 'নথিপত্র', icon: FileUp },
    { id: 'marksheet', label: 'মার্কশিট/একাডেমিক ট্রান্সক্রিপ্ট', type: 'attachment', category: 'নথিপত্র', icon: FileUp },
    { id: 'testimonial', label: 'প্রশংসাপত্র', type: 'attachment', category: 'নথিপত্র', icon: Award },
    { id: 'transferCertificate', label: 'টিসি (ট্রান্সফার সার্টিফিকেট)', type: 'attachment', category: 'নথিপত্র', icon: FileUp },

    // Health
    { id: 'disability', label: 'শারীরিক প্রতিবন্ধকতা', type: 'text', category: 'স্বাস্থ্য তথ্য', icon: Stethoscope, placeholder: 'যদি থাকে (না থাকলে প্রযোজ্য নয় লিখুন)' },
];

interface FieldLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    currentFields: FieldDefinition[];
    onAddField: (field: FieldDefinition) => void;
    onRemoveField: (fieldId: string) => void;
}

export default function FieldLibrary({ isOpen, onClose, currentFields, onAddField, onRemoveField }: FieldLibraryProps) {
    const [mounted, setMounted] = useState(false);
    const [customFields, setCustomFields] = useState<FieldDefinition[]>([]);
    const [isCreatingCustom, setIsCreatingCustom] = useState(false);
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldType, setNewFieldType] = useState<FieldType>('text');

    const handleCreateCustomField = () => {
        if (!newFieldLabel.trim()) return;
        const newField: FieldDefinition = {
            id: `custom_${Date.now()}`,
            label: newFieldLabel.trim(),
            type: newFieldType,
            category: 'কাস্টম ফিল্ড',
            icon: newFieldType === 'number' ? Hash : newFieldType === 'date' ? Calendar : newFieldType === 'attachment' ? FileUp : Type
        };
        setCustomFields([...customFields, newField]);
        setNewFieldLabel('');
        setNewFieldType('text');
        setIsCreatingCustom(false);
        onAddField(newField);
    };

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    const ALL_FIELDS = [...POSSIBLE_FIELDS, ...customFields];
    const categories = Array.from(new Set(ALL_FIELDS.map(f => f.category)));

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-slide-in-right flex flex-col font-bengali">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">ফিল্ড লাইব্রেরি</h2>
                        <p className="text-xs text-slate-500 font-medium">আপনার ফর্মের জন্য প্রয়োজনীয় ফিল্ডগুলো এখান থেকে নিন।</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div
                    className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar"
                    data-lenis-prevent
                >
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        {!isCreatingCustom ? (
                            <button
                                onClick={() => setIsCreatingCustom(true)}
                                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-[#045c84] hover:bg-blue-50 rounded-xl transition-all border border-dashed border-blue-200"
                            >
                                <Plus size={18} />
                                নতুন কাস্টম ফিল্ড তৈরি করুন
                            </button>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-slate-700">কাস্টম ফিল্ড যোগ করুন</h3>
                                    <button onClick={() => setIsCreatingCustom(false)} className="p-1 hover:bg-slate-200 rounded-lg">
                                        <X size={16} className="text-slate-500" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">ফিল্ডের নাম</label>
                                        <input
                                            type="text"
                                            value={newFieldLabel}
                                            onChange={(e) => setNewFieldLabel(e.target.value)}
                                            placeholder="যেমন: রক্তের গ্রুপ, উচ্চতা..."
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#045c84] focus:ring-1 focus:ring-[#045c84]"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">ফিল্ডের ধরন</label>
                                        <select
                                            value={newFieldType}
                                            onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#045c84] focus:ring-1 focus:ring-[#045c84]"
                                        >
                                            <option value="text">টেক্সট / মোবাইল</option>
                                            <option value="number">নম্বর / বয়স</option>
                                            <option value="date">তারিখ / ক্যালেন্ডার</option>
                                            <option value="attachment">ছবি / ফাইল আপলোড</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleCreateCustomField}
                                        disabled={!newFieldLabel.trim()}
                                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all"
                                    >
                                        যোগ করুন
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {categories.map(category => (
                        <div key={category} className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-4 border-[#045c84] pl-3">
                                {category}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {ALL_FIELDS.filter(f => f.category === category).map(field => {
                                    const isAdded = currentFields.some(cf => cf.id === field.id);
                                    const Icon = field.icon || Type;

                                    return (
                                        <div
                                            key={field.id}
                                            className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${isAdded
                                                ? 'border-blue-100 bg-blue-50/30 ring-2 ring-blue-500/10'
                                                : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isAdded ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 group-hover:text-[#045c84]'
                                                    }`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800">{field.label}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                        {field.type === 'text' ? 'টেক্সট ফিল্ড' :
                                                            field.type === 'number' ? 'নম্বর ফিল্ড' :
                                                                field.type === 'date' ? 'তারিখ' :
                                                                    field.type === 'select' ? 'ড্রপডাউন' :
                                                                        field.type === 'class-lookup' ? 'শ্রেণী সিলেকশন' :
                                                                            field.type === 'group-lookup' ? 'গ্রুপ সিলেকশন' : 'আপলোড'}
                                                    </div>
                                                </div>
                                            </div>

                                            {isAdded ? (
                                                <button
                                                    onClick={() => onRemoveField(field.id)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="রিমুভ করুন"
                                                >
                                                    <X size={18} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onAddField(field)}
                                                    className="p-2 text-[#045c84] hover:bg-blue-50 rounded-lg transition-all"
                                                    title="অ্যাড করুন"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-[#045c84] text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        সম্পূর্ণ হয়েছে
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
