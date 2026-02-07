import { createClient } from '@supabase/supabase-js';

// Função robusta para buscar variáveis de ambiente em diferentes bundlers (Vite, Webpack, etc)
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${key}`]) {
        // @ts-ignore
        return import.meta.env[`VITE_${key}`];
    }
  } catch (e) {}
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Variáveis de ambiente Supabase não encontradas (SUPABASE_URL / SUPABASE_KEY). Verifique o .env.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');