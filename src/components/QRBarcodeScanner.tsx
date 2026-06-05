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
            console.log('⏸️ Scanner init skipped:', { isOpen, permissionStatus, hasRef: !!scannerRef.current });
            return;
        }

        const originalConsoleError = console.error;
        const originalConsoleDebug = console.debug;
        const originalOnError = window.onerror;

        const isExpectedError = (...args: any[]) => {
            const fullMessage = args.map(arg => String(arg || '')).join(' ').toLowerCase();
            return fullMessage.includes('qr code parse error') ||
                   fullMessage.includes('no multiformat readers') ||
                   fullMessage.includes('cannot clear while scan is ongoing');
        };

        console.error = (...args: any[]) => {
            if (!isExpectedError(...args)) {
                originalConsoleError.apply(console, args);
            }
        };
        console.debug = (...args: any[]) => {
            const message = args[0]?.toString() || '';
            if (!message.includes('QR scan error') && !message.includes('Scanner stop error')) {
                originalConsoleDebug.apply(console, args);
            }
        };

        window.onerror = (message, source, lineno, colno, error) => {
            const msgStr = String(message || '').toLowerCase();
            const srcStr = String(source || '').toLowerCase();
            const errorStack = String(error?.stack || '').toLowerCase();

            if (msgStr.includes('cannot clear while scan is ongoing')) {
                console.debug('Suppressed html5-qrcode scan state error');
                return true;
            }
            if (msgStr.includes('cannot read properties of null') &&
                (srcStr.includes('html5-qrcode') || errorStack.includes('showHideScanTypeSwapLink'))) {
                console.debug('Suppressed html5-qrcode DOM element error');
                return true;
            }
            if (msgStr.includes('cannot set properties of null') || msgStr.includes('cannot read properties of null')) {
                if (srcStr.includes('html5-qrcode') || srcStr.includes('node_modules') || errorStack.includes('setheadermessage')) {
                    console.debug('Suppressed html5-qrcode DOM error');
                    return true;
                }
            }
            if (msgStr.includes('setheadermessage') || errorStack.includes('setheadermessage')) {
                console.debug('Suppressed setHeaderMessage error');
                return true;
            }
            return originalOnError?.(message, source, lineno, colno, error) ?? false;
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const msg = String(event.reason?.message || event.reason || '').toLowerCase();
            const stack = String(event.reason?.stack || '').toLowerCase();

            if (msg.includes('cannot clear while scan is ongoing')) {
                console.debug('Suppressed html5-qrcode scan state error');
                event.preventDefault();
                return;
            }
            if (msg.includes('cannot read properties of null') && stack.includes('showHideScanTypeSwapLink')) {
                console.debug('Suppressed html5-qrcode DOM element access error');
                event.preventDefault();
                return;
            }
            if (msg.includes('cannot set properties of null') || msg.includes('cannot read properties of null') || msg.includes('setheadermessage')) {
                console.debug('Suppressed html5-qrcode promise rejection');
                event.preventDefault();
                return;
            }
            if (stack.includes('html5-qrcode') || stack.includes('setHeaderMessage')) {
                console.debug('Suppressed html5-qrcode promise rejection from stack');
                event.preventDefault();
            }
        };
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        // Reset scan state each time we open the scanner
        if (scanDelayRef.current) {
            clearTimeout(scanDelayRef.current);
            scanDelayRef.current = null;
        }
        isProcessingRef.current = false;
        lastScannedRef.current = '';

        const initScanner = async () => {
            console.log('🚀 Initializing scanner...');
            setError('');
            setIsScanning(false);  // Keep false until video actually loads
            setScannedCount(0);
            isRenderingRef.current = false;

        const html5Qrcode = new Html5Qrcode('qr-scanner-container');

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
            throw new Error('No camera devices found');
        }

        const selectedCamera = useFrontCamera
            ? cameras.find(cam => /front|user|face/i.test(cam.label)) || cameras[0]
            : cameras.find(cam => /back|rear|environment/i.test(cam.label)) || cameras[0];

        const cameraId = selectedCamera.id;
        const scannerConfig = {
            fps: 5,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false
        } as any;

        const onScanSuccess = async (decodedText: string) => {
            if (!isActiveRef.current || !isRenderingRef.current || !scannerInstanceRef.current) {
                console.debug('Scan ignored: scanner not active or not rendering');
                return;
            }

            const normalizedText = decodedText?.trim();
            if (!normalizedText) {
                console.debug('Scan ignored: empty decoded text');
                return;
            }

            // Prevent concurrent scans and duplicate detections
            if (isProcessingRef.current) return;
            
            if (normalizedText !== lastScannedRef.current) {
                isProcessingRef.current = true;
                lastScannedRef.current = normalizedText;
                setScannedCount(prev => prev + 1);
                
                // Clear any pending scan delay
                if (scanDelayRef.current) {
                    clearTimeout(scanDelayRef.current);
                    scanDelayRef.current = null;
                }
                
                // Trigger callback after 500ms to prevent rapid successive calls
                scanDelayRef.current = setTimeout(async () => {
                    try {
                        await onScan(normalizedText);
                    } catch (err) {
                        console.debug('Scan callback error:', err);
                    } finally {
                        scanDelayRef.current = null;
                        // Close scanner only after async operation completes
                        setTimeout(() => {
                            if (scannerInstanceRef.current && isRenderingRef.current) {
                                if (typeof scannerInstanceRef.current.stop === 'function') {
                                    scannerInstanceRef.current.stop().catch(err => console.debug('Scanner stop error:', err));
                                }
                                scannerInstanceRef.current = null;
                            }
                            onClose();
                            isProcessingRef.current = false;
                        }, 300);
                    }
                }, 500);
            }
        };

        const onScanError = (error: string) => {
            // Silently ignore QR scanning errors
        };

        try {
            // Ensure container exists in DOM before rendering
            const container = document.getElementById('qr-scanner-container');
            if (!container) {
                console.error('❌ Scanner container not found in DOM');
                setError('Failed to initialize scanner - container not ready');
                return;
            }

            console.log('📦 Container found, starting scanner...');

            isActiveRef.current = true;
            await html5Qrcode.start(cameraId, scannerConfig, onScanSuccess, onScanError);
            console.log('✅ Scanner started successfully');
            
            isRenderingRef.current = true;
            scannerInstanceRef.current = html5Qrcode;
            setIsScanning(true);
            console.log('🎬 Scanner instance stored, customizing UI...');
            
            // Customize scanner UI - with proper null checks
            setTimeout(() => {
                // Only proceed if scanner still exists and is rendered
                if (!scannerInstanceRef.current || !isRenderingRef.current) {
                    console.log('⏸️ UI customization skipped - scanner not rendering');
                    return;
                }
                
                const container = document.getElementById('qr-scanner-container');
                if (!container) {
                    console.log('⏸️ Container disappeared, skipping customization');
                    return;
                }
                
                console.log('🎨 Customizing scanner UI...');
                
                // FIRST: Disable and hide file input elements (don't remove them)
                const fileInputs = container.querySelectorAll('input[type="file"]');
                fileInputs.forEach((input: any) => {
                    if (!input) return;
                    try {
                        input.disabled = true;
                        input.style.display = 'none';
                        input.style.visibility = 'hidden';
                        input.style.pointerEvents = 'none';
                        input.setAttribute('disabled', 'disabled');
                        // Prevent any interaction
                        input.addEventListener('click', (e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }, true);
                    } catch (err) {
                        console.debug('Error handling file input:', err);
                    }
                });
                
                const buttons = container.querySelectorAll('button');
                console.log(`🔘 Found ${buttons.length} buttons in scanner UI`);
                
                // Find start button (first button that doesn't say upload/file)
                let startBtn = null;
                for (let i = 0; i < buttons.length; i++) {
                    const btn = buttons[i];
                    const btnText = btn.textContent?.toLowerCase() || '';
                    console.log(`  Button ${i}: "${btnText.substring(0, 30)}..."`);
                    if (!btnText.includes('upload') && !btnText.includes('file')) {
                        startBtn = btn as HTMLButtonElement;
                        console.log(`✓ Selected button ${i} as start button`);
                        break;
                    }
                }
                
                // Hide the start button and auto-click it
                if (startBtn) {
                    try {
                        startBtn.style.display = 'none'; // Hide the start button
                        console.log('🔘 Start button hidden');
                        
                        // Auto-click the button to start scanning
                        setTimeout(() => {
                            if (scannerInstanceRef.current && isRenderingRef.current && startBtn && startBtn.parentElement) {
                                try {
                                    console.log('👆 Clicking start button...');
                                    startBtn.click();
                                    console.log('✅ Start button clicked, waiting for video...');
                                    
                                    // Wait for video element to appear and play
                                    let videoCheckCount = 0;
                                    let retryCount = 0;
                                    const maxRetries = 2;
                                    
                                    const checkVideo = setInterval(() => {
                                        videoCheckCount++;
                                        const video = container?.querySelector('video');
                                        if (video && video.readyState > 1) {
                                            console.log('🎥 Video is ready! Setting isScanning=true');
                                            setIsScanning(true);
                                            clearInterval(checkVideo);
                                        } else if (videoCheckCount > 100) {
                                            clearInterval(checkVideo);
                                            const video = container?.querySelector('video');
                                            
                                            if (!video) {
                                                // Video element not found, try retry
                                                console.warn(`⚠️ Video element not found after 10s. Retry ${retryCount + 1}/${maxRetries}`);
                                                
                                                if (retryCount < maxRetries) {
                                                    retryCount++;
                                                    
                                                    // Try restarting the scanner
                                                    try {
                                                        console.log('🔄 Attempting to restart scanner...');
                                                        if (scannerInstanceRef.current?.stop) {
                                                            scannerInstanceRef.current.stop().then(() => {
                                                                console.log('⏹️ Scanner stopped, restarting...');
                                                                setTimeout(() => {
                                                                    if (startBtn && startBtn.parentElement) {
                                                                        startBtn.click();
                                                                        console.log('👆 Clicked start button again');
                                                                        // Check again for video after 1 second
                                                                        setTimeout(() => {
                                                                            const newVideo = container?.querySelector('video');
                                                                            if (newVideo && newVideo.readyState > 0) {
                                                                                console.log('✅ Video found on retry!');
                                                                                setIsScanning(true);
                                                                            } else {
                                                                                console.warn('❌ Still no video after retry');
                                                                                setIsScanning(true); // Show scanner anyway
                                                                            }
                                                                        }, 1000);
                                                                    }
                                                                }, 300);
                                                            }).catch(err => {
                                                                console.error('Error stopping scanner:', err);
                                                                setIsScanning(true);
                                                            });
                                                        }
                                                    } catch (err) {
                                                        console.error('❌ Error restarting scanner:', err);
                                                        setIsScanning(true);
                                                    }
                                                } else {
                                                    console.error('❌ Video not found after all retries, showing scanner anyway');
                                                    setIsScanning(true);
                                                }
                                            } else {
                                                console.warn('⏱️ Video exists but not ready after 10s, showing scanner anyway');
                                                setIsScanning(true);
                                            }
                                        }
                                    }, 100);
                                } catch (err) {
                                    console.error('❌ Error auto-starting scanner:', err);
                                }
                            }
                        }, 100);
                    } catch (err) {
                        console.error('❌ Error with start button:', err);
                    }
                } else {
                    console.error('❌ Start button not found in scanner UI');
                }
                
                // Hide unwanted elements (don't remove, just hide)
                const select = container.querySelector('select');
                const fileLink = container.querySelector('a');
                const allButtons = container.querySelectorAll('button');
                
                if (select) {
                    try {
                        select.style.display = 'none';
                        select.style.pointerEvents = 'none';
                    } catch (err) {
                        console.debug('Error hiding select:', err);
                    }
                }
                if (fileLink) {
                    try {
                        fileLink.style.display = 'none';
                        fileLink.style.pointerEvents = 'none';
                    } catch (err) {
                        console.debug('Error hiding file link:', err);
                    }
                }
                
                // Hide any buttons that might trigger file upload (usually 2nd, 3rd buttons)
                allButtons.forEach((btn, index) => {
                    if (btn && index > 0) { // Skip first button (start button)
                        try {
                            btn.style.display = 'none';
                            btn.style.pointerEvents = 'none';
                            (btn as HTMLButtonElement).disabled = true;
                        } catch (err) {
                            console.debug('Error hiding button:', err);
                        }
                    }
                });
                
                // Hide (not remove) potential file upload sections
                const allDivs = container.querySelectorAll('div');
                allDivs.forEach((div: any) => {
                    if (!div) return;
                    try {
                        const text = div.textContent?.toLowerCase() || '';
                        if (text.includes('upload') || (text.includes('file') && text.includes('choose'))) {
                            div.style.display = 'none';
                            div.style.pointerEvents = 'none';
                        }
                    } catch (err) {
                        console.debug('Error hiding div:', err);
                    }
                });
            }, 500);
            
            // Additional safety: prevent any file upload attempts after scanner is ready
            setTimeout(() => {
                const container = document.getElementById('qr-scanner-container');
                if (!container) return;
                
                // Add click handler to prevent file input clicks
                const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput) {
                    const preventClick = (e: Event) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                    };
                    fileInput.addEventListener('click', preventClick, true);
                    fileInput.addEventListener('change', preventClick, true);
                }
                
                // Prevent clicks on upload-related elements
                const allElements = container.querySelectorAll('button, a, div');
                allElements.forEach((el: any) => {
                    const text = el.textContent?.toLowerCase() || '';
                    if (text.includes('upload') || text.includes('file') || text.includes('choose')) {
                        el.addEventListener('click', (e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                        }, true);
                    }
                });
            }, 500);
        } catch (err) {
            console.debug('Scanner initialization error:', err);
            setError('Failed to initialize scanner');
        }
        };

        initScanner();

        return () => {
            console.log('🧹 Scanner cleanup starting...');
            // Restore console and error handlers
            console.error = originalConsoleError;
            console.debug = originalConsoleDebug;
            window.onerror = originalOnError;
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            
            // Clear pending timeouts
            if (scanDelayRef.current) {
                clearTimeout(scanDelayRef.current);
                scanDelayRef.current = null;
            }
            
            stopScanner();
            
            console.log('✅ Scanner cleanup complete');
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
                }
                
                #qr-scanner-container video {
                    width: 100% !important;
                    height: auto !important;
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
