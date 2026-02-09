import { createClient } from '@supabase/supabase-js';

/**
 * Busca variável de ambiente compatível com Vite (import.meta.env) e process.env.
 */
const getEnv = (key: string): string => {
  // Vite: variáveis com prefixo VITE_ ficam em import.meta.env
  const viteKey = `VITE_${key}`;
  const metaEnv = import.meta.env;
  if (metaEnv?.[viteKey]) {
    return metaEnv[viteKey] as string;
  }
  // Fallback: process.env (injetado via define no vite.config)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string;
  }
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Variáveis de ambiente Supabase não encontradas (VITE_SUPABASE_URL / VITE_SUPABASE_KEY). Verifique o .env.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
