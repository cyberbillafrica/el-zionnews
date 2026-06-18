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
  return role === 'admin';
}

export async function isEditor() {
  const role = await getUserRole();
  return (
    role === 'editor' ||
    role === 'admin' ||
    role === 'author'
  );
}
