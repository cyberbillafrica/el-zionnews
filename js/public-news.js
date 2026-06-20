// Ensure Supabase is available
if (typeof window.supabase === 'undefined') {
    console.error("Supabase library not loaded. Check script order.");
}
// Wait for Supabase to be ready
if (typeof window.supabase === 'undefined') {
    console.error("❌ Supabase client not found. Check script loading order.");
}

// 1. Base URL Parser Helper
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 2. Fetch Feeds for index.html (Homepage)

async function fetchHomepageLayoutData() {
    try {
        const [breaking, featuredMain, recentGrid, popular, trendingTicker, featuredSlider] = await Promise.all([
            // 1. Scrolling Breaking News (Static array text items for Marquee)
            supabase.from('articles').select('id, title, slug').eq('status', 'published').eq('breaking_news', true).order('published_at', { ascending: false }).limit(6),
            
            // 2. Main News Hero Slider (Top big banner articles)
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').eq('featured', true).order('published_at', { ascending: false }).limit(4),
            
            // 3. Trending Carousel (Top small ticker carousel next to breaking tag)
            supabase.from('articles').select('id, title, slug').eq('status', 'published').order('published_at', { ascending: false }).limit(5),
            
            // 4. Featured News Slider (The secondary layout carousel row)
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').eq('featured', true).order('published_at', { ascending: true }).limit(6),
            
            // 5. News Grid with Sidebar (The central main story cards grid layout)
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').order('published_at', { ascending: false }).limit(8),
            
            // 6. Popular News (Sidebar / footer carousel tracking top stories)
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').order('published_at', { ascending: false }).limit(4)
        ]);

        return {
            breaking: breaking.data || [],
            featuredMain: featuredMain.data || [],
            trendingTicker: trendingTicker.data || [],
            featuredSlider: featuredSlider.data || [],
            recentGrid: recentGrid.data || [],
            popular: popular.data || []
        };
    } catch (err) {
        console.error("Error gathering homepage data layers:", err);
        return { breaking: [], featuredMain: [], trendingTicker: [], featuredSlider: [], recentGrid: [], popular: [] };
    }
}

// 3. Fetch Category Specific Feeds
async function fetchCategoryLayoutData(categorySlugOrName) {
    try {
        if (!supabase) throw new Error("Supabase client not initialized");

        // First, let's grab the true category UUID...
        const { data: catData, error: catError } = await supabase
            .from('categories')
            .select('id')
            .ilike('name', `%${categorySlugOrName}%`)
            .single();

        if (catError && catError.code !== 'PGRST116') {
            console.warn("Category lookup error:", catError);
        }

        const catId = catData ? catData.id : categorySlugOrName;

        const [allArticles, breaking, featured, trending] = await Promise.all([
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').eq('category_id', catId).order('published_at', { ascending: false }).limit(10),
            supabase.from('articles').select('id, title, slug').eq('status', 'published').eq('breaking_news', true).eq('category_id', catId).order('published_at', { ascending: false }).limit(5),
            supabase.from('articles').select('*, profiles(full_name)').eq('status', 'published').eq('featured', true).eq('category_id', catId).order('published_at', { ascending: false }).limit(4),
            supabase.from('articles').select('id, title, slug, published_at, featured_image').eq('status', 'published').eq('category_id', catId).order('published_at', { ascending: false }).limit(5)
        ]);

        return {
            articles: allArticles.data || [],
            breaking: breaking.data || [],
            featured: featured.data || [],
            trending: trending.data || []
        };
    } catch (err) {
        console.error("Error loading category data layout:", err);
        return { articles: [], breaking: [], featured: [], trending: [] };
    }
}
// 4. Fetch Single Article Data + Associated Comments
async function fetchSingleArticleDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    if (!slug) return null;

    try {
        // Fetch article matching your table layout
        const { data: article, error: artErr } = await supabase
            .from('articles')
            .select('*, profiles(full_name)')
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (artErr) throw artErr;

        // Fetch comments matching your EXACT schema columns: id, article_id, name, email, comment, approved, created_at
        // Filter strictly by approved = true so hidden/spam comments don't render publicly
        const { data: comments, error: commErr } = await supabase
            .from('comments')
            .select('id, name, email, comment, created_at')
            .eq('article_id', article.id)
            .eq('approved', true) 
            .order('created_at', { ascending: true });

        return { article, comments: comments || [] };
    } catch (err) {
        console.error("Error loading article or comments payload:", err);
        return null;
    }
}

// Updated Comment Insertion Form Pipeline Engine
async function submitComment(articleId, userName, userEmail, commentBody) {
    try {
        // Maps exactly to columns: article_id, name, email, comment
        const { data, error } = await supabase
            .from('comments')
            .insert([
                { 
                    article_id: articleId, 
                    name: userName, 
                    email: userEmail, 
                    comment: commentBody 
                }
            ]);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Database comment insertion error:", error.message);
        return { success: false, error: error.message };
    }
}
