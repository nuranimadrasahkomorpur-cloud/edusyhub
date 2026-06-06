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
    GraduationCap,
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
    PlusCircle,
    LayoutGrid,
    List,
    Scan
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
import { useUI } from '@/components/UIProvider';
import { getCleanId } from '@/utils/digit-utils';
import QRBarcodeScanner from '@/components/QRBarcodeScanner';

const getShortCategory = (category: string) => {
    if (!category) return 'অজানা';
    const parts = category.split(', ');
    if (parts.length > 1) {
        const firstPart = parts[0].trim();
        const baseName = firstPart.replace(/\s*\(.*?\)\s*/g, '').trim();
        return `${baseName} (একাধিক)`;
    }
    return category;
};

export default function AccountsPage() {
    const { activeInstitute } = useSession();
    const [activeMainTab, setActiveMainTab] = useState<'overview' | 'income' | 'expense'>('overview'); 
    const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'pending' | 'categories'>('transactions');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
        if (typeof window === 'undefined') return 'table';
        const storedMode = window.localStorage.getItem('accounts_view_mode');
        return storedMode === 'card' ? 'card' : 'table';
    });
    const [addTrigger, setAddTrigger] = useState(0);
    const [accountData, setAccountData] = useState<{ summary: any, transactions: any[] }>({
        summary: null,
        transactions: []
    });
    const [loading, setLoading] = useState(true);
    const classTabsRef = React.useRef<HTMLDivElement>(null);
    const subTabContainerRef = React.useRef<HTMLDivElement>(null);
    const filterTabsRef = React.useRef<HTMLDivElement>(null);
    const [dueGroupMode, setDueGroupMode] = useState<'person' | 'type'>('person');
    const [transactionFilterMode, setTransactionFilterMode] = useState<'all' | 'person' | 'type' | 'class'>('all');
    const [activeClassFilter, setActiveClassFilter] = useState<string | null>(null);
    const [categoryFilterMode, setCategoryFilterMode] = useState<'all' | 'income' | 'expense' | 'archived'>('all');
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
    const [showScanner, setShowScanner] = useState(false);
    const [isScanningStudent, setIsScanningStudent] = useState(false);
    const [showFloatingActions, setShowFloatingActions] = useState(true);
    const scanRequestInFlightRef = React.useRef(false);
    const paginationRef = React.useRef<HTMLDivElement | null>(null);

    const handleSubTabClick = (tab: 'transactions' | 'pending' | 'categories', event: React.MouseEvent<HTMLButtonElement>) => {
        setActiveSubTab(tab);
        const button = event.currentTarget;
        button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };

    const handleFilterTabClick = (mode: 'all' | 'person' | 'type' | 'class', event: React.MouseEvent<HTMLButtonElement>) => {
        setTransactionFilterMode(mode);
        setActiveClassFilter(null);
        const button = event.currentTarget;
        button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };

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
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('accounts_view_mode', viewMode);
        }
    }, [viewMode]);

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
        
        // Auto-sync missing dues in the background
        if (activeInstitute?.id) {
            const syncKey = `sync_${activeInstitute.id}`;
            if (sessionStorage.getItem(syncKey)) return;
            sessionStorage.setItem(syncKey, 'true');

            fetch('/api/admin/accounts/sync-dues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instituteId: activeInstitute.id })
            }).then(res => res.json())
              .then(data => {
                  if (data.generatedCount && data.generatedCount > 0) {
                      // Silently refetch to show newly generated dues
                      fetch(`/api/admin/accounts?instituteId=${activeInstitute.id}&_cb=${Date.now()}`, { cache: 'no-store' })
                          .then(res => res.json())
                          .then(accData => setAccountData(accData));
                  }
              }).catch(err => {
                  console.error('Failed to sync dues:', err);
                  sessionStorage.removeItem(syncKey); // Allow retry on failure
              });
        }
    }, [activeInstitute?.id]);

    // Reset modal state on component mount and when institute changes
    useEffect(() => {
        setFeeCollectStudent(null);
        setShowScanner(false);
        setSelectedStudentDetails(null);
    }, []);

    useEffect(() => {
        const getFloatingArea = () => {
            const floatWidth = 56;
            const floatRight = window.innerWidth - 6;
            const floatLeft = floatRight - floatWidth;
            const floatBottom = window.innerHeight - 16;
            const floatTop = floatBottom - 72; // covers both buttons stacked with spacing
            return { left: floatLeft, right: floatRight, top: floatTop, bottom: floatBottom };
        };

        const intersectsFloatingArea = (rect: DOMRect) => {
            const floatArea = getFloatingArea();
            return !(rect.right < floatArea.left || rect.left > floatArea.right || rect.bottom < floatArea.top || rect.top > floatArea.bottom);
        };

        const updateFloatingVisibility = () => {
            if (showScanner || isTransactionModalOpen) {
                setShowFloatingActions(false);
                return;
            }

            if (paginationRef.current) {
                const paginationRect = paginationRef.current.getBoundingClientRect();
                if (intersectsFloatingArea(paginationRect)) {
                    setShowFloatingActions(false);
                    return;
                }
            }

            setShowFloatingActions(true);
        };

        window.addEventListener('scroll', updateFloatingVisibility, { passive: true });
        window.addEventListener('resize', updateFloatingVisibility);
        updateFloatingVisibility();

        return () => {
            window.removeEventListener('scroll', updateFloatingVisibility);
            window.removeEventListener('resize', updateFloatingVisibility);
        };
    }, [showScanner, isTransactionModalOpen]);

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
                // Re-sync dues to recreate any PENDING dues that might have been affected
                if (activeInstitute?.id) {
                    await fetch('/api/admin/accounts/sync-dues', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ instituteId: activeInstitute.id })
                    });
                }
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

    const handleScanResult = async (scannedValue: string) => {
        // Prevent concurrent scan requests
        if (scanRequestInFlightRef.current) {
            console.debug('Scan request already in flight, ignoring duplicate');
            return;
        }

        const cleanedValue = scannedValue.trim();
        scanRequestInFlightRef.current = true;
        setIsScanningStudent(true);
        try {
            // Search for student by ID or studentId with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            // Search by student ID (not MongoDB user ID)
            const res = await fetch(
                `/api/admin/users?search=${encodeURIComponent(cleanedValue)}&role=STUDENT&instituteId=${activeInstitute?.id || ''}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (res.ok) {
                const students = await res.json();
                // Handle both array responses
                const apiStudent = Array.isArray(students) ? students[0] : students;
                
                if (apiStudent && apiStudent.id) {
                    const studentForFee = {
                        studentId: apiStudent.id,
                        studentName: apiStudent.name || '',
                        studentUniqueId: apiStudent.metadata?.studentId || apiStudent.id,
                        studentPhoto: null,
                        scannedId: cleanedValue,
                        email: apiStudent.email || '',
                        phone: apiStudent.phone || '',
                        items: [],
                        totalAmount: 0,
                        scannedAt: new Date().toISOString()
                    };

                    setFeeCollectStudent(studentForFee);
                    setShowScanner(false);
                    setToast({ message: 'ছাত্র পাওয়া গেছে - ফি সংগ্রহের জন্য প্রস্তুত', type: 'success' });
                } else {
                    setToast({ message: 'ছাত্র খুঁজে পাওয়া যায়নি', type: 'error' });
                    setShowScanner(false);
                }
            } else {
                console.error(`API returned ${res.status}: ${res.statusText}`);
                setToast({ message: `সার্ভার ত্রুটি (${res.status}). আবার চেষ্টা করুন।`, type: 'error' });
                setShowScanner(false);
            }
        } catch (error: any) {
            console.error('Scan error:', error);
            if (error.name === 'AbortError') {
                setToast({ message: 'অনুসন্ধান সময় শেষ। আবার চেষ্টা করুন।', type: 'error' });
            } else {
                setToast({ message: 'স্ক্যান করতে সমস্যা হয়েছে', type: 'error' });
            }
            setShowScanner(false);
        } finally {
            setIsScanningStudent(false);
            scanRequestInFlightRef.current = false;
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
                cards.push({ label: 'অগ্রিম জমা (ব্যক্তি)', value: `৳ ${s?.advanceBalance?.toLocaleString() || '০'}`, change: '+०%', trend: 'up', icon: PlusCircle, color: 'text-violet-600', bg: 'bg-violet-50' });
            }
            return cards;
        }
    }, [accountData.summary, activeMainTab]);

    const filteredTransactions = useMemo(() => {
        let txns = accountData.transactions || [];
        
        // Don't filter out advance entries entirely, just format them later
        // txns = txns.filter(t => !(typeof t.category === 'string' && t.category.startsWith('__ADVANCE__')));
        
        if (activeMainTab === 'overview') {
            if (activeSubTab === 'transactions') {
                txns = txns.filter(t => t.status?.toUpperCase() === 'COMPLETED');
            } else if (activeSubTab === 'pending') {
                // Show all outstanding/pending items (unpaid fees, unpaid bills)
                txns = txns.filter(t => t.status?.toUpperCase() === 'PENDING');
            } else {
                txns = [];
            }
        } else if (activeMainTab === 'income') {
            if (activeSubTab === 'transactions') {
                txns = txns.filter(t => t.type?.toUpperCase() === 'INCOME' && t.status?.toUpperCase() === 'COMPLETED');
            } else if (activeSubTab === 'pending') {
                // Show all outstanding income (unpaid student fees, unpaid tuition, etc.)
                txns = txns.filter(t => t.type?.toUpperCase() === 'INCOME' && t.status?.toUpperCase() === 'PENDING');
            } else {
                txns = [];
            }
        } else if (activeMainTab === 'expense') {
            if (activeSubTab === 'transactions') {
                txns = txns.filter(t => t.type?.toUpperCase() === 'EXPENSE' && t.status?.toUpperCase() === 'COMPLETED');
            } else if (activeSubTab === 'pending') {
                // Show all outstanding expenses (unpaid bills, utilities, etc.)
                txns = txns.filter(t => t.type?.toUpperCase() === 'EXPENSE' && t.status?.toUpperCase() === 'PENDING');
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
            // Format advance category for display
            let displayCategory = t.category;
            if (typeof displayCategory === 'string' && displayCategory.startsWith('__ADVANCE__')) {
                displayCategory = 'অনির্ধারিত অগ্রিম জমা';
            }
            
            const formattedTxn = { ...t, category: displayCategory, originalCategory: t.category };

            if (formattedTxn.status?.toUpperCase() === 'COMPLETED' && formattedTxn.receiptNo) {
                const groupKey = `${formattedTxn.receiptNo}_${formattedTxn.studentId || 'unknown'}`;
                if (receiptMap.has(groupKey)) {
                    const existing = receiptMap.get(groupKey);
                    existing.amount += formattedTxn.amount;
                    if (!existing.category.includes(formattedTxn.category)) {
                        existing.category += `, ${formattedTxn.category}`;
                    }
                    existing.subTransactions.push(formattedTxn);
                } else {
                    const copy = { ...formattedTxn, subTransactions: [formattedTxn] };
                    receiptMap.set(groupKey, copy);
                    groupedTxns.push(copy);
                }
            } else {
                groupedTxns.push({ ...formattedTxn, subTransactions: [formattedTxn] });
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
            const key = t.originalCategory || t.category || 'অন্যান্য';
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

    const classWiseDues = useMemo(() => {
        if (activeSubTab !== 'pending') return [];
        const pendingTxns = filteredTransactions || [];
        
        const groups: Record<string, { className: string; items: any[]; totalAmount: number; uniqueStudents: Set<string> }> = {};
        
        pendingTxns.forEach(t => {
            const key = t.className || 'শ্রেণী উল্লেখ নেই';
            if (!groups[key]) {
                groups[key] = {
                    className: key,
                    items: [],
                    totalAmount: 0,
                    uniqueStudents: new Set()
                };
            }
            groups[key].items.push(t);
            groups[key].totalAmount += t.amount || 0;
            if (t.studentId) groups[key].uniqueStudents.add(t.studentId);
        });
        
        return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [filteredTransactions, activeSubTab]);

    useEffect(() => {
        if (selectedStudentDetails) {
            const updated = personWiseDues.find(s => s.studentId === selectedStudentDetails.studentId);
            if (updated) {
                setSelectedStudentDetails(updated);
            } else {
                setSelectedStudentDetails(null);
            }
        }
    }, [personWiseDues]);

    useEffect(() => {
        if (selectedTypeDetails) {
            const updated = typeWiseDues.find(s => s.category === selectedTypeDetails.category);
            if (updated) {
                setSelectedTypeDetails(updated);
            } else {
                setSelectedTypeDetails(null);
            }
        }
    }, [typeWiseDues]);

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

    const cardGridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 mx-auto max-w-[1280px]';

    const renderTableContent = () => {
        if (loading) {
            if (viewMode === 'card') {
                return (
                    <div className={cardGridClass}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-pulse space-y-2">
                                <div className="flex justify-between items-center gap-2">
                                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                                    <div className="h-4 bg-slate-100 rounded-full w-1/4" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100" />
                                    <div className="space-y-1 flex-1">
                                        <div className="h-4 bg-slate-100 rounded w-2/3" />
                                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <div className="h-5 bg-slate-100 rounded w-1/4" />
                                    <div className="h-8 bg-slate-100 rounded-lg w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }
            return (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">আইডি</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">খাত/ব্যক্তি</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">পরিমাণ</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell text-center whitespace-nowrap">তারিখ</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">অবস্থা</th>
                            <th className="px-8 py-3 whitespace-nowrap"></th>
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

        if (activeSubTab === 'pending' && transactionFilterMode === 'person') {
            if (viewMode === 'card') {
                return (
                    <div className={cardGridClass}>
                        {personWiseDues.length > 0 ? (
                            personWiseDues.map((student) => (
                                <div 
                                    key={student.studentId}
                                    onClick={() => setSelectedStudentDetails(student)}
                                    className="group cursor-pointer bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2"
                                >
                                    <div className="flex items-center gap-2">
                                        {student.studentPhoto ? (
                                            <img src={student.studentPhoto} alt={student.studentName} className="w-10 h-10 rounded-xl object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-sm">
                                                {student.studentName[0] || 'S'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-black text-sm text-slate-800 leading-tight">{student.studentName}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{student.items.length} টি ফি</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">মোট বকেয়া</p>
                                        <p className="font-black text-sm text-amber-600">৳ {student.totalAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
                                <Search size={48} className="text-slate-200" />
                                <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">বকেয়া ফি পাওয়া যায়নি</p>
                            </div>
                        )}
                    </div>
                );
            }
            return (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ব্যক্তির তথ্য</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">বকেয়া খাতের সংখ্যা</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">মোট বকেয়া পরিমাণ</th>
                            <th className="px-8 py-3 whitespace-nowrap"></th>
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
                                                    <p className="font-black text-xs text-slate-800 whitespace-nowrap">{student.studentName}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 tracking-tight whitespace-nowrap">ID: {student.studentUniqueId}</p>
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

        if (activeSubTab === 'pending' && transactionFilterMode === 'type') {
            if (viewMode === 'card') {
                return (
                    <div className={cardGridClass}>
                        {typeWiseDues.length > 0 ? (
                            typeWiseDues.map((group) => (
                                <div 
                                    key={group.category}
                                    onClick={() => setSelectedTypeDetails(group)}
                                    className="group cursor-pointer bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                                            !group.categoryExists ? 'bg-rose-50 text-rose-600' : 'bg-purple-50 text-purple-600'
                                        }`}>
                                            <Receipt size={16} />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm text-slate-800 leading-tight">{group.category}</p>
                                            {!group.categoryExists && (
                                                <span className="inline-block mt-1 px-2 py-0.5 text-[8px] text-rose-600 bg-rose-50 rounded-full border border-rose-100">
                                                    মুছে ফেলা খাত
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 gap-3">
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">জন</p>
                                        <p className="font-black text-sm text-slate-700">{group.items.length}</p>
                                        <p className="font-black text-sm text-amber-600">৳ {group.totalAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
                                <Search size={48} className="text-slate-200" />
                                <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">বকেয়া ফি পাওয়া যায়নি</p>
                            </div>
                        )}
                    </div>
                );
            }
            return (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ফি-এর ধরণ / খাত</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">বকেয়া শিক্ষার্থীর সংখ্যা</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">মোট বকেয়া পরিমাণ</th>
                            <th className="px-8 py-3 whitespace-nowrap"></th>
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
                                            {group.items.length} জন ব্যক্তি
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

        if (activeSubTab === 'pending' && transactionFilterMode === 'class') {
            const handleClassSelect = (className: string, event: React.MouseEvent<HTMLButtonElement>) => {
                setActiveClassFilter(className === activeClassFilter ? null : className);
                
                const container = classTabsRef.current;
                const button = event.currentTarget;
                if (container && button) {
                    const containerWidth = container.offsetWidth;
                    const buttonWidth = button.offsetWidth;
                    const buttonOffset = button.offsetLeft;
                    const scrollPos = buttonOffset - (containerWidth / 2) + (buttonWidth / 2);
                    container.scrollTo({ left: scrollPos, behavior: 'smooth' });
                }
            };

            const pendingTransactions = filteredTransactions.filter(t => t.status?.toUpperCase() === 'PENDING');
            const classTxns = activeClassFilter 
                ? pendingTransactions.filter(t => (t.className || 'শ্রেণী উল্লেখ নেই') === activeClassFilter)
                : pendingTransactions;

            return (
                <div className="flex flex-col w-full">
                    {classWiseDues.length > 0 && (
                        <div 
                            ref={classTabsRef}
                            className="flex overflow-x-auto hide-scrollbar gap-2 px-6 py-4 bg-slate-50/50 border-b border-slate-100 scroll-smooth"
                        >
                            {classWiseDues.map((group) => (
                                <button
                                    key={group.className}
                                    onClick={(e) => handleClassSelect(group.className, e)}
                                    className={`px-4 py-2 rounded-xl whitespace-nowrap font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
                                        activeClassFilter === group.className 
                                            ? 'bg-[#045c84] text-white shadow-md' 
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <GraduationCap size={14} className={activeClassFilter === group.className ? 'text-white' : 'text-slate-400'} />
                                    {group.className} 
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeClassFilter === group.className ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {group.items.length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {viewMode === 'card' ? (
                        <div className={cardGridClass}>
                            {classTxns.length > 0 ? (
                                classTxns.map((txn) => (
                                    <div key={txn.id} className="bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            {txn.studentPhoto ? (
                                                <img src={txn.studentPhoto} alt={txn.studentName} className="w-10 h-10 rounded-xl object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-sm">
                                                    {txn.studentName?.[0] || 'S'}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-black text-sm text-slate-800 leading-tight">{txn.studentName}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{txn.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">পরিমাণ</p>
                                            <p className="font-black text-sm text-rose-600">৳ {txn.amount?.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
                                    <Search size={48} className="text-slate-200" />
                                    <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">বকেয়া পাওয়া যায়নি</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">বকেয়া আইডি</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ব্যক্তি</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">খাত/ধরন</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">পরিমাণ</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">তারিখ</th>
                                    <th className="px-8 py-3 whitespace-nowrap"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {classTxns.length > 0 ? (
                                    classTxns.map((txn) => (
                                        <tr key={txn.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                                            <td className="px-8 py-4">
                                                <span className="font-mono text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg tracking-tighter border border-amber-100">
                                                    #{(txn.id || '').slice(-6).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {txn.studentPhoto ? (
                                                        <img src={txn.studentPhoto} alt={txn.studentName} className="w-6 h-6 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-[10px]">
                                                            {txn.studentName?.[0] || 'S'}
                                                        </div>
                                                    )}
                                                    <span className="font-black text-xs text-slate-800 whitespace-nowrap">{txn.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-black text-xs text-slate-700 whitespace-nowrap">{txn.category}</p>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-xs ${txn.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                ৳ {txn.amount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center text-[10px] font-black text-slate-400">
                                                {new Date(txn.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <button 
                                                    onClick={() => setTransactionToDelete(txn)}
                                                    className="w-8 h-8 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-all flex items-center justify-center"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <Search size={48} className="text-slate-200" />
                                                <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">বকেয়া পাওয়া যায়নি</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            );
        }

        if (activeSubTab === 'pending' && transactionFilterMode === 'all') {
            const pendingTransactions = filteredTransactions.filter(t => t.status?.toUpperCase() === 'PENDING');

            if (viewMode === 'card') {
                return (
                    <div className={cardGridClass}>
                        {pendingTransactions.length > 0 ? (
                            pendingTransactions.map((txn) => (
                                <div key={txn.id} className="bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            {txn.studentPhoto ? (
                                                <img src={txn.studentPhoto} alt={txn.studentName} className="w-10 h-10 rounded-xl object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-sm">
                                                    {txn.studentName?.[0] || 'S'}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-black text-sm text-slate-800 leading-tight">{txn.studentName}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{txn.category}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setTransactionToDelete(txn)}
                                            className="w-8 h-8 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-all flex items-center justify-center shrink-0"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                        <span className="text-[10px] text-slate-500">{new Date(txn.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}</span>
                                        <span className="font-black text-sm text-rose-600">৳ {txn.amount?.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
                                <Search size={48} className="text-slate-200" />
                                <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">বকেয়া পাওয়া যায়নি</p>
                            </div>
                        )}
                    </div>
                );
            }
            return (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">বকেয়া আইডি</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ব্যক্তি</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">খাত/ধরন</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">পরিমাণ</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">তারিখ</th>
                            <th className="px-8 py-3 whitespace-nowrap"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {pendingTransactions.length > 0 ? (
                            pendingTransactions.map((txn) => (
                                <tr key={txn.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                                    <td className="px-8 py-4">
                                        <span className="font-mono text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg tracking-tighter border border-amber-100">
                                            #{(txn.id || '').slice(-6).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {txn.studentPhoto ? (
                                                <img src={txn.studentPhoto} alt={txn.studentName} className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-[10px]">
                                                    {txn.studentName?.[0] || 'S'}
                                                </div>
                                            )}
                                            <span className="font-black text-xs text-slate-800">{txn.studentName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-black text-xs text-slate-700 whitespace-nowrap">{txn.category}</p>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black text-xs ${txn.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        ৳ {txn.amount?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center text-[10px] font-black text-slate-400">
                                        {new Date(txn.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button 
                                            onClick={() => setTransactionToDelete(txn)}
                                            className="w-8 h-8 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-all flex items-center justify-center"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-10 py-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Search size={48} className="text-slate-200" />
                                        <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">বকেয়া পাওয়া যায়নি</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            );
        }

        // Transaction filters (Person-wise, Type-wise, Single)
        if (activeSubTab === 'transactions' && transactionFilterMode === 'person') {
            const completedTransactions = filteredTransactions.filter(t => t.status?.toUpperCase() === 'COMPLETED');
            const personWiseTransactions: Record<string, any> = {};
            
            completedTransactions.forEach(t => {
                const key = t.studentId || t.studentName || 'unknown';
                if (!personWiseTransactions[key]) {
                    personWiseTransactions[key] = {
                        studentName: t.studentName || 'অজানা',
                        studentId: t.studentId || 'N/A',
                        studentUniqueId: t.studentUniqueId || t.studentId || 'N/A',
                        studentPhoto: t.studentPhoto || null,
                        items: [],
                        totalAmount: 0
                    };
                }
                personWiseTransactions[key].items.push(t);
                personWiseTransactions[key].totalAmount += t.amount || 0;
            });

            const personList = Object.values(personWiseTransactions).sort((a, b) => b.totalAmount - a.totalAmount);

            if (viewMode === 'card') {
                return (
                    <div className={cardGridClass}>
                        {personList.length > 0 ? (
                            personList.map((student) => (
                                <div key={student.studentId} className="bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        {student.studentPhoto ? (
                                            <img src={student.studentPhoto} alt={student.studentName} className="w-10 h-10 rounded-xl object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-sm">
                                                {student.studentName[0] || 'S'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-black text-sm text-slate-800 leading-tight">{student.studentName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 gap-4">
                                        <span className="text-[10px] text-slate-500">{student.items.length} টি লেনদেন</span>
                                        <span className="font-black text-sm text-emerald-600">৳ {student.totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
                                <Search size={48} className="text-slate-200" />
                                <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">লেনদেন পাওয়া যায়নি</p>
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ব্যক্তির তথ্য</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">লেনদেন সংখ্যা</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">মোট পরিমাণ</th>
                            <th className="px-8 py-3 whitespace-nowrap"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {personList.length > 0 ? (
                            personList.map((student) => (
                                <tr key={student.studentId} className="group cursor-pointer hover:bg-slate-50/50 transition-all duration-300">
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
                                                <p className="font-black text-xs text-slate-800 whitespace-nowrap">{student.studentName}</p>
                                                <p className="text-[9px] font-bold text-slate-400 tracking-tight whitespace-nowrap">ID: {student.studentUniqueId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-xs text-slate-700">
                                        {student.items.length} টি লেনদেন
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-xs text-emerald-600">
                                        ৳ {student.totalAmount.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button className="w-8 h-8 bg-slate-50 text-slate-400 group-hover:text-[#045c84] group-hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center ml-auto">
                                            <ChevronRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-10 py-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Search size={48} className="text-slate-200" />
                                        <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">লেনদেন পাওয়া যায়নি</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            );
        }

        if (activeSubTab === 'transactions' && transactionFilterMode === 'type') {
            const completedTransactions = filteredTransactions.filter(t => t.status?.toUpperCase() === 'COMPLETED');
            const typeWiseTransactions: Record<string, any> = {};
            
            completedTransactions.forEach(t => {
                const key = t.category || 'অন্যান্য';
                if (!typeWiseTransactions[key]) {
                    typeWiseTransactions[key] = {
                        category: key,
                        items: [],
                        totalAmount: 0,
                        type: t.type
                    };
                }
                typeWiseTransactions[key].items.push(t);
                typeWiseTransactions[key].totalAmount += t.amount || 0;
            });

            const typeList = Object.values(typeWiseTransactions).sort((a, b) => b.totalAmount - a.totalAmount);

            if (viewMode === 'card') {
                return (
                    <div className={cardGridClass}>
                        {typeList.length > 0 ? (
                            typeList.map((group) => (
                                <div key={group.category} className="bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${group.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            <Receipt size={16} />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm text-slate-800 leading-tight" title={group.category}>{getShortCategory(group.category)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 gap-4">
                                        <span className="text-[10px] text-slate-500">{group.items.length} টি লেনদেন</span>
                                        <span className={`font-black text-sm ${group.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            ৳ {group.totalAmount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
                                <Search size={48} className="text-slate-200" />
                                <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">লেনদেন পাওয়া যায়নি</p>
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">খাত / ধরন</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">লেনদেন সংখ্যা</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">মোট পরিমাণ</th>
                            <th className="px-8 py-3 whitespace-nowrap"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {typeList.length > 0 ? (
                            typeList.map((group) => (
                                <tr key={group.category} className="group cursor-pointer hover:bg-slate-50/50 transition-all duration-300">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${group.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                <Receipt size={14} />
                                            </div>
                                            <div>
                                                <p className="font-black text-xs text-slate-800" title={group.category}>{getShortCategory(group.category)}</p>
                                                <p className="text-[9px] font-bold text-slate-400 tracking-tight">{group.type === 'INCOME' ? 'আয়' : 'ব্যয়'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-xs text-slate-700">
                                        {group.items.length} টি লেনদেন
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black text-xs ${group.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        ৳ {group.totalAmount.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button className="w-8 h-8 bg-slate-50 text-slate-400 group-hover:text-[#045c84] group-hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center ml-auto">
                                            <ChevronRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-10 py-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Search size={48} className="text-slate-200" />
                                        <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">লেনদেন পাওয়া যায়নি</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            );
        }

        if (activeSubTab === 'transactions' && transactionFilterMode === 'class') {
            const handleClassSelect = (className: string, event: React.MouseEvent<HTMLButtonElement>) => {
                setActiveClassFilter(className === activeClassFilter ? null : className);
                
                const container = classTabsRef.current;
                const button = event.currentTarget;
                if (container && button) {
                    const containerWidth = container.offsetWidth;
                    const buttonWidth = button.offsetWidth;
                    const buttonOffset = button.offsetLeft;
                    const scrollPos = buttonOffset - (containerWidth / 2) + (buttonWidth / 2);
                    container.scrollTo({ left: scrollPos, behavior: 'smooth' });
                }
            };

            const completedTransactions = filteredTransactions.filter(t => t.status?.toUpperCase() === 'COMPLETED');
            const classWiseTransactions: Record<string, any> = {};
            
            completedTransactions.forEach(t => {
                const key = t.className || 'শ্রেণী উল্লেখ নেই';
                if (!classWiseTransactions[key]) {
                    classWiseTransactions[key] = {
                        className: key,
                        items: [],
                        totalAmount: 0,
                        uniqueStudents: new Set(),
                        type: t.type
                    };
                }
                classWiseTransactions[key].items.push(t);
                classWiseTransactions[key].totalAmount += t.amount || 0;
                if (t.studentId) classWiseTransactions[key].uniqueStudents.add(t.studentId);
            });

            const classList = Object.values(classWiseTransactions).sort((a, b) => b.totalAmount - a.totalAmount);
            
            const classTxns = activeClassFilter
                ? completedTransactions.filter(t => (t.className || 'শ্রেণী উল্লেখ নেই') === activeClassFilter)
                : completedTransactions;

            return (
                <div className="flex flex-col w-full">
                    {classList.length > 0 && (
                        <div 
                            ref={classTabsRef}
                            className="flex overflow-x-auto hide-scrollbar gap-2 px-6 py-4 bg-slate-50/50 border-b border-slate-100 scroll-smooth"
                        >
                            {classList.map((group) => (
                                <button
                                    key={group.className}
                                    onClick={(e) => handleClassSelect(group.className, e)}
                                    className={`px-4 py-2 rounded-xl whitespace-nowrap font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
                                        activeClassFilter === group.className 
                                            ? 'bg-[#045c84] text-white shadow-md' 
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <GraduationCap size={14} className={activeClassFilter === group.className ? 'text-white' : 'text-slate-400'} />
                                    {group.className} 
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeClassFilter === group.className ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {group.items.length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {viewMode === 'card' ? (
                        <div className={cardGridClass}>
                            {classTxns.length > 0 ? (
                                classTxns.map((txn) => (
                                    <div key={txn.id} className="bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2">
                                        <div className="flex items-start justify-between">
                                            <span className="font-mono text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg tracking-tighter border border-purple-100">
                                                #{(txn.id || '').slice(-6).toUpperCase()}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button 
                                                    onClick={() => setTransactionToDelete(txn)}
                                                    className="w-8 h-8 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-all flex items-center justify-center"
                                                    title="মুছুন"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                                {txn.receiptNo && txn.type === 'INCOME' && (
                                                    <button 
                                                        onClick={() => setSelectedTransactionForPrint(txn)}
                                                        className="px-2 py-1.5 bg-blue-50 text-[#045c84] hover:bg-[#045c84] hover:text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                                                        title="রশিদ প্রিন্ট"
                                                    >
                                                        <Receipt size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {txn.studentPhoto ? (
                                                <img src={txn.studentPhoto} alt={txn.studentName} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-sm shadow-sm">
                                                    {txn.studentName?.[0] || 'S'}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-black text-sm text-slate-800 leading-tight">{txn.studentName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5" title={txn.category}>{getShortCategory(txn.category)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">তারিখ</p>
                                                <p className="font-bold text-xs text-slate-500">
                                                    {new Date(txn.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">পরিমাণ</p>
                                                <p className={`font-black text-sm ${txn.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    ৳ {txn.amount?.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
                                    <Search size={48} className="text-slate-200" />
                                    <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">লেনদেন পাওয়া যায়নি</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">লেনদেন আইডি</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ব্যক্তি</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">খাত/ধরন</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">পরিমাণ</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">তারিখ</th>
                                    <th className="px-8 py-3 whitespace-nowrap"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {classTxns.length > 0 ? (
                                    classTxns.map((txn) => (
                                        <tr key={txn.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                                            <td className="px-8 py-4">
                                                <span className="font-mono text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg tracking-tighter border border-purple-100">
                                                    #{(txn.id || '').slice(-6).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {txn.studentPhoto ? (
                                                        <img src={txn.studentPhoto} alt={txn.studentName} className="w-6 h-6 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold font-bengali text-[10px]">
                                                            {txn.studentName?.[0] || 'S'}
                                                        </div>
                                                    )}
                                                    <span className="font-black text-xs text-slate-800 whitespace-nowrap">{txn.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-black text-xs text-slate-700 whitespace-nowrap" title={txn.category}>{getShortCategory(txn.category)}</p>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black text-xs ${txn.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                ৳ {txn.amount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center text-[10px] font-black text-slate-400">
                                                {new Date(txn.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => setTransactionToDelete(txn)}
                                                        className="w-8 h-8 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-all flex items-center justify-center"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    {txn.receiptNo && txn.type === 'INCOME' && (
                                                        <button 
                                                            onClick={() => setSelectedTransactionForPrint(txn)}
                                                            className="px-2 py-1.5 bg-blue-50 text-[#045c84] hover:bg-[#045c84] hover:text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                                                        >
                                                            <Receipt size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <Search size={48} className="text-slate-200" />
                                                <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">লেনদেন পাওয়া যায়নি</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            );
        }

        // Default 'all' or other tabs
        if (viewMode === 'card') {
            return (
                <div className={cardGridClass}>
                    {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((txn: any) => (
                            <div key={txn.id} className="bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="font-mono text-[9px] font-black text-[#045c84] bg-blue-50 px-2 py-1 rounded-lg tracking-tighter border border-blue-100">
                                        {txn.receiptNo || `#${txn.id.slice(-6).toUpperCase()}`}
                                    </span>
                                    <div className="shrink-0">
                                        {renderStatus(txn.status)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${txn.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        <Receipt size={16} />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-slate-800 leading-tight" title={txn.category}>{getShortCategory(txn.category)}</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[150px]">
                                            {txn.studentName || 'অজানা'}{txn.studentUniqueId ? ` (ID: ${txn.studentUniqueId})` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">তারিখ</p>
                                        <p className="font-bold text-xs text-slate-500">
                                            {new Date(txn.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">পরিমাণ</p>
                                        <p className={`font-black text-sm ${txn.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            ৳ {txn.amount?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50/50">
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
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-40">
                            <Search size={48} className="text-slate-200" />
                            <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">লেনদেন পাওয়া যায়নি</p>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50">
                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">রশিদ/ভাউচার নং</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">খাত/ব্যক্তি</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">পরিমাণ</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">তারিখ</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">অবস্থা</th>
                        <th className="px-8 py-3 whitespace-nowrap"></th>
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
                                            <p className="font-black text-xs text-slate-800 whitespace-nowrap" title={txn.category}>{getShortCategory(txn.category)}</p>
                                            <p className="text-[9px] font-bold text-slate-400 tracking-tight whitespace-nowrap">{txn.studentName || 'অজানা'}{txn.studentUniqueId ? ` (ID: ${txn.studentUniqueId})` : ''}</p>
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

    const getDisplayedCount = () => {
        if (activeSubTab === 'transactions') return filteredTransactions.length;
        if (activeSubTab === 'pending') {
            if (transactionFilterMode === 'person') return personWiseDues.length;
            if (transactionFilterMode === 'type') return typeWiseDues.length;
            if (transactionFilterMode === 'class') {
                return classWiseDues.find(c => c.className === activeClassFilter)?.items.length || 0;
            }
            return filteredTransactions.filter(t => t.status?.toUpperCase() === 'PENDING').length;
        }
        return 0;
    };

    return (
        <div className="p-4 space-y-4 animate-fade-in font-bengali min-h-screen bg-slate-50/50 pb-20">
            {/* Main Navigation Tabs */}
            <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 w-full">
                <button
                    onClick={() => { setActiveMainTab('overview'); setActiveSubTab('transactions'); }}
                    className={`flex-1 px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${activeMainTab === 'overview'
                        ? 'bg-[#045c84] text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <Wallet size={14} /> ওভারভিউ
                </button>
                <button
                    onClick={() => { setActiveMainTab('income'); setActiveSubTab('transactions'); }}
                    className={`flex-1 px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${activeMainTab === 'income'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <TrendingUp size={14} /> আয়
                </button>
                <button
                    onClick={() => { setActiveMainTab('expense'); setActiveSubTab('transactions'); }}
                    className={`flex-1 px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${activeMainTab === 'expense'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <TrendingDown size={14} /> ব্যয়
                </button>
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
                    className="space-y-4"
                >
                    {/* Search & Actions Row */}
                    <div className="flex items-center justify-between gap-1 w-full">
                        <div className="relative group flex-1 max-w-xl sm:max-w-2xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#045c84] transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder={activeSubTab === 'categories' ? "খাত খুঁজুন..." : "লেনদেন খুঁজুন..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-14 pr-10 py-3 bg-white border border-slate-100 shadow-sm rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-[#045c84]/10 w-full transition-all"
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

                        {/* Actions (Filter, Download, Add Category) */}
                        <div className="flex items-center gap-2 shrink-0">
                            {activeSubTab === 'categories' ? (
                                <button 
                                    id="add-category-btn-global"
                                    onClick={() => setAddTrigger(prev => prev + 1)}
                                    className={`px-3 sm:px-4 py-2 text-white rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
                                        activeMainTab === 'income' ? 'bg-emerald-600 hover:shadow-emerald-100' : 
                                        activeMainTab === 'expense' ? 'bg-rose-600 hover:shadow-rose-100' : 
                                        'bg-[#045c84] hover:shadow-blue-100'
                                    }`}
                                >
                                    <Plus size={16} /> <span className="hidden sm:inline">নতুন {activeMainTab === 'income' ? 'আয়ের ' : activeMainTab === 'expense' ? 'ব্যয়ের ' : ''}খাত</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <button className="w-9 h-9 sm:w-11 sm:h-11 bg-white border border-slate-200/60 shadow-sm text-slate-400 rounded-xl sm:rounded-2xl hover:text-[#045c84] hover:bg-slate-50 transition-all flex items-center justify-center">
                                        <Filter size={18} />
                                    </button>
                                    <button className="w-9 h-9 sm:w-11 sm:h-11 bg-white border border-slate-200/60 shadow-sm text-slate-400 rounded-xl sm:rounded-2xl hover:text-[#045c84] hover:bg-slate-50 transition-all flex items-center justify-center">
                                        <Download size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Scrollable Container */}
                    <div 
                        className="flex overflow-x-auto gap-1 sm:gap-2 pb-2 scroll-smooth custom-scrollbar" 
                        data-lenis-prevent="true"
                    >
                        {stats.map((stat, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden min-w-[170px] sm:min-w-[200px] flex-1 flex-shrink-0">
                                <div className="flex flex-col gap-1 sm:gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className={`w-9 h-9 sm:w-10 sm:h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center shadow-sm`}>
                                            <stat.icon size={18} />
                                        </div>
                                        <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {stat.change}
                                            {stat.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-400 font-bold text-[8px] sm:text-[9px] uppercase tracking-widest mb-0.5">{stat.label}</h3>
                                        <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Content Area (Table & Sub-tabs) */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all min-h-[500px]">
                        {/* Sub-tab Navigation */}
                        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-50 flex flex-col gap-3 bg-white">
                            {/* Top Row: Tabs and Count */}
                            <div className="flex gap-2 w-full items-center">
                                <div ref={subTabContainerRef} className="flex-1 flex items-center gap-1 p-1 bg-slate-50 rounded-2xl overflow-x-auto hide-scrollbar scroll-smooth min-w-0">
                                    {['transactions', ...((activeMainTab === 'income' || activeMainTab === 'overview') ? ['pending'] : []), 'categories'].map((tab) => (
                                        <button
                                            key={tab}
                                            data-active-subtab={activeSubTab === tab}
                                            onClick={(e) => handleSubTabClick(tab as any, e)}
                                            className={`flex-1 min-w-[110px] px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-center ${activeSubTab === tab
                                                    ? 'bg-white text-[#045c84] shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                        >
                                            {tab === 'transactions' ? 'লেনদেন সমূহ' :
                                             tab === 'categories' ? 'খাত সমূহ' : 'বকেয়া ফি'}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/50 shrink-0">
                                    <button
                                        onClick={() => setViewMode((prev) => prev === 'table' ? 'card' : 'table')}
                                        className="p-2 rounded-lg text-slate-400 hover:text-[#045c84] hover:bg-white transition-all shadow-sm bg-white/80"
                                        title={viewMode === 'table' ? 'কার্ড ভিউ' : 'টেবিল ভিউ'}
                                        aria-label="ভিউ টগোল করুন"
                                    >
                                        {viewMode === 'table' ? <LayoutGrid size={18} /> : <List size={18} />}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Bottom Row: Filters */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                {activeSubTab !== 'categories' && (
                                    <div ref={filterTabsRef} className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/50 overflow-x-auto hide-scrollbar w-full scroll-smooth">
                                        {[
                                            { id: 'all', label: 'সব লেনদেন' },
                                            { id: 'person', label: 'ব্যক্তি ভিত্তিক' },
                                            { id: 'type', label: 'ধরণ ভিত্তিক' },
                                            { id: 'class', label: 'ক্লাস ভিত্তিক' }
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                onClick={(e) => handleFilterTabClick(mode.id as any, e)}
                                                className={`flex-none min-w-[96px] px-2 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                                    transactionFilterMode === mode.id
                                                        ? 'bg-[#045c84] text-white shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                {mode.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeSubTab === 'categories' && (
                                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/50 w-max shrink-0">
                                        {[
                                            { id: 'all', label: 'সব খাত' },
                                            { id: 'income', label: 'আয়ের খাত' },
                                            { id: 'expense', label: 'ব্যয়ের খাত' },
                                            { id: 'archived', label: 'আর্কাইভ করা' }
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                onClick={() => setCategoryFilterMode(mode.id as any)}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                                    categoryFilterMode === mode.id
                                                        ? 'bg-[#045c84] text-white shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                {mode.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {activeSubTab === 'categories' ? (
                            <div className="p-4">
                                <CategoryManagementView 
                                    externalSearchQuery={searchQuery} 
                                    addTrigger={addTrigger}
                                    forcedType={activeMainTab === 'overview' ? undefined : activeMainTab}
                                    categoryFilterMode={categoryFilterMode}
                                    setCategoryFilterMode={setCategoryFilterMode}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="flex-1">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`${activeSubTab}_${transactionFilterMode}`}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                            className="min-h-[320px]"
                                        >
                                            {renderTableContent()}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Enhanced Pagination Controls */}
                                {((activeSubTab === 'transactions' && filteredTransactions.length > 0) || (activeSubTab === 'pending' && filteredTransactions.some(t => t.status?.toUpperCase() === 'PENDING'))) && (
                                    <div ref={paginationRef} className="px-8 py-4 border-t border-slate-50 flex items-center justify-between bg-white mt-auto">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">১-{Math.min(5, getDisplayedCount()).toLocaleString('bn-BD')} (মোট {getDisplayedCount().toLocaleString('bn-BD')}টি)</p>
                                        <div className="flex items-center gap-3">
                                            <button className="px-4 py-2 rounded-xl bg-slate-50 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">পূর্ববর্তী</button>
                                            <button className="px-4 py-2 rounded-xl bg-[#045c84] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 transition-all">পরবর্তী</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>


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
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-l-xl whitespace-nowrap">আইডি</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ফি-এর ধরণ / খাত</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">তারিখ</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-r-xl whitespace-nowrap">পরিমাণ</th>
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
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-l-xl">ব্যক্তির নাম</th>
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
                {feeCollectStudent && !showScanner && (
                    <FeeCollectModal
                        student={feeCollectStudent}
                        onClose={() => setFeeCollectStudent(null)}
                        onSuccess={(msg) => {
                            setToast({ message: msg, type: 'success' });
                            setFeeCollectStudent(null);
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

            {/* Floating Action Buttons */}
            <AnimatePresence>
                {showFloatingActions && (
                    <motion.button
                        key="scan-button"
                        initial={{ opacity: 0, y: 20, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.85 }}
                        transition={{ duration: 0.15 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            // Clear old fee data and open scanner immediately
                            setFeeCollectStudent(null);
                            setShowScanner(true);
                        }}
                        className="fixed bottom-32 right-6 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl z-50 bg-emerald-600 shadow-emerald-600/30 transition-colors"
                        title="স্ক্যান করুন"
                    >
                        <Scan size={28} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFloatingActions && (
                    <motion.button
                        key="add-button"
                        initial={{ opacity: 0, y: 20, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.85 }}
                        transition={{ duration: 0.15 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsTransactionModalOpen(true)}
                        className={`fixed bottom-16 right-6 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl z-50 transition-colors ${
                            activeMainTab === 'income' ? 'bg-emerald-600 shadow-emerald-600/30' : 
                            activeMainTab === 'expense' ? 'bg-rose-600 shadow-rose-600/30' : 
                            'bg-[#045c84] shadow-blue-900/30'
                        }`}
                        title="লেনদেন যোগ করুন"
                    >
                        <Plus size={28} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* QR/Barcode Scanner Modal */}
            <QRBarcodeScanner
                isOpen={showScanner}
                onClose={() => {
                    setShowScanner(false);
                }}
                onScan={handleScanResult}
            />

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

function CategoryManagementView({ externalSearchQuery, addTrigger, forcedType, categoryFilterMode, setCategoryFilterMode }: { externalSearchQuery: string, addTrigger: number, forcedType?: 'income' | 'expense', categoryFilterMode?: 'all' | 'income' | 'expense' | 'archived', setCategoryFilterMode?: (mode: 'all' | 'income' | 'expense' | 'archived') => void }) {
    const { activeInstitute } = useSession();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
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
        
        // Use external categoryFilterMode if provided, otherwise use internal filter
        const filterMode = categoryFilterMode || activeCategoryFilter;
        
        if (forcedType) {
            list = list.filter(c => c.type?.toLowerCase() === forcedType);
        } else {
            if (filterMode === 'income') {
                list = list.filter(c => c.type?.toUpperCase() === 'INCOME' && !c.isArchived);
            } else if (filterMode === 'expense') {
                list = list.filter(c => c.type?.toUpperCase() === 'EXPENSE' && !c.isArchived);
            } else if (filterMode === 'archived') {
                list = list.filter(c => c.isArchived === true);
            }
            // 'all' shows non-archived categories by default
            else if (filterMode === 'all' && !forcedType) {
                list = list.filter(c => !c.isArchived);
            }
        }
        if (externalSearchQuery) {
            const q = externalSearchQuery.toLowerCase();
            list = list.filter(c => c.name.toLowerCase().includes(q));
        }
        return list;
    }, [categories, activeCategoryFilter, externalSearchQuery, categoryFilterMode, forcedType]);

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
            const res = await fetch(`/api/admin/accounts/categories?id=${categoryToDelete.id}`, {
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
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 ${forcedType || categoryFilterMode ? 'hidden' : ''}`}>
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
                                        <div className="flex items-start gap-4 p-5 rounded-2xl border-2 border-rose-500 bg-rose-50/50">
                                            <div className="mt-1 text-rose-500">
                                                <AlertCircle size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-rose-600 mb-1 text-[15px]">বকেয়া ফি মুছুন</h4>
                                                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                                                    ভবিষ্যতে আর নতুন ফি যোগ হবে না এবং সমস্ত অপরিশোধিত (Pending) বকেয়া মুছে যাবে। 
                                                    তবে হিসাবের সুরক্ষার জন্য আগের সমস্ত <span className="text-emerald-600">পরিশোধিত ফি (Paid)</span> অক্ষুণ্ন থাকবে।
                                                </p>
                                            </div>
                                        </div>
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
                                        খাতটি বকেয়া মুক্ত করা হচ্ছে। আপনি চাইলে এই ৫ সেকেন্ডের মধ্যে প্রক্রিয়াটি বাতিল করতে পারেন।
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
