'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PrintLayout from '@/components/PrintLayout';
import {
    ChevronLeft,
    Users,
    Printer,
    Settings2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    X,
    Search,
    SlidersHorizontal,
    Check,
    GripVertical,
    ChevronDown,
    ChevronUp,
    User,
} from 'lucide-react';
import { POSSIBLE_FIELDS } from '@/components/FieldLibrary';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Student {
    id: string;
    name: string;
    phone?: string;
    metadata?: {
        classId?: string;
        groupId?: string;
        rollNumber?: string;
        studentId?: string;
        phone?: string;
        [key: string]: any;
    };
}

interface ClassItem { id: string; name: string; }
interface GroupItem { id: string; name: string; }
interface CustomColumn { id: string; label: string; }

interface Payload {
    title?: string;
    institute?: { name?: string; address?: string; logo?: string };
    students?: Student[];
    classes?: ClassItem[];
    groups?: GroupItem[];
    columns?: Record<string, boolean>;
    customColumns?: CustomColumn[];
}

/* ─────────────────────────────────────────────
   Column label map
───────────────────────────────────────────── */
const COL_LABELS: Record<string, string> = {
    sl: 'ক্র.নং',
    rollNumber: 'রোল নং',
    studentId: 'আইডি',
    student: 'শিক্ষার্থী',
    className: 'ক্লাস ও গ্রুপ',
    contact: 'যোগাযোগ',
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function StudentPrintPreviewPage() {
    const router = useRouter();

    /* ── data ── */
    const [payload, setPayload] = useState<Payload | null>(null);

    // All available columns (base + custom + extra) — built once payload loads
    const allAvailableCols = React.useMemo(() => {
        if (!payload) return [];
        const base = Object.entries(COL_LABELS).map(([id, label]) => ({ id, label }));
        const custom = (payload.customColumns || []).map((c: CustomColumn) => ({ id: c.id, label: c.label }));
        const baseIds = new Set(Object.keys(COL_LABELS));
        const customIds = new Set((payload.customColumns || []).map(c => c.id));
        const extra = Object.keys(payload.columns || {})
            .filter(id => !baseIds.has(id) && !customIds.has(id))
            .map(id => {
                const fieldDef = POSSIBLE_FIELDS.find(f => f.id === id);
                return { id, label: fieldDef ? fieldDef.label : id };
            });
        return [...base, ...custom, ...extra];
    }, [payload]);

    // Active columns ordered array
    const [activeColIds, setActiveColIds] = useState<string[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    // Drag ref
    const dragColRef = useRef<string | null>(null);

    /* ── ui state ── */
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(true);
    const [rightTab, setRightTab] = useState<'layout' | 'font'>('layout');
    const [filterText, setFilterText] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [highlightId, setHighlightId] = useState<string | null>(null);

    /* ── settings ── */
    const [fontSize, setFontSize] = useState(14);
    const [columnScale, setColumnScale] = useState(1);
    const [pageSize, setPageSize] = useState('A4');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    /* ── zoom ── */
    const [scale, setScale] = useState(1);
    const [contentHeight, setContentHeight] = useState(1123);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const mainRef = useRef<HTMLElement | null>(null);

    const TOP_H = 64;     // header bar height px
    const BOTTOM_H = 56;  // bottom zoom bar height px

    /* ── load payload ── */
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('students_print_preview');
            if (raw) {
                const data: Payload = JSON.parse(raw);
                setPayload(data);
                // Bootstrap activeColIds from enabled columns
                const initialCols = data.columns || {};
                const base = Object.entries(COL_LABELS).map(([id, label]) => ({ id, label }));
                const custom = (data.customColumns || []).map((c: CustomColumn) => ({ id: c.id, label: c.label }));
                const baseIds = new Set(Object.keys(COL_LABELS));
                const customIds = new Set((data.customColumns || []).map((c: CustomColumn) => c.id));
                const extra = Object.keys(initialCols)
                    .filter(id => !baseIds.has(id) && !customIds.has(id))
                    .map(id => {
                        const fieldDef = POSSIBLE_FIELDS.find(f => f.id === id);
                        return { id, label: fieldDef ? fieldDef.label : id };
                    });
                const all = [...base, ...custom, ...extra];
                setActiveColIds(all.filter(c => initialCols[c.id]).map(c => c.id));
                const ids = new Set<string>((data.students || []).map(s => s.id));
                setSelectedStudentIds(ids);
            }
        } catch (e) {
            console.error('Failed to read print preview payload', e);
        }
    }, []);

    /* ── auto-fit on load/resize ── */
    const handleFit = useCallback(() => {
        if (!contentRef.current) return;
        const contentWidth = contentRef.current.scrollWidth || 800;
        setContentHeight(contentRef.current.scrollHeight || 1123);
        const available = mainRef.current
            ? mainRef.current.clientWidth - 48
            : window.innerWidth - (leftOpen ? 300 : 0) - (rightOpen ? 320 : 0) - 64;
        const newScale = Math.min(3, Math.max(0.3, available / contentWidth));
        setScale(+newScale.toFixed(2));
    }, [leftOpen, rightOpen]);

    useEffect(() => {
        if (!payload) return;
        const raf = () => requestAnimationFrame(handleFit);
        raf();
        const t1 = setTimeout(raf, 150);
        const t2 = setTimeout(raf, 600);
        window.addEventListener('resize', raf);
        return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', raf); };
    }, [payload, leftOpen, rightOpen, columnScale, fontSize, activeColIds, handleFit]);

    /* ── helpers ── */
    const scrollTo = (id: string) => {
        if (!contentRef.current) return;
        const el = contentRef.current.querySelector(`[data-student-id="${id}"]`);
        if (el) {
            (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightId(id);
            setTimeout(() => setHighlightId(null), 2800);
        }
    };

    /* ── column helpers ── */
    const addCol = (id: string) => setActiveColIds(prev => prev.includes(id) ? prev : [...prev, id]);
    const removeCol = (id: string) => setActiveColIds(prev => prev.filter(c => c !== id));

    const handleColDragStart = (id: string) => { dragColRef.current = id; };
    const handleColDragOver = (e: React.DragEvent, overId: string) => {
        e.preventDefault();
        const dragged = dragColRef.current;
        if (!dragged || dragged === overId) return;
        setActiveColIds(prev => {
            const arr = [...prev];
            const fromIdx = arr.indexOf(dragged);
            const toIdx = arr.indexOf(overId);
            if (fromIdx < 0 || toIdx < 0) return prev;
            arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, dragged);
            return arr;
        });
    };
    const handleColDragEnd = () => { dragColRef.current = null; };

    const toggleCol = (id: string) => {}; // legacy no-op

    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        const visible = visibleStudents.map(s => s.id);
        const allSelected = visible.every(id => selectedStudentIds.has(id));
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (allSelected) visible.forEach(id => next.delete(id));
            else visible.forEach(id => next.add(id));
            return next;
        });
    };

    /* ── derived lists ── */
    const allStudents: Student[] = payload?.students || [];
    const classes: ClassItem[] = payload?.classes || [];
    const groups: GroupItem[] = payload?.groups || [];

    const visibleStudents = allStudents.filter(s => {
        const matchClass = selectedClassId === 'all' || s.metadata?.classId === selectedClassId;
        const matchFilter = !filterText || (s.name || '').toLowerCase().includes(filterText.toLowerCase());
        return matchClass && matchFilter;
    });

    const printStudents = visibleStudents.filter(s => selectedStudentIds.has(s.id));

    const groupedStudents = React.useMemo(() => {
        if (!payload || printStudents.length === 0) return [];
        const groups: Record<string, Student[]> = {};
        printStudents.forEach(s => {
            const cid = s.metadata?.classId || 'unknown';
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
    }, [printStudents, classes, payload]);

    const cellPv = Math.max(4, Math.round(8 * columnScale));
    const cellPh = Math.max(6, Math.round(12 * columnScale));

    /* ── print handler ── */
    const handlePrint = () => window.print();

    /* ── empty state ── */
    if (!payload) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="bg-white rounded-2xl border shadow-sm p-8 text-center max-w-md">
                    <h3 className="text-lg font-bold mb-3 text-slate-800">প্রিভিউ তথ্য পাওয়া যায়নি</h3>
                    <p className="text-sm text-slate-500 mb-5">শিক্ষার্থী তালিকা থেকে প্রিভিউ খুলুন।</p>
                    <button onClick={() => router.back()} className="px-5 py-2 bg-[#045c84] text-white rounded-xl font-bold">পেছনে যান</button>
                </div>
            </div>
        );
    }

    const totalCount = visibleStudents.length;
    const selectedCount = visibleStudents.filter(s => selectedStudentIds.has(s.id)).length;

    return (
        <div className="print-modal-root min-h-screen flex flex-col bg-[#e8ecf0]" style={{ fontFamily: "'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>

            {/* ══════════════════════════════
                TOP HEADER BAR
            ══════════════════════════════ */}
            <header
                className="fixed inset-x-0 top-0 z-50 flex items-center gap-2 px-4"
                style={{ height: TOP_H, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
            >
                {/* Left group */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                    style={{ background: '#f97316' }}
                >
                    <ChevronLeft size={16} />
                    ফিরে যান
                </button>

                <button
                    onClick={() => setLeftOpen(p => !p)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                    style={{ background: leftOpen ? '#4f46e5' : '#64748b' }}
                >
                    <Users size={15} />
                    শিক্ষার্থী
                </button>

                <button
                    className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all hover:opacity-90 active:scale-95 shadow-sm"
                    style={{ background: '#ecfdf5', color: '#059669' }}
                >
                    <User size={15} />
                    ব্যক্তিগত ভিউ
                </button>

                <div className="flex-1 min-w-0 pl-3 hidden sm:block">
                    <p className="text-sm font-black text-slate-800 truncate">{payload.title || 'শিক্ষার্থী তালিকা'}</p>
                    <p className="text-xs text-slate-400 truncate">{payload.institute?.name || ''}</p>
                </div>

                {/* Right group */}
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                        style={{ background: '#2563eb' }}
                    >
                        <Printer size={15} />
                        প্রিন্ট করুন
                    </button>

                    <button
                        onClick={() => setRightOpen(p => !p)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                        style={{ background: rightOpen ? '#8b5cf6' : '#64748b' }}
                    >
                        <Settings2 size={15} />
                        সেটিংস
                    </button>
                </div>
            </header>

            {/* ══════════════════════════════
                MAIN BODY (Drawers + Canvas)
            ══════════════════════════════ */}
            <div
                className="print-modal-body flex flex-1 overflow-hidden"
                style={{ marginTop: TOP_H, marginBottom: BOTTOM_H }}
            >
                {/* ── LEFT DRAWER ── */}
                <aside
                    className="flex-shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden transition-all duration-300"
                    style={{ width: leftOpen ? 300 : 0, opacity: leftOpen ? 1 : 0, pointerEvents: leftOpen ? 'auto' : 'none' }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800">শিক্ষার্থী</span>
                        <button onClick={() => setLeftOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                            <X size={15} />
                        </button>
                    </div>

                    {/* Class tab pills */}
                    <div className="flex gap-2 px-3 py-3 overflow-x-auto border-b border-slate-100" style={{ scrollbarWidth: 'none' }}>
                        <button
                            onClick={() => setSelectedClassId('all')}
                            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm"
                            style={selectedClassId === 'all' ? { background: '#4f46e5', color: '#fff', borderColor: '#4f46e5' } : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }}
                        >
                            সব ক্লাস
                        </button>
                        {classes.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedClassId(c.id)}
                                className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm"
                                style={selectedClassId === c.id ? { background: '#4f46e5', color: '#fff', borderColor: '#4f46e5' } : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }}
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
                                placeholder="শিক্ষার্থী খুঁজুন..."
                                className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                            />
                            {filterText && (
                                <button onClick={() => setFilterText('')} className="text-slate-400 hover:text-slate-600">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">
                            শিক্ষার্থী <span className="font-black text-slate-700">{selectedCount}/{totalCount}</span>
                        </span>
                        <button
                            onClick={toggleAll}
                            className="text-xs font-bold text-[#4f46e5] hover:underline bg-[#e0e7ff] px-2.5 py-1 rounded-md"
                        >
                            {visibleStudents.every(s => selectedStudentIds.has(s.id)) ? 'সব বাদ দিন' : 'সব নাম দিন'}
                        </button>
                    </div>

                    {/* Student list */}
                    <div className="flex-1 overflow-y-auto py-2 px-1">
                        {visibleStudents.map((s, idx) => {
                            const isSelected = selectedStudentIds.has(s.id);
                            const roll = s.metadata?.rollNumber;
                            // Alternating dot colors for visual interest
                            const dotColor = isSelected ? '#10b981' : '#f87171';
                            return (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-3 px-3 py-2 mx-1 mb-2 rounded-xl cursor-pointer transition-colors border shadow-sm"
                                    style={isSelected ? { background: '#eff6ff', borderColor: '#3b82f6' } : { background: '#fff', borderColor: '#e2e8f0' }}
                                    onClick={() => { toggleStudent(s.id); scrollTo(s.id); }}
                                >
                                    {/* Checkbox */}
                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                                        style={isSelected
                                            ? { background: '#4f46e5' }
                                            : { background: '#f1f5f9', border: '1px solid #cbd5e1' }}
                                    >
                                        {isSelected && <Check size={11} color="white" strokeWidth={3} />}
                                    </div>

                                    {/* Name & roll */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                                        {roll && <p className="text-xs text-slate-400">রোল: {roll}</p>}
                                    </div>

                                    {/* Status dot */}
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                                </div>
                            );
                        })}
                        {visibleStudents.length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-slate-400">কোনো শিক্ষার্থী পাওয়া যায়নি</div>
                        )}
                    </div>
                </aside>

                {/* ── CENTER CANVAS ── */}
                <main
                    ref={mainRef as any}
                    className="print-modal-main flex-1 overflow-auto custom-scrollbar z-0 pb-28"
                    data-lenis-prevent
                >
                    <div className="print-reset-table" style={{
                        display: 'table',
                        margin: '24px auto 96px',
                        padding: '0 24px',
                    }}>
                        <div className="print-reset-outer" style={{
                            width: Math.round((() => {
                                const dims: Record<string, { w: number; h: number }> = { A4: { w: 794, h: 1123 }, A3: { w: 1123, h: 1587 }, A5: { w: 559, h: 794 }, Letter: { w: 816, h: 1056 }, Legal: { w: 816, h: 1344 } };
                                const d = dims[pageSize] || dims['A4'];
                                return (orientation === 'landscape' ? d.h : d.w) * scale;
                            })()),
                            height: Math.round(contentHeight * scale),
                            position: 'relative',
                            flexShrink: 0,
                        }}>
                            <div
                                ref={contentRef}
                                className="print-reset-inner"
                                style={(() => {
                                    const dims: Record<string, { w: number; h: number }> = { A4: { w: 794, h: 1123 }, A3: { w: 1123, h: 1587 }, A5: { w: 559, h: 794 }, Letter: { w: 816, h: 1056 }, Legal: { w: 816, h: 1344 } };
                                    const d = dims[pageSize] || dims['A4'];
                                    const pw = orientation === 'landscape' ? d.h : d.w;
                                    const ph = orientation === 'landscape' ? d.w : d.h;
                                    return {
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'top left',
                                        fontSize: `${fontSize}px`,
                                        width: pw,
                                        minHeight: ph,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '24px'
                                    };
                                })()}
                            >
                                {groupedStudents.map((group, groupIdx) => (
                                    <PrintLayout
                                        key={group.classId}
                                        title={payload.title || 'শিক্ষার্থী তালিকা'}
                                        institute={payload.institute}
                                        pageSize={pageSize as any}
                                        hideDate={true}
                                        hideTitle={true}
                                        previewOnly
                                    >
                                        <div className="text-center mb-3 mt-1">
                                            <h3 className="text-xl font-bold text-slate-800">ক্লাস: {group.className}</h3>
                                        </div>
                                        <div className="print-overflow-reset overflow-x-auto">
                                            <table className="w-full text-left border-collapse [&_th]:border-[0.5px] [&_th]:border-gray-800 [&_td]:border-[0.5px] [&_td]:border-gray-800" style={{ fontSize: `${fontSize}px` }}>
                                                <thead>
                                                    <tr>
                                                        {activeColIds.map(colId => {
                                                            const col = allAvailableCols.find(c => c.id === colId);
                                                            return (
                                                                <th key={colId} style={{ padding: `${cellPv}px ${cellPh}px`, fontSize: 'inherit' }} className="font-black text-black text-center">
                                                                    {col?.label || colId}
                                                                </th>
                                                            );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.students.map((s, idx) => (
                                                        <tr
                                                            key={s.id}
                                                            data-student-id={s.id}
                                                            className={`transition-colors ${highlightId === s.id ? 'ring-2 ring-[#0d9488]/30 bg-[#e0faf7]' : ''}`}
                                                        >
                                                            {activeColIds.map(colId => {
                                                                let cell: React.ReactNode = s.metadata?.[colId] || '-';
                                                                if (colId === 'sl') cell = idx + 1;
                                                                else if (colId === 'rollNumber') cell = s.metadata?.rollNumber || '-';
                                                                else if (colId === 'studentId') cell = s.metadata?.studentId || s.id.substring(0, 6);
                                                                else if (colId === 'student') cell = s.name;
                                                                else if (colId === 'className') cell = `${classes.find(c => c.id === s.metadata?.classId)?.name || '-'}${s.metadata?.groupId ? ` • ${groups.find(g => g.id === s.metadata?.groupId)?.name || ''}` : ''}`;
                                                                else if (colId === 'contact') cell = s.phone || s.metadata?.phone || '-';
                                                                return (
                                                                    <td key={colId} style={{ padding: `${cellPv}px ${cellPh}px`, fontSize: 'inherit' }} className="text-black text-center">
                                                                        {cell}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                    </PrintLayout>
                                ))}
                                {groupedStudents.length === 0 && (
                                    <PrintLayout
                                        title={payload.title || 'শিক্ষার্থী তালিকা'}
                                        institute={payload.institute}
                                        pageSize={pageSize as any}
                                        hideDate={true}
                                        hideTitle={true}
                                        previewOnly
                                    >
                                        <div className="text-center text-sm text-slate-400 py-10">কোনো শিক্ষার্থী নির্বাচিত নেই</div>
                                    </PrintLayout>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* ── RIGHT DRAWER ── */}
                <aside
                    className="flex-shrink-0 flex flex-col bg-white border-l border-slate-200 overflow-hidden transition-all duration-300"
                    style={{ width: rightOpen ? 320 : 0, opacity: rightOpen ? 1 : 0, pointerEvents: rightOpen ? 'auto' : 'none' }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800">সেটিংস প্যানেল</span>
                        <button onClick={() => setRightOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                            <X size={15} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-100">
                        {(['layout', 'font'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setRightTab(tab)}
                                className="flex-1 py-3 text-xs font-bold transition-all border-b-2"
                                style={rightTab === tab
                                    ? { color: '#4f46e5', borderColor: '#4f46e5' }
                                    : { color: '#94a3b8', borderColor: 'transparent' }}
                            >
                                {tab === 'layout' ? 'লেআউট' : 'ফন্ট ও কালার'}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
                        {rightTab === 'layout' && (
                            <>
                                {/* Column order — split selected / available */}
                                <Section title="কলাম সাজান">
                                    {/* Selected columns (draggable) */}
                                    {activeColIds.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">✓ নির্বাচিত কলাম</p>
                                            <div className="flex flex-col gap-1">
                                                {activeColIds.map(colId => {
                                                    const col = allAvailableCols.find(c => c.id === colId);
                                                    return (
                                                        <div
                                                            key={colId}
                                                            draggable
                                                            onDragStart={() => handleColDragStart(colId)}
                                                            onDragOver={e => handleColDragOver(e, colId)}
                                                            onDragEnd={handleColDragEnd}
                                                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 cursor-grab active:cursor-grabbing select-none"
                                                        >
                                                            <GripVertical size={13} className="text-indigo-300 flex-shrink-0" />
                                                            <span className="flex-1 text-xs font-semibold text-indigo-800 truncate">{col?.label || colId}</span>
                                                            <button
                                                                onClick={() => removeCol(colId)}
                                                                className="p-0.5 rounded text-indigo-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Available columns */}
                                    {(() => {
                                        const inactive = allAvailableCols.filter(c => !activeColIds.includes(c.id));
                                        if (inactive.length === 0) return null;
                                        return (
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">অন্যান্য কলাম</p>
                                                <div className="flex flex-col gap-1">
                                                    {inactive.map(col => (
                                                        <button
                                                            key={col.id}
                                                            onClick={() => addCol(col.id)}
                                                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-colors text-left w-full"
                                                        >
                                                            <span className="w-4 h-4 rounded border-2 border-slate-200 flex-shrink-0" />
                                                            <span className="flex-1 text-xs text-slate-500 truncate">{col.label}</span>
                                                            <span className="text-[10px] text-slate-300">+ যোগ করুন</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </Section>


                                {/* Row density / column scale */}
                                <Section title="কলামের আকার">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range" min={0.6} max={1.6} step={0.05}
                                            value={columnScale}
                                            onChange={e => setColumnScale(Number(e.target.value))}
                                            className="flex-1 accent-teal-600"
                                        />
                                        <span className="text-xs font-bold text-slate-600 w-10 text-right">{(columnScale * 100).toFixed(0)}%</span>
                                    </div>
                                </Section>
                            </>
                        )}

                        {rightTab === 'font' && (
                            <>
                                {/* Font size */}
                                <Section title="ফন্ট সাইজ">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range" min={10} max={22}
                                            value={fontSize}
                                            onChange={e => setFontSize(Number(e.target.value))}
                                            className="flex-1 accent-teal-600"
                                        />
                                        <span className="text-xs font-bold text-slate-600 w-10 text-right">{fontSize}px</span>
                                    </div>
                                </Section>

                                {/* Template style */}
                                <Section title="টেমপ্লেট স্টাইল">
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Classic', 'Modern', 'Compact'] as const).map(style => (
                                            <button
                                                key={style}
                                                className="py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                                                style={style === 'Modern'
                                                    ? { background: '#4f46e5', color: '#fff', borderColor: '#4f46e5' }
                                                    : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </Section>
                            </>
                        )}
                    </div>

                    {/* Apply button */}
                    <div className="border-t border-slate-100 px-4 py-3">
                        <button
                            onClick={() => {
                                setRightOpen(false);
                            }}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-sm"
                            style={{ background: '#4f46e5' }}
                        >
                            প্রয়োগ করুন
                        </button>
                    </div>
                </aside>
            </div>

            {/* ══════════════════════════════
                BOTTOM ZOOM BAR
            ══════════════════════════════ */}
            <div
                className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 px-6"
                style={{ height: BOTTOM_H, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}
            >
                <button
                    onClick={() => setScale(s => +(Math.max(0.3, s - 0.1)).toFixed(2))}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all"
                >
                    <ZoomOut size={16} />
                </button>

                <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-xl min-w-[70px] justify-center">
                    <span className="text-xs font-black text-slate-700">{Math.round(scale * 100)}%</span>
                </div>

                <button
                    onClick={() => setScale(s => +(Math.min(2, s + 0.1)).toFixed(2))}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all"
                >
                    <ZoomIn size={16} />
                </button>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                <button
                    onClick={handleFit}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black text-white transition-all hover:opacity-90 shadow-sm"
                    style={{ background: '#8b5cf6' }}
                >
                    <Maximize2 size={13} />
                    FIT
                </button>

                <button
                    onClick={() => setScale(1)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all shadow-sm"
                >
                    100%
                </button>

                <button
                    onClick={() => {
                        if (!contentRef.current) return;
                        const last = contentRef.current.querySelector('[data-student-id]:last-child');
                        if (last) (last as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all shadow-sm"
                >
                    LAST
                </button>
            </div>

            {/* Print CSS */}
            <style>{`
                @media print {
                    header, aside, div[style*="bottom: 0"], div[style*="BOTTOM"] { display: none !important; }
                    body { margin: 0 !important; background: white !important; }
                    .print-modal-root { position: absolute !important; top: 0 !important; left: 0 !important; background: white !important; }
                    .print-modal-root, .print-modal-body, .print-modal-main, .print-reset-table, .print-reset-outer, .print-reset-inner, .print-overflow-reset {
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
                    }
                    .print-area table, .print-area th, .print-area td, .print-area tr, .print-area thead, .print-area tbody {
                        background-color: white !important;
                    }
                }
            `}</style>
        </div>
    );
}

/* ── Small helper section wrapper ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-teal-500" />
                <h5 className="text-xs font-black text-slate-700 uppercase tracking-wide">{title}</h5>
            </div>
            {children}
        </div>
    );
}
