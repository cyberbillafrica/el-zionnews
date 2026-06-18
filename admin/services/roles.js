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

    // IMPORTANT CHANGE: do NOT fail on temporary issues
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
