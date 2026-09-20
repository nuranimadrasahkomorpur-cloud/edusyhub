'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from '@/components/SessionProvider';
import {
    FlaskConical,
    Plus,
    Search,
    Filter,
    Users,
    FolderKanban,
    Sparkles,
    BookOpen,
    Share2,
    ShieldCheck,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    Edit3,
    Trash2,
    ExternalLink,
    Tag,
    Download,
    RefreshCw,
    X,
    FileText,
    MessageSquare,
    Layers,
    UserCheck,
    Award
} from 'lucide-react';
import Toast from '@/components/Toast';

export interface ResearchContributor {
    id: string;
    name: string;
    role: string;
    instituteName?: string;
    contributionType: string;
    contributedAt: string;
}

export interface ResearchTopic {
    id: string;
    title: string;
    category: string;
    description: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    instituteName: string;
    visibility: 'public' | 'invite-only' | 'private';
    status: 'active' | 'collaborating' | 'in_review' | 'completed';
    tags: string[];
    progress: number;
    contributors: ResearchContributor[];
    createdAt: string;
    updatedAt: string;
}

const INITIAL_RESEARCH_TOPICS: ResearchTopic[] = [
    {
        id: 'topic-ai-pedagogy-2026',
        title: 'আধুনিক শিক্ষাক্রম ও ক্লাসরুমে এআই (AI) অ্যাসিস্ট্যান্টের কার্যকারিতা মূল্যায়ন',
        category: 'শিক্ষা প্রযুক্তি (EdTech)',
        description: 'প্রাথমিক ও মাধ্যমিক পর্যায়ের শিক্ষার্থীদের পাঠদান সহজ করতে এআইচালিত ইন্টারেক্টিভ সহায়কের প্রভাব ও ফলাফল বিশ্লেষণ।',
        authorId: 'teacher-01',
        authorName: 'মাওলানা মাহমুদ হাসান',
        authorRole: 'সিনিয়র শিক্ষক',
        instituteName: 'নূরানী মাদ্রাসা ও একাডেমি',
        visibility: 'public',
        status: 'collaborating',
        tags: ['AI in Education', 'Curriculum', 'Smart Classroom'],
        progress: 65,
        contributors: [
            { id: 'c-1', name: 'মাওলানা মাহমুদ হাসান', role: 'লেখক/নেতৃত্ব', contributionType: 'রিসার্চ আর্কিটেকচার', contributedAt: '2026-08-10' },
            { id: 'c-2', name: 'মোঃ আব্দুল্লাহ', role: 'সহ-গবেষক', contributionType: 'ডাটা সংগ্রহ ও জরিপ', contributedAt: '2026-08-22' }
        ],
        createdAt: '2026-08-01',
        updatedAt: '2026-09-15'
    },
    {
        id: 'topic-arabic-stem-integration',
        title: 'আরবি ভাষা ও ইসলামিক কারিকুলামে স্টেম (STEM) পদ্ধতির আধুনিকায়ন',
        category: 'কারিকুলাম ডেভেলপমেন্ট',
        description: 'ক্লাসিক্যাল পাঠ্য বিষয়ের সাথে বিজ্ঞান, প্রযুক্তি ও যুক্তিবিদ্যার সমন্বয়মূলক বাস্তব প্রয়োগ পর্যবেক্ষণ ও শিক্ষক গাইডলাইন প্রণয়ন।',
        authorId: 'teacher-02',
        authorName: 'হাফেজ মোঃ তারেক আজিজ',
        authorRole: 'সহকারী শিক্ষক',
        instituteName: 'কমরপুর মডেল ক্যাডেট একাডেমি',
        visibility: 'public',
        status: 'active',
        tags: ['STEM', 'Arabic Language', 'Innovative Pedagogy'],
        progress: 40,
        contributors: [
            { id: 'c-3', name: 'হাফেজ মোঃ তারেক আজিজ', role: 'লেখক/নেতৃত্ব', contributionType: 'বিষয় নির্বাচন ও ফ্রেমওয়ার্ক', contributedAt: '2026-08-18' }
        ],
        createdAt: '2026-08-18',
        updatedAt: '2026-09-12'
    },
    {
        id: 'topic-student-psychology-attendance',
        title: 'অনাবাসিক ও আবাসিক শিক্ষার্থীদের উপস্থিতি ও মানসিক মনোযোগের তুলনামূলক সমীক্ষা',
        category: 'শিক্ষার্থী আচরণ ও মনোবিজ্ঞান',
        description: 'মাদ্রাসা ও স্কুল পরিবেশে শিক্ষার্থীদের মানসিক চাপ হ্রাস এবং উপস্থিতির হার ৯০%+ উন্নীতকরণের কার্যকর কৌশলপত্র।',
        authorId: 'teacher-03',
        authorName: 'ফারহানা ইয়াসমিন',
        authorRole: 'কাউন্সেলর ও সিনিয়র শিক্ষক',
        instituteName: 'সেন্ট্রাল এডুকেশন ক্যাম্পাস',
        visibility: 'public',
        status: 'in_review',
        tags: ['Mental Health', 'Attendance Analysis', 'Student Psychology'],
        progress: 85,
        contributors: [
            { id: 'c-4', name: 'ফারহানা ইয়াসমিন', role: 'লেখক/নেতৃত্ব', contributionType: 'ফিল্ড রিসার্চ ও কেস স্টাডি', contributedAt: '2026-07-20' },
            { id: 'c-5', name: 'নাসরিন সুলতানা', role: 'গবেষক', contributionType: 'ডাটা অ্যানালিটিক্স', contributedAt: '2026-08-05' },
            { id: 'c-6', name: 'মুফতি শফিকুর রহমান', role: 'উপদেষ্টা', contributionType: 'রিভিউ ও এডিটিং', contributedAt: '2026-08-30' }
        ],
        createdAt: '2026-07-15',
        updatedAt: '2026-09-18'
    }
];

const CATEGORIES = [
    'সকল ক্যাটাগরি',
    'শিক্ষা প্রযুক্তি (EdTech)',
    'কারিকুলাম ডেভেলপমেন্ট',
    'শিক্ষার্থী আচরণ ও মনোবিজ্ঞান',
    'প্রতিষ্ঠান ব্যবস্থাপনা',
    'ভাষা ও সাহিত্য',
    'সাধারণ বিজ্ঞান ও গণিত'
];

export default function ResearchPage() {
    const { user, activeRole, activeInstitute } = useSession();
    const isSuperAdmin = activeRole === 'SUPER_ADMIN';
    const isTeacherOrAdmin = activeRole === 'TEACHER' || activeRole === 'ADMIN' || isSuperAdmin;

    // State
    const [topics, setTopics] = useState<ResearchTopic[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('সকল ক্যাটাগরি');
    const [filterTab, setFilterTab] = useState<'all' | 'my-projects' | 'contributions' | 'open'>('all');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
    const [selectedTopicForContribution, setSelectedTopicForContribution] = useState<ResearchTopic | null>(null);
    const [isSuperAdminPanelOpen, setIsSuperAdminPanelOpen] = useState(false);

    // Form inputs for Create
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState('শিক্ষা প্রযুক্তি (EdTech)');
    const [newDescription, setNewDescription] = useState('');
    const [newTags, setNewTags] = useState('');
    const [newVisibility, setNewVisibility] = useState<'public' | 'invite-only' | 'private'>('public');

    // Form inputs for Contribute
    const [contributeNote, setContributeNote] = useState('');
    const [contributeType, setContributeType] = useState('ডাটা বিশ্লেষণ ও তথ্য সরবরাহ');

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Load persisted or initial topics
    useEffect(() => {
        try {
            const cached = localStorage.getItem('edusy_research_topics_v1');
            if (cached) {
                setTopics(JSON.parse(cached));
            } else {
                setTopics(INITIAL_RESEARCH_TOPICS);
                localStorage.setItem('edusy_research_topics_v1', JSON.stringify(INITIAL_RESEARCH_TOPICS));
            }
        } catch {
            setTopics(INITIAL_RESEARCH_TOPICS);
        }
    }, []);

    // Save topics
    const saveTopics = (newTopics: ResearchTopic[]) => {
        setTopics(newTopics);
        try {
            localStorage.setItem('edusy_research_topics_v1', JSON.stringify(newTopics));
        } catch (e) {
            console.error('Failed to cache topics:', e);
        }
    };

    // Keyboard action handler
    const handleKeyAction = useCallback((e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            action();
        }
    }, []);

    // Global keyboard shortcuts (Alt+N: New, /: Search, Escape: Close Modals)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement !== searchInputRef.current && !isCreateModalOpen && !isContributeModalOpen) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
                e.preventDefault();
                setIsCreateModalOpen(true);
            } else if (e.key === 'Escape') {
                if (isCreateModalOpen) setIsCreateModalOpen(false);
                if (isContributeModalOpen) setIsContributeModalOpen(false);
                if (isSuperAdminPanelOpen) setIsSuperAdminPanelOpen(false);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isCreateModalOpen, isContributeModalOpen, isSuperAdminPanelOpen]);

    // Filtered topics
    const filteredTopics = useMemo(() => {
        return topics.filter(t => {
            // Category filter
            if (selectedCategory !== 'সকল ক্যাটাগরি' && t.category !== selectedCategory) {
                return false;
            }

            // Tab filter
            const currentUserId = user?.id || 'current-user';
            if (filterTab === 'my-projects') {
                if (t.authorId !== currentUserId && !t.authorName.includes(user?.name || '---')) return false;
            } else if (filterTab === 'contributions') {
                const hasContributed = t.contributors.some(c => c.id === currentUserId || c.name === user?.name);
                if (!hasContributed) return false;
            } else if (filterTab === 'open') {
                if (t.status !== 'collaborating' && t.status !== 'active') return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchTitle = t.title.toLowerCase().includes(query);
                const matchDesc = t.description.toLowerCase().includes(query);
                const matchAuthor = t.authorName.toLowerCase().includes(query);
                const matchTags = t.tags.some(tag => tag.toLowerCase().includes(query));
                if (!matchTitle && !matchDesc && !matchAuthor && !matchTags) return false;
            }

            return true;
        });
    }, [topics, selectedCategory, filterTab, searchQuery, user]);

    // Handle Create Project / Topic
    const handleCreateTopic = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newTitle.trim()) {
            setToast({ message: 'অনুগ্রহ করে গবেষণার শিরোনাম লিখুন।', type: 'error' });
            return;
        }

        const newId = `topic-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const authorName = user?.name || (isSuperAdmin ? 'এডুসি সুপার অ্যাডমিন' : 'শিক্ষক গবেষক');
        const authorRole = isSuperAdmin ? 'সুপার অ্যাডমিন' : (activeRole === 'TEACHER' ? 'শিক্ষক' : 'অ্যাডমিন');

        const newTopicObj: ResearchTopic = {
            id: newId,
            title: newTitle.trim(),
            category: newCategory,
            description: newDescription.trim() || 'কোনো বিবরণ দেওয়া হয়নি।',
            authorId: user?.id || 'current-user',
            authorName,
            authorRole,
            instituteName: activeInstitute?.name || 'এডুসি নেটওয়ার্ক',
            visibility: newVisibility,
            status: 'collaborating',
            tags: newTags ? newTags.split(',').map(s => s.trim()).filter(Boolean) : ['Research'],
            progress: 10,
            contributors: [
                {
                    id: user?.id || 'current-user',
                    name: authorName,
                    role: 'উদ্যোক্তা / প্রধান গবেষক',
                    contributionType: 'প্রজেক্ট ইনিশিয়েশন',
                    contributedAt: new Date().toISOString().split('T')[0]
                }
            ],
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0]
        };

        const updated = [newTopicObj, ...topics];
        saveTopics(updated);
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewTags('');
        setToast({ message: 'নতুন গবেষণার প্রজেক্ট সফলভাবে তৈরি করা হয়েছে!', type: 'success' });
    };

    // Handle Contribute
    const handleContributeSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedTopicForContribution) return;
        if (!contributeNote.trim()) {
            setToast({ message: 'অনুগ্রহ করে অবদানের সারসংক্ষেপ বা নোট লিখুন।', type: 'error' });
            return;
        }

        const contributorName = user?.name || 'শিক্ষক গবেষক';
        const newContribution: ResearchContributor = {
            id: `c-${Date.now()}`,
            name: contributorName,
            role: 'সহ-গবেষক',
            contributionType: contributeType,
            contributedAt: new Date().toISOString().split('T')[0]
        };

        const updated = topics.map(t => {
            if (t.id === selectedTopicForContribution.id) {
                return {
                    ...t,
                    contributors: [...t.contributors, newContribution],
                    progress: Math.min(100, t.progress + 15),
                    updatedAt: new Date().toISOString().split('T')[0]
                };
            }
            return t;
        });

        saveTopics(updated);
        setIsContributeModalOpen(false);
        setContributeNote('');
        setSelectedTopicForContribution(null);
        setToast({ message: 'আপনার অবদান সফলভাবে যুক্ত করা হয়েছে!', type: 'success' });
    };

    // Super Admin Delete
    const handleDeleteTopic = (topicId: string) => {
        if (confirm('আপনি কি নিশ্চিত যে এই গবেষণার প্রজেক্টটি মুছে ফেলতে চান?')) {
            const updated = topics.filter(t => t.id !== topicId);
            saveTopics(updated);
            setToast({ message: 'প্রজেক্টটি মুছে ফেলা হয়েছে।', type: 'info' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/60 pb-16">
            {/* Top Notification Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#045c84] via-[#034664] to-[#022c40] text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8 shadow-md">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-200 text-xs font-bold mb-3 border border-white/10 backdrop-blur-sm">
                                <FlaskConical size={14} className="animate-pulse" />
                                <span>এডুসি শিক্ষক গবেষণা ও জ্ঞান আদানপ্রদান প্ল্যাটফর্ম</span>
                                {isSuperAdmin && (
                                    <span className="bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-black ml-1">
                                        সুপার অ্যাডমিন কন্ট্রোল
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                                <span>গবেষণা ও প্রজেক্ট হাব</span>
                                <span className="text-sm font-semibold text-cyan-200 bg-cyan-950/50 px-2.5 py-0.5 rounded-lg border border-cyan-800/40">
                                    Research Hub
                                </span>
                            </h1>
                            <p className="mt-2 text-sm text-slate-200 max-w-2xl leading-relaxed">
                                শিক্ষকবৃন্দ নিজস্ব গবেষণার বিষয় প্রস্তাব করতে পারবেন, সহকর্মীদের প্রজেক্টে অবদান রাখতে পারবেন এবং শিক্ষাব্যবস্থার উন্নয়নে যৌথভাবে কাজ করতে পারবেন।
                            </p>
                        </div>

                        {/* Top Primary Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                id="btn-create-topic"
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                onKeyDown={(e) => handleKeyAction(e, () => setIsCreateModalOpen(true))}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-900/30 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-300"
                                title="নতুন গবেষণার বিষয় যোগ করুন (Shortcut: Alt+N)"
                            >
                                <Plus size={18} />
                                <span>নতুন বিষয় তৈরি</span>
                                <kbd className="hidden sm:inline-block text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">Alt+N</kbd>
                            </button>

                            <button
                                id="btn-create-project"
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                onKeyDown={(e) => handleKeyAction(e, () => setIsCreateModalOpen(true))}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-sm backdrop-blur-sm transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30"
                                title="আমার নিজস্ব গবেষণামূলক প্রজেক্ট শুরু করুন"
                            >
                                <FolderKanban size={18} className="text-cyan-300" />
                                <span>আমার প্রজেক্ট তৈরি</span>
                            </button>

                            {isSuperAdmin && (
                                <button
                                    id="btn-manage-all-topics"
                                    type="button"
                                    onClick={() => setIsSuperAdminPanelOpen(true)}
                                    onKeyDown={(e) => handleKeyAction(e, () => setIsSuperAdminPanelOpen(true))}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-sm shadow-md transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    title="সুপার অ্যাডমিন ওভারভিউ ও ম্যানেজমেন্ট কন্ট্রোল প্যানেল"
                                >
                                    <ShieldCheck size={18} />
                                    <span>সুপার অ্যাডমিন ম্যানেজমেন্ট</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">মোট গবেষণার বিষয়</span>
                            <span className="text-xl font-black text-white mt-1 block">{topics.length} টি</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">সক্রিয় অবদানকারী</span>
                            <span className="text-xl font-black text-cyan-200 mt-1 block">
                                {topics.reduce((acc, t) => acc + t.contributors.length, 0)} জন
                            </span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">সহযোগিতার জন্য উন্মুক্ত</span>
                            <span className="text-xl font-black text-emerald-300 mt-1 block">
                                {topics.filter(t => t.status === 'collaborating').length} টি
                            </span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">পর্যালোচনায় রয়েছে</span>
                            <span className="text-xl font-black text-amber-300 mt-1 block">
                                {topics.filter(t => t.status === 'in_review').length} টি
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
                    {/* Controls Bar: Search, Category, Tabs & Utility Buttons */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                id="input-research-search"
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="বিষয়, ট্যাগ বা গবেষকের নাম দিয়ে খুঁজুন... (Shortcut: /)"
                                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                            />
                            {searchQuery && (
                                <button
                                    id="btn-clear-search"
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    onKeyDown={(e) => handleKeyAction(e, () => setSearchQuery(''))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    title="অনুসন্ধান মুছে ফেলুন"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Category Dropdown */}
                        <div className="flex items-center gap-3">
                            <div className="relative min-w-[200px]">
                                <select
                                    id="select-research-category-filter"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all cursor-pointer"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <Filter size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Utility Buttons */}
                            <button
                                id="btn-refresh-research-list"
                                type="button"
                                onClick={() => {
                                    setToast({ message: 'তালিকা রিফ্রেশ করা হয়েছে।', type: 'info' });
                                }}
                                onKeyDown={(e) => handleKeyAction(e, () => setToast({ message: 'তালিকা রিফ্রেশ করা হয়েছে।', type: 'info' }))}
                                className="p-2.5 text-slate-500 hover:text-[#045c84] hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                                title="তালিকা রিফ্রেশ করুন"
                            >
                                <RefreshCw size={18} />
                            </button>

                            <button
                                id="btn-export-research-list"
                                type="button"
                                onClick={() => {
                                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(topics, null, 2));
                                    const downloadAnchor = document.createElement('a');
                                    downloadAnchor.setAttribute("href", dataStr);
                                    downloadAnchor.setAttribute("download", `edusy_research_topics_${new Date().toISOString().split('T')[0]}.json`);
                                    document.body.appendChild(downloadAnchor);
                                    downloadAnchor.click();
                                    downloadAnchor.remove();
                                    setToast({ message: 'গবেষণার ডেটা এক্সপোর্ট সম্পন্ন হয়েছে!', type: 'success' });
                                }}
                                onKeyDown={(e) => handleKeyAction(e, () => setToast({ message: 'গবেষণার ডেটা এক্সপোর্ট সম্পন্ন হয়েছে!', type: 'success' }))}
                                className="p-2.5 text-slate-500 hover:text-[#045c84] hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                                title="JSON ফাইল হিসেবে এক্সপোর্ট করুন"
                            >
                                <Download size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 overflow-x-auto custom-scrollbar pb-1">
                        <button
                            id="btn-filter-all"
                            type="button"
                            onClick={() => setFilterTab('all')}
                            onKeyDown={(e) => handleKeyAction(e, () => setFilterTab('all'))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                filterTab === 'all'
                                    ? 'bg-[#045c84] text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            সকল বিষয় ({topics.length})
                        </button>

                        <button
                            id="btn-filter-my-projects"
                            type="button"
                            onClick={() => setFilterTab('my-projects')}
                            onKeyDown={(e) => handleKeyAction(e, () => setFilterTab('my-projects'))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                filterTab === 'my-projects'
                                    ? 'bg-[#045c84] text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            আমার প্রজেক্ট সমূহ
                        </button>

                        <button
                            id="btn-filter-contributions"
                            type="button"
                            onClick={() => setFilterTab('contributions')}
                            onKeyDown={(e) => handleKeyAction(e, () => setFilterTab('contributions'))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                filterTab === 'contributions'
                                    ? 'bg-[#045c84] text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            আমার অবদানকৃত বিষয়
                        </button>

                        <button
                            id="btn-filter-open-topics"
                            type="button"
                            onClick={() => setFilterTab('open')}
                            onKeyDown={(e) => handleKeyAction(e, () => setFilterTab('open'))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                filterTab === 'open'
                                    ? 'bg-[#045c84] text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            উন্মুক্ত গবেষণা ও সহযোগিতা
                        </button>
                    </div>
                </div>

                {/* Topics Cards List */}
                <div className="space-y-4">
                    {filteredTopics.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <BookOpen size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">কোনো গবেষণার বিষয় পাওয়া যায়নি</h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
                                আপনার ফিল্টার বা সার্চের সাথে মিল রয়েছে এমন কোনো প্রজেক্ট পাওয়া যায়নি। আপনি নিজেই একটি নতুন বিষয় শুরু করতে পারেন।
                            </p>
                            <button
                                id="btn-empty-create-topic"
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                onKeyDown={(e) => handleKeyAction(e, () => setIsCreateModalOpen(true))}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#045c84] hover:bg-[#034664] text-white rounded-xl font-bold text-sm shadow-md transition-all"
                            >
                                <Plus size={18} />
                                <span>নতুন গবেষণার বিষয় শুরু করুন</span>
                            </button>
                        </div>
                    ) : (
                        filteredTopics.map((topic) => {
                            const isAuthor = topic.authorId === user?.id || topic.authorName === user?.name;
                            const hasContributed = topic.contributors.some(c => c.id === user?.id || c.name === user?.name);

                            return (
                                <div
                                    key={topic.id}
                                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-[#045c84]/40 hover:shadow-md transition-all duration-200 group"
                                >
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Badges & Meta */}
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#045c84]/10 text-[#045c84]">
                                                    {topic.category}
                                                </span>

                                                {topic.status === 'collaborating' && (
                                                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                                        <Sparkles size={12} /> উন্মুক্ত অবদান (Open for Collaboration)
                                                    </span>
                                                )}
                                                {topic.status === 'in_review' && (
                                                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                                                        <Clock size={12} /> পর্যালোচনায় (In Review)
                                                    </span>
                                                )}
                                                {topic.status === 'completed' && (
                                                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
                                                        <CheckCircle2 size={12} /> সম্পন্ন (Completed)
                                                    </span>
                                                )}

                                                <span className="text-slate-400 text-xs">•</span>
                                                <span className="text-slate-500 text-xs font-medium">
                                                    শুরু: {topic.createdAt}
                                                </span>
                                            </div>

                                            {/* Topic Title */}
                                            <h2 className="text-lg font-bold text-slate-800 group-hover:text-[#045c84] transition-colors leading-snug">
                                                {topic.title}
                                            </h2>

                                            {/* Description */}
                                            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                                                {topic.description}
                                            </p>

                                            {/* Tags */}
                                            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                                                {topic.tags.map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                                                    >
                                                        <Tag size={10} className="text-slate-400" />
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Author and Contributors info */}
                                            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 flex-wrap text-xs text-slate-600">
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    <div className="w-5 h-5 rounded-full bg-[#045c84]/10 text-[#045c84] font-bold flex items-center justify-center text-[10px]">
                                                        {topic.authorName.charAt(0)}
                                                    </div>
                                                    <span>উদ্যোক্তা: <strong className="text-slate-800">{topic.authorName}</strong> ({topic.instituteName})</span>
                                                </div>

                                                <div className="flex items-center gap-1 text-slate-500">
                                                    <Users size={14} className="text-[#045c84]" />
                                                    <span>মোট অবদানকারী: <strong>{topic.contributors.length}</strong> জন</span>
                                                </div>

                                                {/* Progress indicator */}
                                                <div className="flex items-center gap-2 min-w-[120px]">
                                                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-emerald-500 h-full rounded-full transition-all"
                                                            style={{ width: `${topic.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500">{topic.progress}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons for this Topic */}
                                        <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0 pt-2 md:pt-0">
                                            {/* Contribute Button */}
                                            <button
                                                id={`btn-contribute-topic-${topic.id}`}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTopicForContribution(topic);
                                                    setIsContributeModalOpen(true);
                                                }}
                                                onKeyDown={(e) => handleKeyAction(e, () => {
                                                    setSelectedTopicForContribution(topic);
                                                    setIsContributeModalOpen(true);
                                                })}
                                                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 ${
                                                    hasContributed
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-[#045c84] hover:bg-[#034664] text-white'
                                                }`}
                                                title="এই গবেষণার বিষয়ে অবদান রাখুন"
                                            >
                                                <Share2 size={14} />
                                                <span>{hasContributed ? 'আরও অবদান রাখুন' : 'অবদান রাখুন'}</span>
                                            </button>

                                            {/* View Details Button */}
                                            <button
                                                id={`btn-view-details-${topic.id}`}
                                                type="button"
                                                onClick={() => {
                                                    setToast({
                                                        message: `প্রজেক্টের পূর্ণাঙ্গ বিবরণ ও রিসোর্স লোড হচ্ছে: ${topic.title}`,
                                                        type: 'info'
                                                    });
                                                }}
                                                onKeyDown={(e) => handleKeyAction(e, () => {
                                                    setToast({
                                                        message: `প্রজেক্টের পূর্ণাঙ্গ বিবরণ ও রিসোর্স লোড হচ্ছে: ${topic.title}`,
                                                        type: 'info'
                                                    });
                                                })}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#045c84] hover:bg-slate-50 border border-slate-200 transition-colors"
                                                title="বিস্তারিত দেখুন"
                                            >
                                                <span>বিস্তারিত</span>
                                                <ChevronRight size={14} />
                                            </button>

                                            {/* Super Admin / Author deletion control */}
                                            {(isSuperAdmin || isAuthor) && (
                                                <button
                                                    id={`btn-delete-topic-${topic.id}`}
                                                    type="button"
                                                    onClick={() => handleDeleteTopic(topic.id)}
                                                    onKeyDown={(e) => handleKeyAction(e, () => handleDeleteTopic(topic.id))}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="প্রজেক্ট মুছে ফেলুন"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal: Create Research Topic / Project */}
            {isCreateModalOpen && (
                <div
                    id="modal-create-research-topic"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
                >
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#045c84] to-[#034664] px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FlaskConical size={20} className="text-cyan-200" />
                                <h3 className="text-base font-bold">নতুন গবেষণার বিষয় / প্রজেক্ট প্রস্তাবনা</h3>
                            </div>
                            <button
                                id="btn-close-create-modal"
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                onKeyDown={(e) => handleKeyAction(e, () => setIsCreateModalOpen(false))}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                                title="বন্ধ করুন (Esc)"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreateTopic} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    গবেষণার শিরোনাম / প্রজেক্ট নাম <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="input-new-topic-title"
                                    type="text"
                                    required
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="উদা: মাধ্যমিক স্তরে গণিত শিক্ষায় ভিজ্যুয়াল টুলসের প্রভাব"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        ক্যাটাগরি
                                    </label>
                                    <select
                                        id="select-new-topic-category"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84]"
                                    >
                                        {CATEGORIES.filter(c => c !== 'সকল ক্যাটাগরি').map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        দৃশ্যমানতা (Visibility)
                                    </label>
                                    <select
                                        id="select-new-topic-visibility"
                                        value={newVisibility}
                                        onChange={(e) => setNewVisibility(e.target.value as any)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84]"
                                    >
                                        <option value="public">সবার জন্য উন্মুক্ত (Public)</option>
                                        <option value="invite-only">আমন্ত্রণভিত্তিক (Invite Only)</option>
                                        <option value="private">ব্যক্তিগত খসড়া (Draft)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    বিবরণ ও গবেষণার উদ্দেশ্য
                                </label>
                                <textarea
                                    id="textarea-new-topic-description"
                                    rows={3}
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="প্রজেক্টটির মূল উদ্দেশ্য, কর্মপরিকল্পনা ও কাঙ্ক্ষিত ফলাফল সম্পর্কে লিখুন..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    ট্যাগসমূহ (কমা দিয়ে আলাদা করুন)
                                </label>
                                <input
                                    id="input-new-topic-tags"
                                    type="text"
                                    value={newTags}
                                    onChange={(e) => setNewTags(e.target.value)}
                                    placeholder="EdTech, Pedagogy, Mathematics, AI"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#045c84]/20 focus:border-[#045c84] transition-all"
                                />
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    id="btn-cancel-new-topic"
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    onKeyDown={(e) => handleKeyAction(e, () => setIsCreateModalOpen(false))}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm transition-colors"
                                >
                                    বাতিল
                                </button>
                                <button
                                    id="btn-submit-new-topic"
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-[#045c84] hover:bg-[#034664] text-white font-bold text-sm shadow-md transition-all active:scale-95"
                                >
                                    প্রজেক্ট প্রকাশ করুন
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Contribute to Existing Topic */}
            {isContributeModalOpen && selectedTopicForContribution && (
                <div
                    id="modal-contribute-research-topic"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
                >
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Share2 size={20} className="text-emerald-200" />
                                <h3 className="text-base font-bold">গবেষণায় অবদান রাখুন (Contribute)</h3>
                            </div>
                            <button
                                id="btn-close-contribute-modal"
                                type="button"
                                onClick={() => setIsContributeModalOpen(false)}
                                onKeyDown={(e) => handleKeyAction(e, () => setIsContributeModalOpen(false))}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                                title="বন্ধ করুন (Esc)"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleContributeSubmit} className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">বিষয়</span>
                                <h4 className="text-sm font-bold text-slate-800 mt-0.5">{selectedTopicForContribution.title}</h4>
                                <span className="text-xs text-slate-500 mt-1 block">প্রধান গবেষক: {selectedTopicForContribution.authorName}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    অবদানের ধরন
                                </label>
                                <select
                                    id="select-contribute-type"
                                    value={contributeType}
                                    onChange={(e) => setContributeType(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                                >
                                    <option value="ডাটা বিশ্লেষণ ও তথ্য সরবরাহ">ডাটা বিশ্লেষণ ও তথ্য সরবরাহ</option>
                                    <option value="ফিল্ড স্টাডি ও কেস সার্ভে">ফিল্ড স্টাডি ও কেস সার্ভে</option>
                                    <option value="সাহিত্য পর্যালোচনা (Literature Review)">সাহিত্য পর্যালোচনা (Literature Review)</option>
                                    <option value="পর্যালোচনা ও সম্পাদনা (Peer Review)">পর্যালোচনা ও সম্পাদনা (Peer Review)</option>
                                    <option value="প্রযুক্তিগত বাস্তবায়ন">প্রযুক্তিগত বাস্তবায়ন</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    আপনার অবদান / নোট ও প্রস্তাবনা <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="textarea-contribute-note"
                                    rows={4}
                                    required
                                    value={contributeNote}
                                    onChange={(e) => setContributeNote(e.target.value)}
                                    placeholder="আপনার অনুসন্ধান, তথ্যসূত্র বা প্রজেক্টে যে অংশ নিয়ে কাজ করেছেন তা সংক্ষেপে লিখুন..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    id="btn-cancel-contribution"
                                    type="button"
                                    onClick={() => setIsContributeModalOpen(false)}
                                    onKeyDown={(e) => handleKeyAction(e, () => setIsContributeModalOpen(false))}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm transition-colors"
                                >
                                    বাতিল
                                </button>
                                <button
                                    id="btn-submit-contribution"
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
                                >
                                    অবদান নিশ্চিত করুন
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Super Admin Management Panel */}
            {isSuperAdminPanelOpen && (
                <div
                    id="modal-superadmin-management"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={22} className="text-amber-200" />
                                <div>
                                    <h3 className="text-base font-bold">এডুসি সুপার অ্যাডমিন রিসার্চ ম্যানেজমেন্ট</h3>
                                    <p className="text-xs text-amber-100">প্ল্যাটফর্মের সকল গবেষণা বিষয় ও শিক্ষক প্রজেক্ট পর্যবেক্ষণ ও নিয়ন্ত্রণ করুন</p>
                                </div>
                            </div>
                            <button
                                id="btn-close-superadmin-modal"
                                type="button"
                                onClick={() => setIsSuperAdminPanelOpen(false)}
                                onKeyDown={(e) => handleKeyAction(e, () => setIsSuperAdminPanelOpen(false))}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                                title="বন্ধ করুন (Esc)"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                                    <span className="text-xs font-bold text-amber-800">মোট প্রজেক্ট</span>
                                    <span className="text-xl font-black text-amber-900 block mt-1">{topics.length}</span>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                                    <span className="text-xs font-bold text-emerald-800">মোট গবেষক</span>
                                    <span className="text-xl font-black text-emerald-900 block mt-1">
                                        {topics.reduce((acc, t) => acc + t.contributors.length, 0)}
                                    </span>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                                    <span className="text-xs font-bold text-blue-800">গড় অগ্রগতি</span>
                                    <span className="text-xl font-black text-blue-900 block mt-1">
                                        {Math.round(topics.reduce((acc, t) => acc + t.progress, 0) / (topics.length || 1))}%
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">দ্রুত অ্যাডমিন অ্যাকশন</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        id="btn-admin-approve-all"
                                        type="button"
                                        onClick={() => {
                                            const updated = topics.map(t => ({ ...t, status: 'active' as const }));
                                            saveTopics(updated);
                                            setToast({ message: 'সকল প্রজেক্ট সফলভাবে অনুমোদিত হয়েছে!', type: 'success' });
                                        }}
                                        onKeyDown={(e) => handleKeyAction(e, () => {
                                            const updated = topics.map(t => ({ ...t, status: 'active' as const }));
                                            saveTopics(updated);
                                            setToast({ message: 'সকল প্রজেক্ট সফলভাবে অনুমোদিত হয়েছে!', type: 'success' });
                                        })}
                                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left flex items-start gap-3 transition-colors"
                                    >
                                        <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-xs font-bold text-slate-800 block">সকল বিষয় অনুমোদন করুন</span>
                                            <span className="text-[11px] text-slate-500">সকল পর্যালোচনায় থাকা বিষয় সক্রিয় করবে</span>
                                        </div>
                                    </button>

                                    <button
                                        id="btn-admin-reset-demo"
                                        type="button"
                                        onClick={() => {
                                            if (confirm('আপনি কি ডেমো ডেটা রিসেট করতে চান?')) {
                                                saveTopics(INITIAL_RESEARCH_TOPICS);
                                                setToast({ message: 'রিসার্চ ডেটা ডিফল্ট অবস্থায় আনা হয়েছে।', type: 'info' });
                                            }
                                        }}
                                        onKeyDown={(e) => handleKeyAction(e, () => {
                                            if (confirm('আপনি কি ডেমো ডেটা রিসেট করতে চান?')) {
                                                saveTopics(INITIAL_RESEARCH_TOPICS);
                                                setToast({ message: 'রিসার্চ ডেটা ডিফল্ট অবস্থায় আনা হয়েছে।', type: 'info' });
                                            }
                                        })}
                                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left flex items-start gap-3 transition-colors"
                                    >
                                        <RefreshCw size={20} className="text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-xs font-bold text-slate-800 block">ডিফল্ট ডেটায় রিসেট করুন</span>
                                            <span className="text-[11px] text-slate-500">প্রাথমিক গবেষণার নমুনা প্রজেক্ট লোড করবে</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end pt-3 border-t border-slate-100">
                                <button
                                    id="btn-close-superadmin-panel"
                                    type="button"
                                    onClick={() => setIsSuperAdminPanelOpen(false)}
                                    onKeyDown={(e) => handleKeyAction(e, () => setIsSuperAdminPanelOpen(false))}
                                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors"
                                >
                                    প্যানেল বন্ধ করুন
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
