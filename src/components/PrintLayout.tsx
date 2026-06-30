'use client';

import React from 'react';
import { Building2 } from 'lucide-react';

interface PrintLayoutProps {
    title: string;
    subtitle?: React.ReactNode;
    institute?: any;
    children: React.ReactNode;
    date?: string;
    pageSize?: 'A4' | 'A5' | 'A3' | 'Letter' | 'Legal' | 'auto' | string;
    previewOnly?: boolean;
    hideDate?: boolean;
    hideTitle?: boolean;
    pagePadding?: number;
    hideLogo?: boolean;
    hideHeader?: boolean;
    footerCenterContent?: React.ReactNode;
    hideSignature?: boolean;
    className?: string;
    leftSignatureLabel?: string;
    rightSignatureLabel?: string;
}

export default function PrintLayout({ title, subtitle, institute, children, date = new Date().toLocaleDateString('bn-BD'), pageSize = 'A4', previewOnly = false, hideDate = false, hideTitle = false, pagePadding, hideLogo = false, hideHeader = false, footerCenterContent, hideSignature = false, className, leftSignatureLabel = 'শ্রেণি শিক্ষকের স্বাক্ষর', rightSignatureLabel = 'প্রধান শিক্ষকের স্বাক্ষর' }: PrintLayoutProps) {
    const isA5 = pageSize === 'A5';
    const baseClass = `print-area ${previewOnly ? 'shadow-xl border border-slate-200 print:shadow-none print:border-none' : ''} bg-white p-4 font-bengali text-slate-900 border-4 border-double border-slate-300 print:border-none print:m-0 m-2 flex flex-col`;
    const sizeClass = previewOnly ? (isA5 ? 'min-h-[210mm] w-full mx-auto' : 'min-h-[10.5in] w-full') : 'w-full';
    const [logoError, setLogoError] = React.useState(false);
    const hasLogo = !hideLogo && !!institute?.logo && !logoError;

    const leftPadNeeded = hasLogo ? 96 : 0;
    const rightPadNeeded = (!hideDate && !!date) ? 160 : 0;
    const balancePad = Math.max(leftPadNeeded, rightPadNeeded);

    return (
        <div className={`${baseClass} ${sizeClass} ${className || ''}`} style={{ padding: `${pagePadding ?? 16}px` }}>
            {/* Institute Header: logo absolute-left, date absolute-right, name centered */}
            {!hideHeader && (
                <div className={`relative mb-0 border-b-2 border-slate-800 ${hideTitle ? 'pb-3' : 'pb-4'} flex items-center justify-center w-full`} style={{ minHeight: '80px' }}>
                    {/* left logo */}
                    {hasLogo && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-start z-10">
                            <img 
                                src={institute.logo} 
                                alt="" 
                                className="w-20 h-20 object-contain" 
                                onError={() => setLogoError(true)} 
                            />
                        </div>
                    )}

                    {/* centered title column */}
                    <div 
                        className="flex flex-col items-center justify-center mx-auto text-center" 
                        style={{ 
                            minWidth: 0,
                            maxWidth: balancePad > 0 ? `calc(100% - ${balancePad * 2}px)` : '100%',
                            width: '100%',
                            zIndex: 1
                        }}
                    >
                        <h1 className="text-[22px] font-black uppercase tracking-tight text-slate-900 leading-tight text-center w-full">
                            {institute?.name || 'Education Institute'}
                        </h1>
                        <p className="text-[14px] font-bold text-slate-600 text-center w-full mt-1">
                            {institute?.address || 'Address not provided'}
                        </p>
                    </div>

                    {/* right date column */}
                    {!hideDate && date && (
                        <div className="absolute right-4 bottom-[2px] text-right flex flex-col justify-end items-end z-10">
                            <p className="text-[13px] font-black text-slate-800 leading-tight whitespace-nowrap">{date}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Document Title overlapping the break line */}
            {!hideTitle && (
                <div className="flex flex-col items-center justify-center mb-2" style={{ marginTop: '-14px' }}>
                    <div className="inline-block bg-slate-900 text-white px-3 py-0.5 rounded-full font-black text-[13px] uppercase tracking-widest relative z-10 border-4 border-white">
                        {title}
                    </div>
                    {subtitle && (
                        <div className="mt-1">
                            {typeof subtitle === 'string' ? (
                                <div className="inline-block bg-slate-100 text-slate-700 px-3 py-0.5 mt-[-4px] rounded-full font-bold text-[11px] relative z-0 border-2 border-white shadow-sm">
                                    {subtitle}
                                </div>
                            ) : (
                                subtitle
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 print-min-h">
                {children}
            </div>

            {/* Signature Area */}
            {!hideSignature && (
                <div className="flex items-end justify-between mt-auto pt-6 signature-area shrink-0 relative w-full">
                    <div className="text-center w-40 z-10">
                        <div className="w-full border-t border-slate-400 mb-1.5 mx-auto"></div>
                        <p className="font-bold text-slate-600 text-[13px]">{leftSignatureLabel}</p>
                    </div>
                    
                    {footerCenterContent && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-0">
                            {footerCenterContent}
                        </div>
                    )}
                    
                    <div className="text-center w-40 z-10">
                        <div className="w-full border-t border-slate-400 mb-1.5 mx-auto"></div>
                        <p className="font-bold text-slate-600 text-[13px]">{rightSignatureLabel}</p>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @media print {
                    @page {
                        size: auto;
                        margin: 0.2in !important;
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
                        min-height: 98vh !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        display: flex !important;
                        flex-direction: column !important;
                        transform: none !important;
                        page-break-after: auto;
                        break-after: auto;
                        page-break-inside: auto;
                        break-inside: auto;
                        overflow: visible !important;
                        box-sizing: border-box;
                    }
                    .print-area * {
                        overflow: visible !important;
                    }
                    .print-area + .print-area {
                        page-break-before: always !important;
                        break-before: page !important;
                    }
                    .print-min-h {
                        min-height: auto !important;
                    }
                    .print-area table { width: 100% !important; border-collapse: collapse; }
                    .print-area img { max-width: 100% !important; height: auto !important; }
                    .print-area tbody tr { page-break-inside: avoid; break-inside: avoid; }
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
