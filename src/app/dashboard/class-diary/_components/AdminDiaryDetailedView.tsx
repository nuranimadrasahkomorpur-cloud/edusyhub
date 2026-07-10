"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Book as FiBook,
  Send as FiSend,
  Plus as FiPlus,
  Trash2 as FiTrash2,
  Edit2 as FiEdit2,
  Calendar as FiCalendar,
  ChevronLeft as FiChevronLeft,
  ChevronRight as FiChevronRight,
  User as FiUser,
  RefreshCw as FiRefreshCw,
  BookOpen as FiBookOpen,
  Sunrise as FiSunrise,
  AlertCircle as FiAlertCircle,
  CheckCircle as FiCheckCircle,
  X as FiX,
  Menu as FiMenu,
  List as FiList,
  Check as FiCheck,
  MoreVertical as FiMoreVertical,
  ArrowLeft as FiArrowLeft,
  Eye as FiEye,
  EyeOff as FiEyeOff
} from "lucide-react";
import ModalLayout from "@/components/Modal";
import CheckupModal from "./CheckupModal";
import { useSession } from '@/components/SessionProvider';

// --- Polyfills for Easy-Q dependencies ---
const toast = {
  success: (msg: string) => alert(msg),
  error: (msg: string) => alert(msg),
  info: (msg: string) => alert(msg),
  warning: (msg: string) => alert(msg),
  loading: (msg: string) => { alert(msg); return 1; },
  dismiss: (id?: any) => {},
};
const updateMe = (data: any) => data;
const authApi = { endpoints: { getMe: { initiate: () => ({ type: 'GET_ME' }) } } };
const toBanglaNumber = (num: any) => num?.toString() || '';
const processHtmlForNumbering = (html: any, useBulletPoint?: boolean) => html;

const Editor = ({ value, onChange, placeholder }: any) => (
    <textarea 
        value={value} 
        onChange={e => onChange?.(e.target.value)} 
        placeholder={placeholder}
        className="w-full min-h-[150px] p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
    />
);

const InsufficientBalanceModal = ({ isOpen, onClose }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-xl">
                <h2 className="text-xl font-bold mb-4">Insufficient Balance</h2>
                <button onClick={onClose} className="px-4 py-2 bg-primary text-white rounded">Close</button>
            </div>
        </div>
    );
};
// ----------------------------------------

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

const getWeekRange = (dateStr: string, startDay: "Saturday" | "Sunday") => {
  const d = new Date(dateStr);
  const day = d.getDay();
  let offset = 0;
  if (startDay === "Saturday") {
    offset = day === 6 ? 0 : -(day + 1);
  } else {
    offset = -day;
  }
  const start = new Date(d);
  start.setDate(d.getDate() + offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0]
  };
};

const formatShortBanglaDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = toBanglaNumber(d.getDate());
  const month = banglaMonths[d.getMonth()];
  const year = toBanglaNumber(d.getFullYear());
  return `${day} ${month} ${year}`;
};

const getTypeBadge = (type: "cw" | "hw" | "test" | "notice") => {
  switch (type) {
    case "cw":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>CW</span>
        </span>
      );
    case "hw":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          <span>HW</span>
        </span>
      );
    case "test":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span>টেস্ট</span>
        </span>
      );
    case "notice":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span>নোটিশ</span>
        </span>
      );
    default:
      return null;
  }
};

const getBorderColorClass = (type: "cw" | "hw" | "test" | "notice") => {
  switch (type) {
    case "cw":
      return "border-emerald-300";
    case "hw":
      return "border-indigo-300";
    case "test":
      return "border-amber-300";
    case "notice":
      return "border-rose-300";
    default:
      return "border-gray-300";
  }
};

const getLineColorClass = (type: "cw" | "hw" | "test" | "notice") => {
  switch (type) {
    case "cw":
      return "bg-emerald-200";
    case "hw":
      return "bg-indigo-200";
    case "test":
      return "bg-amber-200";
    case "notice":
      return "bg-rose-200";
    default:
      return "bg-gray-200";
  }
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
  badge?: React.ReactNode,
  onDelete?: () => void
) => {
  const isBangla = /[\u0980-\u09FF]/.test(line);
  const isArabicLine = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line);
  const alreadyHasNumber = /^[0-9০-৯٠-٩]+[.)]\s/.test(line.trim());

  let numberStr = "";
  if (!alreadyHasNumber) {
    const num = index + 1;
    if (isBangla) {
      numberStr = toBanglaNumber(num) + ". ";
    } else if (isArabicLine) {
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
      className={`group/line flex items-start justify-between gap-3 py-1 px-2 -mx-2 hover:bg-slate-50/50 rounded-lg transition-all w-full ${alignmentClass}`}
    >
      <div className="flex items-start gap-1.5 flex-1 min-w-0">
        {badge}
        {numberStr && (
          <span className="text-gray-405 font-bold select-none flex-shrink-0 text-sm">
            {numberStr}
          </span>
        )}
        <span 
          className="text-gray-800 text-sm font-semibold leading-relaxed whitespace-pre-wrap flex-1 break-words jodit-content"
          dangerouslySetInnerHTML={{ __html: line }}
        />
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover/line:opacity-100 text-gray-400 hover:text-rose-600 p-1 rounded transition-all print:hidden flex-shrink-0"
          title="মুছে ফেলুন"
        >
          <FiTrash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

interface AdminDiaryDetailedViewProps {
  diary: any;
  instituteName: string;
  initialDate: string;
  onBack: () => void;
  onSave: (entries: any, logTypes?: any, targetClass?: string | string[], targetDates?: string[], updatedConfig?: any) => Promise<void>;
  headerActions?: React.ReactNode;
  diaryMode: "daily" | "weekly";
}

export default function AdminDiaryDetailedView({
  diary,
  instituteName,
  initialDate,
  onBack,
  onSave,
  headerActions,
  diaryMode,
}: AdminDiaryDetailedViewProps) {
  const { user } = useSession();
  const token = "";
  const dispatch = (action: any) => {};
  const authApi = { util: { updateQueryData: (a: any, b: any, c: any) => ({}) } };
  const updateMe = (data: any) => ({});
  const actualTokens = (user as any)?.credit || 0;
  const aiTokens = actualTokens;
  
  const [currentDiary, setCurrentDiary] = useState(diary);
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(0);


  // Tabs config
  const allowedClasses: string[] = useMemo(() => diary.config?.map((c: any) => c.className) || [], [diary.config]);
  const [activeTabClass, setActiveTabClass] = useState(allowedClasses[0] || "");

  // Modal and composer states
  const logTypes = useMemo(() => {
    const baseTypes = currentDiary.logTypes || [
      { id: "cw", label: "CW (আজকের পড়া)", color: "emerald" },
      { id: "hw", label: "HW (বাড়ির কাজ)", color: "indigo" },
      { id: "test", label: "টেস্ট (Class Test)", color: "amber" },
      { id: "notice", label: "নোটিশ (Notice)", color: "rose" }
    ];
    if (!baseTypes.some((t: any) => t.id === "general")) {
      return [{ id: "general", label: "সাধারণ", color: "slate" }, ...baseTypes];
    }
    return baseTypes;
  }, [currentDiary.logTypes]);

  const notices = useMemo(() => {
    const list: any[] = [];
    if (!currentDiary.entries || !selectedDate) return list;
    
    // 1. Class notices (local)
    const classEntries = currentDiary.entries[selectedDate]?.[activeTabClass] || {};
    Object.keys(classEntries).forEach((bookId) => {
      const log = classEntries[bookId];
      if (log?.notice) {
        const bookName = bookId === 'CLASS_NOTICE' ? 'সাধারণ নোটিশ' : (diary.config?.find((c: any) => c.className === activeTabClass)?.books?.find((b: any) => b.id === bookId)?.name || "শ্রেণী নোটিশ");
        list.push({
          bookId,
          bookName,
          text: log.notice,
          isGlobal: false,
        });
      }
    });

    // 2. Global notices
    const globalEntries = currentDiary.entries[selectedDate]?.['GLOBAL'] || {};
    Object.keys(globalEntries).forEach((bookId) => {
      const log = globalEntries[bookId];
      if (log?.notice) {
        list.push({
          bookId,
          bookName: "সকল শ্রেণীর নোটিশ",
          text: log.notice,
          isGlobal: true,
        });
      }
    });
    return list;
  }, [currentDiary.entries, selectedDate, activeTabClass, diary.config]);

  const [activeInputBookId, setActiveInputBookId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [inputLogType, setInputLogType] = useState<string>("general");
  const [useBulletPoint, setUseBulletPoint] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<{ type: string; index: number; targetClass?: string; bookId?: string; isGlobal?: boolean } | null>(null);
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false);
  const [highlightedSubject, setHighlightedSubject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'table'>('table');
  const [isModalClassMenuOpen, setIsModalClassMenuOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [selectedNoticeClasses, setSelectedNoticeClasses] = useState<string[]>([]);
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(true);
  const [isCheckupModalOpen, setIsCheckupModalOpen] = useState(false);
  const [returnToCheckupAfterSave, setReturnToCheckupAfterSave] = useState(false);
  const [subjectToToggleOff, setSubjectToToggleOff] = useState<any | null>(null);
  const [isAiModeActive, setIsAiModeActive] = useState(false);
  const [aiPreviewPlan, setAiPreviewPlan] = useState<any>(null);
  const [aiRepromptText, setAiRepromptText] = useState("");
  const [isAiRegenerating, setIsAiRegenerating] = useState(false);
  const [lastAiPayload, setLastAiPayload] = useState<any>(null);
  const [aiSelectedTaskTypes, setAiSelectedTaskTypes] = useState<string[]>([]);
  const [aiEndDate, setAiEndDate] = useState<string>("");
  const [isAiToolsModalOpen, setIsAiToolsModalOpen] = useState(false);
  const [aiSelectedTools, setAiSelectedTools] = useState<string[]>([]);

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

  useEffect(() => {
    if (diaryMode === "weekly") {
      const range = getWeekRange(selectedDate, currentDiary.weekStartDay || "Saturday");
      if (selectedDate !== range.start) {
        setSelectedDate(range.start);
      }
    }
  }, [diaryMode, selectedDate, currentDiary.weekStartDay]);

  // Scroll ref for chat body
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topNavRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeInputBookId) {
      setTimeout(scrollToBottom, 100);
    }
  }, [currentDiary.entries, activeInputBookId]);

  useEffect(() => {
    if (activeInputBookId && inputLogType) {
      const el = document.getElementById(`pill-${inputLogType}`);
      if (el) {
        // use setTimeout to ensure it runs after render
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }, 100);
      }
    }
  }, [inputLogType, activeInputBookId, logTypes.length]);

  // Custom log type modal state
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("emerald");
  
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

  // --- Custom Calendar State ---
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date(selectedDate));

  const openCalendar = () => {
    setCalendarMonthDate(new Date(selectedDate));
    setIsCalendarOpen(true);
  };

  const hasContentOnDate = (dateStr: string) => {
    if (!currentDiary.entries || !currentDiary.entries[dateStr] || !currentDiary.entries[dateStr][activeTabClass]) return false;
    const classData = currentDiary.entries[dateStr][activeTabClass];
    for (const book of activeClassBooks) {
      if (book.isPermanentlyHidden === true) continue;
      const log = classData[book.id];
      if (log && Object.keys(log).some(k => typeof log[k] === "string" && log[k].trim() !== "")) return true;
    }
    return false;
  };

  const areAllSubjectsDoneOnDate = (dateStr: string) => {
    if (!currentDiary.entries || !currentDiary.entries[dateStr] || !currentDiary.entries[dateStr][activeTabClass]) return false;
    const visibleBooks = activeClassBooks.filter((book: any) => book.isPermanentlyHidden !== true);
    if (!visibleBooks || visibleBooks.length === 0) return false;
    const classData = currentDiary.entries[dateStr][activeTabClass];
    for (const book of visibleBooks) {
      const log = classData[book.id];
      if (!log || !Object.keys(log).some(k => typeof log[k] === "string" && log[k].trim() !== "")) {
        return false;
      }
    }
    return true;
  };

  const shiftCalendarMonth = (months: number) => {
    const d = new Date(calendarMonthDate);
    d.setMonth(d.getMonth() + months);
    setCalendarMonthDate(d);
  };

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

  // Lock body scroll when any modal/drawer is open
  useEffect(() => {
    if (activeInputBookId || isSubjectMenuOpen || isCalendarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activeInputBookId, isSubjectMenuOpen, isCalendarOpen]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch latest diary data
  const refreshDiary = async (showToast = false) => {
    if (!diary?.id) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/class-diary?id=${diary.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data && json.data.length > 0 && isMountedRef.current) {
          setCurrentDiary(json.data[0]);
          if (showToast) {
            toast.success("সর্বশেষ তথ্য লোড করা হয়েছে!");
          }
        }
      }
    } catch (err) {
      if (showToast) {
        console.error(err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  // Poll for updates every 15 seconds to keep synced
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDiary(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Filter books of the active tab className
  const activeClassBooks = useMemo(() => {
    return (currentDiary.config as Array<{ className: string; books: any[] }>)?.find(
      (c) => c.className === activeTabClass
    )?.books || [];
  }, [currentDiary, activeTabClass]);

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

  // Navigate date
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    const amount = diaryMode === "weekly" ? days * 7 : days;
    d.setDate(d.getDate() + amount);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleToggleInputBar = (bookId: string) => {
    if (activeInputBookId === bookId) {
      setActiveInputBookId(null);
      setInputText("");
      if (returnToCheckupAfterSave) {
        setIsCheckupModalOpen(true);
        setReturnToCheckupAfterSave(false);
      }
    } else {
      setActiveInputBookId(bookId);
      setInputText("");
    }
  };

  const saveDiaryEntries = async (updatedEntries: any, updatedLogTypes?: any, targetClass?: string | string[], targetDates?: string[], updatedConfig?: any) => {
    setIsSaving(true);
    try {
      await onSave(updatedEntries, updatedLogTypes, targetClass, targetDates, updatedConfig);
      const updatedDiary = { ...currentDiary, entries: updatedEntries };
      if (updatedLogTypes) updatedDiary.logTypes = updatedLogTypes;
      if (updatedConfig) updatedDiary.config = updatedConfig;
      setCurrentDiary(updatedDiary);
      return true;
    } catch (err: any) {
      toast.error(err.message || "সংরক্ষণ করা যায়নি");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomType = async () => {
    if (!newTypeLabel.trim()) return;
    const newType = {
      id: `custom_${Date.now()}`,
      label: newTypeLabel.trim(),
      color: newTypeColor,
    };
    const updatedLogTypes = [...logTypes, newType];
    const success = await saveDiaryEntries(currentDiary.entries, updatedLogTypes);
    if (success) {
      setInputLogType(newType.id);
      setIsAddTypeModalOpen(false);
      setNewTypeLabel("");
    }
  };

  // Submit Notice from Modal
  const handleSaveNotice = async () => {
    if (!inputText || inputText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim() === '') return;
    if (!editingLine && selectedNoticeClasses.length === 0) return;

    const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));

    if (editingLine) {
      const targetClass = editingLine.targetClass || activeTabClass;
      const bookId = editingLine.bookId || 'CLASS_NOTICE';
      
      if (!currentEntries[selectedDate]) currentEntries[selectedDate] = {};
      if (!currentEntries[selectedDate][targetClass]) currentEntries[selectedDate][targetClass] = {};
      if (!currentEntries[selectedDate][targetClass][bookId]) currentEntries[selectedDate][targetClass][bookId] = {};
      
      const currentLog = currentEntries[selectedDate][targetClass][bookId];

      if (editingLine.index === -1) {
        currentEntries[selectedDate][targetClass][bookId] = {
          ...currentLog,
          [editingLine.type]: inputText.trim(),
        };
      } else {
        const lines = (currentLog[editingLine.type] || "").split("\n").filter((line: string) => line.trim() !== "");
        if (editingLine.index >= 0 && editingLine.index < lines.length) {
          lines[editingLine.index] = inputText.trim();
        }
        currentEntries[selectedDate][targetClass][bookId] = {
          ...currentLog,
          [editingLine.type]: lines.join("\n"),
        };
      }
    } else {
      const bookId = 'CLASS_NOTICE';
      for (const targetClass of selectedNoticeClasses) {
        if (!currentEntries[selectedDate]) currentEntries[selectedDate] = {};
        if (!currentEntries[selectedDate][targetClass]) currentEntries[selectedDate][targetClass] = {};
        if (!currentEntries[selectedDate][targetClass][bookId]) currentEntries[selectedDate][targetClass][bookId] = {};

        const currentLog = currentEntries[selectedDate][targetClass][bookId];
        const existingValue = (currentLog['notice'] || "").trim();
        const updatedValue = existingValue
          ? `${existingValue}\n${inputText.trim()}`
          : inputText.trim();
        currentEntries[selectedDate][targetClass][bookId] = {
          ...currentLog,
          ['notice']: updatedValue,
        };
      }
    }

    const targetClass = editingLine
      ? (editingLine.targetClass || activeTabClass)
      : selectedNoticeClasses;
    const targetDates = [selectedDate];
    const success = await saveDiaryEntries(currentEntries, undefined, targetClass, targetDates);
    if (success) {
      toast.success(editingLine ? "নোটিশ আপডেট করা হয়েছে!" : "নোটিশ যোগ করা হয়েছে!");
      setInputText("");
      setEditingLine(null);
      setIsNoticeModalOpen(false);
    }
  };

  // Submit via popup
  const handleSendWhatsAppLog = async (bookId: string) => {
    if (!inputText || inputText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim() === '') return;

    const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
    const targetClass = bookId === 'GLOBAL_NOTICE' ? 'GLOBAL' : activeTabClass;

    if (!currentEntries[selectedDate]) currentEntries[selectedDate] = {};
    if (!currentEntries[selectedDate][targetClass]) currentEntries[selectedDate][targetClass] = {};
    if (!currentEntries[selectedDate][targetClass][bookId]) currentEntries[selectedDate][targetClass][bookId] = {};

    const currentLog = currentEntries[selectedDate][targetClass][bookId];

    if (editingLine) {
      if (editingLine.index === -1) {
        currentEntries[selectedDate][targetClass][bookId] = {
          ...currentLog,
          [editingLine.type]: inputText.trim(),
        };
      } else {
        const lines = (currentLog[editingLine.type] || "").split("\n").filter((line: string) => line.trim() !== "");
        if (editingLine.index >= 0 && editingLine.index < lines.length) {
          lines[editingLine.index] = inputText.trim();
        }
        currentEntries[selectedDate][targetClass][bookId] = {
          ...currentLog,
          [editingLine.type]: lines.join("\n"),
        };
      }
    } else {
      const existingValue = (currentLog[inputLogType] || "").trim();
      const updatedValue = existingValue
        ? `${existingValue}\n${inputText.trim()}`
        : inputText.trim();
      currentEntries[selectedDate][targetClass][bookId] = {
        ...currentLog,
        [inputLogType]: updatedValue,
      };
    }

    const targetDates = [selectedDate];
    const success = await saveDiaryEntries(currentEntries, undefined, targetClass, targetDates);
    if (success) {
      toast.success(editingLine ? "পাঠ সফলভাবে আপডেট করা হয়েছে!" : "আজকের পাঠ সফলভাবে যোগ করা হয়েছে!");
      setInputText("");
      setEditingLine(null);
    }
  };

  const handleAiGenerate = async (bookId: string) => {
    if (!inputText || inputText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim() === '') return;
    const estimatedCost = Math.ceil(Math.max(10, Math.ceil(inputText.replace(/<[^>]*>?/gm, '').length / 2)) * 1.2);
    if (actualTokens < estimatedCost) {
      setRequiredCredits(estimatedCost);
      setIsBalanceModalOpen(true);
      return;
    }
    if (aiSelectedTaskTypes.length === 0) {
      toast.error("অন্তত একটি টাস্ক টাইপ নির্বাচন করুন!");
      return;
    }
    if (!aiEndDate) {
      toast.error("শেষ দিন নির্বাচন করুন!");
      return;
    }
    
    // Calculate valid dates
    const start = new Date(selectedDate);
    const end = new Date(aiEndDate);
    if (start > end) {
      toast.error("শেষ দিন শুরুর দিনের পরে হতে হবে!");
      return;
    }

    const validDates: string[] = [];
    let d = new Date(start);
    while (d <= end) {
      const dateStr = d.toISOString().split('T')[0];
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
      const isWeeklyHol = (currentDiary.weeklyHolidays || ["Friday"]).includes(dayName);
      const isHol = isDateInHoliday(dateStr, currentDiary.holidays || []) || isWeeklyHol;
      
      if (!isHol) {
        validDates.push(dateStr);
      }
      d.setDate(d.getDate() + 1);
    }

    if (validDates.length === 0) {
      toast.error("নির্বাচিত সীমার মধ্যে কোনো কার্যকরী দিন নেই (সব ছুটি)!");
      return;
    }

    const targetClass = activeTabClass;
    const className = diary.config?.find((c: any) => c.className === targetClass)?.className || targetClass;
    const subjectName = diary.config?.find((c: any) => c.className === targetClass)?.books?.find((b: any) => b.id === bookId)?.name || bookId;

    const selectedTypesData = logTypes.filter((t: any) => aiSelectedTaskTypes.includes(t.id));
    const content = inputText.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').trim();

    // Gather previous logs for revision context
    const previousLogs: Record<string, any> = {};
    const allDates = Object.keys(currentDiary.entries || {}).sort();
    for (const dStr of allDates) {
      if (new Date(dStr) < start) {
        const log = currentDiary.entries[dStr]?.[targetClass]?.[bookId];
        if (log && Object.keys(log).some(k => k !== 'notice' && k !== 'general' && log[k])) {
          previousLogs[dStr] = log;
        }
      }
    }

    const toastId = toast.loading("AI স্টাডি প্ল্যান তৈরি করছে...");

    try {
      const res = await fetch("/api/ai-study-plan", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          validDates,
          taskTypes: selectedTypesData,
          subjectName,
          className,
          content,
          previousLogs,
          selectedTools: aiSelectedTools
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(`অপর্যাপ্ত ব্যালেন্স! ${estimatedCost} ক্রেডিট প্রয়োজন।`);
        }
        throw new Error(data.error || "Generation failed");
      }

      // --- Sync Token from backend response ---
      if (data.user) {
        dispatch(updateMe({ credit: data.user.credit, usedCredit: data.user.usedCredit }));
        dispatch(
          authApi.util.updateQueryData("getUser", undefined, (draft: any) => {
            if (draft?.result) {
              draft.result.credit = data.user.credit;
              draft.result.usedCredit = data.user.usedCredit;
            }
          }) as any
        );
      }
      // -----------------------------

      const generatedPlan = data.plan;

      setAiPreviewPlan(generatedPlan);
      setLastAiPayload({
        validDates,
        targetClass,
        bookId,
        content,
        taskTypes: selectedTypesData,
        subjectName,
        className,
        previousLogs,
        selectedTools: aiSelectedTools
      });

      toast.dismiss(toastId);
      toast.success("প্ল্যান তৈরি হয়েছে, প্রিভিউ দেখুন।");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "AI Error");
    }
  };

  const handleRepromptAiPlan = async () => {
    if (!lastAiPayload || !aiPreviewPlan || !aiRepromptText.trim()) return;

    const estimatedCost = Math.ceil(Math.max(10, Math.ceil(aiRepromptText.length / 2)) * 1.2);
    if (actualTokens < estimatedCost) {
      setRequiredCredits(estimatedCost);
      setIsBalanceModalOpen(true);
      return;
    }

    setIsAiRegenerating(true);
    const toastId = toast.loading("AI আবার প্ল্যান তৈরি করছে...");

    try {
      const res = await fetch("/api/ai-study-plan", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...lastAiPayload,
          previousPlan: aiPreviewPlan,
          repromptInstruction: aiRepromptText
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(`অপর্যাপ্ত ব্যালেন্স! ${estimatedCost} ক্রেডিট প্রয়োজন।`);
        }
        throw new Error(data.error || "Regeneration failed");
      }

      // --- Sync Token from backend response ---
      if (data.user) {
        dispatch(updateMe({ credit: data.user.credit, usedCredit: data.user.usedCredit }));
        dispatch(
          authApi.util.updateQueryData("getUser", undefined, (draft: any) => {
            if (draft?.result) {
              draft.result.credit = data.user.credit;
              draft.result.usedCredit = data.user.usedCredit;
            }
          }) as any
        );
      }
      // -----------------------------

      setAiPreviewPlan(data.plan);
      setAiRepromptText("");
      toast.dismiss(toastId);
      toast.success("প্ল্যান আপডেট করা হয়েছে।");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "AI Error");
    } finally {
      setIsAiRegenerating(false);
    }
  };

  const handleApplyAiPlan = async () => {
    if (!aiPreviewPlan || !lastAiPayload) return;

    const toastId = toast.loading("প্ল্যান সেভ করা হচ্ছে...");
    try {
      const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
      const { validDates, targetClass, bookId } = lastAiPayload;

      validDates.forEach((dateStr: string) => {
        if (!currentEntries[dateStr]) currentEntries[dateStr] = {};
        if (!currentEntries[dateStr][targetClass]) currentEntries[dateStr][targetClass] = {};
        
        const existingLog = currentEntries[dateStr][targetClass][bookId] || { cw: "", hw: "", test: "", notice: "", general: "" };
        const dayPlan = aiPreviewPlan[dateStr];
        
        if (dayPlan) {
          Object.keys(dayPlan).forEach((type) => {
            if (dayPlan[type]) {
              const existingContent = existingLog[type] ? existingLog[type] + "<br>" : "";
              existingLog[type] = existingContent + dayPlan[type];
            }
          });
        }
        
        currentEntries[dateStr][targetClass][bookId] = existingLog;
      });

      const success = await saveDiaryEntries(currentEntries, undefined, targetClass, validDates);
      toast.dismiss(toastId);

      if (success) {
        toast.success("AI স্টাডি প্ল্যান সফলভাবে যোগ করা হয়েছে!");
        setAiPreviewPlan(null);
        setAiRepromptText("");
        setLastAiPayload(null);
        setIsAiModeActive(false);
        setAiSelectedTaskTypes([]);
        setAiEndDate("");
        setInputText("");
      } else {
        toast.error("প্ল্যান সেভ করতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("An error occurred while saving the plan.");
    }
  };

  // Delete line
  const handleDeleteLogLine = async (bookId: string, field: "cw" | "hw" | "test" | "notice", lineIndex: number) => {
    const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
    if (
      !currentEntries[selectedDate]?.[activeTabClass]?.[bookId]
    ) return;

    const currentLog = currentEntries[selectedDate][activeTabClass][bookId];
    const lines = (currentLog[field] || "").split("\n").filter((line: string) => line.trim() !== "");
    lines.splice(lineIndex, 1);
    const updatedValue = lines.join("\n");

    currentEntries[selectedDate][activeTabClass][bookId] = {
      ...currentLog,
      [field]: updatedValue,
    };

    const success = await saveDiaryEntries(currentEntries, undefined, activeTabClass, [selectedDate]);
    if (success) {
      toast.success("সফলভাবে মুছে ফেলা হয়েছে!");
    }
  };

  const handleEyeClick = (book: any) => {
    const log = currentDiary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
    const isTempHidden = !!log.isHidden;
    const isPermHidden = !!book.isPermanentlyHidden;
    
    if (isTempHidden || isPermHidden) {
      handleTurnOnSubject(book.id);
    } else {
      setSubjectToToggleOff(book);
    }
  };

  const handleTurnOnSubject = async (bookId: string) => {
    const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
    if (currentEntries[selectedDate]?.[activeTabClass]?.[bookId]) {
      currentEntries[selectedDate][activeTabClass][bookId].isHidden = false;
    }

    const updatedConfig = JSON.parse(JSON.stringify(currentDiary.config || []));
    const classConfig = updatedConfig.find((c: any) => c.className === activeTabClass);
    if (classConfig) {
      const book = classConfig.books?.find((b: any) => b.id === bookId);
      if (book) {
        book.isPermanentlyHidden = false;
      }
    }

    const success = await saveDiaryEntries(currentEntries, undefined, activeTabClass, [selectedDate], updatedConfig);
    if (success) {
      toast.success("বিষয়টি সক্রিয় করা হয়েছে!");
    }
  };

  const handleTurnOffSubject = async (bookId: string, type: "today" | "permanent") => {
    if (type === "today") {
      const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
      if (!currentEntries[selectedDate]) currentEntries[selectedDate] = {};
      if (!currentEntries[selectedDate][activeTabClass]) currentEntries[selectedDate][activeTabClass] = {};
      if (!currentEntries[selectedDate][activeTabClass][bookId]) currentEntries[selectedDate][activeTabClass][bookId] = {};
      currentEntries[selectedDate][activeTabClass][bookId].isHidden = true;

      const success = await saveDiaryEntries(currentEntries, undefined, activeTabClass, [selectedDate]);
      if (success) {
        toast.success("বিষয়টি আজকের জন্য অফ করা হয়েছে!");
      }
    } else if (type === "permanent") {
      const updatedConfig = JSON.parse(JSON.stringify(currentDiary.config || []));
      const classConfig = updatedConfig.find((c: any) => c.className === activeTabClass);
      if (classConfig) {
        const book = classConfig.books?.find((b: any) => b.id === bookId);
        if (book) {
          book.isPermanentlyHidden = true;
        }
      }

      const success = await saveDiaryEntries(currentDiary.entries, undefined, activeTabClass, [selectedDate], updatedConfig);
      if (success) {
        toast.success("বিষয়টি স্থায়ীভাবে অফ করা হয়েছে!");
      }
    }
  };

  // Go to previous subject or previous class
  const handlePrevSubject = () => {
    if (!activeInputBookId) return;

    const subjectIndex = activeClassBooks.findIndex((b: any) => b.id === activeInputBookId);
    
    if (subjectIndex > 0) {
      // Previous subject in current class
      setActiveInputBookId(activeClassBooks[subjectIndex - 1].id);
      setInputText("");
      setEditingLine(null);
    } else {
      // Previous class
      const classIndex = allowedClasses.indexOf(activeTabClass);
      if (classIndex > 0) {
        let prevClassFound = false;
        for (let i = classIndex - 1; i >= 0; i--) {
          const prevClass = allowedClasses[i];
          const prevClassBooks = (currentDiary.config as Array<{ className: string; books: any[] }>)?.find(
            (c) => c.className === prevClass
          )?.books || [];
          
          if (prevClassBooks.length > 0) {
            setActiveTabClass(prevClass);
            setActiveInputBookId(prevClassBooks[prevClassBooks.length - 1].id);
            setInputText("");
            setEditingLine(null);
            prevClassFound = true;
            break;
          }
        }
        if (!prevClassFound) {
          toast.info("এটি প্রথম বিষয়!");
        }
      } else {
        toast.info("এটি প্রথম বিষয়!");
      }
    }
  };

  // Go to next subject or next class
  const handleNextSubject = () => {
    if (!activeInputBookId) return;

    const subjectIndex = activeClassBooks.findIndex((b: any) => b.id === activeInputBookId);
    
    if (subjectIndex !== -1 && subjectIndex < activeClassBooks.length - 1) {
      // Next subject in current class
      setActiveInputBookId(activeClassBooks[subjectIndex + 1].id);
      setInputText("");
      setEditingLine(null);
    } else {
      // Next class
      const classIndex = allowedClasses.indexOf(activeTabClass);
      if (classIndex !== -1 && classIndex < allowedClasses.length - 1) {
        let nextClassFound = false;
        for (let i = classIndex + 1; i < allowedClasses.length; i++) {
          const nextClass = allowedClasses[i];
          const nextClassBooks = (currentDiary.config as Array<{ className: string; books: any[] }>)?.find(
            (c) => c.className === nextClass
          )?.books || [];
          
          if (nextClassBooks.length > 0) {
            setActiveTabClass(nextClass);
            setActiveInputBookId(nextClassBooks[0].id);
            setInputText("");
            setEditingLine(null);
            nextClassFound = true;
            break;
          }
        }
        if (!nextClassFound) {
          toast.info("সব শ্রেণীর কাজ শেষ হয়েছে!");
          setActiveInputBookId(null);
          if (returnToCheckupAfterSave) {
            setIsCheckupModalOpen(true);
            setReturnToCheckupAfterSave(false);
          }
        }
      } else {
        toast.info("সব শ্রেণীর কাজ শেষ হয়েছে!");
        setActiveInputBookId(null);
        if (returnToCheckupAfterSave) {
          setIsCheckupModalOpen(true);
          setReturnToCheckupAfterSave(false);
        }
      }
    }
  };

  // Color palettes for class cards (unused if skipping main card selection screen, but kept for fallback)
  const cardPalettes = [
    { bg: "from-indigo-500 to-violet-600", light: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", hover: "hover:border-indigo-300", num: "bg-indigo-100 text-indigo-700" },
    { bg: "from-emerald-500 to-teal-600", light: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", hover: "hover:border-emerald-300", num: "bg-emerald-100 text-emerald-700" },
    { bg: "from-rose-500 to-pink-600", light: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", hover: "hover:border-rose-300", num: "bg-rose-100 text-rose-700" },
    { bg: "from-amber-500 to-orange-500", light: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", hover: "hover:border-amber-300", num: "bg-amber-100 text-amber-700" },
    { bg: "from-sky-500 to-blue-600", light: "bg-sky-50", text: "text-sky-600", border: "border-sky-100", hover: "hover:border-sky-300", num: "bg-sky-100 text-sky-700" },
    { bg: "from-purple-500 to-fuchsia-600", light: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", hover: "hover:border-purple-300", num: "bg-purple-100 text-purple-700" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative pb-16 print:hidden">

      {/* ── Clean Header Band ────────────────────────────── */}
      <div className="bg-white dark:bg-[#0a1628] w-full shadow-sm border-b border-gray-200 dark:border-slate-800 mb-0 py-3 sm:py-4">
        <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-full flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Back Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex-shrink-0 flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="ফিরে যান"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-slate-100 leading-tight tracking-tight line-clamp-1">
              {diary.name}
            </h1>
          </div>

          {/* Admin Header Actions */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full lg:w-auto">
            <button
              onClick={() => setIsCheckupModalOpen(true)}
              className="flex h-[42px] sm:h-[46px] md:h-[50px] flex-shrink-0 w-auto items-center justify-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-4 sm:px-5 text-xs sm:text-sm md:text-base font-bold text-indigo-700 dark:text-indigo-400 shadow-sm transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50 active:scale-95"
              title="ডায়েরি চেকআপ"
            >
              <FiCheckCircle className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-indigo-600 flex-shrink-0" />
              <span>চেকআপ</span>
            </button>
            {headerActions}
          </div>

        </div>
      </div>

      {/* ── Dynamic Content Area ────────────────────────────── */}
      <div className="mx-auto max-w-[1400px] px-2 pb-4 pt-4 md:px-4 md:pb-8 md:pt-6 animate-fade-in relative z-10 flex flex-col lg:flex-row items-start justify-center gap-6">

        {/* ── Left Sidebar: Classes List (Desktop Only) ── */}
        <div className="hidden lg:flex w-72 flex-col gap-4 sticky top-4 shrink-0 z-[40]">
          <div className="bg-white dark:bg-[#0a1628] rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <FiBookOpen className="h-4 w-4" />
              </div>
              <h3 className="font-black text-slate-800 dark:text-slate-200">শ্রেণী সমূহ</h3>
            </div>
            <div className="p-3 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar flex-1">
              {allowedClasses.map((className: string) => {
                const classConfig = diary.config?.find((c: any) => c.className === className);
                const classBooks = classConfig?.books || [];
                const totalSubjects = classBooks.length;
                let addedSubjects = 0;
                classBooks.forEach((book: any) => {
                  const log = currentDiary.entries?.[selectedDate]?.[className]?.[book.id];
                  if (log && Object.keys(log).some(key => typeof log[key] === "string" && log[key].trim() !== "")) {
                    addedSubjects++;
                  }
                });
                const isActive = activeTabClass === className;
                return (
                  <button
                    key={className}
                    onClick={() => setActiveTabClass(className)}
                    className={`px-5 py-5 md:py-6 text-left font-bold rounded-2xl transition-all duration-200 ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{className}</span>
                      {addedSubjects === totalSubjects && totalSubjects > 0 ? (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 text-white shadow-sm">
                          <FiCheck className="h-3 w-3 stroke-[3]" />
                        </span>
                      ) : (
                        <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold shadow-sm transition-colors ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                        }`}>
                          {addedSubjects}/{totalSubjects}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Center Column: Main Diary ── */}
        <div className="flex-1 w-full max-w-3xl min-w-0">

          {/* Sticky Header Wrapper */}
          <div ref={topNavRef} className="sticky top-0 z-[50] bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pt-2 pb-3 mb-4 sm:mb-6 print:hidden -mx-2 px-2 flex flex-col gap-3">
            {/* ── Top Navigation Bar (Mobile Only) ────────────────────────────────────────────── */}
            <div className="flex flex-row items-center gap-1.5 w-full lg:hidden overflow-hidden">
              {/* Scrollable Class Tabs */}
              <div className="flex-1 overflow-x-auto flex items-center gap-2 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden class-tabs-container">
                {allowedClasses.map((className: string) => {
                  const isActive = activeTabClass === className;
                  return (
                    <button
                      key={className}
                      data-active={isActive}
                      onClick={(e) => {
                        setActiveTabClass(className);
                        const container = e.currentTarget.closest('.class-tabs-container');
                        if (container) {
                          const scrollLeft = e.currentTarget.offsetLeft - (container.clientWidth / 2) + (e.currentTarget.clientWidth / 2);
                          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                        }
                      }}
                      className={`flex items-center gap-2 flex-shrink-0 rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-black shadow-sm border transition-all active:scale-95 ${
                        isActive
                          ? "bg-white dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-400 shadow-md ring-1 ring-indigo-100 dark:ring-indigo-900/50"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <div className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-colors ${
                        isActive ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                      }`}>
                        <FiBook className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <span>{className}</span>
                    </button>
                  );
                })}
              </div>

              {/* Hamburger Menu for Subjects */}
              <div className="flex-shrink-0 pl-1">
                <button
                  onClick={() => setIsSubjectMenuOpen(!isSubjectMenuOpen)}
                  className={`flex h-10 w-10 sm:h-[42px] sm:w-[42px] items-center justify-center bg-white dark:bg-slate-800 border rounded-full shadow-sm transition-all ${isSubjectMenuOpen ? 'border-indigo-400 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  title="বিষয় তালিকা"
                >
                  {isSubjectMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Date Selector Navigation Bar */}
            <div className="flex flex-col bg-slate-100/50 dark:bg-slate-800/50 rounded-[24px] p-3 shadow-inner border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between w-full gap-3">
                {/* Prev Button */}
                <button
                  onClick={() => shiftDate(-1)}
                  className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-100 dark:hover:border-indigo-800 active:scale-90"
                  title={diaryMode === "weekly" ? "পূর্ববর্তী সপ্তাহ" : "পূর্ববর্তী দিন"}
                >
                  <FiChevronLeft className="h-6 w-6" />
                </button>

                {/* Center Date & Refresh Capsule */}
                <div className="relative flex-1 flex items-center justify-center gap-1 sm:gap-2 bg-white dark:bg-slate-800 h-12 px-2 sm:px-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-md mx-auto min-w-0">
                  <button
                    onClick={openCalendar}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 h-full text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors active:scale-98 min-w-0"
                  >
                    <FiCalendar className="h-4.5 w-4.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm sm:text-base font-black tracking-tight truncate">
                      {diaryMode === "weekly" ? (
                        (() => {
                          const range = getWeekRange(selectedDate, currentDiary.weekStartDay || "Saturday");
                          return `সপ্তাহ: ${formatShortBanglaDate(range.start)} – ${formatShortBanglaDate(range.end)}`;
                        })()
                      ) : (
                        formatBanglaDate(selectedDate)
                      )}
                    </span>
                  </button>

                  <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0" />

                  <button
                    onClick={() => refreshDiary(true)}
                    disabled={isRefreshing}
                    className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-90 disabled:opacity-50"
                    title="রিফ্রেশ করুন"
                  >
                    <FiRefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </button>

                  {/* Calendar Dropdown */}
                  {isCalendarOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setIsCalendarOpen(false)} />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[300px] sm:w-[340px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 z-[70] animate-fade-in origin-top select-text">
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => shiftCalendarMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><FiChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" /></button>
                          <span className="font-black text-slate-800 dark:text-slate-200 text-base sm:text-lg">
                            {banglaMonths[calendarMonthDate.getMonth()]} {toBanglaNumber(calendarMonthDate.getFullYear())}
                          </span>
                          <button onClick={() => shiftCalendarMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><FiChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"].map((d, i) => (
                            <div key={i} className="text-center text-[10px] sm:text-[11px] font-black text-slate-400 uppercase">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map((dateStr, i) => {
                            if (!dateStr) return <div key={i} className="aspect-square" />;
                            
                            const weekRange = diaryMode === "weekly" ? getWeekRange(selectedDate, currentDiary.weekStartDay || "Saturday") : null;
                            const isSelected = diaryMode === "weekly"
                              ? (weekRange ? (dateStr >= weekRange.start && dateStr <= weekRange.end) : false)
                              : dateStr === selectedDate;
                            
                            const isToday = dateStr === new Date().toISOString().split("T")[0];
                            const hasContent = hasContentOnDate(dateStr);
                            const isAllDone = areAllSubjectsDoneOnDate(dateStr);
                            
                            const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(dateStr).getDay()];
                            const isWeeklyHol = (currentDiary.weeklyHolidays || ["Friday"]).includes(dayName);
                            const weeklyHolName = 
                              dayName === "Friday" ? "শুক্রবার সাপ্তাহিক ছুটি" :
                              dayName === "Saturday" ? "শনিবার সাপ্তাহিক ছুটি" :
                              dayName === "Sunday" ? "রবিবার সাপ্তাহিক ছুটি" : "সাপ্তাহিক ছুটি";
                            
                            const hol = isDateInHoliday(dateStr, currentDiary.holidays || []) || (isWeeklyHol ? { name: weeklyHolName } : null);
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
                                  if (diaryMode === "weekly") {
                                    const range = getWeekRange(dateStr, currentDiary.weekStartDay || "Saturday");
                                    setSelectedDate(range.start);
                                  } else {
                                    setSelectedDate(dateStr);
                                  }
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
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                           <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>সব বিষয় সম্পন্ন</div>
                           <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500"></span>ডায়েরি আছে</div>
                           <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400"></span>ছুটি</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => shiftDate(1)}
                  className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-100 dark:hover:border-indigo-800 active:scale-90"
                  title={diaryMode === "weekly" ? "পরবর্তী সপ্তাহ" : "পরবর্তী দিন"}
                >
                  <FiChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Bottom Line: Holiday Alert */}
              {(() => {
                const holidays: Holiday[] = currentDiary?.holidays || [];
                const getWeeklyHolidayName = (dStr: string) => {
                  const d = new Date(dStr);
                  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
                  if ((currentDiary?.weeklyHolidays || ["Friday"]).includes(dayName)) {
                    return dayName === "Friday" ? "শুক্রবার সাপ্তাহিক ছুটি" :
                           dayName === "Saturday" ? "শনিবার সাপ্তাহিক ছুটি" :
                           dayName === "Sunday" ? "রবিবার সাপ্তাহিক ছুটি" : "সাপ্তাহিক ছুটি";
                  }
                  return null;
                };

                const todayHolName = getWeeklyHolidayName(selectedDate);
                const todayHol = isDateInHoliday(selectedDate, holidays) || (todayHolName ? { name: todayHolName, startDate: selectedDate, endDate: selectedDate, id: "weekly" } : null);
                
                const tomorrowDateStr = getTomorrow(selectedDate);
                const tomorrowHolName = getWeeklyHolidayName(tomorrowDateStr);
                const tomorrowHol = isDateInHoliday(tomorrowDateStr, holidays) || (tomorrowHolName ? { name: tomorrowHolName, startDate: tomorrowDateStr, endDate: tomorrowDateStr, id: "weekly" } : null);

                if (!todayHol && !tomorrowHol) return null;
                return (
                  <div className="flex flex-col gap-2 w-full px-1 pb-1 mt-2">
                    {todayHol && (
                      <div className="w-full flex items-center justify-between gap-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-2.5 shadow-sm">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FiSunrise className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-rose-500" />
                          <span className="text-sm sm:text-base font-black text-rose-700 dark:text-rose-400 truncate">আজ ছুটি: {todayHol.name}</span>
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-rose-400 whitespace-nowrap">
                          {todayHol.id === "weekly" ? "" : formatHolidayRange(todayHol)}
                        </span>
                      </div>
                    )}
                    {!todayHol && tomorrowHol && (
                      <div className="w-full flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 shadow-sm">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FiAlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-amber-500" />
                          <span className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-400 truncate">আগামীকাল ছুটি: {tomorrowHol.name}</span>
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-amber-400 whitespace-nowrap">
                          {tomorrowHol.id === "weekly" ? "" : formatHolidayRange(tomorrowHol)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

              {/* Notice Board Section */}
              {(() => {
                if (notices.length === 0) {
                  return null;
                }

                return (
                  <div className="w-full bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 rounded-3xl mb-6 shadow-sm p-4 sm:p-6 transition-all duration-300">
                    <div 
                      className={`flex items-center justify-between cursor-pointer group ${!isNoticeExpanded ? '' : 'mb-4'}`}
                      onClick={() => setIsNoticeExpanded(!isNoticeExpanded)}
                      title={isNoticeExpanded ? "নোটিশ বন্ধ করুন" : "নোটিশ দেখুন"}
                    >
                      <h3 className="flex items-center gap-2 text-rose-700 font-black text-lg group-hover:text-rose-800 transition-colors select-none">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"></span>
                        নোটিশ বোর্ড
                        <span className="text-xs font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full ml-1">
                          {toBanglaNumber(notices.length)}
                        </span>
                        <FiChevronRight className={`h-5 w-5 text-rose-400 transition-transform duration-300 ${isNoticeExpanded ? 'rotate-90' : ''}`} />
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInputText("");
                          setInputLogType('notice');
                          setEditingLine(null);
                          setSelectedNoticeClasses([activeTabClass]);
                          setIsNoticeModalOpen(true);
                        }}
                        className="h-8 w-8 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 hover:text-rose-700 transition-all duration-300 flex items-center justify-center shadow-sm shrink-0"
                        title="নোটিশ যোগ করুন"
                      >
                        <FiPlus className="h-5 w-5" />
                      </button>
                    </div>
                    
                    {isNoticeExpanded && (
                      <div className="flex flex-col gap-3 animate-fade-in">
                        {notices.map((notice, i) => (
                          <div key={i} className="flex flex-col gap-1.5 bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-rose-100 dark:border-rose-800/30 relative group">
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
                            <div className="absolute top-2 right-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setInputText(notice.text);
                                  setInputLogType('notice');
                                  setEditingLine({ 
                                    type: 'notice', 
                                    index: -1, 
                                    targetClass: notice.isGlobal ? 'GLOBAL' : activeTabClass, 
                                    bookId: notice.bookId,
                                    isGlobal: notice.isGlobal 
                                  });
                                  setSelectedNoticeClasses([]);
                                  setIsNoticeModalOpen(true);
                                }}
                                className="text-gray-400 hover:text-indigo-600 p-1.5 rounded bg-white shadow-sm border border-slate-200"
                                title="সম্পাদনা করুন"
                              >
                                <FiEdit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
                                  if (notice.isGlobal) {
                                    if (currentEntries[selectedDate]?.['GLOBAL']?.[notice.bookId]) {
                                      delete currentEntries[selectedDate]['GLOBAL'][notice.bookId]['notice'];
                                      await saveDiaryEntries(currentEntries);
                                    }
                                  } else {
                                    if (currentEntries[selectedDate]?.[activeTabClass]?.[notice.bookId]) {
                                      delete currentEntries[selectedDate][activeTabClass][notice.bookId]['notice'];
                                      await saveDiaryEntries(currentEntries);
                                    }
                                  }
                                }}
                                className="text-gray-400 hover:text-rose-600 p-1.5 rounded bg-white shadow-sm border border-slate-200"
                                title="মুছে ফেলুন"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

          {/* ── Diary Cards Content Area ── */}
          <div className="overflow-hidden rounded-3xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl relative md:p-8 print:border-0 print:shadow-none print:p-0">
            {notices.length === 0 && viewMode !== 'table' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInputText("");
                  setInputLogType('notice');
                  setEditingLine(null);
                  setSelectedNoticeClasses([activeTabClass]);
                  setIsNoticeModalOpen(true);
                }}
                className="absolute top-4 right-4 md:top-6 md:right-6 z-[35] h-8 w-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all duration-300 flex items-center justify-center shadow-sm print:hidden active:scale-95"
                title="নোটিশ যোগ করুন"
              >
                <FiPlus className="h-4.5 w-4.5" />
              </button>
            )}
            {activeTabClass && activeClassBooks.length > 0 ? (
              <div className="flex flex-col gap-6">
                {viewMode === 'table' && (
                  <div className="overflow-x-auto pb-[50vh] animate-fade-in custom-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed border border-slate-300 dark:border-slate-700">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700">
                          <th className="p-1 text-base font-black text-slate-800 dark:text-slate-200 w-[80px] sm:w-[120px] md:w-[160px] text-center border border-slate-300 dark:border-slate-700">বিষয়</th>
                          <th className="p-1 text-base font-black text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-center">
                            <span>বিস্তারিত তথ্য</span>
                          </th>
                          <th className="p-1 text-base font-black text-slate-800 dark:text-slate-200 border-b border-t border-l border-r border-slate-300 dark:border-slate-700 w-[52px] sticky right-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.05)]">
                            {notices.length === 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInputText("");
                                  setInputLogType('notice');
                                  setEditingLine(null);
                                  setSelectedNoticeClasses([activeTabClass]);
                                  setIsNoticeModalOpen(true);
                                }}
                                className="flex items-center justify-center h-8 w-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all duration-300 shadow-sm mx-auto active:scale-95"
                                title="নোটিশ যোগ করুন"
                              >
                                <FiPlus className="h-4.5 w-4.5" />
                              </button>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeClassBooks.filter((book: any) => book.isPermanentlyHidden !== true).map((book: any) => {
                          const log = currentDiary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                          const categories = logTypes.map((t: any) => ({
                            type: t.id,
                            label: t.label,
                            value: log[t.id] || "",
                            color: t.color || "emerald"
                          }));
                          const filledCategories = categories.filter((c: any) => c.value && c.type !== 'notice');

                          const isHidden = !!log.isHidden;

                          return (
                            <tr key={book.id} id={`subject-${book.id}`} className={`group border-b border-slate-300 dark:border-slate-700 transition-all ${highlightedSubject === book.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'} ${isHidden ? 'opacity-40 bg-slate-100/50 dark:bg-slate-800/50' : ''}`}>
                              <td className="p-1 align-middle font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 w-[80px] sm:w-[120px] md:w-[160px] text-center bg-white dark:bg-slate-900 break-words whitespace-normal">
                                <div className="flex flex-col items-center justify-center h-full break-words py-2 px-1 gap-1">
                                  <span>{book.name}</span>
                                  {isHidden && (
                                    <span className="inline-flex items-center gap-1 rounded bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400 select-none">
                                      লুকানো
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-1 align-top border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 break-words whitespace-normal">
                                {filledCategories.length > 0 ? (
                                  <div className="flex flex-col gap-3">
                                    {filledCategories.map((cat: any) => {
                                      const lines = cat.value.split("\n").filter((line: string) => line.trim() !== "");
                                      const isArabic = lines.some((line: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line));
                                      const dir = isArabic ? "rtl" : "ltr";
                                      const colors = getColorClasses(cat.color);

                                      return (
                                        <div key={cat.type} className="w-full" dir={dir}>
                                          <div className="flex flex-col gap-1 w-full text-sm">
                                            {/<[a-z][\s\S]*>/i.test(cat.value) ? (
                                              <div className="relative group/line flex items-start gap-1.5 bg-white dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                                {cat.type !== "general" && (() => {
                                                  const colors = getColorClasses(cat.color);
                                                  return (
                                                    <span className={`inline-flex items-center gap-1 text-sm font-bold ${colors.text} select-none shrink-0 mr-1.5 mt-0.5`}>
                                                      <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                                                      {cat.label.split(' ')[0]}
                                                    </span>
                                                  );
                                                })()}
                                                <div 
                                                  className="diary-html-content prose prose-sm dark:prose-invert max-w-none flex-1 min-w-0" 
                                                  dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(cat.value) }} 
                                                />
                                                <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity">
                                                  <button
                                                    onClick={() => {
                                                      setInputText(cat.value);
                                                      setInputLogType(cat.type as any);
                                                      setEditingLine({ type: cat.type as any, index: -1 });
                                                      setActiveInputBookId(book.id);
                                                    }}
                                                    className="text-gray-400 hover:text-indigo-600 p-1.5 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                                                    title="সম্পাদনা করুন"
                                                  >
                                                    <FiEdit2 className="h-3 w-3" />
                                                  </button>
                                                  <button
                                                    onClick={async () => {
                                                      const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
                                                      if (currentEntries[selectedDate]?.[activeTabClass]?.[book.id]) {
                                                        const bookLog = { ...currentEntries[selectedDate][activeTabClass][book.id] };
                                                        delete bookLog[cat.type as any];
                                                        currentEntries[selectedDate][activeTabClass][book.id] = bookLog;
                                                        await saveDiaryEntries(currentEntries);
                                                      }
                                                    }}
                                                    className="text-gray-400 hover:text-rose-600 p-1.5 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                                                    title="মুছে ফেলুন"
                                                  >
                                                    <FiTrash2 className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              lines.map((line: string, lIdx: number) => {
                                                const isBangla = /[\u0980-\u09FF]/.test(line);
                                                const colors = getColorClasses(cat.color);
                                                return (
                                                  <div key={lIdx} className="relative group/line flex items-start gap-1 p-1 -mx-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <div className={`flex items-start gap-1.5 flex-1 leading-relaxed text-slate-700 dark:text-slate-300 ${isBangla ? 'font-medium' : ''} ${isArabic ? 'text-right font-arabic text-base' : 'text-justify'}`}>
                                                      {lIdx === 0 && cat.type !== "general" && (
                                                        <span className={`inline-flex items-center gap-1 text-sm font-bold ${colors.text} select-none shrink-0 mr-1.5 mt-0.5`}>
                                                          <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                                                          {cat.label.split(' ')[0]}
                                                        </span>
                                                      )}
                                                      <span className="flex-1 break-words">{line}</span>
                                                    </div>
                                                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity">
                                                      <button
                                                        onClick={() => {
                                                          setInputText(line);
                                                          setInputLogType(cat.type as any);
                                                          setEditingLine({ type: cat.type as any, index: lIdx });
                                                          setActiveInputBookId(book.id);
                                                        }}
                                                        className="text-gray-400 hover:text-indigo-600 p-1 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                                                      >
                                                        <FiEdit2 className="h-3 w-3" />
                                                      </button>
                                                      <button
                                                        onClick={async () => {
                                                          const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
                                                          if (currentEntries[selectedDate]?.[activeTabClass]?.[book.id]?.[cat.type]) {
                                                            const arr = currentEntries[selectedDate][activeTabClass][book.id][cat.type].split("\n").filter((l: string) => l.trim() !== "");
                                                            arr.splice(lIdx, 1);
                                                            if (arr.length === 0) {
                                                              delete currentEntries[selectedDate][activeTabClass][book.id][cat.type];
                                                            } else {
                                                              currentEntries[selectedDate][activeTabClass][book.id][cat.type] = arr.join("\n");
                                                            }
                                                            await saveDiaryEntries(currentEntries);
                                                          }
                                                        }}
                                                        className="text-gray-400 hover:text-rose-600 p-1 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                                                      >
                                                        <FiTrash2 className="h-3 w-3" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-sm italic">তথ্য নেই</span>
                                )}
                              </td>
                              <td className={`p-2 align-middle text-center border-b border-l border-r border-slate-300 dark:border-slate-700 sticky right-0 z-10 w-[52px] shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.05)] transition-colors ${highlightedSubject === book.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50'}`}>
                                <button
                                  onClick={() => handleToggleInputBar(book.id)}
                                  className="flex items-center justify-center h-8 w-8 rounded-full border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-all active:scale-95 shadow-sm mx-auto"
                                  title="নতুন তথ্য যোগ করুন"
                                >
                                  <FiPlus className="h-5 w-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {viewMode !== 'table' && activeClassBooks.filter((book: any) => book.isPermanentlyHidden !== true).map((book: any, bookIdx: number) => {
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
                  const gradient = cardGradients[bookIdx % cardGradients.length];
                  const log = currentDiary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                  const categories = logTypes.map((t: any) => ({
                    type: t.id,
                    label: t.label,
                    value: log[t.id] || "",
                    color: t.color || "emerald"
                  }));
                  const filledCategories = categories.filter((c: any) => c.value && c.type !== 'notice');

                  const isHidden = !!log.isHidden;

                  return (
                    <div
                      key={book.id}
                      id={`subject-${book.id}`}
                      className={
                        viewMode === 'card'
                          ? `overflow-hidden rounded-2xl border ${highlightedSubject === book.id ? 'border-indigo-400 ring-4 ring-indigo-400/50 scale-[1.01] z-[60]' : 'border-white/40'} shadow-lg hover:shadow-xl transition-all duration-500 relative group ${isHidden ? 'opacity-40' : ''}`
                          : `border-b border-slate-200 pb-6 mb-6 last:border-0 last:pb-0 last:mb-0 break-inside-avoid relative ${highlightedSubject === book.id ? 'bg-indigo-50/50 -mx-4 px-4 py-2 rounded-xl transition-all z-[60]' : 'transition-all'} ${isHidden ? 'opacity-40' : ''}`
                      }
                      style={viewMode === 'card' ? { background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {}}
                    >
                      {/* Subject Header conditionally styled */}
                      {viewMode === 'card' ? (
                        <div className={`px-5 py-4 bg-gradient-to-r ${gradient} text-white font-black text-lg sm:text-xl flex items-center justify-between tracking-wide select-none uppercase relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm pointer-events-none" />
                          <div className="absolute -top-4 -left-4 h-14 w-14 rounded-full bg-white/25 blur-md pointer-events-none" />
                          <div className="absolute -bottom-4 -right-4 h-14 w-14 rounded-full bg-black/10 blur-md pointer-events-none" />
                          <div className="absolute top-1 right-20 h-5 w-20 rounded-full bg-white/20 blur-sm pointer-events-none rotate-12" />
                          <span className="relative z-10 drop-shadow-sm flex-1 text-center pl-8">
                            {book.name}
                            {isHidden && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded bg-rose-600 border border-rose-700 px-2 py-0.5 text-xs font-bold text-white select-none">
                                লুকানো
                              </span>
                            )}
                          </span>
                          
                          {/* Add Button for Teachers */}
                          <button
                            onClick={() => handleToggleInputBar(book.id)}
                            className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors shadow-sm backdrop-blur-md"
                            title="নতুন তথ্য যোগ করুন"
                          >
                            <FiPlus className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mb-4 mt-2">
                          <h4 className="font-bold text-gray-800 dark:text-slate-200 text-base flex items-center gap-2">
                            <FiBook className="text-gray-500 dark:text-slate-400" />
                            <span>{book.name}</span>
                            {isHidden && (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 select-none">
                                লুকানো
                              </span>
                            )}
                          </h4>
                          <button
                            onClick={() => handleToggleInputBar(book.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors shadow-sm"
                            title="নতুন তথ্য যোগ করুন"
                          >
                            <FiPlus className="h-5 w-5" />
                          </button>
                        </div>
                      )}

                      {/* Village Scenery Watermark */}
                      {viewMode === 'card' && (
                        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-2xl opacity-[0.18]">
                          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
                            <defs>
                              <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#bae6fd" /><stop offset="100%" stopColor="#e0f2fe" /></linearGradient>
                              <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#16a34a" /></linearGradient>
                              <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0ea5e9" /></linearGradient>
                            </defs>
                            <rect x="0" y="0" width="400" height="400" fill="url(#skyGrad)" />
                            <g transform="translate(0, 60)">
                              <circle cx="340" cy="18" r="15" fill="#fde68a" />
                              <circle cx="340" cy="18" r="11" fill="#fbbf24" />
                              <ellipse cx="100" cy="22" rx="24" ry="10" fill="white" opacity="0.8" />
                              <ellipse cx="250" cy="28" rx="22" ry="9" fill="white" opacity="0.7" />
                            </g>
                            <g transform="translate(0, 300)">
                              <ellipse cx="200" cy="90" rx="250" ry="60" fill="#86efac" />
                              <ellipse cx="40" cy="110" rx="110" ry="55" fill="#4ade80" />
                              <ellipse cx="370" cy="110" rx="110" ry="50" fill="#4ade80" />
                              <path d="M120 100 Q160 78 200 82 Q240 86 280 100" fill="url(#waterGrad)" stroke="#7dd3fc" strokeWidth="1" />
                              <rect x="175" y="60" width="28" height="24" fill="#fca5a5" rx="1" />
                              <polygon points="175,60 203,60 189,47" fill="#ef4444" />
                            </g>
                          </svg>
                        </div>
                      )}

                      {/* Content Body */}
                      <div className={viewMode === 'card' ? "p-5 sm:p-6 relative" : "pl-4 sm:pl-6"} style={viewMode === 'card' ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 100%)' } : {}}>
                        {filledCategories.length > 0 ? (
                          <div className="flex flex-col gap-3.5">
                            {filledCategories.map((cat: any) => {
                              const lines = cat.value.split("\n").filter((line: string) => line.trim() !== "");
                              const isArabic = lines.some((line: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line));
                              const dir = isArabic ? "rtl" : "ltr";

                              return (
                                <div key={cat.type} className="w-full" dir={dir}>
                                  <div className="flex flex-col gap-0.5 w-full pl-2 text-gray-800 relative z-20">
                                    {/<[a-z][\s\S]*>/i.test(cat.value) ? (
                                      <div className="relative group/line flex items-start gap-1.5 py-1 px-2 -mx-2 hover:bg-white/60 rounded-lg transition-all">
                                        {cat.type !== "general" && (() => {
                                          const colors = getColorClasses(cat.color);
                                          return (
                                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs sm:text-sm font-bold ${colors.text} bg-slate-50 border ${colors.border} select-none mt-0.5 shrink-0`}>
                                              <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                                              {cat.label.split(' ')[0]}
                                            </span>
                                          );
                                        })()}
                                        <div 
                                          className="diary-html-content prose prose-sm dark:prose-invert max-w-none flex-1 min-w-0" 
                                          dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(cat.value) }} 
                                        />
                                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => {
                                              setInputText(cat.value);
                                              setInputLogType(cat.type as any);
                                              setEditingLine({ type: cat.type as any, index: -1 }); // Special index for HTML
                                              setActiveInputBookId(book.id);
                                            }}
                                            className="text-gray-400 hover:text-indigo-600 p-1 rounded bg-white/50 backdrop-blur-sm shadow-sm"
                                            title="সম্পাদনা করুন"
                                          >
                                            <FiEdit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={async () => {
                                              const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
                                              if (currentEntries[selectedDate]?.[activeTabClass]?.[book.id]) {
                                                const bookLog = { ...currentEntries[selectedDate][activeTabClass][book.id] };
                                                delete bookLog[cat.type as any];
                                                currentEntries[selectedDate][activeTabClass][book.id] = bookLog;
                                                await saveDiaryEntries(currentEntries);
                                              }
                                            }}
                                            className="text-gray-400 hover:text-rose-600 p-1 rounded bg-white/50 backdrop-blur-sm shadow-sm"
                                            title="মুছে ফেলুন"
                                          >
                                            <FiTrash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      lines.map((line: string, lIdx: number) => {
                                        const isBangla = /[\u0980-\u09FF]/.test(line);
                                        const isArabicLine = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line);
                                        const colors = getColorClasses(cat.color);
                                        return (
                                          <div key={lIdx} className="group/line flex items-start justify-between gap-3 py-1 px-2 -mx-2 hover:bg-white/60 rounded-lg transition-all w-full">
                                            <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                              {lIdx === 0 && cat.type !== "general" && (
                                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs sm:text-sm font-bold ${colors.text} bg-slate-50 dark:bg-slate-800 border ${colors.border} select-none mr-1.5 flex-shrink-0 mt-0.5`}>
                                                  <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                                                  {cat.label.split(' ')[0]}
                                                </span>
                                              )}
                                              <span className={`text-gray-800 dark:text-slate-300 text-base font-semibold leading-relaxed whitespace-pre-wrap flex-1 break-words ${isArabic ? "text-right" : "text-left"}`}>
                                                {line}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity flex-shrink-0">
                                              <button
                                                onClick={() => {
                                                  setInputText(line);
                                                  setInputLogType(cat.type as any);
                                                  setEditingLine({ type: cat.type as any, index: lIdx });
                                                  setActiveInputBookId(book.id);
                                                }}
                                                className="text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded bg-white/50 dark:bg-slate-800 backdrop-blur-sm shadow-sm"
                                                title="সম্পাদনা করুন"
                                              >
                                                <FiEdit2 className="h-3.5 w-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteLogLine(book.id, cat.type as any, lIdx)}
                                                className="text-gray-400 hover:text-rose-600 p-1 rounded bg-white/50 backdrop-blur-sm shadow-sm"
                                                title="মুছে ফেলুন"
                                              >
                                                <FiTrash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400">
                            <p className="text-sm font-bold">কোন তথ্য সংরক্ষণ করা নেই।</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 italic">শ্রেণী লোড হচ্ছে...</div>
            )}
          </div>

          <div className="mt-8 text-center print:hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
              Powered by Easy-Q Software • {toBanglaNumber(new Date().getFullYear())}
            </p>
          </div>
        </div>

        {/* ── Right Sidebar: Subject List (Desktop Only) ── */}
        <div className="hidden lg:flex w-72 flex-col gap-4 sticky top-4 shrink-0 z-[40]">
          <div className="bg-white dark:bg-[#0a1628] rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <FiList className="h-4 w-4" />
              </div>
              <h3 className="font-black text-slate-800 dark:text-slate-200">বিষয় তালিকা</h3>
            </div>

            {/* View Mode Toggle */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ভিউ মোড</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  কার্ড
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  লিস্ট
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
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
                  const log = currentDiary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                  const isHidden = !!log.isHidden;
                  const isPermHidden = !!book.isPermanentlyHidden;
                  return (
                    <div
                      key={book.id}
                      className="group w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all gap-2"
                    >
                      <button
                        onClick={() => scrollToSubject(book.id)}
                        className="flex-1 text-left py-1 text-sm font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center gap-3 overflow-hidden"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          (isHidden || isPermHidden) 
                            ? "bg-rose-50 dark:bg-rose-900/30 text-rose-400" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                        }`}>
                          <FiBook className="h-4 w-4" />
                        </div>
                        <span className={`truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 ${(isHidden || isPermHidden) ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
                          {book.name}
                          {isPermHidden && (
                            <span className="ml-1.5 inline-flex items-center rounded bg-rose-50 border border-rose-200 px-1 py-0.5 text-[9px] font-bold text-rose-600 select-none">
                              স্থায়ীভাবে অফ
                            </span>
                          )}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => handleEyeClick(book)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          (isHidden || isPermHidden) 
                            ? "bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50" 
                            : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                        title={(isHidden || isPermHidden) ? "দেখুন" : "লুকান"}
                      >
                        {(isHidden || isPermHidden) ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Mobile Subject Sidebar Drawer (Rendered at root) */}
      {activeTabClass && (
        <>
          {isSubjectMenuOpen && (
            <div
              className="fixed inset-0 bg-slate-900/20 z-[80] backdrop-blur-sm transition-opacity animate-fade-in lg:hidden"
              onClick={() => setIsSubjectMenuOpen(false)}
            />
          )}

          <div className={`fixed top-0 right-0 h-full w-72 sm:w-80 bg-white dark:bg-slate-900 shadow-2xl z-[90] transform transition-transform duration-300 ease-in-out flex flex-col lg:hidden ${isSubjectMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FiList className="text-emerald-500" />
                বিষয় তালিকা
              </h4>
              <button
                onClick={() => setIsSubjectMenuOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
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
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  কার্ড
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  লিস্ট
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  টেবিল
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 divide-y divide-slate-50">
              {activeClassBooks.map((book: any) => {
                const log = currentDiary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                const isHidden = !!log.isHidden;
                const isPermHidden = !!book.isPermanentlyHidden;
                return (
                  <div
                    key={book.id}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors gap-3"
                  >
                    <button
                      onClick={() => scrollToSubject(book.id)}
                      className="flex-1 text-left py-1 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-3 overflow-hidden"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        (isHidden || isPermHidden) 
                          ? "bg-rose-50 dark:bg-rose-900/30 text-rose-450 dark:text-rose-400" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                      }`}>
                        <FiBook className="h-4 w-4" />
                      </div>
                      <span className={`truncate ${(isHidden || isPermHidden) ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
                        {book.name}
                        {isPermHidden && (
                          <span className="ml-1.5 inline-flex items-center rounded bg-rose-50 border border-rose-200 px-1 py-0.5 text-[9px] font-bold text-rose-600 select-none">
                            স্থায়ীভাবে অফ
                          </span>
                        )}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => handleEyeClick(book)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        (isHidden || isPermHidden) 
                          ? "bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-800" 
                          : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                      }`}
                      title={(isHidden || isPermHidden) ? "দেখুন" : "লুকান"}
                    >
                      {(isHidden || isPermHidden) ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* WHATSAPP CHAT POPUP MODAL FOR TEACHER INPUT */}
      {activeInputBookId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
          <div className="flex flex-col h-[700px] max-h-[90vh] max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-150 dark:border-slate-700 overflow-hidden animate-fade-in">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col bg-white dark:bg-slate-900 border-b border-gray-150 dark:border-slate-700">
              
              {/* Top Row: Date Navigator & Close */}
              <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                
                {/* Date Selector Navigation Bar (copied from main page) */}
                <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl p-1.5 shadow-sm border border-slate-200 dark:border-slate-700 flex-1 max-w-[340px]">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 shadow-sm transition-all hover:bg-gray-100 dark:hover:bg-slate-600 active:scale-90 flex-shrink-0"
                    title="পূর্ববর্তী দিন"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="relative flex justify-center flex-1">
                    <button
                      onClick={openCalendar}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95 group w-full justify-center"
                    >
                      <span className="text-base sm:text-lg font-black text-gray-800 dark:text-gray-200 group-hover:text-indigo-900 dark:group-hover:text-indigo-300 transition-colors truncate">
                        {formatBanglaDate(selectedDate)}
                      </span>
                    </button>

                    {/* Calendar Dropdown */}
                    {isCalendarOpen && (
                      <>
                        <div className={`fixed inset-0 z-[10010] ${isAiModeActive ? 'bg-black/40 backdrop-blur-sm' : ''}`} onClick={() => setIsCalendarOpen(false)} />
                        <div className={isAiModeActive 
                            ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[360px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 z-[10020] animate-scale-up" 
                            : "absolute top-full mt-2 w-[280px] sm:w-[320px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 z-[10020] animate-fade-in origin-top"
                          }>
                          <div className="flex items-center justify-between mb-3">
                            <button onClick={() => shiftCalendarMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"><FiChevronLeft className="h-4 w-4 text-slate-600" /></button>
                            <span className="font-black text-slate-800 text-sm sm:text-base">
                              {banglaMonths[calendarMonthDate.getMonth()]} {toBanglaNumber(calendarMonthDate.getFullYear())}
                            </span>
                            <button onClick={() => shiftCalendarMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"><FiChevronRight className="h-4 w-4 text-slate-600" /></button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"].map((d, i) => (
                              <div key={i} className="text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase">{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((dateStr, i) => {
                              if (!dateStr) return <div key={i} className="aspect-square" />;
                              
                              const weekRange = diaryMode === "weekly" ? getWeekRange(selectedDate, currentDiary.weekStartDay || "Saturday") : null;
                              let isSelected = diaryMode === "weekly"
                                ? (weekRange ? (dateStr >= weekRange.start && dateStr <= weekRange.end) : false)
                                : dateStr === selectedDate;
                              
                              let isRange = false;
                              if (isAiModeActive) {
                                if (selectedDate && aiEndDate) {
                                  const start = selectedDate <= aiEndDate ? selectedDate : aiEndDate;
                                  const end = selectedDate <= aiEndDate ? aiEndDate : selectedDate;
                                  if (dateStr >= start && dateStr <= end) {
                                    isRange = true;
                                    if (dateStr === start || dateStr === end) {
                                      isSelected = true;
                                    } else {
                                      isSelected = false;
                                    }
                                  }
                                }
                              }

                              const isToday = dateStr === new Date().toISOString().split("T")[0];
                              const hasContent = hasContentOnDate(dateStr);
                              const isAllDone = areAllSubjectsDoneOnDate(dateStr);
                              const hol = isDateInHoliday(dateStr, currentDiary.holidays || []);
                              const isHol = !!hol;
                              const dNum = toBanglaNumber(parseInt(dateStr.split("-")[2], 10));

                              let bgClass = "bg-white hover:bg-slate-50 text-slate-700";
                              let borderClass = "border-transparent";
                              
                              if (isSelected) {
                                bgClass = "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md";
                              } else if (isRange) {
                                bgClass = "bg-indigo-100 text-indigo-700 hover:bg-indigo-200";
                              } else if (isHol) {
                                bgClass = "bg-rose-50 text-rose-700 hover:bg-rose-100";
                              } else if (isAllDone) {
                                bgClass = "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold";
                              } else if (hasContent) {
                                bgClass = "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold";
                              }

                              if (isToday && !isSelected && !isRange) {
                                borderClass = "border-indigo-400";
                              }

                              return (
                                <button
                                  key={i}
                                  onClick={() => {
                                    if (isAiModeActive) {
                                      if (!selectedDate || (selectedDate && aiEndDate)) {
                                        setSelectedDate(dateStr);
                                        setAiEndDate("");
                                      } else {
                                        if (dateStr < selectedDate) {
                                          setAiEndDate(selectedDate);
                                          setSelectedDate(dateStr);
                                        } else {
                                          setAiEndDate(dateStr);
                                        }
                                      }
                                    } else {
                                      setSelectedDate(dateStr);
                                      setIsCalendarOpen(false);
                                    }
                                  }}
                                  className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all active:scale-90 border ${bgClass} ${borderClass}`}
                                  title={isHol ? hol.name : isAllDone ? "সব বিষয় সম্পন্ন" : hasContent ? "ডায়েরি আছে" : ""}
                                >
                                  <span className="text-[10px] sm:text-xs">{dNum}</span>
                                  {hasContent && !isSelected && !isRange && !isAllDone && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-indigo-500" />}
                                  {isAllDone && !isSelected && !isRange && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />}
                                  {isHol && !isSelected && !isRange && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose-400" />}
                                </button>
                              );
                            })}
                          </div>
                          {isAiModeActive && (
                            <div className="mt-5 flex justify-end">
                              <button 
                                onClick={() => setIsCalendarOpen(false)} 
                                className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow hover:bg-indigo-700 active:scale-95 transition-all w-full text-center"
                              >
                                সম্পন্ন
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => shiftDate(1)}
                    className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 shadow-sm transition-all hover:bg-gray-100 dark:hover:bg-slate-600 active:scale-90 flex-shrink-0"
                    title="পরবর্তী দিন"
                  >
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                     <button
                     onClick={() => {
                       setActiveInputBookId(null);
                       setInputText("");
                       setEditingLine(null);
                       if (returnToCheckupAfterSave) {
                         setIsCheckupModalOpen(true);
                         setReturnToCheckupAfterSave(false);
                       }
                     }}
                     className="rounded-full p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                     title="বন্ধ করুন"
                   >
                     <FiX className="h-6 w-6" />
                   </button>
                </div>
              </div>

              {/* Bottom Row: Class Hamburger & Subject Tabs */}
              <div className="flex flex-row items-center gap-1.5 p-2 w-full bg-slate-50 dark:bg-slate-800/50">
                
                {/* Class Hamburger */}
                <div className="flex-shrink-0 relative">
                  <button
                    onClick={() => setIsModalClassMenuOpen(!isModalClassMenuOpen)}
                    className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center bg-white dark:bg-slate-800 border rounded-full shadow-sm transition-all ${isModalClassMenuOpen ? 'border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    title="শ্রেণী নির্বাচন"
                  >
                    {isModalClassMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
                  </button>
                  {isModalClassMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-[10010]" onClick={() => setIsModalClassMenuOpen(false)} />
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-[10020] animate-fade-in">
                        {allowedClasses.map((c: string) => (
                          <button
                            key={c}
                            onClick={() => {
                              setActiveTabClass(c);
                              setIsModalClassMenuOpen(false);
                              const newClassBooks = ((currentDiary.config as Array<{ className: string; books: any[] }>)?.find(
                                (cls) => cls.className === c
                              )?.books || []).filter((b: any) => b.isPermanentlyHidden !== true);
                              if (newClassBooks.length > 0) {
                                setActiveInputBookId(newClassBooks[0].id);
                              } else {
                                setActiveInputBookId(null);
                                if (returnToCheckupAfterSave) {
                                  setIsCheckupModalOpen(true);
                                  setReturnToCheckupAfterSave(false);
                                }
                              }
                            }}
                            className={`w-full text-left px-5 py-3 text-base font-bold transition-colors ${activeTabClass === c ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Scrollable Subject Tabs */}
                <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {activeClassBooks.filter((book: any) => book.isPermanentlyHidden !== true).map((book: any) => {
                    const isActive = activeInputBookId === book.id;
                    const log = currentDiary.entries?.[selectedDate]?.[activeTabClass]?.[book.id] || {};
                    const hasData = Object.keys(log).some(k => typeof log[k] === "string" && log[k].trim() !== "");
                    
                    return (
                      <button
                        key={book.id}
                        onClick={(e) => {
                          setActiveInputBookId(book.id);
                          const container = e.currentTarget.parentElement;
                          if (container) {
                            const containerRect = container.getBoundingClientRect();
                            const elementRect = e.currentTarget.getBoundingClientRect();
                            const scrollLeft = container.scrollLeft + (elementRect.left - containerRect.left) - (containerRect.width / 2) + (elementRect.width / 2);
                            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                          }
                        }}
                        className={`flex items-center gap-2 flex-shrink-0 rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-black shadow-sm border transition-all active:scale-95 ${
                          isActive
                            ? "bg-white dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-400 shadow-md ring-1 ring-indigo-100 dark:ring-indigo-900/50"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        }`}
                      >
                        <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-colors relative ${
                          isActive ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}>
                          <FiBook className="h-4 w-4" />
                          {hasData && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white shadow-sm animate-fade-in">
                              <FiCheck className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <span>{book.name}</span>
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Empty area / Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 flex flex-col gap-3 scrollbar-thin">
              {(() => {
                const log = currentDiary.entries?.[selectedDate]?.[activeTabClass]?.[activeInputBookId!] || {};
                const bubbles: Array<{ type: string; value: string }> = [];
                logTypes.forEach((t: any) => {
                  if (log[t.id]) bubbles.push({ type: t.id, value: log[t.id] });
                });

                if (bubbles.length === 0) {
                  const activeTypeConfig = logTypes.find((t: any) => t.id === inputLogType) || logTypes[0] || { color: 'emerald' };
                  const activeColors = getColorClasses(activeTypeConfig.color);
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-gray-500">
                      <div className={`flex h-20 w-20 items-center justify-center rounded-full mb-3 ${activeColors.lightBg} ${activeColors.text}`}>
                        <FiSend className="h-10 w-10" />
                      </div>
                      <p className="text-base font-bold text-gray-500 dark:text-gray-400">নিচের টাস্ক বার থেকে টাইপ করুন</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center px-6 max-w-sm mt-1">যে কোনো ধরনের টাস্ক, নোটিশ, বা পাঠ্যের জন্য নিচের বারটি ব্যবহার করুন। এন্টার চাপলে তা যোগ হবে।</p>
                    </div>
                  );
                }

                return bubbles.map((bubble, index) => {
                  const lines = bubble.value.split("\n").filter(line => line.trim() !== "");
                  const isArabic = lines.some(line => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line));
                  const dir = isArabic ? "rtl" : "ltr";
                  const bubbleTypeConfig = logTypes.find((t: any) => t.id === bubble.type) || { color: 'emerald', label: bubble.type };
                  const bubbleColor = getColorClasses(bubbleTypeConfig.color);

                  return (
                    <div key={index} className="flex flex-col gap-2 w-full animate-fade-in" dir={dir}>
                      {/* Combined line breaker and type badge */}
                      {bubble.type !== 'general' && (
                        <div className="flex items-center gap-2.5 w-full select-none mb-1">
                          <div className={`flex-grow h-[1.5px] ${bubbleColor.border.replace('border-', 'bg-')}`} />
                          <div className="flex-shrink-0">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border select-none ${bubbleColor.lightBg} ${bubbleColor.text} ${bubbleColor.border}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${bubbleColor.bg}`} />
                              <span>{bubbleTypeConfig.label.split(' ')[0]}</span>
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 w-full">
                        {/<[a-z][\s\S]*>/i.test(bubble.value) ? (
                          // HTML rich content: render as formatted block
                          <div className="relative bg-white dark:bg-slate-800 rounded-xl px-4 py-2 flex items-start justify-between gap-4 w-full shadow-sm hover:shadow transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                            <div
                              className="diary-html-content prose prose-sm max-w-none flex-1 min-w-0 text-left"
                              dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(bubble.value, useBulletPoint) }}
                            />
                            <div className="relative group/menu flex-shrink-0 mt-0.5 print:hidden">
                              <button className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors focus:outline-none">
                                <FiMoreVertical className="h-5 w-5" />
                              </button>
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1.5 z-20 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all transform origin-top-right scale-95 group-hover/menu:scale-100">
                                <button
                                  onClick={() => {
                                    setInputText(bubble.value);
                                    setInputLogType(bubble.type as any);
                                    setEditingLine({ type: bubble.type as any, index: -1 });
                                  }}
                                  className="flex items-center gap-2 w-full p-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                                >
                                  <FiEdit2 className="h-4 w-4" /> সম্পাদনা করুন
                                </button>
                                <button
                                  onClick={async () => {
                                    const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
                                    if (currentEntries[selectedDate]?.[activeTabClass]?.[activeInputBookId!]) {
                                      const bookLog = { ...currentEntries[selectedDate][activeTabClass][activeInputBookId!] };
                                      delete bookLog[bubble.type as any];
                                      currentEntries[selectedDate][activeTabClass][activeInputBookId!] = bookLog;
                                      await saveDiaryEntries(currentEntries);
                                    }
                                  }}
                                  className="flex items-center gap-2 w-full p-2 text-sm text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors mt-0.5"
                                >
                                  <FiTrash2 className="h-4 w-4" /> মুছে ফেলুন
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (() => {
                          const lines = bubble.value.split("\n").filter(line => line.trim() !== "");
                          const totalLines = lines.length;
                          return lines.map((line, lIdx) => {
                            const isBangla = /[\u0980-\u09FF]/.test(line);
                            const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line);
                            const alreadyHasNumber = /^[0-9০-৯٠-٩]+[.)]\s/.test(line.trim());
                            const alreadyHasBullet = /^[•\-*]\s/.test(line.trim());
                            let numberStr = "";
                            if (!alreadyHasNumber && !alreadyHasBullet && useBulletPoint) {
                              numberStr = "• ";
                            }
                            return (
                              <div key={lIdx} className="relative bg-white rounded-xl px-4 py-2 flex items-start justify-between gap-4 w-full shadow-sm hover:shadow transition-all border border-transparent hover:border-slate-100">
                                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                  {numberStr && (
                                    <span className="text-gray-405 font-bold select-none flex-shrink-0 text-sm mt-0.5">
                                      {numberStr}
                                    </span>
                                  )}
                                  <p
                                    dir={isArabic ? "rtl" : "ltr"}
                                    className={`text-sm text-gray-800 font-medium whitespace-pre-wrap flex-1 ${isArabic ? "text-right" : "text-left"}`}
                                  >
                                    {line}
                                  </p>
                                </div>
                                <div className="relative group/menu flex-shrink-0 mt-0.5 print:hidden" dir="ltr">
                                  <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors focus:outline-none">
                                    <FiMoreVertical className="h-5 w-5" />
                                  </button>
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 p-1.5 z-20 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all transform origin-top-right scale-95 group-hover/menu:scale-100">
                                    <button
                                      onClick={() => {
                                        setInputText(line);
                                        setInputLogType(bubble.type as any);
                                        setEditingLine({ type: bubble.type as any, index: lIdx });
                                      }}
                                      className="flex items-center gap-2 w-full p-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                    >
                                      <FiEdit2 className="h-4 w-4" /> সম্পাদনা করুন
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLogLine(activeInputBookId!, bubble.type as any, lIdx)}
                                      className="flex items-center gap-2 w-full p-2 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors mt-0.5"
                                    >
                                      <FiTrash2 className="h-4 w-4" /> মুছে ফেলুন
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <div className="border-t border-gray-150 dark:border-slate-700 px-6 sm:px-8 pt-4 pb-6 sm:pb-8 bg-white dark:bg-slate-900 flex flex-col gap-3">
              {/* Pills */}
              <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide py-0.5 select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-2 min-w-full items-center">
                  {logTypes.map((type: any) => {
                    const isActive = inputLogType === type.id;
                    const isAiSelected = aiSelectedTaskTypes.includes(type.id);
                    const colors = getColorClasses(type.color);
                    return (
                      <button
                        key={type.id}
                        id={`pill-${type.id}`}
                        onClick={(e) => {
                          if (isAiModeActive) {
                            setAiSelectedTaskTypes(prev => prev.includes(type.id) ? prev.filter(t => t !== type.id) : [...prev, type.id]);
                          } else {
                            setInputLogType(type.id);
                          }
                          e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                        }}
                        className={`flex-none rounded-full px-4 py-2 text-sm font-bold border transition-all duration-200 active:scale-95 cursor-pointer ${
                          isAiModeActive ? (isAiSelected ? colors.activeBg : colors.hoverBg) : (isActive ? colors.activeBg : colors.hoverBg)
                        }`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setIsAddTypeModalOpen(true)}
                    className="flex-none rounded-full px-3 py-2 text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center"
                    title="নতুন টাস্ক টাইপ যোগ করুন"
                  >
                    <FiPlus className="h-5 w-5 text-rose-500 font-bold" />
                  </button>

                  <div className="w-px bg-gray-200 mx-1 h-6"></div>

                  <button
                    onClick={() => setUseBulletPoint(!useBulletPoint)}
                    className={`flex-none rounded-full px-4 py-2 text-sm font-bold border transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-1.5 ${useBulletPoint ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    title="বুলেট পয়েন্ট ব্যবহার করুন"
                  >
                    <div className={`h-2 w-2 rounded-full ${useBulletPoint ? 'bg-indigo-600' : 'bg-slate-400'}`}></div>
                    বুলেট স্টাইল
                  </button>
                  
                  {isAiModeActive && (
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                      <span className="text-sm font-bold text-slate-600">শেষ দিন:</span>
                      <input 
                        type="date" 
                        value={aiEndDate} 
                        onChange={(e) => setAiEndDate(e.target.value)} 
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 bg-white shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Text Input Composer */}
              {editingLine && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-xs text-amber-800 animate-fade-in shadow-sm">
                  <span className="font-bold">
                    সম্পাদনা করছেন: {editingLine?.type?.toUpperCase()} (লাইন {toBanglaNumber((editingLine?.index ?? 0) + 1)})
                  </span>
                  <button
                    onClick={() => {
                      setEditingLine(null);
                      setInputText("");
                    }}
                    className="text-amber-600 hover:text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded transition-colors"
                  >
                    বাতিল করুন
                  </button>
                </div>
              )}

              {(() => {
                const activeTypeConfig = logTypes.find((t: any) => t.id === inputLogType) || logTypes[0] || { color: 'emerald' };
                const activeColors = getColorClasses(activeTypeConfig.color);

                return (
                  <div className="flex items-start gap-3">
                    <div className={`flex-1 flex flex-col bg-white dark:bg-slate-800 border rounded-2xl p-1 shadow-inner transition-colors ${activeColors.border} ${activeColors.ring}`}>
                      <div className="flex items-end gap-1 w-full">
                        <div className="flex flex-col gap-1 flex-shrink-0 mb-1 ml-1">
                          <button
                            onClick={() => setIsAiModeActive(!isAiModeActive)}
                            className={`px-3 py-1.5 rounded-xl text-sm font-black transition-all flex items-center justify-center ${
                              isAiModeActive 
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md border border-transparent' 
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-600 hover:bg-slate-100 opacity-60 hover:opacity-100'
                            }`}
                            title="AI Mode"
                          >
                            AI ({toBanglaNumber((aiTokens / 1000) % 1 === 0 ? (aiTokens / 1000).toString() : (aiTokens / 1000).toFixed(2))})
                          </button>
                          {isAiModeActive && (
                            <button
                              onClick={() => setIsAiToolsModalOpen(true)}
                              className="px-2 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-200 relative"
                              title="AI Tools"
                            >
                              Tools
                              {aiSelectedTools.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{aiSelectedTools.length}</span>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 max-h-[250px] overflow-y-auto">
                          <Editor
                            pasteOnlyMode={!isAiModeActive}
                            value={inputText}
                            onChange={setInputText}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (isAiModeActive) {
                          handleAiGenerate(activeInputBookId!);
                        } else {
                          handleSendWhatsAppLog(activeInputBookId!);
                        }
                      }}
                      disabled={!inputText || inputText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim() === '' || isSaving}
                      className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md active:scale-90 transition-all disabled:opacity-40 disabled:pointer-events-none ${isAiModeActive ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : activeColors.activeBg}`}
                      title={isAiModeActive ? "AI দিয়ে তৈরি করুন" : "পাঠান"}
                    >
                      {isAiModeActive ? <span className="text-xl pb-0.5">✨</span> : <FiSend className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW LOG TYPE MODAL */}
      {isAddTypeModalOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between bg-indigo-50 px-5 py-4 border-b border-indigo-100">
              <h3 className="font-black text-indigo-900 text-lg">নতুন টাস্ক টাইপ</h3>
              <button onClick={() => setIsAddTypeModalOpen(false)} className="text-indigo-400 hover:text-indigo-700 transition-colors">
                <FiX className="h-6 w-6" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">টাইপের নাম (যেমন: Project)</label>
                <input
                  type="text"
                  value={newTypeLabel}
                  onChange={(e) => setNewTypeLabel(e.target.value)}
                  placeholder="নতুন নাম..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-800"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">রঙ নির্বাচন করুন</label>
                <div className="flex flex-wrap gap-3">
                  {["emerald", "indigo", "amber", "rose", "sky", "purple", "teal", "pink"].map(color => {
                    const bgClass = getColorClasses(color).bg;
                    return (
                      <button
                        key={color}
                        onClick={() => setNewTypeColor(color)}
                        className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${bgClass} ${newTypeColor === color ? 'ring-4 ring-offset-2 ring-indigo-200 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                      >
                        {newTypeColor === color && <FiCheckCircle className="text-white h-5 w-5 drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={handleAddCustomType}
                disabled={!newTypeLabel.trim() || isSaving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all mt-2 flex items-center justify-center gap-2"
              >
                {isSaving ? <FiRefreshCw className="animate-spin h-5 w-5" /> : <FiPlus className="h-5 w-5" />}
                তৈরি করুন
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ADD NOTICE MODAL */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between bg-rose-50 px-5 py-4 border-b border-rose-100 shrink-0">
              <h3 className="font-black text-rose-900 text-lg flex items-center gap-2">
                <FiPlus className="text-rose-500" />
                নোটিশ বোর্ড
              </h3>
              <button onClick={() => { setIsNoticeModalOpen(false); setInputText(""); setEditingLine(null); }} className="text-rose-400 hover:text-rose-700 transition-colors">
                <FiX className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
              {/* Scope Selection */}
              {!editingLine && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">কোন কোন শ্রেণীতে নোটিশ দিতে চান?</label>
                  <div className="flex flex-wrap gap-3">
                    {allowedClasses.map((cls: string) => {
                      const isSelected = selectedNoticeClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedNoticeClasses(prev => prev.filter(c => c !== cls));
                            } else {
                              setSelectedNoticeClasses(prev => [...prev, cls]);
                            }
                          }}
                          className={`flex items-center gap-2 py-2 px-4 border-2 rounded-xl font-bold transition-all ${isSelected ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50/50'}`}
                        >
                          {isSelected ? <FiCheckCircle className="h-4 w-4" /> : <FiBook className="h-4 w-4" />}
                          <span>{cls}</span>
                        </button>
                      )
                    })}
                  </div>
                  {selectedNoticeClasses.length === 0 && (
                    <p className="text-xs text-rose-500 mt-2 font-bold">অন্তত একটি শ্রেণী নির্বাচন করুন</p>
                  )}
                </div>
              )}

              {/* Notice Editor */}
              <div className="flex-1 min-h-[250px] border border-rose-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-rose-400 focus-within:border-rose-400 transition-all bg-white">
                <div className="h-full">
                  <Editor
                    pasteOnlyMode={true}
                    value={inputText}
                    onChange={setInputText}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0">
              <button
                onClick={handleSaveNotice}
                disabled={!inputText || inputText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim() === '' || (!editingLine && selectedNoticeClasses.length === 0) || isSaving}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <FiRefreshCw className="animate-spin h-5 w-5" /> : <FiSend className="h-5 w-5" />}
                {editingLine ? "আপডেট করুন" : "প্রকাশ করুন"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKUP MODAL */}
      {isCheckupModalOpen && (
        <CheckupModal
          isOpen={isCheckupModalOpen}
          onClose={() => setIsCheckupModalOpen(false)}
          currentDiary={currentDiary}
          logTypes={logTypes}
          onSaveEntries={async (updatedEntries: any, targetClass: string | string[], targetDates: string[]) => {
            return await saveDiaryEntries(updatedEntries, undefined, targetClass, targetDates);
          }}
          onOpenDirectEditor={(date: string, className: string, bookId: string) => {
            setSelectedDate(date);
            setActiveTabClass(className);
            setActiveInputBookId(bookId);
            setInputText("");
            setInputLogType("general");
            setEditingLine(null);
            setReturnToCheckupAfterSave(true);
          }}
        />
      )}

      {/* SUBJECT TOGGLE OFF TYPE MODAL (TODAY vs PERMANENT) */}
      {subjectToToggleOff && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between bg-indigo-50 px-5 py-4 border-b border-indigo-100">
              <h3 className="font-black text-indigo-900 text-base">বিষয় বন্ধ করুন: {subjectToToggleOff.name}</h3>
              <button 
                onClick={() => setSubjectToToggleOff(null)} 
                className="text-indigo-400 hover:text-indigo-700 transition-colors"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-sm text-slate-500 font-bold leading-relaxed">
                আপনি কি বিষয়টি আজকের ডায়েরি থেকে নাকি স্থায়ীভাবে সম্পূর্ণ ডায়েরি থেকে বন্ধ করতে চান?
              </p>
              
              <button
                onClick={() => {
                  handleTurnOffSubject(subjectToToggleOff.id, "today");
                  setSubjectToToggleOff(null);
                }}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-xl border border-indigo-200 transition-all active:scale-[0.98] text-center text-sm"
              >
                আজকের জন্য অফ করুন
              </button>

              <button
                onClick={() => {
                  handleTurnOffSubject(subjectToToggleOff.id, "permanent");
                  setSubjectToToggleOff(null);
                }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3 px-4 rounded-xl border border-rose-200 transition-all active:scale-[0.98] text-center text-sm"
              >
                স্থায়ীভাবে অফ করুন
              </button>
              
              <button
                onClick={() => setSubjectToToggleOff(null)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all active:scale-[0.98] text-center text-sm mt-1"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Tools Modal */}
      {isAiToolsModalOpen && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">AI Tools</h3>
              <button onClick={() => setIsAiToolsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {[
                { id: "auto_revision", label: "অটো রিভিশন", icon: "🔄", desc: "Spaced repetition (1, 2, 7, 21)" },
                { id: "detailed_explanation", label: "বিস্তারিত ব্যাখ্যা", icon: "📝", desc: "Add detailed explanations" },
                { id: "generate_mcqs", label: "MCQs", icon: "✅", desc: "Create multiple choice questions" },
                { id: "real_world_examples", label: "বাস্তব উদাহরণ", icon: "🌍", desc: "Include real-world examples" },
              ].map(tool => {
                const isActive = aiSelectedTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setAiSelectedTools(prev => 
                        prev.includes(tool.id) ? prev.filter(t => t !== tool.id) : [...prev, tool.id]
                      );
                    }}
                    className={`flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isActive 
                        ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{tool.icon}</span>
                      <span className={`font-bold text-sm ${isActive ? 'text-indigo-800' : 'text-slate-700'}`}>{tool.label}</span>
                    </div>
                    <span className="text-xs text-slate-500">{tool.desc}</span>
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsAiToolsModalOpen(false)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Preview Modal */}
      {aiPreviewPlan && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 text-lg">AI স্টাডি প্ল্যান প্রিভিউ</h3>
              <button onClick={() => setAiPreviewPlan(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
              {Object.keys(aiPreviewPlan).map(dateStr => (
                <div key={dateStr} className="mb-6 last:mb-0 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h4 className="font-bold text-indigo-700 mb-3 pb-2 border-b border-indigo-100 flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    {new Date(dateStr).toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h4>
                  <div className="space-y-3">
                    {Object.keys(aiPreviewPlan[dateStr]).map(type => {
                      if (!aiPreviewPlan[dateStr][type]) return null;
                      const typeInfo = logTypes.find((t: any) => t.id === type) || { label: type, color: 'gray' };
                      const colorMap: any = {
                        'cw': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        'hw': 'bg-indigo-100 text-indigo-800 border-indigo-200',
                        'test': 'bg-amber-100 text-amber-800 border-amber-200',
                        'notice': 'bg-rose-100 text-rose-800 border-rose-200'
                      };
                      return (
                        <div key={type} className="flex flex-col gap-1.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md border w-max ${colorMap[type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {typeInfo.label}
                          </span>
                          <div className="text-sm text-slate-700 leading-relaxed pl-1" dangerouslySetInnerHTML={{ __html: aiPreviewPlan[dateStr][type] }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-slate-100 bg-white shrink-0">
              <label className="block text-sm font-bold text-slate-700 mb-2">পরিবর্তন করতে চান?</label>
              <textarea
                value={aiRepromptText}
                onChange={(e) => setAiRepromptText(e.target.value)}
                placeholder="যেমন: বাড়ির কাজ আরও ছোট করুন..."
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 min-h-[80px] resize-y mb-4"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleRepromptAiPlan}
                  disabled={isAiRegenerating || !aiRepromptText.trim()}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isAiRegenerating ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiRefreshCw className="w-4 h-4" />}
                  রিজেনারেট
                </button>
                <button
                  onClick={handleApplyAiPlan}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
                >
                  <FiCheck className="w-4 h-4" />
                  পছন্দ হয়েছে, সেভ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InsufficientBalanceModal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        requiredCredits={requiredCredits}
      />
    </div>
  );
}

