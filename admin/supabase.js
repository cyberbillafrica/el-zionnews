// Supabase client helper (ES module)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// TODO: replace these with your Supabase project values or set them in a build step.
const SUPABASE_URL = 'REPLACE_WITH_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'REPLACE_WITH_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(cb) {
  return supabase.auth.onAuthStateChange((event, session) => cb(event, session));
}

export async function getSession() {
  return await supabase.auth.getSession();
}
