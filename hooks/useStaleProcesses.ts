import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ==================== STALE PROCESS DETECTION ====================
// Detects processes that have been stuck in the same status
// for longer than the configured threshold.

export interface StaleProcess {
    id: string;
    process_number: string;
    beneficiary: string;
    value: number;
    status: string;
    created_at: string;
    updated_at: string;
    staleDays: number;
    lastActor?: string;
}

interface UseStaleProcessesOptions {
    /** Statuses to monitor for staleness */
    statuses: string[];
    /** Days threshold to consider a process stale (default: 7) */
    thresholdDays?: number;
    /** Auto-refresh interval in ms (default: 60000 = 1 min) */
    refreshInterval?: number;
    /** Whether to enable the hook (default: true) */
    enabled?: boolean;
}

export function useStaleProcesses({
    statuses,
    thresholdDays = 7,
    refreshInterval = 60_000,
    enabled = true,
}: UseStaleProcessesOptions) {
    const [staleProcesses, setStaleProcesses] = useState<StaleProcess[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStale = useCallback(async () => {
        if (!enabled || statuses.length === 0) return;

        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - thresholdDays);

            const { data, error } = await supabase
                .from('solicitations')
                .select('id, process_number, beneficiary, value, status, created_at, updated_at')
                .in('status', statuses)
                .lt('updated_at', cutoff.toISOString())
                .order('updated_at', { ascending: true });

            if (error) throw error;

            const now = Date.now();
            const enriched: StaleProcess[] = (data || []).map(proc => {
                const updatedMs = new Date(proc.updated_at || proc.created_at).getTime();
                const staleDays = Math.floor((now - updatedMs) / 86_400_000);
                return { ...proc, staleDays };
            });

            setStaleProcesses(enriched);
        } catch (err) {
            console.error('[useStaleProcesses] Error:', err);
        } finally {
            setLoading(false);
        }
    }, [statuses, thresholdDays, enabled]);

    useEffect(() => {
        fetchStale();
        if (!enabled) return;
        const id = setInterval(fetchStale, refreshInterval);
        return () => clearInterval(id);
    }, [fetchStale, refreshInterval, enabled]);

    return {
        staleProcesses,
        loading,
        refetch: fetchStale,
        count: staleProcesses.length,
    };
}
