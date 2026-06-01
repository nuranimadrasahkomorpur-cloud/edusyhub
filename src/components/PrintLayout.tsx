'use client';

import React from 'react';
import { Building2 } from 'lucide-react';

interface PrintLayoutProps {
    title: string;
    institute?: any;
    children: React.ReactNode;
    date?: string;
    pageSize?: 'A4' | 'A5';
    previewOnly?: boolean;
}

export default function PrintLayout({ title, institute, children, date = new Date().toLocaleDateString('bn-BD'), pageSize = 'A4', previewOnly = false }: PrintLayoutProps) {
    const isA5 = pageSize === 'A5';
    return (
        <div className={`${previewOnly ? '' : 'print-area'} bg-white p-5 font-bengali text-slate-900 border-4 border-double border-slate-300 m-2 ${isA5 ? 'min-h-[210mm] max-w-[148mm] mx-auto text-[16px]' : 'min-h-[10.5in] text-[16px]'}`}>
            {/* Institute Header */}
            <div className="flex justify-center mb-0 border-b-2 border-slate-800 pb-4 relative">
                <div className="flex items-center gap-3">
                    {institute?.logo ? (
                        <img src={institute.logo} alt={institute.name} className="w-20 h-20 object-contain" />
                    ) : (
                        <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                            <Building2 size={40} className="text-slate-400" />
                        </div>
                    )}
                    <div className="text-left">
                        <h1 className="text-[24px] font-black uppercase tracking-tight text-slate-900 leading-tight">
                            {institute?.name || 'Education Institute'}
                        </h1>
                        <p className="text-[16px] font-bold text-slate-600">
                            {institute?.address || 'Address not provided'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Document Title overlapping the break line */}
            <div className="flex justify-center mb-4" style={{ marginTop: '-18px' }}>
                <div className="inline-block bg-slate-900 text-white px-6 py-1 rounded-full font-black text-[18px] uppercase tracking-widest relative z-10 border-[6px] border-white">
                    {title}
                </div>
            </div>

            {/* Date */}
            {date && (
                <div className="flex justify-end mb-4">
                    <div className="text-right">
                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">তারিখ (Date)</p>
                        <p className="text-[16px] font-black text-slate-800">{date}</p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1">
                {children}
            </div>

            {/* Signature Area */}
            <div className="mt-10 pt-6 grid grid-cols-3 gap-6 text-center items-end">
                <div className="space-y-1 border-t border-slate-300 pt-2">
                    <p className="text-[14px] font-bold text-slate-600 uppercase tracking-widest">অভিভাবকের স্বাক্ষর</p>
                    <p className="text-[10px] text-slate-400">(Guardian's Signature)</p>
                </div>
                <div className="space-y-1 border-t border-slate-300 pt-2">
                    <p className="text-[14px] font-bold text-slate-600 uppercase tracking-widest">হিসাবরক্ষকের স্বাক্ষর</p>
                    <p className="text-[10px] text-slate-400">(Accountant's Signature)</p>
                </div>
                <div className="space-y-1 border-t border-slate-300 pt-2">
                    <p className="text-[14px] font-bold text-slate-600 uppercase tracking-widest">অধ্যক্ষের স্বাক্ষর</p>
                    <p className="text-[10px] text-slate-400">(Principal's Signature)</p>
                </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-6 text-center text-[10px] text-slate-500 italic">
                <p>This is an electronically generated official document from {institute?.name || 'Edusy'}.</p>
                <p>Powered by Edusy - Software for Educational Institutions</p>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: ${pageSize} portrait;
                        margin: 10mm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        padding: 10mm;
                        border: none;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
