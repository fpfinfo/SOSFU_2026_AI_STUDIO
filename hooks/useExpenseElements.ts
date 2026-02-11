import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ExpenseElement {
    id: string;
    codigo: string;
    descricao: string;
    categoria?: string;
    is_active: boolean;
    module?: 'SOSFU' | 'SODPA' | 'AMBOS';
}

export function useExpenseElements(module?: 'SOSFU' | 'SODPA', includeInactive: boolean = false) {
    const [elements, setElements] = useState<ExpenseElement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchElements = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('delemento')
                .select('*');
            
            if (!includeInactive) {
                query = query.eq('is_active', true);
            }
            
            if (module) {
                query = query.or(`module.eq.${module},module.eq.AMBOS`);
            }

            const { data, error: fetchError } = await query.order('codigo', { ascending: true });

            if (fetchError) throw fetchError;
            setElements(data || []);
        } catch (e: any) {
            console.error('Error fetching expense elements:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [module]);

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
