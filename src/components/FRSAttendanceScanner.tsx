'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as faceapi from '@vladmandic/face-api';
import {
    Camera,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Loader2,
    Users,
    ChevronDown,
    Zap,
    History,
    Search,
    Upload,
    Clock,
    UserCheck,
    Check,
    CheckSquare,
    Volume2,
    Play,
    Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useSession } from './SessionProvider';
import { usePerformance } from '../hooks/usePerformance';
import { Lock } from 'lucide-react';
import { getCleanId } from '@/utils/digit-utils';

interface EnrolledStudent {
    id: string;
    name: string;
    classId: string;
    faceDescriptor: any;
    photo?: string;
    stats?: {
        totalDays: number;
        totalSchoolDays: number;
        presentDays: number;
        percentage: number;
    };
}

type AttendanceStatus = 'IDLE' | 'LOADING_MODELS' | 'LOADING_STUDENTS' | 'INITIALIZING' | 'SCANNING' | 'ERROR';

// Global scope
let modelsLoadingPromise: Promise<void> | null = null;

export default function FRSAttendanceScanner({ classId: propClassId, selectedDate }: { classId?: string, selectedDate?: string }) {
    const { activeInstitute, user, activeRole } = useSession();

    // Permission check — same logic as ManualAttendance
    const hasAttendancePerm = useMemo(() => {
        const isOwner = (activeInstitute?.adminIds || []).includes(user?.id) || activeInstitute?.isOwner === true;
        if (isOwner) return true;
        if (!user?.teacherProfiles || !activeInstitute?.id) return false;
        const profile = (user.teacherProfiles || []).find((p: any) => p.instituteId === activeInstitute.id);
        if (!profile || profile.status !== 'ACTIVE') return false;
        if (profile.isAdmin === true) return true;
        const targetClassId = getCleanId(propClassId);
        if (!targetClassId || targetClassId === 'all') return profile.isAdmin === true;
        const classPerm = profile.permissions?.classWise?.[targetClassId];
        if (!classPerm) return false;
        if (typeof classPerm === 'object' && Array.isArray(classPerm.permissions)) return classPerm.permissions.includes('canTakeAttendance');
        if (Array.isArray(classPerm)) return classPerm.includes('canTakeAttendance');
        if (typeof classPerm === 'object') return classPerm.canTakeAttendance === true;
        return false;
    }, [user, activeInstitute, propClassId]);

    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>(propClassId || '');
    const [students, setStudents] = useState<EnrolledStudent[]>([]);
    const [status, setStatus] = useState<AttendanceStatus>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
    const [markedStudents, setMarkedStudents] = useState<Set<string>>(new Set());
    const [recentMatches, setRecentMatches] = useState<{
        id: string;
        name: string;
        time: string;
        photo?: string;
        isAlreadyMarked?: boolean;
        status?: 'PRESENT' | 'LATE' | 'LEAVE';
        timestamp: number;
    }[]>([]);
    const [scannerMarkMode, setScannerMarkMode] = useState<'PRESENT' | 'LATE' | 'LEAVE'>('PRESENT');
    const [isTestMode, setIsTestMode] = useState(false);
    const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState<'PRESENT' | 'LATE' | 'LEAVE' | 'ABSENT'>('ABSENT');
    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(false);
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
    const [toast, setToast] = useState<{ message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' } | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const { isLowCapacity } = usePerformance();

    const markedStudentsRef = useRef<Set<string>>(markedStudents);
    useEffect(() => {
        markedStudentsRef.current = markedStudents;
    }, [markedStudents]);

    const showToast = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' = 'SUCCESS') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Multi-device sync states
    const [deviceId] = useState(() => Math.random().toString(36).substring(2, 10));
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { deviceId: string, timestamp: Date, status: string }>>({});
    const [ambiguousMatches, setAmbiguousMatches] = useState<EnrolledStudent[]>([]);
    const [isProcessingLocked, setIsProcessingLocked] = useState(false);
    const isProcessingLockedRef = useRef(false);
    useEffect(() => {
        isProcessingLockedRef.current = isProcessingLocked;
    }, [isProcessingLocked]);
    const [matchingState, setMatchingState] = useState<{
        status: 'IDLE' | 'MATCHING' | 'MATCHED' | 'ALREADY_DONE';
        studentName?: string;
    }>({ status: 'IDLE' });
    const ignoredFaces = useRef<{ [descriptorHash: string]: number }>({});
    const consensusTracker = useRef<{ [studentId: string]: { frames: number, angles: Set<number> } }>({});
    const alreadyWarningCooldown = useRef<{ [key: string]: number }>({});

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const uploadImgRef = useRef<HTMLInputElement>(null);
    const markingCooldown = useRef<{ [key: string]: number }>({});

    useEffect(() => {
        if (ambiguousMatches.length > 0) {
            if (videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
            }
        } else {
            if (videoRef.current && videoRef.current.paused && isCameraActive && !isPaused) {
                videoRef.current.play().catch(e => console.error('Video play error:', e));
            }
        }
    }, [ambiguousMatches, isCameraActive, isPaused]);


    // Web Audio API Context & Buffers
    // Audio refs for HTML5 Audio
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

    const initAudio = () => {
        if (Object.keys(audioRefs.current).length > 0) return;

        try {
            const successAudio = new Audio('/audio/success.mp3');
            const failAudio = new Audio('/audio/denied.mp3');
            const alreadyAudio = new Audio('/audio/already_have.wav');

            // Preload
            successAudio.load();
            failAudio.load();
            alreadyAudio.load();

            audioRefs.current = {
                success: successAudio,
                fail: failAudio,
                already: alreadyAudio
            };
            console.log('Audio elements initialized');
        } catch (err) {
            console.error('Audio initialization failed:', err);
        }
    };

    // Sync prop classId if provided
    useEffect(() => {
        if (propClassId !== undefined) {
            setSelectedClassId(propClassId);
        }
    }, [propClassId]);

    useEffect(() => {
        if (!activeInstitute) {
            setStatus('IDLE');
            return;
        }

        // Handle class list fetching separately or only when strictly needed
        if (!propClassId && classes.length === 0) {
            fetchClasses();
        }

        // Unified fetch for students/attendance
        const targetClass = propClassId !== undefined ? propClassId : selectedClassId;
        fetchEnrolledStudents(targetClass);

        // Reset models if needed or just ensured they are loaded
        loadModels();
    }, [activeInstitute, propClassId, selectedClassId, selectedDate]);

    const fetchClasses = async () => {
        try {
            const res = await fetch(`/api/admin/classes?instituteId=${activeInstitute?.id}`);
            if (res.ok) {
                const data = await res.json();
                setClasses(data);
                if (data.length > 0 && !selectedClassId && !propClassId) {
                    setSelectedClassId(data[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    };

    const fetchEnrolledStudents = async (forcedClassId?: string) => {
        if (!activeInstitute?.id) return;
        const targetClassId = forcedClassId !== undefined ? forcedClassId : selectedClassId;

        setStatus('LOADING_STUDENTS');
        try {
            // Use provided selectedDate or fallback to current local date if absolutely missing
            const today = selectedDate || new Date().toISOString().split('T')[0];
            const fetchClassId = targetClassId || 'all';

            const [studentsRes, attendanceRes, statsRes] = await Promise.all([
                fetch(`/api/admin/users?role=STUDENT&instituteId=${activeInstitute.id}&classId=${fetchClassId}&includeFaceData=true`),
                fetch(`/api/attendance/list?instituteId=${activeInstitute.id}&date=${today}&classId=${fetchClassId}`),
                fetch(`/api/attendance/stats?instituteId=${activeInstitute.id}&classId=${fetchClassId}`)
            ]);

            if (studentsRes.ok) {
                const data = await studentsRes.json();
                const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
                const statsData = statsRes.ok ? await statsRes.json() : [];

                const normalizeId = (id: any): string => {
                    if (!id) return '';
                    if (typeof id === 'string') return id;
                    if (typeof id === 'object') {
                        if (id.$oid) return id.$oid;
                        if (id.toString && typeof id.toString === 'function') return id.toString();
                    }
                    return String(id);
                };

                const statsMap = new Map(statsData.map((s: any) => [normalizeId(s.studentId), s]));

                const fullStudents = data.map((s: any) => ({
                    id: normalizeId(s.id),
                    name: s.name,
                    classId: s.metadata?.classId,
                    faceDescriptor: s.faceDescriptor,
                    photo: s.metadata?.studentPhoto || s.metadata?.photo || s.photo,
                    stats: statsMap.get(normalizeId(s.id))
                }));

                const enrolled = fullStudents.filter((s: any) => s.faceDescriptor && s.faceDescriptor.length > 0);
                setStudents(fullStudents);

                if (attendanceRes.ok) {
                    const present = attendanceData.filter((a: any) => ['PRESENT', 'LATE', 'LEAVE'].includes(a.status));
                    const presentIds = present.map((a: any) => normalizeId(a.studentId));

                    const newRecords: Record<string, { deviceId: string, timestamp: Date, status: string }> = {};
                    present.forEach((a: any) => {
                        const sId = normalizeId(a.studentId);
                        if (sId) {
                            newRecords[sId] = {
                                deviceId: a.remarks || 'unknown',
                                timestamp: new Date(a.createdAt || a.updatedAt || Date.now()),
                                status: a.status
                            };
                        }
                    });

                    setAttendanceRecords(newRecords);
                    setMarkedStudents(new Set(presentIds.filter(Boolean)));
                }

                if (enrolled.length > 0) {
                    const labeledDescriptors = enrolled.map((s: any) => {
                        let descArray = [];
                        if (s.faceDescriptor && s.faceDescriptor.length > 0) {
                            if (Array.isArray(s.faceDescriptor[0])) {
                                descArray = s.faceDescriptor.map((d: number[]) => new Float32Array(d));
                            } else {
                                descArray = [new Float32Array(s.faceDescriptor)];
                            }
                        }
                        return new faceapi.LabeledFaceDescriptors(s.id, descArray.length > 0 ? descArray : [new Float32Array(128)]);
                    });
                    setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.38));
                } else {
                    setFaceMatcher(null);
                }
            }
            setStatus('IDLE');
        } catch (err) {
            console.error('Error fetching enrolled students:', err);
            setError('ছাত্রদের তথ্য লোড করতে সমস্যা হয়েছে।');
            setStatus('IDLE');
        }
    };

    const classStudents = useMemo(() => {
        // propClassId is explicitly passed from Dashboard. It can be '' for "All classes".
        // Only fallback to internal selectedClassId if propClassId is strictly undefined.
        const targetClass = propClassId !== undefined ? propClassId : selectedClassId;
        if (!targetClass) return students; // Returns all students if targetClass is ''
        return students.filter(s => s.classId === targetClass);
    }, [students, propClassId, selectedClassId]);

    const classMarkedStudents = useMemo(() => {
        const targetClass = propClassId !== undefined ? propClassId : selectedClassId;
        const markedArray = Array.from(markedStudents);

        return new Set(
            markedArray.filter(id => {
                const sId = String(id);
                const student = students.find(s => s.id === sId);
                if (!student) return false;
                if (!targetClass) return true;
                return student.classId === targetClass;
            })
        );
    }, [markedStudents, students, propClassId, selectedClassId]);

    const loadModels = async () => {
        if (modelsLoaded) return;
        try {
            if (!modelsLoadingPromise) {
                modelsLoadingPromise = Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]).then(() => { });
            }
            await modelsLoadingPromise;
            setModelsLoaded(true);
        } catch (err) {
            console.error('Error loading face-api models:', err);
            setError('AI মডেল লোড করতে সমস্যা হয়েছে।');
        }
    };

    const playSound = (type: 'success' | 'fail' | 'already') => {
        try {
            const audio = audioRefs.current[type];
            if (!audio) return;

            // Clone the audio node so it can play independently without cutting off 
            // any currently playing instances of the same sound
            const clone = audio.cloneNode() as HTMLAudioElement;
            clone.volume = 1.0;
            
            const playPromise = clone.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.error('Audio play failed:', e));
            }
            
            // Clean up memory after playing
            clone.onended = () => {
                clone.remove();
            };
        } catch (e) {
            console.error('Audio playback error:', e);
        }
    };

    const startScanner = async () => {
        // Allow starting even if selectedClassId is '' (All Classes)
        if (selectedClassId === null && !isTestMode) {
            setError('দয়া করে একটি ক্লাস নির্বাচন করুন।');
            return;
        }

        setError(null);
        setStatus('INITIALIZING');


        try {
            initAudio();
            await loadModels();

            // Use more robust constraints - modern browser fallback
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
                setStatus('SCANNING');
                setIsTestMode(false);
                setIsPaused(false);
            }
        } catch (err: any) {
            console.error('Error accessing camera:', err);
            setError(err.name === 'NotAllowedError' ? 'PERMISSION_DENIED' : 'ক্যামেরা সংযোগ বিচ্ছিন্ন। আবার চেষ্টা করুন।');
            setStatus('ERROR');
            setIsCameraActive(false);
        }
    };

    const toggleCamera = () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);
        if (isCameraActive) {
            stopScanner();
            setTimeout(() => {
                startScannerWithMode(newMode);
            }, 300);
        }
    };

    const startScannerWithMode = async (mode: 'user' | 'environment') => {
        setError(null);
        setStatus('INITIALIZING');
        try {
            initAudio();
            await loadModels();
            const constraints = {
                video: {
                    facingMode: mode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
                setStatus('SCANNING');
                setIsTestMode(false);
                setIsPaused(false);
            }
        } catch (err: any) {
            console.error('Error accessing camera:', err);
            setError(err.name === 'NotAllowedError' ? 'PERMISSION_DENIED' : 'ক্যামেরা সংযোগ বিচ্ছিন্ন। আবার চেষ্টা করুন।');
            setStatus('ERROR');
            setIsCameraActive(false);
        }
    };

    const stopScanner = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            setIsCameraActive(false);
            setStatus('IDLE');
            setIsTestMode(false);
        }
    };

    const pathname = usePathname();

    // Auto-stop camera completely when moving to another page in the dashboard 
    // to prevent background CPU/RAM usage and turn off the webcam light!
    useEffect(() => {
        if (pathname && !pathname.includes('/attendance/scan') && isCameraActive) {
            stopScanner();
        }
    }, [pathname, isCameraActive]);

    // Real-time Sync Polling
    useEffect(() => {
        if (!activeInstitute) return;
        const interval = setInterval(async () => {
            try {
                const today = selectedDate || new Date().toISOString().split('T')[0];
                const res = await fetch(`/api/attendance/list?instituteId=${activeInstitute.id}&date=${today}`);
                if (res.ok) {
                    const data = await res.json();
                    const normalizeId = (id: any) => {
                        if (!id) return '';
                        if (typeof id === 'string') return id;
                        if (typeof id === 'object') {
                            if (id.$oid) return id.$oid;
                            if (id.toString) return id.toString();
                        }
                        return String(id);
                    };

                    const present = data.filter((a: any) => ['PRESENT', 'LATE', 'LEAVE'].includes(a.status));

                    setMarkedStudents(prevMarked => {
                        const nextMarked = new Set(prevMarked);
                        let changed = false;
                        present.forEach((a: any) => {
                            const sId = normalizeId(a.studentId);
                            if (!nextMarked.has(sId)) {
                                nextMarked.add(sId);
                                changed = true;
                            }
                        });
                        return changed ? nextMarked : prevMarked;
                    });

                    setAttendanceRecords(prevRec => {
                        const nextRec = { ...prevRec };
                        let changed = false;
                        present.forEach((a: any) => {
                            const sId = normalizeId(a.studentId);
                            if (!nextRec[sId] || nextRec[sId].deviceId !== a.remarks) {
                                nextRec[sId] = {
                                    deviceId: a.remarks || 'unknown',
                                    timestamp: new Date(a.createdAt || a.updatedAt),
                                    status: a.status
                                };
                                changed = true;
                            }
                        });
                        return changed ? nextRec : prevRec;
                    });
                }
            } catch (e) {
                console.error('Sync error', e);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeInstitute, selectedDate]);



    const markAttendance = async (studentId: string, studentName: string, overrideClassId?: string) => {
        const now = new Date();
        const nowTime = now.getTime();

        if (markingCooldown.current[studentId] && nowTime - markingCooldown.current[studentId] < 5000) {
            return;
        }
        markingCooldown.current[studentId] = nowTime;

        // NEW: Check for existing attendance to prevent duplicates and keep original time
        const existingRecord = attendanceRecords[studentId];

        try {
            const dateString = selectedDate || now.toISOString().split('T')[0];
            const deviceId = localStorage.getItem('attendance_device_id') || 'unknown';

            // Find class settings for auto-late detection
            const targetClassId = overrideClassId || selectedClassId || students.find(s => s.id === studentId)?.classId;
            const targetClass = classes.find(c => c.id === targetClassId);

            let status: 'PRESENT' | 'LATE' | 'LEAVE' = scannerMarkMode;

            if (existingRecord) {
                const newMatch = {
                    id: studentId,
                    name: studentName,
                    time: new Date(existingRecord.timestamp).toLocaleTimeString('bn-BD'),
                    photo: students.find(s => s.id === studentId)?.photo,
                    isAlreadyMarked: true,
                    status: existingRecord.status as any,
                    timestamp: Date.now()
                };
                setRecentMatches(prev => [newMatch, ...prev.filter(m => m.id !== studentId)].slice(0, 3));
                playSound('already');
                setTimeout(() => {
                    setRecentMatches(prev => prev.filter(m => m.timestamp !== newMatch.timestamp));
                }, 5000);
                return;
            }

            // Only auto-calculate if user hasn't explicitly picked a special mode (Late/Leave)
            if (scannerMarkMode === 'PRESENT' && targetClass?.startTime) {
                const [startHour, startMin] = targetClass.startTime.split(':').map(Number);
                const threshold = targetClass.lateThreshold || 15;
                const startTimeToday = new Date(now);
                startTimeToday.setHours(startHour, startMin, 0, 0);
                const lateLimit = new Date(startTimeToday.getTime() + threshold * 60000);
                if (now > lateLimit) status = 'LATE';
            }

            const response = await fetch('/api/attendance/mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    instituteId: activeInstitute?.id,
                    classId: targetClassId,
                    dateString,
                    status,
                    method: 'FRS',
                    remarks: deviceId
                }),
            });

            if (response.ok) {
                playSound('success');
                setMarkedStudents(prev => new Set(prev).add(studentId));
                setAttendanceRecords(prev => ({
                    ...prev,
                    [studentId]: { deviceId, timestamp: new Date(), status }
                }));

                const newMatch = {
                    id: studentId,
                    name: studentName,
                    time: new Date().toLocaleTimeString('bn-BD'),
                    photo: students.find(s => s.id === studentId)?.photo,
                    isAlreadyMarked: false,
                    status,
                    timestamp: Date.now()
                };
                setRecentMatches(prev => [newMatch, ...prev.filter(m => m.id !== studentId)].slice(0, 3));
                setTimeout(() => {
                    setRecentMatches(prev => prev.filter(m => m.timestamp !== newMatch.timestamp));
                }, 5000);
            }
        } catch (err) {
            console.error('Error marking attendance:', err);
        }
    };

    const markAttendanceRef = useRef(markAttendance);
    useEffect(() => {
        markAttendanceRef.current = markAttendance;
    });

    const unmarkAttendance = async (studentId: string) => {
        try {
            const dateString = selectedDate || new Date().toISOString().split('T')[0];

            const response = await fetch('/api/attendance/unmark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, dateString }),
            });

            if (response.ok) {
                setMarkedStudents(prev => {
                    const next = new Set(prev);
                    next.delete(studentId);
                    return next;
                });
                setAttendanceRecords(prev => {
                    const next = { ...prev };
                    delete next[studentId];
                    return next;
                });
                // Optional: success toast could go here
            } else {
                const errorData = await response.json();
                showToast(`হাজিরা বাতিল করা যায়নি: ${errorData.error || 'Unknown error'}`, 'ERROR');
            }
        } catch (error) {
            console.error('Error unmarking attendance:', error);
            showToast('সার্ভারে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।', 'ERROR');
        }
    };

    const runDataAnalysis = async () => {
        const pendingStudents = students.filter(s => (!s.faceDescriptor || s.faceDescriptor.length === 0) && s.photo);
        if (pendingStudents.length === 0) {
            showToast('বিশ্লেষণ করার মতো কোনো নতুন শিক্ষার্থী পাওয়া যায়নি।', 'INFO');
            return;
        }

        if (!modelsLoaded) {
            showToast('মডেল লোড হওয়া পর্যন্ত অপেক্ষা করুন।', 'INFO');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisProgress({ current: 0, total: pendingStudents.length });

        let successCount = 0;
        const updatedStudents = [...students];

        try {
            for (let i = 0; i < pendingStudents.length; i++) {
                const student = pendingStudents[i];
                setAnalysisProgress({ current: i + 1, total: pendingStudents.length });

                try {
                    const img = await faceapi.fetchImage(student.photo!);
                    const detection = await faceapi
                        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (detection) {
                        const descriptor = Array.from(detection.descriptor);
                        const res = await fetch(`/api/students/${student.id}/face`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ descriptor })
                        });

                        if (res.ok) {
                            successCount++;
                            const index = updatedStudents.findIndex(s => s.id === student.id);
                            if (index !== -1) {
                                updatedStudents[index] = { ...updatedStudents[index], faceDescriptor: descriptor };
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Failed to analyze student ${student.id}:`, err);
                }
            }

            setStudents(updatedStudents);

            // Re-initialize FaceMatcher
            const enrolled = updatedStudents.filter((s: any) => s.faceDescriptor && s.faceDescriptor.length > 0);
            if (enrolled.length > 0) {
                const labeledDescriptors = enrolled.map((s: any) => {
                    let descArray = [];
                    if (s.faceDescriptor && s.faceDescriptor.length > 0) {
                        if (Array.isArray(s.faceDescriptor[0])) {
                            descArray = s.faceDescriptor.map((d: number[]) => new Float32Array(d));
                        } else {
                            descArray = [new Float32Array(s.faceDescriptor)];
                        }
                    }
                    return new faceapi.LabeledFaceDescriptors(s.id, descArray.length > 0 ? descArray : [new Float32Array(128)]);
                });
                setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.38));
            }

            showToast(`${successCount} জন শিক্ষার্থীর ফেস ডেটা সফলভাবে বিশ্লেষণ করা হয়েছে।`, 'SUCCESS');
        } catch (err) {
            console.error('Data analysis failed:', err);
            showToast('বিশ্লেষণ করার সময় একটি সমস্যা হয়েছে।', 'ERROR');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeInstitute) return;
        setError(null);
        setIsProcessingPhoto(true);

        try {
            await loadModels();
            const img = await faceapi.bufferToImage(file);
            let currentMatcher = faceMatcher;
            let currentStudents = students;

            if (isTestMode) {
                const res = await fetch(`/api/admin/users?role=STUDENT&instituteId=${activeInstitute.id}&includeFaceData=true`);
                if (res.ok) {
                    const data = await res.json();
                    const enrolled = data
                        .filter((s: any) => s.faceDescriptor && s.faceDescriptor.length > 0)
                        .map((s: any) => ({
                            id: s.id,
                            name: s.name,
                            classId: s.metadata?.classId,
                            faceDescriptor: s.faceDescriptor,
                            photo: s.metadata?.studentPhoto || s.metadata?.photo || s.photo
                        }));
                    currentStudents = enrolled;
                    const labeledDescriptors = enrolled.map((s: any) => {
                        let descArray = [];
                        if (Array.isArray(s.faceDescriptor[0])) {
                            descArray = s.faceDescriptor.map((d: number[]) => new Float32Array(d));
                        } else {
                            descArray = [new Float32Array(s.faceDescriptor)];
                        }
                        return new faceapi.LabeledFaceDescriptors(s.id, descArray.length > 0 ? descArray : [new Float32Array(128)]);
                    });
                    currentMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
                }
            }

            if (!currentMatcher) {
                showToast('কোনো এনরোলড ছাত্র পাওয়া যায়নি।', 'ERROR');
                return;
            }

            const detections = await faceapi
                .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (detections.length === 0) {
                showToast('ছবিতে কোনো মুখ পাওয়া যায়নি।', 'ERROR');
            } else {
                setStatus('SCANNING');
                if (canvasRef.current) {
                    const displaySize = { width: 640, height: 480 };
                    faceapi.matchDimensions(canvasRef.current, displaySize);
                    const ctx = canvasRef.current.getContext('2d');
                    ctx?.drawImage(img, 0, 0, 640, 480);
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    resizedDetections.forEach(detection => {
                        const result = currentMatcher!.findBestMatch(detection.descriptor);
                        const label = result.label;
                        const student = currentStudents.find(s => s.id === label);
                        const box = detection.detection.box;
                        const drawBox = new faceapi.draw.DrawBox(box, {
                            label: student ? student.name : 'অচেনা',
                            boxColor: student ? '#10b981' : '#f43f5e'
                        });
                        drawBox.draw(canvasRef.current!);
                        if (student) {
                            markAttendance(student.id, student.name, student.classId);
                        } else {
                            playSound('fail');
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Photo upload error:', err);
            setError('ছবি প্রসেস করতে সমস্যা হয়েছে।');
        } finally {
            setIsProcessingPhoto(false);
            if (uploadImgRef.current) uploadImgRef.current.value = '';
            setTimeout(() => {
                const ctx = canvasRef.current?.getContext('2d');
                ctx?.clearRect(0, 0, canvasRef.current?.width || 640, canvasRef.current?.height || 480);
                setStatus('IDLE');
                setIsTestMode(false);
                setIsCameraActive(false);
            }, 5000);
        }
    };

    const handleSelectMatch = async (student: EnrolledStudent) => {
        markAttendance(student.id, student.name, student.classId);
        setAmbiguousMatches([]);
        
        // Clear stuck canvas boxes immediately
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        
        // Wait 2 seconds before rescanning
        setTimeout(() => {
            setIsProcessingLocked(false);
        }, 2000);

        // Improve future matching
        const descriptor = (videoRef.current as any)?.currentAmbiguousDescriptor;
        if (descriptor) {
            try {
                const res = await fetch(`/api/students/${student.id}/face`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descriptor, action: 'append' })
                });
                if (res.ok) {
                    showToast('ম্যাচিং উন্নত করা হয়েছে (1 point added)', 'SUCCESS');
                }
            } catch (err) {
                console.error('Failed to improve matching:', err);
            }
        }
    };

    const handleSkipMatch = () => {
        const hash = (videoRef.current as any)?.currentAmbiguousHash;
        if (hash) {
            ignoredFaces.current[hash] = Date.now();
        }
        setAmbiguousMatches([]);
        
        // Clear stuck canvas boxes immediately
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        
        // Wait 2 seconds before rescanning
        setTimeout(() => {
            setIsProcessingLocked(false);
        }, 2000);
    };

    const lastSoundPlayed = useRef<{ [label: string]: number }>({});

    // Pause heavy camera processing when the mobile sidebar is opened to prevent lag
    useEffect(() => {
        const handleSidebarOpen = () => setIsPaused(true);
        const handleSidebarClose = () => setIsPaused(false);
        
        window.addEventListener('dashboard-sidebar-open', handleSidebarOpen);
        window.addEventListener('dashboard-sidebar-close', handleSidebarClose);
        
        return () => {
            window.removeEventListener('dashboard-sidebar-open', handleSidebarOpen);
            window.removeEventListener('dashboard-sidebar-close', handleSidebarClose);
        };
    }, []);

    useEffect(() => {
        // Better approach: use Web Audio API for reliable generated sounds using single context
        // processFrame will use the playSound from the outer scope

        let requestRef: { current: number | null } = { current: null };
        let isProcessing = false;

        const processFrame = async () => {
            if (status !== 'SCANNING' || !videoRef.current || videoRef.current.readyState < 2 || !isCameraActive || isProcessing || isPausedRef.current) {
                if (isPausedRef.current && canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
                if (status === 'SCANNING' && !isPausedRef.current) requestRef.current = requestAnimationFrame(processFrame);
                else if (isPausedRef.current) {
                    // When paused, we still want to be able to resume later
                    // The useEffect will handle restarting the loop when isPaused changes
                }
                return;
            }

            // Frame Throttling Logic (Process every ~150ms for faster matching within 1 sec)
            const now = Date.now();
            const lastProcess = (videoRef.current as any).lastProcessTime || 0;
            if (now - lastProcess < 150 || isProcessingLockedRef.current) {
                requestRef.current = requestAnimationFrame(processFrame);
                return;
            }
            (videoRef.current as any).lastProcessTime = now;

            isProcessing = true;
            try {
                // Step 1: Quick detection only (very lightweight)
                const basicDetections = await faceapi.detectAllFaces(
                    videoRef.current, 
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 })
                );

                if (isPausedRef.current) {
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }
                    isProcessing = false;
                    return;
                }

                if (basicDetections.length === 0) {
                    // Step 3: No face found, pause for 2 seconds before looking again to save CPU
                    (videoRef.current as any).lastProcessTime = now + 2000;
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }
                    isProcessing = false;
                    requestRef.current = requestAnimationFrame(processFrame);
                    return;
                }

                // Security check: if the user navigated away while the first scan was running, videoRef might be null now!
                if (!videoRef.current) {
                    isProcessing = false;
                    return;
                }

                // Step 2: Face found, now extract detailed landmarks and descriptors for matching
                const detections = await faceapi
                    .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (detections.length > 0 && canvasRef.current) {
                    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };

                    // Only match dimensions if they changed (performance win)
                    if (canvasRef.current.width !== displaySize.width || canvasRef.current.height !== displaySize.height) {
                        faceapi.matchDimensions(canvasRef.current, displaySize);
                    }

                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    const ctx = canvasRef.current.getContext('2d');
                    let locallyLocked = false;

                    if (ctx) {
                        ctx.clearRect(0, 0, displaySize.width, displaySize.height);
                        const seenInFrame = new Set<string>();
                        let hasMatchingCandidate = false;

                        resizedDetections.forEach(detection => {
                            if (locallyLocked || isProcessingLockedRef.current) return;

                            // Find all potential candidates with distance < 0.5 (or stricter 0.45)
                            // We use faceMatcher.labeledDescriptors directly to find all matches
                            const candidates: { student: EnrolledStudent; distance: number; matchedAngleIndex: number; hasMultiAngle: boolean }[] = [];
                            
                            // Iterate through enrolled students to find all plausible matches
                            students.forEach(s => {
                                if (s.faceDescriptor && s.faceDescriptor.length > 0) {
                                    let minDistance = 1.0;
                                    let matchedAngleIndex = -1;
                                    let hasMultiAngle = false;

                                    if (Array.isArray(s.faceDescriptor[0])) {
                                        hasMultiAngle = s.faceDescriptor.length > 1;
                                        s.faceDescriptor.forEach((d: number[], idx: number) => {
                                            const dist = faceapi.euclideanDistance(detection.descriptor, new Float32Array(d));
                                            if (dist < minDistance) {
                                                minDistance = dist;
                                                matchedAngleIndex = idx;
                                            }
                                        });
                                    } else {
                                        minDistance = faceapi.euclideanDistance(detection.descriptor, new Float32Array(s.faceDescriptor));
                                        matchedAngleIndex = 0;
                                        hasMultiAngle = false;
                                    }

                                    if (minDistance <= 0.45) {
                                        candidates.push({ student: s, distance: minDistance, matchedAngleIndex, hasMultiAngle });
                                    }
                                }
                            });

                            // Sort candidates by distance (best match first)
                            candidates.sort((a, b) => a.distance - b.distance);

                            const candidate = candidates.length > 0 ? candidates[0] : null;
                            const student = candidate ? candidate.student : null;

                            // NEW: If unregistered face found, pause entire scanner for 2 seconds!
                            if (!student) {
                                (videoRef.current as any).lastProcessTime = now + 2000;
                            }

                            // If there are multiple close matches, trigger selection UI
                            // Ambiguity is defined as having more than one candidate within a close distance range
                            if (candidates.length > 1 && (candidates[1].distance - candidates[0].distance < 0.08)) {
                                // Generate a simple hash from the first few descriptor values to identify this face
                                const descriptorHash = Array.from(detection.descriptor.slice(0, 10)).map(n => n.toFixed(2)).join(',');
                                const lastIgnored = ignoredFaces.current[descriptorHash] || 0;
                                
                                if (now - lastIgnored > 10000) { // 10 second ignore window
                                    setAmbiguousMatches(candidates.map(c => c.student).slice(0, 4));
                                    setIsProcessingLocked(true);
                                    locallyLocked = true;
                                    playSound('already');
                                    
                                    // Store current descriptor to allow ignoring it if user clicks skip
                                    (videoRef.current as any).currentAmbiguousHash = descriptorHash;
                                    (videoRef.current as any).currentAmbiguousDescriptor = Array.from(detection.descriptor);
                                    return;
                                }
                            }

                            const box = detection.detection.box;
                            const isMirrored = facingMode === 'user';
                            const mirroredBox = isMirrored ? {
                                x: displaySize.width - box.x - box.width,
                                y: box.y,
                                width: box.width,
                                height: box.height
                            } : box;

                            const drawBox = new faceapi.draw.DrawBox(mirroredBox as any, {
                                label: student ? student.name : 'অচেনা',
                                boxColor: student ? '#10b981' : '#f43f5e'
                            });
                            drawBox.draw(canvasRef.current!);

                            // Audio Feedback Logic
                            const soundCooldown = 3000;
                            const trackLabel = student ? student.id : 'unknown';

                            if (!lastSoundPlayed.current[trackLabel] || now - lastSoundPlayed.current[trackLabel] > soundCooldown) {
                                if (!student) playSound('fail');
                                lastSoundPlayed.current[trackLabel] = now;
                            }

                            if (student && candidate) {
                                seenInFrame.add(student.id);
                                hasMatchingCandidate = true;

                                // Check if already marked present
                                if (markedStudentsRef.current.has(student.id)) {
                                    const lastWarningTime = alreadyWarningCooldown.current[student.id] || 0;
                                    if (now - lastWarningTime > 15000) { // 15 seconds cooldown for duplicate warnings
                                        alreadyWarningCooldown.current[student.id] = now;
                                        playSound('already');
                                        setMatchingState({ status: 'ALREADY_DONE', studentName: student.name });
                                        setIsProcessingLocked(true);
                                        locallyLocked = true;
                                        
                                        // Add to recent matches as already marked
                                        // Using a callback or keeping a ref for attendanceRecords would be ideal, but for now we'll just check if it's there
                                        const existingRecord = attendanceRecords[student.id];
                                        const newMatch = {
                                            id: student.id,
                                            name: student.name,
                                            time: existingRecord ? new Date(existingRecord.timestamp).toLocaleTimeString('bn-BD') : new Date().toLocaleTimeString('bn-BD'),
                                            photo: student.photo,
                                            isAlreadyMarked: true,
                                            status: existingRecord ? existingRecord.status as any : 'PRESENT',
                                            timestamp: Date.now()
                                        };
                                        setRecentMatches(prev => [newMatch, ...prev.filter(m => m.id !== student.id)].slice(0, 3));
                                        setTimeout(() => {
                                            setRecentMatches(prev => prev.filter(m => m.timestamp !== newMatch.timestamp));
                                        }, 5000);

                                        setTimeout(() => {
                                            setMatchingState({ status: 'IDLE' });
                                            setIsProcessingLocked(false);
                                        }, 1800);
                                    }
                                    return;
                                }

                                if (!consensusTracker.current[student.id]) {
                                    consensusTracker.current[student.id] = { frames: 0, angles: new Set() };
                                    setMatchingState({ status: 'MATCHING' });
                                }
                                
                                consensusTracker.current[student.id].frames += 1;
                                consensusTracker.current[student.id].angles.add(candidate.matchedAngleIndex);
                                
                                const tracker = consensusTracker.current[student.id];
                                // Require minimum 2 frames total
                                if (tracker.frames >= 2) {
                                    markAttendanceRef.current(student.id, student.name, student.classId);
                                    delete consensusTracker.current[student.id];
                                    
                                    setMatchingState({ status: 'MATCHED', studentName: student.name });
                                    setIsProcessingLocked(true);
                                    locallyLocked = true;

                                    // Draw a prominent checkmark over the face
                                    const ctx = canvasRef.current!.getContext('2d');
                                    if (ctx) {
                                        const cx = mirroredBox.x + mirroredBox.width / 2;
                                        const cy = mirroredBox.y + mirroredBox.height / 2;
                                        const radius = Math.max(30, Math.min(mirroredBox.width, mirroredBox.height) / 4);
                                        
                                        // Solid green circle
                                        ctx.beginPath();
                                        ctx.arc(cx, cy, radius, 0, 2 * Math.PI, false);
                                        ctx.fillStyle = '#10b981';
                                        ctx.fill();
                                        
                                        // White border
                                        ctx.lineWidth = 4;
                                        ctx.strokeStyle = '#ffffff';
                                        ctx.stroke();
                                        
                                        // Checkmark icon
                                        ctx.beginPath();
                                        ctx.moveTo(cx - radius * 0.4, cy);
                                        ctx.lineTo(cx - radius * 0.1, cy + radius * 0.3);
                                        ctx.lineTo(cx + radius * 0.5, cy - radius * 0.4);
                                        ctx.lineWidth = Math.max(3, radius * 0.15);
                                        ctx.stroke();
                                    }

                                    setTimeout(() => {
                                        setMatchingState({ status: 'IDLE' });
                                        setIsProcessingLocked(false);
                                    }, 2000); // 2 second pause
                                }
                            }
                        });

                        if (!hasMatchingCandidate && !isProcessingLockedRef.current) {
                            setMatchingState(prev => prev.status === 'MATCHING' ? { status: 'IDLE' } : prev);
                        }

                        // Reset counts for students not seen in this frame
                        Object.keys(consensusTracker.current).forEach(id => {
                            if (!seenInFrame.has(id)) {
                                delete consensusTracker.current[id];
                            }
                        });
                    }
                } else if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
                if (!isProcessingLockedRef.current && detections.length === 0) {
                    setMatchingState(prev => prev.status === 'MATCHING' ? { status: 'IDLE' } : prev);
                }
            } catch (error) {
                console.error('Frame processing error:', error);
            } finally {
                isProcessing = false;
                if (status === 'SCANNING') requestRef.current = requestAnimationFrame(processFrame);
            }
        };

        if (status === 'SCANNING' && !isTestMode && !isPaused) {
            requestRef.current = requestAnimationFrame(processFrame);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [status, faceMatcher, students, isCameraActive, isTestMode, isPaused]);

    return (
        <div className="space-y-6">
            {/* Data Analysis Strip */}
            {students.some(s => (!s.faceDescriptor || s.faceDescriptor.length === 0) && s.photo) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isAnalyzing ? `bg-amber-500 text-white ${!isLowCapacity ? 'animate-pulse' : ''}` : 'bg-white text-amber-500 border border-amber-100'}`}>
                            {isAnalyzing ? <RefreshCw className="animate-spin" size={24} /> : <Zap size={24} fill="currentColor" />}
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">স্মার্ট ম্যাচিং বিশ্লেষণ প্রয়োজন</h4>
                            <p className="text-[10px] font-bold text-amber-700/70 uppercase tracking-widest">
                                {isAnalyzing
                                    ? `বিশ্লেষণ চলছে: ${analysisProgress.current} / ${analysisProgress.total}`
                                    : `${students.filter(s => (!s.faceDescriptor || s.faceDescriptor.length === 0) && s.photo).length} জন শিক্ষার্থীর ছবি বিশ্লেষণ বাকি আছে`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={runDataAnalysis}
                        disabled={isAnalyzing || !modelsLoaded}
                        className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg ${isAnalyzing
                            ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
                            : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                            }`}
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} fill="currentColor" />}
                        {isAnalyzing ? 'বিশ্লেষণ হচ্ছে...' : 'বিশ্লেষণ করুন'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(450px,1fr)] gap-8">
                {/* Main Scanner Section */}
                <div className="space-y-6 min-w-0">
                    <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-white ring-8 ring-slate-100/50 group">
                        {/* Minimal Live Indicator - Only when scanning */}
                        {status === 'SCANNING' && (
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-20">
                                <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-400' : `bg-emerald-400 ${!isLowCapacity ? 'animate-pulse' : ''}`}`} />
                                <span className="text-[10px] sm:text-[11px] font-black text-white/90 uppercase tracking-[0.2em] pt-0.5 italic">
                                    {isPaused ? 'PAUSED' : (isTestMode ? 'Test Mode' : 'Live Mode')}
                                </span>
                            </div>
                        )}

                        <div className="relative aspect-video">
                            <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

                            <AnimatePresence mode="wait">
                                {(status === 'IDLE' || (status as string) === 'ERROR') && !isCameraActive && (
                                    <motion.div key="scanner-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center text-white text-center p-6">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10 group-hover:scale-105 transition-transform duration-700">
                                            <Camera size={20} className="text-white/80" />
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-black mb-1 italic uppercase tracking-tighter">
                                            {error ? 'ক্যামেরা সমস্যা' : 'স্মার্ট হাজিরা সিস্টেম'}
                                        </h3>
                                        <p className="text-[11px] sm:text-xs font-bold text-white/60 max-w-[280px] mb-4 leading-relaxed uppercase tracking-wider">
                                            {error || 'ক্যামেরা দিয়ে অটো হাজিরা নিতে "স্ক্যান শুরু" করুন অথবা ফটো আপলোড করুন।'}
                                        </p>

                                        <div className="flex flex-col items-center gap-3 mt-2 w-full max-w-[280px]">
                                            <div className="flex gap-2 w-full">
                                                <button onClick={startScanner} disabled={status === 'LOADING_STUDENTS'} className="flex-1 py-2.5 bg-white text-slate-900 font-bold rounded-lg shadow-lg hover:bg-slate-50 transition-all text-[11px] uppercase tracking-wider active:scale-95">
                                                    {error ? 'আবার চেষ্টা করুন' : 'স্ক্যান শুরু করুন'}
                                                </button>
                                                <button onClick={() => { setIsTestMode(true); uploadImgRef.current?.click(); }} className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-lg transition-all border border-white/10 text-[11px] uppercase tracking-wider active:scale-95">
                                                    ফটো আপলোড
                                                </button>
                                            </div>
                                        </div>

                                        <input ref={uploadImgRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                    </motion.div>
                                )}

                                {status === 'INITIALIZING' && (
                                    <motion.div key="scanner-initializing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-white">
                                        <Loader2 size={48} className="animate-spin text-[#045c84] mb-6" />
                                        <p className="text-sm font-black italic tracking-widest text-[#045c84] uppercase">Initalizing Hardware...</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Matching Scanline Overlay */}
                            {matchingState.status === 'MATCHING' && (
                                <motion.div
                                    className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8),0_0_30px_rgba(34,211,238,0.6)] z-10"
                                    animate={{ top: ['0%', '100%', '0%'] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                />
                            )}

                            {/* Success / Already Done Overlays */}
                            <AnimatePresence>
                                {matchingState.status === 'MATCHED' && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-30 bg-emerald-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-6"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                            className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-4 border-4 border-white/20"
                                        >
                                            <Check size={48} className="text-emerald-600 stroke-[4]" />
                                        </motion.div>
                                        <motion.h3 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white mb-1"
                                        >
                                            হাজিরা সফল!
                                        </motion.h3>
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-lg sm:text-xl font-bold text-white/90 truncate max-w-[280px]"
                                        >
                                            {matchingState.studentName}
                                        </motion.p>
                                        <p className="text-[11px] sm:text-xs font-bold text-white/60 uppercase tracking-widest mt-1">
                                            উপস্থিতি নিশ্চিত করা হয়েছে
                                        </p>
                                    </motion.div>
                                )}

                                {matchingState.status === 'ALREADY_DONE' && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-30 bg-amber-500/95 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-6"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                            className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-4 border-4 border-white/20"
                                        >
                                            <CheckCircle2 size={48} className="text-amber-500 stroke-[3]" />
                                        </motion.div>
                                        <motion.h3 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white mb-1"
                                        >
                                            ইতিমধ্যে উপস্থিত!
                                        </motion.h3>
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-lg sm:text-xl font-bold text-white/90 truncate max-w-[280px]"
                                        >
                                            {matchingState.studentName}
                                        </motion.p>
                                        <p className="text-[11px] sm:text-xs font-bold text-white/70 uppercase tracking-widest mt-1">
                                            ইতিমধ্যে উপস্থিতি নেওয়া হয়েছে
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Persistent Controls Container */}
                            <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
                                {/* Mode Selector */}
                                <div className="hidden md:flex items-center gap-1.5 bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-xl">
                                    {[
                                        { id: 'PRESENT', label: 'উপস্থিত', color: 'bg-emerald-500' },
                                        { id: 'LATE', label: 'দেরি', color: 'bg-amber-500' },
                                        { id: 'LEAVE', label: 'ছুটি', color: 'bg-blue-500' }
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setScannerMarkMode(mode.id as any)}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${scannerMarkMode === mode.id ? `${mode.color} text-white shadow-lg` : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Camera Switch Toggle */}
                                <button
                                    onClick={toggleCamera}
                                    className="w-9 h-9 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/40 transition-all active:scale-90 shadow-xl"
                                    title="ক্যামেরা পরিবর্তন করুন"
                                >
                                    <RefreshCw size={16} className={facingMode === 'environment' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                </button>

                                {/* Pause/Active Toggle */}
                                <button
                                    onClick={() => setIsPaused(!isPaused)}
                                    className={`w-9 h-9 rounded-xl backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-90 group/pause shadow-xl ${isPaused ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-black/20 text-white/60 hover:text-white hover:bg-black/40'}`}
                                    title={isPaused ? "Resume Scanning" : "Pause Scanning"}
                                >
                                    {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                                </button>

                                {/* Persistent Audio Test Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); playSound('success'); }}
                                    className="w-9 h-9 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/40 transition-all active:scale-90 group/test shadow-xl"
                                    title="Test Audio"
                                >
                                    <Volume2 size={16} className="group-hover/test:scale-110 transition-transform" />
                                </button>
                            </div>

                            {/* Recent detection pop-up stack */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col-reverse items-center gap-2 z-50 pointer-events-none">
                                <AnimatePresence mode="popLayout">
                                    {recentMatches.map((match) => (
                                        <motion.div
                                            key={match.timestamp}
                                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className={`p-3 rounded-2xl shadow-2xl flex items-center gap-4 border-2 min-w-[300px] backdrop-blur-md ${match.isAlreadyMarked
                                                ? 'bg-amber-500/90 border-white/40'
                                                : match.status === 'LATE'
                                                    ? 'bg-amber-500/90 border-white/30'
                                                    : match.status === 'LEAVE'
                                                        ? 'bg-blue-500/90 border-white/30'
                                                        : 'bg-emerald-500/90 border-white/30'
                                                }`}
                                        >
                                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden border border-white/20 shrink-0">
                                                {match.photo ? (
                                                    <img src={match.photo} className="w-full h-full object-cover" />
                                                ) : (
                                                    <CheckCircle2 size={24} className="text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black underline underline-offset-2 opacity-80 uppercase tracking-widest leading-none mb-1 text-white">
                                                    {match.isAlreadyMarked
                                                        ? 'পূর্বেই বর্তমান'
                                                        : match.status === 'LATE'
                                                            ? 'দেরি উপস্থিতি'
                                                            : match.status === 'LEAVE'
                                                                ? 'ছুটি নিশ্চিত'
                                                                : 'উপস্থিত নিশ্চিত'}
                                                </p>
                                                <p className="text-xl font-black italic uppercase leading-tight truncate text-white">{match.name}</p>
                                            </div>
                                            <div className="text-[11px] font-black bg-black/20 text-white px-3 py-2 rounded-lg uppercase border border-white/10 shrink-0">
                                                {match.time}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>


                            {status === 'SCANNING' && !isTestMode && (
                                <button onClick={stopScanner} className="absolute bottom-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-md text-white/80 rounded-2xl transition-all z-40 flex items-center justify-center shadow-2xl hover:bg-black/60 active:scale-95 border border-white/10">
                                    <XCircle size={24} />
                                </button>
                            )}

                            {/* Ambiguous Match Selection Overlay */}
                            {typeof window !== 'undefined' && createPortal(
                                <AnimatePresence>
                                    {ambiguousMatches.length > 0 && (
                                        <motion.div
                                            key="ambiguous-matches-modal"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6"
                                        >
                                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                                            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">সঠিক শিক্ষার্থী নির্বাচন করুন</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">একাধিক ম্যাচের সম্ভাবনা পাওয়া গেছে</p>
                                                </div>
                                                <button 
                                                    onClick={handleSkipMatch}
                                                    className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-all"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            </div>
                                            
                                            <div className="p-4 grid grid-cols-2 gap-3">
                                                {ambiguousMatches.map((student) => (
                                                    <button
                                                        key={student.id}
                                                        onClick={() => handleSelectMatch(student)}
                                                        className="group relative bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center gap-3 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all shadow-sm active:scale-95"
                                                    >
                                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 group-hover:border-emerald-200 transition-all shrink-0">
                                                            {student.photo ? (
                                                                <img src={student.photo} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                    <Users size={32} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-center min-w-0 w-full">
                                                            <p className="text-xs font-black text-slate-700 truncate uppercase italic tracking-tight mb-1">{student.name}</p>
                                                            <div className="flex items-center justify-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                                                                <Check size={8} strokeWidth={4} /> সিলেক্ট করুন
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                                <button 
                                                    onClick={handleSkipMatch}
                                                    className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all active:scale-98"
                                                >
                                                    কেউ ই সঠিক নয় / বাদ দিন
                                                </button>
                                            </div>
                                        </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>,
                                document.body
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm h-[450px] lg:h-[600px] overflow-hidden">
                        {/* Tab Header */}
                        <div className="flex bg-slate-50 border-b border-slate-100 p-1.5 gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'PRESENT', label: 'উপস্থিত', color: 'emerald', count: Array.from(classMarkedStudents).filter(id => attendanceRecords[id]?.status === 'PRESENT').length },
                                { id: 'LATE', label: 'দেরি', color: 'amber', count: Array.from(classMarkedStudents).filter(id => attendanceRecords[id]?.status === 'LATE').length },
                                { id: 'LEAVE', label: 'ছুটি', color: 'blue', count: Array.from(classMarkedStudents).filter(id => attendanceRecords[id]?.status === 'LEAVE').length },
                                { id: 'ABSENT', label: 'অনুপস্থিত', color: 'rose', count: classStudents.length - classMarkedStudents.size }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 min-w-[80px] py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${activeTab === tab.id ? `bg-white text-${tab.color}-600 shadow-sm border border-slate-100` : 'text-slate-400 hover:bg-white/50'}`}
                                >
                                    <span className="opacity-60">{tab.label}</span>
                                    <span className={`text-sm ${activeTab === tab.id ? `text-${tab.color}-600` : 'text-slate-600'}`}>{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 scroll-smooth custom-scrollbar" data-lenis-prevent="true">
                            <AnimatePresence mode="wait">
                                {activeTab !== 'ABSENT' ? (
                                    <motion.div
                                        key={`list-${activeTab}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-3"
                                    >
                                        {Array.from(classMarkedStudents).filter(id => attendanceRecords[id]?.status === activeTab).length === 0 ? (
                                            <div className="py-20 text-center opacity-40">
                                                <Users size={32} className="mx-auto mb-4 text-slate-300" />
                                                <p className="text-slate-400 font-bold text-[10px] uppercase italic">কোনো রেকর্ড পাওয়া যায়নি</p>
                                            </div>
                                        ) : (
                                            Array.from(classMarkedStudents)
                                                .filter(id => attendanceRecords[id]?.status === activeTab)
                                                .sort((a, b) => {
                                                    const timeA = attendanceRecords[a]?.timestamp?.getTime() || 0;
                                                    const timeB = attendanceRecords[b]?.timestamp?.getTime() || 0;
                                                    return timeB - timeA;
                                                })
                                                .map((id) => {
                                                    const s = students.find(std => std.id === id);
                                                    if (!s) return null;
                                                    return (
                                                        <motion.div
                                                            key={`attended-${id}`}
                                                            layout
                                                            className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 relative overflow-hidden group"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="relative shrink-0">
                                                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 italic font-black text-slate-400 text-[10px]">
                                                                        {s.photo ? (
                                                                            <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Users size={16} />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[13px] font-black text-slate-700 truncate leading-none mb-1 uppercase italic tracking-tight">{s.name}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5 flex items-center gap-1.5">
                                                                        <Clock size={10} className="text-slate-300" />
                                                                        {attendanceRecords[id]?.timestamp?.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => unmarkAttendance(id)}
                                                                className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        </motion.div>
                                                    );
                                                })
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="absent-list"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-3"
                                    >
                                        {classStudents.filter(s => !markedStudents.has(s.id)).length === 0 ? (
                                            <div className="py-20 text-center opacity-40">
                                                <CheckCircle2 size={32} className="mx-auto mb-4 text-emerald-300" />
                                                <p className="text-emerald-600 font-bold text-[10px] uppercase italic">সবাই উপস্থিত!</p>
                                            </div>
                                        ) : (
                                            classStudents.filter(s => !markedStudents.has(s.id)).map((s) => (
                                                <motion.div
                                                    key={`absent-${s.id}`}
                                                    layout
                                                    className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 opacity-80"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="relative shrink-0 grayscale">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 italic font-black text-slate-400 text-[10px]">
                                                                {s.photo ? (
                                                                    <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Users size={16} />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-black text-slate-400 truncate leading-none mb-1 uppercase italic tracking-tight">{s.name}</p>
                                                            <p className="text-[9px] font-bold text-rose-400/60 truncate uppercase">Absent</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => markAttendance(s.id, s.name)}
                                                        className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-[#045c84] hover:text-white transition-all"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                </motion.div>
                                            ))
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>

            {/* Glassmorphism Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-6 right-6 z-[9999] pointer-events-none"
                    >
                        <div className={`
                            min-w-[320px] px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-4 transition-all
                            ${toast.type === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' :
                                toast.type === 'ERROR' ? 'bg-rose-500/10 border-rose-500/20 text-rose-700' :
                                    'bg-slate-500/10 border-slate-500/20 text-slate-700'}
                        `}>
                            <div className={`
                                w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg
                                ${toast.type === 'SUCCESS' ? 'bg-emerald-500 text-white' :
                                    toast.type === 'ERROR' ? 'bg-rose-500 text-white' :
                                        'bg-slate-500 text-white'}
                            `}>
                                {toast.type === 'SUCCESS' ? <Check size={20} strokeWidth={3} /> :
                                    toast.type === 'ERROR' ? <XCircle size={20} strokeWidth={3} /> :
                                        <Users size={20} strokeWidth={3} />}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">
                                    {toast.type === 'SUCCESS' ? 'সাফল্য' : toast.type === 'ERROR' ? 'ত্রুটি' : 'তথ্য'}
                                </h4>
                                <p className="text-sm font-black italic uppercase leading-tight truncate">
                                    {toast.message}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
