'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';

interface SelectionOption {
    label: string;
    value: string;
    sublabel?: string;
    badge?: string;
}

interface SelectionListModalProps {
    isOpen: boolean;
    title: string;
    options: (string | SelectionOption)[];
    selectedValue: string;
    onSelect: (value: string) => void;
    onClose: () => void;
    searchPlaceholder?: string;
}

export default function SelectionListModal({
    isOpen,
    title,
    options,
    selectedValue,
    onSelect,
    onClose,
    searchPlaceholder = 'অনুসন্ধান করুন...'
}: SelectionListModalProps) {
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            setSearch('');
            document.body.style.overflow = 'hidden';
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const normalizedOptions = useMemo<SelectionOption[]>(() => {
        return options.map(opt => {
            if (typeof opt === 'string') {
                return { label: opt, value: opt };
            }
            return opt;
        });
    }, [options]);

    const filtered = useMemo(() => {
        if (!search.trim()) return normalizedOptions;
        const q = search.toLowerCase();
        return normalizedOptions.filter(o => 
            o.label.toLowerCase().includes(q) || 
            (o.sublabel && o.sublabel.toLowerCase().includes(q))
        );
    }, [normalizedOptions, search]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-800">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                        title="বন্ধ করুন"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search inside modal if options > 4 */}
                {normalizedOptions.length > 4 && (
                    <div className="px-5 pt-3 pb-2">
                        <div className="relative">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* List of items */}
                <div className="p-4 overflow-y-auto space-y-1.5 flex-1 divide-y divide-slate-50">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-400">
                            কোনো তথ্য পাওয়া যায়নি
                        </div>
                    ) : (
                        filtered.map((item) => {
                            const isSelected = item.value === selectedValue;
                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => {
                                        onSelect(item.value);
                                        onClose();
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all ${
                                        isSelected
                                            ? 'bg-[#045c84] text-white font-bold shadow-sm'
                                            : 'hover:bg-slate-50 text-slate-700 font-medium'
                                    }`}
                                >
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm truncate">{item.label}</span>
                                            {item.badge && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                        {item.sublabel && (
                                            <span className={`text-xs mt-0.5 truncate ${
                                                isSelected ? 'text-cyan-100' : 'text-slate-400'
                                            }`}>
                                                {item.sublabel}
                                            </span>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                            <Check size={14} className="text-white" />
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer close */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        বাতিল
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
