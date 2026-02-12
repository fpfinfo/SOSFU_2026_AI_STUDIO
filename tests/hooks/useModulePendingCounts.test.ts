import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useModulePendingCounts } from '../../hooks/useModulePendingCounts';
import { supabase } from '../../lib/supabase';

describe('useModulePendingCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const defaultConfig = {
    statuses: ['WAITING_SODPA_ANALYSIS'],
    seenCountKey: 'test_seen_count',
    pollInterval: 999999, // Long interval to prevent re-polling during tests
  };

  function mockSupabaseQuery(data: any[]) {
    const chainable: any = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.in = vi.fn().mockResolvedValue({ data });
    chainable.eq = vi.fn().mockResolvedValue({ data });
    chainable.or = vi.fn().mockResolvedValue({ data });
    vi.mocked(supabase.from).mockReturnValue(chainable as any);
    return chainable;
  }

  it('should start with zero counts and update after fetch', async () => {
    mockSupabaseQuery([]);

    const { result } = renderHook(() => useModulePendingCounts(defaultConfig));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('solicitations');
    });

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.urgentCount).toBe(0);
    expect(result.current.newCount).toBe(0);
  });

  it('should fetch and classify urgent vs non-urgent items', async () => {
    const now = Date.now();
    const recentDate = new Date(now - 1000 * 60 * 60 * 2).toISOString(); // 2h ago
    const oldDate = new Date(now - 1000 * 60 * 60 * 72).toISOString(); // 72h ago

    mockSupabaseQuery([
      { id: '1', created_at: recentDate, status: 'WAITING_SODPA_ANALYSIS' },
      { id: '2', created_at: oldDate, status: 'WAITING_SODPA_ANALYSIS' },
      { id: '3', created_at: recentDate, status: 'WAITING_SODPA_ANALYSIS' },
    ]);

    const { result } = renderHook(() => useModulePendingCounts(defaultConfig));

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(3);
    });

    expect(result.current.urgentCount).toBe(1); // Only item 2 is > 48h
    expect(result.current.newCount).toBe(3);
  });

  it('should calculate newCount based on lastSeenCount', async () => {
    localStorage.setItem('test_seen_count', '2');

    mockSupabaseQuery([
      { id: '1', created_at: new Date().toISOString(), status: 'WAITING_SODPA_ANALYSIS' },
      { id: '2', created_at: new Date().toISOString(), status: 'WAITING_SODPA_ANALYSIS' },
      { id: '3', created_at: new Date().toISOString(), status: 'WAITING_SODPA_ANALYSIS' },
    ]);

    const { result } = renderHook(() => useModulePendingCounts(defaultConfig));

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(3);
    });

    expect(result.current.newCount).toBe(1); // 3 - 2 = 1
  });

  it('should acknowledge new items and update localStorage', async () => {
    mockSupabaseQuery([
      { id: '1', created_at: new Date().toISOString(), status: 'WAITING_SODPA_ANALYSIS' },
      { id: '2', created_at: new Date().toISOString(), status: 'WAITING_SODPA_ANALYSIS' },
    ]);

    const { result } = renderHook(() => useModulePendingCounts(defaultConfig));

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(2);
    });

    expect(result.current.newCount).toBe(2);

    act(() => {
      result.current.handleAcknowledgeNew();
    });

    expect(result.current.newCount).toBe(0);
    expect(localStorage.getItem('test_seen_count')).toBe('2');
  });

  it('should use eq filter when filterMode is eq with single status', async () => {
    const chainable = mockSupabaseQuery([]);

    renderHook(() => useModulePendingCounts({
      ...defaultConfig,
      filterMode: 'eq',
    }));

    await waitFor(() => {
      expect(chainable.eq).toHaveBeenCalledWith('status', 'WAITING_SODPA_ANALYSIS');
    });
  });

  it('should use or filter when filterMode is or', async () => {
    const chainable = mockSupabaseQuery([]);

    renderHook(() => useModulePendingCounts({
      statuses: [],
      seenCountKey: 'test_or',
      pollInterval: 999999,
      filterMode: 'or',
      orFilter: 'status.eq.WAITING_RESSARCIMENTO_ANALYSIS,status.eq.WAITING_RESSARCIMENTO_EXECUTION',
    }));

    await waitFor(() => {
      expect(chainable.or).toHaveBeenCalledWith(
        'status.eq.WAITING_RESSARCIMENTO_ANALYSIS,status.eq.WAITING_RESSARCIMENTO_EXECUTION'
      );
    });
  });

  it('should respect custom urgentThresholdHours', async () => {
    const now = Date.now();
    const thirtyHoursAgo = new Date(now - 1000 * 60 * 60 * 30).toISOString();

    mockSupabaseQuery([
      { id: '1', created_at: thirtyHoursAgo, status: 'WAITING_SODPA_ANALYSIS' },
    ]);

    const { result } = renderHook(() => useModulePendingCounts({
      ...defaultConfig,
      urgentThresholdHours: 24,
    }));

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });

    expect(result.current.urgentCount).toBe(1); // 30h > 24h threshold
  });

  it('should NOT classify as urgent below threshold', async () => {
    const now = Date.now();
    const tenHoursAgo = new Date(now - 1000 * 60 * 60 * 10).toISOString();

    mockSupabaseQuery([
      { id: '1', created_at: tenHoursAgo, status: 'WAITING_SODPA_ANALYSIS' },
    ]);

    const { result } = renderHook(() => useModulePendingCounts(defaultConfig));

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });

    expect(result.current.urgentCount).toBe(0); // 10h < 48h default
  });
});
