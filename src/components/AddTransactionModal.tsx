import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Save, CreditCard, Tag, AlignLeft, Calendar } from 'lucide-react';
import { useSession } from '@/components/SessionProvider';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultType: 'income' | 'expense';
    onSuccess: () => void;
}

export default function AddTransactionModal({ isOpen, onClose, defaultType, onSuccess }: AddTransactionModalProps) {
    const { activeInstitute } = useSession();
    const [categories, setCategories] = useState<any[]>([]);
    const [type, setType] = useState<'income' | 'expense'>(defaultType);
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [providerName, setProviderName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const selectedCategory = categories.find(c => c.id === categoryId);
    const isAnyoneProvider = selectedCategory?.provider === 'anyone' || selectedCategory?.targetAudience === 'anyone';

    useEffect(() => {
        if (isOpen && activeInstitute?.id) {
            setType(defaultType);
            setAmount('');
            setCategoryId('');
            setNewCategoryName('');
            setNote('');
            setDate(new Date().toISOString().split('T')[0]);
            setError('');
            
            // Fetch categories
            fetch(`/api/admin/accounts/categories?instituteId=${activeInstitute.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setCategories(data);
                })
                .catch(err => console.error('Error fetching categories:', err));
        }
    }, [isOpen, defaultType, activeInstitute?.id]);

    const filteredCategories = categories.filter(c => c.type?.toLowerCase() === type);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || (!categoryId && !newCategoryName)) {
            setError('Please fill in the required fields.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            let finalCategoryId = categoryId;
            let finalCategoryName = '';

            // If creating a new category
            if (categoryId === 'new') {
                const catRes = await fetch('/api/admin/accounts/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newCategoryName,
                        type: type.toUpperCase(),
                        instituteId: activeInstitute?.id,
                        isFixed: false,
                        isExcludedFromSummary: false
                    })
                });
                
                if (catRes.ok) {
                    const newCat = await catRes.json();
                    // Assuming the backend returns the created category with an id
                    // If it doesn't return the category, we just use the name
                    finalCategoryId = newCat.id || '';
                    finalCategoryName = newCategoryName;
                } else {
                    finalCategoryName = newCategoryName;
                    finalCategoryId = '';
                }
            } else {
                const selectedCat = categories.find(c => c.id === categoryId);
                finalCategoryName = selectedCat ? selectedCat.name : '';
            }

            const res = await fetch('/api/admin/accounts/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    amount,
                    category: finalCategoryName,
                    categoryId: finalCategoryId || undefined,
                    studentName: isAnyoneProvider ? providerName : undefined,
                    note,
                    date,
                    instituteId: activeInstitute?.id
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to add transaction.');
            }
        } catch (err: any) {
            console.error('Error adding transaction:', err);
            setError(err.message || 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-bengali">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className={`px-6 py-4 flex items-center justify-between border-b border-white/20 text-white ${type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                            <h2 className="text-lg font-black tracking-wider flex items-center gap-2">
                                {type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                {type === 'income' ? 'নতুন আয় যুক্ত করুন' : 'নতুন ব্যয় যুক্ত করুন'}
                            </h2>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form Area */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Type Selector (if they want to switch instantly) */}
                            <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                                <button
                                    type="button"
                                    onClick={() => setType('income')}
                                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                                        type === 'income' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <TrendingUp size={14} /> আয় (Income)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('expense')}
                                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                                        type === 'expense' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <TrendingDown size={14} /> ব্যয় (Expense)
                                </button>
                            </div>

                            {/* Amount & Date Row */}
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                        <CreditCard size={12} /> পরিমাণ (৳) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/10 transition-all font-black text-lg text-slate-800"
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                        <Calendar size={12} /> তারিখ
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/10 transition-all font-black text-sm text-slate-800"
                                    />
                                </div>
                            </div>

                            {/* Category Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <Tag size={12} /> খাতের নাম (Khat) <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    value={categoryId}
                                    onChange={e => setCategoryId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/10 transition-all font-bold text-sm text-slate-700 appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 1rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                >
                                    <option value="" disabled>-- খাত নির্বাচন করুন --</option>
                                    <option value="new" className="font-black text-[#045c84]">+ নতুন খাত তৈরি করুন</option>
                                    {filteredCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* New Category Name Input */}
                            <AnimatePresence>
                                {categoryId === 'new' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2 overflow-hidden"
                                    >
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                            নতুন খাতের নাম <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required={categoryId === 'new'}
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            placeholder="যেমন: স্টেশনারী, চা-নাস্তা"
                                            className="w-full px-4 py-3 rounded-2xl border-2 border-emerald-100 bg-emerald-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-sm text-slate-800"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Provider Name Input for ANYONE */}
                            <AnimatePresence>
                                {isAnyoneProvider && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2 overflow-hidden"
                                    >
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                            {type === 'income' ? 'প্রদানকারীর নাম' : 'গ্রহণকারীর নাম'} <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required={isAnyoneProvider}
                                            value={providerName}
                                            onChange={e => setProviderName(e.target.value)}
                                            placeholder="নাম লিখুন..."
                                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/10 transition-all font-bold text-sm text-slate-800"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Note Row */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <AlignLeft size={12} /> বিবরণ / নোট (ঐচ্ছিক)
                                </label>
                                <textarea
                                    rows={2}
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="লেনদেনের বিবরণ লিখুন..."
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#045c84] focus:ring-4 focus:ring-[#045c84]/10 transition-all font-medium text-sm text-slate-700 resize-none"
                                />
                            </div>

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="text-xs font-black text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center justify-center text-center overflow-hidden"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Actions */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white text-xs shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 ${
                                        type === 'income' ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700' : 'bg-rose-600 shadow-rose-600/20 hover:bg-rose-700'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={16} /> সংরক্ষণ করুন
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
