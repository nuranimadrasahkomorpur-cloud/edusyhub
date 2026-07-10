"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar as FiCalendar,
  X as FiX,
  Check as FiCheck,
  Plus as FiPlus,
  ChevronDown as FiChevronDown,
  ChevronLeft as FiChevronLeft,
  ChevronRight as FiChevronRight,
  ChevronsLeft as FiChevronsLeft,
  ChevronsRight as FiChevronsRight,
  Search as FiSearch,
  Info as FiInfo,
  Book as FiBook,
  Edit2 as FiEdit2,
  AlertCircle as FiAlertCircle,
  CheckCircle as FiCheckCircle,
  Trash2 as FiTrash2,
} from "lucide-react";
import ModalLayout from "@/components/Modal";

// Fallback toast if no library is available
const toast = {
  success: (msg: string) => alert(msg),
  error: (msg: string) => alert(msg),
};

// Helper for Bangla date formatting and digits
const banglaMonths = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];
const banglaDays = [
  "রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"
];

const toBanglaNumber = (num: number | string): string => {
  const banglaDigits: Record<string, string> = {
    "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
    "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"
  };
  return num
    .toString()
    .split("")
    .map((digit) => banglaDigits[digit] || digit)
    .join("");
};

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

type Holiday = { id: string; name: string; startDate: string; endDate: string };

const isDateInHoliday = (dateStr: string, holidays: Holiday[]): Holiday | null => {
  for (const h of holidays) {
    if (dateStr >= h.startDate && dateStr <= h.endDate) return h;
  }
  return null;
};

// Calculate next week range based on start day
const getNextWeekRange = (weekStartDay: string = "Saturday") => {
  const today = new Date();
  const day = today.getDay(); // Sunday is 0, Saturday is 6
  let daysToNextWeekStart = 0;
  if (weekStartDay === "Saturday") {
    daysToNextWeekStart = (6 - day + 7) % 7;
    if (daysToNextWeekStart === 0) daysToNextWeekStart = 7;
  } else {
    daysToNextWeekStart = (7 - day) % 7;
    if (daysToNextWeekStart === 0) daysToNextWeekStart = 7;
  }
  
  const nextWeekStart = new Date(today);
  nextWeekStart.setDate(today.getDate() + daysToNextWeekStart);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
  
  return {
    start: nextWeekStart.toISOString().split("T")[0],
    end: nextWeekEnd.toISOString().split("T")[0]
  };
};

const isEntryBlank = (entry: any) => {
  if (!entry) return true;
  const fields = ["cw", "hw", "test", "notice", "general"];
  const hasContent = fields.some(field => {
    const val = entry[field];
    if (!val || typeof val !== "string") return false;
    const cleaned = val.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, "").replace(/&#160;/g, "").replace(/\u200b/g, "").trim();
    return cleaned !== "";
  });
  return !hasContent;
};

interface CheckupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDiary: any;
  allowedConfig?: Record<string, string[]>; // Undefined for Admin, present for Teacher
  onSaveEntries: (
    updatedEntries: any,
    targetClass: string | string[],
    targetDates: string[]
  ) => Promise<boolean>;
  logTypes: Array<{ id: string; label: string; color: string }>;
  onOpenDirectEditor?: (date: string, className: string, bookId: string) => void;
}

export default function CheckupModal({
  isOpen,
  onClose,
  currentDiary,
  allowedConfig,
  onSaveEntries,
  logTypes,
  onOpenDirectEditor,
}: CheckupModalProps) {
  // Compute default next week dates
  const defaultRange = useMemo(() => {
    return getNextWeekRange(currentDiary?.weekStartDay || "Saturday");
  }, [currentDiary?.weekStartDay]);

  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  
  // Custom Calendar and Range Selector States
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date(defaultRange.start || new Date()));
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const classTabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedClassFilter && classTabsContainerRef.current) {
      const container = classTabsContainerRef.current;
      const activeBtn = container.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtn) {
        setTimeout(() => {
          const scrollLeft = activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2);
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }, 50);
      }
    }
  }, [selectedClassFilter]);

  const handlePrevMonth = () => {
    const d = new Date(calendarViewDate);
    d.setMonth(d.getMonth() - 1);
    setCalendarViewDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(calendarViewDate);
    d.setMonth(d.getMonth() + 1);
    setCalendarViewDate(d);
  };

  const calendarDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
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
  }, [calendarViewDate]);

  const handleRangeDateClick = (dateStr: string) => {
    if (startDate !== endDate) {
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else {
      if (dateStr < startDate) {
        setStartDate(dateStr);
      } else {
        setEndDate(dateStr);
      }
    }
  };

  const shiftRange = (days: number) => {
    if (!startDate || !endDate) return;
    
    const s = new Date(startDate);
    s.setDate(s.getDate() + days);
    const newStart = s.toISOString().split("T")[0];
    
    const e = new Date(endDate);
    e.setDate(e.getDate() + days);
    const newEnd = e.toISOString().split("T")[0];
    
    setStartDate(newStart);
    setEndDate(newEnd);
    setCalendarViewDate(new Date(newStart));
  };
  
  // Set default selection dates when modal opens
  useEffect(() => {
    if (isOpen) {
      const range = getNextWeekRange(currentDiary?.weekStartDay || "Saturday");
      setStartDate(range.start);
      setEndDate(range.end);
      setCalendarViewDate(new Date(range.start));
    }
  }, [isOpen, currentDiary?.weekStartDay]);

  // Initial checkup days (all days except weekly holidays)
  const [checkupDays, setCheckupDays] = useState<string[]>([]);

  useEffect(() => {
    const allDays = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const weeklyHols = currentDiary?.weeklyHolidays || ["Friday"];
    setCheckupDays(allDays.filter((d) => !weeklyHols.includes(d)));
  }, [currentDiary?.weeklyHolidays]);

  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSkipped, setShowSkipped] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [emptyList, setEmptyList] = useState<any[]>([]);



  const dayOptions = [
    { id: "Saturday", label: "শনি" },
    { id: "Sunday", label: "রবি" },
    { id: "Monday", label: "সোম" },
    { id: "Tuesday", label: "মঙ্গল" },
    { id: "Wednesday", label: "বুধ" },
    { id: "Thursday", label: "বৃহঃ" },
    { id: "Friday", label: "শুক্র" }
  ];

  const handleCheck = () => {
    if (!startDate || !endDate || !currentDiary) return;
    setIsChecking(true);

    try {
      const dates: string[] = [];
      let curr = new Date(startDate);
      const end = new Date(endDate);

      // Prevent infinite loop
      let count = 0;
      while (curr <= end && count < 100) {
        dates.push(curr.toISOString().split("T")[0]);
        curr.setDate(curr.getDate() + 1);
        count++;
      }

      const foundEmpty: any[] = [];
      const classesConfig = currentDiary?.config || [];
      const allowedClasses = allowedConfig ? Object.keys(allowedConfig) : classesConfig.map((c: any) => c.className);

      dates.forEach((dateStr) => {
        const d = new Date(dateStr);
        const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];

        // Filter by day of week selection
        if (!checkupDays.includes(dayOfWeek)) return;

        // Exclude holidays
        if (excludeHolidays) {
          const isWeeklyHol = (currentDiary?.weeklyHolidays || ["Friday"]).includes(dayOfWeek);
          const isSchoolHol = !!isDateInHoliday(dateStr, currentDiary?.holidays || []);
          if (isWeeklyHol || isSchoolHol) return;
        }

        // Check classes
        allowedClasses.forEach((className: string) => {
          const classConf = classesConfig.find((c: any) => c.className === className);
          if (!classConf) return;

          const books = classConf.books || [];
          const allowedBooks = allowedConfig 
            ? books.filter((b: any) => allowedConfig[className].includes(b.id)) 
            : books;

          allowedBooks.forEach((book: any) => {
            const entry = currentDiary?.entries?.[dateStr]?.[className]?.[book.id];
            
            // Skip if hidden
            if (entry?.isHidden === true) return;

            const isEmpty = isEntryBlank(entry);
            const isSkipped = !!entry?.isSkipped;

            if (isEmpty) {
              foundEmpty.push({
                date: dateStr,
                className,
                bookId: book.id,
                bookName: book.name,
                isSkipped
              });
            }
          });
        });
      });

      setEmptyList(foundEmpty);
    } catch (err) {
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  // Run checkup automatically when inputs or diary entries change
  useEffect(() => {
    if (isOpen) {
      handleCheck();
    }
  }, [startDate, endDate, checkupDays, excludeHolidays, currentDiary?.entries, isOpen]);

  // Toggle checklist of days
  const handleToggleDay = (dayId: string) => {
    setCheckupDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  // Skip a subject (persists `isSkipped: true`)
  const handleSkipSubject = async (item: any) => {
    const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
    if (!currentEntries[item.date]) currentEntries[item.date] = {};
    if (!currentEntries[item.date][item.className]) currentEntries[item.date][item.className] = {};
    if (!currentEntries[item.date][item.className][item.bookId]) currentEntries[item.date][item.className][item.bookId] = {};
    
    currentEntries[item.date][item.className][item.bookId] = {
      ...currentEntries[item.date][item.className][item.bookId],
      isSkipped: true
    };

    const success = await onSaveEntries(currentEntries, item.className, [item.date]);

    if (success) {
      toast.success("বিষয়টি বাদ দেওয়া হয়েছে!");
    }
  };

  // Unskip a subject
  const handleUnskipSubject = async (item: any) => {
    const currentEntries = JSON.parse(JSON.stringify(currentDiary.entries || {}));
    if (currentEntries[item.date]?.[item.className]?.[item.bookId]) {
      delete currentEntries[item.date][item.className][item.bookId].isSkipped;
      
      const success = await onSaveEntries(currentEntries, item.className, [item.date]);
      
      if (success) {
        toast.success("বিষয়টি পুনরায় তালিকায় যুক্ত করা হয়েছে!");
      }
    }
  };



  // Filter list by search query and showSkipped state and selectedClassFilter
  const filteredList = useMemo(() => {
    return emptyList.filter((item) => {
      const matchesSearch =
        item.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.bookName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSkipped = item.isSkipped === showSkipped;
      const matchesClass = selectedClassFilter === "all" || item.className === selectedClassFilter;
      
      return matchesSearch && matchesSkipped && matchesClass;
    });
  }, [emptyList, searchQuery, showSkipped, selectedClassFilter]);

  // Group filtered results by Date
  const groupedResults = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredList.forEach((item) => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      groups[item.date].push(item);
    });
    // Sort dates ascending
    return Object.keys(groups)
      .sort()
      .map((date) => ({
        date,
        items: groups[date]
      }));
  }, [filteredList]);

  // Total blank subject count
  const blankCount = useMemo(() => {
    return emptyList.filter((item) => !item.isSkipped).length;
  }, [emptyList]);

  // Total skipped count
  const skippedCount = useMemo(() => {
    return emptyList.filter((item) => item.isSkipped).length;
  }, [emptyList]);

  // Class names for filter tabs
  const classNames = useMemo(() => {
    return currentDiary?.config?.map((c: any) => c.className) || [];
  }, [currentDiary]);

  // Class specific counts depending on showSkipped
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    emptyList.forEach((item) => {
      const isMatch = showSkipped ? item.isSkipped : !item.isSkipped;
      if (isMatch) {
        counts[item.className] = (counts[item.className] || 0) + 1;
      }
    });
    return counts;
  }, [emptyList, showSkipped]);

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="ডায়েরি চেকআপ"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col gap-5 py-2 select-none h-[80vh] overflow-y-auto custom-scrollbar pr-1">
        
        {/* Date & Options Configuration Section */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
          {/* Custom Date Range Selector with Arrow Navigation */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">তারিখ রেঞ্জ নির্বাচন</label>
            <div className="flex items-center gap-1.5 w-full bg-white border border-slate-205 rounded-xl p-1.5 shadow-sm relative">
              {/* Shift Back 1 Week */}
              <button
                type="button"
                onClick={() => shiftRange(-7)}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-all active:scale-90"
                title="১ সপ্তাহ পূর্বে"
              >
                <FiChevronsLeft className="h-4.5 w-4.5" />
              </button>
              
              {/* Shift Back 1 Day */}
              <button
                type="button"
                onClick={() => shiftRange(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-all active:scale-90"
                title="১ দিন পূর্বে"
              >
                <FiChevronLeft className="h-4.5 w-4.5" />
              </button>

              {/* Main Selector Button */}
              <div className="flex-1 relative flex justify-center min-w-0">
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors active:scale-95 group w-full"
                >
                  <FiCalendar className="text-slate-400 h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm font-black text-slate-700 group-hover:text-indigo-900 transition-colors truncate">
                    {startDate === endDate
                      ? formatBanglaDate(startDate)
                      : `${formatShortBanglaDate(startDate)} থেকে ${formatShortBanglaDate(endDate)}`}
                  </span>
                  <FiChevronDown className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${isCalendarOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Calendar Dropdown inside CheckupModal */}
                {isCalendarOpen && (
                  <>
                    <div className="fixed inset-0 z-[10010]" onClick={() => setIsCalendarOpen(false)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[280px] sm:w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 sm:p-4 z-[10020] animate-fade-in origin-top">
                      {/* Month selector */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                        >
                          <FiChevronLeft className="h-4 w-4 text-slate-650" />
                        </button>
                        <span className="font-black text-slate-800 text-xs sm:text-sm">
                          {banglaMonths[calendarViewDate.getMonth()]} {toBanglaNumber(calendarViewDate.getFullYear())}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                        >
                          <FiChevronRight className="h-4 w-4 text-slate-655" />
                        </button>
                      </div>

                      {/* Calendar Weekday headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                        {["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"].map((d, i) => (
                          <div key={i} className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase">
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* Days grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((dateStr, i) => {
                          if (!dateStr) return <div key={`empty-${i}`} className="aspect-square" />;
                          
                          const isRangeStart = dateStr === startDate;
                          const isRangeEnd = dateStr === endDate;
                          const isRangeBetween = dateStr > startDate && dateStr < endDate;
                          
                          const d = new Date(dateStr);
                          const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
                          
                          const holidays: Holiday[] = currentDiary?.holidays || [];
                          const holiday = isDateInHoliday(dateStr, holidays);
                          const isHol = !!holiday;
                          const isWeeklyHol = (currentDiary?.weeklyHolidays || ["Friday"]).includes(dayOfWeek);
                          
                          const dayNum = parseInt(dateStr.split("-")[2], 10);
                          const dNum = toBanglaNumber(dayNum);
                          
                          const isHolidayCell = isHol || isWeeklyHol;
                          let bgClass = "bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-650";
                          
                          if (isRangeStart || isRangeEnd) {
                            bgClass = "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md font-bold scale-105 rounded-xl";
                          } else if (isRangeBetween) {
                            bgClass = "bg-indigo-50 text-indigo-700 font-semibold rounded-none";
                          } else if (isHolidayCell) {
                            bgClass = "bg-slate-100 text-slate-400 cursor-not-allowed line-through opacity-50";
                          }

                          return (
                            <button
                              key={i}
                              type="button"
                              disabled={isHolidayCell}
                              onClick={() => handleRangeDateClick(dateStr)}
                              className={`aspect-square rounded-xl flex items-center justify-center relative transition-all text-[10px] sm:text-xs ${bgClass}`}
                              title={isHol ? holiday.name : isWeeklyHol ? "সাপ্তাহিক ছুটি" : ""}
                            >
                              <span>{dNum}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dropdown footer quick actions */}
                      <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const todayStr = new Date().toISOString().split("T")[0];
                            setStartDate(todayStr);
                            setEndDate(todayStr);
                            setCalendarViewDate(new Date());
                            setIsCalendarOpen(false);
                          }}
                          className="text-[10px] sm:text-xs font-bold text-indigo-600 hover:text-indigo-850 transition-colors bg-indigo-50/50 hover:bg-indigo-50 px-2 py-1.5 rounded-lg border border-indigo-100"
                        >
                          আজকে যান
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCalendarOpen(false)}
                          className="text-[10px] sm:text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors bg-slate-50 hover:bg-slate-100 px-2 py-1.5 rounded-lg border border-gray-150"
                        >
                          সম্পন্ন
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Shift Forward 1 Day */}
              <button
                type="button"
                onClick={() => shiftRange(1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-all active:scale-90"
                title="১ দিন পরে"
              >
                <FiChevronRight className="h-4.5 w-4.5" />
              </button>

              {/* Shift Forward 1 Week */}
              <button
                type="button"
                onClick={() => shiftRange(7)}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-all active:scale-90"
                title="১ সপ্তাহ পরে"
              >
                <FiChevronsRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Days checklist */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">দিনসমূহ</label>
            <div className="flex flex-wrap gap-1.5">
              {dayOptions.map((day) => {
                const isSelected = checkupDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleToggleDay(day.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Holiday Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
            <label className="text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={excludeHolidays}
                onChange={(e) => setExcludeHolidays(e.target.checked)}
                className="accent-indigo-650 h-4 w-4 rounded cursor-pointer"
              />
              <span>সরকারি ও সাপ্তাহিক ছুটির দিনসমূহ বাদ দিন</span>
            </label>
          </div>
        </div>

        {/* Tab Selection (Active/Skipped) and Search bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => {
                setShowSkipped(false);
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${
                !showSkipped ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              খালি বিষয় ({toBanglaNumber(blankCount)})
            </button>
            <button
              onClick={() => {
                setShowSkipped(true);
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${
                showSkipped ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              বাদ দেওয়া বিষয় ({toBanglaNumber(skippedCount)})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="শ্রেণী বা বিষয় খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
        </div>

        {/* Class Filter Tabs */}
        <div className="flex flex-col gap-2">
          <div ref={classTabsContainerRef} className="flex items-center gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden class-tabs-container bg-slate-100 p-1.5 rounded-xl border border-slate-150">
            <button
              type="button"
              data-active={selectedClassFilter === "all"}
              onClick={() => setSelectedClassFilter("all")}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                selectedClassFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-650 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
              }`}
            >
              <span>সকল শ্রেণী</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                selectedClassFilter === "all" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {toBanglaNumber(showSkipped ? skippedCount : blankCount)}
              </span>
            </button>
            {classNames.map((cName: string) => {
              const isActive = selectedClassFilter === cName;
              const count = classCounts[cName] || 0;
              
              return (
                <button
                  key={cName}
                  type="button"
                  data-active={isActive}
                  onClick={() => setSelectedClassFilter(cName)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-655 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
                  }`}
                >
                  <span>{cName}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {toBanglaNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List of blank subjects */}
        <div className="flex-1 min-h-[200px]">
          {isChecking ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
              <span className="text-xs font-bold">খালি ডায়েরি খোঁজা হচ্ছে...</span>
            </div>
          ) : groupedResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 gap-3">
              <FiCheckCircle className="h-10 w-10 text-emerald-500" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-black text-slate-700">কোন খালি বিষয় পাওয়া যায়নি!</p>
                <p className="text-xs font-medium">নির্বাচিত সীমার মধ্যে সকল ডায়েরি সম্পূর্ণ রয়েছে।</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groupedResults.map((group) => (
                <div key={group.date} className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 w-fit">
                    {formatBanglaDate(group.date)}
                  </h4>

                  <div className="flex flex-col gap-2">
                    {group.items.map((item: any) => {
                      const key = `${item.date}_${item.className}_${item.bookId}`;
                      
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 px-5 py-4 bg-white border border-slate-150 rounded-xl hover:bg-slate-50/40 hover:border-slate-200 transition-all duration-300 shadow-sm animate-fade-in"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            {selectedClassFilter === "all" && (
                              <>
                                <span className="text-xs font-black text-slate-700">{item.className}</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                              </>
                            )}
                            <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1">
                              <FiBook className="h-3.5 w-3.5 text-slate-400" />
                              {item.bookName}
                            </span>
                          </div>

                          {/* Row Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.isSkipped ? (
                              <button
                                type="button"
                                onClick={() => handleUnskipSubject(item)}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                              >
                                তালিকায় ফেরান
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSkipSubject(item)}
                                  className="px-3.5 py-2 rounded-xl border border-rose-100 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 shadow-sm"
                                >
                                  বাদ দিন
                                </button>
                                
                                {onOpenDirectEditor && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onOpenDirectEditor(item.date, item.className, item.bookId);
                                    }}
                                    className="px-3.5 py-2 rounded-xl border border-indigo-150 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                                    title="ডায়েরি যোগ করুন"
                                  >
                                    <FiPlus className="h-4 w-4" />
                                    <span>যোগ করুন</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalLayout>
  );
}
