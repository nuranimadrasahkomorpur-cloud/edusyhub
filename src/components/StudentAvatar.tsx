'use client';

import React, { useState, useMemo } from 'react';
import { User } from 'lucide-react';

interface StudentAvatarProps {
    src?: string | null;
    name?: string;
    sizeClass?: string;
    iconSize?: number;
    fallbackType?: 'icon' | 'letter';
}

export default function StudentAvatar({
    src,
    name,
    sizeClass = 'w-8 h-8 rounded-full',
    iconSize = 14,
    fallbackType = 'icon'
}: StudentAvatarProps) {
    const [hasError, setHasError] = useState(false);

    // Sanitize source URL to detect false/null/undefined placeholder strings
    const cleanSrc = useMemo(() => {
        if (!src) return null;
        const s = String(src).trim();
        if (
            s === '' ||
            s === 'null' ||
            s === 'undefined' ||
            s.endsWith('/null') ||
            s.endsWith('/undefined')
        ) {
            return null;
        }
        return s;
    }, [src]);

    // Compute dynamic, deterministic color based on the name
    const avatarColors = useMemo(() => {
        const colors = [
            { bg: 'bg-purple-100', text: 'text-purple-600' },
            { bg: 'bg-emerald-100', text: 'text-emerald-600' },
            { bg: 'bg-blue-100', text: 'text-blue-600' },
            { bg: 'bg-amber-100', text: 'text-amber-600' },
            { bg: 'bg-rose-100', text: 'text-rose-600' },
            { bg: 'bg-violet-100', text: 'text-violet-600' },
            { bg: 'bg-sky-100', text: 'text-sky-600' },
            { bg: 'bg-indigo-100', text: 'text-indigo-600' },
            { bg: 'bg-pink-100', text: 'text-pink-600' },
            { bg: 'bg-teal-100', text: 'text-teal-600' }
        ];

        if (!name) return colors[0];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }, [name]);

    if (cleanSrc && !hasError) {
        return (
            <img
                src={cleanSrc}
                alt={name || 'Student'}
                className={`${sizeClass} object-cover`}
                onError={() => setHasError(true)}
            />
        );
    }

    if (fallbackType === 'letter' && name) {
        const firstLetter = name.trim().charAt(0) || 'S';
        return (
            <div className={`${sizeClass} ${avatarColors.bg} ${avatarColors.text} flex items-center justify-center font-bold font-bengali`}>
                {firstLetter}
            </div>
        );
    }

    return (
        <div className={`${sizeClass} ${avatarColors.bg} ${avatarColors.text} flex items-center justify-center`}>
            <User size={iconSize} />
        </div>
    );
}
