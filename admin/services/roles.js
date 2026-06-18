import { supabase } from './supabase.js';
 Gets the current user's role by checking both session metadata and the database profile
 async function getUserRole() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const user = session.user;

  // 1. First Check: Look inside the secure JWT App Metadata / User Metadata
  // This is what we passed during signUp options: { data: { role: invite.role } }
  if (user.user_metadata && user.user_metadata.role) {
    return user.user_metadata.role;
  }
  if (user.app_metadata && user.app_metadata.role) {
    return user.app_metadata.role;
  }

  // 2. Fallback Check: Query your database profiles table directly
  const { data: profile, error: profileError } = await supabase
    .from('profiles') // <-- Change this if your table name is different (e.g., 'user_roles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profileError && profile) {
    return profile.role;
  }

  return null;
}

/**
 * Verifies if the user has Administrator access
 */
export async function isAdmin() {
  const role = await getUserRole();
  return role === 'admin';
}

/**
 * Verifies if the user is an Editor or higher
 */
export async function isEditor() {
  const role = await getUserRole();
  return role === 'editor' || role === 'admin' || role === 'author';
}
