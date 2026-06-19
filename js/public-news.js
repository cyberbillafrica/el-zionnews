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
async function fetchCategoryLayoutData(categoryName) {
    try {
        // Run parallel queries to fetch targeted slices of news for this category
        const [allArticles, breaking, featured, trending] = await Promise.all([
            // Main news bucket for the grid
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').ilike('category_id', categoryName).order('published_at', { ascending: false }).limit(10),
            // Breaking news ticker items
            supabase.from('articles').select('id, title, slug').eq('status', 'published').eq('breaking_news', true).ilike('category_id', categoryName).order('published_at', { ascending: false }).limit(5),
            // High profile featured slots for the sliders
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').eq('featured', true).ilike('category_id', categoryName).order('published_at', { ascending: false }).limit(4),
            // Trending list layout
            supabase.from('articles').select('id, title, slug, published_at, featured_image').eq('status', 'published').ilike('category_id', categoryName).order('published_at', { ascending: false }).limit(5) // Adjust sorting if you have a view counter
        ]);

        return {
            articles: allArticles.data || [],
            breaking: breaking.data || [],
            featured: featured.data || [],
            trending: trending.data || []
        };
    } catch (err) {
        console.error(`Error aggregating data for category ${categoryName}:`, err);
        return { articles: [], breaking: [], featured: [], trending: [] };
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
