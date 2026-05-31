import React, { useRef, useState, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TabItem {
    id: string;
    label: string;
    icon?: ReactNode;
}

interface ScrollableTabsProps {
    items: TabItem[];
    selectedId: string;
    onSelect: (id: string) => void;
    className?: string;
    itemClassName?: (item: TabItem, isSelected: boolean) => string;
    renderItem?: (item: TabItem, isSelected: boolean) => ReactNode;
}

export const ScrollableTabs: React.FC<ScrollableTabsProps> = ({
    items,
    selectedId,
    onSelect,
    className = '',
    itemClassName,
    renderItem
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [showLeftGradient, setShowLeftGradient] = useState(false);
    const [showRightGradient, setShowRightGradient] = useState(false);

    // Check scroll position for gradients
    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftGradient(scrollLeft > 0);
        setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 1); // -1 buffer
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [items]);

    // Center active tab
    useEffect(() => {
        if (!scrollRef.current) return;
        const container = scrollRef.current;
        const activeBtn = container.querySelector(`[data-tab-id="${selectedId}"]`) as HTMLElement;
        if (activeBtn) {
            const containerWidth = container.offsetWidth;
            const btnOffset = activeBtn.offsetLeft;
            const btnWidth = activeBtn.offsetWidth;

            container.scrollTo({
                left: btnOffset - (containerWidth / 2) + (btnWidth / 2),
                behavior: 'smooth'
            });
        }
    }, [selectedId, items]);

    // Drag Logic
    const onMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const onMouseLeave = () => {
        setIsDragging(false);
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    // Touch Logic
    const onTouchStart = (e: React.TouchEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const onTouchEnd = () => {
        setIsDragging(false);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !scrollRef.current) return;
        const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    // Wheel Logic (Horizontal scroll with vertical wheel)
    const onWheel = (e: React.WheelEvent) => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    return (
        <div className={`relative group w-full ${className}`}>
            {/* Left Gradient Mask */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${showLeftGradient ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Scroll Container */}
            <div
                ref={scrollRef}
                className={`flex w-full items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-2 px-1 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchMove}
                onWheel={onWheel}
                onScroll={checkScroll}
                style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
            >
                {items.map((item) => {
                    const isSelected = selectedId === item.id;

                    if (renderItem) {
                        return (
                            <div key={item.id} data-tab-id={item.id} onClick={() => !isDragging && onSelect(item.id)}>
                                {renderItem(item, isSelected)}
                            </div>
                        )
                    }

                    const defaultClass = `shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 border ${isSelected
                            ? 'bg-[#045c84] text-white border-[#045c84] shadow-md transform scale-105 select-none'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#045c84] hover:text-[#045c84] select-none'
                        }`;

                    return (
                        <button
                            key={item.id}
                            data-tab-id={item.id}
                            onClick={() => {
                                if (!isDragging) onSelect(item.id);
                            }}
                            className={itemClassName ? itemClassName(item, isSelected) : defaultClass}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Right Gradient Mask */}
            <div
                className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${showRightGradient ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
};
