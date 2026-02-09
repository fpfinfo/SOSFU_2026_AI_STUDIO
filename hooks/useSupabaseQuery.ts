import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseSupabaseQueryOptions<T> {
  /** Nome da tabela no Supabase */
  table: string;
  /** Colunas a selecionar (default: '*') */
  select?: string;
  /** Filtros como pares chave-valor */
  filters?: Record<string, unknown>;
  /** Filtro .in() — ex: { status: ['A', 'B'] } */
  inFilters?: Record<string, unknown[]>;
  /** Ordenação */
  orderBy?: { column: string; ascending?: boolean };
  /** Desabilitar fetch automático */
  enabled?: boolean;
  /** Transformar dados antes de retornar */
  transform?: (data: unknown[]) => T[];
}

interface UseSupabaseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook genérico para consultas ao Supabase com loading/error state.
 * Substitui o padrão repetitivo de fetch + try/catch em múltiplos componentes.
 */
export function useSupabaseQuery<T = Record<string, unknown>>(
  options: UseSupabaseQueryOptions<T>
): UseSupabaseQueryResult<T> {
  const {
    table,
    select = '*',
    filters = {},
    inFilters = {},
    orderBy,
    enabled = true,
    transform,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).select(select);

      // Apply eq filters
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }

      // Apply in filters
      for (const [key, values] of Object.entries(inFilters)) {
        query = query.in(key, values);
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data: result, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      const finalData = transform ? transform(result ?? []) : (result as T[]) ?? [];
      setData(finalData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados';
      console.error(`[useSupabaseQuery] ${table}:`, msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [table, select, JSON.stringify(filters), JSON.stringify(inFilters), orderBy?.column, orderBy?.ascending, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
