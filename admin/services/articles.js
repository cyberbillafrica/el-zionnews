import { supabase } from './supabase.js';

/**
 * Fetches articles with option to filter by status
 */
export async function getArticles(statusFilter = null) {
  let query = supabase
    .from('articles')
    .select(`
      id, title, slug, status, created_at, published_at, views, breaking_news,
      profiles (full_name),
      categories (name)
    `)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Creates an article and maps its many-to-many relationship tags
 */
export async function createArticle(articleData, tagIds = []) {
  // 1. Insert the article base row
  const { data: article, error: articleErr } = await supabase
    .from('articles')
    .insert([articleData])
    .select()
    .single();

  if (articleErr) throw articleErr;

  // 2. Map tags if they exist
  if (tagIds.length > 0) {
    const mappings = tagIds.map(tagId => ({
      article_id: article.id,
      tag_id: tagId
    }));
    const { error: tagErr } = await supabase.from('article_tags').insert(mappings);
    if (tagErr) throw tagErr;
  }

  return article;
}

/**
 * Updates an article and replaces its tags atomically
 */
export async function updateArticle(articleId, articleUpdates, tagIds = []) {
  // 1. Update article base fields
  const { error: updateErr } = await supabase
    .from('articles')
    .update(articleUpdates)
    .eq('id', articleId);

  if (updateErr) throw updateErr;

  // 2. Clear old tags and re-insert new tags
  await supabase.from('article_tags').delete().eq('article_id', articleId);

  if (tagIds.length > 0) {
    const mappings = tagIds.map(tagId => ({
      article_id: articleId,
      tag_id: tagId
    }));
    await supabase.from('article_tags').insert(mappings);
  }
}

export async function deleteArticle(articleId) {
  const { error } = await supabase.from('articles').delete().eq('id', articleId);
  if (error) throw error;
}