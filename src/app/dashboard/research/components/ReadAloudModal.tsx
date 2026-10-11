import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, X, Loader2 } from 'lucide-react';

interface ReadAloudModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
}

export default function ReadAloudModal({ isOpen, onClose, text }: ReadAloudModalProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const popupRef = useRef<HTMLDivElement>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }
        return () => {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    // Handle closing and stopping speech
    const handleClose = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
        setIsPlaying(false);
        setSelectedWord(null);
        onClose();
    };

    const toggleSpeech = () => {
        if (!synthRef.current) return;

        if (isPlaying) {
            synthRef.current.cancel();
            setIsPlaying(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = synthRef.current.getVoices();
            const bnVoice = voices.find(v => v.lang.includes('bn') || v.lang.includes('bn-BD'));
            if (bnVoice) {
                utterance.voice = bnVoice;
            }
            utterance.rate = 0.85; // slightly slower for students
            utterance.onend = () => setIsPlaying(false);
            
            utteranceRef.current = utterance;
            synthRef.current.speak(utterance);
            setIsPlaying(true);
        }
    };

    const handleWordClick = (word: string, e: React.MouseEvent<HTMLSpanElement>) => {
        // Clean the word from punctuation
        const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
        if (!cleanWord) return;

        setSelectedWord(cleanWord);
        
        // Position the popup above the clicked word
        const rect = e.currentTarget.getBoundingClientRect();
        setPopupPosition({
            top: rect.top - 180, // 150px image + padding + arrow
            left: rect.left + (rect.width / 2)
        });

        // Generate Image URL (Pollinations AI)
        // Prompt includes instruction to creatively represent abstract concepts
        const prompt = `An educational, creative and visually appealing illustration representing the concept or meaning of the word "${cleanWord}". Clean single colourful object, white background, suitable for primary school students. Even if abstract, make it a tangible metaphor.`;
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=150&height=150&nologo=true&seed=${Math.floor(Math.random()*10000)}`;
        
        setIsImageLoading(true);
        setImageUrl(url);
    };

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setSelectedWord(null);
            }
        };
        if (selectedWord) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedWord]);

    if (!isOpen) return null;

    // Split text into words while keeping spaces
    const words = text.split(/(\s+)/);

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex flex-col bg-white animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSpeech}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                            isPlaying 
                                ? 'bg-amber-100 text-amber-600 shadow-inner' 
                                : 'bg-[#045c84] text-white hover:bg-[#034664] hover:scale-105 shadow-md'
                        }`}
                        title={isPlaying ? 'থামুন (Stop)' : 'পড়ে শোনান (Read Aloud)'}
                    >
                        {isPlaying ? <VolumeX size={28} /> : <Volume2 size={28} />}
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">পঠন ও শ্রবণ (Read Aloud)</h2>
                        <p className="text-sm font-semibold text-slate-500">শব্দের উপর ক্লিক করে ছবি দেখুন</p>
                    </div>
                </div>
                <button
                    onClick={handleClose}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Content Area - Large Text */}
            <div className="flex-1 p-8 sm:p-12 overflow-y-auto bg-slate-50 flex items-center justify-center text-center">
                <div className="max-w-4xl mx-auto leading-[2.5]">
                    {words.map((word, index) => {
                        if (word.trim() === '') {
                            return <span key={index}>{word}</span>;
                        }
                        return (
                            <span
                                key={index}
                                onClick={(e) => handleWordClick(word, e)}
                                className="inline-block text-[5vw] sm:text-5xl md:text-6xl font-bold text-slate-700 hover:text-[#045c84] hover:bg-cyan-50 cursor-pointer rounded-xl px-2 transition-colors mx-1"
                                title="ছবি দেখতে ক্লিক করুন"
                            >
                                {word}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Word Image Popup */}
            {selectedWord && (
                <div 
                    ref={popupRef}
                    className="fixed z-[10001] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 animate-in zoom-in duration-200"
                    style={{
                        top: Math.max(20, popupPosition.top),
                        left: popupPosition.left,
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className="relative w-[150px] h-[150px] bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center mb-3">
                        {isImageLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                                <Loader2 size={24} className="animate-spin" />
                                <span className="text-[10px] font-bold text-center">এআই সৃজনশীল<br/>ছবি আঁকছে...</span>
                            </div>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={imageUrl!} 
                            alt={selectedWord} 
                            className={`w-full h-full object-contain p-2 transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                            onLoad={() => setIsImageLoading(false)}
                            onError={() => setIsImageLoading(false)}
                        />
                    </div>
                    <div className="text-center font-black text-lg text-[#045c84] border-t border-slate-100 pt-2">
                        {selectedWord}
                    </div>
                    
                    {/* Tooltip Arrow */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 rotate-45"></div>
                </div>
            )}
        </div>,
        document.body
    );
}
