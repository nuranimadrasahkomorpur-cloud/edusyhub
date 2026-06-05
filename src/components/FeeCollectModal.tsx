'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, CheckCircle2, CreditCard, Clock, ArrowRight, AlertTriangle,
    TrendingUp, Zap, Wallet, Save, History, Receipt, BadgeCheck, Printer, MessageSquare, ChevronDown, Tag
} from 'lucide-react';
import { useSession } from '@/components/SessionProvider';
import { createPortal } from 'react-dom';

interface FeeCollectModalProps {
    student: {
        studentId: string;
        studentName: string;
        studentUniqueId: string;
        studentPhoto?: string | null;
        items: any[];
        totalAmount: number;
        scannedAt?: string; // ISO timestamp when QR code was scanned
        scannedId?: string; // The actual scanned QR/barcode value
    } | null;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onPrintReceipt?: (txn: any) => void;
}

export default function FeeCollectModal({ student, onClose, onSuccess, onPrintReceipt }: FeeCollectModalProps) {
    const { activeInstitute } = useSession();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Emit modal open/close events to pause smooth scroll
    useEffect(() => {
        if (student && mounted) {
            window.dispatchEvent(new Event('modalOpen'));
            return () => {
                window.dispatchEvent(new Event('modalClose'));
            };
        }
    }, [student, mounted]);

    // Tab state
    const [activeTab, setActiveTab] = useState<'dues' | 'history'>('dues');

    // Data state
    const [pendingFees, setPendingFees] = useState<any[]>([]);
    const [upcomingFees, setUpcomingFees] = useState<any[]>([]);
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
    const [autoAllocateUpcoming, setAutoAllocateUpcoming] = useState(true);
    const [keepAsAdvance, setKeepAsAdvance] = useState(true);
    const [showNote, setShowNote] = useState(false);
    const [useAdvanceBalance, setUseAdvanceBalance] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [localWaivers, setLocalWaivers] = useState<Record<string, { amount: number, applyToFuture: boolean }>>({});
    const [activeWaiverId, setActiveWaiverId] = useState<string | null>(null);
    
    // Helper to get effective fee amount
    const getFeeAmount = (fee: any) => Math.max(0, (fee.amount || 0) - (localWaivers[fee.id]?.amount || 0));

    // Fetch pending fees + advance balance
    useEffect(() => {
        if (!student || !activeInstitute?.id) return;
        setLoadingData(true);
        fetch(`/api/admin/accounts/collect-fee?studentId=${student.studentId}&instituteId=${activeInstitute.id}`)
            .then(r => r.json())
            .then(data => {
                const fees = data?.pendingFees || data?.items || [];
                setPendingFees(fees);
                setUpcomingFees(data?.upcomingFees || []);
                setAdvanceBalance(data?.advanceBalance || 0);
                const allIds = new Set<string>(fees.map((f: any) => f.id).filter(Boolean));
                setSelectedFeeIds(allIds);
                // Auto-expand all category groups
                const baseNames = new Set<string>(fees.map((f: any) => f.category?.replace(/\s*\(.*?\)\s*/g, '').trim()).filter(Boolean));
                setExpandedGroups(baseNames);
            })
            .catch((err) => {
                console.error('Error fetching fees:', err);
                // Use fallback data from student.items if available
                const fallbackFees = student.items || [];
                setPendingFees(fallbackFees);
                const allIds = new Set<string>(fallbackFees.map((f: any) => f?.id).filter(Boolean));
                setSelectedFeeIds(allIds);
                const baseNames = new Set<string>(fallbackFees.map((f: any) => f?.category?.replace(/\s*\(.*?\)\s*/g, '').trim()).filter(Boolean));
                setExpandedGroups(baseNames);
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
    const allFees = useMemo(() => [...pendingFees, ...upcomingFees], [pendingFees, upcomingFees]);
    const selectedFees = useMemo(() => allFees.filter(f => selectedFeeIds.has(f.id)), [allFees, selectedFeeIds]);
    const selectedTotal = useMemo(() => selectedFees.reduce((sum, f) => sum + getFeeAmount(f), 0), [selectedFees, localWaivers]);
    const pendingTotal = useMemo(() => pendingFees.reduce((sum, f) => sum + getFeeAmount(f), 0), [pendingFees, localWaivers]);
    const numericPaid = parseFloat(paidAmount) || 0;
    const totalAvailable = numericPaid + (useAdvanceBalance ? advanceBalance : 0);

    const visibleUpcomingFees = useMemo(() => {
        let remaining = Math.max(0, totalAvailable - pendingTotal);
        const visible = [];
        for (const fee of upcomingFees) {
            if (remaining > 0) {
                visible.push(fee);
                remaining -= fee.amount;
            } else {
                break;
            }
        }
        return visible;
    }, [totalAvailable, pendingTotal, upcomingFees]);

    const advanceToStore = Math.max(0, totalAvailable - selectedTotal);
    const shortfall = Math.max(0, selectedTotal - totalAvailable);
    const isOverpaying = totalAvailable > selectedTotal;
    const isExactOrUnder = totalAvailable <= selectedTotal && totalAvailable > 0;

    const totalPaid = useMemo(() => historyTxns.reduce((sum, t) => sum + t.amount, 0), [historyTxns]);

    const toggleFee = (id: string) => {
        setSelectedFeeIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            // Auto-update paid amount to match new selected total
            const newTotal = allFees.filter(f => next.has(f.id)).reduce((sum, f) => sum + getFeeAmount(f), 0);
            const netAmount = Math.max(0, newTotal - (useAdvanceBalance ? advanceBalance : 0));
            setPaidAmount(netAmount > 0 ? String(netAmount) : '0');
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedFeeIds.size === pendingFees.length) {
            setSelectedFeeIds(new Set());
            setPaidAmount('0');
        } else {
            const allPendingIds = new Set(pendingFees.map(f => f.id));
            setSelectedFeeIds(allPendingIds);
            const total = pendingFees.reduce((sum, f) => sum + getFeeAmount(f), 0);
            const netAmount = Math.max(0, total - (useAdvanceBalance ? advanceBalance : 0));
            setPaidAmount(netAmount > 0 ? String(netAmount) : '0');
        }
    };

    const handleAmountChange = (val: string, autoAllocate = autoAllocateUpcoming, useAdv = useAdvanceBalance) => {
        setPaidAmount(val);
        const numeric = parseFloat(val) || 0;
        let remaining = numeric + (useAdv ? advanceBalance : 0);
        
        const newSelected = new Set<string>();
        // Allow paying partial amounts - if amount > 0, select at least the first pending fee
        if (numeric > 0 || (useAdv && advanceBalance > 0)) {
            // First try to satisfy pending fees
            for (const fee of pendingFees) {
                const amt = getFeeAmount(fee);
                if (remaining > 0) {
                    newSelected.add(fee.id);
                    remaining -= amt;
                    if (remaining <= 0) break; // Stop when we've allocated all amount
                }
            }
            // Then apply to upcoming fees if enabled and not returning change
            if (autoAllocate && keepAsAdvance && remaining > 0) {
                for (const fee of upcomingFees) {
                    const amt = getFeeAmount(fee);
                    if (remaining > 0) {
                        newSelected.add(fee.id);
                        remaining -= amt;
                        if (remaining <= 0) break; // Stop when we've allocated all amount
                    }
                }
            }
        }
        setSelectedFeeIds(newSelected);
    };

    // Recalculate auto-allocation when toggles change
    useEffect(() => {
        if (paidAmount) handleAmountChange(paidAmount, autoAllocateUpcoming, useAdvanceBalance);
    }, [autoAllocateUpcoming, useAdvanceBalance, keepAsAdvance]);

    const handleSetFullAmount = () => {
        setPaidAmount(Math.max(0, selectedTotal - (useAdvanceBalance ? advanceBalance : 0)).toString());
    };

    const handleSubmit = async () => {
        if (!student || !activeInstitute?.id) return;
        if (selectedFeeIds.size === 0 || (numericPaid <= 0 && advanceBalance <= 0)) return;
        setIsSubmitting(true);
        
        const actualPaidAmount = keepAsAdvance ? numericPaid : Math.max(0, numericPaid - advanceToStore);
        
        try {
            const res = await fetch('/api/admin/accounts/collect-fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instituteId: activeInstitute.id,
                    studentId: student.studentId,
                    studentName: student.studentName,
                    paidAmount: actualPaidAmount,
                    selectedFeeIds: Array.from(selectedFeeIds).filter(id => !id.startsWith('future_')),
                    futureFeesToCreate: selectedFees.filter(f => f.status === 'PREDICTED'),
                    paymentNote,
                    applyAdvanceTo: applyAdvanceTo || undefined,
                    useAdvance: useAdvanceBalance,
                    appliedWaivers: Object.entries(localWaivers).map(([feeId, data]) => ({
                        feeId,
                        amount: data.amount,
                        applyToFuture: data.applyToFuture,
                        categoryId: pendingFees.find(f => f.id === feeId)?.categoryId || ''
                    }))
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
                        if (data.receiptDetails && onPrintReceipt) onPrintReceipt(data.receiptDetails);
                        onSuccess(data.message); onClose();
                    }
                } else {
                    if (data.receiptDetails && onPrintReceipt) onPrintReceipt(data.receiptDetails);
                    onSuccess(data.message); onClose();
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
                if (data.receiptDetails && onPrintReceipt) onPrintReceipt(data.receiptDetails);
                onSuccess(data.message); onClose(); 
            }
        } catch (err) { console.error(err); }
        finally { setIsSubmitting(false); }
    };

    // Ensure modal only renders after successful scan
    if (!student || !mounted || !student.studentId || !student.studentName) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-bengali">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                style={{ willChange: 'opacity' }}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, type: 'spring', bounce: 0.3 }}
                className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[85vh]"
                style={{ willChange: 'transform, opacity' }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#045c84] to-[#067ab0] px-6 py-5 text-white flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {student.studentPhoto ? (
                                <img src={student.studentPhoto} alt={student.studentName} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/30" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                                    {(student.studentName || 'S')[0]}
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
                                if (result.receiptDetails && onPrintReceipt) onPrintReceipt(result.receiptDetails);
                                onSuccess(result.message); onClose(); 
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
                        <div className="flex-1 overflow-y-auto min-h-[340px]" data-lenis-prevent>
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
                                    {(() => {
                                        // Group fees by base category name (strip date suffix in parens)
                                        const groups: Record<string, any[]> = {};
                                        pendingFees.forEach(fee => {
                                            const base = fee.category.replace(/\s*\(.*?\)\s*/g, '').trim();
                                            if (!groups[base]) groups[base] = [];
                                            groups[base].push(fee);
                                        });

                                        const groupEntries = Object.entries(groups);

                                        return groupEntries.map(([groupName, fees]) => {
                                            const isExpanded = expandedGroups.has(groupName);
                                            const groupTotal = fees.reduce((s, f) => s + getFeeAmount(f), 0);
                                            const selectedInGroup = fees.filter(f => selectedFeeIds.has(f.id)).length;
                                            const allInGroupSelected = selectedInGroup === fees.length;

                                            const toggleGroup = () => {
                                                setExpandedGroups(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(groupName)) next.delete(groupName);
                                                    else next.add(groupName);
                                                    return next;
                                                });
                                            };

                                            const toggleGroupSelection = (e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                const newSet = new Set(selectedFeeIds);
                                                if (allInGroupSelected) {
                                                    fees.forEach(f => newSet.delete(f.id));
                                                } else {
                                                    fees.forEach(f => newSet.add(f.id));
                                                }
                                                setSelectedFeeIds(newSet);
                                                const newTotal = allFees.filter(f => newSet.has(f.id)).reduce((s, f) => s + getFeeAmount(f), 0);
                                                const net = Math.max(0, newTotal - (useAdvanceBalance ? advanceBalance : 0));
                                                setPaidAmount(net > 0 ? String(net) : '0');
                                            };

                                            return (
                                                <div key={groupName} className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                    {/* Group Header — visually distinct */}
                                                    <div
                                                        onClick={toggleGroup}
                                                        className={`flex items-center gap-3 px-4 py-3.5 border-l-4 ${allInGroupSelected ? 'border-l-[#045c84] bg-gradient-to-r from-blue-50 to-slate-50' : selectedInGroup > 0 ? 'border-l-amber-400 bg-gradient-to-r from-amber-50 to-slate-50' : 'border-l-slate-300 bg-gradient-to-r from-slate-100 to-white'} cursor-pointer transition-all`}
                                                    >
                                                        {/* Group checkbox */}
                                                        <div
                                                            onClick={toggleGroupSelection}
                                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${allInGroupSelected ? 'border-[#045c84] bg-[#045c84]' : selectedInGroup > 0 ? 'border-amber-400 bg-amber-400' : 'border-slate-300 bg-white'}`}
                                                        >
                                                            {allInGroupSelected && <CheckCircle2 size={11} className="text-white" />}
                                                            {!allInGroupSelected && selectedInGroup > 0 && <div className="w-2 h-0.5 bg-white rounded" />}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-[13px] text-slate-900 tracking-tight">{groupName}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] font-bold text-slate-500">{fees.length} টি বকেয়া</span>
                                                                {selectedInGroup > 0 && (
                                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${allInGroupSelected ? 'bg-[#045c84]/10 text-[#045c84]' : 'bg-amber-100 text-amber-600'}`}>
                                                                        {selectedInGroup} নির্বাচিত
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-black text-sm flex-shrink-0 ${allInGroupSelected ? 'text-[#045c84]' : 'text-amber-600'}`}>৳ {groupTotal.toLocaleString()}</span>
                                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${isExpanded ? 'bg-[#045c84]/10 rotate-180' : 'bg-slate-100'}`}>
                                                                <ChevronDown size={14} className={isExpanded ? 'text-[#045c84]' : 'text-slate-500'} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Group Items */}
                                                    {isExpanded && (
                                                        <div className="divide-y divide-slate-100 bg-white">
                                                            {fees.map(fee => {
                                                                const isSelected = selectedFeeIds.has(fee.id);
                                                                // Extract only the sub-part (text inside parentheses) or fallback to date
                                                                const match = fee.category.match(/\(([^)]+)\)/);
                                                                const subLabel = match ? match[1] : new Date(fee.date).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
                                                                const activeWaiver = localWaivers[fee.id];
                                                                const effectiveAmount = Math.max(0, (fee.amount || 0) - (activeWaiver?.amount || 0));
                                                                const isWaiverOpen = activeWaiverId === fee.id;

                                                                return (
                                                                    <div key={fee.id} className="flex flex-col border-b border-slate-100 last:border-0">
                                                                        <div
                                                                            onClick={() => toggleFee(fee.id)}
                                                                            className={`flex items-center gap-3 pl-10 pr-3 py-3 cursor-pointer transition-all ${isSelected ? 'bg-blue-50/40' : 'bg-white hover:bg-slate-50/80'}`}
                                                                        >
                                                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-[#045c84] bg-[#045c84]' : 'border-slate-300'}`}>
                                                                                {isSelected && <CheckCircle2 size={10} className="text-white" />}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="font-bold text-xs text-slate-700 truncate flex items-center gap-2">
                                                                                    {subLabel}
                                                                                    {activeWaiver?.amount > 0 && (
                                                                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] rounded-full font-black whitespace-nowrap">
                                                                                            -৳{activeWaiver.amount}
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                                {fee.note && <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">— {fee.note}</p>}
                                                                            </div>
                                                                            
                                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setActiveWaiverId(isWaiverOpen ? null : fee.id);
                                                                                    }}
                                                                                    className={`p-2.5 rounded-lg transition-all flex-shrink-0 ${isWaiverOpen || activeWaiver?.amount > 0 ? 'bg-emerald-100 text-emerald-600 shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                                                                                    title="ছাড় দিন"
                                                                                >
                                                                                    <Tag size={14} className={activeWaiver?.amount > 0 ? 'fill-emerald-200' : ''} />
                                                                                </button>
                                                                                
                                                                                <div className="text-right min-w-[48px]">
                                                                                    <span className="font-black text-xs text-amber-600">৳ {effectiveAmount.toLocaleString()}</span>
                                                                                    {activeWaiver?.amount > 0 && (
                                                                                        <p className="text-[9px] text-slate-400 line-through">৳ {fee.amount?.toLocaleString()}</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <AnimatePresence>
                                                                            {isWaiverOpen && (
                                                                                <motion.div
                                                                                    initial={{ height: 0, opacity: 0 }}
                                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                                    exit={{ height: 0, opacity: 0 }}
                                                                                    className="overflow-hidden bg-emerald-50/60 border-t border-emerald-100"
                                                                                >
                                                                                    <div className="p-3 pl-10 pr-3">
                                                                                        {/* Label Row */}
                                                                                        <div className="flex items-center gap-3 mb-1.5">
                                                                                            <span className="w-[110px] flex-shrink-0 text-xs font-black text-slate-500">ছাড়ের পরিমাণ (৳)</span>
                                                                                            <span className="flex-1 text-xs font-black text-slate-500">পরবর্তী ফি-তেও প্রযোজ্য</span>
                                                                                        </div>
                                                                                        {/* Control Row */}
                                                                                        <div className="flex items-center gap-3">
                                                                                            {/* Amount Input — text type removes browser spinners */}
                                                                                            <input
                                                                                                type="text"
                                                                                                inputMode="numeric"
                                                                                                pattern="[0-9]*"
                                                                                                value={activeWaiver?.amount || ''}
                                                                                                onChange={(e) => {
                                                                                                    const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                                                                                    const clampedVal = Math.min(val, fee.amount);
                                                                                                    setLocalWaivers(prev => {
                                                                                                        const next = {
                                                                                                            ...prev,
                                                                                                            [fee.id]: { amount: clampedVal, applyToFuture: prev[fee.id]?.applyToFuture || false }
                                                                                                        };
                                                                                                        if (selectedFeeIds.has(fee.id)) {
                                                                                                            const newTotal = selectedFees.reduce((s, f) => {
                                                                                                                const w = f.id === fee.id ? clampedVal : ((next as Record<string, { amount: number, applyToFuture: boolean }>)[f.id]?.amount || 0);
                                                                                                                return s + Math.max(0, f.amount - w);
                                                                                                            }, 0);
                                                                                                            const net = Math.max(0, newTotal - (useAdvanceBalance ? advanceBalance : 0));
                                                                                                            setPaidAmount(net > 0 ? String(net) : '0');
                                                                                                        }
                                                                                                        return next;
                                                                                                    });
                                                                                                }}
                                                                                                className="w-[110px] flex-shrink-0 h-[54px] bg-white border-2 border-emerald-200 rounded-lg px-3 text-lg font-bold text-slate-800 focus:outline-none focus:border-[#045c84] transition-colors [&::-webkit-search-cancel-button]:hidden [&::-ms-clear]:hidden [&::-webkit-contacts-auto-fill-button]:hidden"
                                                                                                placeholder="0"
                                                                                            />
                                                                                            {/* Checkbox */}
                                                                                            <label className="flex-1 h-[54px] flex items-center gap-2.5 cursor-pointer bg-white border-2 border-slate-100 rounded-lg px-3">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={activeWaiver?.applyToFuture || false}
                                                                                                    onChange={(e) => {
                                                                                                        setLocalWaivers(prev => ({
                                                                                                            ...prev,
                                                                                                            [fee.id]: { amount: prev[fee.id]?.amount || 0, applyToFuture: e.target.checked }
                                                                                                        }));
                                                                                                    }}
                                                                                                    className="w-4 h-4 rounded border-slate-300 text-[#045c84] focus:ring-[#045c84] flex-shrink-0 cursor-pointer"
                                                                                                />
                                                                                                <span className="text-xs font-bold text-slate-700 leading-tight">পরবর্তীতেও</span>
                                                                                            </label>
                                                                                            {/* Save Button */}
                                                                                            <button
                                                                                                onClick={() => setActiveWaiverId(null)}
                                                                                                className="h-[54px] px-5 bg-[#045c84] text-white text-xs font-black rounded-lg hover:bg-[#034664] transition-colors whitespace-nowrap flex-shrink-0"
                                                                                            >
                                                                                                সংরক্ষণ
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                    {pendingFees.length === 0 && (
                                        <div className="text-center py-16">
                                            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-200" />
                                            <p className="text-xs font-black text-slate-400">কোন বকেয়া নেই!</p>
                                        </div>
                                    )}

                                    {visibleUpcomingFees.length > 0 && (
                                        <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200/60">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                <TrendingUp size={12} /> আগামীর ফি (স্বয়ংক্রিয়ভাবে প্রযোজ্য)
                                            </h3>
                                            <div className="space-y-3 opacity-90">
                                                {visibleUpcomingFees.map(fee => {
                                                    const isSelected = selectedFeeIds.has(fee.id);
                                                    return (
                                                        <motion.label key={fee.id} whileTap={{ scale: 0.99 }}
                                                            className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-emerald-500/30 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'}`}>
                                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                                                {isSelected && <CheckCircle2 size={10} className="text-white" />}
                                                                <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => toggleFee(fee.id)} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-xs text-slate-700 truncate">{fee.category}</p>
                                                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                                    {new Date(fee.date).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <span className="font-black text-xs text-emerald-600 flex-shrink-0">৳ {fee.amount?.toLocaleString()}</span>
                                                        </motion.label>
                                                    );
                                                })}
                                            </div>
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
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" min="0" step="1" value={paidAmount}
                                    onChange={e => handleAmountChange(e.target.value)} placeholder="0"
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/10 transition-all font-black text-xl text-slate-800 text-center"
                                />
                                {!showNote && (
                                    <button 
                                        type="button"
                                        onClick={() => setShowNote(true)}
                                        className="shrink-0 w-[52px] h-[52px] flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-[#045c84] rounded-2xl transition-all"
                                        title="নোট যুক্ত করুন"
                                    >
                                        <MessageSquare size={20} />
                                    </button>
                                )}
                            </div>
                            {advanceBalance > 0 && (
                                <div className="flex justify-between items-center text-emerald-600 text-[10px] font-bold bg-emerald-50/50 px-3 py-2 rounded-xl border border-emerald-100">
                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={useAdvanceBalance} 
                                            onChange={(e) => setUseAdvanceBalance(e.target.checked)} 
                                            className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600 bg-white" 
                                        />
                                        <span>অগ্রিম ব্যবহার করুন</span>
                                    </label>
                                    <span className="font-black">৳ {advanceBalance.toLocaleString()}</span>
                                </div>
                            )}
                            {selectedFees.length > 0 && (
                                <div className="space-y-2 text-[10px] font-bold">
                                    <div className="border-t border-slate-200 pt-2 space-y-1">
                                        {numericPaid > 0 && numericPaid < selectedTotal && (
                                            <div className="flex justify-between text-blue-600">
                                                <span>আরও প্রয়োজন</span>
                                                <span>৳ {(selectedTotal - numericPaid).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {numericPaid > 0 && (
                                            <div className="flex justify-between text-purple-600">
                                                <span>পরবর্তী বাকি</span>
                                                <span>৳ {Math.max(0, pendingTotal - totalAvailable).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {(isOverpaying || totalAvailable > pendingTotal) && (
                                <div className="flex gap-2 w-full mb-3">
                                    {isOverpaying && (
                                        <div className={`flex-1 flex flex-col justify-center p-2 rounded-xl border transition-colors ${keepAsAdvance ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                            <label className="flex items-start gap-2 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={keepAsAdvance} 
                                                    onChange={(e) => setKeepAsAdvance(e.target.checked)} 
                                                    className={`mt-0.5 w-4 h-4 rounded focus:ring-2 shrink-0 ${keepAsAdvance ? 'border-emerald-400 text-emerald-600 focus:ring-emerald-200 bg-white' : 'border-amber-400 text-amber-600 focus:ring-amber-200 bg-white'}`} 
                                                />
                                                <div className="flex flex-col">
                                                    <span className="flex items-center gap-1 font-bold text-[10px] leading-tight">
                                                        {keepAsAdvance ? <><Zap size={10} /> অগ্রিম জমা</> : <><ArrowRight size={10} /> ফেরত দিন</>}
                                                    </span>
                                                    <span className="font-black text-sm mt-0.5">৳ {advanceToStore.toLocaleString()}</span>
                                                </div>
                                            </label>
                                        </div>
                                    )}
                                    {upcomingFees.length > 0 && keepAsAdvance && (
                                        <label className={`flex items-start gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-2 rounded-xl hover:bg-slate-100 transition-colors ${!isOverpaying ? 'w-full' : 'flex-1'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={autoAllocateUpcoming} 
                                                onChange={(e) => setAutoAllocateUpcoming(e.target.checked)} 
                                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#045c84] focus:ring-[#045c84]/30 bg-white shrink-0" 
                                            />
                                            <span className="text-[10px] font-bold text-slate-600 leading-tight">অতিরিক্ত টাকা আগামী ফি-এর জন্য স্বয়ংক্রিয়ভাবে কাটুন</span>
                                        </label>
                                    )}
                                </div>
                            )}
                            
                            {showNote && (
                                <div className="relative animate-in fade-in slide-in-from-top-2">
                                    <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                                        placeholder="নোট লিখুন..."
                                        autoFocus
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:border-[#045c84] transition-all pr-10" />
                                    <button 
                                        onClick={() => { setShowNote(false); setPaymentNote(''); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || selectedFeeIds.size === 0 || (numericPaid <= 0 && (!useAdvanceBalance || advanceBalance <= 0))}
                                className="w-full mt-2 py-4 bg-[#045c84] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all hover:bg-[#034f73] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={15} />{numericPaid <= 0 && useAdvanceBalance && advanceBalance > 0 ? 'অগ্রিম দিয়ে পরিশোধ' : 'ফি গ্রহণ করুন'}</>}
                            </button>
                        </div>
                    </>
                )}

                {/* ── HISTORY TAB ── */}
                {step === 'select' && activeTab === 'history' && (
                    <div className="flex-1 flex flex-col overflow-hidden min-h-[340px]">
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
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <p className="font-black text-sm text-emerald-600">৳ {txn.amount?.toLocaleString()}</p>
                                                {onPrintReceipt && txn.receiptNo && (
                                                    <button 
                                                        onClick={() => onPrintReceipt(txn)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-[#045c84] hover:bg-[#045c84] hover:text-white transition-all flex-shrink-0"
                                                        title="রশিদ প্রিন্ট করুন"
                                                    >
                                                        <Printer size={14} />
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
        </div>,
        document.body
    );
}
