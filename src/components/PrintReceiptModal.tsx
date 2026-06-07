'use client';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Printer, Receipt, CheckCircle2, MessageSquare, Share2 } from 'lucide-react';
import { useSession } from '@/components/SessionProvider';
import PrintLayout from '@/components/PrintLayout';

interface PrintReceiptModalProps {
    transaction: any;
    onClose: () => void;
}

export default function PrintReceiptModal({ transaction, onClose }: PrintReceiptModalProps) {
    const { activeInstitute } = useSession();
    const [isPrinting, setIsPrinting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

    const handlePrint = () => {
        setIsPrinting(true);

        // Inject temporary print-only CSS so only the modal's print container prints
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-modal-print', 'true');
        styleEl.innerHTML = `
            @media print {
                body * { visibility: hidden !important; }
                .print-only-container, .print-only-container * { visibility: visible !important; }
                .print-only-container { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: auto !important; }
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

        if (!acc[catKey]) acc[catKey] = { items: [], total: 0 };
        acc[catKey].items.push({ ...t, parsedSubName: subName });
        acc[catKey].total += t.amount;
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

        return (
            <PrintLayout 
                title={isLedger ? 'লেনদেন লেজার' : 'মানি রশিদ'} 
                institute={activeInstitute} 
                date={isLedger && generatedAt ? generatedDateStr : ''} 
                pageSize="auto"
                previewOnly={isPreview}
                hideLogo={true}
            >
                <div className="mb-6">
                    <div className="flex justify-between items-start mb-4" style={isLedger ? { marginTop: '-50px' } : undefined}>
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
                            <div className="grid grid-cols-[100px_10px_1fr] gap-x-2 gap-y-0.5 text-[14px]">
                                <div className="font-bold text-[#045c84]">শিক্ষার্থীর নাম</div>
                                <div className="font-bold text-[#045c84] text-center">:</div>
                                <div className="font-black text-slate-900 text-[16px]">{transaction.studentName || 'অজানা'}</div>

                                <div className="font-bold text-[#045c84]">আইডি</div>
                                <div className="font-bold text-[#045c84] text-center">:</div>
                                <div className="font-black text-slate-800">{transaction.studentUniqueId || '-'}</div>

                                <div className="font-bold text-[#045c84]">পিতা</div>
                                <div className="font-bold text-[#045c84] text-center">:</div>
                                <div className="font-bold text-slate-800">{transaction.fatherName || '-'}</div>

                                <div className="font-bold text-[#045c84]">মোবাইল</div>
                                <div className="font-bold text-[#045c84] text-center">:</div>
                                <div className="font-bold text-slate-800">{transaction.mobileNumber || '-'}</div>

                                {transaction.className && (
                                    <>
                                        <div className="font-bold text-[#045c84]">শ্রেণী</div>
                                        <div className="font-bold text-[#045c84] text-center">:</div>
                                        <div className="font-black text-[#045c84]">{transaction.className}</div>
                                    </>
                                )}
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
                    <div className="overflow-x-auto bg-white p-4 rounded-2xl mt-6">
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
                    <table className="w-full text-left mt-6 mb-2 border-collapse border border-slate-400">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-400">
                                <th className="py-1 px-3 border border-slate-400 font-bold text-slate-700 w-12 text-[14px] text-center">ক্র.নং</th>
                                <th className="py-1 px-3 border border-slate-400 font-bold text-slate-700 text-[14px]">বিবরণ / খাত</th>
                                <th className="py-1 px-3 border border-slate-400 font-bold text-slate-700 text-right text-[14px]">পরিমাণ (টাকা)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedByCategory).map(([categoryKey, group]: [string, any], gIdx) => (
                                <React.Fragment key={gIdx}>
                                    <tr className="bg-slate-50/50">
                                        <td className="py-1 px-3 border border-slate-400 text-slate-800 font-bold text-[14px] text-center">{gIdx + 1}</td>
                                        <td className="py-1 px-3 border border-slate-400 text-slate-800 font-bold text-[14px]">{categoryKey}</td>
                                        <td className="py-1 px-3 border border-slate-400 text-slate-800 font-bold text-right text-[14px]">{group.total.toLocaleString()}/-</td>
                                    </tr>
                                    {group.items.map((t: any, idx: number) => {
                                        const feeLabel = buildFeeLabel(t, categoryKey);
                                        return (
                                            <tr key={`${gIdx}-${idx}`}>
                                                <td className="py-0.5 px-3 border border-slate-400"></td>
                                                <td className="py-0.5 px-3 border border-slate-400">
                                                    <div className="text-slate-600 text-[12px] flex items-center gap-2">
                                                        <span className="w-1 h-1 rounded-full bg-slate-400 inline-block mr-1"></span> {feeLabel}
                                                    </div>
                                                </td>
                                                <td className="py-0.5 px-3 border border-slate-400 text-slate-600 text-[12px] text-right">{t.amount.toLocaleString()}/-</td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                            <tr>
                                <td colSpan={2} className="py-1.5 px-3 border border-slate-400 text-right font-bold text-slate-800 text-[14px]">সর্বমোট:</td>
                                <td className="py-1.5 px-3 border border-slate-400 text-right font-black text-[18px] text-slate-900 bg-slate-50/80">{transaction.amount.toLocaleString()}/-</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </PrintLayout>
        );
    };

    const [mounted, setMounted] = useState(false);
    
    React.useEffect(() => {
        setMounted(true);
        setGeneratedAt(new Date());
    }, []);

    if (!transaction || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 font-bengali">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
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
                    <div className="shadow-2xl bg-white flex-shrink-0 rounded-xl border border-slate-200" style={{ width: isLedger ? 'min(210mm, 90vw)' : 'min(180mm, 84vw)' }}>
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
                <div className="fixed inset-0 z-[1000] bg-white print-only-container">
                    <div ref={printRef}>
                        {renderReceiptContent(false)}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
