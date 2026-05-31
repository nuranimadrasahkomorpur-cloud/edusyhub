'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, RefreshCw, CheckCircle2, XCircle, Loader2, Sparkles, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePerformance } from '../hooks/usePerformance';

const getFaceOrientation = (landmarks: faceapi.FaceLandmarks68) => {
    const jaw = landmarks.getJawOutline();
    const nose = landmarks.getNose();
    const noseTip = nose[3]; // Point 30
    const leftCheek = jaw[0]; // Point 0
    const rightCheek = jaw[16]; // Point 16
    
    const distLeft = Math.abs(noseTip.x - leftCheek.x);
    const distRight = Math.abs(rightCheek.x - noseTip.x);
    
    if (distRight === 0) return 'UNKNOWN';
    const ratio = distLeft / distRight;
    
    if (ratio >= 0.75 && ratio <= 1.35) {
        return 'MIDDLE';
    } else if (ratio < 0.75) {
        return 'RIGHT';
    } else {
        return 'LEFT';
    }
};

interface FaceEnrollmentProps {
    studentId: string;
    studentName: string;
    onSuccess?: () => void;
    onClose: () => void;
}

export default function FaceEnrollment({ studentId, studentName, onSuccess, onClose }: FaceEnrollmentProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<'IDLE' | 'LOADING_MODELS' | 'READY' | 'CAPTURING' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [currentStep, setCurrentStep] = useState<'LEFT' | 'MIDDLE' | 'RIGHT' | 'DONE'>('LEFT');
    const [capturedMiddle, setCapturedMiddle] = useState<number[] | null>(null);
    const [capturedLeft, setCapturedLeft] = useState<number[] | null>(null);
    const [capturedRight, setCapturedRight] = useState<number[] | null>(null);
    const [isStepLocked, setIsStepLocked] = useState(false);
    const [detectedOrientation, setDetectedOrientation] = useState<'LEFT' | 'MIDDLE' | 'RIGHT' | 'UNKNOWN' | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [isUsingPhoto, setIsUsingPhoto] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const { isLowCapacity } = usePerformance();

    const [mode, setMode] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');
    const [previewLeft, setPreviewLeft] = useState<string | null>(null);
    const [previewMiddle, setPreviewMiddle] = useState<string | null>(null);
    const [previewRight, setPreviewRight] = useState<string | null>(null);
    const previewsRef = useRef<{ left: string | null; middle: string | null; right: string | null }>({
        left: null,
        middle: null,
        right: null,
    });

    useEffect(() => {
        loadModels();
        return () => {
            stopCamera();
            if (previewsRef.current.left) URL.revokeObjectURL(previewsRef.current.left);
            if (previewsRef.current.middle) URL.revokeObjectURL(previewsRef.current.middle);
            if (previewsRef.current.right) URL.revokeObjectURL(previewsRef.current.right);
        };
    }, []);

    const handleSwitchMode = (newMode: 'CAMERA' | 'UPLOAD') => {
        setMode(newMode);
        setError(null);
        if (newMode === 'UPLOAD') {
            stopCamera();
        } else {
            if (modelsLoaded) {
                startCamera();
            }
        }
    };

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
            startCamera(); // Auto-start the camera once models are loaded
        } catch (err: any) {
            console.error('Error loading models:', err);
            setError('মডেল লোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
            setStatus('ERROR');
        }
    };

    const startCamera = async () => {
        try {
            setError(null);
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('ক্যামেরা ব্যবহারের জন্য HTTPS সংযোগ (বা localhost) প্রয়োজন। দয়া করে ফটো আপলোড ব্যবহার করুন।');
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } }
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
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('ক্যামেরা ব্যবহারের জন্য HTTPS সংযোগ (বা localhost) প্রয়োজন। দয়া করে ফটো আপলোড ব্যবহার করুন।');
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } }
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
        const clearCurrentPreview = () => {
            if (currentStep === 'LEFT') {
                setPreviewLeft(null);
                previewsRef.current.left = null;
            } else if (currentStep === 'MIDDLE') {
                setPreviewMiddle(null);
                previewsRef.current.middle = null;
            } else if (currentStep === 'RIGHT') {
                setPreviewRight(null);
                previewsRef.current.right = null;
            }
        };

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
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detections) {
                setError('ছবিতে কোনো মুখ পাওয়া যায়নি। দয়া করে পরিষ্কার ছবি ব্যবহার করুন।');
                setStatus('READY');
                clearCurrentPreview();
                return;
            }

            // High Precision Quality Check
            const { score } = detections.detection;
            const landmarks = detections.landmarks;
            const box = detections.detection.box;

            // Check confidence (75%+)
            if (score < 0.75) {
                setError('ছবিটি যথেষ্ট পরিষ্কার নয়। দয়া করে পর্যাপ্ত আলোতে ভালো ক্যামেরা ব্যবহার করুন।');
                setStatus('READY');
                clearCurrentPreview();
                return;
            }

            // Verify face orientation matches current step
            const orientation = getFaceOrientation(detections.landmarks);
            if (orientation !== currentStep) {
                if (currentStep === 'LEFT') {
                    setError('ভুল ছবি! দয়া করে বাম দিকের মুখমন্ডলের ছবি আপলোড করুন।');
                } else if (currentStep === 'MIDDLE') {
                    setError('ভুল ছবি! দয়া করে সামনে সোজা মুখমন্ডলের ছবি আপলোড করুন।');
                } else if (currentStep === 'RIGHT') {
                    setError('ভুল ছবি! দয়া করে ডান দিকের মুখমন্ডলের ছবি আপলোড করুন।');
                }
                setStatus('READY');
                clearCurrentPreview();
                return;
            }

            // Generate annotated preview with landmarks
            try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const ctx = tempCanvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    
                    const points = landmarks.positions;
                    ctx.fillStyle = '#045c84'; // Premium theme blue
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                    ctx.lineWidth = Math.max(1.5, img.width / 350);
                    
                    // Connection outlines for each specific facial feature
                    const drawFeatureOutline = (start: number, end: number, isClosed = false) => {
                        ctx.beginPath();
                        ctx.moveTo(points[start].x, points[start].y);
                        for (let i = start + 1; i <= end; i++) {
                            ctx.lineTo(points[i].x, points[i].y);
                        }
                        if (isClosed) ctx.closePath();
                        ctx.stroke();
                    };

                    // Draw Jaw Outline (0 - 16)
                    drawFeatureOutline(0, 16, false);
                    // Draw Left Eyebrow (17 - 21)
                    drawFeatureOutline(17, 21, false);
                    // Draw Right Eyebrow (22 - 26)
                    drawFeatureOutline(22, 26, false);
                    // Draw Nose Bridge (27 - 30)
                    drawFeatureOutline(27, 30, false);
                    // Draw Nose Bottom/Nostrils (30 - 35, closed)
                    ctx.beginPath();
                    ctx.moveTo(points[30].x, points[30].y);
                    for (let i = 31; i <= 35; i++) ctx.lineTo(points[i].x, points[i].y);
                    ctx.closePath();
                    ctx.stroke();
                    // Draw Left Eye (36 - 41, closed)
                    drawFeatureOutline(36, 41, true);
                    // Draw Right Eye (42 - 47, closed)
                    drawFeatureOutline(42, 47, true);
                    // Draw Outer Lips (48 - 59, closed)
                    drawFeatureOutline(48, 59, true);
                    // Draw Inner Lips (60 - 67, closed)
                    drawFeatureOutline(60, 67, true);

                    // Glowing dots
                    const radius = Math.max(2.5, img.width / 180);
                    points.forEach((pt) => {
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = Math.max(0.5, img.width / 750);
                        ctx.stroke();
                    });
                    
                    const annotatedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
                    if (currentStep === 'LEFT') {
                        setPreviewLeft(annotatedDataUrl);
                        previewsRef.current.left = annotatedDataUrl;
                    } else if (currentStep === 'MIDDLE') {
                        setPreviewMiddle(annotatedDataUrl);
                        previewsRef.current.middle = annotatedDataUrl;
                    } else if (currentStep === 'RIGHT') {
                        setPreviewRight(annotatedDataUrl);
                        previewsRef.current.right = annotatedDataUrl;
                    }
                }
            } catch (err) {
                console.warn('Failed to draw landmarks on preview image:', err);
            }

            // Process descriptor for current step rather than saving immediately
            const desc = Array.from(detections.descriptor);

            // Verify if the face matches the previously captured step's face (Same Person Validation)
            if (currentStep === 'MIDDLE' && capturedLeft) {
                const dist = faceapi.euclideanDistance(capturedLeft, desc);
                if (dist > 0.6) {
                    setError('ভিন্ন ব্যক্তি সনাক্ত হয়েছে! অনুগ্রহ করে একই ব্যক্তির ছবি প্রদান করুন।');
                    setStatus('READY');
                    clearCurrentPreview();
                    return;
                }
            } else if (currentStep === 'RIGHT') {
                const compareTarget = capturedMiddle || capturedLeft;
                if (compareTarget) {
                    const dist = faceapi.euclideanDistance(compareTarget, desc);
                    if (dist > 0.6) {
                        setError('ভিন্ন ব্যক্তি সনাক্ত হয়েছে! অনুগ্রহ করে একই ব্যক্তির ছবি প্রদান করুন।');
                        setStatus('READY');
                        clearCurrentPreview();
                        return;
                    }
                }
            }

            if (currentStep === 'LEFT') {
                setCapturedLeft(desc);
                setIsStepLocked(true);
                setProgress(35);
                setTimeout(() => {
                    setCurrentStep('MIDDLE');
                    setIsStepLocked(false);
                }, 2000);
            } else if (currentStep === 'MIDDLE') {
                // Check for potential duplicates (Scaled Accuracy) on MIDDLE face
                try {
                    const checkRes = await fetch(`/api/admin/students/check-duplicate-face`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ descriptor: desc })
                    });
                    
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        if (checkData.isDuplicate && checkData.studentId !== studentId) {
                            setError(`এই মুখটি ইতিপূর্বে ${checkData.studentName} নামে নিবন্ধিত হয়েছে। এটি নতুন করে যুক্ত করা সম্ভব নয়।`);
                            setStatus('READY');
                            clearCurrentPreview();
                            return;
                        }
                    }
                } catch (err) {
                    console.warn('Collision check failed, proceeding with baseline accuracy.');
                }

                setCapturedMiddle(desc);
                setIsStepLocked(true);
                setProgress(70);
                setTimeout(() => {
                    setCurrentStep('RIGHT');
                    setIsStepLocked(false);
                }, 2000);
            } else if (currentStep === 'RIGHT') {
                setCapturedRight(desc);
                setProgress(90);
                
                // Auto-save when all three are successfully captured
                const descs = [
                    capturedLeft || desc,
                    capturedMiddle || desc,
                    desc
                ];
                await saveFaceDescriptors(descs);
            }

        } catch (err: any) {
            console.error('Image processing error:', err);
            setError('ছবি প্রসেস করতে সমস্যা হয়েছে।');
            setStatus('READY');
            clearCurrentPreview();
        } finally {
            setIsUsingPhoto(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Generate and set preview for current step
        const previewUrl = URL.createObjectURL(file);
        if (currentStep === 'LEFT') {
            setPreviewLeft(previewUrl);
            previewsRef.current.left = previewUrl;
        } else if (currentStep === 'MIDDLE') {
            setPreviewMiddle(previewUrl);
            previewsRef.current.middle = previewUrl;
        } else if (currentStep === 'RIGHT') {
            setPreviewRight(previewUrl);
            previewsRef.current.right = previewUrl;
        }

        setIsUsingPhoto(true);
        await processImage(file);
        if (uploadInputRef.current) uploadInputRef.current.value = '';
    };


    const saveFaceDescriptors = async (descriptors: number[][]) => {
        try {
            setStatus('SAVING');
            const response = await fetch(`/api/students/${studentId}/face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descriptor: descriptors }),
            });

            if (!response.ok) throw new Error('Failed to save face data');

            setProgress(100);
            setStatus('SUCCESS');
            if (onSuccess) onSuccess();

            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err: any) {
            console.error('Enrollment save error:', err);
            setError('ফেস ডেটা সেভ করতে সমস্যা হয়েছে।');
            setStatus('READY');
        }
    };

    const handleSaveCurrent = () => {
        const descs: number[][] = [];
        if (capturedLeft) descs.push(capturedLeft);
        if (capturedMiddle) descs.push(capturedMiddle);
        if (capturedRight) descs.push(capturedRight);
        
        if (descs.length === 0) {
            setError('কমপক্ষে একটি ফেস আইডি প্রয়োজন।');
            return;
        }
        saveFaceDescriptors(descs);
    };

    const handleEnroll = () => {
        setError(null);
        setCapturedMiddle(null);
        setCapturedLeft(null);
        setCapturedRight(null);
        setCurrentStep('LEFT');
        setIsStepLocked(false);
        setDetectedOrientation(null);
        setStatus('CAPTURING');
        setProgress(10);
    };

    // Live scanner effect for sequential face enrollment
    useEffect(() => {
        let active = true;
        let timerId: any = null;

        const scanFrame = async () => {
            if (!active || status !== 'CAPTURING' || !videoRef.current || isStepLocked) {
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
                return;
            }

            try {
                const detections = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                // Draw landmarks on camera canvas overlay
                if (canvasRef.current && videoRef.current) {
                    const displaySize = {
                        width: videoRef.current.videoWidth || 640,
                        height: videoRef.current.videoHeight || 480
                    };
                    
                    if (canvasRef.current.width !== displaySize.width || canvasRef.current.height !== displaySize.height) {
                        faceapi.matchDimensions(canvasRef.current, displaySize);
                    }
                    
                    const ctx = canvasRef.current.getContext('2d');
                    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    
                    if (detections) {
                        const resizedDetections = faceapi.resizeResults(detections, displaySize);
                        const landmarks = resizedDetections.landmarks;
                        const points = landmarks.positions;
                        
                        if (ctx) {
                            ctx.fillStyle = '#045c84'; // Premium theme blue
                            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                            ctx.lineWidth = 1.5;
                            
                            // Connection outlines for each specific facial feature
                            const drawFeatureOutline = (start: number, end: number, isClosed = false) => {
                                ctx.beginPath();
                                ctx.moveTo(points[start].x, points[start].y);
                                for (let i = start + 1; i <= end; i++) {
                                    ctx.lineTo(points[i].x, points[i].y);
                                }
                                if (isClosed) ctx.closePath();
                                ctx.stroke();
                            };

                            // Draw Jaw Outline (0 - 16)
                            drawFeatureOutline(0, 16, false);
                            // Draw Left Eyebrow (17 - 21)
                            drawFeatureOutline(17, 21, false);
                            // Draw Right Eyebrow (22 - 26)
                            drawFeatureOutline(22, 26, false);
                            // Draw Nose Bridge (27 - 30)
                            drawFeatureOutline(27, 30, false);
                            // Draw Nose Bottom/Nostrils (30 - 35, closed)
                            ctx.beginPath();
                            ctx.moveTo(points[30].x, points[30].y);
                            for (let i = 31; i <= 35; i++) ctx.lineTo(points[i].x, points[i].y);
                            ctx.closePath();
                            ctx.stroke();
                            // Draw Left Eye (36 - 41, closed)
                            drawFeatureOutline(36, 41, true);
                            // Draw Right Eye (42 - 47, closed)
                            drawFeatureOutline(42, 47, true);
                            // Draw Outer Lips (48 - 59, closed)
                            drawFeatureOutline(48, 59, true);
                            // Draw Inner Lips (60 - 67, closed)
                            drawFeatureOutline(60, 67, true);

                            // Glowing dots
                            points.forEach((pt) => {
                                ctx.beginPath();
                                ctx.arc(pt.x, pt.y, 2.5, 0, 2 * Math.PI);
                                ctx.fill();
                                ctx.strokeStyle = '#ffffff';
                                ctx.lineWidth = 0.5;
                                ctx.stroke();
                            });
                        }
                    }
                }

                if (detections && detections.detection.score >= 0.88) {
                    const orientation = getFaceOrientation(detections.landmarks);
                    setDetectedOrientation(orientation);
                    
                    if (currentStep === 'LEFT' && orientation === 'LEFT') {
                        setCapturedLeft(Array.from(detections.descriptor));
                        setIsStepLocked(true);
                        setProgress(35);
                        setTimeout(() => {
                            setCurrentStep('MIDDLE');
                            setIsStepLocked(false);
                        }, 2000);
                    } else if (currentStep === 'MIDDLE' && orientation === 'MIDDLE') {
                        // Same Person Validation
                        if (capturedLeft) {
                            const dist = faceapi.euclideanDistance(capturedLeft, Array.from(detections.descriptor));
                            if (dist > 0.6) {
                                setError('ভিন্ন ব্যক্তি সনাক্ত হয়েছে! অনুগ্রহ করে একই ব্যক্তির ছবি স্ক্যান করুন।');
                                setStatus('READY');
                                return;
                            }
                        }

                        // Check duplicate on middle face
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
                                    setStatus('READY');
                                    return;
                                }
                            }
                        } catch (err) {
                            console.warn('Duplicate check failed');
                        }

                        setCapturedMiddle(Array.from(detections.descriptor));
                        setIsStepLocked(true);
                        setProgress(70);
                        setTimeout(() => {
                            setCurrentStep('RIGHT');
                            setIsStepLocked(false);
                        }, 2000);
                    } else if (currentStep === 'RIGHT' && orientation === 'RIGHT') {
                        // Same Person Validation
                        const compareTarget = capturedMiddle || capturedLeft;
                        if (compareTarget) {
                            const dist = faceapi.euclideanDistance(compareTarget, Array.from(detections.descriptor));
                            if (dist > 0.6) {
                                setError('ভিন্ন ব্যক্তি সনাক্ত হয়েছে! অনুগ্রহ করে একই ব্যক্তির ছবি স্ক্যান করুন।');
                                setStatus('READY');
                                return;
                            }
                        }

                        setCapturedRight(Array.from(detections.descriptor));
                        setCurrentStep('DONE');
                        setProgress(90);
                        
                        // Auto-save when all three are successfully captured
                        const descs = [
                            capturedLeft || Array.from(detections.descriptor),
                            capturedMiddle || Array.from(detections.descriptor),
                            Array.from(detections.descriptor)
                        ];
                        await saveFaceDescriptors(descs);
                    }
                } else {
                    setDetectedOrientation(null);
                }
            } catch (err) {
                console.error("Frame scan error:", err);
            }

            if (active && status === 'CAPTURING' && currentStep !== 'DONE') {
                timerId = setTimeout(scanFrame, 200);
            }
        };

        if (status === 'CAPTURING' && currentStep !== 'DONE') {
            timerId = setTimeout(scanFrame, 200);
        }

        return () => {
            active = false;
            if (timerId) clearTimeout(timerId);
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        };
    }, [status, currentStep, capturedMiddle, capturedLeft, capturedRight, isStepLocked]);

    const getInstructionMessage = () => {
        if (status === 'READY') {
            return error ? 'ক্যামেরা সংযোগ বিচ্ছিন্ন' : 'রেজিস্ট্রেশন শুরু করতে ক্যামেরা চালু করুন';
        }
        if (status === 'SAVING') {
            return 'ফেস ডেটা সংরক্ষণ করা হচ্ছে...';
        }
        if (status === 'CAPTURING') {
            if (isStepLocked) {
                return currentStep === 'LEFT' ? 'বাম দিক সফল! এবার সামনে সোজা তাকান...' :
                       currentStep === 'MIDDLE' ? 'সামনে সোজা সফল! এবার ডানে তাকান...' :
                       'প্রক্রিয়া করা হচ্ছে...';
            }
            if (detectedOrientation && detectedOrientation !== 'UNKNOWN' && detectedOrientation !== currentStep) {
                if (currentStep === 'LEFT') return 'ভুল দিক! দয়া করে বামে ঘোরান...';
                if (currentStep === 'MIDDLE') return 'ভুল দিক! দয়া করে সামনে সোজা তাকান...';
                if (currentStep === 'RIGHT') return 'ভুল দিক! দয়া করে ডানে ঘোরান...';
            }
            if (currentStep === 'LEFT') return 'মাথা হালকা বামে ঘোরান...';
            if (currentStep === 'MIDDLE') return 'সামনে সোজা তাকান...';
            if (currentStep === 'RIGHT') return 'মাথা হালকা ডানে ঘোরান...';
            if (currentStep === 'DONE') return 'সম্পূর্ণ হচ্ছে...';
        }
        return '';
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-slate-100"
            >
                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={uploadInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                />
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

                {/* Mode Selector Tabs */}
                {status !== 'SUCCESS' && status !== 'LOADING_MODELS' && status !== 'SAVING' && (
                    <div className="px-6 pb-4 bg-white flex">
                        <div className="flex w-full p-1 bg-slate-100/80 rounded-2xl border border-slate-200/40">
                            <button
                                type="button"
                                onClick={() => handleSwitchMode('CAMERA')}
                                className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'CAMERA' ? 'bg-white text-slate-800 shadow-sm shadow-slate-200/50 border border-slate-100' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                <Camera size={14} className={mode === 'CAMERA' ? 'text-[#045c84]' : ''} />
                                <span>ক্যামেরা মোড</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSwitchMode('UPLOAD')}
                                className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'UPLOAD' ? 'bg-white text-slate-800 shadow-sm shadow-slate-200/50 border border-slate-100' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                <Upload size={14} className={mode === 'UPLOAD' ? 'text-[#045c84]' : ''} />
                                <span>ফটো আপলোড</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal Content Box (Aspect Square to maintain layout size) */}
                <div className={`relative aspect-square overflow-hidden transition-colors duration-300 ${mode === 'CAMERA' ? 'bg-slate-950' : 'bg-slate-50 border-t border-slate-100'}`}>
                    
                    {/* CAMERA Mode View */}
                    {mode === 'CAMERA' && (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className={`w-full h-full object-cover ${facingMode === 'user' ? 'mirror scale-x-[-1]' : ''}`}
                            />
                            {/* Canvas for Drawing Landmarks */}
                            <canvas
                                ref={canvasRef}
                                className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
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
                        </>
                    )}

                    {/* UPLOAD Mode View */}
                    {mode === 'UPLOAD' && (
                        <div className="absolute inset-0 flex flex-col p-6 justify-between select-none">
                            {/* Title & Instructions */}
                            <div className="text-center">
                                <h4 className="text-[14px] font-black text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
                                    <Sparkles size={14} className="text-[#045c84]" />
                                    ম্যানুয়াল ফটো আপলোড
                                </h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">বাম, সামনে এবং ডান দিকের ছবি আপলোড করুন</p>
                            </div>

                            {/* Three Upload Slots Grid */}
                            <div className="grid grid-cols-3 gap-3 my-auto">
                                {/* Slot 1: Left */}
                                <div 
                                    onClick={() => currentStep === 'LEFT' && !isUsingPhoto && uploadInputRef.current?.click()}
                                    className={`relative aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden transition-all bg-white ${
                                        capturedLeft 
                                            ? 'border-emerald-500 shadow-md shadow-emerald-50/50' 
                                            : currentStep === 'LEFT' 
                                                ? 'border-[#045c84] ring-4 ring-[#045c84]/10 cursor-pointer scale-105 shadow-md shadow-slate-100' 
                                                : 'border-slate-200 opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    {previewLeft ? (
                                        <img src={previewLeft} alt="Left" className="w-full h-full object-cover" />
                                    ) : capturedLeft ? (
                                        <div className="flex flex-col items-center gap-1 text-center text-emerald-500 p-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <span className="text-[8px] font-black leading-tight">স্ক্যানকৃত</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 p-2 text-center text-slate-400">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentStep === 'LEFT' ? 'bg-[#045c84]/10 text-[#045c84]' : 'bg-slate-50 text-slate-300'}`}>
                                                <Upload size={14} />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">আপলোড</span>
                                        </div>
                                    )}
                                    <div className={`absolute bottom-0 left-0 right-0 py-1 text-center text-[8px] font-bold text-white uppercase tracking-wider ${capturedLeft ? 'bg-emerald-500' : 'bg-slate-700/80'}`}>
                                        ১. বাম দিক
                                    </div>
                                    {capturedLeft && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                                            <CheckCircle2 size={10} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>

                                {/* Slot 2: Middle */}
                                <div 
                                    onClick={() => currentStep === 'MIDDLE' && !isUsingPhoto && uploadInputRef.current?.click()}
                                    className={`relative aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden transition-all bg-white ${
                                        capturedMiddle 
                                            ? 'border-emerald-500 shadow-md shadow-emerald-50/50' 
                                            : currentStep === 'MIDDLE' 
                                                ? 'border-[#045c84] ring-4 ring-[#045c84]/10 cursor-pointer scale-105 shadow-md shadow-slate-100' 
                                                : 'border-slate-200 opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    {previewMiddle ? (
                                        <img src={previewMiddle} alt="Middle" className="w-full h-full object-cover" />
                                    ) : capturedMiddle ? (
                                        <div className="flex flex-col items-center gap-1 text-center text-emerald-500 p-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <span className="text-[8px] font-black leading-tight">স্ক্যানকৃত</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 p-2 text-center text-slate-400">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentStep === 'MIDDLE' ? 'bg-[#045c84]/10 text-[#045c84]' : 'bg-slate-50 text-slate-300'}`}>
                                                <Upload size={14} />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">আপলোড</span>
                                        </div>
                                    )}
                                    <div className={`absolute bottom-0 left-0 right-0 py-1 text-center text-[8px] font-bold text-white uppercase tracking-wider ${capturedMiddle ? 'bg-emerald-500' : 'bg-slate-700/80'}`}>
                                        ২. সামনে সোজা
                                    </div>
                                    {capturedMiddle && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                                            <CheckCircle2 size={10} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>

                                {/* Slot 3: Right */}
                                <div 
                                    onClick={() => currentStep === 'RIGHT' && !isUsingPhoto && uploadInputRef.current?.click()}
                                    className={`relative aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden transition-all bg-white ${
                                        capturedRight 
                                            ? 'border-emerald-500 shadow-md shadow-emerald-50/50' 
                                            : currentStep === 'RIGHT' 
                                                ? 'border-[#045c84] ring-4 ring-[#045c84]/10 cursor-pointer scale-105 shadow-md shadow-slate-100' 
                                                : 'border-slate-200 opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    {previewRight ? (
                                        <img src={previewRight} alt="Right" className="w-full h-full object-cover" />
                                    ) : capturedRight ? (
                                        <div className="flex flex-col items-center gap-1 text-center text-emerald-500 p-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <span className="text-[8px] font-black leading-tight">স্ক্যানকৃত</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 p-2 text-center text-slate-400">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentStep === 'RIGHT' ? 'bg-[#045c84]/10 text-[#045c84]' : 'bg-slate-50 text-slate-300'}`}>
                                                <Upload size={14} />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">আপলোড</span>
                                        </div>
                                    )}
                                    <div className={`absolute bottom-0 left-0 right-0 py-1 text-center text-[8px] font-bold text-white uppercase tracking-wider ${capturedRight ? 'bg-emerald-500' : 'bg-slate-700/80'}`}>
                                        ৩. ডান দিক
                                    </div>
                                    {capturedRight && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                                            <CheckCircle2 size={10} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dynamic Instruction & Upload Trigger Button */}
                            <div className="flex flex-col items-center gap-3">
                                {error ? (
                                    <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-center text-rose-600 text-[10px] font-bold max-w-[280px]">
                                        {error}
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-bold text-[#045c84] text-center bg-[#045c84]/5 px-4 py-1.5 rounded-full border border-[#045c84]/10 uppercase tracking-wider">
                                        {isUsingPhoto ? 'ফাইল প্রসেস করা হচ্ছে...' : 
                                         currentStep === 'LEFT' ? '১. প্রথমে বাম দিকের ফটো আপলোড করুন' :
                                         currentStep === 'MIDDLE' ? '২. এবার সামনে সোজার ফটো আপলোড করুন' :
                                         currentStep === 'RIGHT' ? '৩. পরিশেষে ডান দিকের ফটো আপলোড করুন' : 'সব ছবি আপলোড সম্পন্ন হয়েছে!'}
                                    </p>
                                )}

                                {currentStep !== 'DONE' && (
                                    <button
                                        type="button"
                                        onClick={() => uploadInputRef.current?.click()}
                                        disabled={isUsingPhoto}
                                        className="w-full max-w-[240px] py-3 bg-[#045c84] hover:bg-[#045c84]/95 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isUsingPhoto ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                <span>যাচাই করা হচ্ছে...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={14} />
                                                <span>
                                                    {currentStep === 'LEFT' ? 'বাম দিকের ফটো' :
                                                     currentStep === 'MIDDLE' ? 'সামনে সোজা ফটো' :
                                                     'ডান দিকের ফটো'} সিলেক্ট করুন
                                                </span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status Overlays */}
                    <AnimatePresence>
                        {isStepLocked && (
                            <motion.div
                                key="step-locked-overlay"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-30 pointer-events-none"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.2, 1] }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/35 border border-emerald-400"
                                >
                                    <CheckCircle2 size={48} className="text-white" strokeWidth={3} />
                                </motion.div>
                                <motion.span
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="mt-3 text-sm font-black tracking-wider bg-emerald-600/90 px-4 py-1.5 rounded-full border border-emerald-500 uppercase"
                                >
                                    {currentStep === 'LEFT' ? 'বাম দিক সফল' : 'সামনে সোজা সফল'}
                                </motion.span>
                            </motion.div>
                        )}
                        {status === 'LOADING_MODELS' && (
                            <motion.div key="loading-models-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white text-center p-6 z-[40]">
                                <Loader2 className="animate-spin text-[#045c84] mb-4" size={40} />
                                <h4 className="text-xl font-black mb-1 italic">সিস্টেম প্রস্তুত হচ্ছে...</h4>
                                <p className="text-[11px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">প্রথমবার লোড হতে কিছুক্ষণ সময় লাগতে পারে</p>
                            </motion.div>
                        )}

                        {status === 'SUCCESS' && (
                            <motion.div key="success-overlay" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                className="absolute inset-0 bg-[#045c84]/90 flex flex-col items-center justify-center text-white text-center p-6 z-[40]">
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

                        {mode === 'CAMERA' && (error || ((status === 'READY' || status === 'CAPTURING') && !videoRef.current?.srcObject)) && (
                            <motion.div key="camera-fallback-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white text-center p-6 backdrop-blur-md z-30">
                                <div className={`w-24 h-24 border-4 border-dashed rounded-full flex items-center justify-center ${!isLowCapacity ? 'animate-[spin_20s_linear_infinite]' : 'border-white/20'}`}>
                                    <div className={`w-16 h-16 border-4 border-white/20 rounded-full flex items-center justify-center ${!isLowCapacity ? 'animate-pulse' : ''}`}>
                                        <Camera size={28} className="text-white/40" />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stepper & Instruction Message Overlay */}
                    {mode === 'CAMERA' && (status === 'READY' || status === 'CAPTURING' || status === 'SAVING' || status === 'ERROR') && (
                        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center z-20 pointer-events-none">
                            {/* Message Bubble */}
                            <div className="mb-4 text-center">
                                <p className="text-[12px] font-black uppercase tracking-widest bg-black/50 text-white inline-block px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                                    {getInstructionMessage()}
                                </p>
                            </div>

                            {/* Connected Stepper Progress */}
                            <div className="flex items-center gap-0 pointer-events-auto">
                                {/* Step 1: Left */}
                                <div className="flex flex-col items-center w-12">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-black text-[12px] transition-all duration-300 ${capturedLeft ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : currentStep === 'LEFT' ? 'bg-[#045c84] border-white text-white scale-110 ring-4 ring-[#045c84]/30' : 'bg-slate-900/60 border-slate-700 text-slate-400'}`}>
                                        {capturedLeft ? <CheckCircle2 size={16} strokeWidth={3} /> : '১'}
                                    </div>
                                    <span className="text-[9px] font-black tracking-wider text-slate-300 mt-1.5">বাম</span>
                                </div>

                                {/* Connector Line 1 */}
                                <div className="w-10 h-0.5 bg-slate-700/60 -mt-5 relative">
                                    <div className={`absolute inset-0 bg-emerald-500 transition-all duration-500 ${capturedLeft ? 'w-full' : 'w-0'}`} />
                                </div>

                                {/* Step 2: Middle */}
                                <div className="flex flex-col items-center w-12">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-black text-[12px] transition-all duration-300 ${capturedMiddle ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : currentStep === 'MIDDLE' ? 'bg-[#045c84] border-white text-white scale-110 ring-4 ring-[#045c84]/30' : 'bg-slate-900/60 border-slate-700 text-slate-400'}`}>
                                        {capturedMiddle ? <CheckCircle2 size={16} strokeWidth={3} /> : '২'}
                                    </div>
                                    <span className="text-[9px] font-black tracking-wider text-slate-300 mt-1.5">সামনে</span>
                                </div>

                                {/* Connector Line 2 */}
                                <div className="w-10 h-0.5 bg-slate-700/60 -mt-5 relative">
                                    <div className={`absolute inset-0 bg-emerald-500 transition-all duration-500 ${capturedMiddle ? 'w-full' : 'w-0'}`} />
                                </div>

                                {/* Step 3: Right */}
                                <div className="flex flex-col items-center w-12">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-black text-[12px] transition-all duration-300 ${capturedRight ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : currentStep === 'RIGHT' ? 'bg-[#045c84] border-white text-white scale-110 ring-4 ring-[#045c84]/30' : 'bg-slate-900/60 border-slate-700 text-slate-400'}`}>
                                        {capturedRight ? <CheckCircle2 size={16} strokeWidth={3} /> : '৩'}
                                    </div>
                                    <span className="text-[9px] font-black tracking-wider text-slate-300 mt-1.5">ডান</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar (Only line) */}
                    {(status === 'CAPTURING' || status === 'SAVING') && (
                        <div className="absolute bottom-0 left-0 right-0 z-20">
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

            </motion.div>
        </div>
    );
}
