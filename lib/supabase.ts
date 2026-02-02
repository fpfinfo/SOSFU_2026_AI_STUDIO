import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fzgvfzmrxfcrqlkmxrwa.supabase.co';
const supabaseKey = 'sb_publishable_WgBESkE1UFX8IIDa3Yv0cw_2LraJkKX';

export const supabase = createClient(supabaseUrl, supabaseKey);