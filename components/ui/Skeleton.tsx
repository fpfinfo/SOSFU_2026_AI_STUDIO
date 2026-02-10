import React from 'react';

// ─────────────────────────────────────────────────────────────────────
// Skeleton Primitives — Premium pulsating placeholders
// ─────────────────────────────────────────────────────────────────────

interface SkeletonProps {
    className?: string;
    width?: string;
    height?: string;
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height, rounded = 'lg' }) => {
    const roundedClass = {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
    }[rounded];

    return (
        <div
            className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse ${roundedClass} ${className}`}
            style={{ width, height }}
        />
    );
};

// ─────────────────────────────────────────────────────────────────────
// Process Detail Skeleton — Full page skeleton for ProcessDetailView
// ─────────────────────────────────────────────────────────────────────

export const ProcessDetailSkeleton: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in">
            {/* Back button + header */}
            <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10" rounded="xl" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-7 w-64" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-8 w-24" rounded="full" />
            </div>

            {/* Timeline skeleton */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <Skeleton className="w-10 h-10" rounded="full" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    ))}
                </div>
                {/* Progress bar */}
                <Skeleton className="h-1.5 w-full mt-4" rounded="full" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                {[90, 110, 120, 80, 140, 160, 70].map((w, i) => (
                    <Skeleton key={i} className="h-10" rounded="lg" width={`${w}px`} />
                ))}
            </div>

            {/* Main content area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column — 2/3 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Info cards */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <Skeleton className="h-5 w-48" />
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action banner */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-12 h-12" rounded="xl" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-56" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                        <Skeleton className="h-10 w-48" rounded="xl" />
                    </div>
                </div>

                {/* Right column — 1/3 */}
                <div className="space-y-6">
                    {/* Status card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <Skeleton className="h-5 w-32" />
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8" rounded="full" />
                                    <div className="space-y-1 flex-1">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Value card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────
// Dashboard Table Skeleton — For list/table loading
// ─────────────────────────────────────────────────────────────────────

export const DashboardTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200">
                {[60, 120, 200, 80, 100, 90].map((w, i) => (
                    <Skeleton key={i} className="h-4" width={`${w}px`} />
                ))}
            </div>
            {/* Rows */}
            {[...Array(rows)].map((_, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-4 px-4 py-4 border-b border-gray-100" style={{ opacity: 1 - rowIdx * 0.12 }}>
                    <Skeleton className="w-5 h-5" rounded="md" />
                    {[80, 160, 240, 70, 100, 80].map((w, i) => (
                        <Skeleton key={i} className="h-4" width={`${w}px`} />
                    ))}
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────
// Card Skeleton — For dashboard stat cards
// ─────────────────────────────────────────────────────────────────────

export const CardSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="w-8 h-8" rounded="lg" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-full" />
    </div>
);

// ─────────────────────────────────────────────────────────────────────
// Audit Log Skeleton
// ─────────────────────────────────────────────────────────────────────

export const AuditLogSkeleton: React.FC = () => (
    <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200/60 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-12" />
                </div>
            ))}
        </div>
        {/* Search bar */}
        <Skeleton className="h-10 w-full" rounded="xl" />
        {/* Timeline entries */}
        <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 pl-14 pr-4 py-3" style={{ opacity: 1 - i * 0.12 }}>
                    <Skeleton className="w-10 h-10 absolute left-2" rounded="full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                </div>
            ))}
        </div>
    </div>
);
