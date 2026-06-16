import { supabase } from './supabase.js';

/**
 * Dynamically fetches the current user's role from their profile
 */
export async function getUserRole() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data.role;
}

/**
 * Checks if current user is an Admin or Super Admin
 */
export async function isAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data;
}

/**
 * Checks if current user is an Editor, Admin, or Super Admin
 */
export async function isEditor() {
  const { data, error } = await supabase.rpc('is_editor');
  if (error) return false;
  return data;
}