import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment. ' +
    'Copy .env.example to .env.local and fill in the values.'
  );
}

/** Singleton Supabase client for use throughout the frontend. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
