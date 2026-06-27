import { supabase } from './supabase.js';

/**
 * Get visible comments for an article (with like count)
 */
export async function getArticleComments(articleId) {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      name,
      email,
      comment,
      created_at,
      parent_id,
      (SELECT COUNT(*) FROM comment_likes WHERE comment_likes.comment_id = comments.id) as likes
    `)
    .eq('article_id', articleId)
    .eq('hidden', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Submit new comment or reply
 */
export async function submitComment(articleId, name, email, commentBody, parentId = null) {
  try {
    const payload = {
      article_id: articleId,
      name: name.trim(),
      email: email.trim(),
      comment: commentBody.trim(),
      parent_id: parentId,
      hidden: false,
      edit_token: 'et_' + Math.random().toString(36).substring(2, 15) // simple token
    };

    const { data, error } = await supabase
      .from('comments')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Comment insert error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle like using your function
 */
export async function toggleLike(commentId, visitorId) {
  try {
    const { data: newCount, error } = await supabase
      .rpc('toggle_comment_like', {
        p_comment_id: commentId,
        p_visitor_id: visitorId
      });

    if (error) throw error;
    return newCount;
  } catch (error) {
    console.error('Like toggle failed:', error);
    return null;
  }
}

/**
 * Reply to comment
 */
export async function replyToComment(parentId, articleId, name, email, text) {
  return await submitComment(articleId, name, email, text, parentId);
}