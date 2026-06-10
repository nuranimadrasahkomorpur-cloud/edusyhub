'use client';

import { useEffect, ReactNode, useRef } from 'react';
import Lenis from 'lenis';

export default function SmoothScroll({ children }: { children: ReactNode }) {
    const instancesRef = useRef<any[]>([]);
    const rafIdRef = useRef<number | null>(null);
    const observerRef = useRef<MutationObserver | null>(null);

    useEffect(() => {
        const options = {
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
            lerp: 0.1,
        } as const;

        // create global/window Lenis
        const globalLenis = new Lenis(options);
        instancesRef.current.push(globalLenis);

        // find scrollable containers and attach Lenis
        const findScrollableContainers = () => {
            const selectorNodes: Element[] = Array.from(document.querySelectorAll('[data-lenis], .lenis-scroll, .overflow-auto, .overflow-y-auto'));

            // also scan common container elements for overflow
            const candidates = Array.from(document.querySelectorAll('div, main, section, article, nav, aside')) as HTMLElement[];
            candidates.forEach((el) => {
                try {
                    if ((el.dataset && el.dataset.lenisAttached) || el === document.scrollingElement) return;
                    if (el.scrollHeight > el.clientHeight) {
                        const cs = getComputedStyle(el);
                        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || el.classList.contains('overflow-auto') || el.classList.contains('overflow-y-auto')) {
                            selectorNodes.push(el);
                        }
                    }
                } catch (e) {
                    // ignore
                }
            });

            selectorNodes.forEach((node) => {
                const el = node as HTMLElement;
                if (el.dataset && el.dataset.lenisAttached) return;
                try {
                    const instance = new Lenis({ ...(options as any), el } as any);
                    (instance as any)._el = el;
                    instancesRef.current.push(instance);
                    el.dataset.lenisAttached = 'true';
                } catch (e) {
                    // ignore any errors creating instance
                }
            });
        };

        findScrollableContainers();

        function raf(time: number) {
            instancesRef.current.forEach((inst) => inst.raf(time));
            rafIdRef.current = requestAnimationFrame(raf);
        }

        rafIdRef.current = requestAnimationFrame(raf);

        // observe DOM changes to catch later-added scrollable containers
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes.length) {
                    findScrollableContainers();
                } else if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) {
                    findScrollableContainers();
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        observerRef.current = observer;

        const gc = () => {
            instancesRef.current = instancesRef.current.filter((i) => {
                if (i && i._el && !document.contains(i._el)) {
                    i.destroy && i.destroy();
                    return false;
                }
                return true;
            });
        };

        const stopAll = () => { gc(); instancesRef.current.forEach((i) => i && i.stop && i.stop()); };
        const startAll = () => { gc(); instancesRef.current.forEach((i) => i && i.start && i.start()); };

        window.addEventListener('modalOpen', stopAll);
        window.addEventListener('modalClose', startAll);

        return () => {
            if (observerRef.current) observerRef.current.disconnect();
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            instancesRef.current.forEach((inst) => inst && inst.destroy && inst.destroy());
            window.removeEventListener('modalOpen', stopAll);
            window.removeEventListener('modalClose', startAll);
        };
    }, []);

    return <>{children}</>;
}
