/**
 * Get comments for public article page
 */
async function getArticleComments(articleId) {

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
        .eq('hidden', false)
        .order('created_at', { ascending: false });


    if (error) throw error;


    return data;

}