"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PrintLayout from '@/components/PrintLayout';
import {
    ChevronLeft,
    Users,
    Printer,
    Settings2,
    ZoomIn,
    ZoomOut,
    X,
    Search,
    Check,
    ChevronDown,
    ChevronUp,
    List,
    Grid,
    Calendar,
    Copy,
} from 'lucide-react';
import { getCleanId } from '@/utils/digit-utils';

interface Props {
    payload: {
        students: any[];
        attendanceList: any[];
        classes: any[];
        institute: any;
        startDate: string;
        endDate: string;
        selectedClassId: string;
    };
    onClose: () => void;
}

export default function AttendancePrintPreviewModal({ payload, onClose }: Props) {
    const { students = [], attendanceList = [], classes = [], institute = null, startDate, endDate, selectedClassId: initialClassId } = payload;

    // Generate list of dates within range
    const dateList = useMemo(() => {
        const dates: string[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }, [startDate, endDate]);

    // Convert English digits to Bengali digits
    const englishToBengaliDigits = (num: number | string) => {
        const mapping: Record<string, string> = {
            '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
            '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
        };
        return String(num).replace(/[0-9]/g, (d) => mapping[d] || d);
    };

    // Format date in Bengali (e.g. 17, মঙ্গল)
    const getBengaliDayName = (dateStr: string) => {
        const date = new Date(dateStr);
        const dayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
        return dayNames[date.getDay()];
    };

    // Format date range in Bengali
    const getBengaliDateRange = (startDateStr: string, endDateStr: string) => {
        if (!startDateStr || !endDateStr) return '';
        
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return '';
        }
        
        const startYear = start.getFullYear();
        const startMonth = start.getMonth(); // 0-indexed: 0-11
        const startDay = start.getDate();
        
        const endYear = end.getFullYear();
        const endMonth = end.getMonth();
        const endDay = end.getDate();
        
        const banglaMonths = [
            'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        
        const lastDayOfMonth = new Date(startYear, startMonth + 1, 0).getDate();
        
        const isFullMonth = startYear === endYear && startMonth === endMonth && startDay === 1 && endDay === lastDayOfMonth;

        if (isFullMonth) {
            return `${banglaMonths[startMonth]} ${englishToBengaliDigits(startYear)}`;
        }
        
        if (startDateStr === endDateStr) {
            return `${englishToBengaliDigits(startDay)} ${banglaMonths[startMonth]} ${englishToBengaliDigits(startYear)}`;
        }
        
        const startDayBn = englishToBengaliDigits(startDay);
        const startYearBn = englishToBengaliDigits(startYear);
        const endDayBn = englishToBengaliDigits(endDay);
        const endYearBn = englishToBengaliDigits(endYear);
        
        return `${startDayBn} ${banglaMonths[startMonth]} ${startYearBn} - ${endDayBn} ${banglaMonths[endMonth]} ${endYearBn}`;
    };

    // Calculate individual student stats
    const studentWithStats = useMemo(() => {
        return students.map((s: any) => {
            const studentId = s.id;
            const records = attendanceList.filter((a: any) => {
                const aStudentId = a.studentId?.$oid || a.studentId;
                return String(aStudentId) === String(studentId);
            });

            // Map dateStrings to status for register grid
            const dateStatusMap: Record<string, string> = {};
            records.forEach((r: any) => {
                dateStatusMap[r.dateString] = r.status;
            });

            const present = records.filter((r: any) => r.status === 'PRESENT').length;
            const absent = records.filter((r: any) => r.status === 'ABSENT').length;
            const late = records.filter((r: any) => r.status === 'LATE').length;
            const leave = records.filter((r: any) => ['LEAVE', 'LEAVE_PENDING'].includes(r.status)).length;
            
            // Total school days can be approximated by number of days in range that had at least one attendance record across the class
            // But let's count dates where this student had any record, or fallback to total dates.
            const totalWorking = dateList.length;
            const rate = totalWorking > 0 ? Math.round(((present + late) / totalWorking) * 100) : 0;

            return {
                ...s,
                present,
                absent,
                late,
                leave,
                totalWorking,
                rate,
                dateStatusMap
            };
        });
    }, [students, attendanceList, dateList]);

    // Selection & filter states
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => {
        return new Set(studentWithStats.map(s => s.id));
    });
    const [viewMode, setViewMode] = useState<'card' | 'register'>('card');
    const [mounted, setMounted] = useState(false);
    const [leftOpen, setLeftOpen] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    
    // settings
    const [fontSize, setFontSize] = useState(13);
    const [rowPadding, setRowPadding] = useState(6);
    const [pagePadding, setPagePadding] = useState(16);
    const [rowsPerPage, setRowsPerPage] = useState(8);
    const [leftSignatureLabel, setLeftSignatureLabel] = useState('শ্রেণি শিক্ষকের স্বাক্ষর');
    const [rightSignatureLabel, setRightSignatureLabel] = useState('প্রধান শিক্ষকের স্বাক্ষর');
    const [pageSize, setPageSize] = useState<'A4' | 'A3' | 'Letter' | 'Legal' | 'A5'>('A4');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [scale, setScale] = useState(1);
    const [isAutoFit, setIsAutoFit] = useState(true);
    const [translateX, setTranslateX] = useState(0);
    const [translateY, setTranslateY] = useState(0);
    
    // Touch gesture tracking refs
    const touchStateRef = useRef({
        startX: 0,
        startY: 0,
        startDist: 0,
        startScale: 1,
        startTranslateX: 0,
        startTranslateY: 0,
        isPinching: false,
        isDragging: false
    });

    const contentRef = useRef<HTMLDivElement | null>(null);
    const mainRef = useRef<HTMLElement | null>(null);
    const outerRef = useRef<HTMLDivElement | null>(null);

    // Sidebar toggles
    useEffect(() => {
        setMounted(true);
        if (window.innerWidth >= 1024) {
            setLeftOpen(true);
            setRightOpen(true);
        } else {
            setLeftOpen(false);
            setRightOpen(false);
        }
    }, []);

    // Filter students visible in the sidebar list
    const visibleStudents = useMemo(() => {
        return studentWithStats.filter(s => {
            const matchClass = selectedClassId === 'all' || getCleanId(s.metadata?.classId) === selectedClassId;
            const matchSearch = !filterText || s.name.toLowerCase().includes(filterText.toLowerCase()) || 
                                (s.metadata?.rollNumber && String(s.metadata.rollNumber) === filterText);
            return matchClass && matchSearch;
        });
    }, [studentWithStats, selectedClassId, filterText]);

    // Filter students to actually render for print
    const printStudents = useMemo(() => {
        return studentWithStats.filter(s => {
            if (!selectedStudentIds.has(s.id)) return false;
            const matchClass = selectedClassId === 'all' || getCleanId(s.metadata?.classId) === selectedClassId;
            const matchSearch = !filterText || s.name.toLowerCase().includes(filterText.toLowerCase());
            return matchClass && matchSearch;
        });
    }, [studentWithStats, selectedStudentIds, selectedClassId, filterText]);

    // Group print students by class
    const groupedStudents = useMemo(() => {
        const groups: Record<string, any[]> = {};
        printStudents.forEach(s => {
            const cid = getCleanId(s.metadata?.classId) || 'unknown';
            if (!groups[cid]) groups[cid] = [];
            groups[cid].push(s);
        });

        return Object.entries(groups).map(([cid, students]) => {
            const cName = classes.find(c => c.id === cid)?.name || 'অজানা ক্লাস';
            return { classId: cid, className: cName, students };
        }).sort((a, b) => {
            const idxA = classes.findIndex(c => c.id === a.classId);
            const idxB = classes.findIndex(c => c.id === b.classId);
            return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
        });
    }, [printStudents, classes]);

    // Toggle single student
    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Toggle all visible students
    const toggleAllVisible = () => {
        const visibleIds = visibleStudents.map(s => s.id);
        const allSelected = visibleIds.every(id => selectedStudentIds.has(id));
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                visibleIds.forEach(id => next.delete(id));
            } else {
                visibleIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        const touches = e.touches;
        if (touches.length === 1) {
            touchStateRef.current.isDragging = true;
            touchStateRef.current.isPinching = false;
            touchStateRef.current.startX = touches[0].clientX;
            touchStateRef.current.startY = touches[0].clientY;
            touchStateRef.current.startTranslateX = translateX;
            touchStateRef.current.startTranslateY = translateY;
        } else if (touches.length === 2) {
            touchStateRef.current.isPinching = true;
            touchStateRef.current.isDragging = false;
            const dist = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
            touchStateRef.current.startDist = dist;
            touchStateRef.current.startScale = scale;
            setIsAutoFit(false);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const touches = e.touches;
        if (touchStateRef.current.isPinching && touches.length === 2) {
            const dist = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
            const factor = dist / touchStateRef.current.startDist;
            const newScale = Math.min(3, Math.max(0.3, touchStateRef.current.startScale * factor));
            setScale(+newScale.toFixed(2));
        } else if (touchStateRef.current.isDragging && touches.length === 1) {
            const deltaX = touches[0].clientX - touchStateRef.current.startX;
            const deltaY = touches[0].clientY - touchStateRef.current.startY;
            setTranslateX(touchStateRef.current.startTranslateX + deltaX);
            setTranslateY(touchStateRef.current.startTranslateY + deltaY);
            setIsAutoFit(false);
        }
    };

    const handleTouchEnd = () => {
        touchStateRef.current.isDragging = false;
        touchStateRef.current.isPinching = false;
    };

    // Reset translations when structure options change
    useEffect(() => {
        setTranslateX(0);
        setTranslateY(0);
    }, [pageSize, orientation, viewMode]);

    // Handle fitting scaled preview
    const handleFit = useCallback(() => {
        if (!contentRef.current) return;
        const contentWidth = contentRef.current.scrollWidth || 800;
        
        // Calculate padding dynamically based on screen width
        const padding = typeof window !== 'undefined' && window.innerWidth < 640 ? 24 : 48;
        
        const available = mainRef.current
            ? mainRef.current.clientWidth - padding
            : window.innerWidth - (leftOpen ? 300 : 0) - (rightOpen ? 320 : 0) - (padding + 16);
        const newScale = Math.min(3, Math.max(0.3, available / contentWidth));
        setScale(+newScale.toFixed(2));
    }, [leftOpen, rightOpen]);

    useEffect(() => {
        if (isAutoFit) {
            handleFit();
        }
    }, [leftOpen, rightOpen, fontSize, viewMode, isAutoFit, handleFit]);

    // Handle window resize for auto fit scaling
    useEffect(() => {
        if (!isAutoFit) return;
        const handleResize = () => {
            handleFit();
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [isAutoFit, handleFit]);

    // Update CSS variables inside preview canvas
    useEffect(() => {
        if (!contentRef.current) return;
        const el = contentRef.current;
        el.style.setProperty('--cell-pv', `${rowPadding}px`);
        el.style.setProperty('--page-padding', `${pagePadding}px`);
        el.style.setProperty('--font-size', `${fontSize}px`);
    }, [rowPadding, pagePadding, fontSize]);

    // Sync outer wrapper height with actual content so it scrolls naturally
    useEffect(() => {
        if (!contentRef.current || !outerRef.current) return;
        const updateHeight = () => {
            if (contentRef.current && outerRef.current) {
                outerRef.current.style.height = `${Math.round(contentRef.current.scrollHeight * scale)}px`;
            }
        };
        const ro = new ResizeObserver(updateHeight);
        ro.observe(contentRef.current);
        updateHeight();
        return () => ro.disconnect();
    }, [scale, viewMode, groupedStudents]);

    const handlePrint = () => window.print();

    // Copy to Excel Clipboard Handler
    const handleCopyToExcel = () => {
        if (printStudents.length === 0) return;
        
        let tsv = '';
        if (viewMode === 'card') {
            tsv = ['ক্র.নং', 'রোল', 'নাম', 'আইডি', 'মোট কর্মদিবস', 'উপস্থিত', 'অনুপস্থিত', 'ছুটি', 'গড় হার'].join('\t') + '\n';
            let idx = 1;
            printStudents.forEach(s => {
                tsv += [
                    idx++,
                    s.metadata?.rollNumber || '-',
                    s.name,
                    s.metadata?.studentId || s.id,
                    s.totalWorking,
                    s.present + s.late,
                    s.absent,
                    s.leave,
                    `${s.rate}%`
                ].join('\t') + '\n';
            });
        } else {
            // Register Grid Headers
            const headers = ['রোল', 'নাম', ...dateList.map(d => d.split('-')[2]), 'উপস্থিত', '%'];
            tsv = headers.join('\t') + '\n';
            printStudents.forEach(s => {
                const datesRow = dateList.map(d => {
                    const status = s.dateStatusMap[d];
                    return status === 'PRESENT' ? 'P' : status === 'ABSENT' ? 'A' : status === 'LATE' ? 'L' : status === 'LEAVE' || status === 'LEAVE_PENDING' ? 'H' : '-';
                });
                tsv += [
                    s.metadata?.rollNumber || '-',
                    s.name,
                    ...datesRow,
                    `${s.present + s.late}/${s.totalWorking}`,
                    `${s.rate}%`
                ].join('\t') + '\n';
            });
        }

        navigator.clipboard.writeText(tsv).then(() => {
            alert('সফলভাবে এক্সেল ফরম্যাটে কপি হয়েছে! Excel বা Sheets এ পেস্ট করুন।');
        }).catch(() => {
            alert('কপি ব্যর্থ হয়েছে।');
        });
    };

    const totalPages = useMemo(() => {
        let count = 0;
        groupedStudents.forEach(group => {
            const chunkSize = viewMode === 'card' 
                ? (orientation === 'landscape' ? 8 : 12) 
                : rowsPerPage;
            const pages = Math.ceil(group.students.length / chunkSize);
            count += Math.max(1, pages);
        });
        return Math.max(1, count);
    }, [groupedStudents, viewMode, orientation, rowsPerPage]);

    if (!mounted) return null;

    return createPortal(
        <div className="print-modal-root fixed inset-0 z-[9999] flex flex-col bg-[#e8ecf0] overflow-hidden" style={{ fontFamily: "'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
            
            {/* Top Header */}
            <header className="flex-shrink-0 flex items-center px-4 bg-white border-b border-slate-200 shadow-sm" style={{ height: '64px' }}>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white bg-orange-500 transition-all hover:opacity-90 active:scale-95 shadow-sm mr-2 z-10"
                >
                    <ChevronLeft size={16} />
                    ফিরে যান
                </button>

                <div className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar whitespace-nowrap py-1">
                    <button
                        onClick={() => setLeftOpen(p => !p)}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                        style={{ background: leftOpen ? '#4f46e5' : '#64748b' }}
                    >
                        <Users size={15} />
                        শিক্ষার্থী তালিকা ({selectedStudentIds.size})
                    </button>

                    <div className="flex-shrink-0 pl-3 hidden sm:block">
                        <p className="text-sm font-black text-slate-800 truncate">হাজিরা সামারি রিপোর্ট প্রিন্ট প্রিভিউ</p>
                        <p className="text-xs text-slate-400 truncate">তারিখ সীমা: {englishToBengaliDigits(startDate)} থেকে {englishToBengaliDigits(endDate)}</p>
                    </div>

                    <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0">
                        <button
                            onClick={handleCopyToExcel}
                            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white bg-emerald-600 transition-all hover:opacity-90 active:scale-95 shadow-sm"
                        >
                            <Copy size={15} />
                            এক্সেল কপি
                        </button>

                        <button
                            onClick={handlePrint}
                            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white bg-blue-600 transition-all hover:opacity-90 active:scale-95 shadow-sm"
                        >
                            <Printer size={15} />
                            প্রিন্ট করুন
                        </button>

                        <button
                            onClick={() => setRightOpen(p => !p)}
                            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                            style={{ background: rightOpen ? '#8b5cf6' : '#64748b' }}
                        >
                            <Settings2 size={15} />
                            সেটিংস
                        </button>
                    </div>
                </div>
            </header>

            {/* Content Body */}
            <div className="print-modal-body relative flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
                
                {/* Backdrop overlay for mobile views when sidebars are open */}
                {(leftOpen || rightOpen) && (
                    <div 
                        className="lg:hidden absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] z-20 transition-all duration-300"
                        onClick={() => {
                            setLeftOpen(false);
                            setRightOpen(false);
                        }}
                    />
                )}

                {/* Left Drawer: Students Selection list */}
                <aside
                    className="lg:static absolute left-0 top-0 bottom-0 h-full z-30 bg-white lg:border-r border-slate-200 shadow-2xl lg:shadow-none flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300"
                    style={{ width: leftOpen ? '300px' : '0px', opacity: leftOpen ? 1 : 0 }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800">শিক্ষার্থী ফিল্টার</span>
                    </div>

                    {/* Class Select Toggles */}
                    <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto border-b border-slate-100 hide-scrollbar">
                        <button
                            onClick={() => setSelectedClassId('all')}
                            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                selectedClassId === 'all' ? 'bg-[#4f46e5] text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            সব ক্লাস
                        </button>
                        {classes.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedClassId(c.id)}
                                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    selectedClassId === c.id ? 'bg-[#4f46e5] text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="px-3 py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                            <Search size={14} className="text-slate-400 flex-shrink-0" />
                            <input
                                value={filterText}
                                onChange={e => setFilterText(e.target.value)}
                                placeholder="রোল বা নাম দিয়ে খুঁজুন..."
                                className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-xs text-slate-500 font-bold">
                            নির্বাচিত: <span className="text-[#4f46e5]">{selectedStudentIds.size} জন</span>
                        </span>
                        <button
                            onClick={toggleAllVisible}
                            className="text-xs font-bold text-[#4f46e5] bg-[#e0e7ff] hover:bg-[#c7d2fe] px-2 py-1 rounded"
                        >
                            {visibleStudents.every(s => selectedStudentIds.has(s.id)) ? 'সব সরান' : 'সব সিলেক্ট'}
                        </button>
                    </div>

                    {/* Student List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                        {visibleStudents.map(s => {
                            const isSelected = selectedStudentIds.has(s.id);
                            return (
                                <div
                                    key={s.id}
                                    onClick={() => toggleStudent(s.id)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                                        isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'
                                    }`}
                                >
                                    <div
                                        className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all ${
                                            isSelected ? 'bg-[#4f46e5] border-transparent text-white' : 'border-slate-300 bg-white'
                                        }`}
                                    >
                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-slate-700 truncate">{s.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">রোল: {s.metadata?.rollNumber || '-'} | আইডি: {s.metadata?.studentId || '-'}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* Center Canvas */}
                <main
                    ref={mainRef as any}
                    className="flex-1 overflow-auto bg-[#e8ecf0] p-3 sm:p-6 z-0 select-none touch-none"
                    data-lenis-prevent="true"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="print-reset-table mx-auto" style={{ display: 'table' }}>
                        <div
                            ref={outerRef}
                            className="print-reset-outer"
                            style={{
                                width: Math.round((() => {
                                    const dims: Record<string, { w: number; h: number }> = { A4: { w: 794, h: 1123 }, A3: { w: 1123, h: 1587 }, A5: { w: 559, h: 794 }, Letter: { w: 816, h: 1056 }, Legal: { w: 816, h: 1344 } };
                                    const d = dims[pageSize] || dims['A4'];
                                    return (orientation === 'landscape' ? d.h : d.w) * scale;
                                })()),
                                // height is dynamically set by ResizeObserver
                                position: 'relative',
                                flexShrink: 0,
                            }}
                        >
                            <div
                                ref={contentRef}
                                className="print-reset-inner"
                                style={(() => {
                                    const dims: Record<string, { w: number; h: number }> = { A4: { w: 794, h: 1123 }, A3: { w: 1123, h: 1587 }, A5: { w: 559, h: 794 }, Letter: { w: 816, h: 1056 }, Legal: { w: 816, h: 1344 } };
                                    const d = dims[pageSize] || dims['A4'];
                                    const pw = orientation === 'landscape' ? d.h : d.w;
                                    return {
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'top left',
                                        width: pw,
                                        position: 'absolute' as const,
                                        top: 0,
                                        left: 0,
                                    };
                                })()}
                            >
                                {/* ── REGISTER VIEW: one long page per class ── */}
                                {viewMode === 'register' && (
                                    <>
                                        {groupedStudents.map((group) => (
                                            <PrintLayout
                                                key={`${group.classId}-register`}
                                                title="হাজিরা সামারি রিপোর্ট"
                                                subtitle={
                                                    <div className="flex gap-2 items-center justify-center">
                                                        <span className="font-black text-[12px] text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-3.5 py-0.5 rounded-full shadow-sm">
                                                            শ্রেণি: {group.className}
                                                        </span>
                                                    </div>
                                                }
                                                institute={institute}
                                                pageSize={pageSize}
                                                date={getBengaliDateRange(startDate, endDate)}
                                                hideDate={false}
                                                hideTitle={false}
                                                previewOnly={true}
                                                pagePadding={pagePadding}
                                                leftSignatureLabel={leftSignatureLabel}
                                                rightSignatureLabel={rightSignatureLabel}
                                            >
                                                <div className="overflow-x-auto mt-2">
                                                    <table 
                                                        className="w-full text-center border-collapse border border-slate-400 [&_th]:border [&_th]:border-slate-400 [&_td]:border [&_td]:border-slate-400"
                                                        style={{ fontSize: `${fontSize}px` }}
                                                    >
                                                        <thead>
                                                            <tr className="bg-slate-100 font-black text-slate-800 select-none">
                                                                <th className="py-2.5 px-2 font-black" style={{ minWidth: '3em' }}>রোল</th>
                                                                <th className="py-2.5 px-3 font-black text-left" style={{ minWidth: '10em' }}>নাম</th>
                                                                {dateList.map((dayStr) => {
                                                                    const dayNum = dayStr.split('-')[2];
                                                                    const dayName = getBengaliDayName(dayStr);
                                                                    return (
                                                                        <th key={dayStr} className="py-1 font-black leading-tight" style={{ minWidth: '2.2em', fontSize: '0.85em' }}>
                                                                            <div>{dayNum}</div>
                                                                            <div className="font-bold text-slate-400" style={{ fontSize: '0.75em' }}>{dayName}</div>
                                                                        </th>
                                                                    );
                                                                })}
                                                                <th className="py-2.5 px-2 font-black" style={{ minWidth: '4em' }}>উপস্থিত</th>
                                                                <th className="py-2.5 px-2 font-black" style={{ minWidth: '3em' }}>%</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {group.students.map((s) => (
                                                                <tr key={s.id} className="hover:bg-slate-50 transition-colors font-bold text-slate-700">
                                                                    <td className="py-2 px-1 font-black text-slate-400">
                                                                        {s.metadata?.rollNumber || '-'}
                                                                    </td>
                                                                    <td className="py-2 px-3 text-left font-black text-slate-800">
                                                                        {s.name}
                                                                    </td>
                                                                    {dateList.map((dayStr) => {
                                                                        const status = s.dateStatusMap[dayStr];
                                                                        const label = status === 'PRESENT' ? 'P' :
                                                                                      status === 'ABSENT' ? 'A' :
                                                                                      status === 'LATE' ? 'L' :
                                                                                      status === 'LEAVE' || status === 'LEAVE_PENDING' ? 'H' : '-';
                                                                        const color = status === 'PRESENT' ? 'text-emerald-600 bg-emerald-50/50' :
                                                                                      status === 'ABSENT' ? 'text-rose-600 bg-rose-50/50' :
                                                                                      status === 'LATE' ? 'text-amber-600 bg-amber-50/50' :
                                                                                      status === 'LEAVE' || status === 'LEAVE_PENDING' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-300';
                                                                        return (
                                                                            <td key={dayStr} className={`py-2 px-1 font-black ${color}`} style={{ fontSize: '0.85em' }}>
                                                                                {label}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td className="py-2 px-1 text-[#045c84] font-black">
                                                                        {s.present + s.late}/{s.totalWorking}
                                                                    </td>
                                                                    <td className="py-2 px-1 text-slate-900">
                                                                        <span className={`font-black px-1 py-0.5 rounded-md ${
                                                                            s.rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                                            s.rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'
                                                                        }`} style={{ fontSize: '0.85em' }}>
                                                                            {s.rate}%
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </PrintLayout>
                                        ))}
                                        {groupedStudents.length === 0 && (
                                            <PrintLayout
                                                title="হাজিরা সামারি রিপোর্ট"
                                                institute={institute}
                                                pageSize={pageSize}
                                                hideDate={true}
                                                hideTitle={true}
                                                previewOnly={true}
                                                pagePadding={pagePadding}
                                                leftSignatureLabel={leftSignatureLabel}
                                                rightSignatureLabel={rightSignatureLabel}
                                            >
                                                <div className="text-center text-slate-400 py-10 font-bold">কোনো শিক্ষার্থী নির্বাচিত নেই</div>
                                            </PrintLayout>
                                        )}
                                    </>
                                )}

                                {/* ── CARD VIEW: chunked pages ── */}
                                {viewMode === 'card' && (
                                    <>
                                        {groupedStudents.flatMap((group) => {
                                            const chunkSize = orientation === 'landscape' ? 8 : 12;
                                            const chunks: any[][] = [];
                                            for (let i = 0; i < group.students.length; i += chunkSize) {
                                                chunks.push(group.students.slice(i, i + chunkSize));
                                            }
                                            if (chunks.length === 0) chunks.push([]);

                                            return chunks.map((chunkStudents, pageIndex) => {
                                                const pageNumberBengali = (pageIndex + 1).toLocaleString('bn-BD');
                                                const totalPagesBengali = chunks.length.toLocaleString('bn-BD');

                                                return (
                                                    <PrintLayout
                                                        key={`${group.classId}-card-${pageIndex}`}
                                                        title="হাজিরা সামারি রিপোর্ট"
                                                        subtitle={
                                                            <div className="flex gap-2 items-center justify-center">
                                                                <span className="font-black text-[12px] text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-3.5 py-0.5 rounded-full shadow-sm">
                                                                    শ্রেণি: {group.className}
                                                                </span>
                                                                {chunks.length > 1 && (
                                                                    <span className="font-black text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                                                                        পৃষ্ঠা: {pageNumberBengali}/{totalPagesBengali}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        }
                                                        institute={institute}
                                                        pageSize={pageSize}
                                                        date={getBengaliDateRange(startDate, endDate)}
                                                        hideDate={false}
                                                        hideTitle={false}
                                                        previewOnly={true}
                                                        pagePadding={pagePadding}
                                                        leftSignatureLabel={leftSignatureLabel}
                                                        rightSignatureLabel={rightSignatureLabel}
                                                    >
                                                        {chunkStudents.length > 0 && (
                                                            <div 
                                                                className="grid gap-4 mt-2"
                                                                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
                                                            >
                                                                {chunkStudents.map((s) => (
                                                                    <div 
                                                                        key={s.id}
                                                                        className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between leading-normal hover:shadow transition-shadow"
                                                                        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                                                                    >
                                                                        <div>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className="text-[11px] font-black px-2 py-0.5 bg-slate-100 rounded-md text-slate-500">
                                                                                    রোল: {s.metadata?.rollNumber || '-'}
                                                                                </span>
                                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                                                    s.rate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                                                    s.rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-600'
                                                                                }`}>
                                                                                    {s.rate}% গড় হার
                                                                                </span>
                                                                            </div>
                                                                            <h4 className="text-[15px] font-black text-slate-800 truncate mb-1">{s.name}</h4>
                                                                            <p className="text-[10px] font-bold text-slate-400 mb-3">আইডি: {s.metadata?.studentId || '-'}</p>
                                                                        </div>
                                                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden">
                                                                            <div 
                                                                                className={`h-full rounded-full ${s.rate >= 80 ? 'bg-emerald-500' : s.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                                                style={{ width: `${s.rate}%` }}
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                                                                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                                                <span className="block text-slate-400 leading-none mb-1">মোট</span>
                                                                                <span className="text-slate-700 font-black">{s.totalWorking}</span>
                                                                            </div>
                                                                            <div className="bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100/50">
                                                                                <span className="block text-emerald-500 leading-none mb-1">উপস্থিত</span>
                                                                                <span className="text-emerald-700 font-black">{s.present + s.late}</span>
                                                                            </div>
                                                                            <div className="bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/50">
                                                                                <span className="block text-rose-500 leading-none mb-1">অনুপস্থিত</span>
                                                                                <span className="text-rose-700 font-black">{s.absent}</span>
                                                                            </div>
                                                                            <div className="bg-blue-50/50 p-1.5 rounded-lg border border-blue-100/50">
                                                                                <span className="block text-blue-500 leading-none mb-1">ছুটি</span>
                                                                                <span className="text-blue-700 font-black">{s.leave}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </PrintLayout>
                                                );
                                            });
                                        })}
                                        {groupedStudents.length === 0 && (
                                            <PrintLayout
                                                title="হাজিরা সামারি রিপোর্ট"
                                                institute={institute}
                                                pageSize={pageSize}
                                                hideDate={true}
                                                hideTitle={true}
                                                previewOnly={true}
                                                pagePadding={pagePadding}
                                                leftSignatureLabel={leftSignatureLabel}
                                                rightSignatureLabel={rightSignatureLabel}
                                            >
                                                <div className="text-center text-slate-400 py-10 font-bold">কোনো শিক্ষার্থী নির্বাচিত নেই</div>
                                            </PrintLayout>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Drawer: Print configurations */}
                <aside
                    className="lg:static absolute right-0 top-0 bottom-0 h-full z-30 bg-white lg:border-l border-slate-200 shadow-2xl lg:shadow-none flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300"
                    style={{ width: rightOpen ? '320px' : '0px', opacity: rightOpen ? 1 : 0 }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800">প্রিন্ট কনফিগারেশন</span>
                    </div>

                    {/* View mode toggle */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => { setViewMode('card'); setOrientation('portrait'); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    viewMode === 'card' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Grid size={13} />
                                কার্ড ভিউ
                            </button>
                            <button
                                onClick={() => { setViewMode('register'); setOrientation('landscape'); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    viewMode === 'register' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <List size={13} />
                                রেজিস্টার ভিউ
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6 custom-scrollbar">
                        {/* Layout size controls */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">লেআউট ও পেজ সাইজ</h4>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">পেজ সাইজ</label>
                                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                                        {(['A4', 'A3', 'Letter', 'Legal'] as const).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => setPageSize(size)}
                                                className={`py-1.5 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer ${
                                                    pageSize === size ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                {size === 'A4' ? 'A4' : size === 'A3' ? 'A3' : size === 'Letter' ? 'লেটার' : 'লিগ্যাল'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">ওরিয়েন্টেশন</label>
                                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                                        <button
                                            onClick={() => setOrientation('portrait')}
                                            className={`py-1.5 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer ${
                                                orientation === 'portrait' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            খাড়া
                                        </button>
                                        <button
                                            onClick={() => setOrientation('landscape')}
                                            className={`py-1.5 rounded-lg text-[11px] font-black transition-all text-center cursor-pointer ${
                                                orientation === 'landscape' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            আড়াআড়ি
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Adjustments sliders */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">ফন্ট ও প্যাডিং অ্যাডজাস্টমেন্ট</h4>

                            {/* Font size */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                    <span>ফন্ট সাইজ</span>
                                    <span className="text-[#4f46e5] font-black">{fontSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="9"
                                    max="20"
                                    value={fontSize}
                                    onChange={e => setFontSize(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#4f46e5]"
                                />
                            </div>

                            {/* Row padding */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                    <span>সারি প্যাডিং</span>
                                    <span className="text-[#4f46e5] font-black">{rowPadding}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="2"
                                    max="20"
                                    value={rowPadding}
                                    onChange={e => setRowPadding(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#4f46e5]"
                                />
                            </div>

                            {/* Page margins */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                    <span>পেজ মার্জিন</span>
                                    <span className="text-[#4f46e5] font-black">{pagePadding}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="4"
                                    max="40"
                                    value={pagePadding}
                                    onChange={e => setPagePadding(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#4f46e5]"
                                />
                            </div>

                            {/* Rows per page (register view only) */}
                            {viewMode === 'register' && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                        <span>প্রতি পেজে সারি সংখ্যা</span>
                                        <span className="text-[#4f46e5] font-black">{rowsPerPage}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="3"
                                        max="25"
                                        value={rowsPerPage}
                                        onChange={e => setRowsPerPage(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#4f46e5]"
                                    />
                                    <p className="text-[10px] text-slate-400">সারি বেশি হলে নতুন পেজে যাবে</p>
                                </div>
                            )}
                        </div>

                        {/* Custom Signatures */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">স্বাক্ষর লেবেল পরিবর্তন</h4>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">বাম স্বাক্ষর (শ্রেণি শিক্ষক)</label>
                                    <input
                                        type="text"
                                        value={leftSignatureLabel}
                                        onChange={e => setLeftSignatureLabel(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-[#4f46e5] focus:bg-white transition-all shadow-sm focus:shadow-indigo-100/50"
                                        placeholder="শ্রেণি শিক্ষকের স্বাক্ষর"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">ডান স্বাক্ষর (প্রধান শিক্ষক)</label>
                                    <input
                                        type="text"
                                        value={rightSignatureLabel}
                                        onChange={e => setRightSignatureLabel(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-[#4f46e5] focus:bg-white transition-all shadow-sm focus:shadow-indigo-100/50"
                                        placeholder="প্রধান শিক্ষকের স্বাক্ষর"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scaling zoom control */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">প্রিভিউ জুম</h4>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setIsAutoFit(false); setScale(prev => Math.max(0.3, +(prev - 0.05).toFixed(2))); }}
                                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                    title="জুম আউট"
                                >
                                    <ZoomOut size={16} className="text-slate-500" />
                                </button>
                                <div className="flex-1 text-center border border-slate-200 rounded-xl py-1.5 bg-slate-50/50">
                                    <span className="text-xs font-black text-slate-700">{(scale * 100).toFixed(0)}%</span>
                                </div>
                                <button
                                    onClick={() => { setIsAutoFit(false); setScale(prev => Math.min(3, +(prev + 0.05).toFixed(2))); }}
                                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                    title="জুম ইন"
                                >
                                    <ZoomIn size={16} className="text-slate-500" />
                                </button>
                            </div>

                            <button
                                onClick={() => { setIsAutoFit(true); handleFit(); }}
                                className={`w-full py-2 border rounded-xl text-xs font-black transition-all ${
                                    isAutoFit ? 'bg-[#4f46e5] border-transparent text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                অটো-ফিট প্রিভিউ
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
            {/* Floating Zoom & Fit Controls */}
            <div className="print:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200/60 p-2 rounded-2xl shadow-lg shadow-slate-200/40">
                <button
                    onClick={() => { setIsAutoFit(false); setScale(prev => Math.max(0.3, +(prev - 0.05).toFixed(2))); }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-600 shadow-sm"
                    title="জুম আউট"
                >
                    <ZoomOut size={16} />
                </button>
                
                <div className="px-3 min-w-[56px] text-center select-none">
                    <span className="text-xs font-black text-slate-700">{(scale * 100).toFixed(0)}%</span>
                </div>
                
                <button
                    onClick={() => { setIsAutoFit(false); setScale(prev => Math.min(3, +(prev + 0.05).toFixed(2))); }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-600 shadow-sm"
                    title="জুম ইন"
                >
                    <ZoomIn size={16} />
                </button>
                
                <div className="h-6 w-px bg-slate-200 mx-1" />
                
                <button
                    onClick={() => { setIsAutoFit(true); setTranslateX(0); setTranslateY(0); handleFit(); }}
                    className={`h-10 px-4 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center gap-1.5 ${
                        isAutoFit 
                            ? 'bg-[#4f46e5] text-white border-transparent' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <span className="relative flex h-2 w-2">
                        {isAutoFit && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isAutoFit ? 'bg-white' : 'bg-[#4f46e5]'}`}></span>
                    </span>
                    অটো
                </button>

                <button
                    onClick={() => { setIsAutoFit(false); setScale(1.0); setTranslateX(0); setTranslateY(0); }}
                    className={`h-10 px-3.5 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center justify-center ${
                        !isAutoFit && scale === 1.0
                            ? 'bg-[#4f46e5] text-white border-transparent'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="১০০% জুম"
                >
                    ১০০%
                </button>
            </div>

            {/* Global style overrides for web print engine */}
            <style>{`
                .hide-scrollbar {
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none !important;
                }
                .print-reset-inner table th, 
                .print-reset-inner table td {
                    padding-top: var(--cell-pv, 8px) !important;
                    padding-bottom: var(--cell-pv, 8px) !important;
                }
                @media print {
                    body, html {
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    header, aside, .print-modal-root header, .print-modal-root aside, .print\\:hidden, div[style*="bottom: 6px"], div[style*="bottom: 24px"] {
                        display: none !important;
                    }
                    .print-modal-root, 
                    .print-modal-body,
                    .print-modal-root main, 
                    .print-reset-table, 
                    .print-reset-outer, 
                    .print-reset-inner {
                        width: 100% !important;
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        transform: none !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important;
                        overflow: visible !important;
                        background: white !important;
                        border: none !important;
                        box-shadow: none !important;
                        flex-direction: unset !important;
                    }
                    .print-area * {
                        overflow: visible !important;
                    }
                    .print-area {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: auto !important;
                        break-inside: auto !important;
                        margin: 0 !important;
                        padding: var(--page-padding, 16px) !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        box-sizing: border-box !important;
                        overflow: visible !important;
                    }
                    /* Prevent table rows from being split mid-row */
                    .print-area tbody tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    /* Keep signature block on same page */
                    .print-area .signature-area {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
            <style>{`
                @media print {
                    @page {
                        size: ${pageSize.toLowerCase()} ${orientation} !important;
                        margin: 0 !important;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
}
