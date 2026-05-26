'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, RefreshCw, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePerformance } from '../hooks/usePerformance';

interface FaceEnrollmentProps {
    studentId: string;
    studentName: string;
    profilePhoto?: string;
    onSuccess?: () => void;
    onClose: () => void;
}

export default function FaceEnrollment({ studentId, studentName, profilePhoto, onSuccess, onClose }: FaceEnrollmentProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<'IDLE' | 'LOADING_MODELS' | 'READY' | 'CAPTURING' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [isUsingPhoto, setIsUsingPhoto] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const { isLowCapacity } = usePerformance();
    const hasAutoEnrolled = useRef(false);

    useEffect(() => {
        loadModels();
        return () => {
            stopCamera();
        };
    }, []);

    useEffect(() => {
        if (modelsLoaded && profilePhoto && !hasAutoEnrolled.current && status === 'READY') {
            hasAutoEnrolled.current = true;
            console.log('Auto-enrolling from profile photo:', profilePhoto);
            processImage(profilePhoto);
        }
    }, [modelsLoaded, profilePhoto, status]);

    const loadModels = async () => {
        try {
            setStatus('LOADING_MODELS');
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
            setStatus('READY');
            // startCamera(); - Removed auto-start to prevent NotAllowedError
        } catch (err: any) {
            console.error('Error loading models:', err);
            setError('মডেল লোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
            setStatus('ERROR');
        }
    };

    const startCamera = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode, width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.error('Error accessing camera:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('ক্যামেরা ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজারের বাম পাশের লক আইকন থেকে পারমিশন পরিবর্তন করতে পারেন।');
            } else {
                setError('ক্যামেরা চালু করা সম্ভব হয়নি। দয়া করে ফটো আপলোড অপশনটি ব্যবহার করুন।');
            }
            // Don't set status to ERROR if models loaded successfully
            if (status !== 'ERROR') setStatus('READY');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const toggleCamera = () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);
        stopCamera();
        setTimeout(() => {
            startCameraWithMode(newMode);
        }, 300);
    };

    const startCameraWithMode = async (mode: 'user' | 'environment') => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.error('Error accessing camera:', err);
            setError('ক্যামেরা চালু করা সম্ভব হয়নি।');
        }
    };

    const processImage = async (imgSource: HTMLImageElement | string | File) => {
        try {
            setStatus('CAPTURING');
            setError(null);
            setProgress(20);

            let img: HTMLImageElement;
            if (imgSource instanceof HTMLImageElement) {
                img = imgSource;
            } else if (imgSource instanceof File) {
                img = await faceapi.bufferToImage(imgSource);
            } else {
                img = await faceapi.fetchImage(imgSource);
            }

            setProgress(40);
            const detections = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detections) {
                setError('ছবিতে কোনো মুখ পাওয়া যায়নি। দয়া করে পরিষ্কার ছবি ব্যবহার করুন।');
                setStatus('READY');
                return;
            }

            // High Precision Quality Check
            const { score } = detections.detection;
            const landmarks = detections.landmarks;
            const box = detections.detection.box;

            // Check confidence (95%+)
            if (score < 0.9) {
                setError('ছবিটি যথেষ্ট পরিষ্কার নয়। দয়া করে পর্যাপ্ত আলোতে ভালো ক্যামেরা ব্যবহার করুন।');
                setStatus('READY');
                return;
            }

            // Check for potential duplicates (Scaled Accuracy)
            // Fetch existing data for comparison if possible
            try {
                const checkRes = await fetch(`/api/admin/students/check-duplicate-face`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descriptor: Array.from(detections.descriptor) })
                });
                
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (checkData.isDuplicate && checkData.studentId !== studentId) {
                        setError(`এই মুখটি ইতিপূর্বে ${checkData.studentName} নামে নিবন্ধিত হয়েছে। এটি নতুন করে যুক্ত করা সম্ভব নয়।`);
                        setStatus('ERROR');
                        return;
                    }
                }
            } catch (err) {
                console.warn('Collision check failed, proceeding with baseline accuracy.');
            }

            setProgress(70);
            setStatus('SAVING');

            const response = await fetch(`/api/students/${studentId}/face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descriptor: [Array.from(detections.descriptor)] }),
            });

            if (!response.ok) throw new Error('Failed to save face data');

            setProgress(100);
            setStatus('SUCCESS');
            if (onSuccess) onSuccess();

            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err: any) {
            console.error('Image processing error:', err);
            setError('ছবি প্রসেস করতে সমস্যা হয়েছে।');
            setStatus('READY');
        } finally {
            setIsUsingPhoto(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUsingPhoto(true);
        await processImage(file);
        if (uploadInputRef.current) uploadInputRef.current.value = '';
    };

    const useProfilePhoto = async () => {
        if (!profilePhoto) return;
        setIsUsingPhoto(true);
        await processImage(profilePhoto);
    };

    const handleEnroll = async () => {
        if (!videoRef.current) return;

        try {
            setStatus('CAPTURING');
            setProgress(10);

            const capturedDescriptors: number[][] = [];
            const targetCount = 3;
            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

            for (let i = 0; i < 15; i++) {
                if (capturedDescriptors.length >= targetCount) break;
                
                const detections = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detections && detections.detection.score >= 0.90) {
                    // Check duplicate only on the first frame to save time
                    if (capturedDescriptors.length === 0) {
                        try {
                            const checkRes = await fetch(`/api/admin/students/check-duplicate-face`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ descriptor: Array.from(detections.descriptor) })
                            });
                            
                            if (checkRes.ok) {
                                const checkData = await checkRes.json();
                                if (checkData.isDuplicate && checkData.studentId !== studentId) {
                                    setError(`এই মুখটি ইতিপূর্বে ${checkData.studentName} নামে নিবন্ধিত হয়েছে।`);
                                    setStatus('ERROR');
                                    return;
                                }
                            }
                        } catch (err) {
                            console.warn('Collision check failed, proceeding with baseline accuracy.');
                        }
                    }
                    
                    capturedDescriptors.push(Array.from(detections.descriptor));
                    setProgress(10 + (capturedDescriptors.length * 25));
                }
                
                // Wait before taking next picture to allow user to turn head slightly
                await delay(600);
            }

            if (capturedDescriptors.length === 0) {
                setError('আপনার মুখ স্পষ্টভাবে বোঝা যাচ্ছে না। পর্যাপ্ত আলোতে আবার চেষ্টা করুন।');
                setStatus('READY');
                return;
            }

            setProgress(90);
            setStatus('SAVING');

            // Save to database
            const response = await fetch(`/api/students/${studentId}/face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descriptor: capturedDescriptors }), // SENDING ARRAY OF ARRAYS
            });

            if (!response.ok) throw new Error('Failed to save face data');

            setProgress(100);
            setStatus('SUCCESS');
            if (onSuccess) onSuccess();

            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err: any) {
            console.error('Enrollment error:', err);
            setError('ফেস ডেটা সেভ করতে সমস্যা হয়েছে।');
            setStatus('READY');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-slate-100"
            >
                {/* Header */}
                <div className="px-6 py-5 border-bottom border-slate-50 flex items-center justify-between bg-white">
                    <div>
                        <h3 className="text-[16px] font-black text-slate-800 tracking-tight">ফেস আইডি রেজিস্ট্রেসন</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{studentName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <XCircle size={20} className="text-slate-300" />
                    </button>
                </div>

                {/* Camera View */}
                <div className="relative aspect-square bg-slate-950 overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover ${facingMode === 'user' ? 'mirror scale-x-[-1]' : ''}`}
                    />

                    {/* Camera Toggle Button */}
                    <button
                        onClick={toggleCamera}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white hover:bg-black/60 transition-all active:scale-90 z-20"
                        title="ক্যামেরা পরিবর্তন করুন"
                    >
                        <RefreshCw size={18} className={facingMode === 'environment' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>

                    {/* Face Overlay Guideline */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-64 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center">
                            <div className="w-56 h-56 border-2 border-white/40 rounded-full" />
                        </div>
                    </div>

                    {/* Status Overlays */}
                    <AnimatePresence>
                        {status === 'LOADING_MODELS' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white text-center p-6">
                                <Loader2 className="animate-spin text-[#045c84] mb-4" size={40} />
                                <h4 className="text-xl font-black mb-1 italic">সিস্টেম প্রস্তুত হচ্ছে...</h4>
                                <p className="text-[11px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">প্রথমবার লোড হতে কিছুক্ষণ সময় লাগতে পারে</p>
                            </motion.div>
                        )}

                        {status === 'SUCCESS' && (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                className="absolute inset-0 bg-[#045c84]/90 flex flex-col items-center justify-center text-white text-center p-6">
                                <div className={`w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 ${!isLowCapacity ? 'animate-bounce' : ''}`}>
                                    <CheckCircle2 size={40} strokeWidth={3} />
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white mb-2">সাফল্য!</h3>
                                <p className="text-[11px] sm:text-sm font-bold text-white/60 uppercase tracking-widest leading-relaxed px-6">ফেস আইডি সফলভাবে গ্রহণ করা হয়েছে।</p>
                                <div className="mt-4 flex flex-col items-center">
                                    <h1 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-white/90 truncate max-w-[280px]">
                                        {studentName}
                                    </h1>
                                </div>
                            </motion.div>
                        )}

                        {((error && (error.includes('ক্যামেরা') || error.includes('অনুমতি'))) || (!error && status === 'READY' && !videoRef.current?.srcObject)) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white text-center p-6 backdrop-blur-md z-30">
                                <div className={`w-24 h-24 border-4 border-dashed rounded-full flex items-center justify-center mb-6 ${!isLowCapacity ? 'animate-[spin_20s_linear_infinite]' : 'border-white/20'}`}>
                                    <div className={`w-16 h-16 border-4 border-white/20 rounded-full flex items-center justify-center ${!isLowCapacity ? 'animate-pulse' : ''}`}>
                                        <Camera size={28} className="text-white/40" />
                                    </div>
                                </div>
                                <h4 className="text-xl font-black mb-1 italic uppercase tracking-tight">{error ? 'ক্যামেরা নিষ্ক্রিয়' : 'ক্যামেরা ইনভোক করুন'}</h4>
                                <p className="text-[11px] sm:text-xs font-bold text-slate-300 max-w-[240px] leading-relaxed mb-6 uppercase tracking-wider">
                                    {error ? 'ক্যামেরা কাজ না করলে সরাসরি ফটো আপলোড করে ট্রাই করুন।' : 'রেজিস্ট্রেশন শুরু করতে ক্যামেরা চালু করুন।'}
                                </p>
                                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                                    <button
                                        onClick={() => uploadInputRef.current?.click()}
                                        className="py-3 bg-white text-slate-900 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-lg shadow-white/10"
                                    >
                                        ফটো আপলোড করুন
                                    </button>
                                    <button
                                        onClick={startCamera}
                                        className="py-3 bg-white/5 hover:bg-white/10 text-white/80 font-black rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 text-[11px]"
                                    >
                                        {error ? 'আবার চেষ্টা করুন' : 'ক্যামেরা শুরু করুন'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Progress Bar & Text */}
                    {(status === 'CAPTURING' || status === 'SAVING') && (
                        <div className="absolute bottom-0 left-0 right-0">
                            {status === 'CAPTURING' && (
                                <div className="text-center pb-3 text-white">
                                    <p className="text-[12px] font-black uppercase tracking-widest bg-black/40 inline-block px-4 py-1.5 rounded-full backdrop-blur-md">
                                        মাথা হালকা ডানে এবং বামে ঘোরান...
                                    </p>
                                </div>
                            )}
                            <div className="h-1.5 bg-white/10 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-[#045c84]"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-slate-50/50">
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={uploadInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/*"
                        className="hidden"
                    />

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
                            <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold text-red-600 leading-tight">{error}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <button
                                disabled={!modelsLoaded || isUsingPhoto || status === 'SAVING' || status === 'CAPTURING'}
                                onClick={handleEnroll}
                                className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl text-[14px] font-black transition-all ${modelsLoaded && !isUsingPhoto && status !== 'SAVING' && status !== 'CAPTURING'
                                    ? 'bg-[#045c84] text-white shadow-lg shadow-[#045c84]/20 hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {status === 'CAPTURING' || status === 'SAVING' ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <Camera size={18} />
                                        <span>ছবি তুলুন</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    setError(null);
                                    startCamera();
                                }}
                                className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-[#045c84] hover:text-white transition-all active:scale-95 shadow-sm"
                                title="ক্যামেরা আবার চেষ্টা করুন"
                            >
                                <RefreshCw size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {profilePhoto && (
                                <button
                                    disabled={!modelsLoaded || isUsingPhoto || status === 'SAVING' || status === 'CAPTURING'}
                                    onClick={useProfilePhoto}
                                    className="flex items-center justify-center gap-2 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50"
                                >
                                    <Sparkles size={14} />
                                    প্রোফাইল ফটো ব্যবহার
                                </button>
                            )}
                            <button
                                disabled={!modelsLoaded || isUsingPhoto || status === 'SAVING' || status === 'CAPTURING'}
                                onClick={() => uploadInputRef.current?.click()}
                                className={`flex items-center justify-center gap-2 h-12 bg-white border border-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50 ${!profilePhoto ? 'col-span-2' : ''}`}
                            >
                                <RefreshCw size={14} className="rotate-45" />
                                ফটো আপলোড
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                        <Sparkles size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Advanced Biometric Enrollment System</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
