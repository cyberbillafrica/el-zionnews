import { supabase } from './supabase.js';

/**
 * Sign in using email and password
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign in using passwordless Email Magic Links
 */
export async function signInWithMagicLink(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + '/admin/dashboard.html',
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Register a new user using a validated invitation code
 */
export async function registerWithInvitation(email, password, fullName, inviteCode) {
  // 1. Verify invitation code validity
  const { data: invite, error: inviteErr } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('code', inviteCode)
    .eq('active', true)
    .single();

  if (inviteErr || !invite) throw new Error('Invalid or expired invitation code.');
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    throw new Error('Invitation code has expired.');
  }
  if (invite.uses >= invite.max_uses) {
    throw new Error('Invitation code has reached its maximum usage limit.');
  }

  // 2. Sign up the user in Supabase Auth
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });
  if (authErr) throw authErr;

  // 3. Update profile role and increment code usage count
  const userId = authData.user.id;
  
  await supabase
    .from('profiles')
    .update({ role: invite.role, full_name: fullName })
    .eq('id', userId);

  await supabase
    .from('invitation_codes')
    .update({ uses: invite.uses + 1 })
    .eq('id', invite.id);

  return authData;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  return await supabase.auth.getSession();
}