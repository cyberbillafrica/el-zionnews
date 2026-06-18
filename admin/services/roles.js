import { supabase } from './supabase.js';

export async function getUserRole() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error);
      return null;
    }

    return data?.role ?? null;

  } catch (err) {
    console.error("Role system crash:", err);
    return null;
  }
}

export async function isAdmin() {
  const role = await getUserRole();
  // Only 'admin' and 'super_admin' get admin console access.
  // Matches the login router in index.html which sends both to dashboard.html.
  return role === 'admin' || role === 'super_admin';
}

export async function isEditor() {
  const role = await getUserRole();
  // FIX Bug 1: 'author' removed. Authors are not editors and should not
  // access the editor console. The login router sends editors and authors
  // both to editor-console.html — if you want authors to have access,
  // add them back here AND update the login router accordingly.
  // Current policy: only 'editor' role gets this console.
  return role === 'editor';
}

// Separate helper for the login router — kept distinct from console gate checks
// so each console controls its own access policy independently.
export async function isAuthor() {
  const role = await getUserRole();
  return role === 'author';
}
