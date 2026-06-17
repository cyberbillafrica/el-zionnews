export async function getLatestArticles(limit = 20) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      categories(name, slug)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data;
}
