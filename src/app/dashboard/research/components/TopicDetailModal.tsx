'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Sparkles,
    Play,
    Pause,
    CheckCircle2,
    Calendar,
    Clock,
    BookOpen,
    ArrowLeft,
    AlertTriangle,
    ShieldAlert,
    Lightbulb,
    FileText,
    Image as ImageIcon,
    Award,
    Check,
    ChevronRight,
    Users,
    Trash2,
    Share2,
    RefreshCw,
    MoreVertical,
    Edit3,
    ClipboardList,
    Zap,
    Plus,
    Package
} from 'lucide-react';
import {
    ResearchTopic,
    ResearchDayActivity,
    PerformanceRating,
    MistakeItem,
    ProblemSolutionItem,
    BeforeAfterEvidence,
    ResearchStatus
} from '../types/research';
import SelectionListModal from './SelectionListModal';

interface TopicDetailModalProps {
    isOpen: boolean;
    topic: ResearchTopic | null;
    isSuperAdmin?: boolean;
    onClose: () => void;
    onUpdateTopic: (updatedTopic: ResearchTopic) => void;
    onDeleteTopic?: (topicId: string) => void;
}

const COMMON_PROBLEMS_LIST = [
    'শিক্ষার্থীদের মনোযোগ হ্রাস পেয়েছিল',
    'লেখার গতি প্রত্যাশার চেয়ে কম ছিল',
    'বর্ণের গঠন ও মাত্রা সঠিক ছিল না',
    'শিক্ষার্থীরা নির্দেশনা বুঝতে বিভ্রান্ত হয়েছিল',
    'ব্যক্তিগত তত্ত্বাবধানের প্রয়োজন বেশি ছিল',
    'সময় নির্ধারিত ২৫ মিনিটের চেয়ে বেশি লেগেছে',
    'উপকরণ ও শিট অপ্রতুল ছিল'
];

const STATUS_LIST: ResearchStatus[] = ['Idea', 'Researching', 'Running', 'Tested', 'Validated', 'Improved', 'Failed', 'Archived'];

import ClassExecutionMode from './ClassExecutionMode';

export default function TopicDetailModal({
    isOpen,
    topic,
    isSuperAdmin = false,
    onClose,
    onUpdateTopic,
    onDeleteTopic
}: TopicDetailModalProps) {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'plan' | 'implement' | 'observation' | 'problems' | 'evidence' | 'report'>('plan');
    const [selectedDayNum, setSelectedDayNum] = useState<number>(1);
    const [isDayGridOpen, setIsDayGridOpen] = useState(false);
    const [selectedTexts, setSelectedTexts] = useState<Record<number, string>>({});
    const [isEditingContent, setIsEditingContent] = useState<Record<number, boolean>>({});
    const [highlightedText, setHighlightedText] = useState('');
    const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
    const [analyzedContent, setAnalyzedContent] = useState<Record<number, any>>({});
    
    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    
    // Live timer state for active execution
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Form inputs for current day's feedback
    const [currentRating, setCurrentRating] = useState<PerformanceRating>('Good');
    const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
    const [teacherObservation, setTeacherObservation] = useState('');

    // New Mistake Form
    const [mistakeDesc, setMistakeDesc] = useState('');
    const [mistakeCount, setMistakeCount] = useState('5');
    const [mistakeCause, setMistakeCause] = useState('');

    // New Problem-Solution Form
    const [problemTitle, setProblemTitle] = useState('');
    const [problemCount, setProblemCount] = useState('6');
    const [teacherSolution, setTeacherSolution] = useState('');
    const [solutionWorkStatus, setSolutionWorkStatus] = useState<'yes' | 'partially' | 'no'>('yes');
    const [resultAfterCorrection, setResultAfterCorrection] = useState('');

    // Before/After Image Evidence State
    const [evidenceTitle, setEvidenceTitle] = useState('হাতের লেখা স্ট্রোক ও মাত্রার তুলনা');
    const [studentName, setStudentName] = useState('আব্দুর রহমান (রোল ৩)');
    const [letterFormationScore, setLetterFormationScore] = useState(4);
    const [alignmentScore, setAlignmentScore] = useState(4);
    const [spacingScore, setSpacingScore] = useState(3);
    const [controlScore, setControlScore] = useState(4);

    // AI Analysis simulation inside observation
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);

    // Plan editing state (per day, editable by teacher)
    const [editPlanTitle, setEditPlanTitle] = useState('');
    const [editPlanObjective, setEditPlanObjective] = useState('');
    const [editPlanStudentTask, setEditPlanStudentTask] = useState('');
    const [editPlanExpectedResult, setEditPlanExpectedResult] = useState('');
    const [editPlanMaterials, setEditPlanMaterials] = useState('');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [planSaved, setPlanSaved] = useState(false);

    // Tasks & Activities items (parsed from source + teacher-added)
    type PlanItemType = 'task' | 'activity';
    interface PlanItem { id: string; type: PlanItemType; text: string; }
    const [planItems, setPlanItems] = useState<PlanItem[]>([]);
    const [newItemText, setNewItemText] = useState('');
    const [newItemType, setNewItemType] = useState<PlanItemType>('task');
    const [newMaterialText, setNewMaterialText] = useState('');
    const [isGeneratingMaterials, setIsGeneratingMaterials] = useState(false);

    // Serialize planItems → teacherInstructions format
    const serializePlanItems = (items: PlanItem[]): string[] =>
        items.map(it => `[${it.type.toUpperCase()}]: ${it.text}`);

    // Deserialize teacherInstructions → planItems
    const deserializePlanItems = (instructions: string[]): PlanItem[] =>
        instructions.map((line, idx) => {
            const taskMatch = line.match(/^\[TASK\]:\s*(.+)/);
            const actMatch = line.match(/^\[ACTIVITY\]:\s*(.+)/);
            if (taskMatch) return { id: `pi-${idx}`, type: 'task' as PlanItemType, text: taskMatch[1] };
            if (actMatch) return { id: `pi-${idx}`, type: 'activity' as PlanItemType, text: actMatch[1] };
            return { id: `pi-${idx}`, type: 'task' as PlanItemType, text: line };
        }).filter(it => it.text.trim());

    // Parse source content into tasks & activities
    const parseSourceToItems = (content: string, subject: string): PlanItem[] => {
        const lines = content.split(/[\n.।]+/).map(l => l.trim()).filter(l => l.length > 8);
        const items: PlanItem[] = [];
        let idCounter = 0;
        lines.slice(0, 10).forEach((line, idx) => {
            const isActivity = idx % 3 === 2 || /অনুশীলন|পড়|লেখ|তৈরি|করুন|খেলা|গান|আঁক|গণনা|সমাধান/i.test(line);
            items.push({ id: `ps-${idCounter++}`, type: isActivity ? 'activity' : 'task', text: line.slice(0, 120) });
        });
        return items;
    };

    // Modal selector for status
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

    // 3-Dot Menus state for items
    const [openMenuMistakeId, setOpenMenuMistakeId] = useState<string | null>(null);
    const [openMenuSolutionId, setOpenMenuSolutionId] = useState<string | null>(null);
    const [openMenuEvidenceId, setOpenMenuEvidenceId] = useState<string | null>(null);

    // Click away to close item menus
    useEffect(() => {
        const handleOutsideItemClick = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.item-action-menu')) {
                setOpenMenuMistakeId(null);
                setOpenMenuSolutionId(null);
                setOpenMenuEvidenceId(null);
            }
        };
        document.addEventListener('click', handleOutsideItemClick);
        return () => document.removeEventListener('click', handleOutsideItemClick);
    }, []);

    // Delete Mistake
    const handleDeleteMistake = (mistakeId: string) => {
        if (!topic) return;
        const updatedDays = topic.days.map(d => {
            if (d.dayNumber === selectedDayNum) {
                return {
                    ...d,
                    mistakes: (d.mistakes || []).filter(m => m.id !== mistakeId)
                };
            }
            return d;
        });
        onUpdateTopic({ ...topic, days: updatedDays });
    };

    // Delete Solution
    const handleDeleteSolution = (solId: string) => {
        if (!topic) return;
        const updatedDays = topic.days.map(d => {
            if (d.dayNumber === selectedDayNum) {
                return {
                    ...d,
                    solutions: (d.solutions || []).filter(s => s.id !== solId)
                };
            }
            return d;
        });
        onUpdateTopic({ ...topic, days: updatedDays });
    };

    // Delete Evidence
    const handleDeleteEvidence = (evdId: string) => {
        if (!topic) return;
        onUpdateTopic({
            ...topic,
            evidenceList: (topic.evidenceList || []).filter(e => e.id !== evdId)
        });
    };

    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const dayTabsContainerRef = useRef<HTMLDivElement>(null);

    // Timer interval
    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    // Initial load of fields when topic opens
    useEffect(() => {
        if (topic) {
            setSelectedDayNum(topic.currentDayNumber || 1);
            const activeDay = topic.days.find(d => d.dayNumber === (topic.currentDayNumber || 1));
            if (activeDay) {
                setCurrentRating(activeDay.performance || 'Good');
                setSelectedProblems(activeDay.observedProblems || []);
                setTeacherObservation(activeDay.teacherObservation || '');
                // Load existing plan data if any
                setEditPlanTitle(activeDay.title || '');
                setEditPlanObjective(activeDay.objective || '');
                setPlanItems(deserializePlanItems(activeDay.teacherInstructions || []));
                setEditPlanStudentTask(activeDay.studentTask || '');
                setEditPlanExpectedResult(activeDay.expectedResult || '');
                setEditPlanMaterials((activeDay.materials || []).join('\n'));
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topic?.id]);

    // Re-load plan fields when selected day changes
    useEffect(() => {
        if (!topic) return;
        const d = topic.days.find(day => day.dayNumber === selectedDayNum);
        if (d) {
            setEditPlanTitle(d.title || '');
            setEditPlanObjective(d.objective || '');
            setPlanItems(deserializePlanItems(d.teacherInstructions || []));
            setEditPlanStudentTask(d.studentTask || '');
            setEditPlanExpectedResult(d.expectedResult || '');
            setEditPlanMaterials((d.materials || []).join('\n'));
            setCurrentRating(d.performance || 'Good');
            setSelectedProblems(d.observedProblems || []);
            setTeacherObservation(d.teacherObservation || '');
            setPlanSaved(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDayNum]);

    // Auto-save changes (debounce 1s)
    useEffect(() => {
        if (!topic || !mounted) return;
        
        const d = topic.days.find(day => day.dayNumber === selectedDayNum);
        if (!d) return;

        // Check if anything actually changed
        const currentMaterials = editPlanMaterials.split('\n').map(s => s.trim()).filter(Boolean);
        const savedMaterials = d.materials || [];
        
        const hasPlanChanged = 
            editPlanTitle !== (d.title || '') ||
            editPlanObjective !== (d.objective || '') ||
            editPlanStudentTask !== (d.studentTask || '') ||
            editPlanExpectedResult !== (d.expectedResult || '') ||
            currentMaterials.join('\n') !== savedMaterials.join('\n') ||
            serializePlanItems(planItems).join('\n') !== (d.teacherInstructions || []).join('\n');
            
        const hasObservationChanged = 
            currentRating !== (d.performance || 'Good') ||
            JSON.stringify(selectedProblems) !== JSON.stringify(d.observedProblems || []) ||
            teacherObservation !== (d.teacherObservation || '');

        if (!hasPlanChanged && !hasObservationChanged) return;

        const timeoutId = setTimeout(() => {
            const updatedDays = topic.days.map(day => {
                if (day.dayNumber === selectedDayNum) {
                    return {
                        ...day,
                        title: editPlanTitle.trim() || day.title,
                        objective: editPlanObjective.trim() || day.objective,
                        teacherInstructions: serializePlanItems(planItems),
                        studentTask: editPlanStudentTask.trim() || day.studentTask,
                        expectedResult: editPlanExpectedResult.trim() || day.expectedResult,
                        materials: currentMaterials,
                        performance: currentRating,
                        observedProblems: selectedProblems,
                        teacherObservation: teacherObservation.trim() || day.teacherObservation
                    };
                }
                return day;
            });
            
            onUpdateTopic({ ...topic, days: updatedDays });
            setPlanSaved(true);
            setTimeout(() => setPlanSaved(false), 2000);
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [
        editPlanTitle, editPlanObjective, planItems, editPlanStudentTask, editPlanExpectedResult, editPlanMaterials,
        currentRating, selectedProblems, teacherObservation, selectedDayNum, topic, mounted
    ]);

    // ─── Auto Generate Day Plan ─────────────────────────────────────
    const handleAutoGeneratePlan = () => {
        if (!topic) return;
        setIsGeneratingPlan(true);

        setTimeout(() => {
            const titleText = topic.title.toLowerCase();
            const sourceText = (topic.sources?.[0]?.content || '').toLowerCase();
            const subj = topic.bookInfo.subject.toLowerCase();
            const chapter = topic.bookInfo.chapter || '';
            const grade = topic.bookInfo.grade || '';
            const prevDay = selectedDayNum > 1
                ? topic.days.find(d => d.dayNumber === selectedDayNum - 1)
                : null;

            // Determine context
            const prevPerf = prevDay?.performance || null;
            const prevProblems = (prevDay?.observedProblems || []).join('، ');
            const prevObs = prevDay?.teacherObservation || '';
            const hadDifficulty = prevPerf === 'Difficult' || prevPerf === 'Failed' || prevPerf === 'Mixed';

            // ── Subject-aware activity bank ──────────────────────────────
            let activity = { title: '', objective: '', instructions: [] as string[], studentTask: '', expectedResult: '', materials: [] as string[] };

            const isArabic = subj.includes('আরব') || subj.includes('arabic') || titleText.includes('মাখরাজ') || titleText.includes('তাজবিদ') || sourceText.match(/[\u0600-\u06FF]/);
            const isMath = subj.includes('গণিত') || subj.includes('math') || titleText.includes('সংখ্যা') || titleText.includes('গণনা');
            const isEnglish = subj.includes('ইংরেজি') || subj.includes('english') || titleText.match(/[a-z]{4,}/i);
            const isBangla = subj.includes('বাংলা') || titleText.includes('কবিতা') || titleText.includes('যুক্তবর্ণ');
            const isScience = subj.includes('বিজ্ঞান') || subj.includes('science') || titleText.includes('পরিবেশ');

            if (selectedDayNum === 1) {
                // ─ Day 1: Baseline check + topic intro ─────────────────
                if (isArabic) {
                    activity = {
                        title: 'দিন ১: বেইসলাইন — হরফ চেনা ও মাখরাজ যাচাই',
                        objective: 'শিক্ষার্থীদের বর্তমান হরফ উচ্চারণ দক্ষতা যাচাই করা',
                        instructions: [
                            'বোর্ডে ৫টি হরফ লিখে প্রত্যেক শিক্ষার্থীকে পড়তে বলুন।',
                            'যারা ভুল উচ্চারণ করে তাদের চিহ্নিত করুন এবং নাম নোট করুন।',
                            'সঠিক মাখরাজ শিক্ষক নিজে দেখিয়ে ২ বার করে পুনরাবৃত্তি করান।',
                            'শেষে একটি ছোট গ্রুপ পাঠ পরিচালনা করুন।'
                        ],
                        studentTask: 'নির্দিষ্ট হরফগুলো বোর্ড দেখে খাতায় লিখুন এবং জোরে পড়ুন।',
                        expectedResult: 'কমপক্ষে ৭০% শিক্ষার্থী নির্ধারিত হরফের নাম ও উচ্চারণ বলতে পারবে।',
                        materials: ['বোর্ড / মার্কার', 'খাতা ও কলম', 'হরফ চার্ট']
                    };
                } else if (isMath) {
                    activity = {
                        title: 'দিন ১: বেইসলাইন — পূর্বজ্ঞান ও গণনা স্তর যাচাই',
                        objective: 'শিক্ষার্থীরা সংখ্যা চিনতে ও মৌলিক গণনা করতে পারে কিনা যাচাই',
                        instructions: [
                            '১-৫টি সহজ গণনা কার্ড দেখিয়ে শিক্ষার্থীদের উত্তর বলতে বলুন।',
                            'কোনটিতে ভুল করলে চিহ্নিত করুন এবং সঠিক পদ্ধতি দেখান।',
                            'বাস্তব বস্তু (পাথর, দাগ) দিয়ে গণনার ধারণা আরেকবার বোঝান।',
                            'কুইক অনুশীলন শিট পূরণ করান।'
                        ],
                        studentTask: `${chapter || 'নির্ধারিত'} অধ্যায়ের গণনা শিট পূরণ করুন।`,
                        expectedResult: 'কমপক্ষে ৭৫% শিক্ষার্থী ৫টির মধ্যে ৪টি সঠিক উত্তর দেবে।',
                        materials: ['গণনা কার্ড', 'বাস্তব উপকরণ', 'অনুশীলন শিট']
                    };
                } else if (isEnglish) {
                    activity = {
                        title: 'দিন ১: বেইসলাইন — উচ্চারণ ও পড়ার স্তর যাচাই',
                        objective: 'শিক্ষার্থীদের ইংরেজি পড়ার সাবলীলতা ও উচ্চারণ দক্ষতা যাচাই',
                        instructions: [
                            'পাঠ্যবইয়ের নির্ধারিত অনুচ্ছেদ শিক্ষক একবার পড়ে শোনান।',
                            'প্রত্যেক শিক্ষার্থীকে ২-৩ লাইন করে জোরে পড়তে বলুন।',
                            'উচ্চারণ ত্রুটি নোট করুন; কঠিন শব্দগুলো বোর্ডে লিখুন।',
                            'কঠিন শব্দের সঠিক উচ্চারণ ৩ বার পুনরাবৃত্তি করান।'
                        ],
                        studentTask: 'পাঠ্যাংশের প্রথম অনুচ্ছেদ পড়ুন এবং অপরিচিত শব্দ আন্ডারলাইন করুন।',
                        expectedResult: '৮০% শিক্ষার্থী কমপক্ষে ১ প্যারা বিনা থামায় পড়তে পারবে।',
                        materials: ['পাঠ্যবই', 'পেন্সিল', 'শব্দ তালিকা কার্ড']
                    };
                } else if (isBangla) {
                    activity = {
                        title: 'দিন ১: বেইসলাইন — পড়া ও লেখার দক্ষতা যাচাই',
                        objective: 'বাংলা পাঠ্যাংশ সাবলীলভাবে পড়তে ও নির্ভুল লিখতে পারার বর্তমান অবস্থা নির্ণয়',
                        instructions: [
                            'শিক্ষার্থীদের পাঠ্যবই খুলে নির্ধারিত অংশ পড়তে বলুন।',
                            'ভুল উচ্চারণ বা থামা চিহ্নিত করুন।',
                            'বোর্ডে ৫টি শব্দ লিখুন এবং শিক্ষার্থীরা খাতায় লিখুক।',
                            'লেখার ভুল (মাত্রা, যুক্তবর্ণ) নোট করুন।'
                        ],
                        studentTask: 'পাঠ্যাংশ পড়ুন এবং ৫টি নির্ধারিত শব্দ খাতায় ৩ বার করে লিখুন।',
                        expectedResult: '৭৫% শিক্ষার্থী নির্ভুল মাত্রায় শব্দগুলো লিখতে পারবে।',
                        materials: ['পাঠ্যবই', 'খাতা', 'পেন্সিল']
                    };
                } else if (isScience) {
                    activity = {
                        title: 'দিন ১: বেইসলাইন — বিষয়জ্ঞান যাচাই ও পর্যবেক্ষণ',
                        objective: 'শিক্ষার্থীরা বিষয়টি সম্পর্কে পূর্বে কতটুকু জানে তা নির্ণয়',
                        instructions: [
                            '৩টি সহজ প্রশ্ন মৌখিকভাবে করুন এবং হাত তোলা দেখুন।',
                            'একটি ছোট বাস্তব উদাহরণ দেখান (পানি, বায়ু, উদ্ভিদ)।',
                            'শিক্ষার্থীরা যা দেখে তা ছোট বাক্যে লিখুক।',
                            'উত্তরগুলো মিলিয়ে দেখুন ও ভুল সংশোধন করুন।'
                        ],
                        studentTask: 'দেওয়া উদাহরণ দেখে ৩টি বাক্যে পর্যবেক্ষণ লিখুন।',
                        expectedResult: '৭০% শিক্ষার্থী বিষয়টির মূল ধারণা মৌখিকভাবে বলতে পারবে।',
                        materials: ['বাস্তব উপকরণ', 'খাতা', 'পর্যবেক্ষণ শিট']
                    };
                } else {
                    activity = {
                        title: `দিন ১: বেইসলাইন যাচাই — ${topic.bookInfo.subject || 'বিষয়'}`,
                        objective: 'শিক্ষার্থীদের বর্তমান দক্ষতার স্তর ও দুর্বলতা চিহ্নিত করা',
                        instructions: [
                            'শিক্ষার্থীদের প্রাথমিক ধারণা যাচাই করতে ৩-৪টি মৌখিক প্রশ্ন করুন।',
                            'দুর্বল শিক্ষার্থীদের চিহ্নিত করুন এবং নাম নোট করুন।',
                            'মূল বিষয়টি সংক্ষেপে উপস্থাপন করুন।',
                            'একটি ছোট অনুশীলন সম্পন্ন করান এবং ফলাফল পর্যবেক্ষণ করুন।'
                        ],
                        studentTask: `${chapter || topic.title}-এর সাথে পরিচিত হতে প্রারম্ভিক অনুশীলন সম্পন্ন করুন।`,
                        expectedResult: 'দিন শেষে শিক্ষার্থীদের শিখন স্তরের স্পষ্ট একটি চিত্র পাওয়া যাবে।',
                        materials: ['খাতা ও কলম', 'বোর্ড ও মার্কার', 'পাঠ্যবই']
                    };
                }
            } else {
                // ─ Day 2+: Adapt from previous day ────────────────────
                const dayLabel = `দিন ${selectedDayNum}`;
                const adaptation = hadDifficulty
                    ? 'পুনরায় অনুশীলন ও সংশোধনমূলক'
                    : selectedDayNum <= Math.ceil((topic.totalDays || 7) / 2)
                    ? 'দক্ষতা বিস্তার ও স্বতন্ত্র অনুশীলন'
                    : 'একত্রীকরণ ও মূল্যায়ন';

                let prevNote = '';
                if (hadDifficulty && prevProblems) {
                    prevNote = `(গতকাল সমস্যা: ${prevProblems.slice(0, 80)})`;
                } else if (prevPerf === 'Very well' || prevPerf === 'Good') {
                    prevNote = '(গতকালের অগ্রগতি ভালো — আজ একধাপ এগিয়ে যাওয়া যায়)';
                }

                if (isArabic) {
                    activity = {
                        title: `${dayLabel}: ${adaptation} — হরফ ও তিলাওয়াত ${prevNote}`,
                        objective: hadDifficulty
                            ? 'গতকালের ভুল হরফগুলো পুনরায় সঠিকভাবে অনুশীলন করা'
                            : 'নতুন হরফ বা পাঠে দক্ষতা বৃদ্ধি ও সাবলীল তিলাওয়াত',
                        instructions: [
                            hadDifficulty
                                ? 'গতকালের চিহ্নিত ভুল হরফগুলো আলাদাভাবে বোর্ডে লিখুন।'
                                : 'গতকালের পর্যালোচনা ৩ মিনিটে করুন, তারপর নতুন পাঠে প্রবেশ করুন।',
                            'ছোট দলে ভাগ করে পর্যায়ক্রমে পড়ান।',
                            'দুর্বল শিক্ষার্থীদের পাশে বসে আলাদা মনোযোগ দিন।',
                            'শেষে একে অপরকে পড়ে শোনানোর সুযোগ দিন (Peer Reading)।'
                        ],
                        studentTask: hadDifficulty
                            ? 'চিহ্নিত ভুল হরফগুলো ১০ বার করে লিখুন ও জোরে পড়ুন।'
                            : 'নির্ধারিত অনুচ্ছেদ তিনবার পড়ুন এবং নিজেই ভুল চিহ্নিত করুন।',
                        expectedResult: hadDifficulty
                            ? 'গতকালের সমস্যাগ্রস্ত শিক্ষার্থীদের ৬০% উন্নতি দেখাবে।'
                            : '৮০% শিক্ষার্থী নির্ধারিত অংশ সহিহ তিলাওয়াত করতে পারবে।',
                        materials: ['হরফ কার্ড', 'খাতা', 'পাঠ্য উপকরণ']
                    };
                } else if (isMath) {
                    activity = {
                        title: `${dayLabel}: ${adaptation} — গণিত ${prevNote}`,
                        objective: hadDifficulty
                            ? 'গতকালের কঠিন লাগা ধারণাটি ভিন্ন উপায়ে পুনরায় অনুশীলন'
                            : 'গণনার দক্ষতা সম্প্রসারণ ও নতুন সমস্যা সমাধান',
                        instructions: [
                            hadDifficulty ? 'গতকালের সমস্যার জায়গাটি বাস্তব বস্তু দিয়ে আবার বোঝান।' : 'দ্রুত পুনরাবৃত্তি দিয়ে শুরু করুন (২ মিনিট)।',
                            'জুটিতে সমস্যা সমাধান করতে দিন (Pair Work)।',
                            'শিক্ষক প্রতিটি জুটি পর্যবেক্ষণ করুন।',
                            'শেষে কয়েকজন বোর্ডে সমাধান দেখাক।'
                        ],
                        studentTask: 'নির্ধারিত অনুশীলন সমস্যাগুলো খাতায় সমাধান করুন।',
                        expectedResult: '৭৫% শিক্ষার্থী নিজে নিজে সমাধান করতে পারবে।',
                        materials: ['অনুশীলন শিট', 'বাস্তব উপকরণ', 'খাতা']
                    };
                } else if (isEnglish) {
                    activity = {
                        title: `${dayLabel}: ${adaptation} — ইংরেজি ${prevNote}`,
                        objective: hadDifficulty
                            ? 'গতকালের কঠিন শব্দ ও উচ্চারণ পুনরায় অনুশীলন'
                            : 'পাঠ্যাংশে নতুন শব্দ দিয়ে বাক্য তৈরি ও সাবলীল পাঠ',
                        instructions: [
                            hadDifficulty ? 'গতকালের কঠিন শব্দগুলো বোর্ডে লিখুন ও ৩ বার বলান।' : 'গতকালের শব্দ ব্যবহার করে নতুন বাক্য তৈরি করুন।',
                            'পাঠ্যাংশের পরের অনুচ্ছেদে প্রবেশ করুন।',
                            'জোরে পড়া (Choral Reading) করুন।',
                            'নতুন শব্দ খাতায় লিখে অর্থ মনে রাখতে সাহায্য করুন।'
                        ],
                        studentTask: 'পাঠ্যাংশ পড়ুন ও ৫টি নতুন শব্দ দিয়ে বাক্য তৈরি করুন।',
                        expectedResult: '৮০% শিক্ষার্থী সঠিক উচ্চারণে পড়তে পারবে।',
                        materials: ['পাঠ্যবই', 'খাতা', 'শব্দ কার্ড']
                    };
                } else {
                    activity = {
                        title: `${dayLabel}: ${adaptation} ${prevNote}`,
                        objective: hadDifficulty
                            ? `গতকালের সমস্যাগুলো (${prevProblems.slice(0, 50) || 'চিহ্নিত দুর্বলতা'}) সমাধান করা`
                            : `${topic.bookInfo.subject} বিষয়ে অনুশীলন ও দক্ষতা বিস্তার`,
                        instructions: [
                            hadDifficulty
                                ? 'গতকালের সমস্যার জায়গা ভিন্ন উপায়ে উপস্থাপন করুন।'
                                : 'আগের দিনের শিখন সংক্ষেপে পুনরাবৃত্তি করুন (৩ মিনিট)।',
                            'মূল অনুশীলন কাজ পরিচালনা করুন।',
                            'দুর্বল শিক্ষার্থীদের বিশেষ মনোযোগ দিন।',
                            'ফলাফল পর্যবেক্ষণ করে নোট নিন।'
                        ],
                        studentTask: `${topic.title} সংক্রান্ত নির্ধারিত কাজ সম্পন্ন করুন।`,
                        expectedResult: 'গতকালের তুলনায় পরিমাপযোগ্য উন্নতি পরিলক্ষিত হবে।',
                        materials: ['খাতা ও কলম', 'অনুশীলন শিট', 'পাঠ্যবই']
                    };
                }

                // If last day → shift to final evaluation
                if (selectedDayNum === topic.totalDays) {
                    activity.title = `দিন ${selectedDayNum}: চূড়ান্ত মূল্যায়ন ও প্রমাণ সংগ্রহ`;
                    activity.objective = 'গবেষণার ফলাফল পরিমাপ এবং বিফোর/আফটার তুলনামূলক প্রমাণ সংগ্রহ করা';
                    activity.instructions = [
                        'শুরু থেকে যা শিখেছে তার উপর একটি ছোট মূল্যায়ন পরিচালনা করুন।',
                        'বিফোর (দিন ১) ও আফটার (আজ) নমুনা একসাথে রাখুন।',
                        'শিক্ষার্থীরা নিজেরা কতটুকু উন্নতি অনুভব করেছে তা বলুক।',
                        'চূড়ান্ত সংখ্যাগত ফলাফল নোট করুন।'
                    ];
                    activity.studentTask = 'চূড়ান্ত মূল্যায়ন পত্র পূরণ করুন এবং নিজের উন্নতির কথা লিখুন।';
                    activity.expectedResult = 'দিন ১ এর তুলনায় কমপক্ষে ৩০% উন্নতির প্রমাণ পাওয়া যাবে।';
                }
            }

            setEditPlanTitle(activity.title);
            setEditPlanObjective(activity.objective);
            setEditPlanStudentTask(activity.studentTask);
            setEditPlanExpectedResult(activity.expectedResult);
            setEditPlanMaterials(activity.materials.join('\n'));

            // Build planItems: mix source content + generated instructions
            const subjectKey = (topic.bookInfo.subject || '').toLowerCase();
            let generatedItems: PlanItem[] = [];

            const currentTargetText = selectedTexts[selectedDayNum] !== undefined ? selectedTexts[selectedDayNum] : sourceContent;

            if (currentTargetText.trim().length > 10) {
                // Parse partial source content into tasks & activities
                generatedItems = parseSourceToItems(currentTargetText, subjectKey);
            }

            // Merge with instruction-based items
            const instructionItems: PlanItem[] = activity.instructions.map((ins: string, idx: number) => ({
                id: `gi-${idx}`,
                type: (idx % 2 === 0 ? 'task' : 'activity') as PlanItemType,
                text: ins
            }));

            // Deduplicate: source items first, then instruction items not already represented
            const combined = [...instructionItems, ...generatedItems.slice(0, 4)];
            setPlanItems(combined);
            setIsGeneratingPlan(false);
        }, 600);
    };

    // Save edited plan for selected day
    const handleSavePlan = () => {
        if (!topic) return;
        const updatedDays = topic.days.map(d => {
            if (d.dayNumber === selectedDayNum) {
                return {
                    ...d,
                    title: editPlanTitle.trim() || d.title,
                    objective: editPlanObjective.trim() || d.objective,
                    teacherInstructions: serializePlanItems(planItems),
                    studentTask: editPlanStudentTask.trim() || d.studentTask,
                    expectedResult: editPlanExpectedResult.trim() || d.expectedResult,
                    materials: editPlanMaterials.split('\n').map(s => s.trim()).filter(Boolean)
                };
            }
            return d;
        });
        onUpdateTopic({ ...topic, days: updatedDays });
        setPlanSaved(true);
        setTimeout(() => setPlanSaved(false), 2500);
    };

    // Add a new task or activity manually
    const handleAddPlanItem = () => {
        if (!newItemText.trim()) return;
        setPlanItems(prev => [
            ...prev,
            { id: `manual-${Date.now()}`, type: newItemType, text: newItemText.trim() }
        ]);
        setNewItemText('');
    };

    // Remove a plan item
    const handleRemovePlanItem = (id: string) => {
        setPlanItems(prev => prev.filter(it => it.id !== id));
    };

    // Toggle item type between task <-> activity
    const handleTogglePlanItemType = (id: string) => {
        setPlanItems(prev => prev.map(it =>
            it.id === id ? { ...it, type: it.type === 'task' ? 'activity' : 'task' } : it
        ));
    };

    if (!isOpen || !topic) return null;

    const currentDay = topic.days.find(d => d.dayNumber === selectedDayNum) || topic.days[0];
    const sourceContent: string = (topic.sources && topic.sources.length > 0 ? topic.sources[0].content : '') ?? '';

    const handleTextSelection = () => {
        const text = window.getSelection()?.toString().trim();
        if (text && text.length > 0) {
            setHighlightedText(text);
        } else {
            setHighlightedText('');
        }
    };

    // Smooth auto-centering for tabs without vertical page jump
    const handleTabClick = (tabKey: typeof activeTab, e: React.MouseEvent<HTMLButtonElement>) => {
        setActiveTab(tabKey);
        const target = e.currentTarget;
        const container = target.parentElement;
        if (container) {
            setTimeout(() => {
                const scrollLeft = target.offsetLeft - container.offsetWidth / 2 + target.offsetWidth / 2;
                const maxScroll = container.scrollWidth - container.offsetWidth;
                container.scrollTo({ left: Math.max(0, Math.min(scrollLeft, maxScroll)), behavior: 'smooth' });
            }, 50);
        }
    };

    const handleDayClick = (dayNum: number) => {
        setSelectedDayNum(dayNum);
        const dayData = topic.days.find(d => d.dayNumber === dayNum);
        if (dayData) {
            setCurrentRating(dayData.performance || 'Good');
            setSelectedProblems(dayData.observedProblems || []);
            setTeacherObservation(dayData.teacherObservation || '');
            // Load plan fields for this day
            setEditPlanTitle(dayData.title || '');
            setEditPlanObjective(dayData.objective || '');
            setEditPlanStudentTask(dayData.studentTask || '');
            setEditPlanExpectedResult(dayData.expectedResult || '');
            setEditPlanMaterials((dayData.materials || []).join('\n'));
            setPlanItems(deserializePlanItems(dayData.teacherInstructions || []));
        }
        setIsDayGridOpen(false);
    };

    // Save Daily Feedback
    const handleSaveDayFeedback = () => {
        const updatedDays = topic.days.map(d => {
            if (d.dayNumber === selectedDayNum) {
                return {
                    ...d,
                    status: 'completed' as const,
                    performance: currentRating,
                    observedProblems: selectedProblems,
                    teacherObservation: teacherObservation.trim(),
                    actualMinutesSpent: elapsedSeconds > 0 ? Math.ceil(elapsedSeconds / 60) : d.estimatedMinutes,
                    completedAt: new Date().toISOString().split('T')[0]
                };
            }
            return d;
        });

        const completedDays = updatedDays.filter(d => d.status === 'completed').length;
        const newProgress = Math.min(100, Math.round((completedDays / topic.totalDays) * 100));

        const updatedTopic: ResearchTopic = {
            ...topic,
            progress: newProgress,
            currentDayNumber: Math.min(topic.totalDays, selectedDayNum + 1),
            days: updatedDays,
            updatedAt: new Date().toISOString().split('T')[0]
        };

        setIsTimerRunning(false);
        onUpdateTopic(updatedTopic);
        alert('দৈনিক ক্লাসরুম পর্যবেক্ষণ সফলভাবে সংরক্ষণ করা হয়েছে!');
    };

    // Add Mistake
    const handleAddMistake = (e: React.FormEvent) => {
        e.preventDefault();
        if (!mistakeDesc.trim()) return;

        const newMistake: MistakeItem = {
            id: `mst-${Date.now()}`,
            humanId: `MST-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
            description: mistakeDesc.trim(),
            studentCount: parseInt(mistakeCount) || 1,
            causeHypothesis: mistakeCause.trim() || 'প্রাথমিক অনুশীলনের অভাব',
            recordedAt: new Date().toISOString().split('T')[0]
        };

        const updatedDays = topic.days.map(d => {
            if (d.dayNumber === selectedDayNum) {
                return {
                    ...d,
                    mistakes: [...(d.mistakes || []), newMistake]
                };
            }
            return d;
        });

        onUpdateTopic({ ...topic, days: updatedDays });
        setMistakeDesc('');
        setMistakeCause('');
    };

    // Add Problem-Solution Pair
    const handleAddProblemSolution = (e: React.FormEvent) => {
        e.preventDefault();
        if (!problemTitle.trim() || !teacherSolution.trim()) return;

        const newSol: ProblemSolutionItem = {
            id: `prb-${Date.now()}`,
            humanId: `PRB-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
            problemTitle: problemTitle.trim(),
            observedInCount: parseInt(problemCount) || 1,
            possibleCause: 'নিয়ম বোঝার অসঙ্গতি',
            teacherSolution: teacherSolution.trim(),
            isEffective: solutionWorkStatus,
            resultAfterCorrection: resultAfterCorrection.trim() || 'উন্নয়ন সন্তোষজনক',
            recordedAt: new Date().toISOString().split('T')[0]
        };

        const updatedDays = topic.days.map(d => {
            if (d.dayNumber === selectedDayNum) {
                return {
                    ...d,
                    solutions: [...(d.solutions || []), newSol]
                };
            }
            return d;
        });

        onUpdateTopic({ ...topic, days: updatedDays });
        setProblemTitle('');
        setTeacherSolution('');
        setResultAfterCorrection('');
    };

    // Save Before/After Evidence
    const handleAddEvidence = () => {
        const newEvidence: BeforeAfterEvidence = {
            id: `evd-${Date.now()}`,
            humanId: `EVD-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
            title: evidenceTitle,
            studentName,
            beforeImageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80',
            beforeDate: topic.createdAt,
            beforeDayNumber: 1,
            afterImageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80',
            afterDate: new Date().toISOString().split('T')[0],
            afterDayNumber: selectedDayNum,
            metricsBefore: {
                letterFormation: 2,
                alignment: 2,
                spacing: 2,
                sizeConsistency: 2,
                writingControl: 2
            },
            metricsAfter: {
                letterFormation: letterFormationScore,
                alignment: alignmentScore,
                spacing: spacingScore,
                sizeConsistency: 4,
                writingControl: controlScore
            },
            aiImageAnalysis: 'অক্ষরের সঠিক গঠন ও মাত্রার নিয়ন্ত্রণে স্পষ্ট উন্নতি পরিলক্ষিত হয়েছে।'
        };

        onUpdateTopic({
            ...topic,
            evidenceList: [...(topic.evidenceList || []), newEvidence]
        });
        alert('বিফোর/আফটার এভিডেন্স সফলভাবে যুক্ত হয়েছে!');
    };

    // AI Analyze Observation
    const handleAnalyzeObservation = () => {
        setIsAnalyzingAi(true);
        setTimeout(() => {
            setIsAnalyzingAi(false);
            setAiFeedback(
                `এআই বিশ্লেষণ: আপনি যে ভুলগুলো লক্ষ্য করেছেন (পেনসিল গ্রিপ এবং মাত্রা অসঙ্গতি), তা প্রথম ৩ দিনে স্বাভাবিক। পরবর্তী সেশনে ৫ মিনিটের জন্য শিক্ষার্থীদের 'হাত শিথিলকরণ অনুশীলন' (Finger relaxation drill) করানোর পরামর্শ দেওয়া হচ্ছে।`
            );
        }, 800);
    };

    if (!isOpen || !mounted || !topic) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal Window - Clean Round Card */}
            <div 
                className="bg-white w-full max-w-5xl rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 flex flex-col h-[100dvh] sm:h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#045c84] via-[#034664] to-[#022c40] text-white p-5 sm:p-6 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Mobile Back Button */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="sm:hidden w-8 h-8 -ml-1 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition-colors"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <h2 className="text-lg sm:text-xl font-black text-white truncate">
                                {topic.title}
                            </h2>
                            {isSuperAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setIsStatusModalOpen(true)}
                                    className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black hover:bg-amber-300 transition-colors flex items-center gap-1 text-[10px]"
                                    title="স্ট্যাটাস পরিবর্তন করুন"
                                >
                                    <span>{topic.status}</span>
                                    <span className="text-[9px]">▼</span>
                                </button>
                            )}
                        </div>

                        {/* Top Close Button */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Secondary Header Row: Day Selection & Progress Bar */}
                    <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                        {/* Day Selection (Single Button -> Grid Modal) */}
                        {(activeTab === 'plan' || activeTab === 'implement' || activeTab === 'observation' || activeTab === 'problems') ? (
                            <div className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsDayGridOpen(!isDayGridOpen)}
                                    className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold flex items-center gap-2 transition-all active:scale-95 text-xs"
                                >
                                    <Calendar size={14} className="text-cyan-300" />
                                    <span>দিন {selectedDayNum} নির্বাচন করুন</span>
                                    <span className={`text-[9px] transition-transform ${isDayGridOpen ? 'rotate-180' : ''}`}>▼</span>
                                </button>

                                {/* Popup Grid Modal */}
                                {isDayGridOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setIsDayGridOpen(false)}
                                        />
                                        <div className="absolute top-12 left-0 z-50 bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-2xl w-72 sm:w-80 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="text-xs text-slate-400 font-bold mb-3 pb-2 border-b border-slate-700">ক্যালেন্ডার ভিউ থেকে দিন বেছে নিন</div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {topic.days.map((d) => (
                                                    <button
                                                        key={d.dayNumber}
                                                        type="button"
                                                        onClick={() => handleDayClick(d.dayNumber)}
                                                        className={`relative flex flex-col items-center justify-center h-14 rounded-xl transition-all ${
                                                            selectedDayNum === d.dayNumber
                                                                ? 'bg-cyan-500 text-white shadow-lg scale-105 font-black'
                                                                : d.status === 'completed'
                                                                ? 'bg-slate-700 text-emerald-400 hover:bg-slate-600 font-semibold border border-emerald-500/30'
                                                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600 border border-slate-600/50 font-semibold'
                                                        }`}
                                                    >
                                                        <span className="text-[14px] leading-none">{d.dayNumber}</span>
                                                        {d.status === 'completed' && (
                                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-slate-800">
                                                                <Check size={10} className="text-white" strokeWidth={4} />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="w-10" />
                        )}

                        {/* Progress Bar */}
                        <div className="flex items-center justify-end gap-3 w-full max-w-sm text-xs">
                            <span className="font-bold text-cyan-200 shrink-0">অগ্রগতি: {topic.progress}%</span>
                            <div className="flex-1 bg-white/20 h-2 rounded-full overflow-hidden max-w-[200px]">
                                <div
                                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${topic.progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub Header: Navigation Tabs (Auto-Centering Smooth Scrolling) */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 relative flex items-center gap-3 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <button
                        type="button"
                        onClick={(e) => handleTabClick('plan', e)}
                        className={`px-5 py-2 rounded-full text-sm shrink-0 font-bold transition-all whitespace-nowrap ${
                            activeTab === 'plan'
                                ? 'bg-[#045c84] text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                    >
                        দৈনিক কর্মপরিকল্পনা ({topic.totalDays} দিন)
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleTabClick('implement', e)}
                        className={`px-5 py-2 rounded-full text-sm shrink-0 font-bold transition-all whitespace-nowrap ${
                            activeTab === 'implement'
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><Play size={12} className="fill-current" /> ক্লাস বাস্তবায়ন (Implement)</span>
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleTabClick('observation', e)}
                        className={`px-5 py-2 rounded-full text-sm shrink-0 font-bold transition-all whitespace-nowrap ${
                            activeTab === 'observation'
                                ? 'bg-[#045c84] text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                    >
                        শ্রেণিকক্ষ পর্যবেক্ষণ ও ফিডব্যাক
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleTabClick('problems', e)}
                        className={`px-5 py-2 rounded-full text-sm shrink-0 font-bold transition-all whitespace-nowrap ${
                            activeTab === 'problems'
                                ? 'bg-[#045c84] text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                    >
                        ভুল ও সমাধান ({topic.days.reduce((acc, d) => acc + (d.mistakes?.length || 0), 0)})
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleTabClick('evidence', e)}
                        className={`px-5 py-2 rounded-full text-sm shrink-0 font-bold transition-all whitespace-nowrap ${
                            activeTab === 'evidence'
                                ? 'bg-[#045c84] text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                    >
                        বিফোর/আফটার প্রমাণ ({topic.evidenceList?.length || 0})
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleTabClick('report', e)}
                        className={`px-5 py-2 rounded-full text-sm shrink-0 font-bold transition-all whitespace-nowrap ${
                            activeTab === 'report'
                                ? 'bg-[#045c84] text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                    >
                        চূড়ান্ত রিপোর্ট ও সিন্থেসিস
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-5 custom-scrollbar scroll-smooth overscroll-contain" data-lenis-prevent="true">

                    {/* TAB 1: PLAN — Editable with Auto-Generate */}
                    {activeTab === 'plan' && currentDay && (
                        <div className="space-y-4">

                            {/* Text Selection Card */}
                            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 mb-5 relative">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                        আজকের পাঠ্য বিষয়
                                    </label>
                                    {selectedTexts[selectedDayNum] && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newSelected = { ...selectedTexts };
                                                delete newSelected[selectedDayNum];
                                                setSelectedTexts(newSelected);
                                            }}
                                            className="text-xs text-[#045c84] font-bold hover:underline flex items-center gap-1"
                                        >
                                            <Edit3 size={12} /> পরিবর্তন করুন
                                        </button>
                                    )}
                                </div>

                                {!selectedTexts[selectedDayNum] ? (
                                    <div className="space-y-3 relative">
                                        <p className="text-xs text-slate-500 mb-2">
                                            নিচের টেক্সট থেকে যতটুকু পড়াবেন তা মাউস দিয়ে হাইলাইট করুন:
                                        </p>
                                        <div 
                                            className="w-full max-h-64 overflow-y-auto px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 custom-scrollbar leading-relaxed cursor-text select-text"
                                            onMouseUp={handleTextSelection}
                                            onKeyUp={handleTextSelection}
                                        >
                                            {sourceContent}
                                        </div>
                                        
                                        {highlightedText && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white p-4 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.2)] flex flex-col items-center gap-3 animate-in zoom-in-95 z-10 border border-slate-700">
                                                <span className="text-xs font-bold text-slate-300">অংশটি নির্বাচন করা হয়েছে</span>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        const textToAnalyze = highlightedText;
                                                        setSelectedTexts({...selectedTexts, [selectedDayNum]: textToAnalyze});
                                                        setHighlightedText('');
                                                        
                                                        // Trigger real AI JSON Analysis
                                                        setIsAnalyzingStyle(true);
                                                        try {
                                                            const res = await fetch('/api/research/format-content', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    content: textToAnalyze,
                                                                    subject: topic.bookInfo?.subject || topic.title
                                                                })
                                                            });
                                                            const data = await res.json();
                                                            
                                                            if (data.success && data.data) {
                                                                setAnalyzedContent(prev => ({
                                                                    ...prev, 
                                                                    [selectedDayNum]: data.data
                                                                }));
                                                            } else {
                                                                // Fallback to raw text if AI fails
                                                                setAnalyzedContent(prev => ({
                                                                    ...prev, 
                                                                    [selectedDayNum]: {
                                                                        type: 'story',
                                                                        items: textToAnalyze.split('\n').filter(l => l.trim()),
                                                                        designNotes: "Fallback formatting"
                                                                    }
                                                                }));
                                                            }
                                                        } catch (err) {
                                                            console.error("AI Analysis failed:", err);
                                                        } finally {
                                                            setIsAnalyzingStyle(false);
                                                        }
                                                    }}
                                                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black shadow-sm transition-transform active:scale-95"
                                                >
                                                    আজকের প্ল্যান তৈরি করুন
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-4 relative z-10 w-full">
                                        {(() => {
                                                const text = selectedTexts[selectedDayNum];
                                                const subject = (topic.bookInfo?.subject || topic.title || '').toLowerCase();
                                                const rawLines = text.split('\n').map(l => l.trim());
                                                const nonEmptyLines = rawLines.filter(l => l.length > 0);
                                                
                                                // Heuristics
                                                const isPoem = nonEmptyLines.length > 2 && nonEmptyLines.every(l => l.length < 60) && (subject.includes('english') || subject.includes('বাংলা') || subject.includes('rhyme') || subject.includes('poem'));
                                                const isWordMeaning = nonEmptyLines.some(l => l.includes(':') || l.includes(' - ') || l.includes('=')) && nonEmptyLines.length < 20;

                                                if (isPoem) {
                                                    let lineIndex = 0;
                                                    return (
                                                        <div className="font-serif text-center max-w-lg mx-auto py-4">
                                                            {rawLines.map((line, i) => {
                                                                if (!line) return <div key={i} className="h-8" />; // Stanza break
                                                                
                                                                // Increment only for actual text lines to keep alternate coloring consistent per stanza
                                                                const isEven = (lineIndex++) % 2 === 0; 
                                                                return (
                                                                    <p 
                                                                        key={i} 
                                                                        className={`text-2xl sm:text-[1.7rem] leading-loose italic tracking-wide font-bold transition-colors ${
                                                                            isEven ? 'text-[#045c84]' : 'text-[#248277]'
                                                                        }`}
                                                                        style={{ wordSpacing: '0.25em' }}
                                                                    >
                                                                        {line}
                                                                    </p>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                }
                                                if (isWordMeaning) {
                                                    return (
                                                        <div className="font-sans space-y-3 max-w-xl mx-auto">
                                                            {nonEmptyLines.map((line, i) => {
                                                                const parts = line.split(/[:=-]/);
                                                                if (parts.length > 1) {
                                                                    return (
                                                                        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 bg-white/60 rounded-xl border border-[#e8e4d9]/50 shadow-sm">
                                                                            <span className="text-lg sm:text-xl font-black text-[#045c84]">{parts[0].trim()}</span>
                                                                            <span className="hidden sm:inline text-slate-300">—</span>
                                                                            <span className="text-lg sm:text-xl font-medium text-slate-700">{parts.slice(1).join('-').trim()}</span>
                                                                        </div>
                                                                    );
                                                                }
                                                                return <p key={i} className="text-lg font-bold text-center text-[#2c3e50]">{line}</p>;
                                                            })}
                                                        </div>
                                                    );
                                                }

                                                // Default Story/Text Book Style
                                                return (
                                                    <div className="font-serif text-left sm:text-justify max-w-3xl mx-auto text-[#2c3e50]">
                                                        {nonEmptyLines.map((line, i) => (
                                                            <p key={i} className="text-xl sm:text-2xl leading-[1.8] indent-8 mb-4 font-medium tracking-wide" style={{ wordSpacing: '0.15em' }}>
                                                                {line}
                                                            </p>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                    </div>
                                )}
                            </div>

                            {/* Editable Plan Form */}
                            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 space-y-4">

                                {/* Title & Objective */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">দিনের শিরোনাম</label>
                                        <input
                                            type="text"
                                            value={editPlanTitle}
                                            onChange={e => setEditPlanTitle(e.target.value)}
                                            placeholder="যেমন: দিন ১ — বেইসলাইন যাচাই"
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">দিনের লক্ষ্য / উদ্দেশ্য</label>
                                        <input
                                            type="text"
                                            value={editPlanObjective}
                                            onChange={e => setEditPlanObjective(e.target.value)}
                                            placeholder="আজ কী অর্জন করতে চাই?"
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                {/* ── Tasks & Activities Section ───────────────────── */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            কাজ ও কার্যক্রম
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleAutoGeneratePlan}
                                            disabled={isGeneratingPlan}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-[#045c84] text-white hover:bg-[#034664] disabled:opacity-60 transition-all shadow-sm"
                                        >
                                            <Sparkles size={12} className={isGeneratingPlan ? 'animate-spin' : ''} />
                                            <span>{isGeneratingPlan ? 'তৈরি হচ্ছে...' : 'অটো জেনারেট (AI)'}</span>
                                        </button>
                                    </div>

                                    {/* Item List */}
                                    <div className="space-y-2 mb-3">
                                        {planItems.length === 0 && (
                                            <div className="text-center py-6 text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-200">
                                                কোনো আইটেম নেই — নিচে যোগ করুন অথবা ✨ অটো পরিকল্পনা ব্যবহার করুন
                                            </div>
                                        )}
                                        {planItems.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all group ${
                                                    item.type === 'task'
                                                        ? 'bg-indigo-50/60 border-indigo-100 hover:border-indigo-200'
                                                        : 'bg-amber-50/60 border-amber-100 hover:border-amber-200'
                                                }`}
                                            >
                                                {/* Step number — inside the icon button */}
                                                <button
                                                    type="button"
                                                    title="ক্লিক করে ধরন পরিবর্তন করুন"
                                                    onClick={() => handleTogglePlanItemType(item.id)}
                                                    className={`relative w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95 ${
                                                        item.type === 'task'
                                                            ? 'bg-indigo-100 text-indigo-500'
                                                            : 'bg-amber-100 text-amber-500'
                                                    }`}
                                                >
                                                    {item.type === 'task'
                                                        ? <ClipboardList size={13} />
                                                        : <Zap size={13} />
                                                    }
                                                    <span className={`absolute -top-1 -right-1 text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                                                        item.type === 'task'
                                                            ? 'bg-indigo-200 text-indigo-600'
                                                            : 'bg-amber-200 text-amber-600'
                                                    }`}>{idx + 1}</span>
                                                </button>

                                                {/* Editable text */}
                                                <input
                                                    type="text"
                                                    value={item.text}
                                                    onChange={e => setPlanItems(prev => prev.map(it => it.id === item.id ? { ...it, text: e.target.value } : it))}
                                                    className="flex-1 bg-transparent text-xs font-medium text-slate-800 focus:outline-none placeholder:text-slate-300 min-w-0"
                                                />

                                                {/* Delete */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePlanItem(item.id)}
                                                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center shrink-0 transition-all"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add New Item Row */}
                                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2">
                                        {/* Type toggle — single button, click to switch */}
                                        <button
                                            type="button"
                                            title="ক্লিক করে ধরন পরিবর্তন করুন"
                                            onClick={() => setNewItemType(prev => prev === 'task' ? 'activity' : 'task')}
                                            className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95 ${
                                                newItemType === 'task'
                                                    ? 'bg-indigo-100 text-indigo-500'
                                                    : 'bg-amber-100 text-amber-500'
                                            }`}
                                        >
                                            {newItemType === 'task' ? <ClipboardList size={14} /> : <Zap size={14} />}
                                        </button>
                                        <input
                                            type="text"
                                            value={newItemText}
                                            onChange={e => setNewItemText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlanItem(); } }}
                                            placeholder={newItemType === 'task' ? 'নতুন কাজ লিখুন...' : 'নতুন কার্যক্রম লিখুন...'}
                                            className="flex-1 text-xs font-medium text-slate-800 focus:outline-none placeholder:text-slate-300 bg-transparent min-w-0"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddPlanItem}
                                            className="w-7 h-7 rounded-full bg-[#045c84] text-white flex items-center justify-center shrink-0 hover:bg-[#034664] active:scale-90 transition-all"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Student Task & Expected Result */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">শিক্ষার্থীর কাজ</label>
                                        <textarea
                                            rows={3}
                                            value={editPlanStudentTask}
                                            onChange={e => setEditPlanStudentTask(e.target.value)}
                                            placeholder="শিক্ষার্থীরা আজ কী করবে?"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] placeholder:text-slate-300 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">প্রত্যাশিত ফলাফল</label>
                                        <textarea
                                            rows={3}
                                            value={editPlanExpectedResult}
                                            onChange={e => setEditPlanExpectedResult(e.target.value)}
                                            placeholder="সফল হলে কী দেখতে পাবো?"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] placeholder:text-slate-300 resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Materials — card list */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                            <Package size={11} /> উপকরণ
                                            <span className="text-slate-400 font-normal normal-case ml-1">({editPlanMaterials.split('\n').filter(Boolean).length} টি)</span>
                                        </label>
                                        {/* Auto-generate button */}
                                        <button
                                            type="button"
                                            title="পরিকল্পনা অনুযায়ী উপকরণ তৈরি করুন"
                                            onClick={() => {
                                                if (!topic) return;

                                                // ── 1. Read today's source content ──────────────────
                                                const sourceText: string = (
                                                    topic.sources && topic.sources.length > 0
                                                        ? (topic.sources[0].content ?? '')
                                                        : ''
                                                ).toLowerCase();

                                                // ── 2. Read today's plan context ────────────────────
                                                const allItemText = planItems.map(i => i.text).join(' ').toLowerCase();
                                                const taskItems   = planItems.filter(i => i.type === 'task');
                                                const actItems    = planItems.filter(i => i.type === 'activity');
                                                const subject     = (topic.bookInfo.subject || '').toLowerCase();
                                                const chapter     = (topic.bookInfo.chapter || '').toLowerCase();
                                                const objective   = (editPlanObjective || '').toLowerCase();
                                                const combined    = `${sourceText} ${allItemText} ${subject} ${chapter} ${objective}`;

                                                // ── 3. Analyse & suggest relevant materials ─────────
                                                const suggested: string[] = [];

                                                // Always-needed writing basics
                                                if (taskItems.length > 0 || combined.includes('লেখ') || combined.includes('অনুশীলন')) {
                                                    suggested.push('খাতা', 'পেন্সিল বা কলম');
                                                }
                                                // Reading / book tasks
                                                if (combined.includes('পাঠ') || combined.includes('বই') || combined.includes('পড়')) {
                                                    suggested.push('পাঠ্যবই');
                                                }
                                                // Board / group presentation
                                                if (actItems.length > 0 || combined.includes('বোর্ড') || combined.includes('উপস্থাপন') || combined.includes('দল')) {
                                                    suggested.push('বোর্ড ও মার্কার');
                                                }
                                                // Cards / visual aids
                                                if (combined.includes('কার্ড') || combined.includes('ছবি') || combined.includes('ফ্ল্যাশ')) {
                                                    suggested.push('ফ্ল্যাশ কার্ড');
                                                }
                                                // Worksheets
                                                if (combined.includes('শিট') || combined.includes('ওয়ার্কশিট') || combined.includes('প্রশ্ন')) {
                                                    suggested.push('অনুশীলন শিট');
                                                }
                                                // Math / Science
                                                if (subject.includes('গণিত') || subject.includes('math') || combined.includes('সংখ্যা') || combined.includes('যোগ') || combined.includes('বিয়োগ')) {
                                                    suggested.push('জ্যামিতি বক্স', 'গ্রাফ পেপার');
                                                }
                                                if (subject.includes('বিজ্ঞান') || subject.includes('science') || combined.includes('পরীক্ষা') || combined.includes('পর্যবেক্ষণ')) {
                                                    suggested.push('নমুনা বা মডেল', 'চার্ট পেপার');
                                                }
                                                // Art / creative
                                                if (subject.includes('শিল্প') || combined.includes('আঁক') || combined.includes('রং') || combined.includes('চিত্র')) {
                                                    suggested.push('রঙিন পেন্সিল', 'আর্ট পেপার');
                                                }
                                                // Many items → group materials
                                                if (planItems.length > 4) {
                                                    suggested.push('গ্রুপ নামের কার্ড');
                                                }
                                                // Timer / stopwatch if time-based
                                                if (combined.includes('মিনিট') || combined.includes('সময়')) {
                                                    suggested.push('টাইমার');
                                                }

                                                // ── 4. Merge — skip anything overlapping existing ───
                                                const existing = editPlanMaterials.split('\n').map(s => s.trim()).filter(Boolean);
                                                const isOverlap = (a: string, b: string) => {
                                                    const al = a.toLowerCase(), bl = b.toLowerCase();
                                                    return al === bl || al.includes(bl) || bl.includes(al);
                                                };
                                                const newOnly = suggested.filter(s =>
                                                    !existing.some(e => isOverlap(e, s))
                                                );
                                                const merged = [...existing, ...newOnly];
                                                setEditPlanMaterials(merged.join('\n'));
                                            }}
                                            className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                                                isGeneratingMaterials
                                                    ? 'text-slate-400 bg-slate-100 cursor-not-allowed'
                                                    : 'text-[#045c84] bg-[#045c84]/8 hover:bg-[#045c84]/15'
                                            }`}
                                            disabled={isGeneratingMaterials}
                                        >
                                            <Sparkles size={10} /> অটো তৈরি
                                        </button>
                                    </div>

                                    {/* Material cards */}
                                    <div className="space-y-1.5 mb-2 min-h-[40px]">
                                        {editPlanMaterials.split('\n').map((m, i) => m.trim()).filter(Boolean).map((mat, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 group">
                                                <Package size={11} className="text-slate-400 shrink-0" />
                                                <span className="flex-1 text-xs text-slate-700 font-medium">{mat}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const lines = editPlanMaterials.split('\n').filter(Boolean);
                                                        lines.splice(i, 1);
                                                        setEditPlanMaterials(lines.join('\n'));
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center shrink-0 transition-all"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {editPlanMaterials.split('\n').filter(Boolean).length === 0 && (
                                            <div className="text-center py-4 text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                                                কোনো উপকরণ নেই — নিচে যোগ করুন অথবা অটো তৈরি করুন
                                            </div>
                                        )}
                                    </div>

                                    {/* Add material row */}
                                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                                        <Package size={12} className="text-slate-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={newMaterialText}
                                            onChange={e => setNewMaterialText(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = newMaterialText.trim();
                                                    if (!val) return;
                                                    setEditPlanMaterials(prev => (prev.trim() ? prev.trim() + '\n' + val : val));
                                                    setNewMaterialText('');
                                                }
                                            }}
                                            placeholder="নতুন উপকরণ লিখুন..."
                                            className="flex-1 text-xs font-medium text-slate-800 focus:outline-none placeholder:text-slate-300 bg-transparent min-w-0"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const val = newMaterialText.trim();
                                                if (!val) return;
                                                setEditPlanMaterials(prev => (prev.trim() ? prev.trim() + '\n' + val : val));
                                                setNewMaterialText('');
                                            }}
                                            className="w-7 h-7 rounded-full bg-[#045c84] text-white flex items-center justify-center shrink-0 hover:bg-[#034664] active:scale-90 transition-all"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Save Button / Auto-Save Indicator */}
                                <div className="flex justify-between items-center pt-1">
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                        <span className="flex items-center gap-1"><ClipboardList size={11} className="text-indigo-500" /> {planItems.filter(i=>i.type==='task').length} টি কাজ</span>
                                        <span className="flex items-center gap-1"><Zap size={11} className="text-amber-500" /> {planItems.filter(i=>i.type==='activity').length} টি কার্যক্রম</span>
                                    </div>
                                    <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${planSaved ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-transparent'}`}>
                                        {planSaved ? <><CheckCircle2 size={14} /><span>স্বয়ংক্রিয়ভাবে সংরক্ষিত ✓</span></> : <span className="animate-pulse">পরিবর্তন হচ্ছে...</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Source Content Preview */}
                            {topic.sources && topic.sources.length > 0 && (
                                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-[#045c84]/10 text-[#045c84] flex items-center justify-center">
                                                <BookOpen size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                    মূল পাঠ্য উপাদান ও কারিকুলাম উৎস
                                                </h4>
                                                <p className="text-[11px] text-slate-400">
                                                    {topic.bookInfo.bookName} ({topic.bookInfo.grade}) • {topic.bookInfo.chapter} • পৃষ্ঠা {topic.bookInfo.pageNumber}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-[#045c84] bg-[#045c84]/10 px-3 py-1 rounded-full">
                                            {topic.sources[0].humanId}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-slate-200/70 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans max-h-40 overflow-y-auto">
                                        {topic.sources[0].content}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: IMPLEMENT */}
                    {activeTab === 'implement' && currentDay && (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            <ClassExecutionMode 
                                topic={topic} 
                                selectedDayNum={selectedDayNum} 
                                onComplete={() => setActiveTab('observation')}
                            />
                        </div>
                    )}

                    {/* TAB 2: STRUCTURED OBSERVATION & FEEDBACK */}
                    {activeTab === 'observation' && currentDay && (
                        <div className="space-y-5">
                            {/* Performance Rating Pills */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    শিক্ষার্থীদের সার্বিক সম্পাদন স্তর কেমন ছিল?
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {(['Very well', 'Good', 'Mixed', 'Difficult', 'Failed'] as PerformanceRating[]).map((rating) => (
                                        <button
                                            key={rating}
                                            type="button"
                                            onClick={() => setCurrentRating(rating)}
                                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                                currentRating === rating
                                                    ? 'bg-[#045c84] text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {rating === 'Very well' && 'অত্যন্ত ভালো (Very Well)'}
                                            {rating === 'Good' && 'ভালো (Good)'}
                                            {rating === 'Mixed' && 'মিশ্র অবস্থা (Mixed)'}
                                            {rating === 'Difficult' && 'কঠিন লেগেছে (Difficult)'}
                                            {rating === 'Failed' && 'ব্যর্থ (Failed)'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Observed Problems Checklist */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    আজকের সেশনে কোন সমস্যাগুলো পরিলক্ষিত হয়েছে?
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {COMMON_PROBLEMS_LIST.map((prob) => {
                                        const isChecked = selectedProblems.includes(prob);
                                        return (
                                            <button
                                                key={prob}
                                                type="button"
                                                onClick={() => {
                                                    if (isChecked) {
                                                        setSelectedProblems(selectedProblems.filter(p => p !== prob));
                                                    } else {
                                                        setSelectedProblems([...selectedProblems, prob]);
                                                    }
                                                }}
                                                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left text-xs font-semibold transition-all ${
                                                    isChecked
                                                        ? 'bg-teal-50 border-teal-300 text-teal-900'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                                                    isChecked ? 'bg-teal-700 text-white' : 'border border-slate-300'
                                                }`}>
                                                    {isChecked && '✓'}
                                                </div>
                                                <span>{prob}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Narrative Teacher Observation Textarea */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        শিক্ষকের প্রত্যক্ষ পর্যবেক্ষণ (Teacher Observation) *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAnalyzeObservation}
                                        disabled={isAnalyzingAi || !teacherObservation.trim()}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#045c84] hover:text-[#034664] disabled:opacity-40"
                                    >
                                        <Sparkles size={13} className="text-cyan-600" />
                                        <span>{isAnalyzingAi ? 'বিশ্লেষণ হচ্ছে...' : 'এআই দিয়ে পর্যবেক্ষণ যাচাই করুন'}</span>
                                    </button>
                                </div>
                                <textarea
                                    rows={4}
                                    value={teacherObservation}
                                    onChange={(e) => setTeacherObservation(e.target.value)}
                                    placeholder="আজকের ক্লাসে প্রকৃতপক্ষে কী ঘটেছে? কোন অংশটি দারুণ কাজ করেছে এবং কোন জায়গায় শিক্ষার্থীরা হোঁচট খেয়েছে বিস্তারিত লিখুন..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-3xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84]"
                                />
                            </div>

                            {/* AI Feedback Bubble */}
                            {aiFeedback && (
                                <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-2xl text-xs text-cyan-950 flex items-start gap-2.5">
                                    <Sparkles size={16} className="text-cyan-700 shrink-0 mt-0.5" />
                                    <div className="flex-1 space-y-1">
                                        <p className="font-semibold leading-relaxed">{aiFeedback}</p>
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTeacherObservation(prev => prev + `\n[গৃহীত এআই সুপারিশ: পরবর্তী সেশনে ফিঙ্গার রিল্যাক্সেশন ড্রিল সংযোজন করা হবে।]`);
                                                    setAiFeedback(null);
                                                }}
                                                className="px-3 py-1 bg-cyan-700 text-white rounded-full text-[10px] font-bold hover:bg-cyan-800"
                                            >
                                                সুপারিশ গ্রহণ করুন
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAiFeedback(null)}
                                                className="px-3 py-1 bg-white text-slate-600 rounded-full text-[10px] font-bold hover:bg-slate-100"
                                            >
                                                বাতিল
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 flex justify-between items-center">
                                <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${planSaved ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-transparent'}`}>
                                    {planSaved ? <><CheckCircle2 size={14} /><span>স্বয়ংক্রিয়ভাবে সংরক্ষিত ✓</span></> : <span className="animate-pulse">পরিবর্তন হচ্ছে...</span>}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSaveDayFeedback}
                                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 shadow-sm transition-all active:scale-95 border border-emerald-200"
                                >
                                    <CheckCircle2 size={16} />
                                    <span>দিন {selectedDayNum} সম্পূর্ণ করুন</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: MISTAKES & PROBLEM ➔ SOLUTION LOOP */}
                    {activeTab === 'problems' && (
                        <div className="space-y-6">
                            {/* Record Mistake Sub-section */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-3">
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertTriangle size={15} className="text-amber-600" />
                                    <span>শ্রেণিকক্ষে চিহ্নিত ভুল যোগ করুন (Mistake Logger)</span>
                                </div>
                                <form onSubmit={handleAddMistake} className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <input
                                                type="text"
                                                value={mistakeDesc}
                                                onChange={e => setMistakeDesc(e.target.value)}
                                                placeholder="ভুলটির বিবরণ (উদা: 'ক' এবং 'ব' লিখতে গিয়ে মাত্রা নিচে নেমে যাওয়া)"
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                value={mistakeCount}
                                                onChange={e => setMistakeCount(e.target.value)}
                                                placeholder="কতজন শিক্ষার্থী?"
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <input
                                            type="text"
                                            value={mistakeCause}
                                            onChange={e => setMistakeCause(e.target.value)}
                                            placeholder="আপনার মতে ভুলটির কারণ কী ছিল?"
                                            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium"
                                        />
                                        <button
                                            type="submit"
                                            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-full text-xs font-bold shadow-xs shrink-0"
                                        >
                                            + ভুল যুক্ত করুন
                                        </button>
                                    </div>
                                </form>

                                {/* List of Recorded Mistakes for current day */}
                                {currentDay?.mistakes && currentDay.mistakes.length > 0 && (
                                    <div className="pt-2 space-y-1.5">
                                        {currentDay.mistakes.map(m => (
                                            <div key={m.id} className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-between text-xs relative">
                                                <div className="flex-1 pr-2">
                                                    <span className="font-bold text-slate-800">{m.description}</span>
                                                    <span className="text-slate-400 block text-[11px]">কারণ: {m.causeHypothesis}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[11px]">
                                                        {m.studentCount} জন
                                                    </span>

                                                    {/* 3-Dot Item Menu */}
                                                    <div className="relative item-action-menu">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuMistakeId(openMenuMistakeId === m.id ? null : m.id);
                                                            }}
                                                            className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                                                            title="অপশন"
                                                        >
                                                            <MoreVertical size={14} />
                                                        </button>

                                                        {openMenuMistakeId === m.id && (
                                                            <div className="absolute right-0 top-8 w-32 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenMenuMistakeId(null);
                                                                        handleDeleteMistake(m.id);
                                                                    }}
                                                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                                                                >
                                                                    <Trash2 size={13} />
                                                                    <span>মুছে ফেলুন</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Problem ➔ Solution Loop */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-3">
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Lightbulb size={15} className="text-teal-600" />
                                    <span>সমস্যা ও শিক্ষক ট্রায়াল সমাধান (Problem ➔ Solution Loop)</span>
                                </div>
                                <form onSubmit={handleAddProblemSolution} className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <input
                                                type="text"
                                                value={problemTitle}
                                                onChange={e => setProblemTitle(e.target.value)}
                                                placeholder="নির্দিষ্ট সমস্যা (উদা: পেনসিল অতিরিক্ত চেপে ধরা)"
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={teacherSolution}
                                                onChange={e => setTeacherSolution(e.target.value)}
                                                placeholder="শিক্ষক হিসেবে আপনি কী সমাধান প্রয়োগ করলেন?"
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="font-bold text-slate-600">সমাধান কাজ করেছে?</span>
                                            {(['yes', 'partially', 'no'] as const).map(st => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setSolutionWorkStatus(st)}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        solutionWorkStatus === st
                                                            ? 'bg-teal-700 text-white'
                                                            : 'bg-white border border-slate-200 text-slate-600'
                                                    }`}
                                                >
                                                    {st === 'yes' && 'হ্যাঁ'}
                                                    {st === 'partially' && 'আংশিক'}
                                                    {st === 'no' && 'না'}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            type="submit"
                                            className="px-5 py-2 bg-[#045c84] hover:bg-[#034664] text-white rounded-full text-xs font-bold shadow-xs shrink-0"
                                        >
                                            + সমাধান রেকর্ড করুন
                                        </button>
                                    </div>
                                </form>

                                {/* List of Solutions */}
                                {currentDay?.solutions && currentDay.solutions.length > 0 && (
                                    <div className="pt-2 space-y-2">
                                        {currentDay.solutions.map(s => (
                                            <div key={s.id} className="p-3.5 bg-white rounded-2xl border border-teal-100 flex items-start justify-between text-xs gap-3 relative">
                                                <div className="space-y-1 flex-1">
                                                    <div className="font-bold text-slate-800">সমস্যা: {s.problemTitle}</div>
                                                    <div className="text-teal-800 font-semibold">প্রয়োগকৃত সমাধান: {s.teacherSolution}</div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                        s.isEffective === 'yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {s.isEffective === 'yes' ? 'সফল সমাধান ✓' : 'আংশিক কার্যকর'}
                                                    </span>

                                                    {/* 3-Dot Menu */}
                                                    <div className="relative item-action-menu">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuSolutionId(openMenuSolutionId === s.id ? null : s.id);
                                                            }}
                                                            className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                                                            title="অপশন"
                                                        >
                                                            <MoreVertical size={14} />
                                                        </button>

                                                        {openMenuSolutionId === s.id && (
                                                            <div className="absolute right-0 top-8 w-32 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenMenuSolutionId(null);
                                                                        handleDeleteSolution(s.id);
                                                                    }}
                                                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                                                                >
                                                                    <Trash2 size={13} />
                                                                    <span>মুছে ফেলুন</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: BEFORE / AFTER EVIDENCE */}
                    {activeTab === 'evidence' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">বিফোর / আফটার দৃশ্যমান ফলাফল (Field Evidence)</h4>
                                    <p className="text-xs text-slate-500">গবেষণার শুরুতে এবং শেষের বাস্তব হস্তলিপি বা কাজের তুলনা</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddEvidence}
                                    className="px-4 py-2 bg-[#045c84] hover:bg-[#034664] text-white rounded-full text-xs font-bold shadow-sm"
                                >
                                    + নতুন প্রমাণ যোগ করুন
                                </button>
                            </div>

                            {/* Comparison Cards */}
                            {topic.evidenceList && topic.evidenceList.length > 0 ? (
                                <div className="space-y-4">
                                    {topic.evidenceList.map((evd) => (
                                        <div key={evd.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4 relative">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                                <div className="font-bold text-slate-800 text-sm">{evd.title}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 font-medium">{evd.studentName}</span>
                                                    
                                                    {/* 3-Dot Evidence Menu */}
                                                    <div className="relative item-action-menu">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuEvidenceId(openMenuEvidenceId === evd.id ? null : evd.id);
                                                            }}
                                                            className="w-7 h-7 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                                                            title="অপশন"
                                                        >
                                                            <MoreVertical size={14} />
                                                        </button>

                                                        {openMenuEvidenceId === evd.id && (
                                                            <div className="absolute right-0 top-8 w-32 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenMenuEvidenceId(null);
                                                                        handleDeleteEvidence(evd.id);
                                                                    }}
                                                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                                                                >
                                                                    <Trash2 size={13} />
                                                                    <span>মুছে ফেলুন</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Side by side Images */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                                                    <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block">
                                                        BEFORE (দিন ১)
                                                    </span>
                                                    <div className="h-44 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">
                                                        <img src={evd.beforeImageUrl} alt="Before" className="h-full w-full object-cover" />
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">তারিখ: {evd.beforeDate}</div>
                                                </div>

                                                <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                                                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                                                        AFTER (দিন {evd.afterDayNumber})
                                                    </span>
                                                    <div className="h-44 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">
                                                        <img src={evd.afterImageUrl} alt="After" className="h-full w-full object-cover" />
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">তারিখ: {evd.afterDate}</div>
                                                </div>
                                            </div>

                                            {/* Scoring Metrics */}
                                            {evd.metricsAfter && (
                                                <div className="p-3 bg-white rounded-2xl border border-slate-100 text-xs">
                                                    <span className="font-bold text-slate-700 block mb-2 uppercase text-[10px]">দক্ষতা অগ্রগতি সূচক (Handwriting Metrics):</span>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                                        <div className="p-2 bg-slate-50 rounded-xl">
                                                            <span className="text-slate-400 block text-[10px]">বর্ণের গঠন</span>
                                                            <strong className="text-slate-800">২ ➔ {evd.metricsAfter.letterFormation}/৫</strong>
                                                        </div>
                                                        <div className="p-2 bg-slate-50 rounded-xl">
                                                            <span className="text-slate-400 block text-[10px]">মাত্রা ও সরলরেখা</span>
                                                            <strong className="text-slate-800">২ ➔ {evd.metricsAfter.alignment}/৫</strong>
                                                        </div>
                                                        <div className="p-2 bg-slate-50 rounded-xl">
                                                            <span className="text-slate-400 block text-[10px]">স্পেসিং</span>
                                                            <strong className="text-slate-800">১ ➔ {evd.metricsAfter.spacing}/৫</strong>
                                                        </div>
                                                        <div className="p-2 bg-slate-50 rounded-xl">
                                                            <span className="text-slate-400 block text-[10px]">পেনসিল কন্ট্রোল</span>
                                                            <strong className="text-slate-800">২ ➔ {evd.metricsAfter.writingControl}/৫</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-3xl p-10 text-center text-slate-400 text-xs">
                                    এখনো কোনো তুলনামূলক ছবি যোগ করা হয়নি। উপরে '+ নতুন প্রমাণ যোগ করুন' চাপুন।
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: FINAL REPORT & SYNTHESIS */}
                    {activeTab === 'report' && (
                        <div className="space-y-5">
                            <div className="bg-gradient-to-br from-teal-900 to-[#045c84] text-white p-6 rounded-3xl shadow-lg space-y-4">
                                <div className="flex items-center gap-2 text-cyan-200 text-xs font-bold">
                                    <Award size={18} />
                                    <span>গবেষণা ফলাফল সারসংক্ষেপ (Research Findings)</span>
                                </div>
                                <h3 className="text-lg font-black">{topic.title}</h3>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs">
                                        <span className="text-cyan-200 block text-[10px]">মোট দিন</span>
                                        <strong className="text-base text-white">{topic.totalDays} দিন</strong>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs">
                                        <span className="text-cyan-200 block text-[10px]">পরীক্ষিত ভুল</span>
                                        <strong className="text-base text-white">
                                            {topic.days.reduce((acc, d) => acc + (d.mistakes?.length || 0), 0)} টি
                                        </strong>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs">
                                        <span className="text-cyan-200 block text-[10px]">সমাধানকৃত সমস্যা</span>
                                        <strong className="text-base text-white">
                                            {topic.days.reduce((acc, d) => acc + (d.solutions?.length || 0), 0)} টি
                                        </strong>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xs">
                                        <span className="text-cyan-200 block text-[10px]">ফিল্ড টেস্ট সম্পন্ন</span>
                                        <strong className="text-base text-white">{topic.fieldTestedCount} জন শিক্ষক</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3 text-xs">
                                <span className="font-bold text-slate-800 block text-sm">শিক্ষকের চূড়ান্ত পর্যবেক্ষণ ও সুপারিশ:</span>
                                <p className="text-slate-600 leading-relaxed">
                                    ৩য় শ্রেণির শিক্ষার্থীদের ক্ষেত্রে সরাসরি বর্ণমালা লেখার আগে ২ মিনিট 'লাইন স্ট্রোকার গেম' এবং সঠিক গ্রিপ প্রদর্শন করলে মাত্রাজনিত ভুল প্রায় ৬০% হ্রাস পায়। এই কৌশলটি প্রাথমিক সকল শিক্ষকের জন্য অত্যন্ত কার্যকরী প্রমাণিত হয়েছে।
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        বন্ধ করুন
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 rounded-full text-xs font-bold text-white bg-[#045c84] hover:bg-[#034664] transition-colors shadow-sm"
                    >
                        সম্পন্ন
                    </button>
                </div>
            </div>

            {/* Status Change Selection Modal for Super Admin */}
            <SelectionListModal
                isOpen={isStatusModalOpen}
                title="গবেষণার স্ট্যাটাস পরিবর্তন করুন (Super Admin)"
                options={STATUS_LIST}
                selectedValue={topic.status}
                onSelect={(val) => {
                    onUpdateTopic({ ...topic, status: val as ResearchStatus });
                    setIsStatusModalOpen(false);
                }}
                onClose={() => setIsStatusModalOpen(false)}
            />
        </div>,
        document.body
    );
}
