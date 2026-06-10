'use client';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Printer, Receipt, CheckCircle2, MessageSquare, Share2 } from 'lucide-react';
import { useSession } from '@/components/SessionProvider';
import PrintLayout from '@/components/PrintLayout';
import { QRCodeSVG } from 'qrcode.react';

const numberToBanglaWords = (amount: number): string => {
    const banglaNumbers = ['শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'উনত্রিশ', 'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ', 'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ', 'পঞ্চাশ', 'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট', 'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর', 'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনআশি', 'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'উননব্বই', 'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'];

    if (amount === 0) return 'শূন্য';

    let words = '';
    const crore = Math.floor(amount / 10000000);
    amount %= 10000000;
    const lakh = Math.floor(amount / 100000);
    amount %= 100000;
    const thousand = Math.floor(amount / 1000);
    amount %= 1000;
    const hundred = Math.floor(amount / 100);
    amount %= 100;

    if (crore > 0) {
        words += numberToBanglaWords(crore) + ' কোটি ';
    }
    if (lakh > 0) {
        words += banglaNumbers[lakh] + ' লক্ষ ';
    }
    if (thousand > 0) {
        words += banglaNumbers[thousand] + ' হাজার ';
    }
    if (hundred > 0) {
        words += banglaNumbers[hundred] + ' শত ';
    }
    if (amount > 0) {
        words += banglaNumbers[amount] + ' ';
    }

    return words.trim();
};

interface PrintReceiptModalProps {
    transaction: any;
    onClose: () => void;
}

export default function PrintReceiptModal({ transaction, onClose }: PrintReceiptModalProps) {
    const { activeInstitute } = useSession();
    const printRef = useRef<HTMLDivElement>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
    const [overallDue, setOverallDue] = useState<number | null>(null);
    const [categoryDues, setCategoryDues] = useState<Record<string, number>>({});

    const handlePrint = () => {
        setIsPrinting(true);

        // Inject temporary print-only CSS so only the modal's print container prints
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-modal-print', 'true');
        styleEl.innerHTML = `
            @media print {
                body * { visibility: hidden !important; }
                .print-only-container, .print-only-container * { visibility: visible !important; }
                .print-only-container { 
                    position: absolute !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    right: auto !important;
                    bottom: auto !important;
                    width: 100% !important; 
                    min-height: 100% !important;
                    height: auto !important; 
                    overflow: visible !important;
                    display: block !important;
                }
                @page { margin: 0.25in; }
            }
        `;
        document.head.appendChild(styleEl);

        setTimeout(() => {
            // Use afterprint event to cleanup when available
            const cleanup = () => {
                try {
                    if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
                } catch (e) {}
                setIsPrinting(false);
                window.removeEventListener('afterprint', cleanup);
            };

            window.addEventListener('afterprint', cleanup);
            window.print();

            // Fallback cleanup in case afterprint doesn't fire
            setTimeout(() => cleanup(), 1500);
        }, 100);
    };

    const isLedger = Boolean(transaction?.isLedger);

    const getShareText = () => {
        const dateStr = generatedAt
            ? generatedAt.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
            : new Date(transaction.createdAt || transaction.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
        let text = isLedger ? 'লেনদেন লেজার\n' : `মানি রশিদ: ${transaction.receiptNo || 'N/A'}\n`;
        text += `শিক্ষার্থী: ${transaction.studentName || 'অজানা'}\n`;
        if (transaction.className) text += `শ্রেণী: ${transaction.className}\n`;
        text += `তারিখ: ${dateStr}\n\n`;
        text += `বিবরণ:\n`;
        
        const subTxns = transaction.subTransactions || [transaction];
        subTxns.forEach((t: any) => {
            const itemLabel = isLedger ? `${new Date(t.date || t.createdAt || transaction.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })} — ${t.note || t.category || 'বিবরণ'}` : `${t.category}`;
            text += `- ${itemLabel}: ৳${(Number(t.amount) || 0).toLocaleString()}\n`;
        });
        
        text += `\nসর্বমোট: ৳${(Number(transaction.amount) || 0).toLocaleString()}\n`;
        text += `\nধন্যবাদ!`;
        return encodeURIComponent(text);
    };

    const shareWhatsApp = () => {
        window.open(`https://wa.me/?text=${getShareText()}`, '_blank');
    };

    const shareSMS = () => {
        // sms:?body=... works on most mobile devices
        window.open(`sms:?body=${getShareText()}`, '_self');
    };

    if (!transaction) return null;

    const subTxns = transaction.subTransactions || [transaction];
    const groupedByCategory = subTxns.reduce((acc: any, t: any) => {
        let rawCat = t.originalCategory || t.category;
        let catKey = rawCat;
        let subName = '';

        if (typeof rawCat === 'string') {
            if (rawCat.startsWith('__ADVANCE__')) {
                catKey = 'অনির্ধারিত অগ্রিম জমা (Undefined Advance)';
                subName = 'অগ্রিম জমা (অতিরিক্ত পরিশোধ)';
            } else {
                const splitParts = rawCat.split(',').map(part => part.trim()).filter(Boolean);
                const categoryPart = splitParts.length > 1 ? splitParts[splitParts.length - 1] : rawCat;
                const allGroups = Array.from(categoryPart.matchAll(/\(([^)]+)\)/g)).map(m => m[1].trim()).filter(Boolean);
                catKey = rawCat.replace(/\s*\([^)]*\)/g, '').trim();
                const partialIndicators = ['আংশিক', 'আংশিক পরিশোধ', 'আংশিক অগ্রিম পরিশোধ', 'আংশিক স্বয়ংক্রিয় পরিশোধ', 'আংশিক স্বয়ংক্রিয় পরিশোধ'];
                subName = allGroups.filter(group => !partialIndicators.some(indicator => group.includes(indicator))).slice(-1)[0] || '';
            }
        }

        if (!subName && typeof t.note === 'string') {
            const noteGroups = Array.from(t.note.matchAll(/\(([^)]+)\)/g) as RegExpMatchArray[]).map(m => m[1].trim()).filter(Boolean);
            const partialIndicators = ['আংশিক', 'আংশিক পরিশোধ', 'আংশিক অগ্রিম পরিশোধ', 'আংশিক স্বয়ংক্রিয় পরিশোধ', 'আংশিক স্বয়ংক্রিয় পরিশোধ'];
            subName = noteGroups.filter(group => !partialIndicators.some(indicator => group.includes(indicator))).slice(-1)[0] || '';
        }

        if (!acc[catKey]) acc[catKey] = { items: [], total: 0, totalDue: 0 };
        acc[catKey].items.push({ ...t, parsedSubName: subName });
        acc[catKey].total += t.amount;
        const due = t.originalAmount !== undefined ? t.originalAmount - t.amount : 0;
        acc[catKey].totalDue += Math.max(0, due);
        return acc;
    }, {});

    const renderReceiptContent = (isPreview: boolean) => {
        const generatedDateStr = generatedAt ? generatedAt.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        const displayDateStr = isLedger ? (generatedDateStr || new Date(transaction.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })) : new Date(transaction.createdAt || transaction.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
        const subTxns = transaction.subTransactions || [transaction];
        const sortedTxns = [...subTxns].sort((a: any, b: any) => new Date(a.date || a.createdAt || transaction.date).getTime() - new Date(b.date || b.createdAt || transaction.date).getTime());

        const buildFeeLabel = (t: any, cat: string) => {
            const note = String(t.note || '').trim();
            const isPartial = note.includes('আংশিক');
            const cleanedNote = note.replace(/\s*\((আংশিক(?: পরিশোধ)?|আংশিক অগ্রিম পরিশোধ|আংশিক স্বয়ংক্রিয় পরিশোধ|আংশিক স্বয়ংক্রিয় পরিশোধ)\)\s*/g, '').trim()
                                      .replace(/(?:^|\s+)(আংশিক পরিশোধ|আংশিক অগ্রিম পরিশোধ|আংশিক স্বয়ংক্রিয় পরিশোধ|আংশিক স্বয়ংক্রিয় পরিশোধ)$/g, '').trim();
            const partialSuffix = isPartial ? ' (আংশিক)' : '';

            const extractParenthesisLabel = (text: string) => {
                const matches = Array.from(text.matchAll(/\(([^)]+)\)/g)).map(m => m[1].trim());
                const filtered = matches.filter(m => !m.includes('আংশিক'));
                return filtered.length ? filtered[filtered.length - 1] : '';
            };

            if (t.parsedSubName) {
                return `${t.parsedSubName}${partialSuffix}`.trim();
            }

            const bracketLabel = extractParenthesisLabel(t.category || '');
            if (bracketLabel && bracketLabel !== cat) {
                return `${bracketLabel}${partialSuffix}`;
            }

            const periodicCategory = ['মাসিক', 'সাপ্তাহিক', 'বার্ষিক', 'সামাসিক'].some((marker) => cat.includes(marker));

            if (periodicCategory) {
                const d = new Date(t.date || t.createdAt);
                let dateStr = '';

                if (cat.includes('সাপ্তাহিক')) {
                    dateStr = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
                } else if (cat.includes('বার্ষিক')) {
                    dateStr = d.toLocaleDateString('bn-BD', { year: 'numeric' });
                } else if (cat.includes('সামাসিক')) {
                    const half = d.getMonth() < 6 ? '১ম' : '২য়';
                    const y = d.toLocaleDateString('bn-BD', { year: 'numeric' });
                    dateStr = `${half} সামাসিক - ${y}`;
                } else {
                    const m = d.toLocaleDateString('bn-BD', { month: 'long' });
                    const y = d.toLocaleDateString('bn-BD', { year: 'numeric' });
                    dateStr = `${m} - ${y}`;
                }

                if (!note || note === 'ফি প্রদান' || note.includes('বকেয়া')) {
                    return `${dateStr}${partialSuffix}`;
                }
                return `${cleanedNote || dateStr}${partialSuffix}`;
            }

            if (cleanedNote) {
                return `${cleanedNote}${partialSuffix}`;
            }

            if (t.category && t.category !== cat) {
                return `${t.category}${partialSuffix}`;
            }

            return `ফি প্রদান${partialSuffix}`;
        };

        const qrCodeContent = !isLedger ? (
            <div className="flex flex-col items-center justify-center gap-1.5 opacity-90 -translate-y-2">
                <div className="p-1.5 border border-slate-300 rounded-lg bg-white">
                    <QRCodeSVG 
                        value={typeof window !== 'undefined' ? `${window.location.origin}/dashboard/students/profile/${transaction.studentId || ''}?tab=accounts` : ''} 
                        size={72} 
                        level="L" 
                    />
                </div>
                <span className="text-[11px] text-slate-500 font-bold tracking-wide">হিস্ট্রি স্ক্যান করুন</span>
            </div>
        ) : null;

        return (
            <PrintLayout 
                title={isLedger ? 'লেনদেন লেজার' : 'মানি রশিদ'} 
                institute={activeInstitute} 
                date={isLedger && generatedAt ? generatedDateStr : ''} 
                pageSize="A5"
                previewOnly={isPreview}
                hideLogo={true}
                footerCenterContent={qrCodeContent}
                pagePadding={24}
            >
                <div className="mb-3">
                    <div className="flex justify-between items-start mb-2" style={{ marginTop: isLedger ? '-50px' : '-15px' }}>
                        {/* Left: Date */}
                        <div className="text-left">
                            {!isLedger && (
                                <table className="border-collapse border border-slate-400 text-[13px] text-left min-w-[200px]">
                                    <tbody>
                                        <tr>
                                            <td className="border border-slate-400 px-2 py-1 font-bold text-slate-600 bg-slate-50 w-20">তারিখ</td>
                                            <td className="border border-slate-400 px-2 py-1 font-black text-slate-900">{new Date(transaction.createdAt || transaction.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Right: Receipt No */}
                        <div className="text-right">
                            <table className="border-collapse border border-slate-400 text-[13px] text-left min-w-[200px]">
                                <tbody>
                                    <tr>
                                        <td className="border border-slate-400 px-2 py-1 font-bold text-slate-600 bg-slate-50">{isLedger ? 'লেজার' : 'রশিদ নং'}</td>
                                        <td className="border border-slate-400 px-2 py-1 font-black text-slate-900 font-mono">{isLedger ? (transaction.studentUniqueId || 'লেজার') : (transaction.receiptNo || 'N/A')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <div className="grid grid-cols-[1.5fr_1fr] gap-x-2 gap-y-1">
                                <div className="flex items-center gap-1.5 text-[12px]">
                                    <span className="font-bold text-[#045c84] w-[70px] shrink-0">শিক্ষার্থীর নাম</span>
                                    <span className="font-bold text-[#045c84] shrink-0">:</span>
                                    <span className="font-black text-slate-900 text-[13px] truncate">{transaction.studentName || 'অজানা'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[12px]">
                                    <span className="font-bold text-[#045c84] w-[35px] shrink-0">আইডি</span>
                                    <span className="font-bold text-[#045c84] shrink-0">:</span>
                                    <span className="font-bold text-slate-800 truncate">{transaction.studentUniqueId || '-'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[12px]">
                                    <span className="font-bold text-[#045c84] w-[70px] shrink-0">পিতা</span>
                                    <span className="font-bold text-[#045c84] shrink-0">:</span>
                                    <span className="font-bold text-slate-800 truncate">{transaction.fatherName || '-'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[12px]">
                                    <span className="font-bold text-[#045c84] w-[35px] shrink-0">শ্রেণী</span>
                                    <span className="font-bold text-[#045c84] shrink-0">:</span>
                                    <span className="font-black text-[#045c84] truncate">{transaction.className || '-'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[12px] col-span-2">
                                    <span className="font-bold text-[#045c84] w-[70px] shrink-0">মোবাইল</span>
                                    <span className="font-bold text-[#045c84] shrink-0">:</span>
                                    <span className="font-bold text-slate-800 truncate">{transaction.mobileNumber || '-'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="shrink-0">
                            {transaction.studentPhoto ? (
                                <img src={transaction.studentPhoto} alt={transaction.studentName} className="w-20 h-24 rounded-xl object-cover border-2 border-slate-200 shadow-sm" />
                            ) : (
                                <div className="w-20 h-24 rounded-xl bg-slate-50 flex items-center justify-center border-2 border-slate-200 shadow-sm text-slate-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isLedger ? (
                    <div className="overflow-x-auto bg-white p-4 rounded-2xl mt-2">
                        <table className="w-full text-left border-collapse border border-slate-400">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-400">
                                    <th className="py-1 px-3 border border-slate-400 font-bold text-slate-700 text-[14px] w-12 text-center">ক্র.নং</th>
                                    <th className="py-1 px-3 border border-slate-400 font-bold text-slate-700 text-[14px]">রশিদ নং</th>
                                    <th className="py-1 px-3 border border-slate-400 font-bold text-slate-700 text-[14px]">তারিখ</th>
                                    <th className="py-1 px-3 border border-slate-400 font-bold text-slate-700 text-[14px]">বিবরণ / খাত</th>
                                    <th className="py-1 px-3 border border-slate-400 font-bold text-slate-700 text-right text-[14px]">পরিমাণ (টাকা)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTxns.map((t: any, idx: number) => {
                                    const feeLabel = buildFeeLabel(t, t.originalCategory || t.category || '');
                                    const dateStr = new Date(t.date || t.createdAt || transaction.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
                                    return (
                                        <tr key={`ledger-row-${idx}`}>
                                            <td className="py-1 px-3 border border-slate-400 text-slate-800 font-bold text-[14px] text-center">{idx + 1}</td>
                                            <td className="py-1 px-3 border border-slate-400 text-slate-800 text-[14px]">{t.receiptNo || '-'}</td>
                                            <td className="py-1 px-3 border border-slate-400 text-slate-800 text-[14px]">{dateStr}</td>
                                            <td className="py-1 px-3 border border-slate-400 text-slate-800 text-[14px]">{feeLabel}</td>
                                            <td className="py-1 px-3 border border-slate-400 text-slate-800 text-right text-[14px]">{(Number(t.amount) || 0).toLocaleString()}/-</td>
                                        </tr>
                                    );
                                })}
                                <tr>
                                    <td colSpan={4} className="py-1.5 px-3 border border-slate-400 text-right font-bold text-slate-800 text-[14px]">সর্বমোট:</td>
                                    <td className="py-1.5 px-3 border border-slate-400 text-right font-black text-[18px] text-slate-900 bg-slate-50/80">{transaction.amount.toLocaleString()}/-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <>
                    <table className="w-full text-left mt-2 mb-2 border-collapse border border-slate-400">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-400">
                                <th className="py-0.5 px-2 border border-slate-400 font-bold text-slate-700 w-10 text-[12px] text-center">ক্র.নং</th>
                                <th className="py-0.5 px-2 border border-slate-400 font-bold text-slate-700 text-[12px]">বিবরণ / খাত</th>
                                <th className="py-0.5 px-2 border border-slate-400 font-bold text-slate-700 text-right text-[12px] w-20">বকেয়া</th>
                                <th className="py-0.5 px-2 border border-slate-400 font-bold text-slate-700 text-right text-[12px] w-24">পরিশোধিত</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedByCategory).map(([categoryKey, group]: [string, any], gIdx) => (
                                <React.Fragment key={gIdx}>
                                    <tr className="bg-slate-50/50">
                                        <td className="py-0.5 px-2 border border-slate-400 text-slate-800 font-bold text-[12px] text-center">{gIdx + 1}</td>
                                        <td className="py-0.5 px-2 border border-slate-400 text-slate-800 font-bold text-[12px]">{categoryKey}</td>
                                        <td className="py-0.5 px-2 border border-slate-400 text-rose-600 font-bold text-right text-[12px]">{((categoryDues[categoryKey] || 0) + group.total).toLocaleString()}/-</td>
                                        <td className="py-0.5 px-2 border border-slate-400 text-slate-800 font-bold text-right text-[12px]">{group.total.toLocaleString()}/-</td>
                                    </tr>
                                    {group.items.map((t: any, idx: number) => {
                                        const feeLabel = buildFeeLabel(t, categoryKey);
                                        const isPartial = feeLabel.includes('(আংশিক');
                                        let dueBeforePaid = t.originalAmount !== undefined ? t.originalAmount : t.amount;
                                        
                                        if (isPartial) {
                                            const maxGroupAmount = Math.max(...group.items.map((it: any) => Number(it.originalAmount !== undefined ? it.originalAmount : it.amount)));
                                            if (maxGroupAmount > dueBeforePaid) {
                                                dueBeforePaid = maxGroupAmount;
                                            }
                                        }

                                        return (
                                            <tr key={`${gIdx}-${idx}`}>
                                                <td className="py-[1px] px-2 border border-slate-400"></td>
                                                <td className="py-[1px] px-2 border border-slate-400">
                                                    <div className="text-slate-600 text-[11px] flex items-center gap-2">
                                                        <span className="w-1 h-1 rounded-full bg-slate-400 inline-block mr-1"></span> {feeLabel}
                                                    </div>
                                                </td>
                                                <td className="py-[1px] px-2 border border-slate-400 text-rose-500/80 text-[11px] text-right">{dueBeforePaid.toLocaleString()}/-</td>
                                                <td className="py-[1px] px-2 border border-slate-400 text-slate-600 text-[11px] text-right">{t.amount.toLocaleString()}/-</td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                            <tr>
                                <td colSpan={3} className="py-1 px-2 border border-slate-400 text-right font-bold text-slate-800 text-[13px]">সর্বমোট:</td>
                                <td className="py-1 px-2 border border-slate-400 text-right font-black text-[15px] text-slate-900 bg-slate-50/80">
                                    {transaction.amount.toLocaleString()}/-
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div className="mt-3 flex flex-col gap-2">
                        <div className="text-[12px] text-slate-800 pb-1.5 border-b border-dashed border-slate-500">
                            <strong>কথায়:</strong> {numberToBanglaWords(transaction.amount)} টাকা মাত্র
                        </div>
                        
                        {overallDue !== null && (
                            <div className="border border-slate-800 rounded-md px-2 py-1.5 flex justify-between items-center bg-white w-full max-w-[300px] ml-auto">
                                <span className="font-bold text-slate-800 text-[12px]">বর্তমান মোট বকেয়া (পরিশোধের পর):</span>
                                <span className="font-bold text-[14px] text-rose-600">{overallDue.toLocaleString()}/-</span>
                            </div>
                        )}
                    </div>
                </>
                )}
            </PrintLayout>
        );
    };

    React.useEffect(() => {
        setGeneratedAt(new Date());

        const fetchDue = async () => {
            const studentId = transaction?.studentId;
            const instId = activeInstitute?.id || transaction?.instituteId;
            if (studentId && instId) {
                try {
                    const res = await fetch(`/api/admin/accounts/collect-fee?studentId=${studentId}&instituteId=${instId}`);
                    const data = await res.json();
                    if (data.pendingFees) {
                        const total = data.pendingFees.reduce((sum: number, f: any) => sum + f.amount, 0);
                        setOverallDue(total);
                        
                        const catDues: Record<string, number> = {};
                        data.pendingFees.forEach((f: any) => {
                            let rawCat = f.originalCategory || f.category;
                            let catKey = rawCat;
                            if (typeof rawCat === 'string') {
                                if (rawCat.startsWith('__ADVANCE__')) {
                                    catKey = 'অনির্ধারিত অগ্রিম জমা (Undefined Advance)';
                                } else {
                                    catKey = rawCat.replace(/\s*\([^)]*\)/g, '').trim();
                                }
                            }
                            catDues[catKey] = (catDues[catKey] || 0) + f.amount;
                        });
                        setCategoryDues(catDues);
                    }
                } catch (e) {
                    console.error('Failed to fetch overall due', e);
                }
            }
        };

        if (transaction && !isLedger) {
            fetchDue();
        }
    }, [transaction, activeInstitute?.id, isLedger]);

    if (!transaction) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 font-bengali">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, type: 'spring', bounce: 0 }}
                className="relative w-full max-w-[96vw] xl:max-w-[1100px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#045c84] to-[#067ab0] px-6 py-5 text-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <Receipt size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-wide">{isLedger ? 'লেনদেন লেজার' : 'রশিদ ও বিবরণ'}</h2>
                            <p className="text-[10px] text-white/70 font-bold tracking-widest">
                                {isLedger ? (transaction.studentName || 'শিক্ষার্থী') : (transaction.receiptNo || 'রশিদ নেই')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-200/50 flex justify-center items-start py-8 px-4" data-lenis-prevent>
                    <div className="shadow-2xl bg-white flex-shrink-0 rounded-xl border border-slate-200 overflow-hidden" style={{ width: isLedger ? 'min(210mm, 90vw)' : 'min(148mm, 84vw)', minHeight: isLedger ? '297mm' : '210mm' }}>
                        {renderReceiptContent(true)}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
                    <div className="flex gap-2">
                        <button
                            onClick={shareWhatsApp}
                            className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-100 hover:scale-105 transition-all shadow-sm"
                            title="WhatsApp এ শেয়ার করুন"
                        >
                            <MessageSquare size={16} />
                        </button>
                        <button
                            onClick={shareSMS}
                            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-100 hover:scale-105 transition-all shadow-sm"
                            title="SMS এ শেয়ার করুন"
                        >
                            <Share2 size={16} />
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            বন্ধ করুন
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-6 py-3 bg-[#045c84] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Printer size={16} /> {isLedger ? 'লেজার প্রিন্ট করুন' : 'রশিদ প্রিন্ট করুন'}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Print Layout Container (Hidden unless printing) */}
            {isPrinting && (
                <div className="hidden print:block print-only-container bg-white">
                    <div ref={printRef}>
                        {renderReceiptContent(false)}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
