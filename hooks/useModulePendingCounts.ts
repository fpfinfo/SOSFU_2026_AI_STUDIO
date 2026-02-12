import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface PendingCountsConfig {
  /** Statuses to filter on (e.g., ['WAITING_SODPA_ANALYSIS']) */
  statuses: string[];
  /** localStorage key to track last seen count */
  seenCountKey: string;
  /** Polling interval in ms (default: 60000) */
  pollInterval?: number;
  /** Hours threshold for "urgent" classification (default: 48) */
  urgentThresholdHours?: number;
  /** Optional Supabase filter mode: 'eq' for single status, 'in' for multiple, 'or' for OR filter string */
  filterMode?: 'eq' | 'in' | 'or';
  /** For 'or' mode: raw Supabase OR filter string */
  orFilter?: string;
}

interface PendingCountsResult {
  pendingCount: number;
  urgentCount: number;
  newCount: number;
  lastSeenCount: number;
  handleAcknowledgeNew: () => void;
}

/**
 * Shared hook for module cockpits to fetch pending solicitation counts.
 * Replaces duplicated fetchCounts logic in SodpaCockpit, RessarcimentoCockpit,
 * AjsefinCockpit, SefinCockpit, etc.
 */
export function useModulePendingCounts(config: PendingCountsConfig): PendingCountsResult {
  const {
    statuses,
    seenCountKey,
    pollInterval = 60000,
    urgentThresholdHours = 48,
    filterMode = 'in',
    orFilter,
  } = config;

  const [pendingCount, setPendingCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [lastSeenCount, setLastSeenCount] = useState(0);

  // Load saved seen count from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(seenCountKey);
    if (saved) setLastSeenCount(parseInt(saved, 10) || 0);
  }, [seenCountKey]);

  // Fetch and poll
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        let query = supabase
          .from('solicitations')
          .select('id, created_at, status');

        if (filterMode === 'eq' && statuses.length === 1) {
          query = query.eq('status', statuses[0]);
        } else if (filterMode === 'or' && orFilter) {
          query = query.or(orFilter);
        } else {
          query = query.in('status', statuses);
        }

        const { data } = await query;

        if (data) {
          setPendingCount(data.length);
          const now = Date.now();
          const urgent = data.filter(item => {
            const hours = (now - new Date(item.created_at).getTime()) / (1000 * 60 * 60);
            return hours > urgentThresholdHours;
          }).length;
          setUrgentCount(urgent);
        }
      } catch (err) {
        console.error(`[useModulePendingCounts] Erro ao buscar counts:`, err);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, pollInterval);
    return () => clearInterval(interval);
  }, [statuses.join(','), pollInterval, urgentThresholdHours, filterMode, orFilter]);

  const newCount = Math.max(0, pendingCount - lastSeenCount);

  const handleAcknowledgeNew = useCallback(() => {
    localStorage.setItem(seenCountKey, pendingCount.toString());
    setLastSeenCount(pendingCount);
  }, [seenCountKey, pendingCount]);

  return {
    pendingCount,
    urgentCount,
    newCount,
    lastSeenCount,
    handleAcknowledgeNew,
  };
}
