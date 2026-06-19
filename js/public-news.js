// js/public-news.js

// 1. Base URL Parser Helper
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 2. Fetch Feeds for index.html (Homepage)
async function fetchHomepageFeeds() {
    try {
        const [breaking, featured, recent] = await Promise.all([
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').eq('breaking_news', true).order('published_at', { ascending: false }).limit(5),
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').eq('featured', true).order('published_at', { ascending: false }).limit(4),
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').order('published_at', { ascending: false }).limit(10)
        ]);

        return {
            breaking: breaking.data || [],
            featured: featured.data || [],
            recent: recent.data || []
        };
    } catch (err) {
        console.error("Error loading homepage data:", err);
        return { breaking: [], featured: [], recent: [] };
    }
}

// 3. Fetch Category Specific Feeds
async function fetchCategoryFeed(categoryName) {
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*, profiles(full_name)')
            .eq('status', 'published')
            .ilike('category_id', categoryName) // matches 'sports', 'crypto', etc.
            .order('published_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (err) {
        console.error(`Error loading category ${categoryName}:`, err);
        return [];
    }
}

// 4. Fetch Single Article Data + Associated Comments
async function fetchSingleArticleDetails() {
    const slug = getQueryParam('slug');
    if (!slug) return null;

    try {
        const { data: article, error: artErr } = await supabase
            .from('articles')
            .select('*, profiles(full_name)')
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (artErr) throw artErr;

        const { data: comments, error: commErr } = await supabase
            .from('comments')
            .select('*')
            .eq('article_id', article.id)
            .order('created_at', { ascending: true });

        return { article, comments: comments || [] };
    } catch (err) {
        console.error("Error loading article:", err);
        return null;
    }
}
