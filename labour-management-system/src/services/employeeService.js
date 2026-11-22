import { supabase } from './supabase.js';

export async function listEmployees() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('employees').select('*').order('full_name');
  if (error) throw error;
  return data || [];
}
export async function saveEmployee(employee) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const payload = { ...employee, owner_id: user.id };
  const query = employee.id
    ? supabase.from('employees').update(payload).eq('id', employee.id).select().single()
    : supabase.from('employees').insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function archiveEmployee(id) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('employees').update({ active: false }).eq('id', id);
  if (error) throw error;
}
