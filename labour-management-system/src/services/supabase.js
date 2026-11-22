import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '../config/config.js';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
