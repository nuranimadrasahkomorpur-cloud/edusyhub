"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
    Copy,
} from 'lucide-react';
import { POSSIBLE_FIELDS } from './FieldLibrary';
import { QRCodeCanvas } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { Reorder } from 'framer-motion';

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

interface Props {
    payload: any;
    onClose: () => void;
}

/* ─────────────────────────────────────────────
   Column label map
───────────────────────────────────────────── */
const COL_LABELS: Record<string, string> = {
    sl: 'ক্র.নং',
    rollNumber: 'রোল নং',
    studentId: 'আইডি',
    photo: 'ছবি',
    student: 'শিক্ষার্থী',
    className: 'ক্লাস ও গ্রুপ',
    contact: 'যোগাযোগ',
    qr: 'কিউআর কোড',
    barcode: 'বারকোড',
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
// Small helper component for rendering barcode SVGs using JsBarcode
const BarcodeSVG = React.memo(({ value, width = 120, height = 36 }: { value: string; width?: number; height?: number }) => {
    const [svgHtml, setSvgHtml] = useState<string>('');
    useEffect(() => {
        try {
            const ns = 'http://www.w3.org/2000/svg';
            const svgEl = document.createElementNS(ns, 'svg') as SVGSVGElement;
            JsBarcode(svgEl, String(value || ''), {
                format: 'CODE128',
                width: Math.max(1, Math.min(2.2, width / 100)),
                height: height,
                displayValue: false,
                margin: 2,
            });
            
            // Add viewBox to make SVG responsive without clipping
            const w = svgEl.getAttribute('width');
            const h = svgEl.getAttribute('height');
            if (w && h) {
                svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
                svgEl.setAttribute('preserveAspectRatio', 'none'); // Allows stretching to fit raw cell width/height
                svgEl.style.width = '100%';
                svgEl.style.height = '100%';
            }
            
            setSvgHtml(svgEl.outerHTML || '');
        } catch (e) {
            console.error('JsBarcode error', e);
            setSvgHtml('');
        }
    }, [value, width, height]);
    if (!svgHtml) return <div style={{ width: `calc(${width}px * var(--content-scale, 1))`, height: `calc(${height}px * var(--content-scale, 1))` }} />;
    return (
        <div 
            dangerouslySetInnerHTML={{ __html: svgHtml }} 
            className="w-full flex justify-center items-center"
            style={{ 
                width: `calc(${width}px * var(--content-scale, 1))`, 
                maxWidth: '100%',
                height: `calc(${height}px * var(--content-scale, 1))` 
            }} 
        />
    );
});

const MemoizedQRCodeCanvas = React.memo(({ value }: { value: string }) => (
    <QRCodeCanvas value={value} size={56} level="H" bgColor="#ffffff" fgColor="#000000" style={{ width: 'calc(56px * var(--content-scale, 1))', height: 'calc(56px * var(--content-scale, 1))' }} />
));

const PrintTableRow = React.memo(({ s, idx, activeColIds, classes, groups, cellPv, cellPh, isHighlighted }: any) => {
    return (
        <tr
            data-student-id={s.id}
            className={`transition-colors ${isHighlighted ? 'ring-2 ring-[#0d9488]/30 bg-[#e0faf7]' : ''}`}
        >
            {activeColIds.map((colId: string) => {
                let cell: React.ReactNode = s.metadata?.[colId] || '-';
                if (colId === 'sl') cell = idx + 1;
                else if (colId === 'rollNumber') cell = s.metadata?.rollNumber || '-';
                else if (colId === 'studentId') cell = s.metadata?.studentId || s.id.substring(0, 6);
                else if (colId === 'photo') {
                    const imgSrc = s.metadata?.studentPhoto || s.metadata?.photo || null;
                    cell = (
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {imgSrc ? (
                                <img
                                    src={imgSrc}
                                    alt={s.name}
                                    style={{ width: 'calc(52px * var(--content-scale, 1))', height: 'calc(52px * var(--content-scale, 1))', borderRadius: 4, objectFit: 'cover', border: '1px solid #cbd5e1', display: 'block' }}
                                />
                            ) : (
                                <div style={{ width: 'calc(52px * var(--content-scale, 1))', height: 'calc(52px * var(--content-scale, 1))', borderRadius: 4, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }} >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.5} style={{ width: '55%', height: '55%' }}>
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    );
                }
                else if (colId === 'student') cell = s.name;
                else if (colId === 'className') cell = `${classes.find((c: any) => c.id === s.metadata?.classId)?.name || '-'}${s.metadata?.groupId ? ` • ${groups.find((g: any) => g.id === s.metadata?.groupId)?.name || ''}` : ''}`;
                else if (colId === 'contact') cell = s.phone || s.metadata?.phone || '-';
                else if (colId === 'qr') cell = (
                    <div className="flex items-center justify-center">
                        <MemoizedQRCodeCanvas value={s.metadata?.studentId || s.id} />
                    </div>
                );
                else if (colId === 'barcode') cell = (
                    <div className="flex items-center justify-center">
                        <BarcodeSVG value={s.metadata?.studentId || s.id} width={120} height={36} />
                    </div>
                );
                return (
                    <td key={colId} style={{ padding: colId === 'photo' ? `var(--cell-pv, ${cellPv}px) var(--cell-ph, ${cellPh}px)` : `var(--cell-pv, ${cellPv}px) var(--cell-ph, ${cellPh}px)`, fontSize: 'inherit' }} className={`text-black ${colId === 'student' ? 'text-left' : 'text-center'}`}>
                        {cell}
                    </td>
                );
            })}
        </tr>
    );
});

const SidebarStudentItem = React.memo(({ s, isSelected, roll, dotColor, onToggle, onScrollTo }: any) => {
    return (
        <div
            className="flex items-center gap-3 px-3 py-2 mx-1 mb-2 rounded-xl cursor-pointer transition-colors border shadow-sm"
            style={isSelected ? { background: '#eff6ff', borderColor: '#3b82f6' } : { background: '#fff', borderColor: '#e2e8f0' }}
            onClick={() => { onToggle(s.id); onScrollTo(s.id); }}
        >
            <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={isSelected
                    ? { background: '#4f46e5' }
                    : { background: '#f1f5f9', border: '1px solid #cbd5e1' }}
            >
                {isSelected && <Check size={11} color="white" strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                {roll && <p className="text-xs text-slate-400">রোল: {roll}</p>}
            </div>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
        </div>
    );
});

export default function StudentPrintPreviewModal({ payload, onClose }: Props) {
    /* ── column order/visibility state ── */
    // Build the full catalogue of columns available
    const allAvailableCols = React.useMemo(() => {
        const base = Object.entries(COL_LABELS).map(([id, label]) => ({ id, label }));
        const custom = (payload?.customColumns || []).map((c: any) => ({ id: c.id, label: c.label }));
        // extra fields from payload.columns that aren't base or custom
        const baseIds = new Set(Object.keys(COL_LABELS));
        const customIds = new Set((payload?.customColumns || []).map((c: any) => c.id));
        const extra = Object.keys(payload?.columns || {})
            .filter(id => !baseIds.has(id) && !customIds.has(id))
            .map(id => {
                const fieldDef = POSSIBLE_FIELDS.find(f => f.id === id);
                return { id, label: fieldDef ? fieldDef.label : id };
            });
        return [...base, ...custom, ...extra];
    }, [payload]);

    // Active columns: ordered array of IDs that appear in the printed table
    // Persisted to localStorage so the selection survives page reloads
    const COLS_STORAGE_KEY = 'edusy_print_cols';
    const [activeColIds, setActiveColIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(COLS_STORAGE_KEY);
            if (saved) {
                const parsed: string[] = JSON.parse(saved);
                const availableIds = new Set(allAvailableCols.map(c => c.id));
                // Filter out stale IDs that no longer exist in the catalogue
                const valid = parsed.filter(id => availableIds.has(id));
                if (valid.length > 0) return valid;
            }
        } catch { /* ignore */ }
        // Fallback: derive from payload
        const initialCols = payload?.columns || {};
        return allAvailableCols.filter(c => initialCols[c.id]).map(c => c.id);
    });

    // Drag state for reordering
    const dragColRef = useRef<string | null>(null);

    const selectedStudentIds_init = React.useMemo<Set<string>>(
        () => new Set<string>((payload?.students || []).map((s: any) => s.id as string)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(selectedStudentIds_init);


    /* ── ui state ── */
    const [leftOpen, setLeftOpen] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
    const [rightTab, setRightTab] = useState<'layout' | 'font'>('layout');
    const [filterText, setFilterText] = useState('');
    const [debouncedFilterText, setDebouncedFilterText] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedFilterText(filterText), 300);
        return () => clearTimeout(t);
    }, [filterText]);

    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [highlightId, setHighlightId] = useState<string | null>(null);

    const [filterGender, setFilterGender] = useState<string>('all');
    const [filterMinAge, setFilterMinAge] = useState<string>('');
    const [filterMaxAge, setFilterMaxAge] = useState<string>('');
    const [filterBloodGroup, setFilterBloodGroup] = useState<string>('all');
    const [filterReligion, setFilterReligion] = useState<string>('all');
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [isSelectedColsExpanded, setIsSelectedColsExpanded] = useState(false);

    /* ── settings ── */
    const [fontSize, setFontSize] = useState(14);
    const [contentScale, setContentScale] = useState<number>(1);
    const [columnScale, setColumnScale] = useState(1);
    // rowPadding can be fractional (e.g. 0.5) for very smooth adjustments
    const [rowPadding, setRowPadding] = useState<number>(8);
    const [pagePadding, setPagePadding] = useState<number>(16);
    const [pageSize, setPageSize] = useState<'A4' | 'A3' | 'A5' | 'Letter' | 'Legal'>('A4');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    /* ── zoom ── */
    const [isAutoFit, setIsAutoFit] = useState(true);
    const [scale, setScale] = useState(1);
    const contentRef = useRef<HTMLDivElement | null>(null);

    const TOP_H = 64;     // header bar height px
    const BOTTOM_H = 56;  // bottom zoom bar height px

    // Load persisted zoom preferences
    useEffect(() => {
        try {
            const savedAutoFit = localStorage.getItem('edusy_print_autofit');
            const savedScale = localStorage.getItem('edusy_print_scale');
            if (savedAutoFit === 'false') {
                setIsAutoFit(false);
                if (savedScale) setScale(parseFloat(savedScale));
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    // Save preferences when they change
    useEffect(() => {
        try {
            localStorage.setItem('edusy_print_autofit', isAutoFit.toString());
            localStorage.setItem('edusy_print_scale', scale.toString());
        } catch (e) {
            console.error(e);
        }
    }, [isAutoFit, scale]);

    useEffect(() => {
        // lock body scroll while modal open
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    useEffect(() => {
        // Auto open sidebars on desktop
        if (window.innerWidth >= 1024) {
            setLeftOpen(true);
            setRightOpen(true);
        }
    }, []);

    const toggleLeftSidebar = () => {
        setLeftOpen(p => {
            const next = !p;
            if (next && window.innerWidth < 1024) {
                setRightOpen(false);
            }
            return next;
        });
    };

    const toggleRightSidebar = () => {
        setRightOpen(p => {
            const next = !p;
            if (next && window.innerWidth < 1024) {
                setLeftOpen(false);
            }
            return next;
        });
    };

    /* ref to the <main> canvas element for width measurement */
    const mainRef = useRef<HTMLElement | null>(null);

    /* ── auto-fit on load/resize ── */
    const handleFit = useCallback(() => {
        if (!contentRef.current) return;
        // Native (unscaled) page width
        const contentWidth = contentRef.current.scrollWidth || 800;
        // Use the actual main panel width for perfect fit
        const available = mainRef.current
            ? mainRef.current.clientWidth - 48  // 48px for left+right padding
            : window.innerWidth - (leftOpen ? 300 : 0) - (rightOpen ? 320 : 0) - 64;
        // Allow scaling up to 3× so the page always fills wide screens
        const newScale = Math.min(3, Math.max(0.3, available / contentWidth));
        setScale(+newScale.toFixed(2));
    }, [leftOpen, rightOpen]);

    useEffect(() => {
        if (!payload || !isAutoFit) return;
        const raf = () => requestAnimationFrame(handleFit);
        raf();
        const t1 = setTimeout(raf, 150);
        const t2 = setTimeout(raf, 600);
        window.addEventListener('resize', raf);
        return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', raf); };
    }, [payload, leftOpen, rightOpen, columnScale, fontSize, activeColIds, handleFit, isAutoFit]);

    // Update CSS variables for instant visual feedback when sliders move
    useEffect(() => {
        if (!contentRef.current) return;
        const el = contentRef.current as HTMLElement;
        const scaleFactor = contentScale || 1;
        const cellPvLocal = Math.max(2, rowPadding) * scaleFactor;
        const cellPhLocal = Math.max(6, 12 * columnScale) * scaleFactor;
        el.style.setProperty('--cell-pv', `${cellPvLocal}px`);
        el.style.setProperty('--cell-ph', `${cellPhLocal}px`);
        el.style.setProperty('--page-padding', `${pagePadding}px`);
        el.style.setProperty('--font-size', `${fontSize}px`);
        el.style.setProperty('--content-scale', `${contentScale}`);
    }, [rowPadding, columnScale, pagePadding, fontSize, contentScale]);

    // Debounced save: when user stops changing settings, save to DB
    const saveTimerRef = useRef<number | null>(null);
    const isSavingRef = useRef(false);

    const saveSettings = useCallback(async (flush = false) => {
        if (!payload?.institute?.id) return;
        const instituteId = payload.institute.id || payload.institute?._id || payload.institute?._id?.$oid;
        if (!instituteId) return;

        const settings = {
            columns: activeColIds,
            columnScale,
            rowPadding,
            pagePadding,
            fontSize,
            contentScale,
            pageSize,
            orientation,
            timestamp: Date.now()
        };

        try {
            isSavingRef.current = true;
            await fetch('/api/admin/institutes/print-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instituteId, printSettings: settings })
            });
            // optionally show success toast
        } catch (err) {
            console.error('Failed saving print settings', err);
        } finally {
            isSavingRef.current = false;
        }
    }, [payload, activeColIds, columnScale, rowPadding, pagePadding, fontSize, contentScale, pageSize, orientation]);

    useEffect(() => {
        // schedule save after quiet period
        if (!payload?.institute?.id) return;
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            saveSettings();
            saveTimerRef.current = null;
        }, 900);
        return () => {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current);
                // don't flush here; we'll flush on unmount
            }
        };
    }, [activeColIds, columnScale, rowPadding, pagePadding, fontSize, contentScale, pageSize, orientation, saveSettings, payload]);

    // flush/save on unmount
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
            }
            if (!isSavingRef.current) {
                // best-effort flush
                saveSettings(true).catch(() => {});
            }
        };
    }, [saveSettings]);

    // Refs & helpers for ultra-smooth slider updates without re-rendering
    const columnScaleRef = useRef<number>(columnScale);
    const rowPaddingRef = useRef<number>(rowPadding);
    const pagePaddingRef = useRef<number>(pagePadding);
    const fontSizeRef = useRef<number>(fontSize);
    const contentScaleRef = useRef<number>(contentScale);

    const colScaleInputRef = useRef<HTMLInputElement | null>(null);
    const rowPaddingInputRef = useRef<HTMLInputElement | null>(null);
    const pagePaddingInputRef = useRef<HTMLInputElement | null>(null);
    const fontSizeInputRef = useRef<HTMLInputElement | null>(null);
    const fontSizeInputRef2 = useRef<HTMLInputElement | null>(null);
    const contentScaleInputRef = useRef<HTMLInputElement | null>(null);

    const colScaleLabelRef = useRef<HTMLSpanElement | null>(null);
    const rowPaddingLabelRef = useRef<HTMLSpanElement | null>(null);
    const pagePaddingLabelRef = useRef<HTMLSpanElement | null>(null);
    const fontSizeLabelRef = useRef<HTMLSpanElement | null>(null);
    const fontSizeLabelRef2 = useRef<HTMLSpanElement | null>(null);
    const contentScaleLabelRef = useRef<HTMLSpanElement | null>(null);

    const cssRafRefs = useRef<Record<string, number | null>>({});

    const setCssVarRAF = useCallback((varName: string, value: string) => {
        if (!contentRef.current) return;
        const key = varName;
        if (cssRafRefs.current[key]) {
            window.cancelAnimationFrame(cssRafRefs.current[key]!);
        }
        cssRafRefs.current[key] = window.requestAnimationFrame(() => {
            if (!contentRef.current) return;
            contentRef.current.style.setProperty(varName, value);
            cssRafRefs.current[key] = null;
        });
    }, []);

    // Temporarily disable/enable CSS transitions for instant preview while dragging
    const disablePreviewTransitions = useCallback(() => {
        if (!contentRef.current) return;
        contentRef.current.style.setProperty('--pv-transform', '0ms');
        contentRef.current.style.setProperty('--pv-font', '0ms');
        contentRef.current.style.setProperty('--pv-padding', '0ms');
        contentRef.current.style.setProperty('--pv-line', '0ms');
        contentRef.current.style.setProperty('--pv-bg', '0ms');
    }, []);

    const enablePreviewTransitions = useCallback(() => {
        if (!contentRef.current) return;
        contentRef.current.style.setProperty('--pv-transform', '360ms cubic-bezier(.2,.9,.3,1)');
        contentRef.current.style.setProperty('--pv-font', '260ms cubic-bezier(.2,.9,.3,1)');
        contentRef.current.style.setProperty('--pv-padding', '360ms cubic-bezier(.2,.9,.3,1)');
        contentRef.current.style.setProperty('--pv-line', '360ms cubic-bezier(.2,.9,.3,1)');
        contentRef.current.style.setProperty('--pv-bg', '200ms ease');
    }, []);

    // initialize DOM labels/inputs to reflect state
    useEffect(() => {
        if (colScaleLabelRef.current) colScaleLabelRef.current.textContent = `${(columnScale * 100).toFixed(1)}%`;
        if (rowPaddingLabelRef.current) rowPaddingLabelRef.current.textContent = rowPadding % 1 === 0 ? `${rowPadding}px` : `${rowPadding.toFixed(1)}px`;
        if (pagePaddingLabelRef.current) pagePaddingLabelRef.current.textContent = pagePadding % 1 === 0 ? `${pagePadding}px` : `${pagePadding.toFixed(1)}px`;
        if (fontSizeLabelRef.current) fontSizeLabelRef.current.textContent = fontSize % 1 === 0 ? `${fontSize}px` : `${fontSize.toFixed(1)}px`;
        if (fontSizeLabelRef2.current) fontSizeLabelRef2.current.textContent = fontSize % 1 === 0 ? `${fontSize}px` : `${fontSize.toFixed(1)}px`;

        if (contentScaleLabelRef.current) contentScaleLabelRef.current.textContent = `${(contentScale * 100).toFixed(1)}%`;

        if (colScaleInputRef.current) colScaleInputRef.current.value = String(columnScale);
        if (rowPaddingInputRef.current) rowPaddingInputRef.current.value = String(rowPadding);
        if (pagePaddingInputRef.current) pagePaddingInputRef.current.value = String(pagePadding);
        if (fontSizeInputRef.current) fontSizeInputRef.current.value = String(fontSize);
        if (fontSizeInputRef2.current) fontSizeInputRef2.current.value = String(fontSize);
        if (contentScaleInputRef.current) contentScaleInputRef.current.value = String(contentScale);
    }, []);

    // keep inputs/labels in sync when committed state changes
    useEffect(() => {
        if (colScaleInputRef.current) colScaleInputRef.current.value = String(columnScale);
        if (colScaleLabelRef.current) colScaleLabelRef.current.textContent = `${(columnScale * 100).toFixed(1)}%`;
    }, [columnScale]);
    useEffect(() => {
        if (contentScaleInputRef.current) contentScaleInputRef.current.value = String(contentScale);
        if (contentScaleLabelRef.current) contentScaleLabelRef.current.textContent = `${(contentScale * 100).toFixed(1)}%`;
    }, [contentScale]);
    useEffect(() => {
        if (rowPaddingInputRef.current) rowPaddingInputRef.current.value = String(rowPadding);
        if (rowPaddingLabelRef.current) rowPaddingLabelRef.current.textContent = rowPadding % 1 === 0 ? `${rowPadding}px` : `${rowPadding.toFixed(1)}px`;
    }, [rowPadding]);
    useEffect(() => {
        if (pagePaddingInputRef.current) pagePaddingInputRef.current.value = String(pagePadding);
        if (pagePaddingLabelRef.current) pagePaddingLabelRef.current.textContent = pagePadding % 1 === 0 ? `${pagePadding}px` : `${pagePadding.toFixed(1)}px`;
    }, [pagePadding]);
    useEffect(() => {
        if (fontSizeInputRef.current) fontSizeInputRef.current.value = String(fontSize);
        if (fontSizeLabelRef.current) fontSizeLabelRef.current.textContent = fontSize % 1 === 0 ? `${fontSize}px` : `${fontSize.toFixed(1)}px`;
    }, [fontSize]);

    /* ── column helpers ── */
    const addCol = (id: string) => setActiveColIds(prev => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        try { localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(next)); } catch { }
        return next;
    });
    const removeCol = (id: string) => setActiveColIds(prev => {
        const next = prev.filter(c => c !== id);
        try { localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(next)); } catch { }
        return next;
    });

    const [dragOrder, setDragOrder] = useState<string[]>(activeColIds);
    
    useEffect(() => {
        setDragOrder(activeColIds);
    }, [activeColIds]);

    const handleReorderCols = (newOrder: string[]) => {
        setDragOrder(newOrder);
    };

    const handleDragEnd = () => {
        if (JSON.stringify(dragOrder) !== JSON.stringify(activeColIds)) {
            setActiveColIds(dragOrder);
            try { localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(dragOrder)); } catch { }
        }
    };

    /* ── helpers ── */
    const scrollTo = useCallback((id: string) => {
        if (!contentRef.current) return;
        const el = contentRef.current.querySelector(`[data-student-id="${id}"]`);
        if (el) {
            (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightId(id);
            setTimeout(() => setHighlightId(null), 2800);
        }
    }, []);

    const toggleCol = (id: string) => {}; // legacy no-op – replaced by addCol/removeCol

    const toggleStudent = useCallback((id: string) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            // We use allStudents so we don't have to reference visibleStudents in dependency array which might be tricky if it changes often. But actually toggleAll needs visibleStudents.
            return next;
        });
    }, []); // We will fix toggleAll below by not using useCallback if it depends on visibleStudents.

    /* ── derived lists ── */
    const allStudents: Student[] = payload?.students || [];
    const classes: ClassItem[] = payload?.classes || [];
    const groups: GroupItem[] = payload?.groups || [];

    const visibleStudents = React.useMemo(() => {
        return allStudents.filter(s => {
            const matchClass = selectedClassId === 'all' || s.metadata?.classId === selectedClassId;
            if (!matchClass) return false;

            if (debouncedFilterText && !(s.name || '').toLowerCase().includes(debouncedFilterText.toLowerCase())) return false;
            
            const sg = (s.metadata?.gender || '').toLowerCase();
            if (filterGender !== 'all') {
                if (filterGender === 'Male' && !['male', 'ছেলে', 'ছাত্র'].includes(sg)) return false;
                if (filterGender === 'Female' && !['female', 'মেয়ে', 'ছাত্রী'].includes(sg)) return false;
            }

            if (filterMinAge || filterMaxAge) {
                const dob = s.metadata?.dob || s.metadata?.dateOfBirth;
                if (!dob) return false;
                const age = (new Date().getTime() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                if (filterMinAge && age < Number(filterMinAge)) return false;
                if (filterMaxAge && age > Number(filterMaxAge)) return false;
            }

            if (filterBloodGroup !== 'all' && (s.metadata?.bloodGroup || '').toLowerCase() !== filterBloodGroup.toLowerCase()) return false;
            if (filterReligion !== 'all' && (s.metadata?.religion || '').toLowerCase() !== filterReligion.toLowerCase()) return false;

            return true;
        });
    }, [allStudents, selectedClassId, debouncedFilterText, filterGender, filterMinAge, filterMaxAge, filterBloodGroup, filterReligion]);

    // Redefining toggleAll here where visibleStudents is available
    const handleToggleAll = () => {
        const visible = visibleStudents.map(s => s.id);
        const allSelected = visible.every(id => selectedStudentIds.has(id));
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (allSelected) visible.forEach(id => next.delete(id));
            else visible.forEach(id => next.add(id));
            return next;
        });
    };

    const printStudents = React.useMemo(() => {
        return allStudents.filter(s => {
            if (!selectedStudentIds.has(s.id)) return false;

            const matchClass = selectedClassId === 'all' || s.metadata?.classId === selectedClassId;
            if (!matchClass) return false;

            if (debouncedFilterText && !(s.name || '').toLowerCase().includes(debouncedFilterText.toLowerCase())) return false;
            
            const sg = (s.metadata?.gender || '').toLowerCase();
            if (filterGender !== 'all') {
                if (filterGender === 'Male' && !['male', 'ছেলে', 'ছাত্র'].includes(sg)) return false;
                if (filterGender === 'Female' && !['female', 'মেয়ে', 'ছাত্রী'].includes(sg)) return false;
            }

            if (filterMinAge || filterMaxAge) {
                const dob = s.metadata?.dob || s.metadata?.dateOfBirth;
                if (!dob) return false;
                const age = (new Date().getTime() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                if (filterMinAge && age < Number(filterMinAge)) return false;
                if (filterMaxAge && age > Number(filterMaxAge)) return false;
            }

            if (filterBloodGroup !== 'all' && (s.metadata?.bloodGroup || '').toLowerCase() !== filterBloodGroup.toLowerCase()) return false;
            if (filterReligion !== 'all' && (s.metadata?.religion || '').toLowerCase() !== filterReligion.toLowerCase()) return false;

            return true;
        });
    }, [allStudents, selectedStudentIds, selectedClassId, debouncedFilterText, filterGender, filterMinAge, filterMaxAge, filterBloodGroup, filterReligion]);

    const groupedStudents = React.useMemo(() => {
        if (!payload || printStudents.length === 0) return [];
        const groupsRec: Record<string, Student[]> = {};
        printStudents.forEach((s: any) => {
            const cid = s.metadata?.classId || 'unknown';
            if (!groupsRec[cid]) groupsRec[cid] = [];
            groupsRec[cid].push(s);
        });
        return Object.entries(groupsRec).map(([cid, students]) => {
            const cName = classes.find(c => c.id === cid)?.name || 'অজানা ক্লাস';
            return { classId: cid, className: cName, students };
        }).sort((a, b) => {
            const idxA = classes.findIndex(c => c.id === a.classId);
            const idxB = classes.findIndex(c => c.id === b.classId);
            return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
        });
    }, [printStudents, classes, payload]);

    // Use fractional padding values for smoother transitions
    const cellPv = Math.max(2, rowPadding);
    const cellPh = Math.max(6, 12 * columnScale);

    /* ── print & copy handlers ── */
    const handlePrint = () => window.print();

    const handleCopyToExcel = () => {
        if (!groupedStudents || groupedStudents.length === 0) return;

        // Create headers
        const headers = activeColIds.map(colId => {
            const col = allAvailableCols.find(c => c.id === colId);
            return col?.label || colId;
        });

        const rows: string[] = [];
        // Add header row
        rows.push(headers.join('\t'));

        // Add data rows
        let serialCounter = 1;
        groupedStudents.forEach(group => {
            group.students.forEach((s) => {
                const rowData = activeColIds.map(colId => {
                    let cell: any = s.metadata?.[colId] || '-';
                    if (colId === 'sl') cell = serialCounter++;
                    else if (colId === 'rollNumber') cell = s.metadata?.rollNumber || '-';
                    else if (colId === 'studentId') cell = s.metadata?.studentId || s.id.substring(0, 6);
                    else if (colId === 'photo') cell = ''; // skip photo for excel
                    else if (colId === 'student') cell = s.name;
                    else if (colId === 'className') cell = `${classes.find(c => c.id === s.metadata?.classId)?.name || '-'}${s.metadata?.groupId ? ` • ${groups.find(g => g.id === s.metadata?.groupId)?.name || ''}` : ''}`;
                    else if (colId === 'contact') cell = s.phone || s.metadata?.phone || '-';
                    else if (colId === 'qr') cell = s.metadata?.studentId || s.id;
                    else if (colId === 'barcode') cell = s.metadata?.studentId || s.id;
                    
                    // clean up newlines and tabs
                    const cleaned = String(cell).replace(/\n/g, ' ').replace(/\t/g, ' ').trim();
                    return cleaned;
                });
                rows.push(rowData.join('\t'));
            });
        });

        const tsv = rows.join('\n');
        
        navigator.clipboard.writeText(tsv).then(() => {
            alert('সফলভাবে এক্সেল ফরম্যাটে কপি হয়েছে! এখন Excel বা Google Sheets-এ পেস্ট করতে পারেন।');
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('কপি করতে সমস্যা হয়েছে।');
        });
    };

    /* ── empty state ── */
    if (!payload) return null;

    const selectedCount = selectedStudentIds.size;
    const totalCount = allStudents.length;

    const modalContent = (
        <div className="print-modal-root fixed inset-0 z-[9999] flex flex-col bg-[#e8ecf0] overflow-hidden" style={{ fontFamily: "'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>

            {/* ══════════════════════════════
                TOP HEADER BAR
            ══════════════════════════════ */}
            <header
                className="flex-shrink-0 flex items-center gap-1.5 md:gap-2 px-2 md:px-4 relative z-[10000] overflow-x-auto hide-scrollbar"
                style={{ height: TOP_H, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            >
                {/* Left group */}
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 flex-shrink-0 rounded-full font-bold text-xs md:text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                    style={{ background: '#f97316' }}
                >
                    <ChevronLeft size={16} />
                    ফিরে যান
                </button>

                <button
                    onClick={toggleLeftSidebar}
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 flex-shrink-0 rounded-full font-bold text-xs md:text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                    style={{ background: leftOpen ? '#4f46e5' : '#64748b' }}
                >
                    <Users size={15} />
                    শিক্ষার্থী
                </button>

                <button
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 flex-shrink-0 rounded-full font-bold text-xs md:text-sm transition-all hover:opacity-90 active:scale-95 shadow-sm"
                    style={{ background: '#ecfdf5', color: '#059669' }}
                >
                    <User size={15} />
                    ব্যক্তিগত ভিউ
                </button>

                {/* Right group */}
                <div className="flex items-center gap-1.5 md:gap-2 ml-auto pl-2 flex-shrink-0">
                    <button
                        onClick={handleCopyToExcel}
                        className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 flex-shrink-0 rounded-full font-bold text-xs md:text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                        style={{ background: '#10b981' }}
                    >
                        <Copy size={15} />
                        এক্সেল কপি
                    </button>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 flex-shrink-0 rounded-full font-bold text-xs md:text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                        style={{ background: '#2563eb' }}
                    >
                        <Printer size={15} />
                        প্রিন্ট করুন
                    </button>

                    <button
                        onClick={toggleRightSidebar}
                        className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 flex-shrink-0 rounded-full font-bold text-xs md:text-sm text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
                        style={{ background: rightOpen ? '#8b5cf6' : '#64748b' }}
                    >
                        <Settings2 size={15} />
                        সেটিংস
                    </button>
                    
                    <button
                        onClick={onClose}
                        className="p-2 ml-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all shadow-sm"
                    >
                        <X size={16} />
                    </button>
                </div>
            </header>

            {/* ══════════════════════════════
                MAIN BODY (Drawers + Canvas)
            ══════════════════════════════ */}
            <div className="print-modal-body flex flex-1 overflow-hidden relative">
                {/* ── LEFT DRAWER ── */}
                <aside
                    className={`flex-shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden transition-all duration-300 ${window.innerWidth < 1024 ? 'absolute inset-y-0 left-0 shadow-2xl' : 'relative'} z-[1000]`}
                    style={{ width: leftOpen ? (window.innerWidth < 1024 ? '85%' : 300) : 0, maxWidth: 320, opacity: leftOpen ? 1 : 0, pointerEvents: leftOpen ? 'auto' : 'none' }}
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
                            onClick={(e) => { setSelectedClassId('all'); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm"
                            style={selectedClassId === 'all' ? { background: '#4f46e5', color: '#fff', borderColor: '#4f46e5' } : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }}
                        >
                            সব ক্লাস
                        </button>
                        {classes.map(c => (
                            <button
                                key={c.id}
                                onClick={(e) => { setSelectedClassId(c.id); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                                className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm"
                                style={selectedClassId === c.id ? { background: '#4f46e5', color: '#fff', borderColor: '#4f46e5' } : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Search & Advanced Filter */}
                    <div className="px-3 py-2 border-b border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                            <Search size={14} className="text-slate-400 flex-shrink-0" />
                            <input
                                value={filterText}
                                onChange={e => setFilterText(e.target.value)}
                                placeholder="শিক্ষার্থী খুঁজুন..."
                                className="flex-1 bg-transparent text-sm text-slate-700 outline-none w-full min-w-0"
                            />
                            {filterText && (
                                <button onClick={() => setFilterText('')} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                                    <X size={13} />
                                </button>
                            )}
                            <div className="w-px h-4 bg-slate-300 flex-shrink-0" />
                            <button 
                                onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                                className={`p-1 rounded-md transition-colors flex-shrink-0 ${isAdvancedFilterOpen || filterGender !== 'all' || filterMinAge || filterMaxAge || filterBloodGroup !== 'all' || filterReligion !== 'all' ? 'bg-[#e0e7ff] text-[#4f46e5]' : 'text-slate-400 hover:bg-slate-200'}`}
                            >
                                <SlidersHorizontal size={14} />
                            </button>
                        </div>

                        {/* Advanced Filters Panel */}
                        {isAdvancedFilterOpen && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 text-sm animate-slide-down origin-top">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">লিঙ্গ</label>
                                    <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:border-[#4f46e5]">
                                        <option value="all">সব</option>
                                        <option value="Male">ছেলে</option>
                                        <option value="Female">মেয়ে</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">সর্বনিম্ন বয়স</label>
                                        <input type="number" placeholder="উদা: 5" value={filterMinAge} onChange={e => setFilterMinAge(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:border-[#4f46e5]" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">সর্বোচ্চ বয়স</label>
                                        <input type="number" placeholder="উদা: 10" value={filterMaxAge} onChange={e => setFilterMaxAge(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:border-[#4f46e5]" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">রক্তের গ্রুপ</label>
                                        <select value={filterBloodGroup} onChange={e => setFilterBloodGroup(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:border-[#4f46e5]">
                                            <option value="all">সব</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">ধর্ম</label>
                                        <select value={filterReligion} onChange={e => setFilterReligion(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:border-[#4f46e5]">
                                            <option value="all">সব</option>
                                            <option value="Islam">ইসলাম</option>
                                            <option value="Hinduism">হিন্দু</option>
                                            <option value="Buddhism">বৌদ্ধ</option>
                                            <option value="Christianity">খ্রিস্টান</option>
                                        </select>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setFilterGender('all'); setFilterMinAge(''); setFilterMaxAge(''); setFilterBloodGroup('all'); setFilterReligion('all'); }} 
                                    className="w-full py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    রিসেট করুন
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">
                            শিক্ষার্থী <span className="font-black text-slate-700">{selectedCount}/{totalCount}</span>
                        </span>
                        <button
                            onClick={handleToggleAll}
                            className="text-xs font-bold text-[#4f46e5] hover:underline bg-[#e0e7ff] px-2.5 py-1 rounded-md"
                        >
                            {visibleStudents.every(s => selectedStudentIds.has(s.id)) ? 'সব বাদ দিন' : 'সব নাম দিন'}
                        </button>
                    </div>

                    {/* Student list */}
                    <div className="flex-1 overflow-y-auto py-2 px-1 custom-scrollbar" data-lenis-prevent>
                        {visibleStudents.map((s, idx) => {
                            const isSelected = selectedStudentIds.has(s.id);
                            const roll = s.metadata?.rollNumber;
                            // Alternating dot colors for visual interest
                            const dotColor = isSelected ? '#10b981' : '#f87171';
                            return (
                                <SidebarStudentItem
                                    key={s.id}
                                    s={s}
                                    isSelected={isSelected}
                                    roll={roll}
                                    dotColor={dotColor}
                                    onToggle={toggleStudent}
                                    onScrollTo={scrollTo}
                                />
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
                    {/* Centering trick: display:table + margin:auto shrinks to content width
                        and centers when smaller than container, while allowing overflow scroll
                        when wider — works for both FIT and 100% without clipping behind sidebars */}
                    <div className="print-reset-table" style={{
                        display: 'table',
                        margin: '24px auto 96px',
                        padding: '0 24px',
                    }}>
                        {/* Scale-compensation wrapper: reserves the VISUAL (post-scale) space in layout */}
                        <div className="print-reset-outer" style={{
                            width: Math.round((() => {
                                const dims: Record<string, { w: number; h: number }> = { A4: { w: 794, h: 1123 }, A3: { w: 1123, h: 1587 }, A5: { w: 559, h: 794 }, Letter: { w: 816, h: 1056 }, Legal: { w: 816, h: 1344 } };
                                const d = dims[pageSize] || dims['A4'];
                                return (orientation === 'landscape' ? d.h : d.w) * scale;
                            })()),
                            height: Math.round((() => {
                                const dims: Record<string, { w: number; h: number }> = { A4: { w: 794, h: 1123 }, A3: { w: 1123, h: 1587 }, A5: { w: 559, h: 794 }, Letter: { w: 816, h: 1056 }, Legal: { w: 816, h: 1344 } };
                                const d = dims[pageSize] || dims['A4'];
                                return (orientation === 'landscape' ? d.w : d.h) * scale;
                            })()),
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
                                        fontSize: `calc(var(--font-size, ${fontSize}px) * var(--content-scale, 1))`,
                                        width: pw,
                                        minHeight: ph,
                                        position: 'absolute' as const,
                                        top: 0,
                                        left: 0,
                                    };
                                })()}
                            >
                                {/* Ensure CSS variables reflect current settings for instant preview */}
                                {/* These are updated on slider input as well */}
                                {groupedStudents.map((group, groupIdx) => (
                                    <PrintLayout
                                        key={group.classId}
                                        title={payload.title || 'শিক্ষার্থী তালিকা'}
                                        institute={payload.institute}
                                        hideDate={true}
                                        hideTitle={true}
                                        previewOnly={false}
                                        pagePadding={pagePadding}
                                    >
                                        {group.className && (
                                            <div className="text-center mb-3 mt-1">
                                                <h3 className="text-lg font-bold text-slate-800">{group.className}</h3>
                                            </div>
                                        )}
                                        <div className="print-overflow-reset overflow-x-auto">
                                            <table className="w-full text-left border-collapse [&_th]:border-[0.5px] [&_th]:border-gray-800 [&_td]:border-[0.5px] [&_td]:border-gray-800" style={{ fontSize: 'calc(var(--font-size, 14px) * var(--content-scale, 1))' }}>
                                                <thead>
                                                    <tr>
                                                        {activeColIds.map(colId => {
                                                            const col = allAvailableCols.find(c => c.id === colId);
                                                                    return (
                                                                        <th key={colId} style={{ padding: `var(--cell-pv, ${cellPv}px) var(--cell-ph, ${cellPh}px)`, fontSize: 'inherit' }} className="font-black text-black text-center">
                                                                            {col?.label || colId}
                                                                        </th>
                                                                    );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.students.map((s, idx) => (
                                                        <PrintTableRow
                                                            key={s.id}
                                                            s={s}
                                                            idx={idx}
                                                            activeColIds={activeColIds}
                                                            classes={classes}
                                                            groups={groups}
                                                            cellPv={cellPv}
                                                            cellPh={cellPh}
                                                            isHighlighted={highlightId === s.id}
                                                        />
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
                                        hideDate={true}
                                        hideTitle={true}
                                        previewOnly={false}
                                        pagePadding={pagePadding}
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

                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5 custom-scrollbar" data-lenis-prevent>
                        {rightTab === 'layout' && (
                            <>
                                {/* Column order — split selected / available */}
                                <Section title="কলাম সাজান">
                                    {/* Selected columns (draggable) */}
                                    {activeColIds.length > 0 && (
                                        <div className="mb-3">
                                            <button 
                                                onClick={() => setIsSelectedColsExpanded(!isSelectedColsExpanded)}
                                                className="flex items-center justify-between w-full mb-1.5 focus:outline-none group bg-indigo-50/50 hover:bg-indigo-50 px-2 py-1.5 rounded-md transition-colors"
                                            >
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">✓ নির্বাচিত কলাম ({activeColIds.length})</p>
                                                {isSelectedColsExpanded ? <ChevronUp size={14} className="text-indigo-400" /> : <ChevronDown size={14} className="text-indigo-400" />}
                                            </button>
                                            <div 
                                                className={`grid transition-all duration-300 ease-in-out ${isSelectedColsExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'}`}
                                            >
                                                <div className="overflow-hidden flex flex-col gap-1">
                                                    <Reorder.Group axis="y" values={dragOrder} onReorder={handleReorderCols} className="flex flex-col gap-1">
                                                    {dragOrder.map(colId => {
                                                        const col = allAvailableCols.find(c => c.id === colId);
                                                        return (
                                                            <Reorder.Item
                                                                key={colId}
                                                                value={colId}
                                                                onDragEnd={handleDragEnd}
                                                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 cursor-grab active:cursor-grabbing select-none"
                                                            >
                                                                <GripVertical size={13} className="text-indigo-300 flex-shrink-0" />
                                                                <span className="flex-1 text-xs font-semibold text-indigo-800 truncate">{col?.label || colId}</span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); removeCol(colId); }}
                                                                    className="p-0.5 rounded text-indigo-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                                                                >
                                                                    <X size={11} />
                                                                </button>
                                                            </Reorder.Item>
                                                        );
                                                    })}
                                                    </Reorder.Group>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* All columns — always visible, checkbox shows selected state */}
                                    {allAvailableCols.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">সব কলাম</p>
                                            <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                                                {allAvailableCols.map(col => {
                                                    const isActive = activeColIds.includes(col.id);
                                                    return (
                                                        <button
                                                            key={col.id}
                                                            onClick={() => isActive ? removeCol(col.id) : addCol(col.id)}
                                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors text-left w-full ${isActive ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100' : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200'}`}
                                                        >
                                                            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? 'border-indigo-500 bg-indigo-500' : 'border-slate-200'}`}>
                                                                {isActive && <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth={2} style={{ width: 9, height: 9 }}><polyline points="1.5,5 4,7.5 8.5,2.5" /></svg>}
                                                            </span>
                                                            <span className={`flex-1 text-xs truncate font-semibold ${isActive ? 'text-indigo-800' : 'text-slate-500'}`}>{col.label}</span>
                                                            <span className={`text-[10px] flex-shrink-0 ${isActive ? 'text-indigo-300' : 'text-slate-300'}`}>{isActive ? '✓ নির্বাচিত' : '+ যোগ করুন'}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </Section>



                                {/* Row density / column scale */}
                                <Section title="কলামের আকার">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range" min={0.6} max={1.6} step={0.01}
                                            defaultValue={columnScale}
                                            ref={colScaleInputRef}
                                            onPointerDown={() => disablePreviewTransitions()}
                                            onInput={e => {
                                                const v = parseFloat((e.target as HTMLInputElement).value);
                                                columnScaleRef.current = v;
                                                setCssVarRAF('--cell-ph', `${(12 * v) * (contentScaleRef.current || contentScale)}px`);
                                                if (colScaleLabelRef.current) colScaleLabelRef.current.textContent = `${(v * 100).toFixed(1)}%`;
                                            }}
                                            onPointerUp={() => { const v = parseFloat(colScaleInputRef.current?.value || String(columnScaleRef.current)); setColumnScale(v); enablePreviewTransitions(); }}
                                            onMouseUp={() => { const v = parseFloat(colScaleInputRef.current?.value || String(columnScaleRef.current)); setColumnScale(v); enablePreviewTransitions(); }}
                                            onTouchEnd={() => { const v = parseFloat(colScaleInputRef.current?.value || String(columnScaleRef.current)); setColumnScale(v); enablePreviewTransitions(); }}
                                            onKeyUp={() => { const v = parseFloat(colScaleInputRef.current?.value || String(columnScaleRef.current)); setColumnScale(v); enablePreviewTransitions(); }}
                                            className="flex-1 accent-teal-600"
                                        />
                                        <span ref={colScaleLabelRef} className="text-xs font-bold text-slate-600 w-10 text-right">{(columnScale * 100).toFixed(1)}%</span>
                                    </div>
                                </Section>

                                {/* Row height */}
                                <Section title="সারি উচ্চতা">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range" min={2} max={40} step={0.1}
                                            defaultValue={rowPadding}
                                            ref={rowPaddingInputRef}
                                            onPointerDown={() => disablePreviewTransitions()}
                                            onInput={e => {
                                                const v = parseFloat((e.target as HTMLInputElement).value);
                                                rowPaddingRef.current = v;
                                                setCssVarRAF('--cell-pv', `${v * (contentScaleRef.current || contentScale)}px`);
                                                if (rowPaddingLabelRef.current) rowPaddingLabelRef.current.textContent = v % 1 === 0 ? `${v}px` : `${v.toFixed(1)}px`;
                                            }}
                                            onPointerUp={() => { const v = parseFloat(rowPaddingInputRef.current?.value || String(rowPaddingRef.current)); setRowPadding(v); enablePreviewTransitions(); }}
                                            onMouseUp={() => { const v = parseFloat(rowPaddingInputRef.current?.value || String(rowPaddingRef.current)); setRowPadding(v); enablePreviewTransitions(); }}
                                            onTouchEnd={() => { const v = parseFloat(rowPaddingInputRef.current?.value || String(rowPaddingRef.current)); setRowPadding(v); enablePreviewTransitions(); }}
                                            onKeyUp={() => { const v = parseFloat(rowPaddingInputRef.current?.value || String(rowPaddingRef.current)); setRowPadding(v); enablePreviewTransitions(); }}
                                            className="flex-1 accent-teal-600"
                                        />
                                        <span ref={rowPaddingLabelRef} className="text-xs font-bold text-slate-600 w-12 text-right">{rowPadding % 1 === 0 ? `${rowPadding}px` : `${rowPadding.toFixed(1)}px`}</span>
                                    </div>
                                </Section>

                                {/* Page padding */}
                                <Section title="পেজ প্যাডিং">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range" min={0} max={64} step={0.1}
                                            defaultValue={pagePadding}
                                            ref={pagePaddingInputRef}
                                            onPointerDown={() => disablePreviewTransitions()}
                                            onInput={e => {
                                                const v = parseFloat((e.target as HTMLInputElement).value);
                                                pagePaddingRef.current = v;
                                                setCssVarRAF('--page-padding', `${v}px`);
                                                if (pagePaddingLabelRef.current) pagePaddingLabelRef.current.textContent = v % 1 === 0 ? `${v}px` : `${v.toFixed(1)}px`;
                                            }}
                                            onPointerUp={() => { const v = parseFloat(pagePaddingInputRef.current?.value || String(pagePaddingRef.current)); setPagePadding(v); enablePreviewTransitions(); }}
                                            onMouseUp={() => { const v = parseFloat(pagePaddingInputRef.current?.value || String(pagePaddingRef.current)); setPagePadding(v); enablePreviewTransitions(); }}
                                            onTouchEnd={() => { const v = parseFloat(pagePaddingInputRef.current?.value || String(pagePaddingRef.current)); setPagePadding(v); enablePreviewTransitions(); }}
                                            onKeyUp={() => { const v = parseFloat(pagePaddingInputRef.current?.value || String(pagePaddingRef.current)); setPagePadding(v); enablePreviewTransitions(); }}
                                            className="flex-1 accent-teal-600"
                                        />
                                        <span ref={pagePaddingLabelRef} className="text-xs font-bold text-slate-600 w-12 text-right">{pagePadding % 1 === 0 ? `${pagePadding}px` : `${pagePadding.toFixed(1)}px`}</span>
                                    </div>
                                </Section>

                                {/* Font size (also available in Font tab) */}
                                <Section title="ফন্ট সাইজ">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range" min={10} max={22} step={0.5}
                                            defaultValue={fontSize}
                                            ref={fontSizeInputRef2}
                                            onPointerDown={() => disablePreviewTransitions()}
                                            onInput={e => {
                                                const v = parseFloat((e.target as HTMLInputElement).value);
                                                fontSizeRef.current = v;
                                                setCssVarRAF('--font-size', `${v}px`);
                                                if (fontSizeLabelRef.current) fontSizeLabelRef.current.textContent = v % 1 === 0 ? `${v}px` : `${v.toFixed(1)}px`;
                                                if (fontSizeLabelRef2.current) fontSizeLabelRef2.current.textContent = v % 1 === 0 ? `${v}px` : `${v.toFixed(1)}px`;
                                            }}
                                            onPointerUp={() => { const v = parseFloat(fontSizeInputRef2.current?.value || String(fontSizeRef.current)); setFontSize(v); enablePreviewTransitions(); }}
                                            onMouseUp={() => { const v = parseFloat(fontSizeInputRef2.current?.value || String(fontSizeRef.current)); setFontSize(v); enablePreviewTransitions(); }}
                                            onTouchEnd={() => { const v = parseFloat(fontSizeInputRef2.current?.value || String(fontSizeRef.current)); setFontSize(v); enablePreviewTransitions(); }}
                                            onKeyUp={() => { const v = parseFloat(fontSizeInputRef2.current?.value || String(fontSizeRef.current)); setFontSize(v); enablePreviewTransitions(); }}
                                            className="flex-1 accent-teal-600"
                                        />
                                        <span ref={fontSizeLabelRef2} className="text-xs font-bold text-slate-600 w-10 text-right">{fontSize % 1 === 0 ? `${fontSize}px` : `${fontSize.toFixed(1)}px`}</span>
                                    </div>
                                </Section>

                                <Section title="টেবিল কনটেন্ট সাইজ">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range" min={0.6} max={1.6} step={0.01}
                                            defaultValue={contentScale}
                                            ref={contentScaleInputRef}
                                            onPointerDown={() => disablePreviewTransitions()}
                                            onInput={e => {
                                                const v = parseFloat((e.target as HTMLInputElement).value);
                                                contentScaleRef.current = v;
                                                setCssVarRAF('--content-scale', `${v}`);
                                                if (contentScaleLabelRef.current) contentScaleLabelRef.current.textContent = `${(v * 100).toFixed(1)}%`;
                                            }}
                                            onPointerUp={() => { const v = parseFloat(contentScaleInputRef.current?.value || String(contentScaleRef.current)); setContentScale(v); enablePreviewTransitions(); }}
                                            onMouseUp={() => { const v = parseFloat(contentScaleInputRef.current?.value || String(contentScaleRef.current)); setContentScale(v); enablePreviewTransitions(); }}
                                            onTouchEnd={() => { const v = parseFloat(contentScaleInputRef.current?.value || String(contentScaleRef.current)); setContentScale(v); enablePreviewTransitions(); }}
                                            onKeyUp={() => { const v = parseFloat(contentScaleInputRef.current?.value || String(contentScaleRef.current)); setContentScale(v); enablePreviewTransitions(); }}
                                            className="flex-1 accent-teal-600"
                                        />
                                        <span ref={contentScaleLabelRef} className="text-xs font-bold text-slate-600 w-12 text-right">{(contentScale * 100).toFixed(1)}%</span>
                                    </div>
                                </Section>

                                {/* Page Size */}
                                <Section title="পৃষ্ঠার আকার">
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['A4', 'A3', 'A5', 'Letter', 'Legal'] as const).map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setPageSize(size)}
                                                className="py-2 rounded-xl text-xs font-bold border-2 transition-all"
                                                style={pageSize === size
                                                    ? { background: '#4f46e5', color: '#fff', borderColor: '#4f46e5' }
                                                    : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </Section>

                                {/* Orientation */}
                                <Section title="অভিমুখ (ওরিয়েন্টেশন)">
                                    <div className="grid grid-cols-2 gap-2">
                                        {([['portrait', 'পোর্ট্রেট (লম্বা)'], ['landscape', 'ল্যান্ডস্কেপ (আড়া)']] as const).map(([val, label]) => (
                                            <button
                                                key={val}
                                                onClick={() => setOrientation(val)}
                                                className="py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                                                style={orientation === val
                                                    ? { background: '#0ea5e9', color: '#fff', borderColor: '#0ea5e9' }
                                                    : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}
                                            >
                                                {label}
                                            </button>
                                        ))}
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
                                            type="range" min={10} max={22} step={0.5}
                                            defaultValue={fontSize}
                                            ref={fontSizeInputRef}
                                            onPointerDown={() => disablePreviewTransitions()}
                                            onInput={e => {
                                                const v = parseFloat((e.target as HTMLInputElement).value);
                                                fontSizeRef.current = v;
                                                setCssVarRAF('--font-size', `${v}px`);
                                                if (fontSizeLabelRef.current) fontSizeLabelRef.current.textContent = v % 1 === 0 ? `${v}px` : `${v.toFixed(1)}px`;
                                            }}
                                            onPointerUp={() => { const v = parseFloat(fontSizeInputRef.current?.value || String(fontSizeRef.current)); setFontSize(v); enablePreviewTransitions(); }}
                                            onMouseUp={() => { const v = parseFloat(fontSizeInputRef.current?.value || String(fontSizeRef.current)); setFontSize(v); enablePreviewTransitions(); }}
                                            onTouchEnd={() => { const v = parseFloat(fontSizeInputRef.current?.value || String(fontSizeRef.current)); setFontSize(v); enablePreviewTransitions(); }}
                                            onKeyUp={() => { const v = parseFloat(fontSizeInputRef.current?.value || String(fontSizeRef.current)); setFontSize(v); enablePreviewTransitions(); }}
                                            className="flex-1 accent-teal-600"
                                        />
                                        <span ref={fontSizeLabelRef} className="text-xs font-bold text-slate-600 w-10 text-right">{fontSize % 1 === 0 ? `${fontSize}px` : `${fontSize.toFixed(1)}px`}</span>
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
                                // apply columns to preview payload if necessary
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
                BOTTOM ZOOM BAR (Floating Pill)
            ══════════════════════════════ */}
            <div
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-slate-200"
                style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
            >
                <button
                    onClick={() => { setIsAutoFit(false); setScale(s => +(Math.max(0.3, s - 0.1)).toFixed(2)); }}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all shadow-sm"
                >
                    <ZoomOut size={16} />
                </button>

                <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100/50 rounded-xl min-w-[70px] justify-center">
                    <span className="text-xs font-black text-slate-700">{Math.round(scale * 100)}%</span>
                </div>

                <button
                    onClick={() => { setIsAutoFit(false); setScale(s => +(Math.min(2, s + 0.1)).toFixed(2)); }}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all shadow-sm"
                >
                    <ZoomIn size={16} />
                </button>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                <button
                    onClick={() => { setIsAutoFit(true); handleFit(); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black text-white transition-all hover:opacity-90 shadow-sm"
                    style={{ background: isAutoFit ? '#8b5cf6' : '#94a3b8' }}
                >
                    <Maximize2 size={13} />
                    FIT
                </button>

                <button
                    onClick={() => { setIsAutoFit(false); setScale(1); }}
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
                    header, aside, div[style*="bottom: 0"], div[style*="BOTTOM"], .fixed[style*="bottom: 6px"] { display: none !important; }
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
            <style>{`
                .print-reset-inner {
                    transition: transform 360ms cubic-bezier(.2,.9,.3,1), font-size 260ms cubic-bezier(.2,.9,.3,1);
                    will-change: transform, font-size;
                }
                .print-reset-outer {
                    transition: width 360ms cubic-bezier(.2,.9,.3,1), height 360ms cubic-bezier(.2,.9,.3,1);
                }
                .print-reset-table {
                    transition: margin 260ms cubic-bezier(.2,.9,.3,1);
                }
                .print-area th, .print-area td {
                    transition: padding 360ms cubic-bezier(.2,.9,.3,1), background-color 200ms ease, line-height 360ms cubic-bezier(.2,.9,.3,1);
                    will-change: padding, line-height, background-color;
                }
                .print-area tbody tr {
                    transition: background-color 220ms ease, transform 360ms cubic-bezier(.2,.9,.3,1);
                    will-change: background-color, transform;
                }
            `}</style>
        </div>
    );

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return require('react-dom').createPortal(modalContent, document.body);
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
