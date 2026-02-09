import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePriorityScore } from '../../hooks/usePriorityScore';

describe('usePriorityScore', () => {
  it('should return scored and sorted tasks', () => {
    const tasks = [
      { created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), value: 10000, document_type: 'NE' },
      { created_at: new Date().toISOString(), value: 500, document_type: 'COVER' },
    ];

    const { result } = renderHook(() => usePriorityScore(tasks));

    expect(result.current).toHaveLength(2);
    expect(result.current[0].score).toBeGreaterThanOrEqual(result.current[1].score);
    expect(result.current[0].level).toBeDefined();
    expect(result.current[0].waitingHours).toBeGreaterThan(0);
  });

  it('should return higher priority for older items', () => {
    const tasks = [
      { created_at: new Date().toISOString(), value: 5000 },
      { created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), value: 5000 },
    ];

    const { result } = renderHook(() => usePriorityScore(tasks));

    // Sorted by score descending, so the oldest should be first
    expect(result.current[0].waitingHours).toBeGreaterThan(result.current[1].waitingHours);
  });

  it('should assign correct levels based on score', () => {
    const tasks = [
      // Very old + high value = should be CRITICO
      { created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), value: 20000, document_type: 'NE' },
      // Very new + low value = should be ROTINA
      { created_at: new Date().toISOString(), value: 100, document_type: 'COVER' },
    ];

    const { result } = renderHook(() => usePriorityScore(tasks));

    expect(result.current[0].level).toBe('CRITICO');
    expect(['ROTINA', 'MEDIO']).toContain(result.current[1].level);
  });

  it('should handle empty array', () => {
    const { result } = renderHook(() => usePriorityScore([]));
    expect(result.current).toEqual([]);
  });

  it('should respect custom config', () => {
    const tasks = [
      { created_at: new Date().toISOString(), value: 50000 },
    ];

    const { result } = renderHook(() =>
      usePriorityScore(tasks, { weightValue: 1, weightAge: 0, weightType: 0, maxValue: 50000 })
    );

    expect(result.current[0].score).toBe(100);
  });
});
