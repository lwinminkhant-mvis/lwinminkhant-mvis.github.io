import { supabase } from './supabase.js';

export async function listPayments() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('payments').select('*, employees(full_name), payroll(period_start, period_end)').order('payment_date', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function savePayment(payment) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const payload = { ...payment, owner_id: user.id };
  const { data, error } = await supabase.from('payments').insert(payload).select().single();
  if (error) throw error;
  return data;
}
