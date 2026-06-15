"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import PrintableAdmissionForm from './PrintableAdmissionForm';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    institute: any;
    classes: any[];
    groups: any[];
}

export default function PrintAdmissionModal({ isOpen, onClose, student, institute, classes, groups }: Props) {
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!mounted || !isOpen || !student) return null;

    const handlePrint = () => {
        window.print();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8">
            <div className="bg-white w-full max-w-4xl h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">ভর্তি ফর্ম প্রিন্ট করুন</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-[#045c84] text-white rounded-xl font-bold hover:bg-[#034a6b] transition-colors"
                        >
                            <Printer size={18} />
                            প্রিন্ট
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Print Preview Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 flex justify-center custom-scrollbar">
                    <div 
                        id="admission-print-area" 
                        className="bg-white shadow-sm w-full max-w-[210mm] min-h-[297mm] rounded"
                        style={{
                            pageBreakAfter: 'always',
                        }}
                    >
                        <PrintableAdmissionForm 
                            student={student} 
                            institute={institute} 
                            classes={classes} 
                            groups={groups} 
                        />
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    body * { visibility: hidden; }
                    #admission-print-area, #admission-print-area * { visibility: visible; }
                    #admission-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 210mm;
                        padding: 10mm;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}} />
        </div>,
        document.body
    );
}
