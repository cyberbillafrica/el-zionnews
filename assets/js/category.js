async function loadCategory(slug) {
  const { data } = await supabase
    .from('articles')
    .select(`
      *,
      categories!inner(name, slug)
    `)
    .eq('status', 'published')
    .eq('categories.slug', slug)
    .order('published_at', { ascending: false });

  renderArticles(data);
}
