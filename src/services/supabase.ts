import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if they are missing or still set to the placeholder values
export const isSupabaseConfigured = 
  !!rawUrl && 
  !!rawKey && 
  rawUrl !== 'https://seu-projeto.supabase.co' && 
  rawKey !== 'sua-anon-key-aqui' &&
  !rawUrl.includes('placeholder');

export const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-project.supabase.co';
export const supabaseKey = isSupabaseConfigured ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);