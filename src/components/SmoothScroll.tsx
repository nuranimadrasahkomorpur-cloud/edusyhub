'use client';

import { useEffect, ReactNode, useRef } from 'react';
import Lenis from 'lenis';

export default function SmoothScroll({ children }: { children: ReactNode }) {
    const lenisRef = useRef<Lenis | null>(null);
    const rafIdRef = useRef<number | null>(null);

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
            lerp: 0.1,
        });

        lenisRef.current = lenis;

        function raf(time: number) {
            lenis.raf(time);
            rafIdRef.current = requestAnimationFrame(raf);
        }

        rafIdRef.current = requestAnimationFrame(raf);

        // Listen for modal open events to pause smooth scroll
        const handleModalOpen = () => {
            if (lenis) lenis.stop();
        };
        const handleModalClose = () => {
            if (lenis) lenis.start();
        };

        window.addEventListener('modalOpen', handleModalOpen);
        window.addEventListener('modalClose', handleModalClose);

        return () => {
            lenis.destroy();
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            window.removeEventListener('modalOpen', handleModalOpen);
            window.removeEventListener('modalClose', handleModalClose);
        };
    }, []);

    return <>{children}</>;
}
