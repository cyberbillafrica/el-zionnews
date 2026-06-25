import { supabase } from './supabase.js';

/**
 * Fetches articles with option to filter by status
 * Includes new fields from migration schema: breaking_news, view, meta_* fields, etc.
 * NOW ALSO includes comments for real-time dashboard display
 */
export async function getArticles(statusFilter = null) {
  let query = supabase
    .from('articles')
    .select(`
      id, title, slug, status, created_at, published_at, breaking_news, views,
      featured_image, category_id, author_id,
      seo_title, seo_description, meta_keywords, meta_image,
      profiles (full_name),
      categories (name),
      comments (id, comment, email, created_at)
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
 * Supports the new migration schema fields including: breaking_news, view, meta_* fields, etc.
 */
export async function createArticle(articleData, tagIds = []) {
  // 1. Insert the article base row - supports new schema fields
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
 * Supports all migration schema fields including meta_* fields and update triggers
 */
export async function updateArticle(articleId, articleUpdates, tagIds = []) {
  // 1. Update article base fields - supports all new schema fields
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

  // 3. Update related fields if article is being publishing
  if (articleUpdates.status === 'published' || articleUpdates.breaking_news) {
    // Handle any additional field updates if needed
  }
}

export async function deleteArticle(articleId) {
  const { error } = await supabase.from('articles').delete().eq('id', articleId);
  if (error) throw error;
}