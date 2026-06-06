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
    const baseClass = `${previewOnly ? '' : 'print-area'} bg-white p-4 font-bengali text-slate-900 border-4 border-double border-slate-300 m-2 flex flex-col`;
    const sizeClass = previewOnly ? (isA5 ? 'min-h-[210mm] max-w-[148mm] mx-auto text-[16px]' : 'min-h-[10.5in] text-[16px]') : (isA5 ? 'max-w-[210mm] text-[16px]' : 'max-w-[210mm] text-[16px]');
    return (
        <div className={`${baseClass} ${sizeClass}`}>
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
            <div className="flex justify-center mb-3" style={{ marginTop: '-12px' }}>
                <div className="inline-block bg-slate-900 text-white px-4 py-1 rounded-full font-black text-[16px] uppercase tracking-widest relative z-10 border-[6px] border-white">
                    {title}
                </div>
            </div>

            {/* Date */}
            {date && (
                <div className="flex justify-end mb-4">
                    <div className="text-right">
                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">তারিখ</p>
                        <p className="text-[16px] font-black text-slate-800">{date}</p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1">
                {children}
            </div>

            {/* Signature Area */}
            <div className={`${previewOnly ? 'mt-auto pt-6' : 'pt-6'} grid grid-cols-3 gap-6 text-center items-end signature-area`}>
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

            {/* Footer Notice removed per request */}

            <style jsx global>{`
                @media print {
                    @page {
                        size: ${pageSize} portrait;
                        margin: 10mm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    html, body { height: auto !important; }
                    .print-area, .print-area * {
                        visibility: visible;
                        box-sizing: border-box;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto;
                        margin: 0;
                        padding: 10mm;
                        border: none;
                        display: flex;
                        flex-direction: column;
                        box-sizing: border-box;
                        transform: none;
                    }
                    .print-area table { width: 100% !important; border-collapse: collapse; }
                    .print-area img { max-width: 100% !important; height: auto !important; }
                    /* avoid forcing signature to bottom when printing to prevent extra blank space */
                    .signature-area { page-break-inside: avoid; }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
