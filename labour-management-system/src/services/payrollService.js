import { supabase } from './supabase.js';

export async function listPayroll() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('payroll').select('*, employees(full_name)').order('period_end', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function savePayroll(record) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const payload = { ...record, owner_id: user.id };
  const { data, error } = await supabase.from('payroll').upsert(payload, { onConflict: 'owner_id,employee_id,period_start,period_end' }).select().single();
  if (error) throw error;
  return data;
}
