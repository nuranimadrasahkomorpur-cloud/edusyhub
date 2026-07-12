'use client';

import React, { useEffect, useState } from 'react';
import PrintLayout from '@/components/PrintLayout';

export default function PublicLedgerPage({ params }: { params: { studentId: string } }) {
    const { studentId } = params;
    const [transactions, setTransactions] = useState<any[]>([]);
    const [student, setStudent] = useState<any>(null);
    const [institute, setInstitute] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!studentId) return;

        const fetchData = async () => {
            try {
                // Fetch student and institute details (using an existing public endpoint if available, 
                // or we can rely on the transaction data which has some student info).
                // But /api/admin/accounts?studentId=... returns transactions which contain student details.
                const res = await fetch(`/api/admin/accounts?studentId=${studentId}`);
                if (!res.ok) throw new Error('Failed to load ledger');
                const data = await res.json();
                
                const txns = (data.transactions || []).filter(
                    (t: any) =>
                        t.studentId === studentId &&
                        t.status === 'COMPLETED' &&
                        t.type === 'INCOME' &&
                        !(typeof t.category === 'string' && t.category.startsWith('__ADVANCE__'))
                );

                // Group by receiptNo (same logic as FeeCollectModal)
                const groupedTxns: any[] = [];
                const receiptMap = new Map<string, any>();
                
                for (const t of txns) {
                    if (t.receiptNo) {
                        if (receiptMap.has(t.receiptNo)) {
                            const existing = receiptMap.get(t.receiptNo);
                            existing.amount += t.amount;
                            existing.subTransactions.push(t);
                        } else {
                            const copy = { ...t, subTransactions: [t] };
                            receiptMap.set(t.receiptNo, copy);
                            groupedTxns.push(copy);
                        }
                    } else {
                        groupedTxns.push({ ...t, subTransactions: [t] });
                    }
                }

                for (const g of groupedTxns) {
                    if (g.subTransactions && g.subTransactions.length > 1) {
                        const baseCount: Record<string, number> = {};
                        g.subTransactions.forEach((st: any) => {
                            const base = st.category ? st.category.replace(/\s*\(.*?\)\s*/g, '').trim() : 'অন্যান্য ফি';
                            baseCount[base] = (baseCount[base] || 0) + 1;
                        });
                        const parts = Object.entries(baseCount).map(([base, count]) => {
                            if (count > 1) {
                                const suffix = (base.includes('মাস') || base.includes('বেতন')) ? 'মাস' : 'টি';
                                return `${base} (${count} ${suffix})`;
                            }
                            const singleTxn = g.subTransactions.find((st: any) => (st.category ? st.category.replace(/\s*\(.*?\)\s*/g, '').trim() : 'অন্যান্য ফি') === base);
                            return singleTxn?.category || base;
                        });
                        g.category = parts.join(', ');
                    }
                }

                // Sort newest first
                groupedTxns.sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
                setTransactions(groupedTxns);

                // Extract student/institute info from the first transaction
                if (groupedTxns.length > 0) {
                    const firstTx = groupedTxns[0];
                    setStudent({
                        studentName: firstTx.studentName,
                        studentUniqueId: firstTx.studentUniqueId,
                        fatherName: firstTx.fatherName,
                        className: firstTx.className,
                        mobileNumber: firstTx.mobileNumber
                    });
                    
                    // Fetch institute data to get the logo/name if needed.
                    if (firstTx.instituteId) {
                        const instRes = await fetch(`/api/public/institute/${firstTx.instituteId}`);
                        if (instRes.ok) {
                            const instData = await instRes.json();
                            if (instData) setInstitute(instData);
                        }
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [studentId]);

    const buildFeeLabel = (t: any, defaultCat: string) => {
        let label = t.note ? `${defaultCat} - ${t.note}` : defaultCat;
        if (t.originalAmount !== undefined && Number(t.originalAmount) > Number(t.amount)) {
            label += ' (আংশিক)';
        }
        return label;
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bengali">লোড হচ্ছে...</div>;
    if (error) return <div className="p-8 text-center text-rose-500 font-bengali">{error}</div>;
    if (transactions.length === 0) return <div className="p-8 text-center text-slate-500 font-bengali">কোনো লেনদেন পাওয়া যায়নি</div>;

    const totalPaid = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const sortedTxns = [...transactions].reverse(); // Oldest first for ledger print

    return (
        <div className="min-h-screen bg-slate-200/50 font-bengali flex flex-col items-center">
            {/* Action Bar (hidden in print) */}
            <div className="w-full bg-gradient-to-r from-[#045c84] to-[#067ab0] p-4 flex justify-center print:hidden shadow-md z-10">
                <div className="w-full max-w-[210mm] flex justify-between items-center px-2">
                    <h1 className="text-white font-black text-lg tracking-wide">লেনদেন লেজার</h1>
                    <button 
                        onClick={() => window.print()}
                        className="px-5 py-2.5 bg-white text-[#045c84] rounded-xl font-bold text-sm shadow-md hover:bg-slate-50 transition-colors"
                    >
                        প্রিন্ট করুন
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full flex justify-center items-start py-8 px-2 sm:px-4 print:p-0">
                <div 
                    className="shadow-2xl bg-white flex-shrink-0 rounded-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none" 
                    style={{ width: 'min(210mm, 100vw)', minHeight: '297mm' }}
                >
                    <div className="p-4 sm:p-8">
                    <PrintLayout 
                        title="লেনদেন লেজার" 
                        institute={institute || { name: 'Education Institute' }} 
                        date={new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                        previewOnly={true}
                    >
                        {/* Student Details Header */}
                        <div className="mt-4 mb-6 relative">
                            <div className="absolute inset-0 bg-slate-50/50 rounded-2xl border border-slate-200"></div>
                            <div className="relative p-5 flex items-start justify-between gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                        <div className="flex items-center gap-1.5 text-[12px]">
                                            <span className="font-bold text-[#045c84] w-[70px] shrink-0">শিক্ষার্থীর নাম</span>
                                            <span className="font-bold text-[#045c84] shrink-0">:</span>
                                            <span className="font-black text-slate-900 truncate">{student?.studentName || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[12px]">
                                            <span className="font-bold text-[#045c84] w-[35px] shrink-0">আইডি</span>
                                            <span className="font-bold text-[#045c84] shrink-0">:</span>
                                            <span className="font-bold text-slate-800 truncate">{student?.studentUniqueId || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[12px]">
                                            <span className="font-bold text-[#045c84] w-[70px] shrink-0">পিতা</span>
                                            <span className="font-bold text-[#045c84] shrink-0">:</span>
                                            <span className="font-bold text-slate-800 truncate">{student?.fatherName || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[12px]">
                                            <span className="font-bold text-[#045c84] w-[35px] shrink-0">শ্রেণী</span>
                                            <span className="font-bold text-[#045c84] shrink-0">:</span>
                                            <span className="font-black text-[#045c84] truncate">{student?.className || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[12px] col-span-2">
                                            <span className="font-bold text-[#045c84] w-[70px] shrink-0">মোবাইল</span>
                                            <span className="font-bold text-[#045c84] shrink-0">:</span>
                                            <span className="font-bold text-slate-800 truncate">{student?.mobileNumber || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

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
                                        const dateStr = new Date(t.createdAt || t.date || t.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
                                        
                                        let rowSpan = 1;
                                        let isFirstInGroup = true;
                                        if (idx > 0 && sortedTxns[idx - 1].receiptNo === t.receiptNo && t.receiptNo) {
                                            isFirstInGroup = false;
                                        } else if (t.receiptNo) {
                                            let nextIdx = idx + 1;
                                            while (nextIdx < sortedTxns.length && sortedTxns[nextIdx].receiptNo === t.receiptNo) {
                                                rowSpan++;
                                                nextIdx++;
                                            }
                                        }

                                        let serialCounter = 0;
                                        let lastReceipt = null;
                                        for (let i = 0; i <= idx; i++) {
                                            if (sortedTxns[i].receiptNo !== lastReceipt || !sortedTxns[i].receiptNo) {
                                                serialCounter++;
                                                lastReceipt = sortedTxns[i].receiptNo;
                                            }
                                        }

                                        return (
                                            <tr key={`ledger-row-${idx}`}>
                                                {isFirstInGroup && (
                                                    <td className="py-1 px-3 border border-slate-400 text-slate-800 font-bold text-[14px] align-middle text-center" rowSpan={rowSpan}>{serialCounter}</td>
                                                )}
                                                {isFirstInGroup && (
                                                    <>
                                                        <td className="py-1 px-3 border border-slate-400 text-slate-800 text-[14px] align-middle text-center" rowSpan={rowSpan}>{t.receiptNo || '-'}</td>
                                                        <td className="py-1 px-3 border border-slate-400 text-slate-800 text-[14px] align-middle text-center" rowSpan={rowSpan}>{dateStr}</td>
                                                    </>
                                                )}
                                                <td className="py-1 px-3 border border-slate-400 text-slate-800 text-[14px]">{feeLabel}</td>
                                                <td className="py-1 px-3 border border-slate-400 text-slate-800 text-right text-[14px]">{(Number(t.amount) || 0).toLocaleString()}/-</td>
                                            </tr>
                                        );
                                    })}
                                    <tr>
                                        <td colSpan={4} className="py-1.5 px-3 border border-slate-400 text-right font-bold text-slate-800 text-[14px]">সর্বমোট:</td>
                                        <td className="py-1.5 px-3 border border-slate-400 text-right font-black text-[18px] text-slate-900 bg-slate-50/80">{totalPaid.toLocaleString()}/-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </PrintLayout>
                    </div>
                </div>
            </div>
            
            {/* Global print styles to make the ledger look like the PrintReceiptModal */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden !important; }
                    .print-area, .print-area * { visibility: visible !important; }
                    .print-area { 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}
