'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Save } from 'lucide-react';
import { ResearchTopic, ResearchStatus, ResearchType } from '../types/research';
import SelectionListModal from './SelectionListModal';

interface EditResearchModalProps {
    isOpen: boolean;
    topic: ResearchTopic | null;
    onClose: () => void;
    onSave: (updatedTopic: ResearchTopic) => void;
}

const STATUS_LIST: ResearchStatus[] = ['Idea', 'Researching', 'Running', 'Tested', 'Validated', 'Improved', 'Failed', 'Archived'];
const SUBJECTS = ['বাংলা', 'ইংরেজি', 'গণিত', 'সাধারণ বিজ্ঞান', 'বাংলাদেশ ও বিশ্বপরিচয়', 'ধর্ম ও নৈতিক শিক্ষা', 'আরবি / কাওয়াইদ'];
const CLASSES = ['প্লে / নার্সারি', 'প্রথম শ্রেণি', 'দ্বিতীয় শ্রেণি', 'তৃতীয় শ্রেণি', 'চতুর্থ শ্রেণি', 'পঞ্চম শ্রেণি', 'ষষ্ঠ শ্রেণি', 'সপ্তম শ্রেণি', 'অষ্টম শ্রেণি', 'নবম-দশম শ্রেণি'];

export default function EditResearchModal({
    isOpen,
    topic,
    onClose,
    onSave
}: EditResearchModalProps) {
    const [mounted, setMounted] = useState(false);
    const [title, setTitle] = useState('');

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    const [problemToSolve, setProblemToSolve] = useState('');
    const [category, setCategory] = useState('');
    const [grade, setGrade] = useState('');
    const [bookName, setBookName] = useState('');
    const [status, setStatus] = useState<ResearchStatus>('Running');
    const [visibility, setVisibility] = useState<'public' | 'invite-only' | 'private'>('public');

    const [activeSelector, setActiveSelector] = useState<{
        title: string;
        options: string[];
        selectedValue: string;
        onSelect: (val: string) => void;
    } | null>(null);

    useEffect(() => {
        if (topic) {
            setTitle(topic.title);
            setProblemToSolve(topic.problemToSolve);
            setCategory(topic.category);
            setGrade(topic.bookInfo.grade);
            setBookName(topic.bookInfo.bookName);
            setStatus(topic.status);
            setVisibility(topic.visibility);
        }
    }, [topic]);

    if (!isOpen || !mounted || !topic) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const updated: ResearchTopic = {
            ...topic,
            title: title.trim(),
            problemToSolve: problemToSolve.trim(),
            category,
            status,
            visibility,
            bookInfo: {
                ...topic.bookInfo,
                grade,
                bookName: bookName.trim()
            },
            updatedAt: new Date().toISOString().split('T')[0]
        };

        onSave(updated);
        onClose();
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">{topic.humanId}</span>
                        <h3 className="text-base font-bold text-slate-800">গবেষণার তথ্য সম্পাদনা</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            গবেষণার শিরোনাম *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            সমস্যার বিবরণ *
                        </label>
                        <textarea
                            rows={3}
                            value={problemToSolve}
                            onChange={(e) => setProblemToSolve(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84]"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                বিষয়
                            </label>
                            <button
                                type="button"
                                onClick={() => setActiveSelector({
                                    title: 'বিষয় নির্বাচন করুন',
                                    options: SUBJECTS,
                                    selectedValue: category,
                                    onSelect: (val) => setCategory(val)
                                })}
                                className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between"
                            >
                                <span>{category}</span>
                                <span className="text-[10px] text-slate-400">পরিবর্তন ▼</span>
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                শ্রেণি
                            </label>
                            <button
                                type="button"
                                onClick={() => setActiveSelector({
                                    title: 'শ্রেণি নির্বাচন করুন',
                                    options: CLASSES,
                                    selectedValue: grade,
                                    onSelect: (val) => setGrade(val)
                                })}
                                className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between"
                            >
                                <span>{grade}</span>
                                <span className="text-[10px] text-slate-400">পরিবর্তন ▼</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                বইয়ের নাম
                            </label>
                            <input
                                type="text"
                                value={bookName}
                                onChange={(e) => setBookName(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                স্ট্যাটাস
                            </label>
                            <button
                                type="button"
                                onClick={() => setActiveSelector({
                                    title: 'স্ট্যাটাস নির্বাচন করুন',
                                    options: STATUS_LIST,
                                    selectedValue: status,
                                    onSelect: (val) => setStatus(val as any)
                                })}
                                className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between"
                            >
                                <span>{status}</span>
                                <span className="text-[10px] text-slate-400">পরিবর্তন ▼</span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            বাতিল
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-6 py-2 rounded-full text-xs font-bold text-white bg-[#045c84] hover:bg-[#034664] shadow-md transition-all active:scale-95"
                        >
                            <Save size={14} />
                            <span>সংরক্ষণ করুন</span>
                        </button>
                    </div>
                </form>
            </div>

            {activeSelector && (
                <SelectionListModal
                    isOpen={true}
                    title={activeSelector.title}
                    options={activeSelector.options}
                    selectedValue={activeSelector.selectedValue}
                    onSelect={activeSelector.onSelect}
                    onClose={() => setActiveSelector(null)}
                />
            )}
        </div>,
        document.body
    );
}
