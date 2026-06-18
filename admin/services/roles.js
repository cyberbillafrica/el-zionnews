export async function getUserRole() {
  const { data: { session } } = await supabase.auth.getSession();

  const user = session?.user;

  console.log("USER ID:", user?.id);

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  console.log("ROLE RESULT:", data);
  console.log("ROLE ERROR:", error);

  return data?.role ?? null;
}
