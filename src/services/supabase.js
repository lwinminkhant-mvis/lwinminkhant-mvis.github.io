import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from '../config/config.js';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;
