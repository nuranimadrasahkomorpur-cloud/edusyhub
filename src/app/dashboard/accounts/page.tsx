'use client';

import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    DollarSign,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    Download,
    Edit2,
    Trash2,
    Plus,
    Calendar,
    Users,
    ChevronRight,
    ChevronDown,
    Check,
    Loader2,
    MoreVertical,
    CheckCircle2,
    Clock,
    AlertCircle,
    Wallet,
    Receipt,
    PlusCircle
} from 'lucide-react';
import { useSession } from '@/components/SessionProvider';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeBengaliDigits } from '@/utils/digit-utils';
import AddCategoryModal from '@/components/AddCategoryModal';
import AddTransactionModal from '@/components/AddTransactionModal';
import FeeCollectModal from '@/components/FeeCollectModal';
import PrintReceiptModal from '@/components/PrintReceiptModal';
import Toast from '@/components/Toast';


export default function AccountsPage() {
    const { activeInstitute } = useSession();
    const [activeMainTab, setActiveMainTab] = useState<'overview' | 'income' | 'expense'>('overview'); 
    const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'pending' | 'categories'>('transactions');
    const [searchQuery, setSearchQuery] = useState('');
    const [addTrigger, setAddTrigger] = useState(0);
    const [accountData, setAccountData] = useState<{ summary: any, transactions: any[] }>({
        summary: null,
        transactions: []
    });
    const [loading, setLoading] = useState(true);
    const [dueGroupMode, setDueGroupMode] = useState<'person' | 'type'>('person');
    const [selectedStudentDetails, setSelectedStudentDetails] = useState<any | null>(null);
    const [selectedTypeDetails, setSelectedTypeDetails] = useState<any | null>(null);
    const [orphanedCategoryToDelete, setOrphanedCategoryToDelete] = useState<string | null>(null);
    const [deleteCountdown, setDeleteCountdown] = useState<number>(5);
    const [isDeletingProgress, setIsDeletingProgress] = useState<boolean>(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [feeCollectStudent, setFeeCollectStudent] = useState<any | null>(null);
    const [selectedTransactionForPrint, setSelectedTransactionForPrint] = useState<any | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<any | null>(null);
    const [isDeletingTxn, setIsDeletingTxn] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (selectedStudentDetails || selectedTypeDetails || orphanedCategoryToDelete) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedStudentDetails, selectedTypeDetails, orphanedCategoryToDelete]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isDeletingProgress && orphanedCategoryToDelete !== null) {
            setDeleteCountdown(5);
            timer = setInterval(() => {
                setDeleteCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        executeDeleteOrphanedCategory();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isDeletingProgress, orphanedCategoryToDelete]);

    const fetchAccounts = async () => {
        if (!activeInstitute?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/accounts?instituteId=${activeInstitute.id}&_cb=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (res.ok) {
                setAccountData(data);
            }
        } catch (err) {
            console.error("Fetch accounts error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [activeInstitute?.id]);

    const handleDeleteOrphanedCategory = (categoryName: string) => {
        setOrphanedCategoryToDelete(categoryName);
    };

    const executeDeleteOrphanedCategory = async () => {
        if (!activeInstitute?.id || !orphanedCategoryToDelete) return;
        try {
            const res = await fetch(`/api/admin/accounts?instituteId=${activeInstitute.id}&category=${encodeURIComponent(orphanedCategoryToDelete)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok) {
                await fetchAccounts();
                setToast({ message: 'সফলভাবে বকেয়া ফি মুছে ফেলা হয়েছে।', type: 'success' });
                setOrphanedCategoryToDelete(null);
                setIsDeletingProgress(false);
            } else {
                setToast({ message: `ত্রুটি: ${data.message || 'মুছে ফেলা যায়নি'}`, type: 'error' });
                setIsDeletingProgress(false);
            }
        } catch (err) {
            console.error("Delete orphaned category error:", err);
            setToast({ message: 'একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন।', type: 'error' });
            setIsDeletingProgress(false);
        }
    };

    const handleDeleteTransaction = async () => {
        if (!transactionToDelete) return;
        setIsDeletingTxn(true);
        try {
            const res = await fetch(`/api/admin/accounts/transactions/${transactionToDelete.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setToast({ message: 'লেনদেন সফলভাবে মুছে ফেলা হয়েছে', type: 'success' });
                fetchAccounts();
                setTransactionToDelete(null);
            } else {
                const data = await res.json();
                setToast({ message: data.message || 'লেনদেন মুছতে সমস্যা হয়েছে', type: 'error' });
            }
        } catch (error) {
            console.error('Delete transaction error:', error);
            setToast({ message: 'নেটওয়ার্ক সমস্যা', type: 'error' });
        } finally {
            setIsDeletingTxn(false);
        }
    };

    const stats = useMemo(() => {
        const s = accountData.summary;
        if (activeMainTab === 'income') {
            return [
                { label: 'মোট আয়', value: `৳ ${s?.totalIncome?.toLocaleString() || '০'}`, change: s?.incomeChange || '+০%', trend: 'up', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'বকেয়া ফি', value: `৳ ${s?.pendingFees?.toLocaleString() || '০'}`, change: s?.pendingChange || '-০%', trend: 'down', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            ];
        } else if (activeMainTab === 'expense') {
            return [
                { label: 'মোট ব্যয়', value: `৳ ${s?.totalExpense?.toLocaleString() || '০'}`, change: s?.expenseChange || '+০%', trend: 'up', icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
                { label: 'বর্তমান ব্যালেন্স (আয়-ব্যয়)', value: `৳ ${s?.balance?.toLocaleString() || '০'}`, change: s?.balanceChange || '+০%', trend: 'up', icon: Wallet, color: 'text-[#045c84]', bg: 'bg-blue-50' },
            ];
        } else {
            const cards = [
                { label: 'মোট আয়', value: `৳ ${s?.totalIncome?.toLocaleString() || '০'}`, change: s?.incomeChange || '+০%', trend: 'up', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'মোট ব্যয়', value: `৳ ${s?.totalExpense?.toLocaleString() || '০'}`, change: s?.expenseChange || '+০%', trend: 'up', icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
                { label: 'বকেয়া ফি', value: `৳ ${s?.pendingFees?.toLocaleString() || '০'}`, change: s?.pendingChange || '-০%', trend: 'down', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'বর্তমান ব্যালেন্স', value: `৳ ${s?.balance?.toLocaleString() || '০'}`, change: s?.balanceChange || '+০%', trend: 'up', icon: Wallet, color: 'text-[#045c84]', bg: 'bg-blue-50' },
            ];
            if (s?.advanceBalance > 0) {
                cards.push({ label: 'অগ্রিম জমা (শিক্ষার্থী)', value: `৳ ${s?.advanceBalance?.toLocaleString() || '০'}`, change: '+০%', trend: 'up', icon: PlusCircle, color: 'text-violet-600', bg: 'bg-violet-50' });
            }
            return cards;
        }
    }, [accountData.summary, activeMainTab]);

    const filteredTransactions = useMemo(() => {
        let txns = accountData.transactions || [];
        
        // Always hide internal advance bookkeeping entries from the visible list
        txns = txns.filter(t => !(typeof t.category === 'string' && t.category.startsWith('__ADVANCE__')));
        
        if (activeMainTab === 'overview') {
            if (activeSubTab === 'transactions') {
                txns = txns.filter(t => t.status?.toUpperCase() === 'COMPLETED');
            } else if (activeSubTab === 'pending') {
                txns = txns.filter(t => t.status?.toUpperCase() === 'PENDING');
            } else {
                txns = [];
            }
        } else if (activeMainTab === 'income') {
            if (activeSubTab === 'transactions') {
                txns = txns.filter(t => t.type?.toUpperCase() === 'INCOME' && t.status?.toUpperCase() === 'COMPLETED');
            } else if (activeSubTab === 'pending') {
                txns = txns.filter(t => t.type?.toUpperCase() === 'INCOME' && t.status?.toUpperCase() === 'PENDING');
            } else {
                txns = [];
            }
        } else if (activeMainTab === 'expense') {
            if (activeSubTab === 'transactions') {
                txns = txns.filter(t => t.type?.toUpperCase() === 'EXPENSE' && t.status?.toUpperCase() === 'COMPLETED');
            } else {
                txns = [];
            }
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            txns = txns.filter(t => 
                t.category?.toLowerCase().includes(q) || 
                t.studentName?.toLowerCase().includes(q) ||
                t.note?.toLowerCase().includes(q) ||
                t.receiptNo?.toLowerCase().includes(q)
            );
        }

        // Group by receiptNo for COMPLETED transactions so that multi-fee receipts show as a single row
        const groupedTxns: any[] = [];
        const receiptMap = new Map<string, any>();

        for (const t of txns) {
            if (t.status?.toUpperCase() === 'COMPLETED' && t.receiptNo) {
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

        return groupedTxns;
    }, [accountData.transactions, activeMainTab, activeSubTab, searchQuery]);

    const personWiseDues = useMemo(() => {
        if (activeSubTab !== 'pending') return [];
        const pendingTxns = filteredTransactions || [];
        
        const groups: Record<string, { studentName: string; studentId: string; studentUniqueId: string; studentPhoto: string | null; items: any[]; totalAmount: number }> = {};
        
        pendingTxns.forEach(t => {
            const key = t.studentId || t.studentName || 'unknown';
            if (!groups[key]) {
                groups[key] = {
                    studentName: t.studentName || 'অজানা',
                    studentId: t.studentId || 'N/A',
                    studentUniqueId: t.studentUniqueId || t.studentId || 'N/A',
                    studentPhoto: t.studentPhoto || null,
                    items: [],
                    totalAmount: 0
                };
            }
            groups[key].items.push(t);
            groups[key].totalAmount += t.amount || 0;
        });
        
        return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [filteredTransactions, activeSubTab]);

    const typeWiseDues = useMemo(() => {
        if (activeSubTab !== 'pending') return [];
        const pendingTxns = filteredTransactions || [];
        
        const groups: Record<string, { category: string; originalCategory: string; items: any[]; totalAmount: number; categoryExists: boolean }> = {};
        
        pendingTxns.forEach(t => {
            const key = t.category || 'অন্যান্য';
            if (!groups[key]) {
                groups[key] = {
                    category: key,
                    originalCategory: t.originalCategory || key,
                    items: [],
                    totalAmount: 0,
                    categoryExists: t.categoryExists !== false
                };
            }
            groups[key].items.push(t);
            groups[key].totalAmount += t.amount || 0;
        });
        
        return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [filteredTransactions, activeSubTab]);



    const renderStatus = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full"><CheckCircle2 size={12} /> সফল</span>;
            case 'PENDING':
                return <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full"><Clock size={12} /> পেন্ডিং</span>;
            case 'CANCELLED':
                return <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full"><AlertCircle size={12} /> বাতিল</span>;
            default:
                return <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full"><AlertCircle size={12} /> {status}</span>;
        }
    };

    const renderTableContent = () => {
        if (loading) {
            return (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">আইডি</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">বিবরণ, খাত ও ব্যক্তি</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">পরিমাণ</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">তারিখ</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">অবস্থা</th>
                            <th className="px-8 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {[...Array(5)].map((_, i) => (
                            <tr key={i} className="animate-pulse">
                                <td colSpan={7} className="px-8 py-6"><div className="h-4 bg-slate-50 rounded-full w-full" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        if (activeSubTab === 'pending' && dueGroupMode === 'person') {
            return (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">শিক্ষার্থীর তথ্য</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">বকেয়া খাতের সংখ্যা</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">মোট বকেয়া পরিমাণ</th>
                            <th className="px-8 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {personWiseDues.length > 0 ? (
                            personWiseDues.map((student) => {
                                return (
                                    <tr 
                                        key={student.studentId}
                                        onClick={() => setSelectedStudentDetails(student)}
                                        className="group cursor-pointer hover:bg-slate-50/50 transition-all duration-300"
                                    >
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                {student.studentPhoto ? (
                                                    <img src={student.studentPhoto} alt={student.studentName} className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-xs">
                                                        {student.studentName[0] || 'S'}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-black text-xs text-slate-800">{student.studentName}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 tracking-tight">ID: {student.studentUniqueId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-xs text-slate-700">
                                            {student.items.length} টি ফি
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-xs text-amber-600">
                                            ৳ {student.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button
                                                className="w-8 h-8 bg-slate-50 text-slate-400 group-hover:text-[#045c84] group-hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center ml-auto"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-10 py-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Search size={48} className="text-slate-200" />
                                        <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">বকেয়া ফি পাওয়া যায়নি</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            );
        }

        if (activeSubTab === 'pending' && dueGroupMode === 'type') {
            return (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ফি-এর ধরণ / খাত</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">বকেয়া শিক্ষার্থীর সংখ্যা</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">মোট বকেয়া পরিমাণ</th>
                            <th className="px-8 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {typeWiseDues.length > 0 ? (
                            typeWiseDues.map((group) => {
                                return (
                                    <tr 
                                        key={group.category}
                                        onClick={() => setSelectedTypeDetails(group)}
                                        className="group cursor-pointer hover:bg-slate-50/50 transition-all duration-300"
                                    >
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                                    !group.categoryExists ? 'bg-rose-50 text-rose-600' : 'bg-purple-50 text-purple-600'
                                                }`}>
                                                    <Receipt size={14} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-xs text-slate-800">{group.category}</p>
                                                        {!group.categoryExists && (
                                                            <span className="px-2 py-0.5 text-[9px] font-black tracking-wider text-rose-600 bg-rose-50 rounded-full border border-rose-100">
                                                                মুছে ফেলা খাত
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-xs text-slate-700">
                                            {group.items.length} জন শিক্ষার্থী
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-xs text-amber-600">
                                            ৳ {group.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!group.categoryExists && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteOrphanedCategory(group.category);
                                                        }}
                                                        className="w-8 h-8 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-all flex items-center justify-center"
                                                        title="বকেয়া ফি মুছুন"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    className="w-8 h-8 bg-slate-50 text-slate-400 group-hover:text-[#045c84] group-hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center ml-auto"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-10 py-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Search size={48} className="text-slate-200" />
                                        <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">বকেয়া ফি পাওয়া যায়নি</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            );
        }

        // Default 'all' or other tabs
        return (
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50">
                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">রশিদ/ভাউচার নং</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">বিবরণ, খাত ও ব্যক্তি</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">পরিমাণ</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">তারিখ</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">অবস্থা</th>
                        <th className="px-8 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((txn: any) => (
                            <tr key={txn.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                                <td className="px-8 py-4">
                                    <span className="font-mono text-[9px] font-black text-[#045c84] bg-blue-50 px-2 py-1 rounded-lg tracking-tighter border border-blue-100">
                                        {txn.receiptNo || `#${txn.id.slice(-6).toUpperCase()}`}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${txn.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            <Receipt size={14} />
                                        </div>
                                        <div>
                                            <p className="font-black text-xs text-slate-800">{txn.category}</p>
                                            <p className="text-[9px] font-bold text-slate-400 tracking-tight">{txn.studentName || 'অজানা'}{txn.studentUniqueId ? ` (ID: ${txn.studentUniqueId})` : ''}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className={`px-6 py-4 text-right font-black text-xs ${txn.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ৳ {txn.amount?.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center text-[10px] font-black text-slate-400">
                                    {new Date(txn.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                                </td>
                                <td className="px-6 py-4">
                                    {renderStatus(txn.status)}
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => setTransactionToDelete(txn)}
                                            className="px-3 py-1.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                                            title="মুছুন"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        {txn.status?.toUpperCase() === 'COMPLETED' && txn.receiptNo && txn.type === 'INCOME' && (
                                            <button 
                                                onClick={() => setSelectedTransactionForPrint(txn)}
                                                className="px-3 py-1.5 bg-blue-50 text-[#045c84] hover:bg-[#045c84] hover:text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                                            >
                                                <Receipt size={12} /> রশিদ প্রিন্ট
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="px-10 py-32 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-40">
                                    <Search size={48} className="text-slate-200" />
                                    <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">লেনদেন পাওয়া যায়নি</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        );
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in font-bengali min-h-screen bg-slate-50/50">
            {/* Global Dashboard Header - Unified Navigation and Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300">
                {/* Main Navigation Tabs */}
                <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => { setActiveMainTab('overview'); setActiveSubTab('transactions'); }}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${activeMainTab === 'overview'
                            ? 'bg-[#045c84] text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Wallet size={14} /> ওভারভিউ
                    </button>
                    <button
                        onClick={() => { setActiveMainTab('income'); setActiveSubTab('transactions'); }}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 ${activeMainTab === 'income'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <TrendingUp size={14} /> আয় (Income)
                    </button>
                    <button
                        onClick={() => { setActiveMainTab('expense'); setActiveSubTab('transactions'); }}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 ${activeMainTab === 'expense'
                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <TrendingDown size={14} /> ব্যয় (Expense)
                    </button>
                </div>

                {/* Global Search and Actions */}
                <div className="flex items-center gap-4 flex-1 lg:max-w-2xl justify-end">
                    <div className="relative group flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#045c84] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder={activeSubTab === 'categories' ? "খাত খুঁজুন..." : "লেনদেন খুঁজুন..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-6 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold placeholder:text-slate-400 focus:ring-1 focus:ring-[#045c84]/10 w-full transition-all"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                                <Plus className="rotate-45" size={16} />
                            </button>
                        )}
                    </div>
                    {activeSubTab === 'categories' ? (
                        <button 
                            id="add-category-btn-global"
                            onClick={() => setAddTrigger(prev => prev + 1)}
                            className={`px-6 py-2.5 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap ${
                                activeMainTab === 'income' ? 'bg-emerald-600 hover:shadow-emerald-100' : 
                                activeMainTab === 'expense' ? 'bg-rose-600 hover:shadow-rose-100' : 
                                'bg-[#045c84] hover:shadow-blue-100'
                            }`}
                        >
                            <Plus size={16} /> নতুন {activeMainTab === 'income' ? 'আয়ের ' : activeMainTab === 'expense' ? 'ব্যয়ের ' : ''}খাত
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center">
                                <Filter size={18} />
                            </button>
                            <button className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center">
                                <Download size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeMainTab}
                    initial={{ opacity: 0, scale: 0.98, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -30 }}
                    transition={{ 
                        type: "spring",
                        damping: 25,
                        stiffness: 200,
                        mass: 0.8
                    }}
                    className="space-y-10"
                >
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center shadow-sm`}>
                                            <stat.icon size={24} />
                                        </div>
                                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {stat.change}
                                            {stat.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-0.5">{stat.label}</h3>
                                        <p className="text-2xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Content Area (Table & Sub-tabs) */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col transition-all">
                        {/* Sub-tab Navigation */}
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-2xl w-fit">
                                {['transactions', 'categories', ...((activeMainTab === 'income' || activeMainTab === 'overview') ? ['pending'] : [])].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveSubTab(tab as any)}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab
                                                ? 'bg-white text-[#045c84] shadow-sm'
                                                : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {tab === 'transactions' ? 'লেনদেন সমূহ' :
                                         tab === 'categories' ? 'খাত সমূহ' : 'বকেয়া ফি'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-4">
                                {activeSubTab === 'pending' && (
                                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
                                        {[
                                            { id: 'person', label: 'শিক্ষার্থী ভিত্তিক' },
                                            { id: 'type', label: 'ফি-এর ধরণ ভিত্তিক' }
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                onClick={() => setDueGroupMode(mode.id as any)}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                                    dueGroupMode === mode.id
                                                        ? 'bg-[#045c84] text-white shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                {mode.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {activeSubTab === 'categories' ? '' :
                                         activeSubTab === 'pending' && dueGroupMode === 'person' ? `${personWiseDues.length} জন` :
                                         activeSubTab === 'pending' && dueGroupMode === 'type' ? `${typeWiseDues.length} টি খাত` :
                                         `${filteredTransactions.length} টি লেনদেন`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {activeSubTab === 'categories' ? (
                            <div className="p-6">
                                <CategoryManagementView 
                                    externalSearchQuery={searchQuery} 
                                    addTrigger={addTrigger}
                                    forcedType={activeMainTab === 'overview' ? undefined : activeMainTab}
                                />
                            </div>
                        ) : (
                            <>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`${activeSubTab}_${activeSubTab === 'pending' ? dueGroupMode : 'all'}`}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex-1 overflow-x-auto"
                                    >
                                        {renderTableContent()}
                                    </motion.div>
                                </AnimatePresence>

                                {/* Enhanced Pagination Controls */}
                                <div className="px-8 py-4 border-t border-slate-50 flex items-center justify-between bg-white mt-auto">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">১-৫ (মোট ২,৪৫০টি)</p>
                                    <div className="flex items-center gap-3">
                                        <button className="px-4 py-2 rounded-xl bg-slate-50 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">পূর্ববর্তী</button>
                                        <button className="px-4 py-2 rounded-xl bg-[#045c84] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 transition-all">পরবর্তী</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Bottom Insight Banner */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="max-w-xl text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-blue-300 text-[10px] font-black uppercase tracking-widest mb-3">
                            <TrendingUp size={12} /> AI এনালিটিক্স
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tighter mb-2 leading-tight">
                            আপনার প্রতিষ্ঠানের ফিন্যান্সিয়াল <br />
                            <span className="text-blue-400">রিপোর্ট তৈরি হচ্ছে</span>
                        </h2>
                        <p className="text-slate-400 font-bold leading-relaxed text-[11px]">
                            ভুল বা অসামঞ্জস্যপূর্ণ লেনদেন শনাক্ত করতে স্মার্ট অ্যালগরিদম কাজ করছে।
                        </p>
                    </div>
                    <button className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-blue-50 transition-all">
                        অডিট রিপোর্ট দেখুন
                    </button>
                </div>
            </div>

            {/* Student Dues Details Modal */}
            {selectedStudentDetails && (
                <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedStudentDetails(null)} />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[32px] shadow-2xl relative w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]"
                    >
                        {/* Modal Header */}
                        <div className="p-8 pb-4 border-b border-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {selectedStudentDetails.studentPhoto ? (
                                        <img src={selectedStudentDetails.studentPhoto} alt={selectedStudentDetails.studentName} className="w-12 h-12 rounded-2xl object-cover shadow-md" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black font-bengali text-lg shadow-sm">
                                            {selectedStudentDetails.studentName[0] || 'S'}
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">{selectedStudentDetails.studentName}</h2>
                                        <p className="text-xs font-bold text-slate-400">ID: {selectedStudentDetails.studentUniqueId}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedStudentDetails(null)}
                                    className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                                >
                                    <Plus className="rotate-45" size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Scrollable list */}
                        <div className="p-8 py-4 overflow-y-auto flex-1 space-y-4" data-lenis-prevent>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-l-xl">আইডি</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ফি-এর ধরণ / খাত</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">তারিখ</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-r-xl">পরিমাণ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {selectedStudentDetails.items.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <span className="font-mono text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                                    #{(item.id || '').slice(-6).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className="font-bold text-xs text-slate-700">{item.category}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-400">
                                                {new Date(item.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-6 py-3.5 text-right font-black text-xs text-amber-600">
                                                ৳ {item.amount?.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 pt-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">মোট বকেয়া ফি</p>
                                <p className="text-xl font-black text-amber-600">৳ {selectedStudentDetails.totalAmount?.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setSelectedStudentDetails(null)}
                                    className="px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    বন্ধ করুন
                                </button>
                                <button
                                    onClick={() => {
                                        setFeeCollectStudent(selectedStudentDetails);
                                        setSelectedStudentDetails(null);
                                    }}
                                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <CreditCard size={14} /> ফি সংগ্রহ
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Fee Category Dues Details Modal */}
            {selectedTypeDetails && (
                <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedTypeDetails(null)} />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[32px] shadow-2xl relative w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]"
                    >
                        {/* Modal Header */}
                        <div className="p-8 pb-4 border-b border-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                        <Receipt size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">{selectedTypeDetails.category}</h2>
                                        <p className="text-xs font-bold text-slate-400">ফি বিবরণ</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedTypeDetails(null)}
                                    className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                                >
                                    <Plus className="rotate-45" size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Scrollable list */}
                        <div className="p-8 py-4 overflow-y-auto flex-1 space-y-4" data-lenis-prevent>
                            {selectedTypeDetails.categoryExists === false && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700">
                                    <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <p className="font-black text-xs">এই খাতটি (Category) মুছে ফেলা হয়েছে</p>
                                        <p className="text-[10px] font-bold opacity-80 mt-0.5">এই খাতের কোন অস্তিত্ব নেই, তবে বকেয়া ফি হিসেবে শিক্ষার্থীদের সাথে সংযুক্ত রয়েছে। আপনি চাইলে এই বকেয়া ফিগুলো সম্পূর্ণ মুছে দিতে পারেন।</p>
                                    </div>
                                </div>
                            )}
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-l-xl">শিক্ষার্থীর নাম</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">আইডি</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">তারিখ</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-r-xl">পরিমাণ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {selectedTypeDetails.items.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    {item.studentPhoto ? (
                                                        <img src={item.studentPhoto} alt={item.studentName} className="w-6 h-6 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-[10px]">
                                                            {item.studentName?.[0] || 'S'}
                                                        </div>
                                                    )}
                                                    <span className="font-bold text-xs text-slate-700">{item.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className="text-xs font-bold text-slate-400">
                                                    {item.studentUniqueId || item.studentId || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-400">
                                                {new Date(item.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-6 py-3.5 text-right font-black text-xs text-amber-600">
                                                ৳ {item.amount?.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 pt-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">মোট বকেয়া ফি</p>
                                <p className="text-xl font-black text-purple-600">৳ {selectedTypeDetails.totalAmount?.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedTypeDetails.categoryExists === false && (
                                    <button
                                        onClick={() => {
                                            handleDeleteOrphanedCategory(selectedTypeDetails.originalCategory);
                                            setSelectedTypeDetails(null);
                                        }}
                                        className="px-6 py-3 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <Trash2 size={14} /> বকেয়া ফি মুছুন
                                    </button>
                                )}
                                <button 
                                    onClick={() => setSelectedTypeDetails(null)}
                                    className="px-6 py-3 bg-[#045c84] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    বন্ধ করুন
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal with 5-Second Countdown (Undo Mode) */}
            {orphanedCategoryToDelete && (
                <div className="fixed inset-0 z-[110] overflow-y-auto flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!isDeletingProgress) setOrphanedCategoryToDelete(null); }} />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[32px] shadow-2xl relative w-full max-w-md overflow-hidden border border-slate-100"
                        data-lenis-prevent
                    >
                        <div className="p-8">
                            {!isDeletingProgress ? (
                                <>
                                    <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-[24px] flex items-center justify-center mb-6 animate-pulse">
                                        <AlertCircle size={32} />
                                    </div>
                                    
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">বকেয়া ফি মুছে ফেলার সতর্কতা</h2>
                                    <p className="text-slate-500 text-sm font-bold mb-8 leading-relaxed">
                                        আপনি কি নিশ্চিত যে আপনি "<span className="text-rose-600 font-extrabold">{orphanedCategoryToDelete}</span>" খাতের সকল শিক্ষার্থীর সকল পেন্ডিং বকেয়া ফি মুছে ফেলতে চান? এই পদক্ষেপটি সম্পূর্ণ স্থায়ী এবং আর ফিরিয়ে আনা যাবে না।
                                    </p>

                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setOrphanedCategoryToDelete(null)}
                                            className="flex-1 py-4 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-colors"
                                        >
                                            বাতিল
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsDeletingProgress(true);
                                                setDeleteCountdown(5);
                                            }}
                                            className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={18} /> মুছে ফেলুন
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Countdown Start after Delete (Circular Progress Indicator) */}
                                    <div className="flex flex-col items-center justify-center mb-6">
                                        <div className="relative w-20 h-20 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="40"
                                                    cy="40"
                                                    r="34"
                                                    className="text-slate-100"
                                                    strokeWidth="5"
                                                    stroke="currentColor"
                                                    fill="none"
                                                />
                                                <motion.circle
                                                    cx="40"
                                                    cy="40"
                                                    r="34"
                                                    className="text-rose-500"
                                                    strokeWidth="5"
                                                    strokeDasharray={2 * Math.PI * 34} // ~213.63
                                                    animate={{ strokeDashoffset: (2 * Math.PI * 34) * (1 - deleteCountdown / 5) }}
                                                    transition={{ duration: 0.95, ease: 'linear' }}
                                                    stroke="currentColor"
                                                    fill="none"
                                                />
                                            </svg>
                                            <span className="absolute text-xl font-black text-slate-800">
                                                {deleteCountdown}
                                            </span>
                                        </div>
                                    </div>

                                    <h2 className="text-xl font-black text-slate-800 mb-2 text-center">বকেয়া ফি মুছে ফেলা হচ্ছে...</h2>
                                    <p className="text-slate-500 text-sm font-bold mb-8 leading-relaxed text-center">
                                        "<span className="text-rose-600 font-extrabold">{orphanedCategoryToDelete}</span>" খাতের পেন্ডিং বকেয়া ফি স্থায়ীভাবে মুছে ফেলা হচ্ছে। আপনি চাইলে এই ৫ সেকেন্ডের মধ্যে প্রক্রিয়াটি বাতিল করতে পারেন।
                                    </p>

                                    <button 
                                        onClick={() => {
                                            setIsDeletingProgress(false);
                                            setOrphanedCategoryToDelete(null);
                                        }}
                                        className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-rose-600 font-black rounded-2xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        বাতিল করুন (Undo)
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Fee Collect Modal */}
            <AnimatePresence>
                {feeCollectStudent && (
                    <FeeCollectModal
                        student={feeCollectStudent}
                        onClose={() => setFeeCollectStudent(null)}
                        onSuccess={(msg) => {
                            setToast({ message: msg, type: 'success' });
                            fetchAccounts();
                        }}
                        onPrintReceipt={(txn) => {
                            setSelectedTransactionForPrint(txn);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Print Receipt Modal */}
            <AnimatePresence>
                {selectedTransactionForPrint && (
                    <PrintReceiptModal
                        transaction={selectedTransactionForPrint}
                        onClose={() => setSelectedTransactionForPrint(null)}
                    />
                )}
            </AnimatePresence>

            {/* Floating Action Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsTransactionModalOpen(true)}
                className={`fixed bottom-8 right-8 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl z-40 transition-colors ${
                    activeMainTab === 'income' ? 'bg-emerald-600 shadow-emerald-600/30' : 
                    activeMainTab === 'expense' ? 'bg-rose-600 shadow-rose-600/30' : 
                    'bg-[#045c84] shadow-blue-900/30'
                }`}
            >
                <Plus size={28} />
            </motion.button>

            {/* Add Transaction Modal */}
            <AddTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                defaultType={activeMainTab === 'income' ? 'income' : activeMainTab === 'expense' ? 'expense' : 'income'}
                onSuccess={() => {
                    setToast({ message: 'সফলভাবে লেনদেন যুক্ত করা হয়েছে', type: 'success' });
                    fetchAccounts();
                }}
            />

            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}

            {/* Transaction Delete Confirmation Modal */}
            {transactionToDelete && (
                <div className="fixed inset-0 z-[110] overflow-y-auto flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isDeletingTxn && setTransactionToDelete(null)} />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[32px] shadow-2xl relative w-full max-w-md overflow-hidden border border-slate-100"
                    >
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                                <Trash2 size={32} />
                            </div>
                            
                            <h2 className="text-2xl font-black text-slate-800 mb-2">লেনদেন মুছুন</h2>
                            <p className="text-slate-500 text-sm font-bold mb-8 leading-relaxed">
                                আপনি কি নিশ্চিত যে আপনি এই লেনদেনটি মুছে ফেলতে চান? এটি পুনরায় ফিরিয়ে আনা সম্ভব নয়।
                            </p>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setTransactionToDelete(null)}
                                    disabled={isDeletingTxn}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-colors disabled:opacity-50"
                                >
                                    বাতিল করুন
                                </button>
                                <button 
                                    onClick={handleDeleteTransaction}
                                    disabled={isDeletingTxn}
                                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeletingTxn ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>মুছে ফেলুন</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

function CategoryManagementView({ externalSearchQuery, addTrigger, forcedType }: { externalSearchQuery: string, addTrigger: number, forcedType?: 'income' | 'expense' }) {
    const { activeInstitute } = useSession();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
    const [deleteOption, setDeleteOption] = useState<'pending_only' | 'all'>('pending_only');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'income' | 'expense'>('all');
    
    const [isDeletingProgress, setIsDeletingProgress] = useState<boolean>(false);
    const [deleteCountdown, setDeleteCountdown] = useState<number>(5);

    // Sync external add trigger
    useEffect(() => {
        if (addTrigger > 0) handleAdd();
    }, [addTrigger]);

    useEffect(() => {
        if (categoryToDelete) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [categoryToDelete]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isDeletingProgress && categoryToDelete !== null) {
            setDeleteCountdown(5);
            timer = setInterval(() => {
                setDeleteCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        executeConfirmDelete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isDeletingProgress, categoryToDelete]);

    const filteredCategories = useMemo(() => {
        let list = categories || [];
        if (forcedType) {
            list = list.filter(c => c.type?.toLowerCase() === forcedType);
        } else {
            if (activeCategoryFilter === 'income') {
                list = list.filter(c => c.type?.toUpperCase() === 'INCOME');
            } else if (activeCategoryFilter === 'expense') {
                list = list.filter(c => c.type?.toUpperCase() === 'EXPENSE');
            }
        }
        if (externalSearchQuery) {
            const q = externalSearchQuery.toLowerCase();
            list = list.filter(c => c.name.toLowerCase().includes(q));
        }
        return list;
    }, [categories, activeCategoryFilter, externalSearchQuery]);

    const fetchCategories = async () => {
        if (!activeInstitute?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/accounts/categories?instituteId=${activeInstitute.id}`);
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch categories error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [activeInstitute?.id]);

    const handleAdd = () => {
        const defaultType = forcedType ? forcedType : (activeCategoryFilter === 'expense' ? 'expense' : 'income');
        setSelectedCategory({ type: defaultType });
        setIsModalOpen(true);
    };

    const handleEdit = (category: any) => {
        setSelectedCategory(category);
        setIsModalOpen(true);
    };

    const executeConfirmDelete = async () => {
        if (!categoryToDelete) return;
        try {
            const res = await fetch(`/api/admin/accounts/categories?id=${categoryToDelete.id}&deletePaid=${deleteOption === 'all'}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setCategoryToDelete(null);
                setIsDeletingProgress(false);
                fetchCategories();
            }
        } catch (error) {
            console.error('Delete error:', error);
            setIsDeletingProgress(false);
        }
    };

    const handleSave = async (data: any) => {
        try {
            const res = await fetch('/api/admin/accounts/categories', {
                method: selectedCategory ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, instituteId: activeInstitute.id })
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchCategories();
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    };

    const formatInterval = (interval: string) => {
        switch (interval) {
            case 'monthly': return 'মাসিক';
            case 'weekly': return 'সাপ্তাহিক';
            case 'semester': return 'সামাসিক';
            case 'yearly': return 'বার্ষিক';
            case 'one_time_year': return 'বছরে একবার';
            case 'one_time_ever': return 'এককালীন';
            default: return 'মাসিক';
        }
    };

    return (
        <div className="space-y-8">
            {/* Category Filter Navigation */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 ${forcedType ? 'hidden' : ''}`}>
                <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 w-fit">
                    {[
                        { id: 'all', label: 'সব খাত' },
                        { id: 'income', label: 'আয় / ফি' },
                        { id: 'expense', label: 'ব্যয়' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveCategoryFilter(tab.id as any)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                activeCategoryFilter === tab.id
                                    ? 'bg-[#045c84] text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        মোট {filteredCategories.length} টি খাত
                    </p>
                </div>
            </div>

            {/* Header when forcedType is used */}
            {forcedType && (
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                        {forcedType === 'income' ? 'আয়ের খাত সমূহ' : 'ব্যয়ের খাত সমূহ'}
                    </h3>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            মোট {filteredCategories.length} টি খাত
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                        <div key={cat.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-32 h-32 ${cat.type?.toLowerCase() === 'income' ? 'bg-emerald-50' : 'bg-rose-50'} rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform`} />
                            
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex gap-2">
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            cat.type?.toLowerCase() === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {cat.type?.toLowerCase() === 'income' ? 'আয়' : 'ব্যয়'}
                                        </div>
                                        {cat.isArchived && (
                                            <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                                                স্থগিত (Archived)
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!cat.isArchived && (
                                            <>
                                                <button 
                                                    onClick={() => handleEdit(cat)}
                                                    className="p-2 text-slate-400 hover:text-[#045c84] transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => setCategoryToDelete(cat)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                <h3 className="text-xl font-black text-slate-800 mb-2 truncate">{cat.name}</h3>
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mb-6">
                                    <span className="flex items-center gap-1"><Calendar size={14} /> {formatInterval(cat.config?.interval || cat.interval)}</span>
                                    <span className="flex items-center gap-1"><Users size={14} /> {cat.totalRecipients || '০'} জন</span>
                                </div>

                                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সম্ভাব্য পরিমাণ</div>
                                    <div className="text-lg font-black text-slate-800">৳ {cat.totalDue || '০'}</div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-24 text-center bg-slate-50/20 rounded-[40px] border border-dashed border-slate-100">
                        <div className="flex flex-col items-center gap-4 opacity-40">
                            <Receipt size={48} className="text-slate-200" />
                            <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">কোন খাত পাওয়া যায়নি</p>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <AddCategoryModal 
                    onClose={() => setIsModalOpen(false)}
                    initialData={selectedCategory}
                    onSave={handleSave}
                />
            )}

            {categoryToDelete && (
                <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!isDeletingProgress) setCategoryToDelete(null); }} />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[32px] shadow-2xl relative w-full max-w-lg overflow-hidden border border-slate-100"
                        data-lenis-prevent
                    >
                        <div className="p-8">
                            {!isDeletingProgress ? (
                                <>
                                    <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-[24px] flex items-center justify-center mb-6">
                                        <Trash2 size={32} />
                                    </div>
                                    
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">খাতটি মুছে ফেলুন</h2>
                                    <p className="text-slate-500 text-sm font-bold mb-8 leading-relaxed">
                                        আপনি "<span className="text-slate-800">{categoryToDelete.name}</span>" মুছে ফেলতে যাচ্ছেন। মুছে ফেলার ধরন নির্বাচন করুন:
                                    </p>

                                    <div className="space-y-4 mb-8">
                                        <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${deleteOption === 'pending_only' ? 'border-[#045c84] bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                                            <div className="mt-1">
                                                <input 
                                                    type="radio" 
                                                    name="delete_type" 
                                                    className="w-4 h-4 text-[#045c84] focus:ring-[#045c84]" 
                                                    checked={deleteOption === 'pending_only'}
                                                    onChange={() => setDeleteOption('pending_only')}
                                                />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 mb-1 text-[15px]">শুধুমাত্র বকেয়া ফি মুছুন</h4>
                                                <p className="text-xs font-bold text-slate-500 leading-relaxed">ভবিষ্যতে আর নতুন ফি যোগ হবে না, তবে আগের পরিশোধিত ফি থাকবে।</p>
                                            </div>
                                        </label>

                                        <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${deleteOption === 'all' ? 'border-rose-500 bg-rose-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                                            <div className="mt-1">
                                                <input 
                                                    type="radio" 
                                                    name="delete_type" 
                                                    className="w-4 h-4 text-rose-500 focus:ring-rose-500" 
                                                    checked={deleteOption === 'all'}
                                                    onChange={() => setDeleteOption('all')}
                                                />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-rose-600 mb-1 text-[15px]">সব মুছে ফেলুন (পরিশোধিত + বকেয়া)</h4>
                                                <p className="text-xs font-bold text-slate-500 leading-relaxed">এই খাতের সমস্ত রেকর্ড এবং অতীতের পরিশোধিত ইতিহাস মুছে যাবে।</p>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setCategoryToDelete(null)}
                                            className="flex-1 py-4 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-colors"
                                        >
                                            বাতিল
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsDeletingProgress(true);
                                                setDeleteCountdown(5);
                                            }}
                                            className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={18} /> মুছে ফেলুন
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center justify-center mb-6">
                                        <div className="relative w-20 h-20 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="40"
                                                    cy="40"
                                                    r="34"
                                                    className="text-slate-100"
                                                    strokeWidth="5"
                                                    stroke="currentColor"
                                                    fill="none"
                                                />
                                                <motion.circle
                                                    cx="40"
                                                    cy="40"
                                                    r="34"
                                                    className="text-rose-500"
                                                    strokeWidth="5"
                                                    strokeDasharray={2 * Math.PI * 34}
                                                    animate={{ strokeDashoffset: (2 * Math.PI * 34) * (1 - deleteCountdown / 5) }}
                                                    transition={{ duration: 0.95, ease: 'linear' }}
                                                    stroke="currentColor"
                                                    fill="none"
                                                />
                                            </svg>
                                            <span className="absolute text-xl font-black text-slate-800">
                                                {deleteCountdown}
                                            </span>
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 mb-2 text-center">খাত মুছে ফেলা হচ্ছে...</h2>
                                    <p className="text-slate-500 text-sm font-bold mb-8 leading-relaxed text-center">
                                        খাতটি {deleteOption === 'all' ? 'স্থায়ীভাবে মুছে ফেলা' : 'বকেয়া মুক্ত করা'} হচ্ছে। আপনি চাইলে এই ৫ সেকেন্ডের মধ্যে প্রক্রিয়াটি বাতিল করতে পারেন।
                                    </p>
                                    <button 
                                        onClick={() => {
                                            setIsDeletingProgress(false);
                                            setCategoryToDelete(null);
                                        }}
                                        className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-rose-600 font-black rounded-2xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        বাতিল করুন (Undo)
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
