import { supabase } from './supabase.js';

/**
 * Get current user role safely
 */
export async function getUserRole() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const user = session.user;

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Role fetch error:', error);
      return null;
    }

    return data?.role ?? null;

  } catch (err) {
    console.error('Critical role error:', err);
    return null;
  }
}

/**
 * Admin check
 */
export async function isAdmin() {
  const role = await getUserRole();
  return role === 'admin' || role === 'super_admin';
}

/**
 * Editor check
 */
export async function isEditor() {
  const role = await getUserRole();

  return (
    role === 'editor' ||
    role === 'admin' ||
    role === 'author' ||
    role === 'super_admin'
  );
}
