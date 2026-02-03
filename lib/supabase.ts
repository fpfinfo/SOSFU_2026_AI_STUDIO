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

// Fallbacks de segurança para evitar crash da aplicação (Tela Branca)
// Usando as credenciais do projeto 'fzg...' que correspondem à chave anon válida fornecida anteriormente
const DEFAULT_URL = 'https://fzgvfzmrxfcrqlkmxrwa.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z3Zmem1yeGZjcnFsa214cndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njc5MDMsImV4cCI6MjA4NTU0MzkwM30.va3AugbywwKJApo7QLsjruZ9Tut6ECvsy8KuqrQS3fI';

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || DEFAULT_URL;
const supabaseAnonKey = getEnv('SUPABASE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || DEFAULT_KEY;

if (!supabaseUrl) {
    console.error('Supabase URL não encontrada. Usando modo de emergência.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isMock = false;