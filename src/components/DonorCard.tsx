'use client';

import React from 'react';
import { Phone, HeartPulse } from 'lucide-react';

interface DonorCardProps {
    donor: any;
    onCardClick?: (donor: any) => void;
    onDelete?: (donorId: string, name: string) => void;
}

export default function DonorCard({
    donor,
    onCardClick,
    onDelete
}: DonorCardProps) {
    const name = donor.name || 'অজানা দাতা';
    const initials = name[0]?.toUpperCase() || 'D';
    const phone = donor.phone;

    const handleCall = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (phone) window.open(`tel:${phone}`, '_self');
    };

    return (
        <div
            onClick={() => onCardClick?.(donor)}
            className="group relative bg-white rounded-3xl border border-slate-100 p-4 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#045c84]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />

            <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white flex items-center justify-center text-lg font-black shadow-md shadow-rose-900/10 group-hover:scale-105 transition-transform duration-500 ring-2 ring-white">
                        <HeartPulse size={24} />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <h3 className="text-base font-black text-slate-800 truncate tracking-tight group-hover:text-rose-600 transition-colors">{name}</h3>
                    </div>
                    {phone && (
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1 leading-tight truncate">
                            {phone}
                        </p>
                    )}
                </div>

                <button
                    onClick={handleCall}
                    className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 hover:shadow-lg transition-all active:scale-90"
                    title="কল করুন"
                >
                    <Phone size={18} fill="currentColor" />
                </button>
            </div>
        </div>
    );
}
