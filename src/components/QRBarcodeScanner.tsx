'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, AlertCircle, Loader2, Camera } from 'lucide-react';

interface QRBarcodeScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (scannedValue: string) => void;
}

type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied';

export default function QRBarcodeScanner({ isOpen, onClose, onScan }: QRBarcodeScannerProps) {
    const scannerRef = useRef<HTMLDivElement>(null);
    const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
    const isRenderingRef = useRef(false);
    const isActiveRef = useRef(false);
    const [error, setError] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);
    const [scannedCount, setScannedCount] = useState(0);
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('idle');
    const [useFrontCamera, setUseFrontCamera] = useState(false); // Default to back camera for mobile
    const lastScannedRef = useRef<string>('');
    const scanDelayRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingRef = useRef<boolean>(false);

    // Request camera permission when modal opens
    useEffect(() => {
        if (!isOpen) {
            setPermissionStatus('idle');
            window.dispatchEvent(new Event('modalClose'));
            return;
        }

        console.log('🎥 Scanner modal opened, requesting camera permission...');
        window.dispatchEvent(new Event('modalOpen'));

        const requestCameraPermission = async () => {
            setPermissionStatus('requesting');
            try {
                console.log('📷 Requesting camera access...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                console.log('✅ Camera permission granted!');
                // Release the stream immediately after permission check
                stream.getTracks().forEach(track => track.stop());
                setPermissionStatus('granted');
            } catch (err) {
                console.error('❌ Camera permission denied:', err);
                setPermissionStatus('denied');
                setError('Camera permission denied. Please enable camera in your browser settings.');
            }
        };

        requestCameraPermission();
    }, [isOpen]);

    // Initialize scanner when permission is granted
    useEffect(() => {
        if (!isOpen || permissionStatus !== 'granted' || !scannerRef.current) {
            return;
        }

        let isEffectActive = true;
        
        // Reset scan state each time we open the scanner
        if (scanDelayRef.current) {
            clearTimeout(scanDelayRef.current);
            scanDelayRef.current = null;
        }
        isProcessingRef.current = false;
        lastScannedRef.current = '';

        const initScanner = async () => {
            setError('');
            setIsScanning(false);
            setScannedCount(0);
            isRenderingRef.current = false;

            try {
                // Ensure container exists
                if (!document.getElementById('qr-scanner-container')) {
                    setError('Failed to initialize scanner - container not ready');
                    return;
                }

                const html5Qrcode = new Html5Qrcode('qr-scanner-container');
                scannerInstanceRef.current = html5Qrcode;

                const cameras = await Html5Qrcode.getCameras();
                if (!cameras || cameras.length === 0) {
                    throw new Error('No camera devices found');
                }

                const selectedCamera = useFrontCamera
                    ? cameras.find(cam => /front|user|face/i.test(cam.label)) || cameras[0]
                    : cameras.find(cam => /back|rear|environment/i.test(cam.label)) || cameras[0];

                const scannerConfig = {
                    fps: 10, // Optimized from 30 to 10 for better battery and performance
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    disableFlip: false
                };

                const onScanSuccess = async (decodedText: string) => {
                    if (!isActiveRef.current || !isRenderingRef.current || !scannerInstanceRef.current) return;

                    const normalizedText = decodedText?.trim();
                    if (!normalizedText || isProcessingRef.current) return;
                    
                    if (normalizedText !== lastScannedRef.current) {
                        isProcessingRef.current = true;
                        lastScannedRef.current = normalizedText;
                        setScannedCount(prev => prev + 1);
                        
                        if (scanDelayRef.current) clearTimeout(scanDelayRef.current);
                        
                        scanDelayRef.current = setTimeout(async () => {
                            try {
                                await onScan(normalizedText);
                            } catch (err) {
                                console.debug('Scan callback error:', err);
                            } finally {
                                scanDelayRef.current = null;
                                setTimeout(() => {
                                    if (scannerInstanceRef.current && isRenderingRef.current) {
                                        try { scannerInstanceRef.current.stop().catch(() => {}); } catch(e) {}
                                        scannerInstanceRef.current = null;
                                    }
                                    onClose();
                                    isProcessingRef.current = false;
                                }, 100);
                            }
                        }, 100);
                    }
                };

                isActiveRef.current = true;
                
                await html5Qrcode.start(selectedCamera.id, scannerConfig, onScanSuccess, () => {});
                
                if (!isEffectActive) {
                    try { await html5Qrcode.stop(); html5Qrcode.clear(); } catch(e) {}
                    return;
                }
                
                isRenderingRef.current = true;
                setIsScanning(true);
                
            } catch (err) {
                console.debug('Scanner initialization error:', err);
                setError('Failed to initialize scanner');
            }
        };

        initScanner();

        return () => {
            isEffectActive = false;
            
            if (scanDelayRef.current) {
                clearTimeout(scanDelayRef.current);
                scanDelayRef.current = null;
            }
            
            stopScanner();
        };
    }, [isOpen, permissionStatus, onScan, onClose, useFrontCamera]);

    const stopScanner = () => {
        if (!scannerInstanceRef.current) {
            setIsScanning(false);
            return;
        }

        const instance = scannerInstanceRef.current;
        scannerInstanceRef.current = null;
        isActiveRef.current = false;
        isRenderingRef.current = false;
        setIsScanning(false);

        try {
            if (typeof instance.stop === 'function') {
                console.log('⏹️ Stopping scanner...');
                instance.stop()
                    .then(() => {
                        if (typeof instance.clear === 'function') {
                            try {
                                instance.clear();
                            } catch (err) {
                                console.debug('Scanner clear error:', err);
                            }
                        }
                    })
                    .catch(err => console.debug('Scanner stop error:', err));
            } else if (typeof instance.clear === 'function') {
                try {
                    instance.clear();
                } catch (err) {
                    console.debug('Scanner clear error:', err);
                }
            }
        } catch (err) {
            console.debug('Error stopping scanner:', err);
        }
    };

    const handleClose = () => {
        // Clear pending scan delay
        if (scanDelayRef.current) {
            clearTimeout(scanDelayRef.current);
            scanDelayRef.current = null;
        }
        isProcessingRef.current = false;
        lastScannedRef.current = '';
        isActiveRef.current = false;
        stopScanner();
        window.dispatchEvent(new Event('modalClose'));
        onClose();
    };

    const handleRetryPermission = async () => {
        if (scanDelayRef.current) clearTimeout(scanDelayRef.current);
        setPermissionStatus('requesting');
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Release the stream immediately after permission check
            stream.getTracks().forEach(track => track.stop());
            setPermissionStatus('granted');
        } catch (err) {
            console.debug('Camera permission denied:', err);
            setPermissionStatus('denied');
            setError('Camera permission denied. Please enable camera in your browser settings.');
        }
    };

    useEffect(() => {
        if (!isOpen) {
            console.log('📴 Scanner closed, forcing camera stop');
            stopScanner();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <style>{`
                #qr-scanner-container {
                    background: #000 !important;
                    border-radius: 1rem !important;
                    overflow: hidden !important;
                    position: relative !important;
                    aspect-ratio: 1 / 1 !important;
                    width: 100% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                
                #qr-scanner-container video, #qr-scanner-container canvas {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 1rem !important;
                }
                
                #qr-scanner-container > div:first-child {
                    padding: 0 !important;
                    border-radius: 1rem !important;
                }
                
                #qr-scanner-container button {
                    background: #045c84 !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 0.375rem !important;
                    padding: 0.375rem 0.75rem !important;
                    font-weight: bold !important;
                    font-size: 0.75rem !important;
                    cursor: pointer !important;
                    transition: all 0.2s !important;
                    margin: 0.25rem 0.25rem !important;
                }
                
                #qr-scanner-container button:hover {
                    background: #034567 !important;
                }
                
                #qr-scanner-container button:active {
                    transform: scale(0.95) !important;
                }
                
                #qr-scanner-container select {
                    display: none !important;
                }
                
                #qr-scanner-container a {
                    display: none !important;
                }
                
                #qr-scanner-container > div:not(:first-child) {
                    padding: 0.25rem 0.25rem !important;
                    text-align: center !important;
                    display: flex !important;
                    gap: 0.25rem !important;
                    justify-content: center !important;
                    flex-wrap: wrap !important;
                }
                
                .html5-qrcode-element {
                    width: 100% !important;
                }
            `}</style>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto" onClick={handleClose} />
                
                <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl animate-scale-in overflow-hidden relative z-10 flex flex-col pointer-events-auto">
                    {/* Header */}
                    <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
                        <h2 className="text-lg font-bold text-slate-800 font-bengali">কিউআর / বারকোড স্ক্যান করুন</h2>
                        <button 
                            onClick={handleClose}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scanner Container */}
                    <div className="relative bg-slate-50 py-4 px-6">
                        {error && (
                            <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3 z-20 pointer-events-none">
                                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-red-700">{error}</p>
                                </div>
                            </div>
                        )}
                        
                        {permissionStatus === 'granted' ? (
                            <>
                                <div className="relative">
                                    <div 
                                        id="qr-scanner-container"
                                        ref={scannerRef}
                                        className="rounded-2xl overflow-hidden border-2 border-[#045c84] bg-black"
                                        style={{ minHeight: '300px' }}
                                    />
                                    
                                    {/* Camera Toggle Button */}
                                    {isScanning && (
                                        <button
                                            onClick={() => setUseFrontCamera(!useFrontCamera)}
                                            className="absolute top-2 right-2 bg-[#045c84] hover:bg-[#034567] text-white px-2 py-1 rounded text-xs font-bold transition-colors active:scale-95"
                                            title={useFrontCamera ? 'Switch to back camera' : 'Switch to front camera'}
                                        >
                                            🔄
                                        </button>
                                    )}
                                    
                                    {!isScanning && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-2xl">
                                            <Loader2 size={32} className="animate-spin text-gray-500" />
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="rounded-2xl overflow-hidden border-2 border-[#045c84] bg-black flex flex-col items-center justify-center py-12 px-6 gap-4" style={{ minHeight: '300px' }}>
                                {permissionStatus === 'requesting' ? (
                                    <>
                                        <Loader2 size={40} className="animate-spin text-white" />
                                        <p className="text-sm font-bold text-white text-center">ক্যামেরা অনুমতি অনুরোধ করছি...</p>
                                    </>
                                ) : permissionStatus === 'denied' ? (
                                    <>
                                        <Camera size={40} className="text-gray-500" />
                                        <p className="text-sm font-bold text-gray-400 text-center">ক্যামেরা অ্যাক্সেস প্রয়োজন</p>
                                        <p className="text-xs text-gray-500 text-center">আপনার ব্রাউজার সেটিংসে ক্যামেরা অনুমতি সক্ষম করুন</p>
                                        <button
                                            onClick={handleRetryPermission}
                                            className="mt-2 px-4 py-2 bg-[#045c84] hover:bg-[#034567] text-white rounded-lg font-bold text-sm transition-colors active:scale-95"
                                        >
                                            পুনরায় চেষ্টা করুন
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>

                {/* Instructions */}
                <div className="px-6 py-4 bg-blue-50 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-700 mb-2 uppercase tracking-widest">নির্দেশনা:</p>
                    <ul className="space-y-1.5 text-[9px] font-bold text-slate-600">
                        <li className="flex gap-2">
                            <span className="text-blue-500">•</span>
                            <span>শিক্ষার্থীর আইডি কার্ডের কিউআর কোড বা বারকোড স্ক্যান করুন</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-blue-500">•</span>
                            <span>স্বয়ংক্রিয়ভাবে ফি জমা দেওয়ার মোডাল খুলবে</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-blue-500">•</span>
                            <span>আলোতে যথেষ্ট উজ্জ্বল স্থানে ব্যবহার করুন</span>
                        </li>
                    </ul>
                </div>

                {/* Close Button */}
                <div className="px-6 py-4 border-t border-slate-50 flex gap-3">
                    <button 
                        onClick={handleClose}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                    >
                        বন্ধ করুন
                    </button>
                </div>
                </div>
            </div>
        </>
    );
}
