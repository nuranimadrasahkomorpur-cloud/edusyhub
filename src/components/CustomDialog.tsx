'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';

interface CustomDialogProps {
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function CustomDialog({
    isOpen,
    type,
    title,
    message,
    onConfirm,
    onCancel
}: CustomDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={type === 'confirm' ? undefined : onCancel}
            />
            
            {/* Dialog Content */}
            <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                <div className="p-8">
                    <div className="flex items-start gap-5">
                        <div className={`p-4 rounded-2xl shrink-0 ${
                            type === 'confirm' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                            {type === 'confirm' ? <HelpCircle size={28} /> : <AlertCircle size={28} />}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight font-bengali">
                                {title}
                            </h3>
                            <p className="text-slate-500 leading-relaxed font-medium font-bengali whitespace-pre-line">
                                {message}
                            </p>
                        </div>

                        <button 
                            onClick={onCancel}
                            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-8 flex items-center justify-end gap-3">
                        {type === 'confirm' && (
                            <button
                                onClick={onCancel}
                                className="px-6 py-3 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all font-bengali"
                            >
                                বাতিল করুন
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            className={`px-8 py-3 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 font-bengali ${
                                type === 'confirm' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-[#045c84] hover:bg-[#034a6a] shadow-blue-200'
                            }`}
                        >
                            {type === 'confirm' ? 'হ্যাঁ, নিশ্চিত' : 'ঠিক আছে'}
                        </button>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>
        </div>
    );
}
