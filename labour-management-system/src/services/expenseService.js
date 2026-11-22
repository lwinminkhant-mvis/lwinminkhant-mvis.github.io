import { supabase } from './supabase.js';

export async function listExpenses(start, end) {
  if (!supabase) return [];
  let query = supabase.from('expenses').select('*, projects(name), employees(full_name)').order('date', { ascending: false });
  if (start) query = query.gte('date', start);
  if (end) query = query.lte('date', end);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
export async function saveExpense(expense) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const payload = { ...expense, owner_id: user.id };
  const query = expense.id
    ? supabase.from('expenses').update(payload).eq('id', expense.id).select().single()
    : supabase.from('expenses').insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function deleteExpense(id) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}
