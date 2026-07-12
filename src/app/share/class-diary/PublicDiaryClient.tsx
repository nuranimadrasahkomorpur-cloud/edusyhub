"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FiCalendar,
  FiBook,
  FiCheck,
  FiCheckCircle,
  FiPrinter,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiInfo,
  FiBookOpen,
  FiSunrise,
  FiAlertCircle,
  FiClock,
  FiMenu,
  FiX,
  FiList,
  FiPlus,
} from "react-icons/fi";
import { toBanglaNumber, processHtmlForNumbering } from "@/utils/dateUtils";

// ── Holiday helpers ──────────────────────────────────────────────────────────
type Holiday = { id: string; name: string; startDate: string; endDate: string };

const isDateInHoliday = (dateStr: string, holidays: Holiday[]): Holiday | null => {
  for (const h of holidays) {
    if (dateStr >= h.startDate && dateStr <= h.endDate) return h;
  }
  return null;
};

const formatHolidayRange = (h: Holiday): string => {
  if (h.startDate === h.endDate) return formatBanglaDate(h.startDate);
  const s = new Date(h.startDate);
  const e = new Date(h.endDate);
  const sDay = toBanglaNumber(s.getDate());
  const eDay = toBanglaNumber(e.getDate());
  const sMonth = banglaMonths[s.getMonth()];
  const eMonth = banglaMonths[e.getMonth()];
  const year = toBanglaNumber(e.getFullYear());
  if (s.getMonth() === e.getMonth()) return `${sDay}–${eDay} ${eMonth} ${year}`;
  return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${year}`;
};

const getTomorrow = (dateStr: string): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

// Helper for Bangla Dates
const banglaMonths = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];
const banglaDays = [
  "রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"
];

const formatBanglaDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = toBanglaNumber(d.getDate());
  const month = banglaMonths[d.getMonth()];
  const year = toBanglaNumber(d.getFullYear());
  const dayOfWeek = banglaDays[d.getDay()];
  return `${dayOfWeek}, ${day} ${month} ${year}`;
};

const getColorClasses = (color: string) => {
  const map: Record<string, { text: string, bg: string, border: string, lightBg: string, ring: string, activeBg: string, hoverBg: string }> = {
    emerald: { text: "text-emerald-700", bg: "bg-emerald-500", border: "border-emerald-200", lightBg: "bg-emerald-100", ring: "focus-within:ring-emerald-400 focus-within:border-emerald-400", activeBg: "bg-emerald-600 text-white border-emerald-600", hoverBg: "bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100/70" },
    indigo: { text: "text-indigo-700", bg: "bg-indigo-500", border: "border-indigo-200", lightBg: "bg-indigo-100", ring: "focus-within:ring-indigo-400 focus-within:border-indigo-400", activeBg: "bg-indigo-600 text-white border-indigo-600", hoverBg: "bg-indigo-50 text-indigo-700 border-indigo-250 hover:bg-indigo-100/70" },
    amber: { text: "text-amber-700", bg: "bg-amber-500", border: "border-amber-200", lightBg: "bg-amber-100", ring: "focus-within:ring-amber-400 focus-within:border-amber-400", activeBg: "bg-amber-600 text-white border-amber-600", hoverBg: "bg-amber-50 text-amber-700 border-amber-250 hover:bg-amber-100/70" },
    rose: { text: "text-rose-700", bg: "bg-rose-500", border: "border-rose-200", lightBg: "bg-rose-100", ring: "focus-within:ring-rose-400 focus-within:border-rose-400", activeBg: "bg-rose-600 text-white border-rose-600", hoverBg: "bg-rose-50 text-rose-700 border-rose-250 hover:bg-rose-100/70" },
    sky: { text: "text-sky-700", bg: "bg-sky-500", border: "border-sky-200", lightBg: "bg-sky-100", ring: "focus-within:ring-sky-400 focus-within:border-sky-400", activeBg: "bg-sky-600 text-white border-sky-600", hoverBg: "bg-sky-50 text-sky-700 border-sky-250 hover:bg-sky-100/70" },
    purple: { text: "text-purple-700", bg: "bg-purple-500", border: "border-purple-200", lightBg: "bg-purple-100", ring: "focus-within:ring-purple-400 focus-within:border-purple-400", activeBg: "bg-purple-600 text-white border-purple-600", hoverBg: "bg-purple-50 text-purple-700 border-purple-250 hover:bg-purple-100/70" },
    teal: { text: "text-teal-700", bg: "bg-teal-500", border: "border-teal-200", lightBg: "bg-teal-100", ring: "focus-within:ring-teal-400 focus-within:border-teal-400", activeBg: "bg-teal-600 text-white border-teal-600", hoverBg: "bg-teal-50 text-teal-700 border-teal-250 hover:bg-teal-100/70" },
    pink: { text: "text-pink-700", bg: "bg-pink-500", border: "border-pink-200", lightBg: "bg-pink-100", ring: "focus-within:ring-pink-400 focus-within:border-pink-400", activeBg: "bg-pink-600 text-white border-pink-600", hoverBg: "bg-pink-50 text-pink-700 border-pink-250 hover:bg-pink-100/70" },
  };
  return map[color] || map.emerald;
};

const renderDiaryLine = (
  line: string,
  index: number,
  totalLines: number,
  isArabic: boolean,
  badge?: React.ReactNode
) => {
  const isBangla = /[\u0980-\u09FF]/.test(line);
  const alreadyHasNumber = /^[0-9০-৯٠-٩]+[.)]\s/.test(line.trim());

  let numberStr = "";
  if (totalLines > 1 && !alreadyHasNumber) {
    const num = index + 1;
    if (isBangla) {
      numberStr = toBanglaNumber(num) + ". ";
    } else if (isArabic) {
      const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
      const toArabicNumber = (n: number) =>
        n
          .toString()
          .split("")
          .map((d) => {
            const parsed = parseInt(d);
            return isNaN(parsed) ? d : arabicDigits[parsed];
          })
          .join("");
      numberStr = toArabicNumber(num) + ". ";
    } else {
      numberStr = num + ". ";
    }
  }

  const dir = isArabic ? "rtl" : "ltr";
  const alignmentClass = isArabic ? "text-right" : "text-left";
  return (
    <div
      key={index}
      dir={dir}
      className={`group/line flex items-start justify-between gap-3 py-0.5 px-2 -mx-2 hover:bg-slate-50/50 rounded-lg transition-all w-full ${alignmentClass}`}
    >
      <div className="flex items-start gap-1.5 flex-1 min-w-0">
        {badge}
        {numberStr && (
          <span className="text-gray-405 font-bold select-none flex-shrink-0 text-base">
            {numberStr}
          </span>
        )}
        <span 
          className="text-gray-800 text-base font-semibold leading-relaxed whitespace-pre-wrap flex-1 break-words jodit-content"
          dangerouslySetInnerHTML={{ __html: line }}
        />
      </div>
    </div>
  );
}

interface PublicDiaryClientProps {
  diary: any;
  initialDate: string;
  initialClass: string;
  instituteName: string;
}

export default function PublicDiaryClient({ diary: initialDiary, initialDate, initialClass, instituteName }: PublicDiaryClientProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [activeTabClass, setActiveTabClass] = useState(initialClass || "");

  // Live diary state — starts with server-rendered data then auto-refreshes
  const [diary, setDiary] = useState(initialDiary);

  const fetchLatestDiary = async () => {
    try {
      const res = await fetch(`/apis/share/class-diary?id=${initialDiary.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.data) setDiary(data.data);
      }
    } catch {}
  };

  // Poll every 30 seconds for new content
  useEffect(() => {
    const interval = setInterval(fetchLatestDiary, 30000);
    return () => clearInterval(interval);
  }, [initialDiary.id]);

  // Also refresh when window regains focus (teacher just saved & guardian switches back)
  useEffect(() => {
    const onFocus = () => fetchLatestDiary();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [initialDiary.id]);

  // Load from localStorage after hydration to prevent mismatch
  useEffect(() => {
    if (!initialClass) {
      const saved = localStorage.getItem(`diary_last_class_${diary.id}`);
      if (saved) {
        setActiveTabClass(saved);
      }
    }
  }, [initialClass, diary.id]);

  const logTypes = useMemo(() => {
    const baseTypes = diary.logTypes || [
      { id: "cw", label: "CW (আজকের পড়া)", color: "emerald" },
      { id: "hw", label: "HW (বাড়ির কাজ)", color: "indigo" },
      { id: "test", label: "টেস্ট (Class Test)", color: "amber" },
      { id: "notice", label: "নোটিশ (Notice)", color: "rose" }
    ];
    if (!baseTypes.some((t: any) => t.id === "general")) {
      return [{ id: "general", label: "সাধারণ", color: "slate" }, ...baseTypes];
    }
    return baseTypes;
  }, [diary.logTypes]);

  const topNavRef = useRef<HTMLDivElement>(null);
  const [topNavHeight, setTopNavHeight] = useState(124);

  const measureNavHeight = () => {
    if (topNavRef.current) {
      const style = window.getComputedStyle(topNavRef.current);
      const margin = parseFloat(style.marginBottom) || 0;
      setTopNavHeight(topNavRef.current.offsetHeight + margin);
    }
  };

  useEffect(() => {
    measureNavHeight();
    const observer = new ResizeObserver(() => measureNavHeight());
    if (topNavRef.current) {
      observer.observe(topNavRef.current);
    }

    // Aggressively recalculate for the first 2 seconds to catch font loads or layout shifts
    const interval = setInterval(measureNavHeight, 250);
    const timeout = setTimeout(() => clearInterval(interval), 2000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [diary, selectedDate]);

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false);
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});
  const [highlightedSubject, setHighlightedSubject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'table'>('table');
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);


  // Load viewMode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('diary_view_mode');
    if (saved === 'card' || saved === 'list' || saved === 'table') {
      setViewMode(saved);
    }
  }, []);

  // Sync viewMode to localStorage
  useEffect(() => {
    localStorage.setItem('diary_view_mode', viewMode);
  }, [viewMode]);

  const toggleSubject = (id: string) => {
    setCollapsedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToSubject = (bookId: string) => {
    const el = document.getElementById(`subject-${bookId}`);
    if (el) {
      const offset = topNavRef.current ? topNavRef.current.offsetHeight : 150;
      const y = el.getBoundingClientRect().top + window.scrollY - offset - 20;
      window.scrollTo({ top: y, behavior: 'smooth' });
      
      setTimeout(() => {
        setHighlightedSubject(bookId);
        setTimeout(() => setHighlightedSubject(null), 2000);
      }, 400);
    }
    setIsSubjectMenuOpen(false);
  };

  // Load configured classes
  const classesList = useMemo(() => {
    return diary.config as Array<{ className: string; books: Array<{ id: string; name: string }> }> || [];
  }, [diary]);

  // Sync selected class to localStorage
  useEffect(() => {
    const storageKey = `diary_last_class_${diary.id}`;
    if (activeTabClass) {
      localStorage.setItem(storageKey, activeTabClass);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [activeTabClass, diary.id]);

  // Switch dates back/forth
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().split("T")[0];
    setSelectedDate(newDateStr);
  };

  // Active Class Tab books
  const activeClassBooks = useMemo(() => {
    return (classesList.find((c) => c.className === activeTabClass)?.books || [])
      .filter((book: any) => book.isPermanentlyHidden !== true);
  }, [classesList, activeTabClass]);

  // Check if today's diary is restricted by publish time
  const [isNotPublishedYet, setIsNotPublishedYet] = useState(false);
  const [countdownStr, setCountdownStr] = useState("");

  // --- Custom Calendar State ---
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date(selectedDate));

  const openCalendar = () => {
    setCalendarMonthDate(new Date(selectedDate));
    setIsCalendarOpen(true);
  };

  const hasContentOnDate = (dateStr: string) => {
    const classData = diary.entries?.[dateStr]?.[activeTabClass];
    if (!classData) return false;
    for (const book of activeClassBooks) {
      const log = classData[book.id];
      if (log && log.isHidden !== true && Object.keys(log).some(k => typeof log[k] === "string" && log[k].trim() !== "")) return true;
    }
    return false;
  };

  const areAllSubjectsDoneOnDate = (dateStr: string) => {
    const classData = diary.entries?.[dateStr]?.[activeTabClass];
    if (!classData) return false;
    if (!activeClassBooks || activeClassBooks.length === 0) return false;
    let visibleBooksCount = 0;
    for (const book of activeClassBooks) {
      const log = classData[book.id];
      if (log && log.isHidden === true) continue;
      visibleBooksCount++;
      if (!log || !Object.keys(log).some(k => typeof log[k] === "string" && log[k].trim() !== "")) {
        return false;
      }
    }
    return visibleBooksCount > 0;
  };

  const shiftCalendarMonth = (months: number) => {
    const d = new Date(calendarMonthDate);
    d.setMonth(d.getMonth() + months);
    setCalendarMonthDate(d);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - tzOffset);
      days.push(localDate.toISOString().split("T")[0]);
    }
    return days;
  }, [calendarMonthDate]);

  useEffect(() => {
    if (!diary.publishTime) {
      setIsNotPublishedYet(false);
      return;
    }

    const checkTime = () => {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localNow = new Date(now.getTime() - tzOffset);
      const todayStr = localNow.toISOString().split("T")[0];

      if (selectedDate !== todayStr) {
        setIsNotPublishedYet(false);
        return;
      }

      const [pubHour, pubMinute] = diary.publishTime.split(":").map(Number);
      const pubDate = new Date();
      pubDate.setHours(pubHour, pubMinute, 0, 0);

      if (now < pubDate) {
        setIsNotPublishedYet(true);
        const diffMs = pubDate.getTime() - now.getTime();
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

        const hrsStr = String(hrs).padStart(2, '0');
        const minsStr = String(mins).padStart(2, '0');
        const secsStr = String(secs).padStart(2, '0');

        setCountdownStr(toBanglaNumber(`${hrsStr}:${minsStr}:${secsStr}`));
      } else {
        setIsNotPublishedYet(false);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [diary.publishTime, selectedDate]);

  useEffect(() => {
    if (activeClassBooks.length > 0) {
      setActiveSubjectId("all");
    } else {
      setActiveSubjectId(null);
    }
  }, [activeClassBooks]);

  // Handle active tab centering on mobile
  useEffect(() => {
    if (activeTabClass && topNavRef.current) {
      const container = topNavRef.current.querySelector('.class-tabs-container') as HTMLElement;
      if (container) {
        const activeBtn = container.querySelector('[data-active="true"]') as HTMLElement;
        if (activeBtn) {
          setTimeout(() => {
            const scrollLeft = activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
          }, 100);
        }
      }
    }
  }, [activeTabClass]);

  // Color palettes for class cards
  const cardPalettes = [
    { bg: "from-indigo-500 to-violet-600", light: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", hover: "hover:border-indigo-300", num: "bg-indigo-100 text-indigo-700" },
    { bg: "from-emerald-500 to-teal-600", light: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", hover: "hover:border-emerald-300", num: "bg-emerald-100 text-emerald-700" },
    { bg: "from-rose-500 to-pink-600", light: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", hover: "hover:border-rose-300", num: "bg-rose-100 text-rose-700" },
    { bg: "from-amber-500 to-orange-500", light: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", hover: "hover:border-amber-300", num: "bg-amber-100 text-amber-700" },
    { bg: "from-sky-500 to-blue-600", light: "bg-sky-50", text: "text-sky-600", border: "border-sky-100", hover: "hover:border-sky-300", num: "bg-sky-100 text-sky-700" },
    { bg: "from-purple-500 to-fuchsia-600", light: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", hover: "hover:border-purple-300", num: "bg-purple-100 text-purple-700" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative pb-16 transition-colors duration-300">

      {/* ── Full Width Edge-to-Edge Cover Banner ──────────────────────────────── */}
      <div className="relative h-[100px] w-full bg-indigo-600 overflow-hidden pointer-events-none">
        {/* Abstract Cover Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"></div>
        {/* Decorative blobs in cover */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/20 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        {/* Texture overlay */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
        {/* Bottom shadow for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>

      {/* ── Full Width White Profile Header Band ────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 w-full shadow-sm border-b border-gray-200 dark:border-slate-800 mb-0 h-[110px] sm:h-[150px] transition-colors duration-300">
        <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-full flex flex-col justify-center">

          <div className="flex flex-row items-center w-full gap-4 sm:gap-6 xl:gap-8 py-0">
            {/* Institute Logo overlapping the cover */}
            <div className="relative -mt-8 sm:-mt-20 xl:-mt-24 z-10 group flex-shrink-0">
              <div className="flex h-16 w-16 sm:h-36 sm:w-36 xl:h-44 xl:w-44 items-center justify-center rounded-full bg-white p-1.5 sm:p-2.5 shadow-xl shadow-indigo-900/10 transition-transform duration-300 group-hover:scale-105">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden relative">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
                  <FiBook className="h-8 w-8 sm:h-16 sm:w-16 xl:h-20 xl:w-20 text-white relative z-10" />
                </div>
              </div>
              {/* Verified badge */}
              <span className="absolute bottom-0 right-0 sm:bottom-3 sm:right-3 xl:bottom-4 xl:right-4 z-20 flex h-5 w-5 sm:h-9 sm:w-9 xl:h-10 xl:w-10 items-center justify-center rounded-full bg-white shadow-md border-[2px] sm:border-[3px] border-white">
                <FiCheckCircle className="h-3 w-3 sm:h-5 sm:w-5 xl:h-6 xl:w-6 text-emerald-500" />
              </span>
            </div>

            <div className="flex-1 text-left mt-0 sm:mt-2">
              {/* Institute name */}
              <h1 className="text-xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                {instituteName}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1.5 sm:mt-3">

                {/* Badges */}
                <div className="flex flex-wrap items-center justify-start gap-1.5 sm:gap-2">
                  <span className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-2.5 py-1 sm:px-4 sm:py-1.5 xl:px-5 xl:py-2 text-[10px] sm:text-xs xl:text-sm font-black text-slate-600 dark:text-slate-300 tracking-wider uppercase shadow-sm">
                    <FiCalendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 xl:h-4 xl:w-4" />
                    {diary.type === "daily" ? "দৈনিক ডায়েরি" : diary.type === "weekly" ? "সাপ্তাহিক ডায়েরি" : "মাসিক ডায়েরি"}
                  </span>
                  <span className="inline-flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 px-2.5 py-1 sm:px-4 sm:py-1.5 xl:px-5 xl:py-2 text-[9px] sm:text-[10px] xl:text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-sm">
                    অভিভাবক পোর্টাল
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Dynamic Content Area ────────────────────────────── */}
      {!activeTabClass ? (
        <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-6 sm:pt-8 xl:pt-10 animate-fade-in">

          {/* ── Section Header ──────────────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-6 sm:mb-8 xl:mb-10 px-2 xl:px-4">
            <div className="flex h-12 w-12 xl:h-14 xl:w-14 flex-shrink-0 items-center justify-center rounded-2xl xl:rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
              <FiBookOpen className="h-6 w-6 xl:h-7 xl:w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl xl:text-3xl font-black text-gray-800 dark:text-white leading-tight">শ্রেণী নির্বাচন করুন</h2>
              <p className="text-sm xl:text-base font-semibold text-gray-500 dark:text-slate-400 mt-1">আপনার শিক্ষার্থীর শ্রেণীতে ট্যাপ করুন</p>
            </div>
            <div className="ml-auto flex-shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 px-4 py-1.5 xl:px-5 xl:py-2 text-sm xl:text-base font-black text-indigo-700 dark:text-indigo-400 shadow-sm">
              {toBanglaNumber(classesList.length)} টি শ্রেণী
            </div>
          </div>

          {/* ── Class Cards Grid ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 xl:gap-6">
            {classesList.map((item, index) => {
              const palette = cardPalettes[index % cardPalettes.length];
              return (
                <button
                  key={item.className}
                  onClick={() => setActiveTabClass(item.className)}
                  className={`group relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 ${palette.border} dark:border-slate-800 ${palette.hover} p-6 shadow-sm hover:shadow-lg transition-all duration-200 active:scale-95`}
                >
                  {/* hover glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${palette.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-200`} />

                  {/* Number badge */}
                  <span className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${palette.num}`}>
                    {toBanglaNumber(index + 1)}
                  </span>

                  {/* Icon */}
                  <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl ${palette.light} ${palette.text} transition-all duration-200 group-hover:scale-110`}>
                    <FiBook className="h-6 w-6" />
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${palette.bg} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  </div>

                  {/* Class name */}
                  <span className={`font-black text-gray-700 dark:text-slate-300 text-base leading-tight text-center group-hover:${palette.text} transition-colors duration-200`}>
                    {item.className}
                  </span>

                  {/* Arrow indicator */}
                  <div className={`flex items-center gap-1 text-[11px] font-bold ${palette.text} opacity-0 group-hover:opacity-100 transition-all duration-200 -mt-2`}>
                    <span>ডায়েরি দেখুন</span>
                    <FiChevronRight className="h-3 w-3" />
                  </div>
                </button>
              );
            })}
          </div>


        </div>
      ) : (
        <div className="w-full px-2 pb-4 pt-2 md:px-4 lg:px-8 md:pb-8 md:pt-4 animate-fade-in relative z-10 flex flex-col lg:flex-row items-start justify-between gap-6">

          {/* ── Left Sidebar: Classes List (Desktop Only) ── */}
          <div className="hidden lg:flex w-64 xl:w-72 flex-col gap-4 sticky top-4 shrink-0 z-[40]">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  <FiBookOpen className="h-4 w-4" />
                </div>
                <h3 className="font-black text-slate-800 dark:text-slate-200">শ্রেণী সমূহ</h3>
              </div>
              <div className="p-3 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar flex-1">
                {classesList.map((item) => (
                  <button
                    key={item.className}
                    onClick={() => setActiveTabClass(item.className)}
                    className={`px-4 py-3 text-left font-bold rounded-2xl transition-all duration-200 ${activeTabClass === item.className ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-100 dark:hover:border-slate-700'}`}
                  >
                    {item.className}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Center Column: Main Diary ── */}
          <div className="flex-1 w-full max-w-4xl min-w-0 mx-auto">

          {/* Sticky Header Wrapper (Top switcher + Date Navigator): Stays pinned to the top of screen on scroll with glass blur effect */}
          <div ref={topNavRef} className="sticky top-0 z-[50] bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md pt-2 pb-6 sm:pb-8 print:hidden -mx-2 px-2 flex flex-col gap-3">
            {/* ── Holiday Alert (Moved to Top) ────────────────────────────────────────────── */}
            {(() => {
              const holidays: Holiday[] = diary?.holidays || [];
              const todayHol = isDateInHoliday(selectedDate, holidays);
              const tomorrowHol = isDateInHoliday(getTomorrow(selectedDate), holidays);
              if (!todayHol && !tomorrowHol) return null;
              return (
                <div className="flex flex-col gap-2 w-full">
                  {todayHol && (
                    <div className="w-full flex items-center justify-between gap-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FiSunrise className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-rose-500" />
                        <span className="text-sm sm:text-base font-black text-rose-700 truncate">আজ ছুটি: {todayHol.name}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-rose-400 whitespace-nowrap">{formatHolidayRange(todayHol)}</span>
                    </div>
                  )}
                  {!todayHol && tomorrowHol && (
                    <div className="w-full flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FiAlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-amber-500" />
                        <span className="text-sm sm:text-base font-black text-amber-700 truncate">আগামীকাল ছুটি: {tomorrowHol.name}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-amber-400 whitespace-nowrap">{formatHolidayRange(tomorrowHol)}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Top Navigation Bar (Mobile Only) ────────────────────────────────────────────── */}
            <div className="flex flex-row items-center gap-1.5 w-full lg:hidden overflow-hidden">
              {/* Scrollable Class Tabs */}
              <div className="flex-1 overflow-x-auto flex items-center gap-2 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden class-tabs-container">
                {classesList.map((item) => {
                  const isActive = activeTabClass === item.className;
                  return (
                    <button
                      key={item.className}
                      data-active={isActive}
                      onClick={(e) => {
                        setActiveTabClass(item.className);
                        const container = e.currentTarget.closest('.class-tabs-container');
                        if (container) {
                          const scrollLeft = e.currentTarget.offsetLeft - (container.clientWidth / 2) + (e.currentTarget.clientWidth / 2);
                          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                        }
                      }}
                      className={`flex items-center gap-2 flex-shrink-0 rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-black shadow-sm border transition-all active:scale-95 ${
                        isActive
                          ? "bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 shadow-md ring-1 ring-indigo-100 dark:ring-indigo-900/50"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-colors ${
                        isActive ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}>
                        <FiBook className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <span>{item.className}</span>
                    </button>
                  );
                })}
              </div>

              {/* Hamburger Menu for Subjects */}
              <div className="flex-shrink-0 pl-1">
                <button
                  onClick={() => setIsSubjectMenuOpen(!isSubjectMenuOpen)}
                  className={`flex h-10 w-10 sm:h-[42px] sm:w-[42px] items-center justify-center bg-white dark:bg-slate-900 border rounded-full shadow-sm transition-all ${isSubjectMenuOpen ? 'border-indigo-400 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  title="বিষয় তালিকা"
                >
                  {isSubjectMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Date Selector Navigation Bar */}
            <div className="flex flex-col bg-slate-50 dark:bg-slate-900 rounded-2xl p-2.5 shadow-sm border border-slate-100 dark:border-slate-800">
              {/* Top Line: Navigation and Date */}
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => shiftDate(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 shadow-sm transition-all hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-90"
                  title="পূর্ববর্তী দিন"
                >
                  <FiChevronLeft className="h-5 w-5" />
                </button>

                <div className="relative flex justify-center flex-1">
                  <button
                    onClick={openCalendar}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 group"
                  >
                    <span className="text-md sm:text-lg font-black text-gray-800 dark:text-white group-hover:text-indigo-900 dark:group-hover:text-indigo-400 transition-colors">
                      {formatBanglaDate(selectedDate)}
                    </span>
                  </button>

                  {/* Calendar Dropdown */}
                  {isCalendarOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setIsCalendarOpen(false)} />
                      <div className="absolute top-full mt-2 w-[300px] sm:w-[340px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 z-[70] animate-fade-in origin-top">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => shiftCalendarMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><FiChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" /></button>
                          <span className="font-black text-slate-800 dark:text-slate-200 text-base sm:text-lg">
                            {banglaMonths[calendarMonthDate.getMonth()]} {toBanglaNumber(calendarMonthDate.getFullYear())}
                          </span>
                          <button onClick={() => shiftCalendarMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><FiChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" /></button>
                        </div>
                        {/* Days of week */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"].map((d, i) => (
                            <div key={i} className="text-center text-[10px] sm:text-[11px] font-black text-slate-400 uppercase">{d}</div>
                          ))}
                        </div>
                        {/* Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map((dateStr, i) => {
                            if (!dateStr) return <div key={i} className="aspect-square" />;
                            
                            const isSelected = dateStr === selectedDate;
                            const isToday = dateStr === new Date().toISOString().split("T")[0];
                            const hasContent = hasContentOnDate(dateStr);
                            const isAllDone = areAllSubjectsDoneOnDate(dateStr);
                            const hol = isDateInHoliday(dateStr, diary.holidays || []);
                            const isHol = !!hol;
                            
                            const dNum = toBanglaNumber(parseInt(dateStr.split("-")[2], 10));

                            let bgClass = "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300";
                            let borderClass = "border-transparent";
                            
                            if (isSelected) {
                              bgClass = "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md";
                            } else if (isHol) {
                              bgClass = "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50";
                            } else if (isAllDone) {
                              bgClass = "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold";
                            } else if (hasContent) {
                              bgClass = "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold";
                            }

                            if (isToday && !isSelected) {
                              borderClass = "border-indigo-400";
                            }

                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  setSelectedDate(dateStr);
                                  setIsCalendarOpen(false);
                                }}
                                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all active:scale-90 border ${bgClass} ${borderClass}`}
                                title={isHol ? hol.name : isAllDone ? "সব বিষয় সম্পন্ন" : hasContent ? "ডায়েরি আছে" : ""}
                              >
                                <span className="text-xs sm:text-sm">{dNum}</span>
                                {hasContent && !isSelected && !isAllDone && <span className="absolute bottom-1 sm:bottom-1.5 h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-indigo-500" />}
                                {isAllDone && !isSelected && <span className="absolute bottom-1 sm:bottom-1.5 h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-500" />}
                                {isHol && !isSelected && <span className="absolute bottom-1 sm:bottom-1.5 h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-rose-400" />}
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Legend */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                           <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>সব বিষয় সম্পন্ন</div>
                           <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500"></span>ডায়েরি আছে</div>
                           <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400"></span>ছুটি</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => shiftDate(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 shadow-sm transition-all hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-90"
                  title="পরবর্তী দিন"
                >
                  <FiChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Diary Card Head */}
          <div className="relative w-full">
            {/* Institute header removed per user request */}



            {/* Printable date header (Print only) */}
            <div className="hidden print:block text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                তারিখ: {formatBanglaDate(selectedDate)}
              </h2>
            </div>

            {/* Class Tabs Removed (handled via initial selection screen) */}

            {/* Printed class indicator (Print only) */}
            <div className="hidden print:block border-l-4 border-indigo-600 pl-3 mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                শ্রেণী: {activeTabClass}
              </h3>
            </div>

            {/* Subject Details Table */}
            {activeTabClass && activeClassBooks.length > 0 && (
              <div className="flex flex-col gap-6">
                {/* Standard display logic for Screen (Table-based) */}
                <div className="print:hidden">
                  {isNotPublishedYet ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-sm text-center px-4 animate-fade-in">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 mb-4">
                        <FiClock className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-black text-gray-800 dark:text-white">অপেক্ষা করুন</h3>
                      <p className="text-sm font-bold text-gray-500 dark:text-slate-400 mt-2">
                        আজকের পাঠদান ডায়েরি {toBanglaNumber(diary.publishTime)} এর পর প্রকাশ করা হবে।
                      </p>
                      <div className="mt-5 flex flex-col items-center justify-center gap-1.5">
                        <span className="text-gray-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">আর বাকি</span>
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-mono font-black text-2xl px-5 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50 shadow-inner tracking-widest">{countdownStr}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Global Notice Board */}
                      {(() => {
                        const classLogs = diary.entries?.[selectedDate]?.[activeTabClass] || {};
                        const globalLogs = diary.entries?.[selectedDate]?.['GLOBAL'] || {};
                        
                        const notices: { bookName: string; text: string; isGlobal?: boolean }[] = [];
                        
                        // 1. Subject specific notices
                        activeClassBooks.forEach((book: any) => {
                          const log = classLogs[book.id];
                          if (log && log['notice'] && log.isHidden !== true) {
                            notices.push({
                              bookName: book.name,
                              text: log['notice']
                            });
                          }
                        });
                        
                        // 2. Class specific notices
                        if (classLogs['CLASS_NOTICE']?.['notice']) {
                           notices.push({
                              bookName: 'এই শ্রেণীর জন্য সাধারণ নোটিশ',
                              text: classLogs['CLASS_NOTICE']['notice']
                           });
                        }
                        
                        // 3. Global notices
                        if (globalLogs['GLOBAL_NOTICE']?.['notice']) {
                           notices.push({
                              bookName: 'সকল শ্রেণীর জন্য নোটিশ',
                              text: globalLogs['GLOBAL_NOTICE']['notice'],
                              isGlobal: true
                           });
                        }
                        
                        if (notices.length === 0) return null;
                        
                        return (
                          <div className={`w-full bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 rounded-3xl mb-6 shadow-sm transition-all duration-300 ${notices.length === 0 ? 'p-3 sm:p-4' : 'p-4 sm:p-6'}`}>
                            <div 
                              onClick={() => setIsNoticeExpanded(!isNoticeExpanded)}
                              className={`flex items-center justify-between cursor-pointer group ${!isNoticeExpanded ? '' : 'mb-4'}`}
                              title={isNoticeExpanded ? "নোটিশ বন্ধ করুন" : "নোটিশ দেখুন"}
                            >
                              <h3 className="flex items-center gap-2 text-rose-700 font-black text-lg group-hover:text-rose-800 transition-colors select-none">
                                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></span>
                                নোটিশ বোর্ড
                                {notices.length > 0 && (
                                  <span className="text-xs font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full ml-1">
                                    {toBanglaNumber(notices.length)}
                                  </span>
                                )}
                                <FiChevronRight className={`h-5 w-5 text-rose-400 transition-transform duration-300 ${isNoticeExpanded ? 'rotate-90' : ''}`} />
                              </h3>
                            </div>
                            
                            {isNoticeExpanded && (
                              <div className="flex flex-col gap-3 animate-fade-in">
                                {notices.length > 0 ? notices.map((notice, i) => (
                                  <div key={i} className="flex flex-col gap-1.5 bg-white/60 dark:bg-slate-800/60 p-3 rounded-xl border border-rose-100 dark:border-rose-800/30 relative">
                                    <div className="flex items-center gap-2">
                                      <div className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${notice.isGlobal ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {notice.bookName}
                                      </div>
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap mt-1">
                                      {/<[a-z][\s\S]*>/i.test(notice.text) ? (
                                          <div 
                                            className="diary-html-content prose prose-sm max-w-none prose-rose" 
                                            dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(notice.text) }} 
                                          />
                                      ) : (
                                          notice.text
                                      )}
                                    </div>
                                  </div>
                                )) : (
                                  <div className="text-sm font-bold text-rose-400 italic px-2">কোনো নোটিশ নেই</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {(() => {
                        const booksWithData = activeClassBooks.filter((book: any) => {
                          const log = diary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                          if (log.isHidden === true) return false;
                          return Object.keys(log).some(k => k !== 'notice' && k !== 'isHidden' && log[k]);
                        });

                        if (booksWithData.length === 0) {
                          if (viewMode === 'table') return null;

                          return (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-sm text-gray-400 dark:text-slate-500 italic text-sm">
                              কোন তথ্য নেই
                            </div>
                          );
                        }

                      const cardGradients = [
                        "from-indigo-500 via-purple-500 to-violet-600",
                        "from-emerald-500 via-teal-500 to-cyan-600",
                        "from-rose-500 via-pink-500 to-fuchsia-600",
                        "from-amber-500 via-orange-500 to-red-500",
                        "from-sky-500 via-blue-500 to-indigo-600",
                        "from-lime-500 via-green-500 to-emerald-600",
                        "from-fuchsia-500 via-violet-500 to-purple-600",
                        "from-cyan-500 via-sky-500 to-blue-600",
                      ];

                      return (
                        <div className={`${viewMode === 'card' ? 'animate-fade-in w-full flex flex-col gap-6 print:hidden pb-[70vh]' : 'hidden print:hidden'}`}>
                          {booksWithData.map((book: any, bookIdx: number) => {
                            const gradient = cardGradients[bookIdx % cardGradients.length];
                            const log = diary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                            const categories = logTypes.map((t: any) => ({
                              type: t.id,
                              label: t.label,
                              value: log[t.id] || "",
                              color: t.color || "emerald"
                            }));
                            const filledCategories = categories.filter((c: any) => c.value && c.type !== 'notice');

                            return (
                              <div
                                key={book.id}
                                id={`subject-${book.id}`}
                                className={`rounded-2xl border ${highlightedSubject === book.id ? 'border-indigo-400 ring-4 ring-indigo-400/50 scale-[1.01] z-[60]' : 'border-white/40'} shadow-lg hover:shadow-xl transition-all duration-500 relative`}
                                style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', scrollMarginTop: `${topNavHeight - 20}px` }}
                              >
                                {/* Subject Header: Gradient with glassmorphism sheen */}
                                <button
                                  onClick={() => toggleSubject(book.id)}
                                  className={`sticky z-30 w-full px-5 py-4 bg-gradient-to-r ${gradient} text-white font-black text-center text-lg sm:text-xl flex items-center justify-between tracking-wide select-none uppercase relative overflow-hidden focus:outline-none transition-all duration-300 ${collapsedSubjects[book.id] ? 'rounded-2xl shadow-md' : 'rounded-t-2xl shadow-sm'}`}
                                  style={{ top: `${topNavHeight}px` }}
                                >
                                  {/* Glassmorphism sheen overlay */}
                                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm pointer-events-none" />
                                  {/* Decorative shimmer blobs */}
                                  <div className="absolute -top-4 -left-4 h-14 w-14 rounded-full bg-white/25 blur-md pointer-events-none" />
                                  <div className="absolute -bottom-4 -right-4 h-14 w-14 rounded-full bg-black/10 blur-md pointer-events-none" />
                                  <div className="absolute top-1 right-10 h-5 w-20 rounded-full bg-white/20 blur-sm pointer-events-none rotate-12" />
                                  <div className="relative z-10 flex-1 flex justify-center drop-shadow-sm pl-8">
                                    <span>{book.name}</span>
                                  </div>
                                  <div className="relative z-10 flex-shrink-0 transition-transform duration-300" style={{ transform: collapsedSubjects[book.id] ? 'rotate(0deg)' : 'rotate(-180deg)' }}>
                                    <FiChevronDown className="h-6 w-6" />
                                  </div>
                                </button>
                                <div
                                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                                    collapsedSubjects[book.id] ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                                  }`}
                                >
                                  <div className="overflow-hidden relative">

                                {/* Village Scenery Watermark — spans entire card */}
                                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-2xl opacity-[0.18]">
                                  <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
                                    {/* Sky gradient */}
                                    <defs>
                                      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#bae6fd" />
                                        <stop offset="100%" stopColor="#e0f2fe" />
                                      </linearGradient>
                                      <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4ade80" />
                                        <stop offset="100%" stopColor="#16a34a" />
                                      </linearGradient>
                                      <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#38bdf8" />
                                        <stop offset="100%" stopColor="#0ea5e9" />
                                      </linearGradient>
                                    </defs>
                                    {/* Full height Sky */}
                                    <rect x="0" y="0" width="400" height="400" fill="url(#skyGrad)" />
                                    
                                    {/* Sun and Clouds Group (positioned in the upper sky) */}
                                    <g transform="translate(0, 60)">
                                      {/* Sun */}
                                      <circle cx="340" cy="18" r="15" fill="#fde68a" />
                                      <circle cx="340" cy="18" r="11" fill="#fbbf24" />
                                      {/* Sun rays */}
                                      {[0,45,90,135,180,225,270,315].map((angle, i) => (
                                        <line key={i} x1={340 + 17 * Math.cos(angle * Math.PI / 180)} y1={18 + 17 * Math.sin(angle * Math.PI / 180)} x2={340 + 22 * Math.cos(angle * Math.PI / 180)} y2={18 + 22 * Math.sin(angle * Math.PI / 180)} stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                                      ))}
                                      {/* Birds */}
                                      <path d="M60 15 Q63 12 66 15" stroke="#64748b" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                                      <path d="M70 10 Q73 7 76 10" stroke="#64748b" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                                      <path d="M80 18 Q83 15 86 18" stroke="#64748b" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                                      {/* Clouds */}
                                      <ellipse cx="100" cy="22" rx="24" ry="10" fill="white" opacity="0.8" />
                                      <ellipse cx="118" cy="18" rx="16" ry="10" fill="white" opacity="0.8" />
                                      <ellipse cx="85" cy="20" rx="14" ry="8" fill="white" opacity="0.8" />
                                      <ellipse cx="250" cy="28" rx="22" ry="9" fill="white" opacity="0.7" />
                                      <ellipse cx="266" cy="24" rx="14" ry="10" fill="white" opacity="0.7" />
                                      <ellipse cx="236" cy="26" rx="12" ry="8" fill="white" opacity="0.7" />
                                    </g>

                                    {/* Village Ground Group (pushed to the bottom) */}
                                    <g transform="translate(0, 300)">
                                      {/* Far hill */}
                                      <ellipse cx="200" cy="90" rx="250" ry="60" fill="#86efac" />
                                      {/* Near hill left */}
                                      <ellipse cx="40" cy="110" rx="110" ry="55" fill="#4ade80" />
                                      {/* Near hill right */}
                                      <ellipse cx="370" cy="110" rx="110" ry="50" fill="#4ade80" />
                                      {/* River */}
                                      <path d="M120 100 Q160 78 200 82 Q240 86 280 100" fill="url(#waterGrad)" stroke="#7dd3fc" strokeWidth="1" />
                                      <ellipse cx="200" cy="91" rx="80" ry="12" fill="#7dd3fc" opacity="0.6" />
                                      {/* House */}
                                      <rect x="175" y="60" width="28" height="24" fill="#fca5a5" rx="1" />
                                      <polygon points="175,60 203,60 189,47" fill="#ef4444" />
                                      <rect x="186" y="72" width="6" height="12" fill="#7c3aed" rx="1" />
                                      <rect x="177" y="65" width="5" height="5" fill="#bfdbfe" rx="0.5" />
                                      <rect x="195" y="65" width="5" height="5" fill="#bfdbfe" rx="0.5" />
                                      {/* Chimney */}
                                      <rect x="192" y="44" width="4" height="8" fill="#d1d5db" rx="0.5" />
                                      {/* Tree left 1 */}
                                      <rect x="140" y="72" width="3" height="18" fill="#92400e" />
                                      <ellipse cx="141.5" cy="68" rx="10" ry="12" fill="#16a34a" />
                                      {/* Tree left 2 */}
                                      <rect x="155" y="75" width="2.5" height="14" fill="#92400e" />
                                      <ellipse cx="156" cy="71" rx="8" ry="10" fill="#15803d" />
                                      {/* Tree right 1 */}
                                      <rect x="228" y="72" width="3" height="18" fill="#92400e" />
                                      <ellipse cx="229.5" cy="67" rx="10" ry="13" fill="#16a34a" />
                                      {/* Tree right 2 */}
                                      <rect x="244" y="76" width="2.5" height="13" fill="#92400e" />
                                      <ellipse cx="245" cy="72" rx="8" ry="10" fill="#15803d" />
                                      {/* Fence left */}
                                      {[148,153,158,163,168].map((x, i) => (
                                        <rect key={i} x={x} y="82" width="2" height="8" fill="#d1d5db" rx="0.5" />
                                      ))}
                                      <rect x="148" y="84" width="22" height="1.5" fill="#d1d5db" rx="0.5" />
                                      {/* Fence right */}
                                      {[210,215,220,225,230].map((x, i) => (
                                        <rect key={i} x={x} y="82" width="2" height="8" fill="#d1d5db" rx="0.5" />
                                      ))}
                                      <rect x="210" y="84" width="22" height="1.5" fill="#d1d5db" rx="0.5" />
                                      {/* Path to house */}
                                      <path d="M189 84 Q189 95 189 100 Q191 95 191 84" fill="#fef08a" opacity="0.8" />
                                    </g>
                                  </svg>
                                </div>

                                {/* Content Body — glassmorphism frosted layer without blurring the watermark */}
                                <div className="p-5 sm:p-6 relative" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 100%)' }}>
                                  <div className="flex flex-col gap-3.5">
                                    {filledCategories.map((cat: any) => {
                                      const lines = cat.value.split("\n").filter((line: string) => line.trim() !== "");
                                      const isArabic = lines.some((line: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line));
                                      const dir = isArabic ? "rtl" : "ltr";

                                      return (
                                        <div key={cat.type} className="w-full" dir={dir}>
                                          <div className="flex flex-col gap-0.5 w-full pl-2 text-gray-800 dark:text-gray-200">
                                            {/<[a-z][\s\S]*>/i.test(cat.value) ? (
                                              <div className="relative flex items-start gap-1.5">
                                                {cat.type !== "general" && (() => {
                                                  const colors = getColorClasses(cat.color || "emerald");
                                                  return (
                                                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs sm:text-sm font-bold ${colors.text} bg-slate-50 border ${colors.border} select-none mt-1 shrink-0`}>
                                                      <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                                                      {cat.label.split(' ')[0]}
                                                    </span>
                                                  );
                                                })()}
                                                <div 
                                                  className="diary-html-content prose prose-sm max-w-none flex-1 min-w-0" 
                                                  dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(cat.value) }} 
                                                />
                                              </div>
                                            ) : (
                                              lines.map((line: string, lIdx: number) => {
                                                const colors = getColorClasses(cat.color || "emerald");
                                                const badge = lIdx === 0 && cat.type !== "general" ? (
                                                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs sm:text-sm font-bold ${colors.text} bg-slate-50 dark:bg-slate-800/50 border ${colors.border} dark:border-slate-700 select-none mr-1.5 flex-shrink-0 mt-0.5`}>
                                                    <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                                                    {cat.label.split(' ')[0]}
                                                  </span>
                                                ) : undefined;
                                                return renderDiaryLine(line, lIdx, lines.length, isArabic, badge);
                                              })
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    </>
                  )}
                </div>

                {/* Print Layout: Show ALL subjects with content as list sections (Print ONLY or List View) */}
                {(!isNotPublishedYet || viewMode === 'list') && (
                  <div className={`${viewMode === 'list' ? 'flex flex-col gap-6 animate-fade-in pb-[70vh]' : 'hidden print:flex print:flex-col print:gap-6'}`}>
                    {activeClassBooks.map((book) => {
                      const log = diary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                      if (log.isHidden === true) return null;
                      const categories = logTypes.map((t: any) => ({
                        type: t.id,
                        label: t.label,
                        value: log[t.id] || "",
                        color: t.color || "emerald"
                      }));
                      const filledCategories = categories.filter((c: any) => c.value && c.type !== 'notice');
                      if (filledCategories.length === 0) return null;

                      return (
                        <div key={book.id} id={`subject-${book.id}`} className={`border-b pb-4 last:border-0 break-inside-avoid relative ${highlightedSubject === book.id ? 'bg-indigo-50/50 -mx-4 px-4 py-2 rounded-xl transition-all z-[60]' : 'transition-all'}`}>
                          <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-3 flex items-center gap-2 mt-2">
                            <FiBook className="text-gray-600 dark:text-gray-400" />
                            <span>{book.name}</span>
                          </h4>
                          <div className="flex flex-col gap-3 pl-4">
                            {filledCategories.map((cat: any) => {
                              const lines = cat.value.split("\n").filter((line: string) => line.trim() !== "");
                              const isArabic = lines.some((line: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line));
                              const dir = isArabic ? "rtl" : "ltr";
                              const colors = getColorClasses(cat.color);

                              return (
                                <div key={cat.type} className="w-full" dir={dir}>
                                  {/* Content lines */}
                                  <div className="flex flex-col gap-1 w-full">
                                    {/<[a-z][\s\S]*>/i.test(cat.value) ? (
                                      <div className="relative flex items-start gap-1.5">
                                        {cat.type !== "general" && (
                                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs sm:text-sm font-bold ${colors.text} bg-slate-50 border ${colors.border} select-none mt-1 shrink-0`}>
                                            <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                                            {cat.label.split(' ')[0]}
                                          </span>
                                        )}
                                        <div 
                                          className="diary-html-content prose prose-sm max-w-none flex-1 min-w-0" 
                                          dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(cat.value) }} 
                                        />
                                      </div>
                                    ) : (
                                      lines.map((line: string, lIdx: number) => {
                                        const badge = lIdx === 0 && cat.type !== "general" ? (
                                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs sm:text-sm font-bold ${colors.text} bg-slate-50 border ${colors.border} select-none mr-1.5 flex-shrink-0 mt-0.5`}>
                                            <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                                            {cat.label.split(' ')[0]}
                                          </span>
                                        ) : undefined;
                                        return renderDiaryLine(line, lIdx, lines.length, isArabic, badge);
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Table View Layout */}
                {viewMode === 'table' && !isNotPublishedYet && (
                  <div className="overflow-x-auto pb-[70vh] animate-fade-in custom-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed border border-slate-300 dark:border-slate-700">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700">
                          <th className="p-1 text-base font-black text-slate-800 dark:text-slate-200 w-[80px] sm:w-[120px] md:w-[160px] text-center border border-slate-300 dark:border-slate-700">বিষয়</th>
                          <th className="p-1 text-base font-black text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-center">বিস্তারিত তথ্য</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const tableBooksWithData = activeClassBooks.filter((book: any) => {
                            const log = diary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                            if (log.isHidden === true) return false;
                            return Object.keys(log).some(k => k !== 'notice' && k !== 'isHidden' && log[k]);
                          });

                          if (tableBooksWithData.length === 0) {
                            return (
                              <tr>
                                <td colSpan={2} className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-gray-400 dark:text-slate-500 italic text-sm">
                                  কোন তথ্য নেই
                                </td>
                              </tr>
                            );
                          }

                          return activeClassBooks.map((book: any) => {
                            const log = diary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                            if (log.isHidden === true) return null;
                            const categories = logTypes.map((t: any) => ({
                              type: t.id,
                              label: t.label,
                              value: log[t.id] || "",
                              color: t.color || "emerald"
                            }));
                            const filledCategories = categories.filter((c: any) => c.value && c.type !== 'notice');
                            if (filledCategories.length === 0) return null;

                          return (
                            <tr key={book.id} id={`subject-${book.id}`} className={`border-b border-slate-300 dark:border-slate-700 transition-all ${highlightedSubject === book.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}`}>
                              <td className="p-1 align-middle font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 w-[80px] sm:w-[120px] md:w-[160px] text-center bg-white dark:bg-slate-900 break-words whitespace-normal">
                                <div className="flex items-center justify-center gap-2">
                                  <span>{book.name}</span>
                                </div>
                              </td>
                              <td className="p-1 align-top border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 break-words whitespace-normal">
                                <div className="flex flex-col gap-3">
                                  {filledCategories.map((cat: any) => {
                                    const lines = cat.value.split("\n").filter((line: string) => line.trim() !== "");
                                    const isArabic = lines.some((line: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line));
                                    const dir = isArabic ? "rtl" : "ltr";
                                    const colors = getColorClasses(cat.color);

                                    return (
                                      <div key={cat.type} className="w-full" dir={dir}>
                                        {cat.type !== "general" && (
                                          <div className="flex items-center gap-2.5 w-full select-none mb-1.5">
                                            <div className="flex-shrink-0">
                                              <span className={`inline-flex items-center gap-1 text-sm font-bold ${colors.text} select-none`}>
                                                <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                                                {cat.label}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                        <div className="flex flex-col gap-1 w-full text-sm">
                                          {/<[a-z][\s\S]*>/i.test(cat.value) ? (
                                            <div 
                                              className="diary-html-content prose prose-sm max-w-none bg-white dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50" 
                                              dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(cat.value) }} 
                                            />
                                          ) : (
                                            lines.map((line: string, lIdx: number) => {
                                              const isBangla = /[\u0980-\u09FF]/.test(line);
                                              return (
                                                <div key={lIdx} className={`leading-relaxed text-slate-700 dark:text-slate-300 px-1 py-0 -mx-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isBangla ? 'font-medium' : ''} ${isArabic ? 'text-right font-arabic text-base' : 'text-justify'}`}>
                                                  {isArabic ? line : <span className="font-bold text-slate-400 mr-1.5 inline-block w-4 text-right select-none">{toBanglaNumber(lIdx + 1)}.</span>}{!isArabic && line}
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div> {/* End Diary Card Head */}
          </div> {/* End Center Column */}

          {/* ── Right Sidebar: Subject List (Desktop Only) ── */}
          <div className="hidden lg:flex w-64 xl:w-72 flex-col gap-4 sticky top-4 shrink-0 z-[40]">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <FiList className="h-4 w-4" />
                </div>
                <h3 className="font-black text-slate-800 dark:text-slate-200">বিষয় তালিকা</h3>
              </div>

              {/* View Mode Toggle */}
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ভিউ মোড</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    কার্ড
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    লিস্ট
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    টেবিল
                  </button>
                </div>
              </div>
              <div className="p-3 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar flex-1">
                {activeClassBooks.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 font-medium text-sm">কোন বিষয় পাওয়া যায়নি</div>
                ) : (
                  activeClassBooks.map((book: any) => {
                    const log = diary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                    if (log.isHidden === true) return null;
                    const hasData = Object.keys(log).some(k => k !== 'isHidden' && log[k]);
                    if (!hasData) return null;

                    return (
                      <button
                        key={book.id}
                        onClick={() => scrollToSubject(book.id)}
                        className="group w-full text-left px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-center gap-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          <FiBook className="h-4 w-4" />
                        </div>
                        <span className="truncate group-hover:text-indigo-700">{book.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Mobile Subject Sidebar Drawer (Rendered at root to escape CSS stacking context) */}
      {activeTabClass && (
        <>
          {/* Subject Sidebar Overlay */}
          {isSubjectMenuOpen && (
            <div
              className="fixed inset-0 bg-slate-900/20 z-[80] backdrop-blur-sm transition-opacity animate-fade-in lg:hidden"
              onClick={() => setIsSubjectMenuOpen(false)}
            />
          )}

          {/* Subject Sidebar Drawer */}
          <div className={`fixed top-0 right-0 h-full w-72 sm:w-80 bg-white dark:bg-slate-900 shadow-2xl z-[90] transform transition-transform duration-300 ease-in-out flex flex-col lg:hidden ${isSubjectMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FiList className="text-emerald-500 dark:text-emerald-400" />
                বিষয় তালিকা
              </h4>
              <button
                onClick={() => setIsSubjectMenuOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ভিউ মোড</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  কার্ড
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  লিস্ট
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  টেবিল
                </button>
              </div>
            </div>

            {/* Class Selector Dropdown */}
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">শ্রেণী পরিবর্তন</span>
              <select
                value={activeTabClass || ''}
                onChange={(e) => {
                  setActiveTabClass(e.target.value);
                  setIsSubjectMenuOpen(false);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="" disabled>শ্রেণী নির্বাচন করুন</option>
                {classesList.map((c: any) => (
                  <option key={c.className} value={c.className}>{c.className}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto py-2 divide-y divide-slate-50">
              {activeClassBooks.map((book: any) => {
                const log = diary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                if (log.isHidden === true) return null;
                const hasData = Object.keys(log).some(k => k !== 'isHidden' && log[k]);
                if (!hasData) return null;

                return (
                  <button
                    key={book.id}
                    onClick={() => scrollToSubject(book.id)}
                    className="group w-full text-left px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors flex items-center gap-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      <FiBook className="h-4 w-4" />
                    </div>
                    <span className="truncate">{book.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

