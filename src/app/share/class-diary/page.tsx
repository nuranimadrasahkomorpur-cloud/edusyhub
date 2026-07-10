"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Book as FiBook, 
  BookOpen as FiBookOpen, 
  Calendar as FiCalendar, 
  Clock as FiClock, 
  FileText as FiFileText, 
  Image as FiImage, 
  Info as FiInfo, 
  CheckSquare as FiCheckSquare 
} from 'lucide-react';

// Process HTML content to show numbered lists nicely
const processHtmlForNumbering = (html: any, useBulletPoint?: boolean) => html;

const bubbleTypeConfig: any = {
  general: { icon: FiFileText, label: "সাধারণ তথ্য", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  notice: { icon: FiInfo, label: "জরুরী নোটিশ", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  task: { icon: FiCheckSquare, label: "বাড়ির কাজ", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  lesson: { icon: FiBookOpen, label: "আজকের পাঠ", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  image: { icon: FiImage, label: "ছবি", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

function GuardianShareContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const dateStr = searchParams.get('date');

  const [diary, setDiary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeClassTab, setActiveClassTab] = useState<string>("");

  useEffect(() => {
    if (!id) {
      setError("ডায়েরি আইডি পাওয়া যায়নি।");
      setLoading(false);
      return;
    }

    fetch(`/api/class-diary?id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          setDiary(data.data[0]);
          const config = data.data[0].config || [];
          if (config.length > 0) {
            setActiveClassTab(config[0].className);
          }
        } else {
          setError("ডায়েরিটি পাওয়া যায়নি।");
        }
      })
      .catch(err => setError("সার্ভার ত্রুটি: " + err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !diary) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-slate-200">
          <div className="h-16 w-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiInfo className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">ত্রুটি</h2>
          <p className="text-slate-600">{error || "ডায়েরিটি পাওয়া যায়নি।"}</p>
        </div>
      </div>
    );
  }

  const entries = diary.entries || {};
  const currentEntries = entries[dateStr || ""] || {};
  const config = (Array.isArray(diary.config) ? diary.config : []) as Array<{ className: string; books: Array<{ id: string; name: string }> }>;
  const allowedClasses = config.map(c => c.className);

  const formattedDate = dateStr 
    ? new Date(dateStr).toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : "তারিখ পাওয়া যায়নি";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16 font-sans">
      {/* Header */}
      <div className="bg-indigo-600 w-full text-white py-6 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm">
            <FiBook className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2">{diary.name}</h1>
          <div className="flex items-center justify-center gap-2 text-indigo-100 bg-black/20 px-4 py-1.5 rounded-full text-sm font-medium">
            <FiCalendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Class Tabs */}
        {allowedClasses.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm mb-6 border border-slate-200 dark:border-slate-700 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <div className="flex gap-2">
              {allowedClasses.map(className => (
                <button
                  key={className}
                  onClick={() => setActiveClassTab(className)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeClassTab === className
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {className}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {(() => {
            const classData = config.find(c => c.className === activeClassTab);
            const classEntries = currentEntries[activeClassTab] || {};

            if (!classData || classData.books.length === 0) {
              return (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <FiBookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">এই শ্রেণীর কোন বিষয় পাওয়া যায়নি।</p>
                </div>
              );
            }

            let hasAnyContent = false;

            const renderedBooks = classData.books.map(book => {
              const bookEntries = classEntries[book.id] || [];
              const hasContent = bookEntries.length > 0;
              if (hasContent) hasAnyContent = true;

              if (!hasContent) return null;

              return (
                <div key={book.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <FiBookOpen className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{book.name}</h3>
                  </div>
                  
                  <div className="p-5 flex flex-col gap-4">
                    {bookEntries.map((bubble: any, i: number) => {
                      const bubbleType = bubble.type || 'general';
                      const bConf = bubbleTypeConfig[bubbleType] || bubbleTypeConfig.general;
                      const Icon = bConf.icon;

                      return (
                        <div key={i} className={`rounded-xl p-4 border ${bConf.bg} ${bConf.border} dark:bg-opacity-10 dark:border-opacity-20`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`h-4 w-4 ${bConf.color} dark:text-opacity-80`} />
                            <span className={`text-xs font-bold uppercase tracking-wider ${bConf.color} dark:text-opacity-80`}>
                              {bConf.label}
                            </span>
                          </div>
                          
                          <div 
                            className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: processHtmlForNumbering(bubble.value) }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });

            if (!hasAnyContent) {
              return (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <FiBook className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">আজকের জন্য কোন পাঠ বা বাড়ির কাজ যোগ করা হয়নি।</p>
                </div>
              );
            }

            return renderedBooks;
          })()}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <GuardianShareContent />
    </Suspense>
  );
}
