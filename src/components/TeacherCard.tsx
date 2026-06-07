'use client';

import React from 'react';
import { Shield, MoreVertical, Trash2, Phone, Mail, Copy, Check, MessageCircle } from 'lucide-react';

interface TeacherCardProps {
    teacher: any;
    currentUser?: any;
    onCardClick?: (teacher: any) => void;
    canManage?: boolean;
    onDelete?: (teacherId: string, name: string) => void;
    classes?: any[];
    isReadOnly?: boolean;
}

export default function TeacherCard({
    teacher,
    currentUser,
    onCardClick,
    canManage = false,
    onDelete,
    classes = [],
    isReadOnly = false
}: TeacherCardProps) {
    const [copiedField, setCopiedField] = React.useState<string | null>(null);

    // Resolve teacher name, initials, and designation
    const name = teacher.user?.name || teacher.name || 'শিক্ষক';
    const initials = name[0]?.toUpperCase() || 'T';
    const designation = teacher.designation || 'শিক্ষক';
    const phone = teacher.user?.phone || teacher.phone;
    const email = teacher.user?.email || teacher.email;
    const isAdmin = teacher.isAdmin;
    const isCurrentUser = teacher.userId === currentUser?.id || teacher.id === currentUser?.id;
    const isPending = teacher.status === 'PENDING';

    const handleCopy = (e: React.MouseEvent, text: string, field: string) => {
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleCall = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (phone) window.open(`tel:${phone}`, '_self');
    };

    const handleWhatsApp = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };

    return (
        <div
            onClick={() => onCardClick?.(teacher)}
            className={`group relative bg-white rounded-3xl border border-slate-100 p-3 sm:p-4 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-visible max-w-full`}
        >
            {/* Badges moved inline with name */}

            <div className="flex items-center gap-4">
                {/* Profile Avatar */}
                <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#045c84] to-[#067ab8] text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-900/10 group-hover:scale-105 transition-transform duration-500">
                        {initials}
                    </div>
                    {isPending ? (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-lg border-2 border-white flex items-center justify-center shadow-sm">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                    ) : (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-lg border-2 border-white flex items-center justify-center shadow-sm">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                    )}
                </div>

                {/* Info & Call Button */}
                <div className="flex-1 min-w-0 flex items-center justify-between gap-1 sm:gap-2">
                    <div className="min-w-0 flex-1 pr-1">
                        <h3 className="text-base font-black text-slate-800 truncate tracking-tight group-hover:text-[#045c84] transition-colors flex items-center gap-2">
                            {name}
                            {isCurrentUser && (
                                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold text-[9px] border border-emerald-100 shadow-sm shrink-0">
                                    ✓ আপনি
                                </span>
                            )}
                            {isAdmin && (
                                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold text-[9px] flex items-center gap-1 border border-red-100 shadow-sm shrink-0">
                                    <Shield size={8} />
                                    ADMIN
                                </span>
                            )}
                        </h3>
                        <p className="text-[11px] font-bold text-[#045c84]/70 bg-blue-50/50 px-2 py-0.5 rounded-md inline-block mt-0.5 truncate max-w-full">
                            {designation}
                        </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {/* Smart Call Button */}
                        {phone && (
                            <button
                                onClick={handleCall}
                                className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-[#045c84] to-[#067ab8] text-white flex items-center justify-center shadow-lg shadow-blue-900/20 hover:scale-110 active:scale-95 transition-all duration-300 group/call relative"
                                title="Instant Call"
                            >
                                <Phone size={20} fill="currentColor" className="text-white" />
                                {/* Reflection effect */}
                                <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover/call:opacity-100 transition-opacity" />
                            </button>
                        )}

                        {/* Three-dot menu - Only for Admins */}
                        {canManage && !isReadOnly && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const menu = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (menu) {
                                            menu.classList.toggle('hidden');
                                        }
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-[#045c84] hover:bg-blue-50 rounded-lg transition-all"
                                >
                                    <MoreVertical size={18} />
                                </button>

                                {/* Dropdown menu */}
                                <div className="hidden absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-200">
                                    {onDelete && !isAdmin && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                onDelete(teacher.userId || teacher.id, name);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 size={14} />
                                            মুছে ফেলুন
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Subtle Footer (Optional Phone Display) */}
            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 font-sans tracking-tight truncate">
                        {phone || 'No Phone'}
                    </span>
                    {phone && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => handleCopy(e, phone, 'phone')}
                                className="text-slate-300 hover:text-[#045c84]"
                            >
                                {copiedField === 'phone' ? <Check size={10} /> : <Copy size={10} />}
                            </button>
                            <button
                                onClick={handleWhatsApp}
                                className="text-slate-300 hover:text-emerald-500"
                            >
                                <MessageCircle size={10} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Class Permissions Tags (Compressed) */}
                <div className="flex gap-1 shrink-0">
                    {teacher.permissions?.classWise && typeof teacher.permissions.classWise === 'object' && Object.keys(teacher.permissions.classWise).length > 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100">
                            {Object.keys(teacher.permissions.classWise).length} Classes
                        </span>
                    ) : (
                        <div className="flex gap-1">
                            {teacher.permissions?.canCollectFees && (
                                <span className="text-[8px] font-bold px-1 py-0.5 bg-purple-50 text-purple-600 rounded-md">Fees</span>
                            )}
                            {teacher.permissions?.canManageResult && (
                                <span className="text-[8px] font-bold px-1 py-0.5 bg-blue-50 text-blue-600 rounded-md">Res</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
