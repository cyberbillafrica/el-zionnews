import { supabase } from './supabase.js';


/**
 * Get comments for public article page
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
      likes,
      parent_id
    `)
    .eq('article_id', articleId)
    .order('created_at', { ascending: false });


  if(error) throw error;

  return data;

}



/**
 * Submit comment
 */
export async function submitComment(articleId, name, email, comment) {


  const { data, error } = await supabase
    .from('comments')
    .insert([
      {
        article_id: articleId,
        name,
        email,
        comment,
        likes: 0
      }
    ])
    .select()
    .single();


  if(error) throw error;


  return data;

}



/**
 * Dashboard fetch
 */
export async function getAllComments() {


  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      name,
      email,
      comment,
      created_at,
      articles(title)
    `)
    .order('created_at', {ascending:false});


  if(error) throw error;


  return data;

}




/**
 * Hide comment
 */
export async function hideComment(id) {


  const {error} = await supabase
    .from('comments')
    .update({
      hidden:true
    })
    .eq('id',id);


  if(error) throw error;

}



/**
 * Delete comment
 */
export async function deleteComment(id){


 const {error}=await supabase
 .from('comments')
 .delete()
 .eq('id',id);


 if(error) throw error;

}