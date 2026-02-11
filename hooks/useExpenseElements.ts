import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ExpenseElement {
    id: string;
    codigo: string;
    descricao: string;
    categoria: string;
    ativo: boolean;
}

export function useExpenseElements() {
    const [elements, setElements] = useState<ExpenseElement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchElements = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('elementos_despesa')
                .select('*')
                .eq('ativo', true)
                .order('codigo', { ascending: true });

            if (fetchError) throw fetchError;
            setElements(data || []);
        } catch (e: any) {
            console.error('Error fetching expense elements:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchElements();
    }, [fetchElements]);

    return {
        elements,
        loading,
        error,
        refresh: fetchElements
    };
}
