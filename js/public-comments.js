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



/**
 * Submit comment
 */
async function submitComment(articleId, name, email, comment) {


    const { data, error } = await supabase
        .from('comments')
        .insert([
            {
                article_id: articleId,
                name,
                email,
                comment,
                likes: 0,
                hidden: false
            }
        ])
        .select()
        .single();



    if(error) throw error;


    return {
        success:true,
        data
    };

}