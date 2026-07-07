"use client";

import React, { useEffect, useRef, useState } from 'react';

interface Props {
    value?: string;
    defaultText: string;
    onChange?: (newText: string) => void;
    className?: string;
    multiline?: boolean;
}

export default function EditableText({ value, defaultText, onChange, className = '', multiline = false }: Props) {
    const [mounted, setMounted] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Initial hydration fix
    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync with external value if it changes
    useEffect(() => {
        if (contentRef.current && mounted) {
            const currentText = contentRef.current.innerText || contentRef.current.textContent || '';
            const newText = value ?? defaultText;
            if (currentText !== newText) {
                contentRef.current.innerText = newText;
            }
        }
    }, [value, defaultText, mounted]);

    const handleBlur = () => {
        if (!contentRef.current) return;
        let newText = contentRef.current.innerText || contentRef.current.textContent || '';
        
        if (newText.trim() === '') {
            newText = defaultText;
            contentRef.current.innerText = defaultText;
        }
        
        if (onChange && newText !== (value ?? defaultText)) {
            onChange(newText);
        }
    };

    if (!mounted) {
        return (
            <div className={className} style={{ whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>
                {value ?? defaultText}
            </div>
        );
    }

    return (
        <div 
            ref={contentRef}
            contentEditable="plaintext-only"
            onBlur={handleBlur}
            suppressContentEditableWarning
            className={`cursor-text transition-all focus:outline-dashed focus:outline-1 focus:outline-[#045c84] focus:outline-offset-[3px] focus:bg-transparent focus:rounded-sm print:!p-0 ${className}`}
            style={{ whiteSpace: multiline ? 'pre-wrap' : 'normal' }}
        >
            {value ?? defaultText}
        </div>
    );
}
