'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Sparkles,
    BookOpen,
    Calendar,
    Target,
    CheckCircle2,
    Upload,
    FileText,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Wand2,
    Save,
    Plus,
    Copy,
    Check
} from 'lucide-react';
import { ResearchTopic, ResearchType, ResearchDayActivity } from '../types/research';

interface CreateResearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (newTopic: ResearchTopic) => void;
    currentUserName?: string;
    currentUserRole?: string;
    currentInstitute?: string;
    initialDraft?: ResearchTopic | null;
}

const BOARDS = [
    'জাতীয় শিক্ষাক্রম (NCTB)',
    'আল-ফাতাহ প্রকাশনী',
    'পাঞ্জেরী পাবলিকেশন্স',
    'মাদ্রাসা শিক্ষা বোর্ড (ইবতেদায়ি/দাখিল)',
    'কওমি মাদ্রাসা শিক্ষাবোর্ড (বেফাক)',
    'কিন্ডারগার্টেন অ্যাসোসিয়েশন',
    'লেকচার পাবলিকেশন্স',
    'অন্যান্য প্রকাশনী'
];

const DEFAULT_CLASSES = [
    'প্লে / নার্সারি',
    'প্রথম শ্রেণি',
    'দ্বিতীয় শ্রেণি',
    'তৃতীয় শ্রেণি',
    'চতুর্থ শ্রেণি',
    'পঞ্চম শ্রেণি',
    'ষষ্ঠ শ্রেণি',
    'সপ্তম শ্রেণি',
    'অষ্টম শ্রেণি',
    'নবম-দশম শ্রেণি',
    'হিফজ জামাত',
    'কিতাব বিভাগ'
];

const DEFAULT_SUBJECTS = [
    'বাংলা',
    'ইংরেজি',
    'গণিত',
    'সাধারণ বিজ্ঞান',
    'বাংলাদেশ ও বিশ্বপরিচয়',
    'ইসলাম ও নৈতিক শিক্ষা',
    'আরবি / কাওয়াইদ',
    'কুরআন মাজিদ ও তাজবিদ',
    'হাদিস শরিফ',
    'আকাইদ ও ফিকহ'
];

const LOCAL_DRAFT_KEY = 'edusy_research_create_draft_v1';

export default function CreateResearchModal({
    isOpen,
    onClose,
    onCreated,
    currentUserName = 'শিক্ষক গবেষক',
    currentUserRole = 'শিক্ষক',
    currentInstitute = 'এডুসি নেটওয়ার্ক',
    initialDraft = null
}: CreateResearchModalProps) {
    // Draft tracking in database
    const [draftId, setDraftId] = useState<string | null>(initialDraft?.id || null);
    const draftIdRef = useRef<string | null>(initialDraft?.id || null);
    const isSavingRef = useRef<boolean>(false);
    const topicHumanIdRef = useRef<string>(
        initialDraft?.humanId || `TOP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`
    );
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.dispatchEvent(new CustomEvent('modalOpen'));
        } else {
            document.body.style.overflow = 'unset';
            window.dispatchEvent(new CustomEvent('modalClose'));
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.dispatchEvent(new CustomEvent('modalClose'));
        };
    }, [isOpen]);

    // Single Form States (All blank by default - no prefilled default text)
    const [title, setTitle] = useState('');
    const [problemToSolve, setProblemToSolve] = useState('');
    const [board, setBoard] = useState('');
    const [grade, setGrade] = useState('');
    const [subject, setSubject] = useState('');
    const [bookName, setBookName] = useState('');
    const [chapter, setChapter] = useState('');
    const [pageNumber, setPageNumber] = useState('');
    const [targetDays, setTargetDays] = useState(7);
    const [researchType, setResearchType] = useState<ResearchType>('Concept Understanding');
    const [mobileActiveTab, setMobileActiveTab] = useState<'topic' | 'book'>('topic');

    // Subject dynamic list & creation state
    const [subjectList, setSubjectList] = useState<string[]>(DEFAULT_SUBJECTS);
    const [isAddingNewSubject, setIsAddingNewSubject] = useState(false);
    const [customSubjectInput, setCustomSubjectInput] = useState('');

    // Class dynamic list & manual add state
    const [classList, setClassList] = useState<string[]>(DEFAULT_CLASSES);
    const [isAddingNewClass, setIsAddingNewClass] = useState(false);
    const [customClassInput, setCustomClassInput] = useState('');

    // Content (Source)
    const [sourceContent, setSourceContent] = useState('');
    const [sourceFileName, setSourceFileName] = useState('');
    const [copiedSource, setCopiedSource] = useState(false);
    const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

    // Inline dropdown popover states (desktop friendly, no blocking modals)
    const [boardDropdownOpen, setBoardDropdownOpen] = useState(false);
    const [gradeDropdownOpen, setGradeDropdownOpen] = useState(false);
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
    const boardDropdownRef = useRef<HTMLDivElement>(null);
    const gradeDropdownRef = useRef<HTMLDivElement>(null);
    const subjectDropdownRef = useRef<HTMLDivElement>(null);

    // Dismiss dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (boardDropdownRef.current && !boardDropdownRef.current.contains(e.target as Node)) {
                setBoardDropdownOpen(false);
            }
            if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(e.target as Node)) {
                setGradeDropdownOpen(false);
            }
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(e.target as Node)) {
                setSubjectDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Populate initial draft if supplied, restore unsaved local draft across reloads, or reset
    useEffect(() => {
        if (!isOpen) return;

        if (initialDraft) {
            draftIdRef.current = initialDraft.id;
            if (initialDraft.humanId) {
                topicHumanIdRef.current = initialDraft.humanId;
            }
            setDraftId(initialDraft.id);
            setTitle(initialDraft.title || '');
            setProblemToSolve(initialDraft.problemToSolve || '');
            setBoard(initialDraft.bookInfo?.board || '');
            setGrade(initialDraft.bookInfo?.grade || '');
            setSubject(initialDraft.bookInfo?.subject || '');
            setBookName(initialDraft.bookInfo?.bookName || '');
            setChapter(initialDraft.bookInfo?.chapter || '');
            setPageNumber(initialDraft.bookInfo?.pageNumber || '');
            setTargetDays(initialDraft.totalDays || 7);
            if (initialDraft.sources && initialDraft.sources.length > 0) {
                setSourceContent(initialDraft.sources[0].content || '');
            }
            setMobileActiveTab('topic');
        } else {
            // Restore unsaved local draft (persists across page reloads before manual save)
            let restored = false;
            try {
                const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_DRAFT_KEY) : null;
                if (raw) {
                    const cached = JSON.parse(raw);
                    if (cached && (cached.sourceContent?.trim() || cached.title?.trim() || cached.problemToSolve?.trim() || cached.subject?.trim())) {
                        setTitle(cached.title || '');
                        setProblemToSolve(cached.problemToSolve || '');
                        setBoard(cached.board || '');
                        setGrade(cached.grade || '');
                        setSubject(cached.subject || '');
                        setBookName(cached.bookName || '');
                        setChapter(cached.chapter || '');
                        setPageNumber(cached.pageNumber || '');
                        setTargetDays(cached.targetDays || 7);
                        setSourceContent(cached.sourceContent || '');
                        setSourceFileName(cached.sourceFileName || '');
                        if (cached.savedAt) {
                            setLastSavedAt(`ড্রাফট সংরক্ষিত (${cached.savedAt})`);
                        }
                        restored = true;
                    }
                }
            } catch (err) {
                console.error('Error restoring draft from localStorage:', err);
            }

            if (!restored) {
                draftIdRef.current = null;
                topicHumanIdRef.current = `TOP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
                setDraftId(null);
                setTitle('');
                setProblemToSolve('');
                setBoard('');
                setGrade('');
                setSubject('');
                setBookName('');
                setChapter('');
                setPageNumber('');
                setSourceContent('');
                setSourceFileName('');
                setLastSavedAt(null);
            }
            setMobileActiveTab('topic');
        }
    }, [initialDraft, isOpen]);

    // Auto-persist draft to localStorage whenever user types so page reload never loses draft text
    useEffect(() => {
        if (!isOpen || initialDraft) return;

        const hasContent = Boolean(
            sourceContent.trim() || 
            title.trim() || 
            problemToSolve.trim() || 
            subject.trim() || 
            bookName.trim() || 
            chapter.trim() || 
            pageNumber.trim()
        );

        try {
            if (hasContent) {
                const now = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({
                    title,
                    problemToSolve,
                    board,
                    grade,
                    subject,
                    bookName,
                    chapter,
                    pageNumber,
                    targetDays,
                    sourceContent,
                    sourceFileName,
                    savedAt: now
                }));
                setLastSavedAt(`ড্রাফট সংরক্ষিত (${now})`);
            } else {
                localStorage.removeItem(LOCAL_DRAFT_KEY);
            }
        } catch (err) {
            console.error('Failed to auto-persist draft:', err);
        }
    }, [isOpen, initialDraft, title, problemToSolve, board, grade, subject, bookName, chapter, pageNumber, targetDays, sourceContent, sourceFileName]);

    // Clear local draft and reset fields
    const handleClearDraft = () => {
        try {
            localStorage.removeItem(LOCAL_DRAFT_KEY);
        } catch {}
        setTitle('');
        setProblemToSolve('');
        setBoard('');
        setGrade('');
        setSubject('');
        setBookName('');
        setChapter('');
        setPageNumber('');
        setSourceContent('');
        setSourceFileName('');
        setLastSavedAt(null);
    };

    // Set subject on preset selection without forcing unwanted default book details
    const handleSelectPresetSubject = (newSubj: string) => {
        setSubject(newSubj);
    };

    // Smart auto-generate topic title (গবেষণার বিষয়) based on provided source content or book info
    const handleAutoGenerateTitle = () => {
        const text = (sourceContent + ' ' + chapter + ' ' + bookName + ' ' + subject).toLowerCase();
        if (!text.trim()) return;

        setIsGeneratingTitle(true);

        setTimeout(() => {
            let generatedTitle = '';

            // 1. English Rhymes / Poems
            if (text.includes('fish alive') || (text.match(/[a-z]/i) && (text.includes('poem') || text.includes('rhyme') || text.includes('rhymes') || text.includes('stanza')))) {
                generatedTitle = 'ইংরেজি ছড়া পাঠ ও বানান অনুশীলন (Poem Recitation & Spelling)';
                if (!subject) setSubject('ইংরেজি');
                if (!researchType) setResearchType('Reading Improvement');
            }
            // 2. English General Fluency / Phonics
            else if (text.match(/[a-z]/i) && (text.includes('story') || text.includes('reading') || text.includes('dialogue') || text.includes('morning') || text.includes('hello'))) {
                generatedTitle = 'ইংরেজি পাঠ্যাংশ সাবলীল উচ্চারণ ও কথোপকথন অনুশীলন';
                if (!subject) setSubject('ইংরেজি');
                if (!researchType) setResearchType('Reading Improvement');
            }
            // 3. Bengali Poem / Rhyme
            else if (text.includes('কবিতা') || text.includes('ছড়া') || text.includes('পদ্য')) {
                generatedTitle = 'বাংলা কবিতা আবৃত্তি ও ভাবার্থ বিশ্লেষণ শিখন';
                if (!subject) setSubject('বাংলা');
                if (!researchType) setResearchType('Reading Improvement');
            }
            // 4. Bengali Yuktakshar / Handwriting / Matra
            else if (text.includes('যুক্তবর্ণ') || text.includes('স্বরচিহ্ন') || text.includes('হাতের লেখা') || text.includes('কার')) {
                generatedTitle = 'বাংলা যুক্তবর্ণ ও স্বরচিহ্নের সঠিক প্রয়োগে নির্ভুল লেখা';
                if (!subject) setSubject('বাংলা');
                if (!researchType) setResearchType('Writing Improvement');
            }
            // 5. Math / Numbers / Fractions
            else if (text.includes('গণিত') || text.includes('math') || text.includes('সংখ্যা') || text.includes('ভগ্নাংশ') || text.includes('যোগ') || text.includes('বিয়োগ') || text.includes('গুণ') || text.includes('ভাগ') || text.includes('1, 2, 3') || text.includes('one, two')) {
                generatedTitle = 'বাস্তব উপকরণের সাহায্যে মৌলিক সংখ্যার ধারণা ও গণনা কৌশল';
                if (!subject) setSubject('গণিত');
                if (!researchType) setResearchType('Concept Understanding');
            }
            // 6. Arabic / Quran / Tajweed / Makhraj
            else if (text.includes('আরবি') || text.includes('কুরআন') || text.includes('হরকত') || text.includes('মাখরাজ') || text.includes('তাজবিদ') || text.match(/[\u0600-\u06FF]/)) {
                generatedTitle = 'হরফের সঠিক মাখরাজ ও হরকত-তানভীনের সহিহ উচ্চারণ অনুশীলন';
                if (!subject) setSubject('আরবি ও তাজবিদ');
                if (!researchType) setResearchType('Student Activity');
            }
            // 7. Science / States of matter
            else if (text.includes('বিজ্ঞান') || text.includes('পদার্থ') || text.includes('পরিবেশ') || text.includes('পানি') || text.includes('বায়ু')) {
                generatedTitle = 'সহজ ক্লাসরুম পরীক্ষণ ও পর্যবেক্ষণে বিজ্ঞানের মূল ধারণা শিখন';
                if (!subject) setSubject('বিজ্ঞান');
                if (!researchType) setResearchType('Concept Understanding');
            }
            // 8. General fallback from chapter / source snippet
            else {
                const cleanFirstLine = sourceContent.split('\n')[0]?.trim().slice(0, 45);
                if (chapter.trim()) {
                    generatedTitle = `${chapter.trim()} - মূল পাঠ ও ব্যবহারিক শিখন অনুশীলন`;
                } else if (cleanFirstLine && cleanFirstLine.length > 5) {
                    generatedTitle = `"${cleanFirstLine}" পাঠে শিক্ষার্থীদের শিখন দক্ষতা উন্নয়ন`;
                } else if (subject.trim()) {
                    generatedTitle = `${subject.trim()} বিষয়ে শিক্ষার্থীদের শ্রেণিকক্ষভিত্তিক দক্ষতা উন্নয়ন`;
                } else {
                    generatedTitle = 'শ্রেণিকক্ষ শিখন পদ্ধতি ও শিক্ষার্থীদের দক্ষতা উন্নয়ন গবেষণা';
                }
            }

            setTitle(generatedTitle);
            setIsGeneratingTitle(false);
        }, 350);
    };

    // Smart auto-generate goal/objective based on provided source content and topic title
    const handleAutoGenerateGoal = () => {
        const text = (sourceContent + ' ' + title).toLowerCase();
        if (!text.trim()) return;

        setIsGeneratingGoal(true);

        setTimeout(() => {
            let generatedGoal = '';

            // 1. Rhyme / Poem / Rhyming verse
            if (text.includes('poem') || text.includes('কবিতা') || text.includes('rhyme') || text.includes('ছড়া') || text.includes('fish alive') || text.includes('verse')) {
                if (text.match(/[a-z]/i)) {
                    generatedGoal = 'ইংরেজি ছড়ার সঠিক ছন্দ ও স্পষ্ট উচ্চারণে সাবলীল আবৃত্তি করা এবং ছড়ার মূল শব্দসমূহ নির্ভুল বানানে খাতায় লেখার দক্ষতা অর্জন।';
                    if (!subject) setSubject('ইংরেজি');
                    if (!researchType) setResearchType('Reading Improvement');
                } else {
                    generatedGoal = 'কবিতার ছন্দ, তাল ও সঠিক ভাব বজায় রেখে স্পষ্ট উচ্চারণে আবৃত্তি করা এবং মূল ভাবার্থ উপলব্ধি করে খাতায় লিখতে পারা।';
                    if (!subject) setSubject('বাংলা');
                    if (!researchType) setResearchType('Writing Improvement');
                }
            } 
            // 2. Numbers / Counting / Math
            else if (text.includes('গণিত') || text.includes('math') || text.includes('সংখ্যা') || text.includes('যোগ') || text.includes('বিয়োগ') || text.includes('গুণ') || text.includes('ভাগ') || text.includes('ভগ্নাংশ') || text.includes('১') || text.includes('1, 2, 3') || text.includes('four') || text.includes('five')) {
                generatedGoal = 'সংখ্যার সঠিক ধারণা, ক্রমবিন্যাস ও বাস্তব উদাহরণের সাহায্যে গাণিতিক নিয়মাবলী নির্ভুলভাবে প্রয়োগ করার দক্ষতা বৃদ্ধি।';
                if (!subject) setSubject('গণিত');
                if (!researchType) setResearchType('Concept Understanding');
            }
            // 3. Arabic / Quran / Tajweed / Makhraj
            else if (text.includes('আরবি') || text.includes('কুরআন') || text.includes('হরকত') || text.includes('মাখরাজ') || text.includes('তাজবিদ') || text.match(/[\u0600-\u06FF]/)) {
                generatedGoal = 'মাখরাজের সঠিক স্থান থেকে হরফের শুদ্ধ উচ্চারণ মস্ক করা এবং হরকত ও তানভীনের নিয়ম মেনে সাবলীল তিলাওয়াত নিশ্চিত করা।';
                if (!subject) setSubject('আরবি ও তাজবিদ');
                if (!researchType) setResearchType('Student Activity');
            }
            // 4. Bengali reading / spelling / handwriting
            else if (text.includes('বাংলা') || text.includes('যুক্তবর্ণ') || text.includes('হাতের লেখা') || text.includes('স্বরচিহ্ন') || text.includes('বানান')) {
                generatedGoal = 'সঠিক মাত্রায় বর্ণ ও যুক্তবর্ণের গঠন নির্ভুল রেখে স্পষ্ট হাতের লেখা এবং পাঠ্যাংশ সাবলীলভাবে পড়ার জড়তা দূর করা।';
                if (!subject) setSubject('বাংলা');
                if (!researchType) setResearchType('Writing Improvement');
            }
            // 5. English Reading / Vocabulary / Conversation
            else if (text.match(/[a-z]/i) && (text.includes('read') || text.includes('write') || text.includes('words') || text.includes('speak') || text.includes('english'))) {
                generatedGoal = 'সঠিক উচ্চারণ ও অর্থসহ ইংরেজি পাঠ্যাংশ সাবলীলভাবে পড়া এবং নতুন শব্দ দিয়ে ছোট বাক্য গঠনের জড়তা কাটিয়ে ওঠা।';
                if (!subject) setSubject('ইংরেজি');
                if (!researchType) setResearchType('Reading Improvement');
            }
            // 6. Science / Environment
            else if (text.includes('বিজ্ঞান') || text.includes('পদার্থ') || text.includes('পরিবেশ') || text.includes('প্রাণী') || text.includes('উদ্ভিদ')) {
                generatedGoal = 'শ্রেণিকক্ষে সহজ বাস্তব উদাহরণ ও পর্যবেক্ষণের সাহায্যে বৈজ্ঞানিক ধারণার স্পষ্ট উপলব্ধি এবং প্রশ্নের নির্ভুল উত্তর প্রদান।';
                if (!subject) setSubject('বিজ্ঞান');
                if (!researchType) setResearchType('Concept Understanding');
            }
            // 7. General fallback tailored to whatever text exists
            else {
                const topicSummary = title.trim() ? `"${title.trim()}"` : 'নির্ধারিত পাঠ্যাংশ';
                generatedGoal = `${topicSummary}-এর মূল ভাবার্থ মনোযোগ দিয়ে উপলব্ধি করা এবং শিক্ষার্থীদের বাস্তব অনুশীলনের মাধ্যমে সংশ্লিষ্ট শিখনফল শতভাগ নিশ্চিত করা।`;
            }

            setProblemToSolve(generatedGoal);
            setIsGeneratingGoal(false);
        }, 350);
    };

    // Add new subject on the fly
    const handleAddNewSubject = (customSubj: string) => {
        const trimmed = customSubj.trim();
        if (!trimmed) return;
        if (!subjectList.includes(trimmed)) {
            setSubjectList(prev => [...prev, trimmed]);
        }
        setSubject(trimmed);
        setCustomSubjectInput('');
        setIsAddingNewSubject(false);
    };

    // Add new class on the fly manually
    const handleAddNewClass = (customCls: string) => {
        const trimmed = customCls.trim();
        if (!trimmed) return;
        if (!classList.includes(trimmed)) {
            setClassList(prev => [...prev, trimmed]);
        }
        setGrade(trimmed);
        setCustomClassInput('');
        setIsAddingNewClass(false);
        setGradeDropdownOpen(false);
    };

    // Copy source content helper
    const handleCopySource = () => {
        if (!sourceContent) return;
        navigator.clipboard.writeText(sourceContent);
        setCopiedSource(true);
        setTimeout(() => setCopiedSource(false), 2000);
    };

    // Auto-save draft to Database
    const saveDraftToDatabase = async (isManual = false) => {
        // Only save draft if user has typed something
        if (!title.trim() && !problemToSolve.trim() && !bookName.trim()) return;
        if (isSavingRef.current) return;

        isSavingRef.current = true;
        setIsSavingDraft(true);
        try {
            const timestamp = Date.now();
            const currentDraftId = draftIdRef.current || draftId;
            const topicHumanId = topicHumanIdRef.current;

            const draftPayload = {
                title: title.trim() || 'নামহীন খসড়া গবেষণা',
                problemToSolve: problemToSolve.trim() || 'খসড়া উদ্দেশ্য এখনও লিপিবদ্ধ করা হয়নি।',
                category: subject,
                researchType,
                status: 'Draft',
                visibility: 'public',
                bookInfo: {
                    board,
                    grade,
                    subject,
                    bookName,
                    chapter,
                    pageNumber
                },
                totalDays: targetDays,
                currentDayNumber: 1,
                progress: 5,
                sources: [
                    {
                        id: `src-${timestamp}`,
                        humanId: `SRC-${new Date().getFullYear()}-01`,
                        title: sourceFileName || `${bookName} - ${chapter} (পৃষ্ঠা ${pageNumber})`,
                        type: 'text',
                        content: sourceContent,
                        uploadedAt: new Date().toISOString().split('T')[0]
                    }
                ],
                authorName: currentUserName,
                authorRole: currentUserRole,
                instituteName: currentInstitute,
                tags: [subject, grade, board]
            };

            if (currentDraftId) {
                const res = await fetch(`/api/research/${currentDraftId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(draftPayload)
                });
                const data = await res.json();
                if (data.success && data.data) {
                    onCreated(data.data);
                }
            } else {
                const res = await fetch('/api/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...draftPayload,
                        humanId: topicHumanId
                    })
                });
                const data = await res.json();
                if (data.success && data.data) {
                    draftIdRef.current = data.data.id;
                    if (data.data.humanId) {
                        topicHumanIdRef.current = data.data.humanId;
                    }
                    setDraftId(data.data.id);
                    onCreated(data.data);
                }
            }
            const now = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
            setLastSavedAt(now);
        } catch (err) {
            console.error('Error saving draft to database:', err);
        } finally {
            isSavingRef.current = false;
            setIsSavingDraft(false);
        }
    };

    // Single Form Final Submit Handler (Promotes Draft to Running)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalTitle = title.trim() || 'শ্রেণিকক্ষ শিখন পদ্ধতি গবেষণা';
        const finalGoal = problemToSolve.trim() || 'শিক্ষার্থীদের পাঠদান সহজকরণ ও দক্ষতা বৃদ্ধি।';
        const timestamp = Date.now();
        const activeDraftId = draftIdRef.current || draftId;
        const topicHumanId = topicHumanIdRef.current;

        // Dynamic 7-day default plan tailored to the topic
        const initialDays: ResearchDayActivity[] = Array.from({ length: targetDays }).map((_, idx) => {
            const dayNum = idx + 1;
            let dayTitle = `দিন ${dayNum}: প্র্যাকটিস সেশন`;
            let objective = `লক্ষ্যমাত্রা অর্জন ও ধারাবাহিক মূল্যায়ন`;

            if (dayNum === 1) {
                dayTitle = `দিন ১: প্রস্তুতি ও বেইসলাইন যাচাই`;
                objective = `শিক্ষার্থীদের বর্তমান অবস্থা ও প্রাথমিক ভুল চিহ্নিত করা`;
            } else if (dayNum === 2) {
                dayTitle = `দিন ২: মৌলিক কৌশল অনুশীলন`;
                objective = `সঠিক নিয়ম ও পদ্ধতি হাতে-কলমে প্রদর্শন`;
            } else if (dayNum === 3) {
                dayTitle = `দিন ৩: নিয়ন্ত্রিত ক্লাসরুম চর্চা`;
                objective = `ছোট ছোট দলে শিক্ষক তত্ত্বাবধানে প্র্যাকটিস`;
            } else if (dayNum === 4) {
                dayTitle = `দিন ৪: স্বতন্ত্র অনুশীলন`;
                objective = `শিক্ষার্থীরা একা একা কাজ করবে ও গতি পর্যবেক্ষণ`;
            } else if (dayNum === 5) {
                dayTitle = `দিন ৫: ভুল সংশোধন ও প্রতিকার`;
                objective = `নির্দিষ্ট ভুলগুলো বাছাই করে সমাধান ট্রায়াল`;
            } else if (dayNum === targetDays) {
                dayTitle = `দিন ${targetDays}: চূড়ান্ত মূল্যায়ন ও এভিডেন্স`;
                objective = `ফলাফল পরিমাপ ও বিফোর/আফটার এভিডেন্স সংগ্রহ`;
            }

            return {
                id: `act-${timestamp}-${dayNum}`,
                humanId: `ACT-${new Date().getFullYear()}-${String(dayNum).padStart(2, '0')}${topicHumanId.slice(-4)}`,
                dayNumber: dayNum,
                title: dayTitle,
                objective,
                teacherInstructions: [
                    'শিক্ষার্থীদের মনোযোগ আকর্ষণ করুন এবং ৫ মিনিট মূল নিয়ম স্মরণ করিয়ে দিন।',
                    'নির্দিষ্ট টাস্ক শিট বা খাতায় লিখতে নির্দেশ দিন।',
                    'দুর্বল শিক্ষার্থীদের টেবিল ঘুরে পর্যবেক্ষণ করুন।'
                ],
                studentTask: `${finalTitle} সংক্রান্ত নির্ধারিত অনুশীলন সম্পন্ন করা`,
                expectedResult: `কমপক্ষে ৮০% শিক্ষার্থী নির্দেশিত পদ্ধতিতে কাজটি সম্পন্ন করবে।`,
                estimatedMinutes: 25,
                materials: ['খাতা', 'পেন্সিল / কলম', 'অনুশীলন শিট'],
                status: 'pending',
                observedProblems: [],
                mistakes: [],
                solutions: []
            };
        });

        const activePayload = {
            title: finalTitle,
            problemToSolve: finalGoal,
            category: subject,
            researchType,
            status: 'Running',
            visibility: 'public',
            bookInfo: {
                board,
                grade,
                subject,
                bookName,
                chapter,
                pageNumber
            },
            totalDays: targetDays,
            currentDayNumber: 1,
            progress: 10,
            days: initialDays,
            sources: [
                {
                    id: `src-${timestamp}`,
                    humanId: `SRC-${new Date().getFullYear()}-01`,
                    title: sourceFileName || `${bookName} - ${chapter} (পৃষ্ঠা ${pageNumber})`,
                    type: 'text',
                    content: sourceContent,
                    uploadedAt: new Date().toISOString().split('T')[0]
                }
            ],
            evidenceList: [],
            authorId: 'current-user',
            authorName: currentUserName,
            authorRole: currentUserRole,
            instituteName: currentInstitute,
            tags: [subject, grade, board],
            fieldTestedCount: 1,
            completedCount: 0,
            improvedVersionCount: 0,
            contributors: [
                {
                    id: 'current-user',
                    name: currentUserName,
                    role: 'উদ্যোক্তা ও প্রধান গবেষক',
                    instituteName: currentInstitute,
                    contributionType: 'বিষয় নির্ধারণ ও প্রাথমিক গবেষণা',
                    contributedAt: new Date().toISOString().split('T')[0]
                }
            ]
        };

        try {
            if (activeDraftId) {
                // Promote existing draft in DB to active Running status
                const res = await fetch(`/api/research/${activeDraftId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(activePayload)
                });
                const data = await res.json();
                if (data.success && data.data) {
                    onCreated(data.data);
                } else {
                    onCreated({ ...activePayload, id: activeDraftId, humanId: topicHumanId } as any);
                }
            } else {
                // Directly create and save new active topic in DB
                const res = await fetch('/api/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...activePayload, humanId: topicHumanId })
                });
                const data = await res.json();
                if (data.success && data.data) {
                    onCreated(data.data);
                } else {
                    onCreated({ ...activePayload, id: `res-${timestamp}`, humanId: topicHumanId } as any);
                }
            }
        } catch (err) {
            console.error('Error submitting research to DB:', err);
            onCreated({ ...activePayload, id: activeDraftId || `res-${timestamp}`, humanId: topicHumanId } as any);
        }

        onClose();
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            data-lenis-prevent="true"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            {/* Modal Card - Responsive 2-Column Clean Round Form that Fits Height Perfectly */}
            <div 
                className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
                data-lenis-prevent="true"
            >
                
                {/* Minimal Header */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm sm:text-base font-black text-slate-800">
                            {draftId ? 'খসড়া গবেষণা সম্পাদনা' : 'নতুন গবেষণা প্রজেক্ট'}
                        </h2>
                        {isSavingDraft && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-500">
                                <RotateCcw size={10} className="animate-spin" />
                                সেভ হচ্ছে...
                            </span>
                        )}
                        {!isSavingDraft && lastSavedAt && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-500">
                                <CheckCircle2 size={10} />
                                সংরক্ষিত
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form Body - Perfectly Balanced 2-Column Responsive Layout */}
                <form 
                    id="create-research-form" 
                    onSubmit={handleSubmit} 
                    className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar scroll-smooth overscroll-contain"
                    data-lenis-prevent="true"
                >
                    {/* Mobile Tab Switcher (Visible only on mobile/tablet < lg) */}
                    <div className="lg:hidden flex items-center p-1 bg-slate-100/90 rounded-2xl mb-4 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setMobileActiveTab('topic')}
                            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                mobileActiveTab === 'topic'
                                    ? 'bg-white text-[#045c84] shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Target size={14} />
                            <span>১. বিষয় ও পাঠ্যবস্তু</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileActiveTab('book')}
                            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                mobileActiveTab === 'book'
                                    ? 'bg-white text-[#045c84] shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <BookOpen size={14} />
                            <span>২. বই ও বিবরণ</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        
                        {/* LEFT COLUMN: TOPIC, MAIN CONTENT & GOAL (col-span-7) */}
                        <div className={`lg:col-span-7 space-y-3 ${mobileActiveTab === 'topic' ? 'block' : 'hidden lg:block'}`}>
                            <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-200/80 space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#045c84] uppercase tracking-wider">
                                    <Target size={14} />
                                    <span>১. বিষয় ও মূল পাঠ্যবস্তু</span>
                                </div>

                                {/* 1. Topic Title */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            গবেষণার বিষয় *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleAutoGenerateTitle}
                                            disabled={isGeneratingTitle || (!sourceContent.trim() && !subject.trim() && !bookName.trim() && !chapter.trim())}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#045c84] bg-sky-50 hover:bg-sky-100 border border-sky-200/80 hover:border-sky-300 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
                                            title="প্রদত্ত পাঠ্যবস্তু বা বইয়ের তথ্যের ওপর ভিত্তি করে বিষয় নির্ধারণ করুন"
                                        >
                                            <Sparkles size={11} className={`text-[#045c84] ${isGeneratingTitle ? 'animate-spin' : ''}`} />
                                            <span>{isGeneratingTitle ? 'তৈরি হচ্ছে...' : 'অটো-জেনারেট'}</span>
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="গবেষণার বিষয় বা শিরোনাম লিখুন..."
                                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all placeholder:text-slate-400"
                                    />
                                </div>

                                {/* 2. Main Content (Directly below Topic Title in first position) */}
                                <div className="space-y-1.5 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                            <FileText size={13} className="text-[#045c84]" />
                                            <span>পাঠের বিষয়বস্তু / উৎস *</span>
                                        </label>

                                        {sourceContent && (
                                            <button
                                                type="button"
                                                onClick={handleCopySource}
                                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
                                                title="টেক্সট কপি করুন"
                                            >
                                                {copiedSource ? <Check size={11} className="text-emerald-600" /> : <Copy size={10} />}
                                                <span>{copiedSource ? 'কপি হয়েছে' : 'কপি'}</span>
                                            </button>
                                        )}
                                    </div>

                                    <textarea
                                        rows={6}
                                        value={sourceContent}
                                        onChange={(e) => setSourceContent(e.target.value)}
                                        data-lenis-prevent="true"
                                        placeholder="পাঠ্যবইয়ের সংশ্লিষ্ট অনুচ্ছেদ, সূত্র বা অনুশীলনী লিখুন বা পেস্ট করুন..."
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all custom-scrollbar scroll-smooth overscroll-contain resize-y min-h-[140px] max-h-[280px] placeholder:text-slate-400"
                                    />

                                    {/* Optional File Upload */}
                                    <div className="pt-1 flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 shrink-0">পৃষ্ঠার ছবি:</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    setSourceFileName(e.target.files[0].name);
                                                }
                                            }}
                                            className="text-[11px] text-slate-500 file:mr-2 file:py-0.5 file:px-2.5 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-[#045c84]/10 file:text-[#045c84] hover:file:bg-[#045c84]/20 cursor-pointer"
                                        />
                                        {sourceFileName && (
                                            <span className="text-[10px] font-bold text-emerald-600 truncate">✓ {sourceFileName}</span>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Goal / Problem to Solve */}
                                <div className="pt-1 border-t border-slate-200/60">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            উদ্দেশ্য বা লক্ষ্য *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleAutoGenerateGoal}
                                            disabled={isGeneratingGoal || (!sourceContent.trim() && !title.trim())}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#045c84] bg-sky-50 hover:bg-sky-100 border border-sky-200/80 hover:border-sky-300 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
                                            title="প্রদত্ত পাঠ্যবস্তু বা বিষয়ের ওপর ভিত্তি করে স্বয়ংক্রিয় লক্ষ্য তৈরি করুন"
                                        >
                                            <Sparkles size={11} className={`text-[#045c84] ${isGeneratingGoal ? 'animate-spin' : ''}`} />
                                            <span>{isGeneratingGoal ? 'তৈরি হচ্ছে...' : 'অটো-জেনারেট'}</span>
                                        </button>
                                    </div>
                                    <textarea
                                        rows={2}
                                        required
                                        value={problemToSolve}
                                        onChange={(e) => setProblemToSolve(e.target.value)}
                                        data-lenis-prevent="true"
                                        placeholder="শিক্ষার্থীরা কী সমস্যা মোকাবেলা করছে বা গবেষণার লক্ষ্য কী..."
                                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all custom-scrollbar scroll-smooth overscroll-contain resize-y min-h-[60px] max-h-[120px] placeholder:text-slate-400"
                                    />
                                </div>

                                {/* Mobile Next Tab Switch Button */}
                                <div className="lg:hidden pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setMobileActiveTab('book')}
                                        className="w-full py-2.5 px-4 bg-[#045c84] hover:bg-[#034664] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-98"
                                    >
                                        <span>পরবর্তী: বই ও বিবরণ</span>
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: BOOK & CURRICULUM DETAILS + DURATION (col-span-5) */}
                        <div className={`lg:col-span-5 space-y-3 ${mobileActiveTab === 'book' ? 'block' : 'hidden lg:block'}`}>
                            <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-200/80 space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#045c84] uppercase tracking-wider">
                                    <BookOpen size={14} />
                                    <span>২. বই ও পাঠ্যক্রম</span>
                                </div>

                                {/* Board & Publication - with Desktop Inline Dropdown Popover */}
                                <div className="relative" ref={boardDropdownRef}>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        বোর্ড / প্রকাশনী
                                    </label>
                                    <div className="flex gap-1.5">
                                        <input
                                            type="text"
                                            value={board}
                                            onChange={(e) => setBoard(e.target.value)}
                                            placeholder="বোর্ড বা প্রকাশনীর নাম লিখুন বা বাছাই করুন..."
                                            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBoardDropdownOpen(!boardDropdownOpen);
                                                setGradeDropdownOpen(false);
                                                setSubjectDropdownOpen(false);
                                            }}
                                            className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs transition-colors"
                                            title="বোর্ড তালিকা থেকে বাছাই করুন"
                                        >
                                            <span>বাছাই</span>
                                            <ChevronDown size={13} className={`transition-transform duration-150 ${boardDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Inline Dropdown Popover */}
                                    {boardDropdownOpen && (
                                        <div 
                                            className="absolute right-0 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 max-h-52 overflow-y-auto custom-scrollbar scroll-smooth animate-in fade-in zoom-in-95 duration-100"
                                            data-lenis-prevent="true"
                                        >
                                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                                                বোর্ড বা প্রকাশনী নির্বাচন
                                            </div>
                                            {BOARDS.map((b) => (
                                                <button
                                                    key={b}
                                                    type="button"
                                                    onClick={() => {
                                                        setBoard(b);
                                                        setBoardDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer ${
                                                        board === b ? 'text-[#045c84] bg-sky-50/60 font-bold' : 'text-slate-700'
                                                    }`}
                                                >
                                                    <span>{b}</span>
                                                    {board === b && <CheckCircle2 size={12} className="text-[#045c84]" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Subject - Clean and Roomy Input Box (No card, no chip clutter) */}
                                <div className="relative" ref={subjectDropdownRef}>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        বিষয় *
                                    </label>
                                    <div className="flex gap-1.5">
                                        <input
                                            type="text"
                                            required
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="বিষয় লিখুন বা বাছাই করুন..."
                                            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSubjectDropdownOpen(!subjectDropdownOpen);
                                                setBoardDropdownOpen(false);
                                                setGradeDropdownOpen(false);
                                            }}
                                            className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs transition-colors"
                                            title="বিষয় তালিকা থেকে বাছাই করুন"
                                        >
                                            <span>বাছাই</span>
                                            <ChevronDown size={13} className={`transition-transform duration-150 ${subjectDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Inline Subject Dropdown Popover */}
                                    {subjectDropdownOpen && (
                                        <div 
                                            className="absolute right-0 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 max-h-56 overflow-y-auto custom-scrollbar scroll-smooth animate-in fade-in zoom-in-95 duration-100"
                                            data-lenis-prevent="true"
                                        >
                                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 flex items-center justify-between">
                                                <span>বিষয় নির্বাচন</span>
                                                <span className="text-[9px] text-[#045c84] font-medium">ক্লিক করে নির্বাচন করুন</span>
                                            </div>
                                            {subjectList.map((subjItem) => (
                                                <button
                                                    key={subjItem}
                                                    type="button"
                                                    onClick={() => {
                                                        handleSelectPresetSubject(subjItem);
                                                        setSubjectDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer ${
                                                        subject === subjItem ? 'text-[#045c84] bg-sky-50/60 font-bold' : 'text-slate-700'
                                                    }`}
                                                >
                                                    <span>{subjItem}</span>
                                                    {subject === subjItem && <CheckCircle2 size={13} className="text-[#045c84]" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Grade & Book Title (2-Column Mini Grid) */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    {/* Grade (Direct Input + Dropdown List + Add Custom Class) */}
                                    <div className="relative" ref={gradeDropdownRef}>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-slate-700">
                                                শ্রেণি
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingNewClass(!isAddingNewClass)}
                                                className="text-[10px] font-bold text-[#045c84] hover:underline flex items-center gap-0.5 cursor-pointer"
                                                title="নতুন শ্রেণি যুক্ত করুন"
                                            >
                                                <Plus size={10} />
                                                <span>{isAddingNewClass ? 'বাতিল' : 'নতুন'}</span>
                                            </button>
                                        </div>

                                        {/* Class editable input + dropdown chevron */}
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={grade}
                                                onChange={(e) => setGrade(e.target.value)}
                                                placeholder="শ্রেণি লিখুন..."
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setGradeDropdownOpen(!gradeDropdownOpen);
                                                    setBoardDropdownOpen(false);
                                                    setSubjectDropdownOpen(false);
                                                }}
                                                className="px-2.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs transition-colors"
                                                title="শ্রেণি তালিকা দেখুন"
                                            >
                                                <ChevronDown size={13} className={`text-slate-500 transition-transform duration-150 ${gradeDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>

                                        {/* Inline Add New Class Input */}
                                        {isAddingNewClass && (
                                            <div className="mt-1.5 flex items-center gap-1.5 p-1.5 bg-sky-50/90 rounded-xl border border-sky-200 animate-in fade-in zoom-in-95 duration-150">
                                                <input
                                                    type="text"
                                                    value={customClassInput}
                                                    onChange={(e) => setCustomClassInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddNewClass(customClassInput);
                                                        }
                                                    }}
                                                    placeholder="শ্রেণির নাম..."
                                                    className="flex-1 px-2.5 py-1.5 bg-white border border-sky-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddNewClass(customClassInput)}
                                                    disabled={!customClassInput.trim()}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#045c84] hover:bg-[#034664] disabled:opacity-50 transition-all cursor-pointer shrink-0"
                                                >
                                                    যুক্ত
                                                </button>
                                            </div>
                                        )}

                                        {/* Dropdown Popover */}
                                        {gradeDropdownOpen && (
                                            <div 
                                                className="absolute left-0 top-full mt-1 w-full min-w-[210px] bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 max-h-56 overflow-y-auto custom-scrollbar scroll-smooth animate-in fade-in zoom-in-95 duration-100"
                                                data-lenis-prevent="true"
                                            >
                                                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 flex items-center justify-between">
                                                    <span>শ্রেণি তালিকা ({classList.length})</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddingNewClass(true)}
                                                        className="text-[9px] text-[#045c84] font-bold hover:underline"
                                                    >
                                                        + নতুন যোগ
                                                    </button>
                                                </div>
                                                {classList.map((cls) => (
                                                    <button
                                                        key={cls}
                                                        type="button"
                                                        onClick={() => {
                                                            setGrade(cls);
                                                            setGradeDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer ${
                                                            grade === cls ? 'text-[#045c84] bg-sky-50/60 font-bold' : 'text-slate-700'
                                                        }`}
                                                    >
                                                        <span>{cls}</span>
                                                        {grade === cls && <CheckCircle2 size={12} className="text-[#045c84]" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Book Title */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            বইয়ের নাম
                                        </label>
                                        <input
                                            type="text"
                                            value={bookName}
                                            onChange={(e) => setBookName(e.target.value)}
                                            placeholder="বইয়ের নাম লিখুন..."
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Chapter & Page (2-Column Mini Grid) */}
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            অধ্যায় / পাঠ
                                        </label>
                                        <input
                                            type="text"
                                            value={chapter}
                                            onChange={(e) => setChapter(e.target.value)}
                                            placeholder="অধ্যায় বা পাঠের নাম..."
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            পৃষ্ঠা
                                        </label>
                                        <input
                                            type="text"
                                            value={pageNumber}
                                            onChange={(e) => setPageNumber(e.target.value)}
                                            placeholder="যেমন: ১২"
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Duration */}
                            <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                    <Calendar size={13} className="text-[#045c84]" />
                                    <span>সময়কাল:</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[3, 5, 7, 10, 14].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setTargetDays(d)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                                targetDays === d
                                                    ? 'bg-[#045c84] text-white shadow-xs'
                                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                            }`}
                                        >
                                            {d} দিন
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Step Action Controls (Previous Tab & Submit) */}
                            <div className="lg:hidden pt-1 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMobileActiveTab('topic')}
                                    className="py-2.5 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-98"
                                >
                                    <ChevronLeft size={14} />
                                    <span>পূর্ববর্তী</span>
                                </button>
                                <button
                                    type="submit"
                                    form="create-research-form"
                                    disabled={!title.trim()}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-900/20 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <CheckCircle2 size={15} />
                                    <span>গবেষণা প্রজেক্ট শুরু করুন</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Controls - Save Draft & Submit Action Buttons */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                        বাতিল
                    </button>

                    <div className="flex items-center gap-2">
                        {/* Save Draft in Database Button */}
                        <button
                            type="button"
                            onClick={() => saveDraftToDatabase(true)}
                            disabled={isSavingDraft || (!title.trim() && !problemToSolve.trim())}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
                            title="দাখিল করার পূর্বে খসড়া হিসেবে ডাটাবেসে সেভ রাখুন"
                        >
                            <Save size={13} className="text-[#045c84]" />
                            <span>{isSavingDraft ? 'সংরক্ষণ হচ্ছে...' : 'খসড়া সংরক্ষণ'}</span>
                        </button>

                        {/* Final Submit Button */}
                        <button
                            type="submit"
                            form="create-research-form"
                            disabled={!title.trim()}
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95 shadow-md shadow-emerald-900/20 cursor-pointer"
                        >
                            <CheckCircle2 size={15} />
                            <span>গবেষণা প্রজেক্ট শুরু করুন</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
