import { useMemo } from 'react';

// ==================== PRIORITY SCORING ENGINE ====================
// Implements a weighted scoring system for the SEFIN signing queue.
// Each task gets a composite score based on:
//   - Age (how long it's been waiting)
//   - Value (higher values = more urgent)
//   - Document type (NE/DL priority over OB)
//
// Score Range: 0-100
// Levels: CRITICO (>=75) | ALTO (>=50) | MEDIO (>=25) | ROTINA (<25)

export type PriorityLevel = 'CRITICO' | 'ALTO' | 'MEDIO' | 'ROTINA';

export interface PrioritizedTask<T> {
    task: T;
    score: number;
    level: PriorityLevel;
    waitingHours: number;
}

interface PriorityConfig {
    /** Weight for waiting time (0-1), default 0.5 */
    weightAge?: number;
    /** Weight for financial value (0-1), default 0.3 */
    weightValue?: number;
    /** Weight for document type (0-1), default 0.2 */
    weightType?: number;
    /** Threshold in hours for max age score, default 72 */
    maxAgeHours?: number;
    /** Max value to normalize against, default 15000 */
    maxValue?: number;
}

const DOC_TYPE_PRIORITY: Record<string, number> = {
    'NOTA_EMPENHO': 1.0,
    'NE': 1.0,
    'DOCUMENTO_LIQUIDACAO': 0.9,
    'DL': 0.9,
    'ORDEM_BANCARIA': 0.7,
    'OB': 0.7,
    'CONCESSAO': 0.8,
    'PORTARIA': 0.6,
    'REQUEST': 0.5,
    'COVER': 0.3,
    'ATTESTATION': 0.4,
};

function getLevel(score: number): PriorityLevel {
    if (score >= 75) return 'CRITICO';
    if (score >= 50) return 'ALTO';
    if (score >= 25) return 'MEDIO';
    return 'ROTINA';
}

export const PRIORITY_STYLES: Record<PriorityLevel, {
    bg: string; text: string; border: string; label: string; dot: string;
}> = {
    CRITICO: {
        bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200',
        label: 'Crítico', dot: 'bg-red-500',
    },
    ALTO: {
        bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
        label: 'Alto', dot: 'bg-amber-500',
    },
    MEDIO: {
        bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
        label: 'Médio', dot: 'bg-blue-500',
    },
    ROTINA: {
        bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200',
        label: 'Rotina', dot: 'bg-slate-400',
    },
};

/**
 * Hook that scores and sorts tasks by composite priority.
 *
 * @param tasks - Array of tasks with created_at, value, and document_type fields
 * @param config - Optional scoring weights
 * @returns Scored and sorted tasks (highest priority first)
 */
export function usePriorityScore<T extends {
    created_at: string;
    value?: number;
    document_type?: string;
}>(
    tasks: T[],
    config?: PriorityConfig
): PrioritizedTask<T>[] {
    const {
        weightAge = 0.5,
        weightValue = 0.3,
        weightType = 0.2,
        maxAgeHours = 72,
        maxValue = 15000,
    } = config || {};

    return useMemo(() => {
        const now = Date.now();

        const scored = tasks.map(task => {
            // 1. Age score: 0-100 (capped at maxAgeHours)
            const waitingMs = now - new Date(task.created_at).getTime();
            const waitingHours = waitingMs / (1000 * 60 * 60);
            const ageScore = Math.min(100, (waitingHours / maxAgeHours) * 100);

            // 2. Value score: 0-100 (normalized to maxValue)
            const taskValue = task.value || 0;
            const valueScore = Math.min(100, (taskValue / maxValue) * 100);

            // 3. Type score: 0-100 (based on document type priority)
            const typePriority = DOC_TYPE_PRIORITY[task.document_type || ''] ?? 0.5;
            const typeScore = typePriority * 100;

            // Composite weighted score
            const score = Math.round(
                ageScore * weightAge +
                valueScore * weightValue +
                typeScore * weightType
            );

            return {
                task,
                score,
                level: getLevel(score),
                waitingHours: Math.round(waitingHours),
            };
        });

        // Sort by score descending (highest priority first)
        return scored.sort((a, b) => b.score - a.score);
    }, [tasks, weightAge, weightValue, weightType, maxAgeHours, maxValue]);
}
