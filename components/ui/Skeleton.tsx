import React from 'react';

// ─────────────────────────────────────────────────────────────────────
// Skeleton Primitives — Premium pulsating placeholders
// ─────────────────────────────────────────────────────────────────────

interface SkeletonProps {
    className?: string;
    width?: string;
    height?: string;
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    darkMode?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height, rounded = 'lg', darkMode = false }) => {
    const roundedClass = {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
    }[rounded];

    return (
        <div
            className={`animate-pulse ${roundedClass} ${className} ${
                darkMode 
                ? 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700' 
                : 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200'
            }`}
            style={{ width, height }}
        />
    );
};

// ─────────────────────────────────────────────────────────────────────
// Process Detail Skeleton — Full page skeleton for ProcessDetailView
// ─────────────────────────────────────────────────────────────────────

export const ProcessDetailSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode = false }) => {
    return (
        <div className={`max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in ${darkMode ? 'bg-slate-900' : ''}`}>
            {/* Back button + header */}
            <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10" rounded="xl" darkMode={darkMode} />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-7 w-64" darkMode={darkMode} />
                    <Skeleton className="h-4 w-40" darkMode={darkMode} />
                </div>
                <Skeleton className="h-8 w-24" rounded="full" darkMode={darkMode} />
            </div>

            {/* Timeline skeleton */}
            <div className={`rounded-2xl border p-6 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <Skeleton className="w-10 h-10" rounded="full" darkMode={darkMode} />
                            <Skeleton className="h-3 w-16" darkMode={darkMode} />
                        </div>
                    ))}
                </div>
                {/* Progress bar */}
                <Skeleton className="h-1.5 w-full mt-4" rounded="full" darkMode={darkMode} />
            </div>

            {/* Tabs */}
            <div className={`flex gap-2 border-b pb-2 transition-colors ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                {[90, 110, 120, 80, 140, 160, 70].map((w, i) => (
                    <Skeleton key={i} className="h-10" rounded="lg" width={`${w}px`} darkMode={darkMode} />
                ))}
            </div>

            {/* Main content area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column — 2/3 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Info cards */}
                    <div className={`rounded-xl border p-6 space-y-4 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <Skeleton className="h-5 w-48" darkMode={darkMode} />
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-3 w-20" darkMode={darkMode} />
                                    <Skeleton className="h-5 w-full" darkMode={darkMode} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action banner */}
                    <div className={`rounded-xl border p-6 space-y-3 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-12 h-12" rounded="xl" darkMode={darkMode} />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-56" darkMode={darkMode} />
                                <Skeleton className="h-4 w-full" darkMode={darkMode} />
                            </div>
                        </div>
                        <Skeleton className="h-10 w-48" rounded="xl" darkMode={darkMode} />
                    </div>
                </div>

                {/* Right column — 1/3 */}
                <div className="space-y-6">
                    {/* Status card */}
                    <div className={`rounded-xl border p-6 space-y-4 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <Skeleton className="h-5 w-32" darkMode={darkMode} />
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8" rounded="full" darkMode={darkMode} />
                                    <div className="space-y-1 flex-1">
                                        <Skeleton className="h-4 w-full" darkMode={darkMode} />
                                        <Skeleton className="h-3 w-24" darkMode={darkMode} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Value card */}
                    <div className={`rounded-xl border p-6 space-y-3 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <Skeleton className="h-4 w-28" darkMode={darkMode} />
                        <Skeleton className="h-8 w-40" darkMode={darkMode} />
                        <Skeleton className="h-3 w-full" darkMode={darkMode} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────
// Dashboard Table Skeleton — For list/table loading
// ─────────────────────────────────────────────────────────────────────

export const DashboardTableSkeleton: React.FC<{ rows?: number; darkMode?: boolean }> = ({ rows = 5, darkMode = false }) => {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className={`flex items-center gap-4 px-4 py-3 border-b transition-colors ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                {[60, 120, 200, 80, 100, 90].map((w, i) => (
                    <Skeleton key={i} className="h-4" width={`${w}px`} darkMode={darkMode} />
                ))}
            </div>
            {/* Rows */}
            {[...Array(rows)].map((_, rowIdx) => (
                <div key={rowIdx} className={`flex items-center gap-4 px-4 py-4 border-b transition-colors ${darkMode ? 'border-slate-800' : 'border-gray-100'}`} style={{ opacity: 1 - rowIdx * 0.12 }}>
                    <Skeleton className="w-5 h-5" rounded="md" darkMode={darkMode} />
                    {[80, 160, 240, 70, 100, 80].map((w, i) => (
                        <Skeleton key={i} className="h-4" width={`${w}px`} darkMode={darkMode} />
                    ))}
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────
// Card Skeleton — For dashboard stat cards
// ─────────────────────────────────────────────────────────────────────

export const CardSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode = false }) => (
    <div className={`rounded-xl border p-5 space-y-3 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 shadow-slate-950/20' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" darkMode={darkMode} />
            <Skeleton className="w-8 h-8" rounded="lg" darkMode={darkMode} />
        </div>
        <Skeleton className="h-8 w-20" darkMode={darkMode} />
        <Skeleton className={`h-3 w-full ${darkMode ? 'opacity-20' : ''}`} darkMode={darkMode} />
    </div>
);

// ─────────────────────────────────────────────────────────────────────
// Audit Log Skeleton
// ─────────────────────────────────────────────────────────────────────

export const AuditLogSkeleton: React.FC<{ darkMode?: boolean }> = ({ darkMode = false }) => (
    <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
                <div key={i} className={`rounded-xl p-4 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200/60'}`}>
                    <Skeleton className="h-3 w-16" darkMode={darkMode} />
                    <Skeleton className="h-7 w-12" darkMode={darkMode} />
                </div>
            ))}
        </div>
        {/* Search bar */}
        <Skeleton className="h-10 w-full" rounded="xl" darkMode={darkMode} />
        {/* Timeline entries */}
        <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 pl-14 pr-4 py-3 relative" style={{ opacity: 1 - i * 0.12 }}>
                    <Skeleton className="w-10 h-10 absolute left-2" rounded="full" darkMode={darkMode} />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" darkMode={darkMode} />
                        <Skeleton className="h-3 w-32" darkMode={darkMode} />
                    </div>
                    <Skeleton className="h-3 w-24" darkMode={darkMode} />
                </div>
            ))}
        </div>
    </div>
);
