'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, CheckCircle2, CreditCard, Clock, ArrowRight, AlertTriangle,
    TrendingUp, Zap, Wallet, Save, History, Receipt, BadgeCheck, Printer
} from 'lucide-react';
import { useSession } from '@/components/SessionProvider';

interface FeeCollectModalProps {
    student: {
        studentId: string;
        studentName: string;
        studentUniqueId: string;
        studentPhoto?: string | null;
        items: any[];
        totalAmount: number;
    } | null;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onPrintReceipt?: (txn: any) => void;
}

export default function FeeCollectModal({ student, onClose, onSuccess, onPrintReceipt }: FeeCollectModalProps) {
    const { activeInstitute } = useSession();

    // Tab state
    const [activeTab, setActiveTab] = useState<'dues' | 'history'>('dues');

    // Data state
    const [pendingFees, setPendingFees] = useState<any[]>([]);
    const [historyTxns, setHistoryTxns] = useState<any[]>([]);
    const [advanceBalance, setAdvanceBalance] = useState(0);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Form state
    const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string>>(new Set());
    const [paidAmount, setPaidAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [applyAdvanceTo, setApplyAdvanceTo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'select' | 'advance'>('select');
    const [result, setResult] = useState<any>(null);

    // Fetch pending fees + advance balance
    useEffect(() => {
        if (!student || !activeInstitute?.id) return;
        setLoadingData(true);
        fetch(`/api/admin/accounts/collect-fee?studentId=${student.studentId}&instituteId=${activeInstitute.id}`)
            .then(r => r.json())
            .then(data => {
                setPendingFees(data.pendingFees || student.items);
                setAdvanceBalance(data.advanceBalance || 0);
                const allIds = new Set<string>((data.pendingFees || student.items).map((f: any) => f.id));
                setSelectedFeeIds(allIds);
            })
            .catch(() => {
                setPendingFees(student.items);
                setSelectedFeeIds(new Set(student.items.map((f: any) => f.id)));
            })
            .finally(() => setLoadingData(false));
    }, [student?.studentId, activeInstitute?.id]);

    // Fetch history when history tab is opened
    useEffect(() => {
        if (activeTab !== 'history' || !student || !activeInstitute?.id) return;
        setLoadingHistory(true);
        fetch(`/api/admin/accounts?instituteId=${activeInstitute.id}`)
            .then(r => r.json())
            .then(data => {
                const txns = (data.transactions || []).filter(
                    (t: any) =>
                        t.studentId === student.studentId &&
                        t.status === 'COMPLETED' &&
                        t.type === 'INCOME' &&
                        !(typeof t.category === 'string' && t.category.startsWith('__ADVANCE__'))
                );
                // Group by receiptNo
                const groupedTxns: any[] = [];
                const receiptMap = new Map<string, any>();
                
                for (const t of txns) {
                    if (t.receiptNo) {
                        if (receiptMap.has(t.receiptNo)) {
                            const existing = receiptMap.get(t.receiptNo);
                            existing.amount += t.amount;
                            if (!existing.category.includes(t.category)) {
                                existing.category += `, ${t.category}`;
                            }
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

                // Sort newest first
                groupedTxns.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setHistoryTxns(groupedTxns);
            })
            .catch(() => setHistoryTxns([]))
            .finally(() => setLoadingHistory(false));
    }, [activeTab, student?.studentId, activeInstitute?.id]);

    // Totals
    const selectedFees = useMemo(() => pendingFees.filter(f => selectedFeeIds.has(f.id)), [pendingFees, selectedFeeIds]);
    const selectedTotal = useMemo(() => selectedFees.reduce((sum, f) => sum + f.amount, 0), [selectedFees]);
    const numericPaid = parseFloat(paidAmount) || 0;
    const totalAvailable = numericPaid + advanceBalance;
    const advanceToStore = Math.max(0, totalAvailable - selectedTotal);
    const shortfall = Math.max(0, selectedTotal - totalAvailable);
    const isOverpaying = totalAvailable > selectedTotal;
    const isExactOrUnder = totalAvailable <= selectedTotal && totalAvailable > 0;

    const totalPaid = useMemo(() => historyTxns.reduce((sum, t) => sum + t.amount, 0), [historyTxns]);

    const toggleFee = (id: string) => {
        setSelectedFeeIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedFeeIds.size === pendingFees.length) setSelectedFeeIds(new Set());
        else setSelectedFeeIds(new Set(pendingFees.map(f => f.id)));
    };

    const handleSetFullAmount = () => {
        setPaidAmount(Math.max(0, selectedTotal - advanceBalance).toString());
    };

    const handleSubmit = async () => {
        if (!student || !activeInstitute?.id) return;
        if (selectedFeeIds.size === 0 || (numericPaid <= 0 && advanceBalance <= 0)) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/accounts/collect-fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instituteId: activeInstitute.id,
                    studentId: student.studentId,
                    studentName: student.studentName,
                    paidAmount: numericPaid,
                    selectedFeeIds: Array.from(selectedFeeIds),
                    paymentNote,
                    applyAdvanceTo: applyAdvanceTo || undefined
                })
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
                if (data.advanceAmount > 0 && !applyAdvanceTo) {
                    const newPending = pendingFees.filter(f => !selectedFeeIds.has(f.id));
                    if (newPending.length > 0) {
                        setStep('advance');
                        setPendingFees(newPending);
                    } else {
                        onSuccess(data.message); onClose();
                        if (data.receiptDetails && onPrintReceipt) onPrintReceipt(data.receiptDetails);
                    }
                } else {
                    onSuccess(data.message); onClose();
                    if (data.receiptDetails && onPrintReceipt) onPrintReceipt(data.receiptDetails);
                }
            } else {
                alert(data.message || 'ত্রুটি হয়েছে');
            }
        } catch (err) { console.error(err); }
        finally { setIsSubmitting(false); }
    };

    const handleApplyAdvance = async () => {
        if (!student || !activeInstitute?.id || !applyAdvanceTo) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/accounts/collect-fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instituteId: activeInstitute.id,
                    studentId: student.studentId,
                    studentName: student.studentName,
                    paidAmount: 0,
                    selectedFeeIds: [],
                    applyAdvanceTo,
                })
            });
            const data = await res.json();
            if (res.ok) { 
                onSuccess(data.message); onClose(); 
                if (data.receiptDetails && onPrintReceipt) onPrintReceipt(data.receiptDetails);
            }
        } catch (err) { console.error(err); }
        finally { setIsSubmitting(false); }
    };

    if (!student) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-bengali">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#045c84] to-[#067ab0] px-6 py-5 text-white flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {student.studentPhoto ? (
                                <img src={student.studentPhoto} alt={student.studentName} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/30" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                                    {student.studentName[0]}
                                </div>
                            )}
                            <div>
                                <h2 className="text-base font-black tracking-wide">{student.studentName}</h2>
                                <p className="text-[10px] text-white/70 font-bold tracking-widest">ID: {student.studentUniqueId}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Tabs inside header */}
                    {step === 'select' && (
                        <div className="flex bg-white/10 rounded-xl p-1 gap-1">
                            <button
                                onClick={() => setActiveTab('dues')}
                                className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${activeTab === 'dues' ? 'bg-white text-[#045c84]' : 'text-white/70 hover:text-white'}`}
                            >
                                <Clock size={12} /> বকেয়া ফি
                                {pendingFees.length > 0 && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'dues' ? 'bg-amber-100 text-amber-600' : 'bg-white/20 text-white'}`}>
                                        {pendingFees.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${activeTab === 'history' ? 'bg-white text-[#045c84]' : 'text-white/70 hover:text-white'}`}
                            >
                                <History size={12} /> পেমেন্ট ইতিহাস
                            </button>
                        </div>
                    )}
                </div>

                {/* Advance Balance Banner */}
                {advanceBalance > 0 && step === 'select' && activeTab === 'dues' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        className="bg-emerald-50 border-b border-emerald-100 px-6 py-3 flex items-center gap-3 flex-shrink-0">
                        <Wallet size={16} className="text-emerald-600 flex-shrink-0" />
                        <p className="text-xs font-black text-emerald-700">
                            অগ্রিম ব্যালেন্স: <span className="text-emerald-600">৳ {advanceBalance.toLocaleString()}</span>
                            <span className="font-bold text-emerald-500 ml-2">— স্বয়ংক্রিয়ভাবে প্রয়োগ হবে</span>
                        </p>
                    </motion.div>
                )}

                {/* ── ADVANCE STEP ── */}
                {step === 'advance' && result && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-4" data-lenis-prevent>
                        <div className="bg-emerald-50 rounded-2xl p-4 text-center space-y-1">
                            <CheckCircle2 size={28} className="text-emerald-500 mx-auto" />
                            <p className="font-black text-emerald-800 text-sm">ফি সফলভাবে গ্রহণ হয়েছে!</p>
                            <p className="text-xs text-emerald-600 font-bold">রশিদ নং: <span className="font-black">{result.receiptNo}</span></p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={16} className="text-amber-600" />
                                <p className="text-xs font-black text-amber-800 uppercase tracking-widest">অগ্রিম ব্যালেন্স: ৳ {result.advanceAmount?.toLocaleString()}</p>
                            </div>
                            <p className="text-xs text-amber-700 font-bold mb-3">এই অতিরিক্ত অর্থ কোন খাতে প্রয়োগ করতে চান?</p>
                            {pendingFees.length > 0 ? (
                                <div className="space-y-2">
                                    {pendingFees.map(fee => (
                                        <label key={fee.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${applyAdvanceTo === fee.id ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-white hover:border-amber-200'}`}>
                                            <input type="radio" name="advanceTo" value={fee.id} checked={applyAdvanceTo === fee.id} onChange={() => setApplyAdvanceTo(fee.id)} className="w-4 h-4 text-amber-500" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-800 truncate">{fee.category}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{new Date(fee.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}</p>
                                            </div>
                                            <span className="text-xs font-black text-amber-600">৳ {fee.amount?.toLocaleString()}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-amber-600 font-bold text-center py-2">কোন বকেয়া ফি নেই — অগ্রিম সংরক্ষিত থাকবে</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { 
                                onSuccess(result.message); onClose(); 
                                if (result.receiptDetails && onPrintReceipt) onPrintReceipt(result.receiptDetails);
                            }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black text-xs rounded-xl hover:bg-slate-200 transition-colors">
                                সংরক্ষণ করুন ও রশিদ দেখুন
                            </button>
                            {applyAdvanceTo && pendingFees.length > 0 && (
                                <button onClick={handleApplyAdvance} disabled={isSubmitting} className="flex-1 py-3 bg-amber-500 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Zap size={14} /> এখনই প্রয়োগ করুন</>}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── DUES TAB ── */}
                {step === 'select' && activeTab === 'dues' && (
                    <>
                        <div className="flex-1 overflow-y-auto" data-lenis-prevent>
                            {loadingData ? (
                                <div className="p-10 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-[#045c84] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="p-6 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <button onClick={handleSelectAll} className="text-[10px] font-black text-[#045c84] uppercase tracking-widest hover:underline">
                                            {selectedFeeIds.size === pendingFees.length ? 'সব বাতিল করুন' : 'সব নির্বাচন করুন'}
                                        </button>
                                        <span className="text-[10px] font-bold text-slate-400">{pendingFees.length} টি বকেয়া</span>
                                    </div>
                                    {pendingFees.map(fee => {
                                        const isSelected = selectedFeeIds.has(fee.id);
                                        return (
                                            <motion.label key={fee.id} whileTap={{ scale: 0.99 }}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#045c84]/30 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-[#045c84] bg-[#045c84]' : 'border-slate-300'}`}>
                                                    {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                                    <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => toggleFee(fee.id)} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-xs text-slate-800 truncate">{fee.category}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                                        {new Date(fee.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        {fee.note && <span className="ml-2 text-slate-300">— {fee.note}</span>}
                                                    </p>
                                                </div>
                                                <span className="font-black text-sm text-amber-600 flex-shrink-0">৳ {fee.amount?.toLocaleString()}</span>
                                            </motion.label>
                                        );
                                    })}
                                    {pendingFees.length === 0 && (
                                        <div className="text-center py-16">
                                            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-200" />
                                            <p className="text-xs font-black text-slate-400">কোন বকেয়া নেই!</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Payment Panel */}
                        <div className="border-t border-slate-100 p-5 space-y-3 flex-shrink-0 bg-slate-50/60">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <CreditCard size={11} /> প্রদেয় পরিমাণ (৳)
                                </label>
                                <button onClick={handleSetFullAmount} className="text-[10px] font-black text-[#045c84] uppercase tracking-widest hover:underline">
                                    পূর্ণ পরিমাণ →
                                </button>
                            </div>
                            <input
                                type="number" min="0" step="1" value={paidAmount}
                                onChange={e => setPaidAmount(e.target.value)} placeholder="0"
                                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/10 transition-all font-black text-xl text-slate-800 text-center"
                            />
                            {selectedFees.length > 0 && (
                                <div className="space-y-1 text-xs font-bold">
                                    <div className="flex justify-between text-slate-500">
                                        <span>নির্বাচিত ({selectedFees.length} টি)</span>
                                        <span>৳ {selectedTotal.toLocaleString()}</span>
                                    </div>
                                    {advanceBalance > 0 && <div className="flex justify-between text-emerald-600"><span>অগ্রিম</span><span>+ ৳ {advanceBalance.toLocaleString()}</span></div>}
                                    <div className="border-t border-slate-200 pt-1">
                                        {shortfall > 0 && numericPaid > 0 && <div className="flex justify-between text-amber-600 font-black"><span className="flex items-center gap-1"><AlertTriangle size={10} /> বাকি থাকবে</span><span>৳ {shortfall.toLocaleString()}</span></div>}
                                        {isOverpaying && <div className="flex justify-between text-emerald-600 font-black"><span className="flex items-center gap-1"><Zap size={10} /> অগ্রিম জমা</span><span>৳ {advanceToStore.toLocaleString()}</span></div>}
                                        {isExactOrUnder && !isOverpaying && numericPaid > 0 && <div className="flex justify-between text-[#045c84] font-black"><span className="flex items-center gap-1"><CheckCircle2 size={10} /> মোট পরিশোধ</span><span>৳ {totalAvailable.toLocaleString()}</span></div>}
                                    </div>
                                </div>
                            )}
                            <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                                placeholder="নোট (ঐচ্ছিক)..."
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:border-[#045c84] transition-all" />
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || selectedFeeIds.size === 0 || (numericPaid <= 0 && advanceBalance <= 0)}
                                className="w-full py-4 bg-[#045c84] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all hover:bg-[#034f73] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={15} />{numericPaid <= 0 && advanceBalance > 0 ? 'অগ্রিম দিয়ে পরিশোধ' : 'ফি গ্রহণ করুন'}</>}
                            </button>
                        </div>
                    </>
                )}

                {/* ── HISTORY TAB ── */}
                {step === 'select' && activeTab === 'history' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Summary bar */}
                        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <BadgeCheck size={15} className="text-emerald-600" />
                                <span className="text-xs font-black text-emerald-700">{historyTxns.length} টি পেমেন্ট সম্পন্ন</span>
                            </div>
                            <span className="text-sm font-black text-emerald-700">৳ {totalPaid.toLocaleString()}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto" data-lenis-prevent>
                            {loadingHistory ? (
                                <div className="p-10 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-[#045c84] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : historyTxns.length === 0 ? (
                                <div className="p-12 text-center">
                                    <History size={40} className="mx-auto mb-3 text-slate-200" />
                                    <p className="text-xs font-black text-slate-400">কোন পেমেন্ট ইতিহাস পাওয়া যায়নি</p>
                                </div>
                            ) : (
                                <div className="p-5 space-y-2">
                                    {historyTxns.map(txn => (
                                        <div key={txn.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                                <Receipt size={15} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-xs text-slate-800 truncate">{txn.category}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {txn.receiptNo && (
                                                        <span className="text-[9px] font-black text-[#045c84] bg-blue-50 px-2 py-0.5 rounded-full">{txn.receiptNo}</span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {new Date(txn.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                {txn.note && txn.note !== '' && (
                                                    <p className="text-[9px] text-slate-300 font-bold mt-0.5 truncate">{txn.note}</p>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-black text-sm text-emerald-600 mb-1">৳ {txn.amount?.toLocaleString()}</p>
                                                {onPrintReceipt && txn.receiptNo && (
                                                    <button 
                                                        onClick={() => onPrintReceipt(txn)}
                                                        className="text-[9px] font-black text-[#045c84] bg-blue-50 px-2 py-1 rounded-lg tracking-widest uppercase hover:bg-[#045c84] hover:text-white transition-all w-full flex items-center justify-center gap-1"
                                                    >
                                                        <Printer size={10} /> প্রিন্ট
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
