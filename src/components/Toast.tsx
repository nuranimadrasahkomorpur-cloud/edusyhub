'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, X, Info } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[999999] animate-fade-in-down w-full max-w-xl px-4">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border-2 ${
                type === 'success'
                ? 'bg-emerald-50/90 border-emerald-200/50 text-emerald-900'
                : type === 'error'
                ? 'bg-red-50/90 border-red-200/50 text-red-900'
                : 'bg-blue-50/90 border-blue-200/50 text-blue-900'
                }`}>
                {type === 'success' ? (
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                    </div>
                ) : type === 'error' ? (
                    <div className="p-2 bg-red-100 rounded-lg">
                        <XCircle size={20} className="text-red-600 flex-shrink-0" />
                    </div>
                ) : (
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Info size={20} className="text-blue-600 flex-shrink-0" />
                    </div>
                )}
                <p className="flex-1 font-bold text-sm tracking-tight">{message}</p>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-black/5 rounded-lg transition-colors opacity-40 hover:opacity-100"
                >
                    <X size={16} />
                </button>
            </div>
        </div>,
        document.body
    );
}
