'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
    headerActions?: React.ReactNode;
    noScroll?: boolean;
    fullScreenOnMobile?: boolean;
    drawerOnMobile?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl', headerActions, noScroll = false, fullScreenOnMobile = false, drawerOnMobile = false }: ModalProps) {
    const [mounted, setMounted] = useState(false);

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

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[9999] flex ${drawerOnMobile ? 'items-end md:items-center' : 'items-center'} justify-center ${fullScreenOnMobile && !drawerOnMobile ? 'p-0 md:p-4' : drawerOnMobile ? 'p-0 md:p-4' : 'p-4'}`}>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`bg-white w-full ${maxWidth} ${fullScreenOnMobile && !drawerOnMobile ? 'rounded-none md:rounded-2xl h-[100dvh] md:h-auto md:max-h-[90vh]' : drawerOnMobile ? 'rounded-t-3xl md:rounded-2xl max-h-[85vh] md:max-h-[90vh] pb-4 md:pb-0' : 'rounded-2xl max-h-[90vh]'} shadow-2xl animate-scale-in overflow-hidden relative z-10 flex flex-col font-bengali`}>
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
                    <div className="flex items-center justify-center relative w-full md:w-auto md:flex-none">
                        <button onClick={onClose} className={`${drawerOnMobile ? 'hidden' : 'md:hidden absolute left-0'} p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors`}>
                            <ArrowLeft size={22} />
                        </button>
                        <h2 className="text-base md:text-xl font-bold text-slate-800 uppercase tracking-tight text-center">
                            {title}
                        </h2>
                        {drawerOnMobile && (
                            <button onClick={onClose} className="md:hidden absolute right-0 p-2 -mr-2 text-slate-500 hover:text-slate-800 transition-colors">
                                <X size={22} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center w-full md:w-auto">
                        {headerActions && (
                            <div className="flex-1 overflow-x-auto bg-white md:bg-transparent rounded-xl md:rounded-none p-1.5 md:p-0 shadow-sm md:shadow-none border border-slate-200 md:border-transparent">
                                {headerActions}
                            </div>
                        )}
                        <button onClick={onClose} className="hidden md:flex p-1 text-slate-400 hover:text-slate-600 transition-colors ml-4 border-l border-slate-200 pl-4">
                            <X size={24} />
                        </button>
                    </div>
                </div>
                <div
                    className={`flex-1 flex flex-col min-h-0 ${!noScroll ? 'overflow-y-auto custom-scrollbar' : ''}`}
                    data-lenis-prevent
                >
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
