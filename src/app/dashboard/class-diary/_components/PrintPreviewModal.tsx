"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Printer, X, ZoomIn, ZoomOut, Maximize2, Settings, Palette, LayoutGrid, Frame, Type, Calendar, ArrowLeft, Eye } from "lucide-react";
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
import { ChevronLeft, ChevronRight } from "lucide-react";

const banglaDays = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const banglaMonths = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

const toBanglaNumber = (num: number | string) => {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num.toString().replace(/\d/g, (d) => banglaDigits[parseInt(d)]);
};

const isDateInHoliday = (dateStr: string, holidays: any[]) => {
  if (!holidays) return false;
  return holidays.some((h: any) => {
    if (h.startDate === dateStr || h.endDate === dateStr) return true;
    if (h.startDate < dateStr && h.endDate > dateStr) return true;
    return false;
  });
};

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  printSettings: { orientation: string; fontSize: number; headerFontSize?: number; spacing: number; columnWidth?: number; dateColumnWidth?: number; pageSize: string; themeColor: string; startDate?: string; endDate?: string; printClass?: string; instNameFontSize?: number; instAddressFontSize?: number; instContactFontSize?: number; headerBreakLine?: number; classNameFontSize?: number; classNameSpacing?: number; bulletStyle?: string; badgeFontSize?: number; badgePadding?: number; hideBlankSubjects?: boolean; hideTypeBadges?: boolean; hideEmptyCycles?: boolean; layoutStyle?: string; hideMobile?: boolean; };
  setPrintSettings: (val: any) => void;
  children: React.ReactNode;
  activeInstitute?: any;
  activeDiary?: any;
  activeTabClass?: string;
  diaryMode?: "daily" | "weekly";
  setDiaryMode?: (mode: "daily" | "weekly") => void;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  printSettings,
  setPrintSettings,
  children,
  activeInstitute,
  activeDiary,
  activeTabClass,
  diaryMode = "daily",
  setDiaryMode,
}: PrintPreviewModalProps) {
  const [zoom, setZoom] = useState(100);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [calendarViewDate, setCalendarViewDate] = useState(() => {
    return printSettings.startDate ? new Date(printSettings.startDate) : new Date();
  });

  useEffect(() => {
    if (isOpen && printSettings.startDate) {
      setCalendarViewDate(new Date(printSettings.startDate));
    }
  }, [isOpen, printSettings.startDate]);

  const handleDateClick = (dateStr: string) => {
    if (!printSettings.startDate || !printSettings.endDate || printSettings.startDate !== printSettings.endDate) {
      setPrintSettings((prev: any) => ({ ...prev, startDate: dateStr, endDate: dateStr }));
    } else {
      if (dateStr < printSettings.startDate) {
        setPrintSettings((prev: any) => ({ ...prev, startDate: dateStr }));
      } else {
        setPrintSettings((prev: any) => ({ ...prev, endDate: dateStr }));
      }
    }
  };

  const calculateAutoFit = useCallback(() => {
    if (!containerRef.current) return;
    const paddingX = typeof window !== 'undefined' && window.innerWidth < 640 ? 80 : 200;
    const availableWidth = containerRef.current.clientWidth - paddingX;
    
    // Default A4
    let pageW_mm = printSettings.orientation === "landscape" ? 297 : 210;
    let pageH_mm = printSettings.orientation === "landscape" ? 210 : 297;
    
    if (printSettings.pageSize === "A3") { pageW_mm = printSettings.orientation === "landscape" ? 420 : 297; pageH_mm = printSettings.orientation === "landscape" ? 297 : 420; }
    if (printSettings.pageSize === "A5") { pageW_mm = printSettings.orientation === "landscape" ? 210 : 148; pageH_mm = printSettings.orientation === "landscape" ? 148 : 210; }
    if (printSettings.pageSize === "Legal") { pageW_mm = printSettings.orientation === "landscape" ? 356 : 216; pageH_mm = printSettings.orientation === "landscape" ? 216 : 356; }
    if (printSettings.pageSize === "Letter") { pageW_mm = printSettings.orientation === "landscape" ? 279 : 216; pageH_mm = printSettings.orientation === "landscape" ? 216 : 279; }

    const pageW_px = (pageW_mm * 96) / 25.4;
    
    const zoomW = (availableWidth / pageW_px) * 100;
    
    const newZoom = Math.floor(zoomW);
    setZoom(prev => {
      if (Math.abs(newZoom - prev) <= 1) return prev;
      return Math.min(250, Math.max(10, newZoom));
    });
  }, [printSettings.orientation, printSettings.pageSize]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready and CSS transitions finish (sidebar toggling takes 300ms)
      setTimeout(calculateAutoFit, 350);
    }
  }, [isOpen, isMobileSettingsOpen, printSettings.orientation, printSettings.pageSize, calculateAutoFit]);

  useEffect(() => {
    window.addEventListener("resize", calculateAutoFit);
    return () => window.removeEventListener("resize", calculateAutoFit);
  }, [calculateAutoFit]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setIsAutoFit(false);
    setZoom(prev => Math.min(250, prev + 10));
  };
  const handleZoomOut = () => {
    setIsAutoFit(false);
    setZoom(prev => Math.max(10, prev - 10));
  };
  const handleZoomReset = () => {
    setIsAutoFit(true);
    calculateAutoFit();
  };

  return (
    <div className="diary-print-modal fixed inset-0 z-[9999] flex flex-col h-screen w-full overflow-hidden !bg-slate-100 font-sans print:bg-white print:h-auto print:overflow-visible print:static print:block" style={{ colorScheme: 'light' }}>
      {/* Dynamic Style for Printing & Custom Slider Behavior */}
      <style>{`
        /* Force light color scheme inside print modal - never show dark mode here */
        .diary-print-modal, .diary-print-modal * {
          color-scheme: light !important;
        }
        .diary-print-modal .print-paper {
          background: white !important;
          color: black !important;
        }
        .strict-slider {
          pointer-events: none;
        }
        .strict-slider::-webkit-slider-thumb {
          pointer-events: auto;
          cursor: grab;
        }
        .strict-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
        }
        .strict-slider::-moz-range-thumb {
          pointer-events: auto;
          cursor: grab;
        }
        .strict-slider::-moz-range-thumb:active {
          cursor: grabbing;
        }
        @media print { 
          @page { size: ${printSettings.orientation === "landscape" ? "landscape" : "portrait"}; margin: 0.20in; } 
          body, html { margin: 0 !important; padding: 0 !important; background: white !important; height: auto !important; min-height: auto !important; overflow: visible !important; position: static !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-scheme: light !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-scheme: light !important; }
          .print-hidden-in-modal { display: none !important; }
          .print-isolated-modal { display: block !important; position: static !important; width: 100% !important; max-width: 100% !important; min-height: auto !important; height: auto !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; transform: none !important; page-break-inside: auto !important; }
          .print-zoom-wrapper { zoom: 1 !important; transform: none !important; display: block !important; position: static !important; }
          table { display: table !important; page-break-inside: auto; border-collapse: collapse; }
          thead { display: table-header-group !important; }
          tbody { display: table-row-group !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}</style>

      {/* Global Top Bar */}
      <div className="h-20 shrink-0 !bg-white !border-b !border-slate-200 flex items-center justify-between px-4 sm:px-8 z-[120] print:hidden shadow-sm w-full">
        <button
          onClick={onClose}
          className="flex items-center gap-2.5 text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-bold text-sm md:text-base px-5 py-3 rounded-xl transition-all border border-transparent hover:border-indigo-100 active:scale-95"
          title="ডায়েরিতে ফিরে যান"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>ফিরে যান</span>
        </button>
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => {
              setTimeout(() => window.print(), 100);
            }}
            className="rounded-xl bg-indigo-600 px-6 sm:px-8 py-3 text-sm md:text-base font-bold text-white hover:bg-indigo-700 flex flex-row items-center justify-center gap-2.5 shadow-sm active:scale-95 transition-all"
          >
            <Printer className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">প্রিন্ট করুন</span>
          </button>
          <button
            onClick={() => setIsMobileSettingsOpen(!isMobileSettingsOpen)}
            className={`flex items-center gap-2.5 font-bold text-sm md:text-base px-5 sm:px-6 py-3 rounded-xl transition-all active:scale-95 ${isMobileSettingsOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-inner' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'}`}
            title="সেটিংস"
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">সেটিংস</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex h-full min-h-0 w-full flex-row-reverse overflow-hidden relative print:overflow-visible print:h-auto print:block print:static">
        {/* Settings Sidebar */}
        <div
        className={`!bg-white transition-all duration-300 flex flex-col z-[110] shrink-0 h-full print:hidden overflow-hidden shadow-2xl lg:shadow-none absolute lg:relative
            ${isMobileSettingsOpen ? "w-96 border-l right-0 opacity-100" : "w-0 border-none -right-96 lg:right-0 opacity-0"}
          `}
        >
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="space-y-8 pb-10">

             {/* Diary Format Option */}
             {setDiaryMode && (
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                  ডায়েরি ফরম্যাট
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDiaryMode("daily")}
                    className={cn(
                      "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                      diaryMode === "daily"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                        : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                    )}
                  >
                    দৈনিক
                  </button>
                  <button
                    onClick={() => setDiaryMode("weekly")}
                    className={cn(
                      "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                      diaryMode === "weekly"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                        : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                    )}
                  >
                    সাপ্তাহিক
                  </button>
                </div>
              </div>
            )}

             {/* Layout Style Option */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                লেআউট স্টাইল (Layout Style)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, layoutStyle: "header" }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    printSettings.layoutStyle !== "leftColumn"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  স্টাইল ১ (হেডার)
                </button>
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, layoutStyle: "leftColumn" }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    printSettings.layoutStyle === "leftColumn"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  স্টাইল ২ (কলাম)
                </button>
              </div>
            </div>

            {/* Class Selection */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                শ্রেণী নির্বাচন
              </label>
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 px-1 scroll-smooth w-full">
                <button
                  onClick={(e) => {
                    setPrintSettings((prev: any) => ({ ...prev, printClass: "all" }));
                    const container = e.currentTarget.parentElement;
                    if (container) {
                      const button = e.currentTarget;
                      const scrollLeft = button.offsetLeft - (container.offsetWidth / 2) + (button.offsetWidth / 2);
                      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                    }
                  }}
                  className={cn(
                    "flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
                    printSettings.printClass === "all"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  সব শ্রেণী
                </button>
                {activeDiary?.config?.map((cls: any) => {
                  const isActive = (!printSettings.printClass && cls.className === activeTabClass) || printSettings.printClass === cls.className;
                  return (
                    <button
                      key={cls.className}
                      onClick={(e) => {
                        setPrintSettings((prev: any) => ({ ...prev, printClass: cls.className }));
                        const container = e.currentTarget.parentElement;
                        if (container) {
                          const button = e.currentTarget;
                          const scrollLeft = button.offsetLeft - (container.offsetWidth / 2) + (button.offsetWidth / 2);
                          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                        }
                      }}
                      className={cn(
                        "flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
                        isActive
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {cls.className}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range Calendar */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Calendar className="w-3 h-3" /> প্রিন্ট তারিখ নির্বাচন
              </label>
              
              <div className="border border-slate-200 bg-white rounded-xl p-3 shadow-sm select-none">
                {/* Header: Month and Year Selector */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <button
                    onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-all active:scale-90"
                    title="পূর্ববর্তী মাস"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1 text-slate-500" />
                  </button>

                  <h4 className="text-xs font-bold text-slate-800 tracking-wide">
                    {banglaMonths[calendarViewDate.getMonth()]} {toBanglaNumber(calendarViewDate.getFullYear())}
                  </h4>

                  <button
                    onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-all active:scale-90"
                    title="পরবর্তী মাস"
                  >
                    <ChevronRight className="w-4 h-4 ml-1 text-slate-500" />
                  </button>
                </div>

                {/* Weekdays Grid */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-slate-400 mb-1">
                  {["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"].map((day) => (
                    <div key={day} className="py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1).getDay() }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square" />
                  ))}

                  {Array.from({ length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate() }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dateStr = `${calendarViewDate.getFullYear()}-${String(calendarViewDate.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                    
                    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(dateStr).getDay()];
                    const isWeeklyHol = (activeDiary?.weeklyHolidays || ["Friday"]).includes(dayName);
                    const holiday = isDateInHoliday(dateStr, activeDiary?.holidays || []) || isWeeklyHol;

                    const isSelected = !!(printSettings.startDate && printSettings.endDate && dateStr >= printSettings.startDate && dateStr <= printSettings.endDate) && !holiday;
                    const isStart = printSettings.startDate === dateStr && !holiday;
                    const isEnd = printSettings.endDate === dateStr && !holiday;
                    
                    const dateEntries = activeDiary?.entries?.[dateStr];
                    const hasTask = dateEntries
                      ? Object.values(dateEntries).some((classData: any) =>
                        Object.values(classData).some((bookData: any) =>
                          Object.values(bookData || {}).some(val => typeof val === 'string' && val.trim() !== '')
                        )
                      )
                      : false;

                    let cellClasses = "text-slate-600 hover:bg-slate-100";
                    if (isSelected) {
                      if (isStart || isEnd) {
                        cellClasses = "bg-indigo-600 text-white font-black shadow-sm shadow-indigo-200 z-10 scale-105 rounded-lg";
                      } else {
                        cellClasses = "bg-indigo-50 text-indigo-700 font-bold rounded-none";
                      }
                    } else if (holiday) {
                      cellClasses = "bg-rose-50 text-rose-700 hover:bg-rose-100";
                    }

                    return (
                      <div key={`day-${dayNum}`} className="relative aspect-square">
                        {isSelected && !isStart && <div className="absolute inset-y-0 left-0 w-1/2 bg-indigo-50 -z-10" />}
                        {isSelected && !isEnd && <div className="absolute inset-y-0 right-0 w-1/2 bg-indigo-50 -z-10" />}
                        <button
                          onClick={() => handleDateClick(dateStr)}
                          className={cn(
                            "w-full h-full flex flex-col items-center justify-center rounded-lg text-[10px] transition-all relative",
                            cellClasses
                          )}
                        >
                          <span>{toBanglaNumber(dayNum)}</span>
                          {hasTask && (
                            <span className="absolute bottom-0.5 flex items-center justify-center">
                              <span className={cn(
                                "h-1 w-1 rounded-full",
                                (isStart || isEnd) ? "bg-white" : "bg-emerald-500"
                              )} />
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <LayoutGrid className="w-3 h-3" /> ওরিয়েন্টেশন
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["portrait", "landscape"] as const).map((ori) => (
                  <button
                    key={ori}
                    onClick={() => setPrintSettings((prev: any) => ({ ...prev, orientation: ori }))}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all duration-300",
                      printSettings.orientation === ori
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-100 hover:border-slate-300 text-slate-500"
                    )}
                  >
                    <div className={cn(
                      "border-2 rounded-sm transition-all",
                      printSettings.orientation === ori ? "border-indigo-500" : "border-slate-300",
                      ori === "portrait" ? "w-5 h-7" : "w-7 h-5"
                    )} />
                    <span className="text-[10px] font-black capitalize">{ori === "portrait" ? "পোর্ট্রেট" : "ল্যান্ডস্কেপ"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Page Size */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Frame className="w-3 h-3" /> পেজ সাইজ
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: "A3", w: "297", h: "420" },
                  { id: "A4", w: "210", h: "297" },
                  { id: "A5", w: "148", h: "210" },
                  { id: "Legal", w: "216", h: "356" },
                  { id: "Letter", w: "216", h: "279" },
                ] as const).map((pg) => (
                  <button
                    key={pg.id}
                    onClick={() => setPrintSettings((prev: any) => ({ ...prev, pageSize: pg.id }))}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all duration-300",
                      printSettings.pageSize === pg.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-100 hover:border-slate-300 text-slate-500"
                    )}
                  >
                    <span className="text-[11px] font-black">{pg.id}</span>
                    <span className="text-[8px] font-bold opacity-60 leading-none">{pg.w}×{pg.h}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Sizes & Spacing */}
            <div className="space-y-5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Type className="w-3 h-3" /> ফন্ট ও স্পেসিং
              </label>
              <div className="space-y-4 px-1">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>টেবিল ফন্ট সাইজ</span>
                    <span>{printSettings.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.fontSize}
                    min={4} max={32} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>হেডার ফন্ট সাইজ</span>
                    <span>{printSettings.headerFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.headerFontSize || 16}
                    min={4} max={32} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, headerFontSize: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>রো স্পেসিং (প্যাডিং)</span>
                    <span>{printSettings.spacing}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.spacing}
                    min={0} max={32} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, spacing: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>কলাম প্রস্থ (Subject)</span>
                    <span>{printSettings.columnWidth}%</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.columnWidth || 20}
                    min={5} max={50} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, columnWidth: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>কলাম প্রস্থ (তারিখ ও দিন)</span>
                    <span>{printSettings.dateColumnWidth ?? 18}%</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.dateColumnWidth ?? 18}
                    min={5} max={50} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, dateColumnWidth: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
              </div>
            </div>

            {/* Header Customization */}
            <div className="space-y-5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Type className="w-3 h-3" /> হেডার কাস্টমাইজেশন
              </label>
              <div className="space-y-4 px-1">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>প্রতিষ্ঠানের নাম ফন্ট সাইজ</span>
                    <span>{printSettings.instNameFontSize || 32}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.instNameFontSize || 32}
                    min={16} max={72} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, instNameFontSize: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>প্রতিষ্ঠানের ঠিকানা ফন্ট সাইজ</span>
                    <span>{printSettings.instAddressFontSize || 16}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.instAddressFontSize || 16}
                    min={10} max={36} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, instAddressFontSize: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>কন্টাক্ট ফন্ট সাইজ</span>
                    <span>{printSettings.instContactFontSize || 14}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.instContactFontSize || 14}
                    min={8} max={24} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, instContactFontSize: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>হেডার লাইন (ব্রেক লাইন)</span>
                    <span>{printSettings.headerBreakLine || 2}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.headerBreakLine || 2}
                    min={0} max={10} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, headerBreakLine: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>শ্রেণী নাম ফন্ট সাইজ</span>
                    <span>{printSettings.classNameFontSize || 20}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.classNameFontSize || 20}
                    min={12} max={48} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, classNameFontSize: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>শ্রেণী নামের স্পেসিং</span>
                    <span>{printSettings.classNameSpacing ?? 3}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.classNameSpacing ?? 3}
                    min={0} max={60} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, classNameSpacing: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>বুলেট স্টাইল (Bullet)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {["•", "○", "▪", "❖", "✧", "✦", "➭", "✓"].map((bullet) => (
                      <button
                        key={bullet}
                        onClick={() => setPrintSettings((prev: any) => ({ ...prev, bulletStyle: bullet }))}
                        className={cn(
                          "py-2 rounded-lg border-2 text-center transition-all font-black text-[14px]",
                          printSettings.bulletStyle === bullet ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {bullet}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>ব্যাজ ফন্ট সাইজ (CW/HW)</span>
                    <span>{printSettings.badgeFontSize ?? 10}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.badgeFontSize ?? 10}
                    min={2} max={24} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, badgeFontSize: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600">
                    <span>ব্যাজ প্যাডিং</span>
                    <span>{printSettings.badgePadding ?? 6}px</span>
                  </div>
                  <input
                    type="range"
                    value={printSettings.badgePadding ?? 6}
                    min={0} max={32} step={1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, badgePadding: Number(e.target.value) }))}
                    className="w-full cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none strict-slider"
                  />
                </div>
              </div>
            </div>

            {/* Blank Content Option */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, hideBlankSubjects: false }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    printSettings.hideBlankSubjects === false
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  ফাঁকা বিষয় দেখান
                </button>
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, hideBlankSubjects: true }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    printSettings.hideBlankSubjects !== false
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  ফাঁকা বিষয় লুকান
                </button>
              </div>
            </div>

            {/* Hide Mobile Option */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, hideMobile: false }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    !printSettings.hideMobile
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  মোবাইল নম্বর দেখান
                </button>
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, hideMobile: true }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    printSettings.hideMobile
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  মোবাইল নম্বর লুকান
                </button>
              </div>
            </div>

            {/* Hide Type Badges Option */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, hideTypeBadges: false }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    !printSettings.hideTypeBadges
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  ব্যাজ দেখান
                </button>
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, hideTypeBadges: true }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    printSettings.hideTypeBadges
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  ব্যাজ লুকান
                </button>
              </div>
            </div>

            {/* Hide Empty Cycles Option */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, hideEmptyCycles: false }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    !printSettings.hideEmptyCycles
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  ফাঁকা তারিখ দেখান
                </button>
                <button
                  onClick={() => setPrintSettings((prev: any) => ({ ...prev, hideEmptyCycles: true }))}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center",
                    printSettings.hideEmptyCycles
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-black"
                      : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                  )}
                >
                  ফাঁকা তারিখ লুকান
                </button>
              </div>
            </div>

            {/* Theme Color */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Palette className="w-3 h-3" /> থিম কালার
              </label>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(["#b3cbe6", "#4f46e5", "#0891b2", "#059669", "#dc2626", "#d97706", "#7c3aed", "#2563eb", "#000000"])).map((color) => (
                  <button
                    key={color}
                    onClick={() => setPrintSettings((prev: any) => ({ ...prev, themeColor: color }))}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all duration-300",
                      printSettings.themeColor === color ? "border-white ring-2 ring-indigo-600 scale-125 z-10" : "border-transparent scale-100"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input
                  type="color"
                  value={printSettings.themeColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintSettings((prev: any) => ({ ...prev, themeColor: e.target.value }))}
                  className="w-8 h-7 p-0 border-none rounded-full overflow-hidden cursor-pointer shadow-sm"
                />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative print:h-auto print:block print:static">
        
        {/* Live Scaled Canvas */}
        <div ref={containerRef} className="flex-1 overflow-auto !bg-slate-200/70 pt-4 pb-48 px-4 sm:pt-10 sm:pb-60 sm:px-16 flex flex-col items-center custom-scrollbar print:p-0 print:bg-white print:block print:overflow-visible relative print:static">
          
          <div className="print-zoom-wrapper flex flex-col items-center w-full print:block" style={{ zoom: typeof window !== 'undefined' && window.matchMedia('print').matches ? 1 : (zoom / 100) }}>
              {children}
          </div>

          {/* Floating Controls Wrapper */}
          <div className="fixed bottom-6 right-4 lg:bottom-10 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto z-[60] print:hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Mobile view: Collapsed/Expanded panel */}
            {!isControlsExpanded ? (
              <button
                onClick={() => setIsControlsExpanded(true)}
                className="h-12 w-12 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-indigo-600 hover:bg-slate-50 transition-all active:scale-90 lg:hidden border-indigo-100 relative"
                title="কন্ট্রোল প্যানেল"
              >
                <Settings className="w-5.5 h-5.5" />
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-500 border-2 border-white rounded-full animate-ping" />
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-500 border-2 border-white rounded-full" />
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2.5 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] lg:hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button
                  onClick={handleZoomIn}
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all text-slate-600 active:scale-90"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4.5 h-4.5" />
                </button>

                <span className="text-[10px] font-black text-slate-700 tracking-tighter">
                  {zoom}%
                </span>

                <button
                  onClick={handleZoomOut}
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all text-slate-600 active:scale-90"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4.5 h-4.5" />
                </button>

                <div className="w-6 h-px bg-slate-200" />

                <button
                  onClick={() => {
                    setIsAutoFit(true);
                    calculateAutoFit();
                  }}
                  className={cn(
                    "h-9 w-9 flex items-center justify-center rounded-xl transition-all active:scale-95",
                    isAutoFit
                      ? "bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                      : "bg-slate-100 text-indigo-600 hover:bg-indigo-50"
                  )}
                  title="স্ক্রিনে ফিট করুন"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsAutoFit(false);
                    setZoom(100);
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-[10px] font-black text-slate-500 transition-all active:scale-95"
                  title="100% Zoom"
                >
                  100%
                </button>

                <div className="w-6 h-px bg-slate-200" />
                <button
                  onClick={() => setIsControlsExpanded(false)}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-all active:scale-90"
                  title="কন্ট্রোলস বন্ধ করুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Desktop/Tablet view: Two horizontal pills */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Zoom Group */}
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-full p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
                <button
                  onClick={handleZoomOut}
                  className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all text-slate-600 active:scale-90"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>

                <div className="h-6 w-px bg-slate-200 shrink-0" />

                <span className="text-[12px] font-black w-12 text-center text-slate-700 tracking-tighter shrink-0">
                  {zoom}%
                </span>

                <div className="h-6 w-px bg-slate-200 shrink-0" />

                <button
                  onClick={handleZoomIn}
                  className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all text-slate-600 active:scale-90"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>

              {/* Action Group */}
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-full p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
                <button
                  onClick={() => {
                    setIsAutoFit(true);
                    calculateAutoFit();
                  }}
                  className={cn(
                    "px-3 sm:px-4 h-10 shrink-0 rounded-full transition-all active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                    isAutoFit
                      ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] ring-2 ring-indigo-600 ring-offset-2"
                      : "bg-slate-100 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700"
                  )}
                  title="স্ক্রিনে ফিট করুন"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Fit</span>
                </button>

                <div className="h-6 w-px bg-slate-200 shrink-0" />

                <button
                  onClick={() => {
                    setIsAutoFit(false);
                    setZoom(100);
                  }}
                  className="px-3 h-10 shrink-0 rounded-full hover:bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all active:scale-95 flex items-center"
                >
                  100%
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      </div>

      {/* Mobile backdrop */}
      {isMobileSettingsOpen && (
        <div
          className="fixed inset-0 z-[105] bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden print-hidden-in-modal"
          onClick={() => setIsMobileSettingsOpen(false)}
        />
      )}
    </div>
  );
}
