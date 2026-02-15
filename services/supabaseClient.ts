
import { createClient } from '@supabase/supabase-js';

// Usando as credenciais fornecidas para garantir que o cliente inicialize corretamente
const supabaseUrl = 'https://glnwuozsxzcnotpfmxcb.supabase.co';
const supabaseKey = 'sb_publishable_f8S3MvCnjHFD3aIWq3wbgg_OmavD7W3';

export const supabase = createClient(supabaseUrl, supabaseKey);
