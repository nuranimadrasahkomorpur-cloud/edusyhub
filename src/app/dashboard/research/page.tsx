'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from '@/components/SessionProvider';
import {
    FlaskConical,
    Plus,
    Search,
    Filter,
    Users,
    Sparkles,
    BookOpen,
    CheckCircle2,
    Clock,
    X,
    RefreshCw,
    Share2,
    ChevronRight,
    ShieldCheck,
    SlidersHorizontal,
    Tag,
    Trash2,
    MoreVertical,
    Edit3,
    Copy
} from 'lucide-react';
import Toast from '@/components/Toast';
import { ResearchTopic, ResearchStatus } from './types/research';
import SelectionListModal from './components/SelectionListModal';
import CreateResearchModal from './components/CreateResearchModal';
import TopicDetailModal from './components/TopicDetailModal';
import EditResearchModal from './components/EditResearchModal';

const INITIAL_TOPICS: ResearchTopic[] = [
    {
        id: 'res-bangla-handwriting-01',
        humanId: 'TOP-2026-001',
        title: 'বাংলা বর্ণমালা ও যুক্তবর্ণের নির্ভুল হাতের লেখা উন্নয়ন',
        problemToSolve: '৩য় শ্রেণির শিক্ষার্থীরা লেখার সময় মাত্রা ও অক্ষরের বৃত্তাকার অংশের সঠিক রূপ বজায় রাখতে পারছে না।',
        category: 'বাংলা',
        researchType: 'Writing Improvement',
        status: 'Running',
        visibility: 'public',
        bookInfo: {
            board: 'জাতীয় শিক্ষাক্রম (NCTB)',
            grade: 'তৃতীয় শ্রেণি',
            subject: 'বাংলা',
            bookName: 'আমার বাংলা বই',
            chapter: 'অধ্যায় ৪ : ছবি ও কথা',
            pageNumber: '৪২'
        },
        totalDays: 7,
        currentDayNumber: 4,
        progress: 60,
        days: [
            {
                id: 'act-1',
                humanId: 'ACT-2026-101',
                dayNumber: 1,
                title: 'দিন ১: বেইজলাইন মূল্যায়ন ও খাতার নমুনা সংগ্রহ',
                objective: 'শিক্ষার্থীদের প্রাথমিক হাতের লেখার নমুনা খাতা সংগ্রহ করা',
                teacherInstructions: ['শিক্ষার্থীদের একটি নির্দিষ্ট অনুচ্ছেদ লিখতে দিন।', 'পেনসিল ধরার ধরণ লক্ষ্য করুন।'],
                studentTask: 'পাঠ্যবইয়ের অনুচ্ছেদটি খাতায় অনুলিপি করা।',
                expectedResult: 'সকল শিক্ষার্থীর প্রাথমিক কাজের নমুনা সংগৃহীত হবে।',
                estimatedMinutes: 25,
                materials: ['খাতা', 'পেন্সিল'],
                status: 'completed',
                performance: 'Mixed',
                observedProblems: ['লেখার গতি প্রত্যাশার চেয়ে কম ছিল', 'বর্ণের গঠন ও মাত্রা সঠিক ছিল না'],
                teacherObservation: 'অধিকাংশ শিক্ষার্থী পেনসিল অনেক চেপে ধরছে এবং মাত্রার সোজা লাইন দিতে সমস্যা হচ্ছে।',
                mistakes: [
                    {
                        id: 'mst-1',
                        humanId: 'MST-2026-01',
                        description: 'ক এবং ব বর্ণের মাত্রা বাঁকা হওয়া',
                        studentCount: 9,
                        causeHypothesis: 'দ্রুত লেখার চেষ্টা ও ভুল গ্রিপ',
                        recordedAt: '2026-09-15'
                    }
                ],
                solutions: [
                    {
                        id: 'sol-1',
                        humanId: 'PRB-2026-01',
                        problemTitle: 'অতিরিক্ত চেপে পেনসিল ধরা',
                        observedInCount: 8,
                        possibleCause: 'আঙুলের জড়তা',
                        teacherSolution: 'সেশনের শুরুতে ২ মিনিট আঙুল শিথিলকরণ ড্রিল',
                        isEffective: 'yes',
                        resultAfterCorrection: 'হাতের চাপ কমেছে এবং লাইন মসৃণ হয়েছে',
                        recordedAt: '2026-09-16'
                    }
                ]
            },
            {
                id: 'act-2',
                humanId: 'ACT-2026-102',
                dayNumber: 2,
                title: 'দিন ২: মৌলিক স্ট্রোক ও মাত্রাজ্ঞান অনুশীলন',
                objective: 'সোজা ও বৃত্তাকার রেখা টানার সঠিক পদ্ধতি প্রদর্শন',
                teacherInstructions: ['বোর্ডে বড় করে সঠিক স্ট্রোক ডিরেকশন আঁকুন।'],
                studentTask: 'ওয়ার্কশিটে ৫ লাইন সোজা মাত্রা ও অর্ধবৃত্ত আঁকা।',
                expectedResult: 'মাত্রার ধারাবাহিকতা ৮০% শিক্ষার্থীর অর্জিত হবে।',
                estimatedMinutes: 25,
                materials: ['রুলটানা শিট', 'পেন্সিল'],
                status: 'completed',
                performance: 'Good',
                observedProblems: ['ব্যক্তিগত তত্ত্বাবধানের প্রয়োজন বেশি ছিল'],
                teacherObservation: 'বোর্ডের প্রদর্শনী দেখে শিক্ষার্থীরা দ্রুত বুঝতে পেরেছে।',
                mistakes: [],
                solutions: []
            },
            {
                id: 'act-3',
                humanId: 'ACT-2026-103',
                dayNumber: 3,
                title: 'দিন ৩: নিয়ন্ত্রিত ক্লাসরুম চর্চা ও পেয়ার রিভিউ',
                objective: 'সহপাঠীর খাতা দেখে পারস্পরিক তুলনা ও ভুল সংশোধন',
                teacherInstructions: ['জোড়ায় জোড়ায় খাতা বিনিময় করতে বলুন।'],
                studentTask: 'সহপাঠীর খাতায় মাত্রা ঠিক আছে কিনা যাচাই করা।',
                expectedResult: 'শিক্ষার্থীরা নিজের ভুল নিজেই বুঝতে পারবে।',
                estimatedMinutes: 25,
                materials: ['খাতা'],
                status: 'completed',
                performance: 'Good',
                observedProblems: [],
                teacherObservation: 'জোড়ায় কাজ করায় উৎসাহ অনেক বেড়ে গেছে।',
                mistakes: [],
                solutions: []
            },
            {
                id: 'act-4',
                humanId: 'ACT-2026-104',
                dayNumber: 4,
                title: 'দিন ৪: স্বতন্ত্র অনুশীলন ও সময় নিয়ন্ত্রণ',
                objective: 'নির্ধারিত ২০ মিনিটে পূর্ণাঙ্গ অনুচ্ছেদ নির্ভুলভাবে লেখা',
                teacherInstructions: ['ঘড়ি ধরে ২০ মিনিটের মধ্যে লেখার নির্দেশনা দিন।'],
                studentTask: 'অধ্যায় ৪-এর অনুচ্ছেদটি সম্পূর্ণ লেখা।',
                expectedResult: 'গতি ও সৌন্দর্য উভয়ের সমন্বয় ঘটবে।',
                estimatedMinutes: 25,
                materials: ['খাতা'],
                status: 'pending',
                observedProblems: [],
                mistakes: [],
                solutions: []
            }
        ],
        sources: [
            {
                id: 'src-1',
                humanId: 'SRC-2026-01',
                title: 'আমার বাংলা বই পৃষ্ঠা ৪২',
                type: 'text',
                content: 'আমাদের প্রিয় দেশ বাংলাদেশ। এই দেশের নদীনালা ও সবুজ প্রকৃতি সবার মন কাড়ে।',
                uploadedAt: '2026-09-14'
            }
        ],
        evidenceList: [
            {
                id: 'evd-1',
                humanId: 'EVD-2026-01',
                title: 'রোল ৩ (আব্দুর রহমান)-এর হাতের লেখার অগ্রগতি',
                studentName: 'আব্দুর রহমান',
                beforeImageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80',
                beforeDate: '2026-09-15',
                beforeDayNumber: 1,
                afterImageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80',
                afterDate: '2026-09-19',
                afterDayNumber: 4,
                metricsBefore: { letterFormation: 2, alignment: 2, spacing: 1, sizeConsistency: 2, writingControl: 2 },
                metricsAfter: { letterFormation: 4, alignment: 4, spacing: 3, sizeConsistency: 4, writingControl: 4 },
                aiImageAnalysis: 'মাত্রা ও হরফের বৃত্তে লক্ষণীয় উন্নতি পরিলক্ষিত হয়েছে।'
            }
        ],
        authorId: 'teacher-01',
        authorName: 'মাওলানা মাহমুদ হাসান',
        authorRole: 'সিনিয়র শিক্ষক',
        instituteName: 'নূরানী মাদ্রাসা ও একাডেমি',
        tags: ['হাতের লেখা', 'বাংলা', '৩য় শ্রেণি'],
        fieldTestedCount: 14,
        completedCount: 8,
        improvedVersionCount: 3,
        contributors: [
            { id: 'c-1', name: 'মাওলানা মাহমুদ হাসান', role: 'প্রধান গবেষক', contributionType: 'বিষয় প্রণয়ন', contributedAt: '2026-09-14' },
            { id: 'c-2', name: 'মোঃ তানভীর', role: 'সহ-গবেষক', contributionType: 'ফিল্ড ডাটা সংগ্রহ', contributedAt: '2026-09-17' }
        ],
        createdAt: '2026-09-14',
        updatedAt: '2026-09-20'
    },
    {
        id: 'res-math-fractions-02',
        humanId: 'TOP-2026-002',
        title: 'কাগজ ভাঁজ করে ভগ্নাংশ (Fractions) সহজে বোঝানোর ব্যবহারিক পদ্ধতি',
        problemToSolve: '৫ম শ্রেণির শিক্ষার্থীরা প্রকৃত ও অপ্রকৃত ভগ্নাংশের চাক্ষুষ রূপ বুঝতে হিমশিম খায়।',
        category: 'গণিত',
        researchType: 'Concept Understanding',
        status: 'Validated',
        visibility: 'public',
        bookInfo: {
            board: 'জাতীয় শিক্ষাক্রম (NCTB)',
            grade: 'পঞ্চম শ্রেণি',
            subject: 'গণিত',
            bookName: 'প্রাথমিক গণিত',
            chapter: 'অধ্যায় ৬ : ভগ্নাংশ',
            pageNumber: '৫৮'
        },
        totalDays: 5,
        currentDayNumber: 5,
        progress: 100,
        days: [],
        sources: [],
        evidenceList: [],
        authorId: 'teacher-02',
        authorName: 'হাফেজ মোঃ তারেক আজিজ',
        authorRole: 'সহকারী শিক্ষক',
        instituteName: 'কমরপুর মডেল ক্যাডেট একাডেমি',
        tags: ['ভগ্নাংশ', 'ব্যবহারিক গণিত', '৫ম শ্রেণি'],
        fieldTestedCount: 22,
        completedCount: 19,
        improvedVersionCount: 5,
        contributors: [
            { id: 'c-3', name: 'হাফেজ মোঃ তারেক আজিজ', role: 'প্রধান গবেষক', contributionType: 'পদ্ধতি উদ্ভাবন', contributedAt: '2026-08-20' }
        ],
        createdAt: '2026-08-20',
        updatedAt: '2026-09-10'
    },
    {
        id: 'res-arabic-harakat-03',
        humanId: 'TOP-2026-003',
        title: 'হরকত ও তানভীনের উচ্চারণ পার্থক্যে রঙিন ফ্ল্যাশকার্ডের কার্যকারিতা',
        problemToSolve: 'নূরানী ও ইবতেদায়ি স্তরে জবর-জের-পেশ এবং দুই জবর উচ্চারণে গুলিয়ে ফেলে।',
        category: 'আরবি / কাওয়াইদ',
        researchType: 'Student Activity',
        status: 'Tested',
        visibility: 'public',
        bookInfo: {
            board: 'কওমি মাদ্রাসা শিক্ষাবোর্ড (বেফাক)',
            grade: 'প্রথম শ্রেণি',
            subject: 'আরবি',
            bookName: 'নূরানী কায়দা',
            chapter: 'তখতি ৩ : হরকত',
            pageNumber: '১২'
        },
        totalDays: 5,
        currentDayNumber: 3,
        progress: 60,
        days: [],
        sources: [],
        evidenceList: [],
        authorId: 'teacher-03',
        authorName: 'ফারহানা ইয়াসমিন',
        authorRole: 'সিনিয়র শিক্ষক',
        instituteName: 'সেন্ট্রাল এডুকেশন ক্যাম্পাস',
        tags: ['নূরানী', 'হরকত', 'উচ্চারণ'],
        fieldTestedCount: 9,
        completedCount: 6,
        improvedVersionCount: 2,
        contributors: [
            { id: 'c-4', name: 'ফারহানা ইয়াসমিন', role: 'প্রধান গবেষক', contributionType: 'কার্ড ডিজাইন', contributedAt: '2026-09-02' }
        ],
        createdAt: '2026-09-02',
        updatedAt: '2026-09-18'
    }
];

const CATEGORIES = [
    'সকল বিষয়',
    'বাংলা',
    'ইংরেজি',
    'গণিত',
    'সাধারণ বিজ্ঞান',
    'বাংলাদেশ ও বিশ্বপরিচয়',
    'ধর্ম ও নৈতিক শিক্ষা',
    'আরবি / কাওয়াইদ',
    'শিক্ষা প্রযুক্তি'
];

export default function ResearchHubPage() {
    const { user, activeRole, activeInstitute } = useSession();
    const isSuperAdmin = activeRole === 'SUPER_ADMIN';

    const [topics, setTopics] = useState<ResearchTopic[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('সকল বিষয়');
    const [mainTab, setMainTab] = useState<'my' | 'public' | 'all'>('my');
    const [statusSubTab, setStatusSubTab] = useState<'all' | 'current' | 'completed' | 'draft' | 'failed'>('all');

    // Dynamic category list combining default and custom created subjects
    const availableCategories = useMemo(() => {
        const set = new Set(['সকল বিষয়', ...CATEGORIES]);
        topics.forEach(t => {
            if (t.category && t.category.trim()) set.add(t.category.trim());
        });
        return Array.from(set);
    }, [topics]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Modals & Popover State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedDraftForEdit, setSelectedDraftForEdit] = useState<ResearchTopic | null>(null);
    const [selectedTopicForDetail, setSelectedTopicForDetail] = useState<ResearchTopic | null>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState<ResearchTopic | null>(null);
    const [statusChangeTopic, setStatusChangeTopic] = useState<ResearchTopic | null>(null);
    const [openMenuTopicId, setOpenMenuTopicId] = useState<string | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const tabsContainerRef = useRef<HTMLDivElement>(null);

    // Close 3-dot dropdown menu on outside click
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.card-action-menu')) {
                setOpenMenuTopicId(null);
            }
        };
        if (openMenuTopicId) {
            document.addEventListener('click', handleOutsideClick);
        }
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [openMenuTopicId]);

    // Load persisted or DB topics
    const loadTopics = useCallback(async () => {
        try {
            const res = await fetch('/api/research');
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                setTopics(data.data);
                localStorage.setItem('edusy_research_topics_v2', JSON.stringify(data.data));
            } else {
                const cached = localStorage.getItem('edusy_research_topics_v2');
                const list = cached ? JSON.parse(cached) : INITIAL_TOPICS;
                setTopics(list);
            }
        } catch (e) {
            console.warn('API error, falling back to local storage:', e);
            const cached = localStorage.getItem('edusy_research_topics_v2');
            setTopics(cached ? JSON.parse(cached) : INITIAL_TOPICS);
        }
    }, []);

    useEffect(() => {
        loadTopics();
    }, [loadTopics]);

    // Save topics
    const saveTopics = (updated: ResearchTopic[]) => {
        setTopics(updated);
        try {
            localStorage.setItem('edusy_research_topics_v2', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to cache topics:', e);
        }
    };

    // Smooth auto-centering status sub-tab button click
    const handleStatusSubTabClick = (tabKey: typeof statusSubTab, e: React.MouseEvent<HTMLButtonElement>) => {
        setStatusSubTab(tabKey);
        e.currentTarget.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    };

    // Keyboard shortcuts (Alt+N: New, /: Search, Esc: Close)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement !== searchInputRef.current && !isCreateModalOpen && !selectedTopicForDetail) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
                e.preventDefault();
                setIsCreateModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCreateModalOpen, selectedTopicForDetail]);

    const currentUserId = user?.id || 'current-user';

    // Counts for Main Tabs (My Projects vs Public Projects)
    const myTopicsCount = useMemo(() => {
        return topics.filter(t => t.authorId === currentUserId || t.authorName.includes(user?.name || '---')).length;
    }, [topics, currentUserId, user]);

    const publicTopicsCount = useMemo(() => {
        return topics.filter(t => t.visibility === 'public' && t.status !== 'Draft').length;
    }, [topics]);

    // Topics scoped by active mainTab
    const scopedTopics = useMemo(() => {
        return topics.filter(t => {
            const isMine = t.authorId === currentUserId || t.authorName.includes(user?.name || '---');
            if (mainTab === 'my') return isMine;
            if (mainTab === 'public') return t.visibility === 'public' && t.status !== 'Draft';
            return true; // 'all'
        });
    }, [topics, mainTab, currentUserId, user]);

    // Counts for Status Sub-tabs based on active scope
    const subTabCounts = useMemo(() => {
        return {
            all: scopedTopics.length,
            current: scopedTopics.filter(t => t.status === 'Running' || t.status === 'Researching').length,
            completed: scopedTopics.filter(t => t.status === 'Validated' || t.status === 'Tested' || t.status === 'Improved').length,
            draft: scopedTopics.filter(t => t.status === 'Draft').length,
            failed: scopedTopics.filter(t => t.status === 'Failed' || t.status === 'Archived').length
        };
    }, [scopedTopics]);

    // Filter topics
    const filteredTopics = useMemo(() => {
        return scopedTopics.filter(t => {
            // Category filter
            if (selectedCategory !== 'সকল বিষয়' && t.category !== selectedCategory) {
                return false;
            }

            // Status sub-tab filter
            if (statusSubTab === 'current') {
                if (t.status !== 'Running' && t.status !== 'Researching') return false;
            } else if (statusSubTab === 'completed') {
                if (t.status !== 'Validated' && t.status !== 'Tested' && t.status !== 'Improved') return false;
            } else if (statusSubTab === 'draft') {
                if (t.status !== 'Draft') return false;
            } else if (statusSubTab === 'failed') {
                if (t.status !== 'Failed' && t.status !== 'Archived') return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = t.title.toLowerCase().includes(q);
                const matchProblem = t.problemToSolve.toLowerCase().includes(q);
                const matchAuthor = t.authorName.toLowerCase().includes(q);
                const matchBook = t.bookInfo?.bookName?.toLowerCase().includes(q) || false;
                const matchTags = t.tags.some(tag => tag.toLowerCase().includes(q));
                if (!matchTitle && !matchProblem && !matchAuthor && !matchBook && !matchTags) return false;
            }

            return true;
        });
    }, [scopedTopics, selectedCategory, statusSubTab, searchQuery]);

    // Handle new topic created from wizard (Persisted to Database)
    const handleTopicCreated = async (newTopic: ResearchTopic) => {
        try {
            const res = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newTopic,
                    userId: user?.id,
                    instituteId: activeInstitute?.id
                })
            });
            const data = await res.json();
            const created = data.success ? data.data : newTopic;
            const updated = [created, ...topics];
            saveTopics(updated);
            setToast({ message: 'নতুন গবেষণা ডাটাবেসে সফলভাবে সংরক্ষিত হয়েছে!', type: 'success' });
            setSelectedTopicForDetail(created);
        } catch (e) {
            console.error('Failed to create in DB:', e);
            const updated = [newTopic, ...topics];
            saveTopics(updated);
            setToast({ message: 'নতুন গবেষণা তৈরি হয়েছে!', type: 'success' });
            setSelectedTopicForDetail(newTopic);
        }
    };

    // Handle topic updated from detail modal (Persisted to Database)
    const handleTopicUpdated = async (updatedTopic: ResearchTopic) => {
        try {
            await fetch(`/api/research/${updatedTopic.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTopic)
            });
        } catch (e) {
            console.error('Failed to update in DB:', e);
        }
        const updated = topics.map(t => t.id === updatedTopic.id ? updatedTopic : t);
        saveTopics(updated);
        setSelectedTopicForDetail(updatedTopic);
    };

    // Delete topic (Super admin / Persisted to Database)
    const handleDeleteTopic = async (topicId: string) => {
        try {
            await fetch(`/api/research/${topicId}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.error('Failed to delete in DB:', e);
        }
        const updated = topics.filter(t => t.id !== topicId);
        saveTopics(updated);
        setToast({ message: 'গবেষণাটি মুছে ফেলা হয়েছে।', type: 'info' });
    };

    return (
        <div className="min-h-screen bg-slate-50/70 pb-20">
            {/* Top Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Top Brand Banner - Clean, Simple, and Compact for Saving Space */}
            <div className="bg-gradient-to-r from-[#045c84] via-[#034664] to-[#022c40] text-white py-3.5 px-4 sm:px-6 lg:px-8 shadow-xs border-b border-white/10">
                <div className="w-full max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Brand Title & Pill */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-cyan-200 shrink-0">
                            <FlaskConical size={16} />
                        </div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                                গবেষণা হাব
                            </h1>
                            <span className="text-[10px] font-semibold text-cyan-200 bg-white/10 px-2 py-0.5 rounded-full font-mono border border-white/10">
                                Research Hub
                            </span>
                            {isSuperAdmin && (
                                <span className="bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-black">
                                    সুপার
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Middle: Compact Stats Pills (Inline, space saving) */}
                    <div className="flex items-center gap-2 sm:gap-2.5 text-xs">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[11px] font-semibold">
                            <span className="text-slate-300">মোট:</span>
                            <span className="text-white font-black">{topics.length}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[11px] font-semibold">
                            <span className="text-slate-300">চলমান:</span>
                            <span className="text-cyan-200 font-black">
                                {topics.filter(t => t.status === 'Running' || t.status === 'Researching').length}
                            </span>
                        </div>
                        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[11px] font-semibold">
                            <span className="text-slate-300">টেস্টেড:</span>
                            <span className="text-emerald-300 font-black">
                                {topics.filter(t => t.status === 'Validated' || t.status === 'Tested').length}
                            </span>
                        </div>
                        <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[11px] font-semibold">
                            <span className="text-slate-300">গবেষক:</span>
                            <span className="text-amber-300 font-black">
                                {topics.reduce((acc, t) => acc + (t.contributors?.length || 1), 0)}
                            </span>
                        </div>
                    </div>

                    {/* Right: Action Button */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full font-bold text-xs shadow-sm shadow-teal-950/20 transition-all active:scale-95 cursor-pointer"
                            title="নতুন গবেষণার বিষয় শুরু করুন (Alt+N)"
                        >
                            <Plus size={15} />
                            <span>নতুন প্রজেক্ট</span>
                            <kbd className="hidden sm:inline-block text-[10px] bg-black/25 px-1.5 py-0.5 rounded-full font-mono">Alt+N</kbd>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Wide Full Screen Fit */}
            <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
                
                {/* Unified Search & Filter Row in ONE Line - Clean Round Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-3 sm:p-4 mb-5">
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="বিষয়, বই বা গবেষক খুঁজুন... (/)"
                                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filter Selector Button (Opens Listed Modal, No Dropdown) */}
                        <button
                            type="button"
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700 transition-colors shrink-0"
                            title="বিষয় ফিল্টার করুন"
                        >
                            <SlidersHorizontal size={14} className="text-[#045c84]" />
                            <span className="hidden sm:inline">{selectedCategory}</span>
                            <span className="sm:hidden">ফিল্টার</span>
                        </button>

                        {/* Refresh Button */}
                        <button
                            type="button"
                            onClick={() => setToast({ message: 'তালিকা রিফ্রেশ হয়েছে', type: 'info' })}
                            className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                            title="রিফ্রেশ"
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>

                    {/* Tier 1: Main Scope Tabs (আমার প্রজেক্ট | পাবলিক প্রজেক্ট) */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-full">
                            <button
                                type="button"
                                onClick={() => setMainTab('my')}
                                className={`px-4 sm:px-5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                    mainTab === 'my'
                                        ? 'bg-[#045c84] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                            >
                                <Users size={14} />
                                <span>আমার প্রজেক্ট</span>
                                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
                                    mainTab === 'my' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                    {myTopicsCount}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMainTab('public')}
                                className={`px-4 sm:px-5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                    mainTab === 'public'
                                        ? 'bg-[#045c84] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                            >
                                <Share2 size={14} />
                                <span>পাবলিক প্রজেক্ট</span>
                                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
                                    mainTab === 'public' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                    {publicTopicsCount}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMainTab('all')}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    mainTab === 'all'
                                        ? 'bg-[#045c84] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                            >
                                <span>সকল</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                    mainTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                    {topics.length}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Tier 2: Status Filter Sub-Tabs (চলমান, সম্পন্ন, খসড়া, ব্যর্থ) */}
                    <div 
                        ref={tabsContainerRef}
                        className="flex items-center gap-1.5 sm:gap-2 mt-2.5 pt-2.5 border-t border-slate-100 overflow-x-auto custom-scrollbar scroll-smooth pb-0.5"
                    >
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
                            স্ট্যাটাস:
                        </span>

                        <button
                            type="button"
                            onClick={(e) => handleStatusSubTabClick('all', e)}
                            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                                statusSubTab === 'all'
                                    ? 'bg-slate-800 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            সবগুলো ({subTabCounts.all})
                        </button>

                        <button
                            type="button"
                            onClick={(e) => handleStatusSubTabClick('current', e)}
                            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                                statusSubTab === 'current'
                                    ? 'bg-[#045c84] text-white shadow-xs'
                                    : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                            }`}
                        >
                            চলমান ({subTabCounts.current})
                        </button>

                        <button
                            type="button"
                            onClick={(e) => handleStatusSubTabClick('completed', e)}
                            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                                statusSubTab === 'completed'
                                    ? 'bg-emerald-700 text-white shadow-xs'
                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                        >
                            সম্পন্ন ({subTabCounts.completed})
                        </button>

                        <button
                            type="button"
                            onClick={(e) => handleStatusSubTabClick('draft', e)}
                            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                                statusSubTab === 'draft'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
                            }`}
                        >
                            খসড়া ({subTabCounts.draft})
                        </button>

                        <button
                            type="button"
                            onClick={(e) => handleStatusSubTabClick('failed', e)}
                            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                                statusSubTab === 'failed'
                                    ? 'bg-rose-700 text-white shadow-xs'
                                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/80'
                            }`}
                        >
                            ব্যর্থ ({subTabCounts.failed})
                        </button>
                    </div>
                </div>

                {/* Topics Dynamic Auto-Fit Grid (Card Style Only, Simple & Clean UI) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                    {filteredTopics.length === 0 ? (
                        <div className="col-span-full bg-white rounded-3xl border border-slate-200/80 p-12 text-center">
                            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                <BookOpen size={24} />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 mb-1">কোনো গবেষণার বিষয় পাওয়া যায়নি</h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                                নির্বাচিত ফিল্টার বা সার্চে কোনো প্রজেক্ট পাওয়া যায়নি। আপনি নতুন বিষয় শুরু করতে পারেন।
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#045c84] hover:bg-[#034664] text-white rounded-full font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                                <Plus size={16} />
                                <span>নতুন প্রজেক্ট শুরু করুন</span>
                            </button>
                        </div>
                    ) : (
                        filteredTopics.map((topic) => {
                            const isMine = topic.authorId === user?.id || topic.authorName.includes(user?.name || '---');

                            return (
                                <div
                                    key={topic.id}
                                    className="bg-white rounded-3xl border border-slate-200/80 p-5 hover:border-[#045c84]/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full group relative"
                                >
                                    {/* Top Section */}
                                    <div className="space-y-3">
                                        {/* Top Meta Row with 3-Dot Button */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {topic.humanId}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#045c84]/10 text-[#045c84] text-[10px]">
                                                    {topic.category}
                                                </span>
                                                {topic.status === 'Draft' && (
                                                    <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[10px] border border-amber-200">
                                                        খসড়া
                                                    </span>
                                                )}
                                            </div>

                                            {/* 3-Dot Action Menu Button */}
                                            <div className="relative card-action-menu shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuTopicId(openMenuTopicId === topic.id ? null : topic.id);
                                                    }}
                                                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                                                    title="অপশন"
                                                >
                                                    <MoreVertical size={14} />
                                                </button>

                                                {/* Dropdown Menu Popover */}
                                                {openMenuTopicId === topic.id && (
                                                    <div className="absolute right-0 top-8 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                        {topic.status === 'Draft' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setOpenMenuTopicId(null);
                                                                    setSelectedDraftForEdit(topic);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                            >
                                                                <Edit3 size={13} className="text-amber-600" />
                                                                <span>খসড়া সম্পূর্ণ করুন</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setOpenMenuTopicId(null);
                                                                    setSelectedTopicForDetail(topic);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                            >
                                                                <BookOpen size={13} className="text-[#045c84]" />
                                                                <span>বিস্তারিত দেখুন</span>
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setOpenMenuTopicId(null);
                                                                setEditingTopic(topic);
                                                            }}
                                                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Edit3 size={13} className="text-teal-600" />
                                                            <span>সম্পাদনা করুন</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setOpenMenuTopicId(null);
                                                                setStatusChangeTopic(topic);
                                                            }}
                                                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <CheckCircle2 size={13} className="text-emerald-600" />
                                                            <span>স্ট্যাটাস পরিবর্তন</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setOpenMenuTopicId(null);
                                                                navigator.clipboard?.writeText(topic.humanId);
                                                                setToast({ message: `আইডি ${topic.humanId} কপি হয়েছে!`, type: 'info' });
                                                            }}
                                                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Copy size={13} className="text-slate-400" />
                                                            <span>আইডি কপি করুন</span>
                                                        </button>

                                                        <div className="my-1 border-t border-slate-100" />

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setOpenMenuTopicId(null);
                                                                if (confirm(`আপনি কি নিশ্চিত যে "${topic.title}" গবেষণাটি মুছে ফেলতে চান?`)) {
                                                                    handleDeleteTopic(topic.id);
                                                                }
                                                            }}
                                                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={13} />
                                                            <span>মুছে ফেলুন</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status & Book Row */}
                                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                            <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                                                topic.status === 'Running' || topic.status === 'Researching' ? 'bg-cyan-50 text-cyan-800' :
                                                topic.status === 'Validated' || topic.status === 'Improved' ? 'bg-emerald-50 text-emerald-800' :
                                                topic.status === 'Tested' ? 'bg-teal-50 text-teal-800' :
                                                topic.status === 'Draft' ? 'bg-amber-50 text-amber-800' :
                                                topic.status === 'Failed' ? 'bg-rose-50 text-rose-800' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {(topic.status === 'Running' || topic.status === 'Researching') && '● চলমান'}
                                                {topic.status === 'Validated' && '✓ ভ্যালিডেটেড'}
                                                {topic.status === 'Tested' && '✓ পরীক্ষিত'}
                                                {topic.status === 'Improved' && '✓ উন্নত'}
                                                {topic.status === 'Draft' && 'খসড়া'}
                                                {topic.status === 'Failed' && '✕ ব্যর্থ'}
                                                {topic.status === 'Archived' && 'আর্কাইভ'}
                                                {topic.status === 'Idea' && 'আইডিয়া'}
                                            </span>
                                            <span className="text-slate-500 font-medium truncate">
                                                {topic.bookInfo?.grade} • {topic.bookInfo?.bookName}
                                            </span>
                                        </div>

                                        {/* Topic Title */}
                                        <h2 
                                            onClick={() => setSelectedTopicForDetail(topic)}
                                            className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-[#045c84] transition-colors cursor-pointer leading-snug line-clamp-2"
                                        >
                                            {topic.title}
                                        </h2>

                                        {/* Problem Statement */}
                                        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                                            {topic.problemToSolve}
                                        </p>

                                        {/* Field tested tag if applicable */}
                                        {topic.fieldTestedCount > 0 && (
                                            <div className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full inline-block">
                                                ✓ {topic.fieldTestedCount} জন শিক্ষক দ্বারা পরীক্ষিত
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Progress & Action Section */}
                                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                                        {/* Progress Bar with Day Indicator */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                                <span>দিন {topic.currentDayNumber || 1} / {topic.totalDays}</span>
                                                <span className="text-emerald-700">{topic.progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${topic.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Author Row & Action Button */}
                                        <div className="flex items-center justify-between gap-2 pt-1">
                                            <div className="min-w-0 pr-1">
                                                <span className="text-[11px] font-bold text-slate-700 block truncate">
                                                    {topic.authorName}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block truncate">
                                                    {topic.instituteName || 'এডুসি নেটওয়ার্ক'}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (topic.status === 'Draft') {
                                                        setSelectedDraftForEdit(topic);
                                                    } else {
                                                        setSelectedTopicForDetail(topic);
                                                    }
                                                }}
                                                className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer ${
                                                    topic.status === 'Draft'
                                                        ? 'bg-amber-600 hover:bg-amber-700'
                                                        : 'bg-[#045c84] hover:bg-[#034664]'
                                                }`}
                                            >
                                                <span>{topic.status === 'Draft' ? 'খসড়া সম্পন্ন করুন' : (topic.status === 'Running' ? 'চালিয়ে যান' : 'বিস্তারিত')}</span>
                                                <ChevronRight size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Category Filter Listed Modal (Dynamically includes custom subjects) */}
            <SelectionListModal
                isOpen={isCategoryModalOpen}
                title="বিষয় বা ক্যাটাগরি ফিল্টার করুন"
                options={availableCategories}
                selectedValue={selectedCategory}
                onSelect={(val) => setSelectedCategory(val)}
                onClose={() => setIsCategoryModalOpen(false)}
            />

            {/* Status Change Selection Modal for 3-Dot Action */}
            {statusChangeTopic && (
                <SelectionListModal
                    isOpen={true}
                    title="গবেষণার স্ট্যাটাস নির্বাচন করুন"
                    options={['Idea', 'Researching', 'Running', 'Tested', 'Validated', 'Improved', 'Failed', 'Archived']}
                    selectedValue={statusChangeTopic.status}
                    onSelect={(val) => {
                        handleTopicUpdated({ ...statusChangeTopic, status: val as ResearchStatus });
                        setStatusChangeTopic(null);
                        setToast({ message: 'স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে!', type: 'success' });
                    }}
                    onClose={() => setStatusChangeTopic(null)}
                />
            )}

            {/* Edit Topic Modal */}
            <EditResearchModal
                isOpen={!!editingTopic}
                topic={editingTopic}
                onClose={() => setEditingTopic(null)}
                onSave={(updated) => {
                    handleTopicUpdated(updated);
                    setToast({ message: 'গবেষণার তথ্য সফলভাবে সংরক্ষিত হয়েছে!', type: 'success' });
                }}
            />

            {/* Single-Form Create Research Modal with Auto-Draft & Initial Draft support */}
            <CreateResearchModal
                isOpen={isCreateModalOpen || !!selectedDraftForEdit}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedDraftForEdit(null);
                }}
                onCreated={handleTopicCreated}
                initialDraft={selectedDraftForEdit}
                currentUserName={user?.name || 'মাওলানা মাহমুদ হাসান'}
                currentUserRole={activeRole === 'TEACHER' ? 'শিক্ষক' : (isSuperAdmin ? 'সুপার অ্যাডমিন' : 'শিক্ষক গবেষক')}
                currentInstitute={activeInstitute?.name || 'এডুসি নেটওয়ার্ক'}
            />

            {/* Topic Full Detail & Live Execution Modal */}
            <TopicDetailModal
                isOpen={!!selectedTopicForDetail}
                topic={selectedTopicForDetail}
                isSuperAdmin={isSuperAdmin}
                onClose={() => setSelectedTopicForDetail(null)}
                onUpdateTopic={handleTopicUpdated}
                onDeleteTopic={handleDeleteTopic}
            />
        </div>
    );
}
