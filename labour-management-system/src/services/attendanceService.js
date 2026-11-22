import { supabase } from './supabase.js';

export async function listAttendance(start, end) {
  if (!supabase) return [];
  let query = supabase.from('attendance').select('*, employees(full_name)').order('date', { ascending: false });
  if (start) query = query.gte('date', start);
  if (end) query = query.lte('date', end);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
export async function saveAttendance(record) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const payload = { ...record, owner_id: user.id };
  const query = record.id
    ? supabase.from('attendance').update(payload).eq('id', record.id).select().single()
    : supabase.from('attendance').insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
