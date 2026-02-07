import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    children: React.ReactNode;
    content: string | React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    maxWidth?: number;
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
    children,
    content,
    position = 'top',
    delay = 300,
    maxWidth = 280,
    className = '',
}) => {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [actualPosition, setActualPosition] = useState(position);
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const calculatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        let top = 0;
        let left = 0;
        let finalPos = position;

        // Calculate preferred position
        switch (position) {
            case 'top':
                top = triggerRect.top + scrollY - tooltipRect.height - 8;
                left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
                if (top < scrollY) finalPos = 'bottom';
                break;
            case 'bottom':
                top = triggerRect.bottom + scrollY + 8;
                left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
                if (top + tooltipRect.height > window.innerHeight + scrollY) finalPos = 'top';
                break;
            case 'left':
                top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
                left = triggerRect.left + scrollX - tooltipRect.width - 8;
                if (left < 0) finalPos = 'right';
                break;
            case 'right':
                top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
                left = triggerRect.right + scrollX + 8;
                if (left + tooltipRect.width > window.innerWidth) finalPos = 'left';
                break;
        }

        // Recalculate if position flipped
        if (finalPos !== position) {
            switch (finalPos) {
                case 'top':
                    top = triggerRect.top + scrollY - tooltipRect.height - 8;
                    left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
                    break;
                case 'bottom':
                    top = triggerRect.bottom + scrollY + 8;
                    left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
                    break;
                case 'left':
                    top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
                    left = triggerRect.left + scrollX - tooltipRect.width - 8;
                    break;
                case 'right':
                    top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
                    left = triggerRect.right + scrollX + 8;
                    break;
            }
        }

        // Clamp to viewport
        left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

        setActualPosition(finalPos);
        setCoords({ top, left });
    };

    useEffect(() => {
        if (visible) calculatePosition();
    }, [visible]);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => setVisible(true), delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    if (!content) return <>{children}</>;

    const arrowClasses: Record<string, string> = {
        top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
        bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
        left: 'right-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
        right: 'left-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
    };

    return (
        <div
            ref={triggerRef}
            className={`inline-flex ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
        >
            {children}

            {visible && (
                <div
                    ref={tooltipRef}
                    role="tooltip"
                    className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-150"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        maxWidth,
                        position: 'fixed',
                    }}
                >
                    <div className="bg-gray-900 text-white text-xs font-medium rounded-lg px-3 py-2 shadow-xl leading-relaxed">
                        {content}
                        <div className={`absolute w-0 h-0 border-4 ${arrowClasses[actualPosition]}`} />
                    </div>
                </div>
            )}
        </div>
    );
};
