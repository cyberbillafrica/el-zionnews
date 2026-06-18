import { supabase } from './supabase.js';

/**
 * Gets the current user's role straight from the profiles database table
 */
export async function getUserRole() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) return null;

    const user = session.user;

    // Direct, absolute lookup from your 'profiles' table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      // Fail-safe: Check metadata if the database row hasn't replicated yet
      if (user.user_metadata && user.user_metadata.role) {
        return user.user_metadata.role;
      }
      return null;
    }

    return profile.role;
  } catch (err) {
    console.error("Critical role extraction catch:", err);
    return null;
  }
}

export async function isAdmin() {
  const role = await getUserRole();
  return role === 'admin';
}

export async function isEditor() {
  const role = await getUserRole();
  return role === 'editor' || role === 'admin' || role === 'author';
}
