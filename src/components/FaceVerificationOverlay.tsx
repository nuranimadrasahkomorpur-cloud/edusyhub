'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, ShieldCheck, AlertCircle, RefreshCw, Zap, Upload, Play, Pause } from 'lucide-react';
import { usePerformance } from '../hooks/usePerformance';

interface FaceVerificationOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onVerifySuccess: () => void;
    studentName: string;
    studentFaceDescriptor: number[];
}

export default function FaceVerificationOverlay({
    isOpen,
    onClose,
    onVerifySuccess,
    studentName,
    studentFaceDescriptor
}: FaceVerificationOverlayProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [status, setStatus] = useState<'IDLE' | 'LOADING_MODELS' | 'STARTING_CAMERA' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [matchScore, setMatchScore] = useState<number>(0);
    const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isPaused, setIsPaused] = useState(false);
    const { isLowCapacity } = usePerformance();
    const uploadRef = useRef<HTMLInputElement>(null);

    const faceMatcher = React.useMemo(() => {
        if (!studentFaceDescriptor || studentFaceDescriptor.length === 0) return null;
        let descArray = [];
        if (Array.isArray(studentFaceDescriptor[0])) {
            descArray = studentFaceDescriptor.map((d: any) => new Float32Array(d));
        } else {
            descArray = [new Float32Array(studentFaceDescriptor)];
        }
        const labeledDescriptor = new faceapi.LabeledFaceDescriptors(
            studentName,
            descArray.length > 0 ? descArray : [new Float32Array(128)]
        );
        return new faceapi.FaceMatcher([labeledDescriptor], 0.38);
    }, [studentName, studentFaceDescriptor]);

    useEffect(() => {
        if (isOpen) {
            initVerification();
        } else {
            stopCamera();
        }
    }, [isOpen]);

    const initVerification = async () => {
        setStatus('LOADING_MODELS');
        setError(null);
        setMatchScore(0);

        try {
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);

            setStatus('STARTING_CAMERA');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode, width: 640, height: 480 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for video meta to load
                videoRef.current.onloadedmetadata = () => {
                    setStatus('VERIFYING');
                };
            }
        } catch (err: any) {
            console.error('Verification init error:', err);
            setError(err.name === 'NotAllowedError' ? 'ক্যামেরা ব্যবহারের অনুমতি দিন।' : 'ভেরিফিকেশন শুরু করা সম্ভব হয়নি।');
            setStatus('ERROR');
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
            setStatus('STARTING_CAMERA');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: 640, height: 480 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    setStatus('VERIFYING');
                };
            }
        } catch (err: any) {
            console.error('Verification camera switch error:', err);
            setError('ক্যামেরা চালু করা সম্ভব হয়নি।');
            setStatus('ERROR');
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !faceMatcher) return;

        setIsProcessingPhoto(true);
        setStatus('VERIFYING');
        setError(null);

        try {
            // Load models first if not loaded
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);

            const img = await faceapi.bufferToImage(file);

            const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                const match = faceMatcher.findBestMatch(detection.descriptor);
                const score = Math.max(0, 1 - match.distance);
                setMatchScore(score);

                if (match.label === studentName && match.distance <= 0.38) {
                    setStatus('SUCCESS');
                    stopCamera();
                    setTimeout(() => {
                        onVerifySuccess();
                    }, 1500);
                    return;
                } else {
                    setError('মুখমন্ডল মিলছে না। সঠিক ছবি আপলোড করুন।');
                    setStatus('ERROR');
                }
            } else {
                setError('ছবিতে কোনো মুখ পাওয়া যায়নি।');
                setStatus('ERROR');
            }
        } catch (err) {
            console.error('Photo verification error:', err);
            setError('ছবি প্রসেস করতে সমস্যা হয়েছে।');
            setStatus('ERROR');
        } finally {
            setIsProcessingPhoto(false);
            if (uploadRef.current) uploadRef.current.value = '';
        }
    };

    useEffect(() => {
        let animationFrameId: number;
        let isProcessing = false;
        let consecutiveMatches = 0;

        const processFrame = async () => {
            if (status !== 'VERIFYING' || !videoRef.current || !faceMatcher || isProcessing || isPaused) {
                if (isPaused && canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
                if (status === 'VERIFYING') animationFrameId = requestAnimationFrame(processFrame);
                return;
            }

            // Frame Throttling Logic (Process every ~150ms for faster matching)
            const now = Date.now();
            const lastProcess = (videoRef.current as any).lastProcessTime || 0;
            if (now - lastProcess < 150) {
                animationFrameId = requestAnimationFrame(processFrame);
                return;
            }
            (videoRef.current as any).lastProcessTime = now;

            isProcessing = true;
            try {
                // Increased inputSize for better accuracy and strict score threshold
                const detection = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection && canvasRef.current) {
                    const match = faceMatcher.findBestMatch(detection.descriptor);

                    // Match score for UI feedback (0 to 1)
                    // Match.distance is distance (lower is better), so we invert it
                    const score = Math.max(0, 1 - match.distance);
                    setMatchScore(score);

                    if (match.label === studentName && match.distance <= 0.38) {
                        consecutiveMatches += 1;
                        if (consecutiveMatches >= 4) {
                            setStatus('SUCCESS');
                            stopCamera();
                            setTimeout(() => {
                                onVerifySuccess();
                            }, 1500);
                            return;
                        }
                    } else {
                        consecutiveMatches = 0;
                    }
                }
            } catch (err) {
                console.error('Frame processing error:', err);
            } finally {
                isProcessing = false;
                if (status === 'VERIFYING') {
                    animationFrameId = requestAnimationFrame(processFrame);
                }
            }
        };

        if (status === 'VERIFYING') {
            processFrame();
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [status, faceMatcher, studentName, onVerifySuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-[500px] bg-white rounded-[40px] shadow-2xl overflow-hidden relative border-4 border-white/20"
            >
                {/* Header */}
                <div className="p-8 pb-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full mb-4">
                        <ShieldCheck size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{status === 'SUCCESS' ? 'VERIFIED' : 'IDENTITY VERIFICATION'}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 leading-tight">
                        {status === 'SUCCESS' ? 'পরিচয় নিশ্চিত!' : (studentName + ' এর পরিচয় যাচাই করুন')}
                    </h3>
                    <p className="text-[12px] font-bold text-slate-400 mt-2">
                        {status === 'SUCCESS' ? 'সফলভাবে যাচাই করা হয়েছে' : 'কাজটি সম্পন্ন করতে আপনার মুখমন্ডল ক্যামেরার সামনে ধরে রাখুন'}
                    </p>
                </div>

                {/* Scanner View */}
                <div className="relative aspect-square mx-8 mb-8 bg-slate-100 rounded-[32px] overflow-hidden group">
                    {/* Video Stream */}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover transition-transform duration-700 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${status === 'SUCCESS' ? 'scale-110' : ''}`}
                    />

                    {/* Camera Toggle Button */}
                    <button
                        onClick={toggleCamera}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white hover:bg-black/60 transition-all active:scale-90 z-20"
                        title="ক্যামেরা পরিবর্তন করুন"
                    >
                        <RefreshCw size={18} className={facingMode === 'environment' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>

                    {/* Pause Toggle Button */}
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`absolute top-16 right-4 w-10 h-10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center transition-all active:scale-90 z-20 shadow-lg ${isPaused ? 'bg-amber-500 text-white border-amber-400' : 'bg-black/40 text-white hover:bg-black/60'}`}
                        title={isPaused ? "Resume Scanning" : "Pause Scanning"}
                    >
                        {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                    </button>
                    <canvas ref={canvasRef} className="hidden" />

                    {/* States Overlay */}
                    <AnimatePresence>
                        {(status === 'LOADING_MODELS' || status === 'STARTING_CAMERA' || isProcessingPhoto) && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-4 text-center p-6"
                            >
                                <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                    {isProcessingPhoto ? 'Processing Photo...' :
                                        status === 'LOADING_MODELS' ? 'Loading AI...' : 'Starting Camera...'}
                                </span>
                            </motion.div>
                        )}

                        {status === 'SUCCESS' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8"
                            >
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', damping: 15 }}
                                    className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl"
                                >
                                    <ShieldCheck size={48} className="text-emerald-500" />
                                </motion.div>
                                <h4 className="text-2xl font-black mb-1">ধন্যবাদ, {studentName}!</h4>
                                <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest">যাচাইকরণ সম্পন্ন হয়েছে</p>
                            </motion.div>
                        )}

                        {status === 'ERROR' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 p-8 text-center"
                            >
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle size={32} />
                                </div>
                                <h4 className="text-lg font-black mb-2 italic">ত্রুটি হয়েছে</h4>
                                <p className="text-sm font-bold opacity-80 mb-6">{error}</p>
                                <button
                                    onClick={initVerification}
                                    className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 flex items-center gap-2"
                                >
                                    <RefreshCw size={14} /> আবার চেষ্টা করুন
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Scan Line Animation - Only on high capacity devices */}
                    {(status === 'VERIFYING' && !isPaused && !isLowCapacity) && (
                        <>
                            <motion.div
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent z-10 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            />

                            {/* Score Indicator */}
                            <div className="absolute bottom-6 left-6 right-6 h-1.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-md">
                                <motion.div
                                    className={`h-full transition-all duration-300 ${matchScore > 0.4 ? 'bg-emerald-400' : 'bg-blue-400'}`}
                                    style={{ width: `${matchScore * 100}%` }}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-0 flex flex-col gap-4">
                    {status === 'VERIFYING' && (
                        <div className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-blue-100">
                            <Loader2 size={12} className="animate-spin" />
                            লাইভ স্ক্যানিং চলছে...
                        </div>
                    ) || (status === 'STARTING_CAMERA' && (
                        <div className="w-full py-2 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-slate-100">
                            <Loader2 size={12} className="animate-spin" />
                            ক্যামেরা চালু হচ্ছে...
                        </div>
                    ))}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                            বাতিল করুন
                        </button>
                        {(status !== 'SUCCESS' && status !== 'LOADING_MODELS') && (
                            <button
                                onClick={() => uploadRef.current?.click()}
                                className="flex-[2] py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                <Upload size={14} /> ফটো আপলোড
                            </button>
                        )}
                    </div>
                </div>

                <input
                    type="file"
                    ref={uploadRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                />

                {/* Top Corner Close */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                    <X size={20} />
                </button>
            </motion.div>
        </div>
    );
}
