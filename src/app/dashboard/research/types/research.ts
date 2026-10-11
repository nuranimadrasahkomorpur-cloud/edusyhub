export type ResearchStatus = 
    | 'Idea' 
    | 'Draft'
    | 'Researching' 
    | 'Running' 
    | 'Tested' 
    | 'Validated' 
    | 'Improved' 
    | 'Failed'
    | 'Archived';

export type ResearchType = 
    | 'Teaching Method'
    | 'Student Activity'
    | 'Writing Improvement'
    | 'Reading Improvement'
    | 'Memorization'
    | 'Concept Understanding'
    | 'Classroom Management'
    | 'Assessment'
    | 'Other';

export type PerformanceRating = 'Very well' | 'Good' | 'Mixed' | 'Difficult' | 'Failed';

export interface ResearchContributor {
    id: string;
    name: string;
    role: string;
    instituteName?: string;
    contributionType: string;
    contributedAt: string;
}

export interface MistakeItem {
    id: string;
    humanId: string; // e.g. MST-2026-001
    description: string;
    studentCount: number;
    causeHypothesis: string;
    evidenceImageUrl?: string;
    recordedAt: string;
}

export interface ProblemSolutionItem {
    id: string;
    humanId: string; // e.g. PRB-2026-001
    problemTitle: string;
    observedInCount: number;
    possibleCause: string;
    teacherSolution: string;
    isEffective: 'yes' | 'partially' | 'no';
    resultAfterCorrection: string;
    recordedAt: string;
}

export interface HandwritingMetrics {
    letterFormation: number; // 1 - 5
    alignment: number;       // 1 - 5
    spacing: number;         // 1 - 5
    sizeConsistency: number; // 1 - 5
    writingControl: number;  // 1 - 5
}

export interface BeforeAfterEvidence {
    id: string;
    humanId: string; // e.g. EVD-2026-001
    title: string;
    studentName?: string;
    beforeImageUrl: string;
    beforeDate: string;
    beforeDayNumber: number;
    afterImageUrl: string;
    afterDate: string;
    afterDayNumber: number;
    metricsBefore?: HandwritingMetrics;
    metricsAfter?: HandwritingMetrics;
    aiImageAnalysis?: string;
    notes?: string;
}

export interface ResearchDayActivity {
    id: string;
    humanId: string; // e.g. ACT-2026-001
    dayNumber: number;
    title: string;
    objective: string;
    teacherInstructions: string[];
    studentTask: string;
    expectedResult: string;
    estimatedMinutes: number;
    materials: string[];
    status: 'pending' | 'running' | 'completed';
    startedAt?: string;
    completedAt?: string;
    actualMinutesSpent?: number;
    participantCount?: number;
    
    // Post-activity feedback
    performance?: PerformanceRating;
    observedProblems: string[];
    teacherObservation?: string;
    mistakes: MistakeItem[];
    solutions: ProblemSolutionItem[];
}

export interface BookCurriculumInfo {
    board: string;
    grade: string;
    subject: string;
    bookName: string;
    chapter: string;
    lesson?: string;
    pageNumber?: string;
}

export interface SourceDocument {
    id: string;
    humanId: string; // e.g. SRC-2026-001
    title: string;
    type: 'text' | 'book_page' | 'worksheet' | 'photo';
    content?: string;
    fileUrl?: string;
    pageNumber?: string;
    uploadedAt: string;
}

export interface FinalReport {
    durationDays: number;
    participatingStudents: number;
    activitiesCount: number;
    problemsFoundCount: number;
    problemsSolvedCount: number;
    whatWorked: string;
    whatDidNotWork: string;
    keyPrerequisites: string;
    teacherConclusion: string;
    aiSynthesizedSummary?: string;
    completedAt?: string;
}

export interface ResearchTopic {
    id: string;
    humanId: string; // e.g. TOP-2026-001
    title: string;
    problemToSolve: string;
    category: string;
    researchType: ResearchType;
    status: ResearchStatus;
    visibility: 'public' | 'invite-only' | 'private';
    
    // Curriculum connection
    bookInfo: BookCurriculumInfo;
    
    // Progress
    totalDays: number;
    currentDayNumber: number;
    progress: number; // 0 - 100
    
    // Execution and Days
    days: ResearchDayActivity[];
    sources: SourceDocument[];
    evidenceList: BeforeAfterEvidence[];
    finalReport?: FinalReport;
    
    // Metadata
    authorId: string;
    authorName: string;
    authorRole: string;
    instituteName: string;
    tags: string[];
    fieldTestedCount: number;
    completedCount: number;
    improvedVersionCount: number;
    contributors: ResearchContributor[];
    
    createdAt: string;
    updatedAt: string;
}
