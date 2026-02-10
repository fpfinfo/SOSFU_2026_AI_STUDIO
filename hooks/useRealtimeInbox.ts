import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type ModuleType = 'GESTOR' | 'SOSFU' | 'SEFIN' | 'AJSEFIN' | 'SGP' | 'SEAD' | 'PRESIDENCIA' | 'SODPA' | 'RESSARCIMENTO';

interface UseRealtimeInboxOptions {
    /** The module to subscribe to */
    module: ModuleType;
    /** Callback when a new process arrives */
    onNewProcess?: (payload: any) => void;
    /** Callback for any change (insert/update/delete) */
    onAnyChange?: (payload: any) => void;
    /** Whether to enable the subscription (default true) */
    enabled?: boolean;
    /** Custom filter column (default: destino_atual) */
    filterColumn?: string;
}

/**
 * Hook for real-time inbox updates using Supabase Channels.
 * Subscribes to changes in the `solicitations` table filtered by module.
 * 
 * Usage:
 * ```tsx
 * useRealtimeInbox({
 *   module: 'GESTOR',
 *   onNewProcess: (payload) => {
 *     toast.success(`Novo processo: ${payload.new.process_number}`);
 *     refetchData();
 *   },
 * });
 * ```
 */
export function useRealtimeInbox({
    module,
    onNewProcess,
    onAnyChange,
    enabled = true,
    filterColumn = 'destino_atual',
}: UseRealtimeInboxOptions) {
    // Use refs to avoid re-subscribing on callback changes
    const onNewProcessRef = useRef(onNewProcess);
    const onAnyChangeRef = useRef(onAnyChange);

    useEffect(() => {
        onNewProcessRef.current = onNewProcess;
        onAnyChangeRef.current = onAnyChange;
    }, [onNewProcess, onAnyChange]);

    useEffect(() => {
        if (!enabled) return;

        const channelName = `realtime-inbox-${module.toLowerCase()}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'solicitations',
                    filter: `${filterColumn}=eq.${module}`,
                },
                (payload) => {
                    // Notify on any change
                    onAnyChangeRef.current?.(payload);

                    // Specifically notify on INSERT or when status changes to our module
                    if (
                        payload.eventType === 'INSERT' ||
                        (payload.eventType === 'UPDATE' &&
                            payload.old?.[filterColumn] !== module &&
                            payload.new?.[filterColumn] === module)
                    ) {
                        onNewProcessRef.current?.(payload);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [module, enabled, filterColumn]);
}

/**
 * Hook for real-time updates on sefin_tasks (SEFIN inbox).
 */
export function useRealtimeSefinTasks({
    onNewTask,
    enabled = true,
}: {
    onNewTask?: (payload: any) => void;
    enabled?: boolean;
}) {
    const onNewTaskRef = useRef(onNewTask);
    useEffect(() => { onNewTaskRef.current = onNewTask; }, [onNewTask]);

    useEffect(() => {
        if (!enabled) return;

        const channel = supabase
            .channel('realtime-sefin-tasks')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'sefin_tasks',
                },
                (payload) => {
                    onNewTaskRef.current?.(payload);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [enabled]);
}

export default useRealtimeInbox;
