"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Toast from '@/components/Toast';
import {
  Plus as FiPlus,
  Trash2 as FiTrash2,
  Edit2 as FiEdit2,
  Calendar as FiCalendar,
  Share2 as FiShare2,
  Copy as FiCopy,
  Printer as FiPrinter,
  ArrowLeft as FiArrowLeft,
  BookOpen as FiBookOpen,
  Book as FiBook,
  Check as FiCheck,
  AlertCircle as FiAlertCircle,
  Send as FiSend,
  User as FiUser,
  ChevronDown as FiChevronDown,
  ChevronRight as FiChevronRight,
  ChevronLeft as FiChevronLeft,
  Link as FiLink,
  Sunrise as FiSunrise,
  X as FiX,
  Clock as FiClock,
  CheckCircle as FiCheckCircle,
  FileText as FiFileText,
  Layout as FiLayout,
  List as FiList,
  Grid as FiGrid,
  Search as FiSearch,
  Settings as FiSettings,
} from "lucide-react";

// Helper to safely parse config since Prisma sometimes returns JSON arrays as objects with numeric keys
export const parseDiaryConfig = (config: any): Array<any> => {
  if (!config) return [];
  if (Array.isArray(config)) return config;
  if (typeof config === "string") {
    try {
      const parsed = JSON.parse(config);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  if (typeof config === "object") {
    // Check if it's an array-like object from Prisma
    const vals = Object.values(config);
    if (vals.length > 0 && typeof vals[0] === "object" && vals[0] !== null && "className" in (vals[0] as any)) {
      return vals;
    }
    return [];
  }
  return [];
};

import EdusyModal from "@/components/Modal";
import PrintPreviewModal from "./_components/PrintPreviewModal";
import AdminDiaryDetailedView from "./_components/AdminDiaryDetailedView";
import { Loader2 } from "lucide-react";
import { useSession } from '@/components/SessionProvider';

// --- Polyfills for Easy-Q dependencies ---
const ModalLayout = ({ isOpen, onChange, onClose, title, description, modalSize, className, modalComponent, children, maxWidth, headerActions }: any) => {
  const handleClose = onClose || onChange || (() => {});
  const mw = maxWidth || (modalSize === 'lg' ? 'max-w-4xl' : modalSize === 'md' ? 'max-w-2xl' : modalSize === 'sm' ? 'max-w-md' : 'max-w-xl');
  
  return (
    <EdusyModal isOpen={isOpen} onClose={handleClose} title={title} maxWidth={mw} headerActions={headerActions}>
      <div className={className}>
        {description && <p className="px-4 md:px-6 pt-2 pb-4 text-sm text-slate-500">{description}</p>}
        {modalComponent || children}
      </div>
    </EdusyModal>
  );
};
const Loader = () => <Loader2 className="animate-spin mx-auto text-primary" size={24} />;
const Button = ({ children, onClick, className }: any) => (
  <button onClick={onClick} className={`px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors ${className || ''}`}>
    {children}
  </button>
);
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4 text-center">মুছে ফেলতে চান?</h3>
                <div className="flex gap-3 justify-center">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl hover:bg-slate-200">বাতিল</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">মুছুন</button>
                </div>
            </div>
        </div>
    );
};
const toBanglaNumber = (num: any) => num?.toString() || '';
const processHtmlForNumbering = (html: any) => html;

const Editor = ({ value, onChange, placeholder }: any) => (
    <textarea 
        value={value} 
        onChange={e => onChange?.(e.target.value)} 
        placeholder={placeholder}
        className="w-full min-h-[150px] p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
    />
);
// ----------------------------------------

// --- RTK Query Polyfills for Edusy ---
const useGetInstitutesQuery = (...args: any[]) => ({ data: [] as any[], isLoading: false } as any);
const useGetResultSyncQuery = (insId?: string, options?: any) => {
  const [data, setData] = useState<any>({ classes: [], books: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (options?.skip || !insId) return;

    setIsLoading(true);
    Promise.all([
      fetch(`/api/admin/classes?instituteId=${insId}`).then(r => r.json()),
      fetch(`/api/admin/books?instituteId=${insId}`).then(r => r.json())
    ])
    .then(([cRes, bRes]) => {
       const classes = cRes.data || cRes.classes || cRes || [];
       let books = bRes.data || bRes.books || bRes || [];
       
       // Ensure books have a className mapped for Easy-Q logic
       books = books.map((b: any) => {
         const cls = classes.find((c: any) => c.id === b.classId);
         return { ...b, className: cls?.name || b.className };
       });

       setData({ classes, books });
       setIsLoading(false);
    })
    .catch(() => setIsLoading(false));
  }, [insId, options?.skip]);

  return { data: { data }, isLoading } as any;
};

const useGetClassDiariesQuery = (args?: any) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toggle, setToggle] = useState(false);
  const refetch = () => setToggle(prev => !prev);
  
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/class-diary')
      .then(res => res.json())
      .then(json => {
        setData(json.data);
        setIsLoading(false);
      });
  }, [args?.id, toggle]);
  
  return { data, isLoading, refetch } as any;
};

const useSaveClassDiaryMutation = () => {
  const saveDiary = (body: any) => {
    const promise = fetch('/api/class-diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(res => res.json());
    (promise as any).unwrap = () => promise;
    return promise as any;
  };
  return [saveDiary, { isLoading: false }] as const;
};

const useDeleteClassDiaryMutation = () => {
  const deleteDiary = (id: string) => {
    const promise = fetch(`/api/class-diary?id=${id}`, {
      method: 'DELETE'
    }).then(res => res.json());
    (promise as any).unwrap = () => promise;
    return promise as any;
  };
  return [deleteDiary, { isLoading: false }] as const;
};

let showToast: (msg: string, type: 'success' | 'error' | 'info') => void = () => {};

const toast = {
  success: (msg: string) => showToast(msg, 'success'),
  error: (msg: string) => showToast(msg, 'error'),
  info: (msg: string) => showToast(msg, 'info'),
  warning: (msg: string) => showToast(msg, 'info'),
  loading: (msg: string) => { showToast(msg, 'info'); return 1; },
  dismiss: (id?: any) => {},
};
// -------------------------------------

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

const formatShortBanglaDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = toBanglaNumber(d.getDate());
  const month = banglaMonths[d.getMonth()];
  const year = toBanglaNumber(d.getFullYear());
  return `${day} ${month} ${year}`;
};

const getWeekRange = (dateStr: string, startDay: "Saturday" | "Sunday") => {
  const d = new Date(dateStr);
  const day = d.getDay(); // Sunday is 0, Saturday is 6
  
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

const getDatesInRange = (startDate: string, endDate: string) => {
  const dates = [];
  let current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const updateEntriesForBook = (entries: any, date: string, className: string, bookId: string, logData: any, mode: "daily" | "weekly", startDay: "Saturday" | "Sunday") => {
  if (mode === "weekly") {
    const range = getWeekRange(date, startDay);
    const dates = getDatesInRange(range.start, range.end);
    
    if (!entries[range.start]) entries[range.start] = {};
    if (!entries[range.start][className]) entries[range.start][className] = {};
    entries[range.start][className][bookId] = logData;
    
    for (let i = 1; i < dates.length; i++) {
       const dStr = dates[i];
       if (entries[dStr]?.[className]?.[bookId]) {
           entries[dStr][className][bookId] = {};
       }
    }
  } else {
    if (!entries[date]) entries[date] = {};
    if (!entries[date][className]) entries[date][className] = {};
    entries[date][className][bookId] = logData;
  }
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

const getContrastColor = (hex: string) => {
  if (!hex) return 'black';
  if (hex.indexOf('#') === 0) hex = hex.slice(1);
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return 'black';
  const r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? 'black' : 'white';
};

const renderDiaryLine = (
  line: string,
  index: number,
  totalLines: number,
  isArabic: boolean,
  badge?: React.ReactNode,
  onDelete?: () => void,
  isPrintView?: boolean,
  bulletStyle?: string
) => {
  const isBangla = /[\u0980-\u09FF]/.test(line);
  const isArabicLine = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line);
  const alreadyHasNumber = /^[0-9০-৯٠-٩]+[.)]\s/.test(line.trim());

  let lineText = line;
  if (isPrintView && alreadyHasNumber) {
    lineText = line.replace(/^[0-9০-৯٠-٩]+[.)]\s/, '');
  }

  let numberStr = "";
  if (isPrintView) {
    numberStr = (bulletStyle || "•") + " ";
  } else if (!alreadyHasNumber) {
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

  if (isPrintView) {
    return (
      <span key={index} dir={dir} className={`inline mr-2 align-middle ${alignmentClass}`} style={{ lineHeight: 1.2 }}>
        {badge}
        <span className="font-bold text-black select-none align-middle mr-0.5">{numberStr}</span>
        <span 
          className="break-words align-middle text-black jodit-content"
          dangerouslySetInnerHTML={{ __html: lineText }}
        />
      </span>
    );
  }

  return (
    <div
      key={index}
      dir={dir}
      className={`group/line relative flex items-start gap-2 hover:bg-slate-50/50 rounded-lg transition-all w-full py-1 px-2 -mx-2 justify-between ${alignmentClass}`}
    >
      <div className="flex items-start gap-1.5 flex-1 min-w-0">
        {badge}
        <span className="shrink-0 mt-[2px] font-bold text-slate-400 select-none">{numberStr}</span>
        <span 
          className="flex-1 break-words jodit-content"
          dangerouslySetInnerHTML={{ __html: lineText }}
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

const getColorClasses = (color: string) => {
  const map: Record<string, { bg: string; text: string; border: string; ring: string; lightBg: string; activeBg: string; hoverBg: string }> = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'focus:ring-emerald-200', lightBg: 'bg-emerald-50', activeBg: 'bg-emerald-600 text-white shadow-emerald-200', hoverBg: 'hover:bg-emerald-50 text-emerald-700 border-emerald-200' },
    indigo: { bg: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-200', ring: 'focus:ring-indigo-200', lightBg: 'bg-indigo-50', activeBg: 'bg-indigo-600 text-white shadow-indigo-200', hoverBg: 'hover:bg-indigo-50 text-indigo-700 border-indigo-200' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', ring: 'focus:ring-amber-200', lightBg: 'bg-amber-50', activeBg: 'bg-amber-500 text-white shadow-amber-200', hoverBg: 'hover:bg-amber-50 text-amber-700 border-amber-200' },
    rose: { bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200', ring: 'focus:ring-rose-200', lightBg: 'bg-rose-50', activeBg: 'bg-rose-600 text-white shadow-rose-200', hoverBg: 'hover:bg-rose-50 text-rose-700 border-rose-200' },
    sky: { bg: 'bg-sky-500', text: 'text-sky-700', border: 'border-sky-200', ring: 'focus:ring-sky-200', lightBg: 'bg-sky-50', activeBg: 'bg-sky-600 text-white shadow-sky-200', hoverBg: 'hover:bg-sky-50 text-sky-700 border-sky-200' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200', ring: 'focus:ring-purple-200', lightBg: 'bg-purple-50', activeBg: 'bg-purple-600 text-white shadow-purple-200', hoverBg: 'hover:bg-purple-50 text-purple-700 border-purple-200' },
    teal: { bg: 'bg-teal-500', text: 'text-teal-700', border: 'border-teal-200', ring: 'focus:ring-teal-200', lightBg: 'bg-teal-50', activeBg: 'bg-teal-600 text-white shadow-teal-200', hoverBg: 'hover:bg-teal-50 text-teal-700 border-teal-200' },
    pink: { bg: 'bg-pink-500', text: 'text-pink-700', border: 'border-pink-200', ring: 'focus:ring-pink-200', lightBg: 'bg-pink-50', activeBg: 'bg-pink-600 text-white shadow-pink-200', hoverBg: 'hover:bg-pink-50 text-pink-700 border-pink-200' },
  };
  return map[color] || map.emerald;
};

export default function ClassDiaryPage() {
  const { activeInstitute: sessionActiveInstitute, user } = useSession();
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null);
  const [diaryMode, setDiaryMode] = useState<"daily" | "weekly">("daily");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [diaryIdToDelete, setDiaryIdToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeInputBookId, setActiveInputBookId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [inputLogType, setInputLogType] = useState<string>("cw");
  const [editingLine, setEditingLine] = useState<{ type: string; index: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(event.target as Node)) {
        setIsShareDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tempDiaryMode, setTempDiaryMode] = useState<"daily" | "weekly">("daily");
  const [tempWeekStartDay, setTempWeekStartDay] = useState("Saturday");
  const [tempWeeklyHolidays, setTempWeeklyHolidays] = useState<string[]>(["Friday"]);

  const handleOpenSettings = () => {
    if (!activeDiary) return;
    setTempDiaryMode(diaryMode);
    setTempWeekStartDay(activeDiary.weekStartDay || "Saturday");
    setTempWeeklyHolidays(activeDiary.weeklyHolidays || ["Friday"]);
    setIsSettingsModalOpen(true);
  };



  // Redux API Calls
  const institutes = user?.institutes || [];
  const isInsLoading = false;
  const { data: diaries, isLoading: isDiariesLoading, refetch: refetchDiaries } = useGetClassDiariesQuery();
  const [saveDiary, { isLoading: isSavingDiary }] = useSaveClassDiaryMutation();
  const [deleteDiary, { isLoading: isDeletingDiary }] = useDeleteClassDiaryMutation();

  // Scroll ref for chat body
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeInputBookId) {
      setTimeout(scrollToBottom, 100);
    }
  }, [diaries, activeInputBookId]);

  // Wizard state (Step 1)
  const [diaryName, setDiaryName] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [diaryType, setDiaryType] = useState("daily"); // daily, weekly, monthly
  const [selectedInsId, setSelectedInsId] = useState("");
  const [diaryTemplate, setDiaryTemplate] = useState("moleskine");

  // Auto-select the active institute by default
  useEffect(() => {
    if (sessionActiveInstitute?.id && !selectedInsId) {
      setSelectedInsId(sessionActiveInstitute.id);
    }
  }, [sessionActiveInstitute?.id, selectedInsId]);

  // Edit Diary State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDiary, setEditingDiary] = useState<any>(null);
  
  const [toastMsg, setToastMsg] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    showToast = (message, type) => {
      setToastMsg({ message, type });
    };
  }, []);
  const [editDiaryName, setEditDiaryName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editTemplate, setEditTemplate] = useState("moleskine");

  // Step 2 query (only active when step === 2 and selectedInsId is set)
  const { data: resultSyncData, isLoading: isResultLoading } = useGetResultSyncQuery(selectedInsId, {
    skip: !selectedInsId,
  });

  // Selected books configuration state: Record<className, Array<bookId>>
  const [selectedConfig, setSelectedConfig] = useState<Record<string, string[]>>({});

  // Active view parameters (Inside detailed view)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const [activeTabClass, setActiveTabClass] = useState<string>("");
  const [editingLogs, setEditingLogs] = useState<Record<string, Record<string, string>>>({});
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  // Share and QR states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [shareModalTab, setShareModalTab] = useState<"guardian" | "teacher">("guardian");

  // Teacher Share states
  const [showTeacherShareModal, setShowTeacherShareModal] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherConfig, setTeacherConfig] = useState<Record<string, string[]>>({});
  const [generatedTeacherLink, setGeneratedTeacherLink] = useState("");
  const [teacherLinkQr, setTeacherLinkQr] = useState("");
  const [activeTeacherClassTab, setActiveTeacherClassTab] = useState<string>("");

  // Holiday states
  const [holidayName, setHolidayName] = useState("");
  const [holidayStart, setHolidayStart] = useState(() => new Date().toISOString().split("T")[0]);
  const [holidayEnd, setHolidayEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"selectDate" | "addHoliday">("selectDate");
  const [showHolidayNameStep, setShowHolidayNameStep] = useState(false);
  const [teacherModalTab, setTeacherModalTab] = useState<"create" | "history">("create");
  const [activeHistoryQrId, setActiveHistoryQrId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [fullScreenQrUrl, setFullScreenQrUrl] = useState<string | null>(null);

  // Publish Time Modal states
  const [showPublishTimeModal, setShowPublishTimeModal] = useState(false);
  const [clockStep, setClockStep] = useState<"hour" | "minute">("hour");
  const [viewMode, setViewMode] = useState<"dynamic" | "print">("dynamic");
  
  // Print Setup states
  const [showPrintSetupModal, setShowPrintSetupModal] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    orientation: "portrait",
    pageSize: "A4",
    fontSize: 12,
    headerFontSize: 16,
    columnWidth: 20,
    dateColumnWidth: 18,
    spacing: 5,
    themeColor: "#059669",
    startDate: "",
    endDate: "",
    printClass: "",
    instNameFontSize: 32,
    instAddressFontSize: 16,
    instContactFontSize: 14,
    headerBreakLine: 2,
    classNameFontSize: 20,
    classNameSpacing: 3,
    bulletStyle: "✦",
    badgeFontSize: 10,
    badgePadding: 6,
    hideBlankSubjects: true,
    hideTypeBadges: false,
    hideEmptyCycles: true,
    layoutStyle: "header",
    hideMobile: false
  });
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [isPublishTimeEnabled, setIsPublishTimeEnabled] = useState(false);

  // Persist modes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDiaryMode = localStorage.getItem("easyq_diaryMode");
      if (savedDiaryMode === "daily" || savedDiaryMode === "weekly") {
        setDiaryMode(savedDiaryMode);
      }
      
      const savedViewMode = localStorage.getItem("easyq_viewMode");
      if (savedViewMode === "dynamic" || savedViewMode === "print") {
        setViewMode(savedViewMode);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("easyq_diaryMode", diaryMode);
    }
  }, [diaryMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("easyq_viewMode", viewMode);
    }
  }, [viewMode]);

  // Load selected diary detail
  const activeDiary = useMemo(() => {
    return diaries?.find((d: any) => d.id === selectedDiaryId);
  }, [diaries, selectedDiaryId]);

  const activeInstitute = useMemo(() => {
    return institutes?.find((i: any) => i.id === activeDiary?.instituteId || i._id === activeDiary?.instituteId);
  }, [institutes, activeDiary]);

  // Load configured classes for the active diary
  const activeDiaryClasses = useMemo(() => {
    const parsed = parseDiaryConfig(activeDiary?.config);
    if (!parsed || parsed.length === 0) return [];
    return parsed as Array<{ className: string; books: Array<{ id: string; name: string }> }>;
  }, [activeDiary]);

  // Persist printSettings to localStorage on change
  useEffect(() => {
    if (selectedDiaryId && printSettings) {
      localStorage.setItem(`easyq_printSettings_${selectedDiaryId}`, JSON.stringify(printSettings));
    }
  }, [printSettings, selectedDiaryId]);

  // Sync printSettings from database when active diary changes
  useEffect(() => {
    if (activeDiary) {
      if (activeDiary.printSettings) {
        setPrintSettings((prev: any) => ({
          ...prev,
          ...activeDiary.printSettings
        }));
      } else {
        const saved = localStorage.getItem(`easyq_printSettings_${activeDiary.id}`);
        if (saved) {
          try {
            setPrintSettings((prev: any) => ({
              ...prev,
              ...JSON.parse(saved)
            }));
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  }, [activeDiary?.id]);

  // Debounced save of printSettings to database
  useEffect(() => {
    if (!activeDiary || !printSettings) return;

    const activeSettings = activeDiary.printSettings || {};
    const isDifferent = Object.keys(printSettings).some(
      (key) => (printSettings as any)[key] !== (activeSettings as any)[key]
    );
    if (!isDifferent) return;

    const handler = setTimeout(() => {
      saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        printSettings: printSettings
      });
    }, 1500);

    return () => clearTimeout(handler);
  }, [printSettings, activeDiary, saveDiary]);

  const getLogsForCycle = (date: string, mode: "daily" | "weekly", diary?: any) => {
    const d = diary || activeDiary;
    if (!d) return {};
    const cycleLogs: Record<string, Record<string, string>> = {};

    let datesToFetch = [date];
    if (mode === "weekly") {
      const range = getWeekRange(date, d.weekStartDay || "Saturday");
      datesToFetch = getDatesInRange(range.start, range.end);
    }

    const classesList = parseDiaryConfig(d.config);
    classesList.forEach((c: any) => {
      c.books.forEach((b: any) => {
        const mergedLog: Record<string, string> = {};
        let isHidden = false;
        
        datesToFetch.forEach(dStr => {
           const entry = d.entries?.[dStr]?.[c.className]?.[b.id];
           if (entry) {
             if (entry.isHidden === true) {
               isHidden = true;
             }
             Object.keys(entry).forEach(key => {
               if (entry[key] && typeof entry[key] === 'string' && entry[key].trim() !== "") {
                  if (mergedLog[key]) {
                     mergedLog[key] += "\n" + entry[key].trim();
                  } else {
                     mergedLog[key] = entry[key].trim();
                  }
               }
             });
           }
        });

        if (isHidden) {
          (mergedLog as any).isHidden = true;
        }
        cycleLogs[`${c.className}:${b.id}`] = mergedLog;
      });
    });
    return cycleLogs;
  };

  const populateLogs = (date: string, mode: "daily" | "weekly", diary?: any) => {
    const initialLogs = getLogsForCycle(date, mode, diary);
    setEditingLogs(initialLogs);
  };

  useEffect(() => {
    if (selectedDiaryId && activeDiary) {
      if (diaryMode === "weekly") {
        const range = getWeekRange(selectedDate, activeDiary.weekStartDay || "Saturday");
        if (selectedDate !== range.start) {
          setSelectedDate(range.start);
        }
        populateLogs(range.start, "weekly", activeDiary);
      } else {
        populateLogs(selectedDate, "daily", activeDiary);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryMode]);

  const logTypes = useMemo(() => {
    const baseTypes = activeDiary?.logTypes || [
      { id: "cw", label: "CW (আজকের পড়া)", color: "emerald" },
      { id: "hw", label: "HW (বাড়ির কাজ)", color: "indigo" },
      { id: "test", label: "টেস্ট (Class Test)", color: "amber" },
      { id: "notice", label: "নোটিশ (Notice)", color: "rose" }
    ];
    if (!baseTypes.some((t: any) => t.id === "general")) {
      return [{ id: "general", label: "সাধারণ", color: "slate" }, ...baseTypes];
    }
    return baseTypes;
  }, [activeDiary]);

  // Custom log type modal state
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("emerald");

  useEffect(() => {
    if (activeInputBookId && inputLogType) {
      const el = document.getElementById(`pill-${inputLogType}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }, 100);
      }
    }
  }, [inputLogType, activeInputBookId, logTypes.length]);

  useEffect(() => {
    if (activeInputBookId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [activeInputBookId]);

  // Filter synced books by selected class name
  const filteredBooks = useMemo(() => {
    if (!resultSyncData?.data?.books) return [];
    return resultSyncData.data.books;
  }, [resultSyncData]);

  const syncedClasses = useMemo(() => {
    return resultSyncData?.data?.classes || [];
  }, [resultSyncData]);

  // Handle opening wizard modal
  const handleOpenCreateModal = () => {
    setStep(1);
    setDiaryName("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setDiaryType("daily");
    setSelectedInsId(sessionActiveInstitute?.id || institutes?.[0]?.id || "");
    setSelectedConfig({});
    setDiaryTemplate("moleskine");
    setIsCreateModalOpen(true);
  };

  // Move to Step 2
  const handleNextStep = () => {
    if (!diaryName.trim()) {
      toast.error("অনুগ্রহ করে ডায়েরির নাম লিখুন!");
      return;
    }
    if (!selectedInsId) {
      toast.error("অনুগ্রহ করে প্রতিষ্ঠান সিলেক্ট করুন!");
      return;
    }
    setStep(2);
  };

  // Handle toggling book selection in Step 2
  const handleToggleBook = (className: string, bookId: string) => {
    setSelectedConfig((prev) => {
      const currentList = prev[className] || [];
      const updatedList = currentList.includes(bookId)
        ? currentList.filter((id) => id !== bookId)
        : [...currentList, bookId];

      return {
        ...prev,
        [className]: updatedList,
      };
    });
  };

  // Handle toggling all books for a class in Step 2
  const handleToggleClassAllBooks = (className: string, classBooks: any[]) => {
    const bookIds = classBooks.map((b) => b.id);
    const currentList = selectedConfig[className] || [];
    const allSelected = bookIds.length > 0 && bookIds.every((id) => currentList.includes(id));

    setSelectedConfig((prev) => ({
      ...prev,
      [className]: allSelected ? [] : bookIds,
    }));
  };

  // Submit Diary Config Creation
  const handleCreateSubmit = async () => {
    // Check if any books are selected
    const hasSelection = Object.values(selectedConfig).some((list) => list.length > 0);
    if (!hasSelection) {
      toast.error("অনুগ্রহ করে অন্তত ১টি ক্লাসের বই সিলেক্ট করুন!");
      return;
    }

    // Prepare config layout: Array of { className, books: Array<{ id, name }> }
    const configData: Array<{ className: string; books: Array<{ id: string; name: string }> }> = [];

    Object.entries(selectedConfig).forEach(([className, bookIds]) => {
      if (bookIds.length === 0) return;
      const classBooks = bookIds.map((id) => {
        const fullBook = filteredBooks.find((b: any) => b.id === id);
        return {
          id,
          name: fullBook?.name || "Unknown Book",
        };
      });
      configData.push({ className, books: classBooks });
    });

    try {
      await saveDiary({
        name: diaryName,
        startDate,
        type: diaryType,
        instituteId: selectedInsId,
        userId: user?.id,
        config: configData,
        entries: { _meta: { coverTemplate: diaryTemplate } },
      }).unwrap();

      toast.success("নতুন ডায়েরি সফলভাবে তৈরি হয়েছে!");
      setIsCreateModalOpen(false);
      refetchDiaries();
    } catch (err: any) {
      toast.error(err.message || "ডায়েরি তৈরি করতে সমস্যা হয়েছে");
    }
  };

  // Edit Diary handlers
  const handleEditDiary = (diary: any) => {
    setEditingDiary(diary);
    setEditDiaryName(diary.name || "");
    setEditStartDate(diary.startDate || new Date().toISOString().split("T")[0]);
    setEditTemplate(diary.entries?._meta?.coverTemplate || diary.coverTemplate || "moleskine");
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editDiaryName.trim()) {
      toast.error("অনুগ্রহ করে ডায়েরির নাম লিখুন!");
      return;
    }
    try {
      await saveDiary({
        ...editingDiary,
        name: editDiaryName,
        startDate: editStartDate,
        entries: {
          ...editingDiary.entries,
          _meta: {
            ...(editingDiary.entries?._meta || {}),
            coverTemplate: editTemplate,
          }
        }
      }).unwrap();
      toast.success("ডায়েরি সফলভাবে আপডেট হয়েছে!");
      setIsEditModalOpen(false);
      refetchDiaries();
    } catch (err: any) {
      toast.error(err.message || "ডায়েরি আপডেট করতে সমস্যা হয়েছে");
    }
  };

  const handleOpenDiaryDetails = (diary: any) => {
    setSelectedDiaryId(diary.id);
    setIsEditing(false);
    setActiveInputBookId(null);
    setInputText("");
    const classesList = parseDiaryConfig(diary.config);
    if (classesList.length > 0) {
      setActiveTabClass(classesList[0].className);
    }
    
    let targetDate = selectedDate;
    if (diaryMode === "weekly") {
      const range = getWeekRange(selectedDate, diary.weekStartDay || "Saturday");
      targetDate = range.start;
      setSelectedDate(targetDate);
    }
    populateLogs(targetDate, diaryMode, diary);
  };

  // Handle changing dates in detailed view
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setIsEditing(false);
    setActiveInputBookId(null);
    setInputText("");
    populateLogs(newDate, diaryMode);
  };

  // Change individual input inside tabular logs
  const handleLogInputChange = (className: string, bookId: string, field: string, value: string) => {
    const key = `${className}:${bookId}`;
    setEditingLogs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  // Revert changes and exit edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    if (!activeDiary) return;
    const initialLogs: Record<string, Record<string, string>> = {};
    activeDiaryClasses.forEach((c: any) => {
      c.books.forEach((b: any) => {
        const entry = activeDiary.entries?.[selectedDate]?.[c.className]?.[b.id] || {};
        initialLogs[`${c.className}:${b.id}`] = entry;
      });
    });
    setEditingLogs(initialLogs);
  };

  // Toggle instant message input bar for subject row
  const handleToggleInputBar = (bookId: string) => {
    if (activeInputBookId === bookId) {
      setActiveInputBookId(null);
      setInputText("");
    } else {
      setActiveInputBookId(bookId);
      setInputText("");
      setInputLogType(logTypes[0]?.id || "cw");
    }
  };

  // Instant send via WhatsApp-like messaging UI
  const handleSendWhatsAppLog = async (bookId: string) => {
    if (!activeDiary || !inputText || inputText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim() === '') return;

    const key = `${activeTabClass}:${bookId}`;
    const currentLog = editingLogs[key] || {};

    let updatedLog;
    if (editingLine) {
      if (editingLine.index === -1) {
        // Replace the whole type value
        updatedLog = {
          ...currentLog,
          [editingLine.type]: inputText.trim(),
        };
      } else {
        const lines = (currentLog[editingLine.type] || "").split("\n").filter((line: string) => line.trim() !== "");
        if (editingLine.index >= 0 && editingLine.index < lines.length) {
          lines[editingLine.index] = inputText.trim();
        }
        updatedLog = {
          ...currentLog,
          [editingLine.type]: lines.join("\n"),
        };
      }
    } else {
      const existingValue = (currentLog[inputLogType] || "").trim();
      const updatedValue = existingValue
        ? `${existingValue}\n${inputText.trim()}`
        : inputText.trim();
      updatedLog = {
        ...currentLog,
        [inputLogType]: updatedValue,
      };
    }

    setEditingLogs((prev) => ({
      ...prev,
      [key]: updatedLog,
    }));

    const currentEntries = JSON.parse(JSON.stringify(activeDiary.entries || {}));
    updateEntriesForBook(currentEntries, selectedDate, activeTabClass, bookId, updatedLog, diaryMode, activeDiary.weekStartDay || "Saturday");

    const targetDates = diaryMode === "weekly"
      ? (() => {
          const range = getWeekRange(selectedDate, activeDiary.weekStartDay || "Saturday");
          return getDatesInRange(range.start, range.end);
        })()
      : [selectedDate];

    try {
      await saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        config: activeDiary.config,
        entries: currentEntries,
        targetClass: activeTabClass,
        targetDates,
      }).unwrap();

      toast.success(editingLine ? "পাঠ সফলভাবে আপডেট করা হয়েছে!" : "আজকের পাঠ সফলভাবে যোগ করা হয়েছে!");
      setInputText("");
      setEditingLine(null);
      refetchDiaries();
    } catch (err: any) {
      toast.error(err.message || "সংরক্ষণ করতে ব্যর্থ হয়েছে");
    }
  };

  const handleAddCustomType = async () => {
    if (!newTypeLabel.trim() || !activeDiary) return;
    const newType = {
      id: `custom_${Date.now()}`,
      label: newTypeLabel.trim(),
      color: newTypeColor,
    };
    const updatedLogTypes = [...logTypes, newType];
    
    try {
      await saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        config: activeDiary.config,
        logTypes: updatedLogTypes,
        entries: activeDiary.entries || {},
      }).unwrap();
      
      setInputLogType(newType.id);
      setIsAddTypeModalOpen(false);
      setNewTypeLabel("");
    } catch (err: any) {
      toast.error(err.data?.error || "নতুন টাইপ সেভ করতে ব্যর্থ হয়েছে!");
    }
  };

  // Instant delete log item via click in View Mode
  const handleDeleteLogItem = async (bookId: string, field: string) => {
    if (!activeDiary) return;

    const key = `${activeTabClass}:${bookId}`;
    const currentLog = editingLogs[key] || {};

    const updatedLog = {
      ...currentLog,
      [field]: "",
    };

    setEditingLogs((prev) => ({
      ...prev,
      [key]: updatedLog,
    }));

    const currentEntries = JSON.parse(JSON.stringify(activeDiary.entries || {}));
    updateEntriesForBook(currentEntries, selectedDate, activeTabClass, bookId, updatedLog, diaryMode, activeDiary.weekStartDay || "Saturday");

    const targetDates = diaryMode === "weekly"
      ? (() => {
          const range = getWeekRange(selectedDate, activeDiary.weekStartDay || "Saturday");
          return getDatesInRange(range.start, range.end);
        })()
      : [selectedDate];

    try {
      await saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        config: activeDiary.config,
        entries: currentEntries,
        targetClass: activeTabClass,
        targetDates,
      }).unwrap();

      toast.success("পাঠের তথ্য মুছে ফেলা হয়েছে!");
      refetchDiaries();
    } catch (err: any) {
      toast.error(err.message || "মুছে ফেলতে ব্যর্থ হয়েছে");
    }
  };

  // Instant delete single line of log item via click
  const handleDeleteLogLine = async (bookId: string, field: string, lineIndex: number) => {
    if (!activeDiary) return;

    const key = `${activeTabClass}:${bookId}`;
    const currentLog = editingLogs[key] || {};

    const fieldValue = currentLog[field] || "";
    const isHtml = /<[a-z][\s\S]*>/i.test(fieldValue);

    let updatedValue: string;
    if (isHtml || lineIndex === -1) {
      // For HTML content or special index -1, clear the whole field
      updatedValue = "";
    } else {
      const lines = fieldValue.split("\n").filter(line => line.trim() !== "");
      lines.splice(lineIndex, 1);
      updatedValue = lines.join("\n");
    }

    const updatedLog = {
      ...currentLog,
      [field]: updatedValue,
    };

    setEditingLogs((prev) => ({
      ...prev,
      [key]: updatedLog,
    }));

    const currentEntries = JSON.parse(JSON.stringify(activeDiary.entries || {}));
    updateEntriesForBook(currentEntries, selectedDate, activeTabClass, bookId, updatedLog, diaryMode, activeDiary.weekStartDay || "Saturday");

    const targetDates = diaryMode === "weekly"
      ? (() => {
          const range = getWeekRange(selectedDate, activeDiary.weekStartDay || "Saturday");
          return getDatesInRange(range.start, range.end);
        })()
      : [selectedDate];

    try {
      await saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        config: activeDiary.config,
        entries: currentEntries,
        targetClass: activeTabClass,
        targetDates,
      }).unwrap();

      toast.success("সফলভাবে মুছে ফেলা হয়েছে!");
      refetchDiaries();
    } catch (err: any) {
      toast.error(err.message || "মুছে ফেলতে ব্যর্থ হয়েছে");
    }
  };

  // Save changes to database
  const handleSaveDiaryLogs = async () => {
    if (!activeDiary) return;

    // Build updated entries object
    const currentEntries = JSON.parse(JSON.stringify(activeDiary.entries || {}));

    // Merge changes
    const activeClassConfig = activeDiaryClasses.find((c) => c.className === activeTabClass);
    if (activeClassConfig) {
      activeClassConfig.books.forEach((b) => {
        const logData = editingLogs[`${activeTabClass}:${b.id}`] || {};
        updateEntriesForBook(currentEntries, selectedDate, activeTabClass, b.id, logData, diaryMode, activeDiary.weekStartDay || "Saturday");
      });
    }

    const targetDates = diaryMode === "weekly"
      ? (() => {
          const range = getWeekRange(selectedDate, activeDiary.weekStartDay || "Saturday");
          return getDatesInRange(range.start, range.end);
        })()
      : [selectedDate];

    try {
      await saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        config: activeDiary.config,
        entries: currentEntries,
        targetClass: activeTabClass,
        targetDates,
      }).unwrap();

      toast.success("আজকের পাঠ ডায়েরি সফলভাবে সংরক্ষণ করা হয়েছে!");
      setIsEditing(false);
      refetchDiaries();
    } catch (err: any) {
      toast.error(err.message || "সংরক্ষণ করতে ব্যর্থ হয়েছে");
    }
  };

  // Delete Diary click handler
  const handleDeleteDiary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiaryIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!diaryIdToDelete) return;
    try {
      await deleteDiary(diaryIdToDelete).unwrap();
      toast.success("ডায়েরি সফলভাবে মুছে ফেলা হয়েছে!");
      if (selectedDiaryId === diaryIdToDelete) {
        setSelectedDiaryId(null);
      }
      refetchDiaries();
    } catch (err: any) {
      toast.error(err.message || "মুছে ফেলা ব্যর্থ হয়েছে");
    } finally {
      setIsDeleteModalOpen(false);
      setDiaryIdToDelete(null);
    }
  };

  // Share portal links
  const handleOpenShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeDiary) return;
    const origin = window.location.origin;
    const url = `${origin}/share/class-diary?id=${activeDiary.id}&date=${selectedDate}`;
    setShareUrl(url);
    // Google QR generator API is extremely reliable
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
    setQrUrl(qr);
    setShowShareModal(true);
  };

  // Open Teacher Share modal
  const handleOpenTeacherShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeDiary) return;
    setTeacherName("");
    setTeacherConfig({});
    setGeneratedTeacherLink("");
    setTeacherLinkQr("");
    const classes = parseDiaryConfig(activeDiary.config) as Array<{ className: string; books: any[] }>;
    setActiveTeacherClassTab(classes?.[0]?.className || "");
    setShowTeacherShareModal(true);
  };

  // Toggle a book in the teacher config
  const handleToggleTeacherBook = (className: string, bookId: string) => {
    setTeacherConfig((prev) => {
      const current = prev[className] || [];
      const updated = current.includes(bookId)
        ? current.filter((id) => id !== bookId)
        : [...current, bookId];
      return { ...prev, [className]: updated };
    });
    // Reset generated link on change
    setGeneratedTeacherLink("");
    setTeacherLinkQr("");
  };

  // Toggle all books for a teacher class
  const handleToggleTeacherClass = (className: string, books: any[]) => {
    const bookIds = books.map((b) => b.id);
    const current = teacherConfig[className] || [];
    const allSelected = bookIds.length > 0 && bookIds.every((id) => current.includes(id));
    setTeacherConfig((prev) => ({ ...prev, [className]: allSelected ? [] : bookIds }));
    setGeneratedTeacherLink("");
    setTeacherLinkQr("");
  };

  // Generate or Update the teacher link
  const handleGenerateTeacherLink = async () => {
    if (!activeDiary) return;
    if (!teacherName.trim()) {
      toast.error("অনুগ্রহ করে শিক্ষকের নাম লিখুন!");
      return;
    }
    const hasSelection = Object.values(teacherConfig).some((list) => list.length > 0);
    if (!hasSelection) {
      toast.error("অনুগ্রহ করে অন্তত একটি শ্রেণীর বিষয় নির্বাচন করুন!");
      return;
    }
    // Only include classes with at least one book
    const filteredConfig: Record<string, string[]> = {};
    Object.entries(teacherConfig).forEach(([cls, books]) => {
      if (books.length > 0) filteredConfig[cls] = books;
    });
    const linkId = editingLinkId || Date.now().toString();
    const origin = window.location.origin;
    const url = `${origin}/share/class-diary/teacher?id=${activeDiary.id}&tId=${linkId}`;
    setGeneratedTeacherLink(url);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
    setTeacherLinkQr(qr);

    // Save history
    const newLinkData = {
      id: linkId,
      name: teacherName.trim(),
      url,
      qr,
      config: filteredConfig,
      createdAt: new Date().toISOString(),
    };

    let updatedLinks;
    if (editingLinkId) {
      updatedLinks = (activeDiary.teacherLinks || []).map((l: any) => {
        if (l.id === editingLinkId) {
          return { ...l, name: newLinkData.name, url: newLinkData.url, qr: newLinkData.qr };
        }
        return l;
      });
    } else {
      updatedLinks = [...(activeDiary.teacherLinks || []), newLinkData];
    }

    try {
      await saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        config: activeDiary.config,
        entries: activeDiary.entries,
        holidays: activeDiary.holidays,
        teacherLinks: updatedLinks,
      }).unwrap();
      refetchDiaries();
      if (editingLinkId) toast.success("লিঙ্ক আপডেট করা হয়েছে!");
    } catch (err) {
      console.error("Failed to save teacher link history", err);
    }
  };

  // Copy teacher link
  const handleCopyTeacherLink = () => {
    navigator.clipboard.writeText(generatedTeacherLink);
    toast.success("শিক্ষক শেয়ারিং লিঙ্ক কপি হয়েছে!");
  };

  // Copy shareable link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("অভিভাবক শেয়ারিং লিঙ্ক কপি হয়েছে!");
  };

  // Trigger page print
  const handlePrintDiary = () => {
    window.print();
  };

  // Save a new holiday
  const handleSaveHoliday = async () => {
    if (!activeDiary) return;
    if (!holidayName.trim()) { toast.error("ছুটির নাম লিখুন!"); return; }
    if (holidayStart > holidayEnd) { toast.error("শুরুর তারিখ শেষের তারিখের পরে হতে পারে না!"); return; }
    setIsSavingHoliday(true);
    const newHoliday: Holiday = {
      id: Date.now().toString(),
      name: holidayName.trim(),
      startDate: holidayStart,
      endDate: holidayEnd,
    };
    const updatedHolidays = [...(activeDiary.holidays || []), newHoliday];
    try {
      await saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        config: activeDiary.config,
        entries: activeDiary.entries,
        holidays: updatedHolidays,
      }).unwrap();
      toast.success("ছুটি সফলভাবে যোগ হয়েছে!");
      setHolidayName("");
      setHolidayStart(new Date().toISOString().split("T")[0]);
      setHolidayEnd(new Date().toISOString().split("T")[0]);
      setShowHolidayNameStep(false);
      setCalendarMode("selectDate");
      refetchDiaries();
    } catch { toast.error("ছুটি সংরক্ষণ করা যায়নি।"); }
    finally { setIsSavingHoliday(false); }
  };

  // Delete a holiday by id
  const handleDeleteHoliday = async (hId: string) => {
    if (!activeDiary) return;
    const updatedHolidays = (activeDiary.holidays || []).filter((h: Holiday) => h.id !== hId);
    try {
      await saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        config: activeDiary.config,
        entries: activeDiary.entries,
        holidays: updatedHolidays,
      }).unwrap();
      toast.success("ছুটি মুছে ফেলা হয়েছে!");
      refetchDiaries();
    } catch { toast.error("মুছে ফেলা যায়নি।"); }
  };

  // Save Publish Time
  const handleSavePublishTime = async () => {
    if (!activeDiary) return;

    let timeStr: string | null = null;
    if (isPublishTimeEnabled) {
      const formattedHour = (period === "PM" && selectedHour !== 12)
        ? selectedHour + 12
        : (period === "AM" && selectedHour === 12) ? 0 : selectedHour;
      timeStr = `${String(formattedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;
    }

    try {
      await saveDiary({
        id: activeDiary.id,
        name: activeDiary.name,
        startDate: activeDiary.startDate,
        type: activeDiary.type,
        instituteId: activeDiary.instituteId,
        config: activeDiary.config,
        entries: activeDiary.entries,
        holidays: activeDiary.holidays,
        teacherLinks: activeDiary.teacherLinks,
        publishTime: timeStr,
      }).unwrap();
      toast.success(timeStr ? "পাবলিশ সময় সংরক্ষণ করা হয়েছে!" : "পাবলিশ সময় বন্ধ করা হয়েছে!");
      setShowPublishTimeModal(false);
      refetchDiaries();
    } catch {
      toast.error("সময় সংরক্ষণ করা যায়নি।");
    }
  };

  // Active Class Tab books
  const activeClassBooks = useMemo(() => {
    return activeDiaryClasses.find((c) => c.className === activeTabClass)?.books || [];
  }, [activeDiaryClasses, activeTabClass]);

  useEffect(() => {
    if (activeClassBooks.length > 0) {
      setActiveSubjectId("all");
    } else {
      setActiveSubjectId(null);
    }
  }, [activeClassBooks]);

  const filteredDiaries = diaries?.filter((d: any) => 
    !searchQuery.trim() || d.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="w-full px-2 py-4 md:px-6 md:py-8 print:p-0 print:m-0">
      {!selectedDiaryId ? (
        // DASHBOARD INITIAL / SUMMARY VIEW
        <div className="flex flex-col gap-6 print:hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
              <input
                type="text"
                placeholder="ডায়েরি খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 py-3 pl-12 pr-4 text-sm text-gray-800 dark:text-gray-200 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-violet-700 active:scale-95 whitespace-nowrap"
            >
              <FiPlus className="h-5 w-5" />
              <span>নতুন ডায়েরি তৈরি করুন</span>
            </button>
          </div>

          {isDiariesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 sm:gap-6 md:gap-8 justify-items-center sm:justify-items-start">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`diary-skeleton-${idx}`} className="w-full max-w-[280px] aspect-[1/1.45] rounded-r-[16px] rounded-l-[6px] bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 animate-pulse relative shadow-[2px_2px_10px_rgba(0,0,0,0.05)] dark:shadow-none">
                  {/* Spine placeholder */}
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-200/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700"></div>
                  {/* Content layout skeleton */}
                  <div className="ml-8 p-6 flex flex-col h-full justify-between">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDiaries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 sm:gap-6 md:gap-8 justify-items-center sm:justify-items-start">
              {filteredDiaries.map((diary: any) => {
                const parsedConfig = parseDiaryConfig(diary.config);
                const totalClasses = parsedConfig.length;
                const template = diary.entries?._meta?.coverTemplate || diary.coverTemplate || "moleskine";
                const templateType = template.startsWith("spiral") ? "spiral" : "moleskine";
                const templateColor = template.split("-")[1] || "default";

                let moleskineBg = "bg-[#f4f1ea] border-slate-300";
                let moleskineSpine = "bg-slate-800/15 border-slate-800/20";
                let moleskineBand = "bg-slate-800";
                const isDarkMoleskine = templateColor !== "default";
                
                if (templateColor === "blue") {
                  moleskineBg = "bg-slate-800 border-slate-900";
                  moleskineSpine = "bg-black/20 border-black/30";
                  moleskineBand = "bg-black";
                } else if (templateColor === "green") {
                  moleskineBg = "bg-emerald-800 border-emerald-900";
                  moleskineSpine = "bg-black/20 border-black/30";
                  moleskineBand = "bg-emerald-950";
                } else if (templateColor === "red") {
                  moleskineBg = "bg-rose-800 border-rose-900";
                  moleskineSpine = "bg-black/20 border-black/30";
                  moleskineBand = "bg-rose-950";
                }

                let spiralBg = "bg-[#0073a8] border-[#005f8a]";
                if (templateColor === "teal") { spiralBg = "bg-teal-600 border-teal-700"; }
                else if (templateColor === "rose") { spiralBg = "bg-rose-600 border-rose-700"; }
                else if (templateColor === "slate") { spiralBg = "bg-slate-700 border-slate-800"; }

                return (
                  <div key={diary.id} className="w-full min-w-0 flex justify-center">
                    {templateType === "moleskine" ? (
                      <div
                        onClick={() => handleOpenDiaryDetails(diary)}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-r-[16px] rounded-l-[6px] shadow-[4px_4px_20px_rgba(0,0,0,0.12),-2px_0px_8px_rgba(0,0,0,0.05)] hover:shadow-[8px_8px_25px_rgba(0,0,0,0.18),-2px_0px_10px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer border-r border-t border-b border-l-0 aspect-[1/1.45] w-full max-w-[280px] ${moleskineBg}`}
                      >
                        {/* Spine / Binding */}
                        <div className={`absolute left-0 top-0 bottom-0 w-8 border-r z-10 flex justify-center ${moleskineSpine}`}>
                          <div className="w-[1px] h-full bg-black/10 shadow-[1px_0_0_rgba(255,255,255,0.4)]"></div>
                        </div>

                        {/* Elastic Band */}
                        <div className={`absolute right-5 top-0 bottom-0 w-2.5 shadow-[inset_1px_0_2px_rgba(0,0,0,0.6),-1px_0_3px_rgba(0,0,0,0.2)] z-10 ${moleskineBand}`}></div>

                        {/* Bookmark Ribbon */}
                        <div 
                          className="absolute right-12 top-0 w-4 h-14 bg-rose-600 z-10 shadow-[0_2px_5px_rgba(0,0,0,0.2)] group-hover:h-16 transition-all duration-300 origin-top" 
                          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }}
                        ></div>

                        {/* Content Area */}
                        <div className="ml-8 p-6 flex-1 flex flex-col relative z-20">
                          <div className="flex justify-start items-start mb-4">
                            <span className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border shadow-sm ${isDarkMoleskine ? "text-white border-white/20 bg-black/20" : "text-slate-600 border-slate-300 bg-white/90"}`}>
                              {diary.type === "daily" ? "দৈনিক" : diary.type === "weekly" ? "সাপ্তাহিক" : "মাসিক"}
                            </span>
                          </div>

                          <div className="flex-1 flex flex-col items-center justify-center py-4 text-center mr-4">
                            <div className={`w-8 h-[2px] mb-4 rounded-full ${isDarkMoleskine ? "bg-white/30" : "bg-slate-400"}`}></div>
                            <h2 className={`text-base sm:text-xl font-extrabold tracking-wide leading-snug line-clamp-3 drop-shadow-sm ${isDarkMoleskine ? "text-white" : "text-slate-900"}`}>
                              {diary.name}
                            </h2>
                            <div className={`w-8 h-[2px] mt-4 rounded-full ${isDarkMoleskine ? "bg-white/30" : "bg-slate-400"}`}></div>
                          </div>

                          <div className={`mt-auto flex flex-col gap-4 mr-4 text-xs font-semibold ${isDarkMoleskine ? "text-white/80" : "text-slate-600"}`}>
                            <div className="flex flex-col gap-2.5">
                              <div className="flex items-center gap-3">
                                <FiCalendar className="h-4 w-4" />
                                <span className="truncate">{formatBanglaDate(diary.startDate)}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <FiBook className="h-4 w-4" />
                                <span>শ্রেণী: {toBanglaNumber(totalClasses)} টি</span>
                              </div>
                            </div>

                            <div className={`flex items-center justify-between pt-4 border-t ${isDarkMoleskine ? "border-white/20" : "border-slate-300"}`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteDiary(diary.id, e); }}
                                className={`rounded-lg p-2.5 transition-colors ${isDarkMoleskine ? "bg-black/20 text-white/80 hover:bg-rose-500/80 hover:text-white" : "bg-slate-200 text-slate-600 hover:bg-rose-100 hover:text-rose-600"}`}
                                title="ডায়েরি মুছুন"
                              >
                                <FiTrash2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditDiary(diary); }}
                                className={`rounded-lg p-2.5 transition-colors ${isDarkMoleskine ? "bg-black/20 text-white/80 hover:bg-black/40 hover:text-white" : "bg-slate-200 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600"}`}
                                title="ডায়েরি আপডেট করুন"
                              >
                                <FiEdit2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleOpenDiaryDetails(diary)}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-r-[16px] rounded-l-[6px] shadow-[4px_4px_15px_rgba(0,0,0,0.15),-2px_0px_5px_rgba(0,0,0,0.05)] hover:shadow-[8px_8px_25px_rgba(0,0,0,0.2),-2px_0px_8px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-l-0 aspect-[1/1.45] w-full max-w-[280px] ${spiralBg}`}
                      >
                        {/* Spiral Binding */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-evenly py-4 z-20 bg-black/10 border-r border-black/20">
                          {[...Array(12)].map((_, i) => (
                            <div key={i} className="flex w-full items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-200 shadow-inner -ml-1 border border-gray-400"></div>
                              <div className="h-2 flex-1 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-400 rounded-r-full shadow-sm ml-[-2px] border-y border-r border-gray-400/50"></div>
                            </div>
                          ))}
                        </div>

                        {/* Spine Highlight */}
                        <div className="absolute left-8 top-0 bottom-0 w-4 bg-white/10 z-10"></div>

                        {/* Content Area */}
                        <div className="ml-8 p-6 flex-1 flex flex-col relative z-30">
                          <div className="flex justify-between items-start mb-4">
                            <span className="rounded px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-widest border border-white/20 bg-black/20 backdrop-blur-sm">
                              {diary.type === "daily" ? "দৈনিক" : diary.type === "weekly" ? "সাপ্তাহিক" : "মাসিক"}
                            </span>
                            <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white shadow-sm">
                              <FiBookOpen className="h-4 w-4" />
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col items-center justify-center py-4 text-center mr-2 pl-2">
                            <h2 className="text-base sm:text-xl font-bold text-white tracking-wide leading-snug line-clamp-3 drop-shadow-sm">
                              {diary.name}
                            </h2>
                          </div>

                          <div className="mt-auto flex flex-col gap-4 mr-2">
                            <div className="flex flex-col gap-2.5 text-xs font-semibold text-blue-100 pl-2">
                              <div className="flex items-center gap-3">
                                <FiCalendar className="h-4 w-4 text-white/80" />
                                <span className="truncate">{formatBanglaDate(diary.startDate)}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <FiBook className="h-4 w-4 text-white/80" />
                                <span>শ্রেণী: {toBanglaNumber(totalClasses)} টি</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/20 pl-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteDiary(diary.id, e); }}
                                className="rounded-lg p-2.5 bg-white/10 text-white/80 hover:bg-rose-500/80 hover:text-white transition-colors"
                                title="ডায়েরি মুছুন"
                              >
                                <FiTrash2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditDiary(diary); }}
                                className="rounded-lg p-2.5 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                title="ডায়েরি আপডেট করুন"
                              >
                                <FiEdit2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 py-20 text-center shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400">
                <FiBookOpen className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-700 dark:text-gray-300">কোন ডায়েরি তৈরি করা হয়নি!</h3>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">উপরের বোতামে ক্লিক করে নতুন ডায়েরি তৈরি করুন।</p>
            </div>
          )}
        </div>
      ) : null}

      {/* DIARY DETAIL VIEW */}
      {selectedDiaryId && activeDiary && activeInstitute && (
        <AdminDiaryDetailedView
          diary={activeDiary}
          instituteName={activeInstitute.name || ""}
          initialDate={selectedDate}
          onBack={() => { setSelectedDiaryId(null); setIsEditing(false); }}
          onSave={async (updatedEntries: any, updatedLogTypes?: any, targetClass?: string | string[], targetDates?: string[], updatedConfig?: any) => {
            try {
              await saveDiary({
                id: activeDiary.id,
                instituteId: activeDiary.instituteId,
                name: activeDiary.name,
                startDate: activeDiary.startDate,
                type: activeDiary.type,
                config: updatedConfig || activeDiary.config,
                holidays: activeDiary.holidays,
                teacherLinks: activeDiary.teacherLinks,
                publishTime: activeDiary.publishTime,
                coverTemplate: activeDiary.coverTemplate,
                entries: updatedEntries,
                targetClass,
                targetDates,
                ...(updatedLogTypes ? { logTypes: updatedLogTypes } : { logTypes: activeDiary.logTypes })
              }).unwrap();
            } catch (error) {
              throw new Error("Failed to save via Redux");
            }
          }}
          diaryMode={diaryMode}
          onLoadDefaultConfig={async () => {
            if (!activeDiary?.instituteId) {
              toast.error("প্রতিষ্ঠান নির্বাচন করা নেই!");
              return;
            }
            const toastId = toast.loading("ডিফল্ট শ্রেণী লোড হচ্ছে...");
            try {
              const [cRes, bRes] = await Promise.all([
                fetch(`/api/admin/classes?instituteId=${activeDiary.instituteId}`).then(r => r.json()),
                fetch(`/api/admin/books?instituteId=${activeDiary.instituteId}`).then(r => r.json())
              ]);
              const classes = cRes.data || cRes.classes || cRes || [];
              const books = bRes.data || bRes.books || bRes || [];

              if (classes.length === 0) {
                toast.error("প্রতিষ্ঠান থেকে ডেটা লোড করা সম্ভব হয়নি!");
                toast.dismiss(toastId);
                return;
              }

              const configData: Array<{ className: string; books: Array<{ id: string; name: string }> }> = [];
              classes.forEach((cls: any) => {
                const classBooks = books.filter((b: any) => b.classId === cls.id);
                if (classBooks.length > 0) {
                  configData.push({
                    className: cls.name,
                    books: classBooks.map((b: any) => ({ id: b.id, name: b.name }))
                  });
                }
              });
              
              if (configData.length === 0) {
                toast.error("প্রতিষ্ঠানে কোনো শ্রেণী বা বিষয় যুক্ত করা নেই!");
                toast.dismiss(toastId);
                return;
              }

              await saveDiary({
                id: activeDiary.id,
                name: activeDiary.name,
                startDate: activeDiary.startDate,
                type: activeDiary.type,
                instituteId: activeDiary.instituteId,
                config: configData,
              }).unwrap();
              
              toast.dismiss(toastId);
              toast.success("সকল শ্রেণী ও বিষয় সফলভাবে যুক্ত হয়েছে!");
              refetchDiaries();
            } catch (err: any) {
              toast.dismiss(toastId);
              toast.error(err.message || "শ্রেণী লোড করতে ব্যর্থ হয়েছে");
            }
          }}
          headerActions={
            <div className="flex flex-row overflow-x-auto lg:overflow-x-visible whitespace-nowrap gap-2 items-center w-full lg:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 px-4 lg:px-0 -mx-4 lg:mx-0">
              {/* Holiday button */}
              <button
                onClick={() => {
                  setCalendarMode("addHoliday");
                  setHolidayName("");
                  setHolidayStart(selectedDate);
                  setHolidayEnd(selectedDate);
                  setCalendarViewDate(new Date(selectedDate));
                  setIsCalendarOpen(true);
                }}
                className="flex h-[42px] sm:h-[46px] md:h-[50px] flex-shrink-0 w-auto items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/30 px-4 sm:px-5 text-xs sm:text-sm md:text-base font-bold text-rose-700 dark:text-rose-400 shadow-sm transition-all hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95"
              >
                <FiSunrise className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>ছুটি যোগ</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!activeDiary) return;
                  
                  // Initialize Guardian URL & QR
                  const origin = window.location.origin;
                  const url = `${origin}/share/class-diary?id=${activeDiary.id}&date=${selectedDate}`;
                  setShareUrl(url);
                  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
                  setQrUrl(qr);

                  // Initialize Teacher Share config
                  setTeacherName("");
                  setTeacherConfig({});
                  setGeneratedTeacherLink("");
                  setTeacherLinkQr("");
                  const classes = parseDiaryConfig(activeDiary.config) as Array<{ className: string; books: any[] }>;
                  setActiveTeacherClassTab(classes?.[0]?.className || "");
                  
                  setShareModalTab("guardian");
                  setShowShareModal(true);
                }}
                className="flex h-[42px] sm:h-[46px] md:h-[50px] flex-shrink-0 w-auto items-center justify-center gap-2 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 sm:px-5 text-xs sm:text-sm md:text-base font-bold text-indigo-600 dark:text-indigo-400 shadow-sm transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/30 active:scale-95"
                title="ডায়েরি শেয়ার"
              >
                <FiShare2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>শেয়ার</span>
              </button>

              <button
                onClick={() => {
                  const range = getWeekRange(selectedDate, activeDiary?.weekStartDay || "Saturday");
                  setPrintSettings((prev: any) => ({
                    ...prev,
                    startDate: range.start,
                    endDate: range.end,
                  }));
                  setShowPrintSetupModal(true);
                }}
                className="flex h-[42px] sm:h-[46px] md:h-[50px] flex-shrink-0 w-auto items-center justify-center gap-2 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 sm:px-5 text-xs sm:text-sm md:text-base font-bold text-gray-600 dark:text-slate-300 shadow-sm transition-all hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 active:scale-95"
                title="প্রিন্ট সেটআপ"
              >
                <FiPrinter className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>প্রিন্ট</span>
              </button>

              {(() => {
                let isPublishedNow = false;
                if (activeDiary?.publishTime) {
                  const now = new Date();
                  const [pubHour, pubMinute] = activeDiary.publishTime.split(":").map(Number);
                  const pubDate = new Date();
                  pubDate.setHours(pubHour, pubMinute, 0, 0);
                  isPublishedNow = now >= pubDate;
                }

                return (
                  <button
                    onClick={() => {
                      if (activeDiary?.publishTime) {
                        const [h, m] = activeDiary.publishTime.split(":").map(Number);
                        let hour12 = h % 12;
                        if (hour12 === 0) hour12 = 12;
                        setSelectedHour(hour12);
                        setSelectedMinute(m);
                        setPeriod(h >= 12 ? "PM" : "AM");
                        setIsPublishTimeEnabled(true);
                      } else {
                        setSelectedHour(12);
                        setSelectedMinute(0);
                        setPeriod("AM");
                        setIsPublishTimeEnabled(false);
                      }
                      setClockStep("hour");
                      setShowPublishTimeModal(true);
                    }}
                    className={`flex h-[42px] sm:h-[46px] md:h-[50px] flex-shrink-0 w-auto relative items-center justify-center gap-2 rounded-xl border px-4 sm:px-5 text-xs sm:text-sm md:text-base font-bold shadow-sm transition-all active:scale-95 ${
                      isPublishedNow
                        ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                        : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    }`}
                    title="পাবলিশ সময় সেট করুন"
                  >
                    <FiSend className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span>{isPublishedNow ? "পাবলিশড" : "পাবলিশ"}</span>
                    {activeDiary?.publishTime && (
                      <span className={`absolute -top-1 -right-1 flex h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${isPublishedNow ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                    )}
                  </button>
                );
              })()}

              {/* Settings button */}
              <button
                onClick={handleOpenSettings}
                className="flex h-[42px] sm:h-[46px] md:h-[50px] flex-shrink-0 w-auto items-center justify-center gap-2 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 sm:px-5 text-xs sm:text-sm md:text-base font-bold text-gray-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 shadow-sm transition-all active:scale-95"
                title="ডায়েরি সেটিংস"
              >
                <FiSettings className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                <span>সেটিংস</span>
              </button>
            </div>
          }
        />
      )}


      {/* DIARY SETTINGS MODAL */}
      <ModalLayout
        isOpen={isSettingsModalOpen}
        onChange={() => setIsSettingsModalOpen(false)}
        title="ডায়েরি সেটিংস"
      >
        <div className="flex flex-col gap-6 py-2 select-none">
          {/* Diary Mode/Format */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
              ডায়েরি ফরম্যাট
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTempDiaryMode("daily")}
                className={`py-3 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center ${
                  tempDiaryMode === "daily"
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-black shadow-sm"
                    : "border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800"
                }`}
              >
                দৈনিক ডায়েরি
              </button>
              <button
                type="button"
                onClick={() => setTempDiaryMode("weekly")}
                className={`py-3 rounded-xl border-2 text-xs font-bold transition-all duration-300 text-center ${
                  tempDiaryMode === "weekly"
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-black shadow-sm"
                    : "border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800"
                }`}
              >
                সাপ্তাহিক ডায়েরি
              </button>
            </div>
          </div>

          {/* Week Start Day */}
          {tempDiaryMode === "weekly" && (
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                সপ্তাহ শুরুর দিন
              </label>
              <select
                value={tempWeekStartDay}
                onChange={(e) => setTempWeekStartDay(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
              >
                <option value="Saturday">শনিবার</option>
                <option value="Sunday">রবিবার</option>
              </select>
            </div>
          )}

          {/* Weekly Holidays */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
              সাপ্তাহিক ছুটির দিন
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              {[
                { id: "Saturday", label: "শনিবার" },
                { id: "Sunday", label: "রবিবার" },
                { id: "Monday", label: "সোমবার" },
                { id: "Tuesday", label: "মঙ্গলবার" },
                { id: "Wednesday", label: "বুধবার" },
                { id: "Thursday", label: "বৃহস্পতিবার" },
                { id: "Friday", label: "শুক্রবার" },
              ].map((day) => {
                const isChecked = tempWeeklyHolidays.includes(day.id);
                return (
                  <label
                    key={day.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer select-none transition-all ${
                      isChecked
                        ? "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 font-bold shadow-sm"
                        : "bg-white dark:bg-slate-800 border-slate-150 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setTempWeeklyHolidays((prev) =>
                          prev.includes(day.id)
                            ? prev.filter((d) => d !== day.id)
                            : [...prev, day.id]
                        );
                      }}
                      className="accent-rose-600 cursor-pointer h-4 w-4"
                    />
                    <span className="text-xs">{day.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Save & Cancel buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="flex-1 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all active:scale-95"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!activeDiary) return;
                try {
                  await saveDiary({
                    ...activeDiary,
                    weekStartDay: tempWeekStartDay,
                    weeklyHolidays: tempWeeklyHolidays,
                  }).unwrap();
                  setDiaryMode(tempDiaryMode);
                  toast.success("সেটিংস সফলভাবে সংরক্ষিত হয়েছে!");
                  setIsSettingsModalOpen(false);
                  refetchDiaries();
                } catch (err: any) {
                  toast.error(err.message || "সংরক্ষণ করা যায়নি");
                }
              }}
              className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-100 active:scale-95"
            >
              সংরক্ষণ করুন
            </button>
          </div>
        </div>
      </ModalLayout>


      {/* PRINT SETUP MODAL */}
      <PrintPreviewModal
        isOpen={showPrintSetupModal}
        onClose={() => setShowPrintSetupModal(false)}
        printSettings={printSettings}
        setPrintSettings={setPrintSettings}
        activeInstitute={institutes?.find((i: any) => i.id === activeDiary?.instituteId || i._id === activeDiary?.instituteId)}
        activeDiary={activeDiary}
        activeTabClass={activeTabClass}
        diaryMode={diaryMode}
        setDiaryMode={setDiaryMode}
      >
        {(() => {
          let printCycles: string[] = [];
          if (printSettings.startDate && printSettings.endDate) {
            if (diaryMode === "daily") {
              const allDates = getDatesInRange(printSettings.startDate, printSettings.endDate);
              printCycles = allDates.filter((dateStr) => {
                const d = new Date(dateStr);
                const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
                const isWeeklyHol = (activeDiary?.weeklyHolidays || ["Friday"]).includes(dayName);
                const isPubHol = !!isDateInHoliday(dateStr, activeDiary?.holidays || []);
                return !isWeeklyHol && !isPubHol;
              });
            } else {
              let current = new Date(printSettings.startDate);
              const end = new Date(printSettings.endDate);
              while (current <= end) {
                const range = getWeekRange(current.toISOString().split("T")[0], activeDiary?.weekStartDay || "Saturday");
                if (!printCycles.includes(range.start)) {
                  printCycles.push(range.start);
                }
                current.setDate(current.getDate() + 7);
              }
            }
          } else {
            printCycles = [diaryMode === "weekly" ? getWeekRange(selectedDate, activeDiary?.weekStartDay || "Saturday").start : selectedDate];
          }

          const classesToPrint = printSettings.printClass === "all" 
            ? activeDiaryClasses 
            : activeDiaryClasses.filter((c: any) => c.className === (printSettings.printClass || activeTabClass));

          const activeInstitute = institutes?.find((i: any) => i.id === activeDiary?.instituteId || i._id === activeDiary?.instituteId);
          
          const getPageStyle = (settings: any) => ({
            width: settings.pageSize === "A3" ? (settings.orientation === "landscape" ? "420mm" : "297mm")
              : settings.pageSize === "A5" ? (settings.orientation === "landscape" ? "210mm" : "148mm")
              : settings.pageSize === "Legal" ? (settings.orientation === "landscape" ? "356mm" : "216mm")
              : settings.pageSize === "Letter" ? (settings.orientation === "landscape" ? "279mm" : "216mm")
              : (settings.orientation === "landscape" ? "297mm" : "210mm"), // A4 default
            minHeight: settings.pageSize === "A3" ? (settings.orientation === "landscape" ? "297mm" : "420mm")
              : settings.pageSize === "A5" ? (settings.orientation === "landscape" ? "148mm" : "210mm")
              : settings.pageSize === "Legal" ? (settings.orientation === "landscape" ? "216mm" : "356mm")
              : settings.pageSize === "Letter" ? (settings.orientation === "landscape" ? "216mm" : "279mm")
              : (settings.orientation === "landscape" ? "210mm" : "297mm"), // A4 default
            height: "fit-content",
            display: "flex",
            flexDirection: "column" as const,
            padding: "1cm",
          });

          return (
            <div className="flex flex-col gap-8 print:gap-[0] w-full items-center print:block">
              {classesToPrint.map((classConfig: any, classIdx: number) => {
                return (
                  <div key={classConfig.className} className={`print-isolated-modal shadow-xl mb-16 bg-white ${classIdx > 0 ? "print:break-before-page" : ""}`} style={getPageStyle(printSettings)}>
                    {/* Institute Header (rendered on each page) */}
                    {activeInstitute && (
                      <div className="flex items-center justify-between w-full" style={{ borderBottomWidth: `${printSettings.headerBreakLine}px`, borderBottomStyle: "solid", borderBottomColor: printSettings.themeColor, paddingBottom: `${printSettings.classNameSpacing}px`, marginBottom: `${printSettings.classNameSpacing * 1.5}px` }}>
                        {/* Logo on Left */}
                        {activeInstitute.logo && (
                          <div className="w-24 md:w-32 shrink-0 flex items-center justify-start">
                            <img src={activeInstitute.logo} alt="Logo" className="max-h-20 max-w-full object-contain print:max-h-24" />
                          </div>
                        )}
                        
                        {/* Text in Center */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                          <h1 className="font-black tracking-tight leading-tight" style={{ fontSize: `${printSettings.instNameFontSize}px`, color: printSettings.themeColor }}>
                            {activeInstitute.name}
                          </h1>
                          {activeInstitute.address && (
                            <p className="font-bold text-gray-800 mt-2" style={{ fontSize: `${printSettings.instAddressFontSize}px` }}>
                              {activeInstitute.address}
                            </p>
                          )}
                          {activeInstitute.phone && !printSettings.hideMobile && (
                            <p className="font-bold text-gray-600 mt-0.5 tracking-wider" style={{ fontSize: `${printSettings.instContactFontSize}px` }}>
                              মোবাইল: {activeInstitute.phone}
                            </p>
                          )}
                        </div>

                        {/* Empty Right side for balance so text is perfectly centered */}
                        {activeInstitute.logo && (
                          <div className="w-24 md:w-32 shrink-0 hidden sm:block"></div>
                        )}
                      </div>
                    )}
                    
                    {/* Class Header */}
                    <h2 className="text-center font-black" style={{ fontSize: `${printSettings.classNameFontSize}px`, marginBottom: `${printSettings.classNameSpacing}px`, color: printSettings.themeColor }}>
                      {classConfig.className}
                    </h2>

                    {(() => {
                      const cleanTrailingHtml = (html: string): string => {
                        if (!html) return "";
                        let current = html.trim();
                        const emptyContentRegex = /^(\s|&nbsp;|&zwnj;|&zwj;|&#160;|\u200b|<br\s*\/?>)*$/i;
                        while (true) {
                          const prev = current;
                          current = current.replace(/<(p|div|span|section|h[1-6]|ul|ol|li)[^>]*>([\s\S]*?)<\/\1>\s*$/gi, (match, tag, content) => {
                            if (emptyContentRegex.test(content)) {
                              return "";
                            }
                            return match;
                          });
                          current = current.replace(/<br\s*\/?>\s*$/gi, "");
                          if (current === prev) break;
                        }
                        return current.trim();
                      };

                      // Collect all notices for this class config across all printCycles
                      const classNotices: { date: string; bookName: string; text: string; isGlobal?: boolean }[] = [];
                      printCycles.forEach((cycleDate: string) => {
                        // 1. Class & Subject notices (local)
                        const classLogs = activeDiary?.entries?.[cycleDate]?.[classConfig.className] || {};
                        Object.keys(classLogs).forEach((bookId) => {
                          const log = classLogs[bookId];
                          const bookObj = activeDiary?.config?.find((c: any) => c.className === classConfig.className)?.books?.find((b: any) => b.id === bookId);
                          if (bookObj?.isPermanentlyHidden === true) return;
                          if (log?.notice && log.isHidden !== true) {
                            const bookName = bookId === 'CLASS_NOTICE' 
                              ? 'সাধারণ নোটিশ' 
                              : (bookObj?.name || "শ্রেণী নোটিশ");
                            classNotices.push({
                              date: cycleDate,
                              bookName,
                              text: log.notice,
                              isGlobal: false
                            });
                          }
                        });

                        // 2. Global notices
                        const globalLogs = activeDiary?.entries?.[cycleDate]?.['GLOBAL'] || {};
                        Object.keys(globalLogs).forEach((bookId) => {
                          const log = globalLogs[bookId];
                          if (log?.notice) {
                            classNotices.push({
                              date: cycleDate,
                              bookName: 'সকল শ্রেণীর নোটিশ',
                              text: log.notice,
                              isGlobal: true
                            });
                          }
                        });
                      });

                      if (classNotices.length === 0) return null;

                      return (
                        <table
                          className="w-full border-collapse mb-1 print:mb-0.5 notice-diary-table"
                          style={{ pageBreakInside: "avoid" }}
                        >
                          <style dangerouslySetInnerHTML={{ __html: `
                            .notice-diary-table p,
                            .notice-diary-table div,
                            .notice-diary-table span,
                            .notice-diary-table ul,
                            .notice-diary-table ol,
                            .notice-diary-table li,
                            .notice-diary-table .diary-html-content p,
                            .notice-diary-table .diary-html-content div,
                            .notice-diary-table .diary-html-content span,
                            .notice-diary-table .diary-html-content ul,
                            .notice-diary-table .diary-html-content ol,
                            .notice-diary-table .diary-html-content li {
                              margin-top: 0px !important;
                              margin-bottom: 0px !important;
                              padding-top: 0px !important;
                              padding-bottom: 0px !important;
                              line-height: 1.2 !important;
                              display: inline !important;
                            }
                            .notice-diary-table td {
                              padding-top: 2px !important;
                              padding-bottom: 2px !important;
                            }
                          `}} />
                          <thead>
                            <tr>
                              <th
                                colSpan={2}
                                className="text-left font-extrabold px-2 pt-0.5 pb-0 border-b"
                                style={{ fontSize: `${printSettings.fontSize + 1}px`, color: printSettings.themeColor, borderColor: printSettings.themeColor }}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: printSettings.themeColor }} />
                                  নোটিশ বোর্ড
                                </span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {classNotices.map((notice, nIdx) => {
                              const cleanedText = cleanTrailingHtml(notice.text);
                              if (!cleanedText) return null;

                              const lines = cleanedText.split("\n").filter((line: string) => line.trim() !== "");
                              const isArabic = lines.some((line: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line));
                              const dir = isArabic ? "rtl" : "ltr";
                              return (
                                <tr key={nIdx} dir={dir} style={{ borderBottom: nIdx < classNotices.length - 1 ? `1px solid ${printSettings.themeColor}20` : 'none' }}>
                                  {notice.bookName !== 'সাধারণ নোটিশ' && (
                                    <td className="px-2 pt-0.5 pb-0.5 whitespace-nowrap align-top" style={{ width: '1%' }}>
                                      <span
                                        className="text-[10px] font-black uppercase tracking-wider px-1.5 rounded text-white select-none"
                                        style={{ backgroundColor: printSettings.themeColor, lineHeight: '1.6', display: 'inline-block' }}
                                      >
                                        {notice.bookName}
                                      </span>
                                    </td>
                                  )}
                                  <td 
                                    className="px-2 pt-0.5 pb-0.5 text-gray-800 font-semibold align-top" 
                                    style={{ fontSize: `${printSettings.fontSize}px` }}
                                    colSpan={notice.bookName === 'সাধারণ নোটিশ' ? 2 : 1}
                                  >
                                    {/<[a-z][\s\S]*>/i.test(cleanedText) ? (
                                      <span
                                        className="diary-html-content prose prose-sm max-w-none text-black inline [&>p]:inline [&>p]:mr-5 [&>p]:my-0 [&>div]:inline [&>div]:mr-5 [&>div]:my-0 [&_*]:my-0 [&_*]:py-0"
                                        dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(cleanedText) }}
                                      />
                                    ) : (
                                      lines.map((line: string, lIdx: number) => (
                                        <div key={lIdx} className="leading-snug">
                                          {lines.length > 1 ? `${toBanglaNumber(lIdx + 1)}. ${line}` : line}
                                        </div>
                                      ))
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}

                    <div className={`flex flex-col ${printSettings.layoutStyle === "leftColumn" ? "gap-6" : "gap-3"}`}>
                      {printSettings.layoutStyle === "leftColumn" ? (
                        <table className="w-full border-collapse border text-left" style={{ borderColor: printSettings.themeColor }}>
                          <thead>
                            <tr>
                              <th className="border text-center font-bold p-2 whitespace-nowrap text-black font-black" style={{ width: `${printSettings.dateColumnWidth ?? 18}%`, fontSize: `${printSettings.fontSize + 2}px`, backgroundColor: printSettings.themeColor, color: getContrastColor(printSettings.themeColor), borderColor: printSettings.themeColor }}>
                                তারিখ ও দিন
                              </th>
                              <th className="border text-center font-bold p-2 text-black font-black" style={{ width: `${printSettings.columnWidth}%`, fontSize: `${printSettings.fontSize + 2}px`, backgroundColor: printSettings.themeColor, color: getContrastColor(printSettings.themeColor), borderColor: printSettings.themeColor }}>
                                বিষয়
                              </th>
                              <th className="border text-center font-bold p-2 text-black font-black" style={{ fontSize: `${printSettings.fontSize + 2}px`, backgroundColor: printSettings.themeColor, color: getContrastColor(printSettings.themeColor), borderColor: printSettings.themeColor }}>
                                পাঠ পরিকল্পনা 
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {printCycles.map((cycleDate: string) => {
                              const cycleLogs = activeDiary?.entries?.[cycleDate]?.[classConfig.className] || {};
                              
                              const renderedBooks = classConfig.books.filter((book: any) => {
                                if (book.isPermanentlyHidden === true) return false;
                                const log = cycleLogs[book.id] || cycleLogs[`${classConfig.className}:${book.id}`] || {};
                                if (log.isHidden === true) return false;
                                const categories = logTypes.map((t: any) => ({
                                  type: t.id,
                                  label: t.label,
                                  value: log[t.id] || "",
                                  color: t.color
                                }));
                                const isValueBlank = (val: any) => {
                                  if (!val) return true;
                                  if (typeof val !== 'string') return false;
                                  const cleaned = val.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();
                                  return cleaned === '';
                                };
                                const filledCategories = categories.filter((c: any) => !isValueBlank(c.value));
                                return printSettings.hideBlankSubjects === false || filledCategories.length > 0;
                              });

                              if (printSettings.hideEmptyCycles && renderedBooks.length === 0) return null;
                              if (renderedBooks.length === 0) return null;

                              return renderedBooks.map((book: any, bookIdx: number) => {
                                const log = cycleLogs[book.id] || cycleLogs[`${classConfig.className}:${book.id}`] || {};
                                const categories = logTypes.map((t: any) => ({
                                  type: t.id,
                                  label: t.label,
                                  value: log[t.id] || "",
                                  color: t.color
                                }));
                                
                                const isValueBlank = (val: any) => {
                                  if (!val) return true;
                                  if (typeof val !== 'string') return false;
                                  const cleaned = val.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();
                                  return cleaned === '';
                                };

                                const filledCategories = categories.filter((c: any) => !isValueBlank(c.value));

                                return (
                                  <tr key={`${cycleDate}-${book.id}`}>
                                    {bookIdx === 0 && (
                                      <td
                                        rowSpan={renderedBooks.length}
                                        className="border align-top text-center font-bold text-black"
                                        style={{
                                          padding: `${printSettings.spacing}px`,
                                          fontSize: `${printSettings.fontSize}px`,
                                          borderColor: printSettings.themeColor,
                                          backgroundColor: `${printSettings.themeColor}05`,
                                          verticalAlign: "middle",
                                          width: `${printSettings.dateColumnWidth ?? 18}%`,
                                          borderBottom: `3px solid ${printSettings.themeColor}`
                                        }}
                                      >
                                        {(() => {
                                          if (diaryMode === "weekly") {
                                            const range = getWeekRange(cycleDate, activeDiary?.weekStartDay || "Saturday");
                                            return (
                                              <div className="flex flex-col gap-1 items-center justify-center">
                                                <span className="font-extrabold text-black">{formatShortBanglaDate(range.start)}</span>
                                                <span className="text-[10px] text-gray-500 font-medium">থেকে</span>
                                                <span className="font-extrabold text-black">{formatShortBanglaDate(range.end)}</span>
                                              </div>
                                            );
                                          } else {
                                            const d = new Date(cycleDate);
                                            const dayOfWeek = banglaDays[d.getDay()];
                                            const dd = toBanglaNumber(d.getDate().toString().padStart(2, '0'));
                                            const mm = toBanglaNumber((d.getMonth() + 1).toString().padStart(2, '0'));
                                            const yy = toBanglaNumber(d.getFullYear().toString().slice(-2));
                                            return (
                                              <div className="flex flex-col gap-0.5 items-center justify-center">
                                                <span className="font-extrabold text-black">{dayOfWeek}</span>
                                                <span className="text-[10px] text-gray-600 font-bold">({dd}/{mm}/{yy})</span>
                                              </div>
                                            );
                                          }
                                        })()}
                                      </td>
                                    )}
                                    
                                    <td className="border align-top whitespace-nowrap" style={{ paddingTop: `${printSettings.spacing}px`, paddingBottom: `${printSettings.spacing}px`, paddingRight: `${Math.max(5, printSettings.spacing)}px`, paddingLeft: `${Math.max(10, printSettings.spacing)}px`, width: `${printSettings.columnWidth}%`, borderColor: printSettings.themeColor, borderBottomWidth: bookIdx === renderedBooks.length - 1 ? '3px' : '1px', borderBottomStyle: 'solid', borderBottomColor: printSettings.themeColor }}>
                                      <span className="font-bold text-black" style={{ fontSize: `${printSettings.fontSize}px` }}>{book.name}</span>
                                    </td>
                                    
                                    <td className="border text-black align-middle" style={{ padding: `${printSettings.spacing}px ${Math.max(5, printSettings.spacing)}px`, fontSize: `${printSettings.fontSize}px`, borderColor: printSettings.themeColor, borderBottomWidth: bookIdx === renderedBooks.length - 1 ? '3px' : '1px', borderBottomStyle: 'solid', borderBottomColor: printSettings.themeColor, lineHeight: 1.2 }}>
                                      <div className="block w-full">
                                        {filledCategories.map((cat: any) => {
                                          const lines = cat.value.split("\n").filter((line: string) => line.trim() !== "");
                                          const isArabic = lines.some((line: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line));
                                          const dir = isArabic ? "rtl" : "ltr";
                                          return (
                                            <div key={cat.type} className="contents" dir={dir}>
                                              <div className="contents">
                                                {/<[a-z][\s\S]*>/i.test(cat.value) ? (
                                                  <div className="contents">
                                                    {cat.type !== "general" && !printSettings.hideTypeBadges && (
                                                      (() => {
                                                        return (
                                                          <span className={`inline-flex items-center justify-center rounded-full font-bold mr-2 flex-shrink-0 border print:shadow-none select-none text-white ${cat.color === 'blue' || cat.color === 'indigo' ? 'bg-indigo-600 border-indigo-700' : 'bg-emerald-600 border-emerald-700'}`} style={{ fontSize: `${printSettings.badgeFontSize}px`, padding: `0px ${printSettings.badgePadding}px`, lineHeight: 1.2 }}>
                                                            {cat.label.split(' ')[0]}
                                                          </span>
                                                        );
                                                      })()
                                                    )}
                                                    <span 
                                                      className="diary-html-content inline prose prose-sm max-w-none text-black [&>p]:inline [&>p]:mr-5 [&>div]:inline [&>div]:mr-5 [&>ol]:inline [&>ul]:inline [&>li]:inline" 
                                                      dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(cat.value).replace(/<span[^>]*class="[^"]*font-bold[^"]*"[^>]*>\d+\.\s*<\/span>/g, `<span style="font-weight:bold;margin-right:4px;">${printSettings.bulletStyle || '•'}</span>`) }} 
                                                    />
                                                  </div>
                                                ) : (
                                                  lines.map((line: string, lIdx: number) => {
                                                    const badge = cat.type !== "general" && !printSettings.hideTypeBadges && lIdx === 0 ? (
                                                      (() => {
                                                        return (
                                                          <span className={`inline-flex items-center justify-center rounded-full font-bold mr-2 align-middle border select-none print:shadow-none text-white ${cat.color === 'blue' || cat.color === 'indigo' ? 'bg-indigo-600 border-indigo-700' : 'bg-emerald-600 border-emerald-700'}`} style={{ fontSize: `${printSettings.badgeFontSize}px`, padding: `0px ${printSettings.badgePadding}px`, lineHeight: 1.2 }}>
                                                            {cat.label.split(' ')[0]}
                                                          </span>
                                                        );
                                                      })()
                                                    ) : undefined;
                                                    return renderDiaryLine(line, lIdx, lines.length, isArabic, badge, undefined, true, printSettings.bulletStyle);
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
                            })}
                          </tbody>
                        </table>
                      ) : (
                        printCycles.map((cycleDate: string) => {
                          const cycleLogs = activeDiary?.entries?.[cycleDate]?.[classConfig.className] || {};
                          
                          // Check if this cycle is completely empty (no subjects have content)
                          const hasAnyContent = classConfig.books.some((book: any) => {
                            if (book.isPermanentlyHidden === true) return false;
                            const log = cycleLogs[book.id] || cycleLogs[`${classConfig.className}:${book.id}`] || {};
                            if (log.isHidden === true) return false;
                            
                            const categories = logTypes.map((t: any) => ({
                              type: t.id,
                              label: t.label,
                              value: log[t.id] || "",
                              color: t.color
                            }));
                            
                            const isValueBlank = (val: any) => {
                              if (!val) return true;
                              if (typeof val !== 'string') return false;
                              const cleaned = val.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();
                              return cleaned === '';
                            };
                            
                            const filledCategories = categories.filter((c: any) => !isValueBlank(c.value));
                            return filledCategories.length > 0;
                          });

                          if (printSettings.hideEmptyCycles && !hasAnyContent) {
                            return null;
                          }

                          return (
                            <table key={cycleDate} className="w-full border-collapse border text-left" style={{ marginBottom: `${printSettings.classNameSpacing}px`, borderColor: printSettings.themeColor, borderBottom: `3px solid ${printSettings.themeColor}` }}>
                              <thead>
                                <tr>
                                  <th colSpan={2} className="border text-center font-bold p-2" style={{ fontSize: `${printSettings.fontSize + 2}px`, backgroundColor: printSettings.themeColor, color: getContrastColor(printSettings.themeColor), borderColor: printSettings.themeColor }}>
                                    {(() => {
                                      if (diaryMode === "weekly") {
                                        const range = getWeekRange(cycleDate, activeDiary?.weekStartDay || "Saturday");
                                        return `${formatShortBanglaDate(range.start)} - ${formatShortBanglaDate(range.end)}`;
                                      } else {
                                        const d = new Date(cycleDate);
                                        const dayOfWeek = banglaDays[d.getDay()];
                                        const dd = toBanglaNumber(d.getDate().toString().padStart(2, '0'));
                                        const mm = toBanglaNumber((d.getMonth() + 1).toString().padStart(2, '0'));
                                        const yy = toBanglaNumber(d.getFullYear().toString().slice(-2));
                                        return `${dayOfWeek} (${dd}/${mm}/${yy})`;
                                      }
                                    })()}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {classConfig.books.map((book: any) => {
                                  if (book.isPermanentlyHidden === true) return null;
                                  const log = cycleLogs[book.id] || cycleLogs[`${classConfig.className}:${book.id}`] || {};
                                  if (log.isHidden === true) return null;
                                  const categories = logTypes.map((t: any) => ({
                                    type: t.id,
                                    label: t.label,
                                    value: log[t.id] || "",
                                    color: t.color
                                  }));
                                  
                                  const isValueBlank = (val: any) => {
                                    if (!val) return true;
                                    if (typeof val !== 'string') return false;
                                    const cleaned = val.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();
                                    return cleaned === '';
                                  };

                                  const filledCategories = categories.filter((c: any) => !isValueBlank(c.value));
                                  if (printSettings.hideBlankSubjects !== false && filledCategories.length === 0) return null;

                                  return (
                                    <tr key={book.id}>
                                      <td className="border align-top whitespace-nowrap" style={{ paddingTop: `${printSettings.spacing}px`, paddingBottom: `${printSettings.spacing}px`, paddingRight: `${Math.max(5, printSettings.spacing)}px`, paddingLeft: `${Math.max(10, printSettings.spacing)}px`, width: `${printSettings.columnWidth}%`, borderColor: printSettings.themeColor }}>
                                        <span className="font-bold text-black" style={{ fontSize: `${printSettings.fontSize}px` }}>{book.name}</span>
                                      </td>
                                      <td className="border text-black align-middle" style={{ padding: `${printSettings.spacing}px ${Math.max(5, printSettings.spacing)}px`, fontSize: `${printSettings.fontSize}px`, borderColor: printSettings.themeColor, lineHeight: 1.2 }}>
                                        <div className="block w-full">
                                            {filledCategories.map((cat: any) => {
                                              const lines = cat.value.split("\n").filter((line: string) => line.trim() !== "");
                                              const isArabic = lines.some((line: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line));
                                              const dir = isArabic ? "rtl" : "ltr";
                                              return (
                                                <div key={cat.type} className="contents" dir={dir}>
                                                  <div className="contents">
                                                    {/<[a-z][\s\S]*>/i.test(cat.value) ? (
                                                      <div className="contents">
                                                        {cat.type !== "general" && !printSettings.hideTypeBadges && (
                                                          (() => {
                                                            return (
                                                              <span className={`inline-flex items-center justify-center rounded-full font-bold mr-2 flex-shrink-0 border print:shadow-none select-none text-white ${cat.color === 'blue' || cat.color === 'indigo' ? 'bg-indigo-600 border-indigo-700' : 'bg-emerald-600 border-emerald-700'}`} style={{ fontSize: `${printSettings.badgeFontSize}px`, padding: `0px ${printSettings.badgePadding}px`, lineHeight: 1.2 }}>
                                                                {cat.label.split(' ')[0]}
                                                              </span>
                                                            );
                                                          })()
                                                        )}
                                                        <span 
                                                          className="diary-html-content inline prose prose-sm max-w-none text-black [&>p]:inline [&>p]:mr-5 [&>div]:inline [&>div]:mr-5 [&>ol]:inline [&>ul]:inline [&>li]:inline" 
                                                          dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(cat.value).replace(/<span[^>]*class="[^"]*font-bold[^"]*"[^>]*>\d+\.\s*<\/span>/g, `<span style="font-weight:bold;margin-right:4px;">${printSettings.bulletStyle || '•'}</span>`) }} 
                                                        />
                                                      </div>
                                                    ) : (
                                                      lines.map((line: string, lIdx: number) => {
                                                        const badge = cat.type !== "general" && !printSettings.hideTypeBadges && lIdx === 0 ? (
                                                          (() => {
                                                            return (
                                                              <span className={`inline-flex items-center justify-center rounded-full font-bold mr-2 align-middle border select-none print:shadow-none text-white ${cat.color === 'blue' || cat.color === 'indigo' ? 'bg-indigo-600 border-indigo-700' : 'bg-emerald-600 border-emerald-700'}`} style={{ fontSize: `${printSettings.badgeFontSize}px`, padding: `0px ${printSettings.badgePadding}px`, lineHeight: 1.2 }}>
                                                                {cat.label.split(' ')[0]}
                                                              </span>
                                                            );
                                                          })()
                                                        ) : undefined;
                                                        return renderDiaryLine(line, lIdx, lines.length, isArabic, badge, undefined, true, printSettings.bulletStyle);
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
                                })}
                              </tbody>
                            </table>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </PrintPreviewModal>

      {/* CREATE DIARY MASTER WIZARD MODAL */}
      <ModalLayout
        isOpen={isCreateModalOpen}
        onChange={() => setIsCreateModalOpen(false)}
        title="নতুন ডায়েরি তৈরি করুন"
        description="শিক্ষক ডায়েরির সাধারণ তথ্য ও শ্রেণী ভিত্তিক বিষয় কনফিগারেশন"
        modalSize={step === 2 ? "3xl" : "lg"}
        className="z-[9999]"
        modalComponent={
          <div className="flex flex-col gap-6 py-4">
            {/* Steps indicator */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === 1 ? "bg-indigo-600 dark:bg-indigo-500 text-white" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"}`}>
                  {step === 1 ? "১" : <FiCheck />}
                </span>
                <span className={`text-sm font-bold ${step === 1 ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>সাধারণ তথ্য</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1 mx-4" />
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === 2 ? "bg-indigo-600 dark:bg-indigo-500 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500"}`}>
                  ২
                </span>
                <span className={`text-sm font-bold ${step === 2 ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>শ্রেণী ও বই নির্বাচন</span>
              </div>
            </div>

            {/* STEP 1: Basic details */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-1.5">ডায়েরির নাম (যেমন: ১ম সেমিস্টার ডায়েরি)</label>
                  <input
                    type="text"
                    value={diaryName}
                    onChange={(e) => setDiaryName(e.target.value)}
                    placeholder="ডায়েরির নাম লিখুন..."
                    className="w-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3.5 text-base text-gray-800 dark:text-gray-200 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-1.5">কভার ডিজাইন</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDiaryTemplate(diaryTemplate.startsWith("moleskine") ? diaryTemplate : "moleskine")}
                          className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${diaryTemplate.startsWith("moleskine") ? "bg-slate-800 text-white border-slate-800 shadow-sm" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
                        >
                          প্রফেশনাল
                        </button>
                        <button
                          onClick={() => setDiaryTemplate(diaryTemplate.startsWith("spiral") ? diaryTemplate : "spiral-blue")}
                          className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${diaryTemplate.startsWith("spiral") ? "bg-[#0073a8] text-white border-[#0073a8] shadow-sm" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-[#0073a8] dark:hover:border-[#0073a8]"}`}
                        >
                          স্পাইরাল
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-2">কভার রঙ</label>
                      <div className="flex gap-3">
                        {diaryTemplate.startsWith("moleskine") ? (
                          <>
                            <button onClick={() => setDiaryTemplate("moleskine")} className={`h-9 w-9 rounded-full bg-[#f4f1ea] border border-slate-300 shadow-sm ${diaryTemplate === "moleskine" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Cream"></button>
                            <button onClick={() => setDiaryTemplate("moleskine-blue")} className={`h-9 w-9 rounded-full bg-slate-800 shadow-sm ${diaryTemplate === "moleskine-blue" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Navy Blue"></button>
                            <button onClick={() => setDiaryTemplate("moleskine-green")} className={`h-9 w-9 rounded-full bg-emerald-800 shadow-sm ${diaryTemplate === "moleskine-green" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Emerald Green"></button>
                            <button onClick={() => setDiaryTemplate("moleskine-red")} className={`h-9 w-9 rounded-full bg-rose-800 shadow-sm ${diaryTemplate === "moleskine-red" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Maroon Red"></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setDiaryTemplate("spiral-blue")} className={`h-9 w-9 rounded-full bg-[#0073a8] shadow-sm ${diaryTemplate === "spiral-blue" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Blue"></button>
                            <button onClick={() => setDiaryTemplate("spiral-teal")} className={`h-9 w-9 rounded-full bg-teal-600 shadow-sm ${diaryTemplate === "spiral-teal" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Teal"></button>
                            <button onClick={() => setDiaryTemplate("spiral-rose")} className={`h-9 w-9 rounded-full bg-rose-600 shadow-sm ${diaryTemplate === "spiral-rose" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Rose"></button>
                            <button onClick={() => setDiaryTemplate("spiral-slate")} className={`h-9 w-9 rounded-full bg-slate-700 shadow-sm ${diaryTemplate === "spiral-slate" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Slate"></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-1.5">টাইপ</label>
                    <select
                      value={diaryType}
                      onChange={(e) => setDiaryType(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3.5 text-base text-gray-800 dark:text-gray-200 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all cursor-pointer font-bold h-[54px]"
                    >
                      <option value="daily">দৈনিক (Daily)</option>
                      <option value="weekly">সাপ্তাহিক (Weekly)</option>
                      <option value="monthly">মাসিক (Monthly)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-1.5">শুরুর তারিখ</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3.5 text-base text-gray-800 dark:text-gray-200 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-1.5">প্রতিষ্ঠান নির্বাচন করুন</label>
                    <select
                      value={selectedInsId}
                      onChange={(e) => setSelectedInsId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3.5 text-base text-gray-800 dark:text-gray-200 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all cursor-pointer font-bold"
                    >
                      <option value="">সিলেক্ট করুন...</option>
                      {institutes?.map((ins: any) => (
                        <option key={ins.id} value={ins.id}>{ins.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-5">
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl border border-gray-300 dark:border-slate-600 px-6 py-3 text-base font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    বাতিল
                  </button>
                  <Button
                    onClick={handleNextStep}
                    className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white hover:bg-indigo-700"
                  >
                    পরবর্তী ধাপ
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Book Selection from result books */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                {isResultLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                  </div>
                ) : syncedClasses.length > 0 ? (
                  <div className="flex flex-col gap-5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {syncedClasses.map((cls: any) => {
                      // Find books for this specific class name
                      const classBooks = filteredBooks.filter((b: any) => b.className === cls.name);
                      const currentSelected = selectedConfig[cls.name] || [];
                      const allSelected = classBooks.length > 0 && classBooks.every((b: any) => currentSelected.includes(b.id));

                      return (
                        <div key={cls.id} className="border border-gray-100 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 p-4">
                          <h4
                            onClick={() => handleToggleClassAllBooks(cls.name, classBooks)}
                            className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-2 mb-3 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => { }} // handled by click on heading
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-800"
                            />
                            <span>{cls.name}</span>
                          </h4>

                          {classBooks.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                              {classBooks.map((book: any) => {
                                const isSelected = (selectedConfig[cls.name] || []).includes(book.id);
                                return (
                                  <label
                                    key={book.id}
                                    className={`flex items-center gap-3 px-3 py-2 border rounded-xl cursor-pointer select-none transition-all ${isSelected
                                        ? "bg-indigo-50/80 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-sm"
                                        : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 text-gray-600 dark:text-gray-400"
                                      }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleBook(cls.name, book.id)}
                                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-700"
                                    />
                                    <span className="text-xs font-semibold">{book.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic pl-6 flex items-center gap-1">
                              <FiAlertCircle className="flex-shrink-0" />
                              <span>এই শ্রেণীর জন্য কোন বই পাওয়া যায়নি।</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400 font-bold">
                    কোন শ্রেণীর ডাটা পাওয়া যায়নি! অনুগ্রহ করে ফলাফল ট্যাবে বুক সিঙ্ক হয়েছে কিনা তা নিশ্চিত করুন।
                  </div>
                )}

                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <FiArrowLeft />
                    <span>পূর্ববর্তী ধাপ</span>
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsCreateModalOpen(false)}
                      className="rounded-xl border border-gray-300 dark:border-slate-600 px-5 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      বাতিল
                    </button>
                    <Button
                      onClick={handleCreateSubmit}
                      disabled={isSavingDiary}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-100"
                    >
                      ডায়েরি তৈরি করুন
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* SHARE MODAL */}
      <ModalLayout
        isOpen={showShareModal}
        onChange={() => setShowShareModal(false)}
        title="ডায়েরি শেয়ারিং পোর্টাল"
        description="এই ডায়েরিটি অভিভাবক ও শিক্ষকদের সাথে শেয়ার করুন"
        modalSize="lg"
        className="z-[9999]"
        modalComponent={
          (() => {
            const diaryConfig = parseDiaryConfig(activeDiary?.config);
            const activeClassData = diaryConfig.find((c: any) => c.className === activeTeacherClassTab);
            const activeBooks = activeClassData?.books || [];
            const totalSelected = Object.values(teacherConfig).reduce((sum, arr) => sum + arr.length, 0);

            return (
              <div className="flex flex-col gap-5 py-2">
                {/* Top Tabs */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-full select-none">
                  <button
                    onClick={() => setShareModalTab("guardian")}
                    className={`flex-1 py-2 text-xs sm:text-sm font-black rounded-lg transition-all duration-200 ${
                      shareModalTab === "guardian"
                        ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    অভিভাবক শেয়ার
                  </button>
                  <button
                    onClick={() => setShareModalTab("teacher")}
                    className={`flex-1 py-2 text-xs sm:text-sm font-black rounded-lg transition-all duration-200 ${
                      shareModalTab === "teacher"
                        ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    শিক্ষক শেয়ার
                  </button>
                </div>

                {/* Tab Contents */}
                {shareModalTab === "guardian" ? (
                  <div className="flex flex-col items-center gap-5 text-center py-2">
                    {qrUrl && (
                      <div className="border border-gray-150 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                        <img src={qrUrl} alt="Class Diary QR Code" className="h-40 w-40 object-contain" />
                      </div>
                    )}

                    <div className="w-full">
                      <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider block text-left mb-1.5">শেয়ারিং লিঙ্ক</label>
                      <div className="flex items-center gap-2 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-1 pl-3">
                        <input
                          type="text"
                          value={shareUrl}
                          readOnly
                          className="bg-transparent text-xs text-gray-600 dark:text-gray-300 select-all outline-none flex-1 truncate font-mono"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 active:scale-95 transition-all"
                        >
                          <FiCopy />
                          <span>কপি লিঙ্ক</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed">অভিভাবকেরা কোন প্রকার লগইন ছাড়াই QR কোড স্ক্যান করে বা লিঙ্কে প্রবেশ করে আজকের ক্লাস ডায়েরি এবং বাড়ির কাজ দেখতে পারবেন।</p>

                    <button
                      onClick={() => setShowShareModal(false)}
                      className="w-full rounded-xl border border-gray-300 dark:border-slate-600 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors mt-2"
                    >
                      বন্ধ করুন
                    </button>
                  </div>
                ) : (
                  /* Teacher Share Content */
                  <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
                    {/* Teacher Sub-tabs */}
                    <div className="flex flex-col gap-3">
                      <div className="flex p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl w-full max-w-[240px] mx-auto select-none">
                        <button
                          onClick={() => {
                            setTeacherModalTab("create");
                            setEditingLinkId(null);
                            setTeacherName("");
                            setTeacherConfig({});
                            setGeneratedTeacherLink("");
                            setTeacherLinkQr("");
                          }}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                            teacherModalTab === "create" ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          লিঙ্ক তৈরি
                        </button>
                        <button
                          onClick={() => setTeacherModalTab("history")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                            teacherModalTab === "history" ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          পূর্বের লিঙ্ক
                        </button>
                      </div>

                      {teacherModalTab === "create" && (
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 dark:focus-within:ring-teal-900/50 transition-all">
                          <FiUser className="h-4 w-4 text-teal-500 flex-shrink-0" />
                          <input
                            type="text"
                            value={teacherName}
                            onChange={(e) => { setTeacherName(e.target.value); setGeneratedTeacherLink(""); setTeacherLinkQr(""); }}
                            placeholder="শিক্ষকের নাম লিখুন..."
                            className="flex-1 bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                          />
                          {totalSelected > 0 && (
                            <span className="flex-shrink-0 text-[11px] font-black bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full">
                              {totalSelected} বিষয়
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Class Selector (Horizontal scrollable tabs) */}
                    {teacherModalTab === "create" && (
                      <div className="border-y border-gray-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 -mx-6">
                        <div className="flex gap-1.5 overflow-x-auto px-6 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none">
                          {diaryConfig.map((cls: any) => {
                            const selCount = (teacherConfig[cls.className] || []).length;
                            const isActive = cls.className === activeTeacherClassTab;
                            return (
                              <button
                                key={cls.className}
                                onClick={(e) => {
                                  setActiveTeacherClassTab(cls.className);
                                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                                }}
                                className={`flex-none flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                                  isActive
                                    ? "bg-teal-600 text-white shadow-md shadow-teal-200 scale-105"
                                    : "bg-white text-gray-600 border border-gray-150 hover:border-teal-200 hover:text-teal-700 hover:bg-teal-50 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 dark:hover:border-teal-600 dark:hover:text-teal-400 dark:hover:bg-teal-900/20"
                                }`}
                              >
                                <span>{cls.className}</span>
                                {selCount > 0 && (
                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/25 text-white" : "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400"}`}>
                                    {selCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Checkboxes List or History List */}
                    <div className="py-2">
                      {teacherModalTab === "create" ? (
                        activeBooks.length > 0 ? (
                          <>
                            {/* Select-all row */}
                            <div className="flex items-center justify-between mb-3 select-none">
                              <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {activeTeacherClassTab} — বিষয়সমূহ
                              </p>
                              <button
                                onClick={() => handleToggleTeacherClass(activeTeacherClassTab, activeBooks)}
                                className="text-[11px] font-bold text-teal-600 hover:text-teal-800 transition-colors"
                              >
                                {(teacherConfig[activeTeacherClassTab] || []).length === activeBooks.length
                                  ? "সব বাতিল করুন"
                                  : "সব নির্বাচন করুন"}
                              </button>
                            </div>

                            {/* Book grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {activeBooks.map((book: any) => {
                                const isSelected = (teacherConfig[activeTeacherClassTab] || []).includes(book.id);
                                return (
                                  <label
                                    key={book.id}
                                    className={`group flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer select-none transition-all duration-150 ${
                                      isSelected
                                        ? "bg-teal-50 dark:bg-teal-900/30 border-teal-400 dark:border-teal-700 shadow-sm"
                                        : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700 hover:bg-teal-50/30 dark:hover:bg-teal-900/20"
                                    }`}
                                  >
                                    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                                      isSelected ? "bg-teal-600 border-teal-600" : "bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 group-hover:border-teal-400 dark:group-hover:border-teal-500"
                                    }`}>
                                      {isSelected && <FiCheck className="h-3 w-3 text-white" />}
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleTeacherBook(activeTeacherClassTab, book.id)}
                                        className="sr-only"
                                      />
                                    </div>
                                    <FiBook className={`h-4 w-4 flex-shrink-0 transition-colors ${isSelected ? "text-teal-500" : "text-gray-400 group-hover:text-teal-400"}`} />
                                    <span className={`text-sm font-semibold leading-tight ${isSelected ? "text-teal-800 dark:text-teal-400" : "text-gray-700 dark:text-gray-300"}`}>
                                      {book.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <FiAlertCircle className="h-8 w-8 mb-2" />
                            <p className="text-sm font-bold">এই শ্রেণীর কোন বিষয় নেই।</p>
                          </div>
                        )
                      ) : (
                        /* History view */
                        <div className="flex flex-col gap-3">
                          {activeDiary?.teacherLinks && activeDiary.teacherLinks.length > 0 ? (
                            activeDiary.teacherLinks.map((link: any) => (
                              <div key={link.id} className="flex flex-col gap-3 p-3.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{link.name}</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{new Date(link.createdAt).toLocaleDateString("bn-BD")} তারিখে তৈরি</p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                    <button
                                      onClick={() => setActiveHistoryQrId(activeHistoryQrId === link.id ? null : link.id)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                                        activeHistoryQrId === link.id
                                          ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-sm"
                                          : "bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800"
                                      }`}
                                    >
                                      <FiShare2 className="w-3.5 h-3.5" />
                                      QR
                                    </button>
                                    <button
                                      onClick={() => {
                                        try {
                                          if (link.config) {
                                            setTeacherName(link.name);
                                            setTeacherConfig(link.config);
                                            setEditingLinkId(link.id);
                                            setTeacherModalTab("create");
                                            setGeneratedTeacherLink("");
                                            setTeacherLinkQr("");
                                          } else {
                                            const tokenMatch = link.url.match(/token=([^&]+)/);
                                            if (tokenMatch && tokenMatch[1]) {
                                              const payload = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(tokenMatch[1])))));
                                              setTeacherName(payload.tName || link.name);
                                              setTeacherConfig(payload.config || {});
                                              setEditingLinkId(link.id);
                                              setTeacherModalTab("create");
                                              setGeneratedTeacherLink("");
                                              setTeacherLinkQr("");
                                            }
                                          }
                                        } catch (e) {
                                          console.error("Failed to decode token", e);
                                          toast.error("লিঙ্কের তথ্য পড়তে সমস্যা হয়েছে!");
                                        }
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 transition-colors"
                                    >
                                      <FiEdit2 className="w-3.5 h-3.5" />
                                      এডিট
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(link.url);
                                        toast.success("লিঙ্ক কপি হয়েছে!");
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg border border-teal-100 transition-colors"
                                    >
                                      <FiCopy className="w-3.5 h-3.5" />
                                      কপি
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const confirmDel = window.confirm("আপনি কি এই লিঙ্কটি মুছতে চান? মুছে ফেললে এই লিঙ্কটি আর কাজ করবে না।");
                                        if (!confirmDel) return;
                                        const updatedLinks = activeDiary.teacherLinks.filter((l: any) => l.id !== link.id);
                                        try {
                                          await saveDiary({
                                            ...activeDiary,
                                            teacherLinks: updatedLinks,
                                          }).unwrap();
                                          toast.success("লিঙ্ক মুছে ফেলা হয়েছে!");
                                          refetchDiaries();
                                        } catch (e) {
                                          toast.error("লিঙ্ক মুছতে সমস্যা হয়েছে।");
                                        }
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                      <FiTrash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {activeHistoryQrId === link.id && link.qr && (
                                  <div className="mt-2 pt-3 border-t border-gray-100 dark:border-slate-700 flex flex-col items-center animate-fade-in">
                                    <div
                                      className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 cursor-pointer hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md transition-all group"
                                      onClick={() => setFullScreenQrUrl(link.qr)}
                                    >
                                      <img src={link.qr} alt="QR Code" className="w-32 h-32 object-contain group-hover:scale-105 transition-transform duration-300" />
                                    </div>
                                    <p className="text-[10px] font-semibold text-gray-400 mt-2">বড় করে দেখতে কিউআর কোডে ক্লিক করুন</p>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                              <FiClock className="h-8 w-8 mb-2 opacity-50" />
                              <p className="text-sm font-bold">কোনো পূর্বের লিঙ্ক নেই</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Teacher Generate Footer Link */}
                    {teacherModalTab === "create" && (
                      <div className="border-t border-gray-100 dark:border-slate-700 pt-4 mt-2">
                        {!generatedTeacherLink ? (
                          <button
                            onClick={handleGenerateTeacherLink}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-200 hover:from-teal-700 hover:to-emerald-700 transition-all active:scale-[0.98]"
                          >
                            <FiLink className="h-4 w-4" />
                            {editingLinkId ? "লিঙ্ক আপডেট করুন" : "শিক্ষক লিঙ্ক তৈরি করুন"}
                          </button>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {/* Success banner */}
                            <div className="flex items-center gap-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 px-4 py-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 dark:bg-teal-500 text-white">
                                <FiCheck className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-teal-800 dark:text-teal-400">{teacherName} এর লিঙ্ক তৈরি হয়েছে!</p>
                                <p className="text-[11px] text-teal-600 dark:text-teal-500 mt-0.5">QR স্ক্যান বা লিঙ্ক কপি করে শেয়ার করুন</p>
                              </div>
                              {teacherLinkQr && (
                                <div
                                  className="flex-shrink-0 border border-teal-200 rounded-lg p-1.5 bg-white shadow-sm cursor-pointer hover:border-teal-400 hover:shadow-md transition-all group"
                                  onClick={() => setFullScreenQrUrl(teacherLinkQr)}
                                >
                                  <img src={teacherLinkQr} alt="QR" className="h-14 w-14 object-contain group-hover:scale-105 transition-transform duration-300" />
                                </div>
                              )}
                            </div>
                            {/* Link row */}
                            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-1 pl-3">
                              <FiLink className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                              <input
                                type="text"
                                value={generatedTeacherLink}
                                readOnly
                                className="flex-1 bg-transparent text-[11px] text-gray-500 dark:text-gray-400 outline-none truncate font-mono select-all min-w-0"
                              />
                              <button
                                onClick={handleCopyTeacherLink}
                                className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-700 active:scale-95 transition-all flex-shrink-0"
                              >
                                <FiCopy className="h-3.5 w-3.5" />
                                কপি
                              </button>
                            </div>
                            {/* Reset */}
                            <button
                              onClick={() => { setGeneratedTeacherLink(""); setTeacherLinkQr(""); setTeacherName(""); setTeacherConfig({}); setEditingLinkId(null); }}
                              className="text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors text-center underline underline-offset-2"
                            >
                              আরেকজন শিক্ষকের জন্য লিঙ্ক তৈরি করুন
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        }
      />

      {/* EDIT DIARY MODAL */}
      <ModalLayout
        isOpen={isEditModalOpen}
        onChange={() => setIsEditModalOpen(false)}
        title="ডায়েরি আপডেট করুন"
        description="ডায়েরির নাম, শুরুর তারিখ এবং কভার ডিজাইন পরিবর্তন করুন"
        modalSize="md"
        className="z-[9999]"
        modalComponent={
          <div className="flex flex-col gap-5 py-4">
            <div>
              <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-1.5">ডায়েরির নাম</label>
              <input
                type="text"
                value={editDiaryName}
                onChange={(e) => setEditDiaryName(e.target.value)}
                placeholder="ডায়েরির নাম লিখুন..."
                className="w-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3.5 text-base text-gray-800 dark:text-gray-200 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>

            <div>
              <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-1.5">শুরুর তারিখ</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3.5 text-base text-gray-800 dark:text-gray-200 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-1.5">কভার ডিজাইন</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditTemplate(editTemplate.startsWith("moleskine") ? editTemplate : "moleskine")}
                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${editTemplate.startsWith("moleskine") ? "bg-slate-800 text-white border-slate-800 shadow-sm" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
                  >
                    প্রফেশনাল
                  </button>
                  <button
                    onClick={() => setEditTemplate(editTemplate.startsWith("spiral") ? editTemplate : "spiral-blue")}
                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${editTemplate.startsWith("spiral") ? "bg-[#0073a8] text-white border-[#0073a8] shadow-sm" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-[#0073a8] dark:hover:border-[#0073a8]"}`}
                  >
                    স্পাইরাল
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-black text-gray-600 dark:text-gray-300 block mb-2">কভার রঙ</label>
                <div className="flex gap-3">
                  {editTemplate.startsWith("moleskine") ? (
                    <>
                      <button onClick={() => setEditTemplate("moleskine")} className={`h-9 w-9 rounded-full bg-[#f4f1ea] border border-slate-300 shadow-sm ${editTemplate === "moleskine" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Cream"></button>
                      <button onClick={() => setEditTemplate("moleskine-blue")} className={`h-9 w-9 rounded-full bg-slate-800 shadow-sm ${editTemplate === "moleskine-blue" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Navy Blue"></button>
                      <button onClick={() => setEditTemplate("moleskine-green")} className={`h-9 w-9 rounded-full bg-emerald-800 shadow-sm ${editTemplate === "moleskine-green" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Emerald Green"></button>
                      <button onClick={() => setEditTemplate("moleskine-red")} className={`h-9 w-9 rounded-full bg-rose-800 shadow-sm ${editTemplate === "moleskine-red" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Maroon Red"></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditTemplate("spiral-blue")} className={`h-9 w-9 rounded-full bg-[#0073a8] shadow-sm ${editTemplate === "spiral-blue" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Blue"></button>
                      <button onClick={() => setEditTemplate("spiral-teal")} className={`h-9 w-9 rounded-full bg-teal-600 shadow-sm ${editTemplate === "spiral-teal" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Teal"></button>
                      <button onClick={() => setEditTemplate("spiral-rose")} className={`h-9 w-9 rounded-full bg-rose-600 shadow-sm ${editTemplate === "spiral-rose" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Rose"></button>
                      <button onClick={() => setEditTemplate("spiral-slate")} className={`h-9 w-9 rounded-full bg-slate-700 shadow-sm ${editTemplate === "spiral-slate" ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-110"}`} title="Slate"></button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-5">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl border border-gray-300 dark:border-slate-600 px-6 py-3 text-base font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                বাতিল
              </button>
              <Button
                onClick={handleEditSubmit}
                disabled={isSavingDiary}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-100"
              >
                {isSavingDiary ? "সংরক্ষণ করা হচ্ছে..." : "পরিবর্তন সেভ করুন"}
              </Button>
            </div>
          </div>
        }
      />

      {/* DELETE CONFIRMATION MODAL */}
      <ModalLayout
        isOpen={isDeleteModalOpen}
        onChange={() => setIsDeleteModalOpen(false)}
        title="ডায়েরি মুছে ফেলুন"
        description="আপনি কি নিশ্চিত যে এই ডায়েরিটি মুছে ফেলতে চান?"
        modalSize="md"
        className="z-[9999]"
        modalComponent={
          <div className="flex flex-col gap-6 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <FiTrash2 className="h-8 w-8 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              এই ডায়েরিটি মুছে ফেললে এর সকল লগ এবং ডেটা স্থায়ীভাবে মুছে যাবে। এটি আর ফেরত পাওয়া যাবে না।
            </p>
            <div className="flex justify-center gap-4 mt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-gray-300 dark:border-slate-600 px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-700 shadow-md shadow-rose-100"
              >
                মুছে ফেলুন
              </button>
            </div>
          </div>
        }
      />

      {/* FULLSCREEN QR OVERLAY */}
      {fullScreenQrUrl && (
        <div
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 p-6 backdrop-blur-sm animate-fade-in"
          onClick={() => setFullScreenQrUrl(null)}
        >
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-sm w-full mx-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setFullScreenQrUrl(null)}
              className="absolute -top-4 -right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 shadow-xl hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all border border-gray-200 dark:border-slate-700"
            >
              <FiX className="h-5 w-5" />
            </button>
            <div className="text-center mb-6">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">QR স্ক্যান করুন</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ক্যামেরা দিয়ে স্ক্যান করে সরাসরি যুক্ত হোন</p>
            </div>
            <div className="border-4 border-gray-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-200 shadow-inner">
              <img src={fullScreenQrUrl} alt="Fullscreen QR" className="w-full h-auto object-contain rounded-xl" />
            </div>
            <button
              onClick={() => setFullScreenQrUrl(null)}
              className="mt-6 w-full py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* PUBLISH TIME MODAL */}
      {showPublishTimeModal && (
        <div
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowPublishTimeModal(false)}
        >
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-sm w-full mx-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowPublishTimeModal(false)}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors"
            >
              <FiX className="h-5 w-5" />
            </button>
            <div className="mb-2 flex flex-col items-center text-center">
              <h3 className="text-xl font-black text-gray-900 dark:text-white mt-2">পাবলিশ সময়</h3>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 mb-4">অভিভাবকরা আজকের ডায়েরি এই সময়ের পর দেখতে পাবেন।</p>
            </div>

            {/* Header / Current Time Display */}
            <div className="mb-6 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setIsPublishTimeEnabled(false)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${!isPublishTimeEnabled ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                >
                  সময় বন্ধ রাখুন
                </button>
                <button
                  onClick={() => setIsPublishTimeEnabled(true)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${isPublishTimeEnabled ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                >
                  সময় সেট করুন
                </button>
              </div>

              {isPublishTimeEnabled && (
                <div className="flex items-center gap-2 text-4xl font-black text-gray-800 dark:text-gray-200 tracking-wider">
                  <div
                    className={`cursor-pointer px-2 py-1 rounded-xl transition-colors ${clockStep === "hour" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300" : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"}`}
                    onClick={() => setClockStep("hour")}
                  >
                    {String(selectedHour).padStart(2, '0')}
                  </div>
                  <span className="text-gray-300 dark:text-gray-600 pb-1">:</span>
                  <div
                    className={`cursor-pointer px-2 py-1 rounded-xl transition-colors ${clockStep === "minute" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300" : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"}`}
                    onClick={() => setClockStep("minute")}
                  >
                    {String(selectedMinute).padStart(2, '0')}
                  </div>
                  <div className="flex flex-col text-xs ml-2 font-bold gap-1">
                    <button onClick={() => setPeriod("AM")} className={`px-2 py-1 rounded-md transition-colors ${period === "AM" ? "bg-indigo-600 dark:bg-indigo-500 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"}`}>AM</button>
                    <button onClick={() => setPeriod("PM")} className={`px-2 py-1 rounded-md transition-colors ${period === "PM" ? "bg-indigo-600 dark:bg-indigo-500 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"}`}>PM</button>
                  </div>
                </div>
              )}
            </div>

            {/* CLOCK UI */}
            {isPublishTimeEnabled && (
              <div className="relative w-64 h-64 rounded-full bg-slate-50 dark:bg-slate-800 border-[6px] border-indigo-50/50 dark:border-indigo-900/20 flex items-center justify-center mx-auto mb-8 shadow-inner animate-fade-in select-none">
                {/* Center dot */}
                <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400 absolute z-10 shadow-sm"></div>
                {/* Hand */}
                <div
                  className="absolute bottom-1/2 left-1/2 w-1.5 bg-indigo-500 origin-bottom rounded-full transition-all duration-300 shadow-md"
                  style={{
                    height: '38%',
                    transform: `translateX(-50%) rotate(${clockStep === 'hour' ? (selectedHour % 12) * 30 : selectedMinute * 6}deg)`
                  }}
                />
                {/* Numbers */}
                {(clockStep === "hour" ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]).map((num, i) => {
                  const angle = i * 30;
                  const rad = (angle - 90) * (Math.PI / 180);
                  const radius = 100;
                  const x = Math.cos(rad) * radius;
                  const y = Math.sin(rad) * radius;
                  const isSelected = clockStep === "hour" ? selectedHour === (num === 0 ? 12 : num) : selectedMinute === num;

                  return (
                    <button
                      key={num}
                      onClick={() => {
                        if (clockStep === "hour") {
                          setSelectedHour(num === 0 ? 12 : num);
                          setTimeout(() => setClockStep("minute"), 300);
                        } else {
                          setSelectedMinute(num);
                        }
                      }}
                      className={`absolute w-10 h-10 flex items-center justify-center rounded-full text-base font-bold transition-all -ml-5 -mt-5 z-20 outline-none ${isSelected ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xl scale-110' : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:scale-105 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm'}`}
                      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                    >
                      {String(num).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleSavePublishTime}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all text-lg"
            >
              সেভ করুন
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP CHAT POPUP MODAL */}

      {activeInputBookId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:hidden">
          <div className="flex flex-col h-[700px] max-h-[90vh] max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-150 dark:border-slate-700 overflow-hidden animate-fade-in">
            {/* Header: Styled like WhatsApp contact bar */}
            <div className="flex items-center justify-between bg-indigo-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white font-bold border border-indigo-400">
                  <FiBook className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl leading-tight flex items-center gap-2">
                    {activeDiaryClasses.find(c => c.className === activeTabClass)?.books.find(b => b.id === activeInputBookId)?.name || "বিষয়"}
                    <span className="bg-indigo-500 border border-indigo-400 text-white text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {activeTabClass}
                    </span>
                  </h3>
                  <span className="text-xs sm:text-sm font-semibold text-indigo-200">
                    আজকের পাঠ ও বাড়ির কাজ যোগ করুন
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  let prevBookToUse = null;
                  let nextBookToUse = null;
                  let prevClassToSet: string | null = null;
                  let nextClassToSet: string | null = null;

                  const currentClassIndex = activeDiaryClasses.findIndex((c: any) => c.className === activeTabClass);
                  const currentIndex = activeClassBooks.findIndex((b: any) => b.id === activeInputBookId);

                  if (currentIndex > 0) {
                    prevBookToUse = activeClassBooks[currentIndex - 1];
                  } else if (currentClassIndex > 0) {
                    const prevClass = activeDiaryClasses[currentClassIndex - 1];
                    if (prevClass && prevClass.books && prevClass.books.length > 0) {
                      prevBookToUse = prevClass.books[prevClass.books.length - 1];
                      prevClassToSet = prevClass.className;
                    }
                  }

                  if (currentIndex !== -1 && currentIndex < activeClassBooks.length - 1) {
                    nextBookToUse = activeClassBooks[currentIndex + 1];
                  } else if (currentClassIndex !== -1 && currentClassIndex < activeDiaryClasses.length - 1) {
                    const nextClass = activeDiaryClasses[currentClassIndex + 1];
                    if (nextClass && nextClass.books && nextClass.books.length > 0) {
                      nextBookToUse = nextClass.books[0];
                      nextClassToSet = nextClass.className;
                    }
                  }

                  const handlePrev = () => {
                    if (prevClassToSet) setActiveTabClass(prevClassToSet);
                    if (prevBookToUse) setActiveInputBookId(prevBookToUse.id);
                  };

                  const handleNext = () => {
                    if (nextClassToSet) setActiveTabClass(nextClassToSet);
                    if (nextBookToUse) setActiveInputBookId(nextBookToUse.id);
                  };

                  return (
                    <div className="flex items-center gap-1 mr-2 bg-indigo-700/50 rounded-full p-1">
                      <button
                        onClick={handlePrev}
                        disabled={!prevBookToUse}
                        className="rounded-full p-1.5 text-indigo-100 hover:bg-indigo-500 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="আগের বিষয়"
                      >
                        <FiChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={!nextBookToUse}
                        className="rounded-full p-1.5 text-indigo-100 hover:bg-indigo-500 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="পরের বিষয়"
                      >
                        <FiChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  );
                })()}
                <button
                  onClick={() => {
                    setActiveInputBookId(null);
                    setInputText("");
                    setEditingLine(null);
                  }}
                  className="rounded-full p-2 text-indigo-100 hover:bg-indigo-700 hover:text-white transition-colors"
                  title="বন্ধ করুন"
                >
                  <FiPlus className="h-5 w-5 rotate-45" />
                </button>
              </div>
            </div>

            {/* Empty area / Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 flex flex-col gap-3 scrollbar-thin">
              {(() => {
                const uniqueKey = `${activeTabClass}:${activeInputBookId}`;
                const log = editingLogs[uniqueKey] || {};
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
                      <div className="flex items-center gap-2.5 w-full select-none mb-1">
                        <div className={`flex-grow h-[1.5px] ${bubbleColor.border.replace('border-', 'bg-')}`} />
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border select-none ${bubbleColor.lightBg} ${bubbleColor.text} ${bubbleColor.border}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${bubbleColor.bg}`} />
                            <span>{bubbleTypeConfig.label.split(' ')[0]}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 w-full">
                        {/<[a-z][\s\S]*>/i.test(bubble.value) ? (
                          // HTML rich content: render as formatted block
                          <div className="relative group/html bg-white dark:bg-slate-800 rounded-xl px-4 py-2 w-full">
                            <div
                              className="diary-html-content prose prose-sm max-w-none pr-14 dark:prose-invert"
                              dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(bubble.value) }}
                            />
                            <button
                              onClick={() => {
                                setInputText(bubble.value);
                                setInputLogType(bubble.type);
                                setEditingLine({ type: bubble.type, index: -1 });
                              }}
                              className="absolute top-2 right-8 opacity-0 group-hover/html:opacity-100 text-gray-400 hover:text-indigo-650 transition-opacity p-0.5 print:hidden"
                              title="সম্পাদনা করুন"
                            >
                              <FiEdit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                const currentLog = editingLogs[uniqueKey] || {};
                                const updatedLog = { ...currentLog, [bubble.type]: "" };
                                setEditingLogs(prev => ({ ...prev, [uniqueKey]: updatedLog }));
                                await handleDeleteLogLine(activeInputBookId!, bubble.type, -1);
                              }}
                              className="absolute top-2 right-2 opacity-0 group-hover/html:opacity-100 text-gray-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden"
                              title="মুছে ফেলুন"
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (() => {
                          const lines = bubble.value.split("\n").filter(line => line.trim() !== "");
                          const totalLines = lines.length;
                          return lines.map((line, lIdx) => {
                            const isBangla = /[\u0980-\u09FF]/.test(line);
                            const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line);
                            const alreadyHasNumber = /^[0-9০-৯٠-٩]+[.)]\s/.test(line.trim());
                            let numberStr = "";
                            if (!alreadyHasNumber) {
                               const num = lIdx + 1;
                              if (isBangla) {
                                numberStr = toBanglaNumber(num) + ". ";
                              } else if (isArabic) {
                                const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
                                const toArabicNumber = (n: number) =>
                                  n.toString().split("").map((d) => {
                                    const parsed = parseInt(d);
                                    return isNaN(parsed) ? d : arabicDigits[parsed];
                                  }).join("");
                                numberStr = toArabicNumber(num) + ". ";
                              } else {
                                numberStr = num + ". ";
                              }
                            }
                            return (
                              <div key={lIdx} className="relative group bg-white dark:bg-slate-800 rounded-xl px-4 py-2 flex items-center justify-between gap-4 w-full">
                                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                  {numberStr && (
                                    <span className="text-gray-405 dark:text-gray-400 font-bold select-none flex-shrink-0 text-sm">
                                      {numberStr}
                                    </span>
                                  )}
                                  <p
                                    dir={isArabic ? "rtl" : "ltr"}
                                    className={`text-sm text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap flex-1 ${isArabic ? "pl-14 text-right" : "pr-14 text-left"}`}
                                  >
                                    {line}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setInputText(line);
                                    setInputLogType(bubble.type);
                                    setEditingLine({ type: bubble.type, index: lIdx });
                                  }}
                                  className={`absolute top-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-650 transition-opacity p-0.5 print:hidden ${isArabic ? "left-8" : "right-8"}`}
                                  title="সম্পাদনা করুন"
                                >
                                  <FiEdit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const currentLog = editingLogs[uniqueKey] || {};
                                    const tLines = (currentLog[bubble.type] || "").split("\n").filter(l => l.trim() !== "");
                                    tLines.splice(lIdx, 1);
                                    const newLogObj = { ...currentLog, [bubble.type]: tLines.join("\n") };
                                    setEditingLogs(prev => ({ ...prev, [uniqueKey]: newLogObj }));
                                    handleDeleteLogLine(activeInputBookId!, bubble.type, lIdx);
                                  }}
                                  className={`absolute top-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 transition-opacity p-0.5 print:hidden ${isArabic ? "left-2" : "right-2"}`}
                                  title="মুছে ফেলুন"
                                >
                                  <FiTrash2 className="h-3.5 w-3.5" />
                                </button>
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
                <div className="flex gap-2 min-w-full">
                  {logTypes.map((type: any) => {
                    const isActive = inputLogType === type.id;
                    const colors = getColorClasses(type.color);
                    return (
                      <button
                        key={type.id}
                        id={`pill-${type.id}`}
                        onClick={(e) => {
                          setInputLogType(type.id);
                          e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                        }}
                        className={`flex-none rounded-full px-4 py-2 text-sm font-bold border transition-all duration-200 active:scale-95 cursor-pointer ${isActive ? colors.activeBg : colors.hoverBg}`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setIsAddTypeModalOpen(true)}
                    className="flex-none rounded-full px-3 py-2 text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center"
                    title="নতুন টাস্ক টাইপ যোগ করুন"
                  >
                    <FiPlus className="h-5 w-5 text-rose-500 font-bold" />
                  </button>
                </div>
              </div>

              {/* Text Input Composer */}
              {editingLine && (
                <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-900/50 rounded-xl px-4 py-2 text-xs text-amber-800 dark:text-amber-400 animate-fade-in shadow-sm">
                  <span className="font-bold">
                    সম্পাদনা করছেন: {logTypes.find((t: any) => t.id === editingLine.type)?.label.split(' ')[0] || editingLine.type.toUpperCase()} (লাইন {toBanglaNumber(editingLine.index + 1)})
                  </span>
                  <button
                    onClick={() => {
                      setEditingLine(null);
                      setInputText("");
                    }}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-bold bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded transition-colors"
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
                      <div className="w-full max-h-[300px] overflow-y-auto">
                        <Editor
                          pasteOnlyMode={true}
                          value={inputText}
                          onChange={setInputText}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendWhatsAppLog(activeInputBookId!)}
                      disabled={!inputText || inputText.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim() === '' || isSavingDiary}
                      className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md active:scale-90 transition-all disabled:opacity-40 disabled:pointer-events-none ${activeColors.activeBg}`}
                      title="পাঠান"
                    >
                      <FiSend className="h-4.5 w-4.5" />
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
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/50 px-5 py-4 border-b border-indigo-100 dark:border-indigo-900/50">
              <h3 className="font-black text-indigo-900 dark:text-indigo-100 text-lg">নতুন টাস্ক টাইপ</h3>
              <button onClick={() => setIsAddTypeModalOpen(false)} className="text-indigo-400 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-100 transition-colors">
                <FiX className="h-6 w-6" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">টাইপের নাম (যেমন: Project)</label>
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
                disabled={!newTypeLabel.trim() || isSavingDiary}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all mt-2 flex items-center justify-center gap-2"
              >
                {isSavingDiary ? <FiClock className="animate-spin h-5 w-5" /> : <FiPlus className="h-5 w-5" />}
                তৈরি করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CALENDAR MODAL (Handles both Date Selection and Holiday Creation) */}
      <ModalLayout
        isOpen={isCalendarOpen}
        onChange={() => setIsCalendarOpen(false)}
        title={calendarMode === "selectDate" ? "তারিখ নির্বাচন করুন" : "ছুটি যোগ করুন"}
        description={calendarMode === "selectDate" ? "ক্লাস ডায়েরির তারিখ সিলেক্ট করুন" : "যেসব দিনে ক্লাস হবে না সেই দিনগুলোকে ছুটি হিসেবে চিহ্নিত করুন"}
        modalSize="md"
        className="z-[9999]"
        modalComponent={(() => {
          const year = calendarViewDate.getFullYear();
          const month = calendarViewDate.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const firstDayIndex = new Date(year, month, 1).getDay();

          const handlePrevMonth = () => setCalendarViewDate(new Date(year, month - 1, 1));
          const handleNextMonth = () => setCalendarViewDate(new Date(year, month + 1, 1));

          const handleHolidayDateClick = (dateStr: string) => {
            if (holidayStart !== holidayEnd) {
              setHolidayStart(dateStr);
              setHolidayEnd(dateStr);
            } else {
              if (dateStr < holidayStart) {
                setHolidayStart(dateStr);
              } else {
                setHolidayEnd(dateStr);
              }
            }
          };

          return (
            <div className="flex flex-col gap-4 py-2 select-none">
              {/* Mode Toggle */}
              <div className="flex overflow-hidden p-1 bg-slate-100 rounded-xl mb-2">
                <button
                  onClick={() => { setCalendarMode("selectDate"); setShowHolidayNameStep(false); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${calendarMode === "selectDate" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                    }`}
                >
                  ডায়েরি তারিখ
                </button>
                <button
                  onClick={() => { setCalendarMode("addHoliday"); setShowHolidayNameStep(false); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${calendarMode === "addHoliday" ? "bg-white text-rose-600 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                    }`}
                >
                  ছুটি যোগ করুন
                </button>
              </div>

              {calendarMode === "selectDate" && diaryMode === "weekly" && (
                <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-xl mb-2 border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-700">সপ্তাহ শুরুর দিন:</span>
                  <select
                    value={activeDiary?.weekStartDay || "Saturday"}
                    onChange={async (e) => {
                      if (!activeDiary) return;
                      try {
                        await saveDiary({
                          ...activeDiary,
                          weekStartDay: e.target.value
                        }).unwrap();
                        toast.success("সপ্তাহ শুরুর দিন আপডেট হয়েছে!");
                        refetchDiaries();
                      } catch (err) {
                        toast.error("আপডেট করতে ব্যর্থ হয়েছে");
                      }
                    }}
                    className="bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-bold text-indigo-700 outline-none cursor-pointer"
                  >
                    <option value="Saturday">শনিবার</option>
                    <option value="Sunday">রবিবার</option>
                  </select>
                </div>
              )}

              {/* Header: Month and Year Selector */}
              <div className="flex items-center justify-between border-b pb-3 mb-1">
                <button
                  onClick={handlePrevMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-gray-150 text-gray-600 hover:bg-slate-100 hover:text-indigo-600 transition-all active:scale-90"
                  title="পূর্ববর্তী মাস"
                >
                  <FiChevronLeft className="h-5 w-5" />
                </button>

                <h4 className="text-md font-bold text-gray-800 tracking-wide">
                  {banglaMonths[month]} {toBanglaNumber(year)}
                </h4>

                <button
                  onClick={handleNextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-gray-150 text-gray-600 hover:bg-slate-100 hover:text-indigo-600 transition-all active:scale-90"
                  title="পরবর্তী মাস"
                >
                  <FiChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Weekdays Grid */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-gray-400 mb-1">
                {["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {/* Empty offset cells */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const formattedMonth = String(month + 1).padStart(2, "0");
                  const formattedDay = String(dayNum).padStart(2, "0");
                  const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

                  const isSelectedDate = selectedDate === dateStr;
                  const today = new Date();
                  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum;

                  // Tasks & Holidays info
                  const dateEntries = activeDiary?.entries?.[dateStr];
                  const hasTask = dateEntries
                    ? Object.values(dateEntries).some((classData: any) =>
                      Object.values(classData).some((bookData: any) =>
                        Object.values(bookData || {}).some(val => typeof val === 'string' && val.trim() !== '')
                      )
                    )
                    : false;

                  const holidays: Holiday[] = activeDiary?.holidays || [];
                  const holiday = isDateInHoliday(dateStr, holidays);

                  // Holiday selection mode vars
                  const isHolStart = dateStr === holidayStart;
                  const isHolEnd = dateStr === holidayEnd;
                  const isHolBetween = dateStr > holidayStart && dateStr < holidayEnd;

                  let cellClasses = "text-gray-700 hover:bg-slate-50 hover:text-indigo-600 border border-transparent hover:border-slate-100";

                  if (calendarMode === "selectDate") {
                    if (diaryMode === "weekly") {
                      const range = getWeekRange(selectedDate, activeDiary?.weekStartDay || "Saturday");
                      const isHighlighted = dateStr >= range.start && dateStr <= range.end;
                      if (isHighlighted) {
                        cellClasses = "bg-indigo-600 text-white shadow-md shadow-indigo-100 font-black scale-105";
                      } else if (holiday) {
                        cellClasses = "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100";
                      }
                    } else {
                      if (isSelectedDate) cellClasses = "bg-indigo-600 text-white shadow-md shadow-indigo-100 font-black scale-105";
                      else if (holiday) cellClasses = "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100";
                    }
                  } else {
                    if (isHolStart || isHolEnd) cellClasses = "bg-rose-600 text-white shadow-md shadow-rose-200 font-black scale-105";
                    else if (isHolBetween) cellClasses = "bg-rose-100 text-rose-700";
                    else if (holiday) cellClasses = "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 opacity-50";
                  }

                  return (
                    <button
                      key={`day-${dayNum}`}
                      onClick={() => {
                        if (calendarMode === "selectDate") {
                          if (diaryMode === "weekly") {
                            const range = getWeekRange(dateStr, activeDiary?.weekStartDay || "Saturday");
                            handleDateChange(range.start);
                          } else {
                            handleDateChange(dateStr);
                          }
                          setIsCalendarOpen(false);
                        } else {
                          handleHolidayDateClick(dateStr);
                        }
                      }}
                      className={`aspect-square w-full flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all relative ${cellClasses}`}
                    >
                      <span>{toBanglaNumber(dayNum)}</span>

                      {/* Dot indicators at bottom: only in selectDate mode */}
                      {calendarMode === "selectDate" && (isToday || hasTask) && (
                        <span className="absolute bottom-1 flex items-center gap-0.5">
                          {isToday && (
                            <span className={`h-1 w-1 rounded-full ${isSelectedDate ? "bg-white" : "bg-indigo-500"}`} />
                          )}
                          {hasTask && (
                            <span className={`h-1.5 w-1.5 rounded-full ${isSelectedDate ? "bg-emerald-300" : "bg-emerald-500"}`} />
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add Holiday Form (shows only in addHoliday mode) */}
              {calendarMode === "addHoliday" && (
                <div className="flex flex-col gap-3 mt-2 border-t pt-4">

                  {/* Step 1: Date display + Next button */}
                  <div className="text-center text-xs font-bold text-rose-600 bg-rose-50 rounded-lg py-2.5">
                    {holidayStart === holidayEnd
                      ? `নির্বাচিত তারিখ: ${formatBanglaDate(holidayStart)}`
                      : `${formatBanglaDate(holidayStart)} থেকে ${formatBanglaDate(holidayEnd)}`}
                  </div>
                  <Button
                    onClick={() => setShowHolidayNameStep(true)}
                    className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 py-3 font-bold text-white shadow-md hover:from-rose-600 hover:to-pink-600"
                  >
                    পরবর্তী →
                  </Button>

                  {/* Existing Holidays List */}
                  {activeDiary?.holidays && activeDiary.holidays.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">পূর্বের ছুটি সমূহ</h4>
                      <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                        {activeDiary.holidays.map((h: Holiday) => (
                          <div key={h.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-slate-50 p-2.5">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{h.name}</p>
                              <p className="text-xs font-bold text-gray-500">{formatHolidayRange(h)}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteHoliday(h.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions Footer (shows only in selectDate mode) */}
              {calendarMode === "selectDate" && (
                <div className="flex justify-between items-center border-t pt-4 mt-2">
                  <button
                    onClick={() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      handleDateChange(todayStr);
                      setIsCalendarOpen(false);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-850 transition-colors bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                  >
                    আজকে যান (আজ: {formatBanglaDate(new Date().toISOString().split("T")[0])})
                  </button>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-gray-150"
                  >
                    বাতিল
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      />

      {/* Holiday Name Popup Modal */}
      <ModalLayout
        isOpen={showHolidayNameStep}
        onChange={() => { setShowHolidayNameStep(false); setHolidayName(""); }}
        title="ছুটির নাম দিন"
        description="আপনার নির্বাচিত ছুটির জন্য একটি নাম দিন"
        modalSize="sm"
        className="z-[99999]"
        modalComponent={
          <div className="flex flex-col gap-4 py-2 select-none">
            <div className="text-center text-xs font-bold text-rose-600 bg-rose-50 rounded-lg py-2">
              {holidayStart === holidayEnd
                ? `নির্বাচিত তারিখ: ${formatBanglaDate(holidayStart)}`
                : `${formatBanglaDate(holidayStart)} থেকে ${formatBanglaDate(holidayEnd)}`}
            </div>
            <input
              type="text"
              autoFocus
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && holidayName.trim()) handleSaveHoliday(); }}
              placeholder="ছুটির নাম দিন (যেমন: ঈদুল ফিতর)"
              className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowHolidayNameStep(false); setHolidayName(""); }}
                className="flex-none px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
              >
                বাতিল
              </button>
              <Button
                onClick={handleSaveHoliday}
                loading={isSavingHoliday}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-3 font-bold text-white shadow-md hover:from-rose-700 hover:to-pink-700"
              >
                ছুটি সেভ করুন
              </Button>
            </div>
          </div>
        }
      />

      {/* TOAST MESSAGE */}
      {toastMsg && <Toast message={toastMsg.message} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}

