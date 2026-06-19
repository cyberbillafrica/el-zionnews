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
