import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronRight, ChevronLeft, BookOpen, Clock, CheckCircle2 } from 'lucide-react';
import ReadAloudModal from './ReadAloudModal';
import { ResearchTopic, ResearchDayActivity } from '../types/research';

interface ClassExecutionModeProps {
    topic: ResearchTopic;
    selectedDayNum: number;
    onComplete?: () => void;
}

export default function ClassExecutionMode({ topic, selectedDayNum, onComplete }: ClassExecutionModeProps) {
    const dayData = topic.days.find((d: ResearchDayActivity) => d.dayNumber === selectedDayNum);
    const instructions = dayData?.teacherInstructions || [];
    
    // Parse instructions back to items
    const tasks = instructions.map((line: string, idx: number) => {
        const type = line.startsWith('[ACTIVITY]') ? 'activity' : 'task';
        const text = line.replace(/^\[(TASK|ACTIVITY)\]:\s*/, '');
        return { id: `exec-${idx}`, type, text };
    });

    const [isStarted, setIsStarted] = useState(false);
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);
    const [taskTimeElapsed, setTaskTimeElapsed] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    
    const [isReadAloudOpen, setIsReadAloudOpen] = useState(false);
    const [readAloudText, setReadAloudText] = useState('');

    const sourceContent = topic.sources && topic.sources.length > 0 ? topic.sources[0].content : '';

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isStarted && !isPaused) {
            interval = setInterval(() => {
                setTaskTimeElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isStarted, isPaused, activeTaskIndex]);

    const handleStart = () => {
        setIsStarted(true);
        setIsPaused(false);
    };

    const handleNext = () => {
        if (activeTaskIndex < tasks.length - 1) {
            setActiveTaskIndex(prev => prev + 1);
            setTaskTimeElapsed(0);
        } else {
            // Done
            if (onComplete) onComplete();
        }
    };

    const handlePrev = () => {
        if (activeTaskIndex > 0) {
            setActiveTaskIndex(prev => prev - 1);
            setTaskTimeElapsed(0);
        }
    };

    const handleOpenReadAloud = (textToRead: string) => {
        setReadAloudText(textToRead);
        setIsReadAloudOpen(true);
        setIsPaused(true); // pause timer while reading
    };

    const handleCloseReadAloud = () => {
        setIsReadAloudOpen(false);
        setIsPaused(false);
    };

    if (!dayData || tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-3xl border border-slate-100 min-h-[400px]">
                <BookOpen size={48} className="mb-4 opacity-20" />
                <p className="font-semibold text-sm">এই দিনের জন্য কোনো কাজ বা কার্যক্রম নির্ধারণ করা নেই।</p>
                <p className="text-xs">প্রথমে 'কর্মপরিকল্পনা' ট্যাবে গিয়ে পরিকল্পনা তৈরি করুন।</p>
            </div>
        );
    }

    if (!isStarted) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 min-h-[400px] text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                    <Play size={32} className="text-emerald-500 ml-2" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">দিন {selectedDayNum} — ক্লাস বাস্তবায়ন শুরু করুন</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8 text-sm leading-relaxed">
                    আপনার পরিকল্পনা অনুযায়ী সমস্ত কাজ ও কার্যক্রম ধাপে ধাপে স্ক্রিনে দেখানো হবে। 
                    নির্ধারিত রিডিং টাস্কে পঠন ও শ্রবণ (Read Aloud) সুবিধা পাবেন।
                </p>
                <button
                    onClick={handleStart}
                    className="px-8 py-3.5 bg-[#045c84] hover:bg-[#034664] text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                    ক্লাস শুরু করুন
                </button>
            </div>
        );
    }

    const activeTask = tasks[activeTaskIndex];
    const isReadingTask = activeTask.text.includes('পড়') || activeTask.text.includes('পাঠ') || activeTask.text.includes('বই');

    return (
        <div className="flex flex-col bg-slate-900 rounded-3xl overflow-hidden min-h-[500px] shadow-2xl border border-slate-800 relative">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 sm:p-6 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold font-mono tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE CLASS
                    </div>
                    <span className="text-slate-400 text-sm font-semibold">ধাপ {activeTaskIndex + 1} / {tasks.length}</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-cyan-400 font-mono text-xl font-bold">
                        <Clock size={20} />
                        {String(Math.floor(taskTimeElapsed / 60)).padStart(2, '0')}:
                        {String(taskTimeElapsed % 60).padStart(2, '0')}
                    </div>
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            isPaused ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                        title={isPaused ? 'চালু করুন' : 'বিরতি দিন'}
                    >
                        {isPaused ? <Play size={18} className="ml-1" /> : <Pause size={18} />}
                    </button>
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 p-6 sm:p-12 flex flex-col items-center justify-center relative overflow-y-auto">
                
                <div className="absolute top-8 left-1/2 -translate-x-1/2">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest ${
                        activeTask.type === 'activity' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                    }`}>
                        {activeTask.type === 'activity' ? 'কার্যক্রম (Activity)' : 'কাজ (Task)'}
                    </span>
                </div>

                <div className="w-full max-w-4xl text-center mt-8">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.4] mb-10">
                        {activeTask.text}
                    </h1>

                    {/* Helper Functions (Read Aloud) */}
                    {(isReadingTask && sourceContent) && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                            <button
                                onClick={() => handleOpenReadAloud(sourceContent)}
                                className="group flex flex-col items-center gap-3 mx-auto"
                            >
                                <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white group-hover:scale-110 transition-all shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_50px_-5px_rgba(6,182,212,0.6)]">
                                    <BookOpen size={36} />
                                </div>
                                <span className="text-cyan-400 font-bold tracking-wide group-hover:text-cyan-300">পঠন ও শ্রবণ শুরু করুন</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="p-4 sm:p-6 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
                <button
                    onClick={handlePrev}
                    disabled={activeTaskIndex === 0}
                    className="px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <ChevronLeft size={18} /> আগের ধাপ
                </button>

                <div className="flex gap-1.5">
                    {tasks.map((_: any, idx: number) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 rounded-full transition-all ${
                                idx === activeTaskIndex ? 'w-8 bg-cyan-400' : 
                                idx < activeTaskIndex ? 'w-2 bg-emerald-500' : 'w-2 bg-slate-600'
                            }`}
                        />
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    className={`px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${
                        activeTaskIndex === tasks.length - 1
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                    }`}
                >
                    {activeTaskIndex === tasks.length - 1 ? (
                        <>সম্পন্ন করুন <CheckCircle2 size={18} /></>
                    ) : (
                        <>পরবর্তী ধাপ <ChevronRight size={18} /></>
                    )}
                </button>
            </div>

            <ReadAloudModal 
                isOpen={isReadAloudOpen}
                onClose={handleCloseReadAloud}
                text={readAloudText}
            />
        </div>
    );
}
