'use client';

import React from 'react';
import { Building2 } from 'lucide-react';

interface PrintLayoutProps {
    title: string;
    institute?: any;
    children: React.ReactNode;
    date?: string;
    pageSize?: 'A4' | 'A5' | 'A3' | 'Letter' | 'Legal' | 'auto' | string;
    previewOnly?: boolean;
    hideDate?: boolean;
    hideTitle?: boolean;
    pagePadding?: number;
    hideLogo?: boolean;
    footerCenterContent?: React.ReactNode;
}

export default function PrintLayout({ title, institute, children, date = new Date().toLocaleDateString('bn-BD'), pageSize = 'A4', previewOnly = false, hideDate = false, hideTitle = false, pagePadding, hideLogo = false, footerCenterContent }: PrintLayoutProps) {
    const isA5 = pageSize === 'A5';
    const baseClass = `${previewOnly ? '' : 'print-area'} bg-white p-4 font-bengali text-slate-900 border-4 border-double border-slate-300 m-2 flex flex-col`;
    const sizeClass = previewOnly ? (isA5 ? 'min-h-[210mm] w-full mx-auto' : 'min-h-[10.5in] w-full') : 'w-full';
    return (
        <div className={`${baseClass} ${sizeClass}`} style={{ padding: `${pagePadding ?? 16}px` }}>
            {/* Institute Header: logo flush-left, institute text centered */}
            <div className={`mb-0 border-b-2 border-slate-800 ${hideTitle ? 'pb-4' : 'pb-8'}`} style={{ display: 'grid', gridTemplateColumns: hideLogo ? '1fr' : '96px 1fr 96px', alignItems: 'center' }}>
                {/* left logo column */}
                {!hideLogo && (
                    <div className="pl-4 flex items-center justify-start">
                        {institute?.logo ? (
                            <img src={institute.logo} alt={institute.name} className="w-20 h-20 object-contain" />
                        ) : (
                            <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                <Building2 size={40} className="text-slate-400" />
                            </div>
                        )}
                    </div>
                )}

                {/* centered title column (will not overlap logo) */}
                <div className="flex flex-col items-center justify-center" style={{ minWidth: 0 }}>
                    <h1 className="text-[24px] font-black uppercase tracking-tight text-slate-900 leading-tight text-center whitespace-nowrap">
                        {institute?.name || 'Education Institute'}
                    </h1>
                    <p className="text-[16px] font-bold text-slate-600 text-center whitespace-nowrap">
                        {institute?.address || 'Address not provided'}
                    </p>
                </div>

                {/* right placeholder column (keeps center truly centered) */}
                {!hideLogo && <div className="pr-4" />}
            </div>

            {/* Document Title overlapping the break line */}
            {!hideTitle && (
                <div className="flex justify-center mb-3" style={{ marginTop: '-18px' }}>
                    <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded-full font-black text-[14px] uppercase tracking-widest relative z-10 border-4 border-white">
                        {title}
                    </div>
                </div>
            )}

            {/* Date */}
            {!hideDate && date && (
                <div className="flex justify-end mb-4">
                    <div className="text-right">
                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">তারিখ</p>
                        <p className="text-[16px] font-black text-slate-800">{date}</p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 print-min-h">
                {children}
            </div>

            {/* Signature Area */}
            <div className="flex items-end justify-between mt-12 pt-4 signature-area shrink-0 relative">
                <div className="text-center w-40 z-10">
                    <div className="w-full border-t border-slate-400 mb-1.5 mx-auto"></div>
                    <p className="font-bold text-slate-600 text-[13px]">আদায়কারীর স্বাক্ষর</p>
                </div>
                
                {footerCenterContent && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-0">
                        {footerCenterContent}
                    </div>
                )}
                
                <div className="text-center w-40 z-10">
                    <div className="w-full border-t border-slate-400 mb-1.5 mx-auto"></div>
                    <p className="font-bold text-slate-600 text-[13px]">প্রধান শিক্ষকের স্বাক্ষর</p>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: ${pageSize} portrait;
                        margin: 0.25in;
                    }
                    body, html {
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    
                    @supports selector(:has(a)) {
                        body *:not(:has(.print-area)):not(.print-area):not(.print-area *) {
                            display: none !important;
                        }
                        body * { visibility: visible; }
                    }
                    
                    .print-area {
                        position: static !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        display: block !important;
                        transform: none !important;
                        page-break-after: always;
                        break-after: page;
                        box-sizing: border-box;
                    }
                    .print-min-h {
                        min-height: calc(100vh - 250px) !important;
                    }
                    .print-area table { width: 100% !important; border-collapse: collapse; }
                    .print-area img { max-width: 100% !important; height: auto !important; }
                    .signature-area { page-break-inside: avoid; break-inside: avoid; }
                    .no-print { display: none !important; }
                    .print-reset-outer, .print-reset-inner {
                        width: 100% !important;
                        height: auto !important;
                        min-height: 0 !important;
                        transform: none !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important;
                    }
                }
            `}</style>
            <style jsx>{`
                .print-reset-inner {
                    transition: transform var(--pv-transform, 360ms cubic-bezier(.2,.9,.3,1)), font-size var(--pv-font, 260ms cubic-bezier(.2,.9,.3,1));
                    will-change: transform, font-size;
                }
                .print-area {
                    transition: padding var(--pv-padding, 360ms cubic-bezier(.2,.9,.3,1));
                    will-change: padding;
                }
                .print-area th, .print-area td {
                    transition: padding var(--pv-padding, 360ms cubic-bezier(.2,.9,.3,1)), background-color var(--pv-bg, 200ms ease), line-height var(--pv-line, 360ms cubic-bezier(.2,.9,.3,1));
                    will-change: padding, line-height, background-color;
                }
                .print-area tbody tr {
                    transition: background-color var(--pv-bg, 220ms ease), transform var(--pv-transform, 360ms cubic-bezier(.2,.9,.3,1));
                    will-change: background-color, transform;
                }
            `}</style>
        </div>
    );
}
