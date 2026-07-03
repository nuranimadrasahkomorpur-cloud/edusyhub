'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CustomDatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
}

export default function CustomDatePicker({ value, onChange, placeholder = 'তারিখ নির্বাচন করুন', className = '' }: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Parse value or use today
    const selectedDate = value ? new Date(value) : null;
    const [viewDate, setViewDate] = useState(selectedDate || new Date());

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const handleSelect = (day: number) => {
        const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Format to YYYY-MM-DD
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${date}`);
        setIsOpen(false);
    };

    // Bengali localization arrays
    const bnMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const bnDays = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

    const formatToBengali = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const bnNumbers = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
        const day = String(d.getDate()).split('').map(n => bnNumbers[parseInt(n)]).join('');
        const year = String(d.getFullYear()).split('').map(n => bnNumbers[parseInt(n)]).join('');
        return `${day} ${bnMonths[d.getMonth()]}, ${year}`;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex items-center cursor-pointer ${className}`}
            >
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                <input 
                    type="text" 
                    readOnly
                    value={formatToBengali(value) || ''}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-[#045c84] outline-none cursor-pointer focus:ring-4 focus:ring-[#045c84]/10 transition-all pointer-events-none"
                />
            </div>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 z-[100] bg-white border border-slate-100 rounded-3xl p-4 shadow-xl w-72 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <button type="button" onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-600 active:scale-95">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-black text-sm text-[#045c84]">
                            {bnMonths[viewDate.getMonth()]} {String(viewDate.getFullYear()).split('').map(n => ['০','১','২','৩','৪','৫','৬','৭','৮','৯'][parseInt(n)]).join('')}
                        </span>
                        <button type="button" onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-600 active:scale-95">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {bnDays.map(d => (
                            <div key={d} className="text-center text-[10px] font-black text-slate-400 py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, idx) => {
                            if (day === null) return <div key={`empty-${idx}`} className="h-8" />;
                            
                            const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === viewDate.getMonth() && selectedDate?.getFullYear() === viewDate.getFullYear();
                            const isToday = new Date().getDate() === day && new Date().getMonth() === viewDate.getMonth() && new Date().getFullYear() === viewDate.getFullYear();
                            
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleSelect(day)}
                                    className={`h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all active:scale-90 ${
                                        isSelected 
                                            ? 'bg-[#045c84] text-white shadow-md' 
                                            : isToday
                                                ? 'bg-blue-50 text-[#045c84]'
                                                : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {String(day).split('').map(n => ['০','১','২','৩','৪','৫','৬','৭','৮','৯'][parseInt(n)]).join('')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
