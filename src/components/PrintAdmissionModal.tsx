"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Settings, ZoomIn, ZoomOut } from 'lucide-react';
import PrintableAdmissionForm, { PrintSettings } from './PrintableAdmissionForm';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    institute: any;
    classes: any[];
    groups: any[];
}

const DEFAULT_SETTINGS: PrintSettings = {
    themeColor: '#107044',
    fontFamily: "'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    layoutStyle: 'standard',
    contentPlacement: 'center'
};

const THEME_COLORS = [
    { name: 'Green', value: '#107044' },
    { name: 'Blue', value: '#045c84' },
    { name: 'Red', value: '#991b1b' },
    { name: 'Black', value: '#1e293b' },
    { name: 'Purple', value: '#581c87' }
];

export default function PrintAdmissionModal({ isOpen, onClose, student, institute, classes, groups }: Props) {
    const [mounted, setMounted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [zoom, setZoom] = useState(1);
    
    // Load settings from database or fallback to localStorage/defaults
    const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
        if (institute?.studentFormConfig) {
            return { ...DEFAULT_SETTINGS, ...institute.studentFormConfig };
        }
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('admissionPrintSettings');
            if (saved) {
                try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch (e) {}
            }
        }
        return DEFAULT_SETTINGS;
    });

    // Save to localStorage as a fallback backup
    useEffect(() => {
        if (mounted) {
            localStorage.setItem('admissionPrintSettings', JSON.stringify(printSettings));
        }
    }, [printSettings, mounted]);

    // Save to Database
    const saveToDatabase = async (newSettings: PrintSettings) => {
        if (!institute?.id) return;
        try {
            await fetch('/api/institute', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: institute.id,
                    studentFormConfig: newSettings
                })
            });
        } catch (error) {
            console.error('Failed to save settings to database', error);
        }
    };

    // Drag to scroll logic state (must be before early return)
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const scrollPos = useRef({ left: 0, top: 0 });

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

    const updateSetting = (key: keyof PrintSettings, value: string) => {
        setPrintSettings(prev => {
            const next = { ...prev, [key]: value };
            saveToDatabase(next);
            return next;
        });
    };

    const handleTextChange = (key: string, text: string) => {
        setPrintSettings(prev => {
            const next = { 
                ...prev, 
                textBlocks: { ...(prev.textBlocks || {}), [key]: text } 
            };
            saveToDatabase(next);
            return next;
        });
    };

    // Drag to scroll logic

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        startPos.current = { x: e.pageX, y: e.pageY };
        if (scrollContainerRef.current) {
            scrollPos.current = {
                left: scrollContainerRef.current.scrollLeft,
                top: scrollContainerRef.current.scrollTop
            };
            scrollContainerRef.current.style.cursor = 'grabbing';
            scrollContainerRef.current.style.userSelect = 'none';
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollContainerRef.current) return;
        e.preventDefault();
        const dx = e.pageX - startPos.current.x;
        const dy = e.pageY - startPos.current.y;
        scrollContainerRef.current.scrollLeft = scrollPos.current.left - dx;
        scrollContainerRef.current.scrollTop = scrollPos.current.top - dy;
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.cursor = 'grab';
            scrollContainerRef.current.style.userSelect = 'auto';
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 print-wrapper print:static print:inset-auto print:p-0 print:bg-white print:block">
            <div className="bg-white w-full max-w-5xl h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-fade-in print:w-full print:max-w-none print:h-auto print:overflow-visible print:shadow-none print:rounded-none print:block">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0 print:hidden">
                    <h2 className="text-lg font-bold text-slate-800">ভর্তি ফর্ম প্রিন্ট করুন</h2>
                    <div className="flex gap-2 items-center">
                        <div className="flex items-center gap-1 mr-2 bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-600" title="Zoom Out">
                                <ZoomOut size={18} />
                            </button>
                            <span className="text-sm font-bold text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-600" title="Zoom In">
                                <ZoomIn size={18} />
                            </button>
                        </div>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors ${showSettings ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            title="Customize Layout"
                        >
                            <Settings size={18} />
                            সেটিংস
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-[#045c84] text-white rounded-xl font-bold hover:bg-[#034a6b] transition-colors"
                        >
                            <Printer size={18} />
                            প্রিন্ট
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-2"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 min-h-0 relative">
                    {/* Settings Sidebar */}
                    {showSettings && (
                        <div className="w-72 border-r border-slate-200 bg-white overflow-y-auto shrink-0 p-5 space-y-6 print:hidden shadow-md z-10 animate-fade-in">
                            <h3 className="font-bold text-slate-800 border-b pb-2">Customization Settings</h3>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Theme Color</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {THEME_COLORS.map(c => (
                                        <button 
                                            key={c.value}
                                            onClick={() => updateSetting('themeColor', c.value)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${printSettings.themeColor === c.value ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent'}`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 text-sm mt-3">
                                    <span className="text-slate-500">Custom:</span>
                                    <input 
                                        type="color" 
                                        value={printSettings.themeColor} 
                                        onChange={(e) => updateSetting('themeColor', e.target.value)}
                                        className="h-8 w-14 cursor-pointer rounded border border-slate-300 p-0.5"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Typography</label>
                                <select 
                                    value={printSettings.fontFamily}
                                    onChange={(e) => updateSetting('fontFamily', e.target.value)}
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#045c84]"
                                >
                                    <option value="'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif">Classic (SolaimanLipi)</option>
                                    <option value="'Noto Sans Bengali', sans-serif">Modern (Noto Sans)</option>
                                    <option value="'Hind Siliguri', sans-serif">Clean (Hind Siliguri)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Layout Density</label>
                                <select 
                                    value={printSettings.layoutStyle}
                                    onChange={(e) => updateSetting('layoutStyle', e.target.value)}
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#045c84]"
                                >
                                    <option value="compact">Compact (Saves Paper)</option>
                                    <option value="standard">Standard</option>
                                    <option value="spacious">Spacious</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Header Alignment</label>
                                <select 
                                    value={printSettings.contentPlacement}
                                    onChange={(e) => updateSetting('contentPlacement', e.target.value)}
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#045c84]"
                                >
                                    <option value="center">Center Aligned</option>
                                    <option value="left">Left Aligned</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Print Preview Area */}
                    <div 
                        ref={scrollContainerRef}
                        className="flex-1 overflow-auto p-4 md:p-8 bg-slate-100 text-center whitespace-nowrap custom-scrollbar print:p-0 print:overflow-visible print:bg-white print:block cursor-grab active:cursor-grabbing"
                        data-lenis-prevent
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <div 
                            id="admission-print-area" 
                            className="bg-white shadow-sm w-[210mm] min-h-[297mm] rounded print:shadow-none print:w-[210mm] print:min-h-0 print:!zoom-100 transition-all origin-top inline-block text-left whitespace-normal align-top mx-auto"
                            style={{ zoom: zoom }}
                        >
                            <PrintableAdmissionForm 
                                student={student} 
                                institute={institute} 
                                classes={classes} 
                                groups={groups} 
                                settings={printSettings}
                                onTextChange={handleTextChange}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 0.2in 0mm 0mm 0mm; }
                    body > *:not(.print-wrapper) {
                        display: none !important;
                    }
                    body {
                        overflow: visible !important;
                        background: white !important;
                    }
                }
            `}} />
        </div>,
        document.body
    );
}
