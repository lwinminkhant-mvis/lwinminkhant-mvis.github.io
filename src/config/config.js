export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://urxmavmvpuoqpusdldlg.supabase.co';
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  !supabaseUrl.includes('your-project') &&
  !supabasePublishableKey.includes('your-publishable') &&
  !supabasePublishableKey.includes('your-public')
);
