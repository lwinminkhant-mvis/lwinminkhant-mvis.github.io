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
  let paidAmount = Number(record.paid_amount || 0);
  if (paidAmount === 0) {
    const { data: existing } = await supabase
      .from('payroll')
      .select('paid_amount')
      .eq('owner_id', user.id)
      .eq('employee_id', record.employee_id)
      .eq('period_start', record.period_start)
      .eq('period_end', record.period_end)
      .maybeSingle();
    paidAmount = Number(existing?.paid_amount || 0);
  }
  const payload = { ...record, paid_amount: paidAmount, owner_id: user.id };
  const { data, error } = await supabase.from('payroll').upsert(payload, { onConflict: 'owner_id,employee_id,period_start,period_end' }).select().single();
  if (error) throw error;
  return data;
}
