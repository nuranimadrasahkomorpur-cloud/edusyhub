'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const banglaDays = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

const englishToBanglaNumber = (num: number | string) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/[0-9]/g, w => banglaDigits[parseInt(w)]);
};

interface BanglaDateRangePickerProps {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    onChange: (start: string, end: string) => void;
}

export default function BanglaDateRangePicker({ startDate, endDate, onChange }: BanglaDateRangePickerProps) {
    const initialDate = startDate ? new Date(startDate) : new Date();
    const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

    const handlePreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const handleDayClick = (day: number) => {
        const clickedDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const clickedDate = new Date(clickedDateStr);
        clickedDate.setHours(0, 0, 0, 0);

        const startObj = startDate ? new Date(startDate) : null;
        if (startObj) startObj.setHours(0, 0, 0, 0);
        
        const endObj = endDate ? new Date(endDate) : null;
        if (endObj) endObj.setHours(0, 0, 0, 0);

        if (!startDate || (startDate && endDate && startObj && endObj && startObj.getTime() !== endObj.getTime())) {
            // Reset to new start date
            onChange(clickedDateStr, clickedDateStr);
        } else if (startDate && startObj) {
            if (clickedDate < startObj) {
                // Clicked before start date, make it the new start date
                onChange(clickedDateStr, clickedDateStr);
            } else {
                // Clicked after start date, make it the end date
                onChange(startDate, clickedDateStr);
            }
        }
    };

    const gridDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    }, [daysInMonth, firstDayOfMonth]);

    const isDateInRange = (day: number) => {
        if (!startDate || !endDate || !day) return false;
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return dateStr >= startDate && dateStr <= endDate;
    };

    const isStartDate = (day: number) => {
        if (!startDate || !day) return false;
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return dateStr === startDate;
    };

    const isEndDate = (day: number) => {
        if (!endDate || !day) return false;
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return dateStr === endDate;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 w-full select-none max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-2">
                <button onClick={handlePreviousMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <ChevronLeft size={18} />
                </button>
                <div className="font-black text-slate-700 text-sm">
                    {banglaMonths[currentMonth.getMonth()]} {englishToBanglaNumber(currentMonth.getFullYear())}
                </div>
                <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {banglaDays.map(day => (
                    <div key={day} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-wider py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
                {gridDays.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="h-7" />;
                    }

                    const isStart = isStartDate(day);
                    const isEnd = isEndDate(day);
                    const inRange = isDateInRange(day);
                    const isSingleSelection = isStart && isEnd;

                    let bgClass = "bg-transparent text-slate-600 hover:bg-slate-100";
                    let roundedClass = "rounded-lg";

                    if (isSingleSelection) {
                        bgClass = "bg-blue-600 text-white font-black shadow-md shadow-blue-500/30";
                    } else if (isStart) {
                        bgClass = "bg-blue-600 text-white font-black shadow-md shadow-blue-500/30";
                        roundedClass = "rounded-l-lg rounded-r-none";
                    } else if (isEnd) {
                        bgClass = "bg-blue-600 text-white font-black shadow-md shadow-blue-500/30";
                        roundedClass = "rounded-r-lg rounded-l-none";
                    } else if (inRange) {
                        bgClass = "bg-blue-50 text-blue-700 font-bold";
                        roundedClass = "rounded-none";
                    }

                    return (
                        <div key={day} className={`flex items-center justify-center h-7 ${inRange && !isStart && !isEnd ? 'bg-blue-50' : ''} ${isStart && !isSingleSelection ? 'rounded-l-lg bg-gradient-to-r from-transparent to-blue-50' : ''} ${isEnd && !isSingleSelection ? 'rounded-r-lg bg-gradient-to-l from-transparent to-blue-50' : ''}`}>
                            <button
                                onClick={() => handleDayClick(day)}
                                className={`w-7 h-7 flex items-center justify-center text-[11px] transition-all ${bgClass} ${roundedClass}`}
                            >
                                {englishToBanglaNumber(day)}
                            </button>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                <div className="text-slate-500">
                    শুরু: <span className="text-slate-800">{englishToBanglaNumber(startDate || 'নির্বাচন করুন')}</span>
                </div>
                <div className="text-slate-500">
                    শেষ: <span className="text-slate-800">{englishToBanglaNumber(endDate || 'নির্বাচন করুন')}</span>
                </div>
            </div>
        </div>
    );
}
