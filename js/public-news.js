// Shared public-site helpers (available globally for inline page scripts)
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function formatArticleDate(isoDate) {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}

function getCategoryName(article) {
    return article?.categories?.name || 'News';
}

function getCategorySlug(article) {
    return article?.categories?.slug || '';
}

function getArticleTags(article) {
    if (!article?.article_tags?.length) return [];
    return article.article_tags
        .map(row => row.tags?.name)
        .filter(Boolean);
}

function articleCardHTML(art, linkPrefix = '') {
    const category = getCategoryName(art);
    const href = `${linkPrefix}a_sample.html?slug=${encodeURIComponent(art.slug)}`;
    const img = art.featured_image || 'img/placeholder.jpg';
    const date = formatArticleDate(art.published_at);

    return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="position-relative mb-3">
                <img class="img-fluid w-100" src="${escapeHTML(img)}" style="object-fit: cover; height: 220px;" alt="">
                <div class="bg-white border border-top-0 p-4">
                    <div class="mb-2">
                        <span class="badge badge-primary text-uppercase font-weight-semi-bold p-2 mr-2">${escapeHTML(category)}</span>
                        <span class="text-body"><small>${escapeHTML(date)}</small></span>
                    </div>
                    <h4 class="h5 mb-2 font-weight-bold">
                        <a class="text-dark" href="${href}">${escapeHTML(art.title)}</a>
                    </h4>
                    <p class="m-0 small text-muted">${escapeHTML(art.excerpt || '')}</p>
                </div>
            </div>
        </div>
    `;
}

function getQueryParam(param) {
    return new URLSearchParams(window.location.search).get(param);
}

function getCategorySlugFromUrl(fallbackSlug) {
    const view = getQueryParam('view');
    if (view) return view.toLowerCase().trim();

    if (fallbackSlug) return fallbackSlug.toLowerCase().trim();

    const file = window.location.pathname.split('/').pop() || '';
    const base = file.replace('.html', '');
    return base && base !== 'index' && base !== 'testcat' ? base : null;
}

// ---------------------------------------------------------------------------
// Homepage feeds
// ---------------------------------------------------------------------------

async function fetchHomepageLayoutData() {
    try {
        const [
            breaking,
            featuredMain,
            trendingTicker,
            featuredSlider,
            recentGrid,
            popular
        ] = await Promise.all([
            supabase.from('articles').select('id, title, slug, categories(name)').eq('status', 'published').eq('breaking_news', true).order('published_at', { ascending: false }).limit(6),
            supabase.from('articles').select('*, categories(name, slug), profiles(full_name)').eq('status', 'published').eq('featured', true).order('published_at', { ascending: false }).limit(4),
            supabase.from('articles').select('id, title, slug').eq('status', 'published').order('published_at', { ascending: false }).limit(5),
            supabase.from('articles').select('*, categories(name, slug), profiles(full_name)').eq('status', 'published').eq('featured', true).order('published_at', { ascending: true }).limit(6),
            supabase.from('articles').select('*, categories(name, slug), profiles(full_name)').eq('status', 'published').order('published_at', { ascending: false }).limit(8),
            supabase.from('articles').select('*, categories(name, slug), profiles(full_name)').eq('status', 'published').order('views', { ascending: false }).limit(4)
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
        console.error('Error gathering homepage data layers:', err);
        return { breaking: [], featuredMain: [], trendingTicker: [], featuredSlider: [], recentGrid: [], popular: [] };
    }
}

async function fetchHomepageSectionsData() {
    try {
        const { data: sections, error: secErr } = await supabase
            .from('homepage_sections')
            .select('id, name, slug')
            .order('name');

        if (secErr) throw secErr;
        if (!sections?.length) return {};

        const results = await Promise.all(
            sections.map(async (section) => {
                const { data: rows, error } = await supabase
                    .from('homepage_articles')
                    .select(`
                        display_order,
                        articles:article_id (
                            id, title, slug, excerpt, featured_image, published_at, status,
                            categories (name, slug)
                        )
                    `)
                    .eq('section_id', section.id)
                    .order('display_order', { ascending: true });

                if (error) {
                    console.warn(`Homepage section "${section.slug}" load error:`, error);
                    return [section.slug, []];
                }

                const articles = (rows || [])
                    .map(row => row.articles)
                    .filter(art => art && art.status === 'published');

                return [section.slug, articles];
            })
        );

        return Object.fromEntries(results);
    } catch (err) {
        console.error('Error loading homepage sections:', err);
        return {};
    }
}

function renderHomepageSectionGrids(sectionData, linkPrefix = '') {
    Object.entries(sectionData).forEach(([slug, articles]) => {
        const container = document.getElementById(`section-${slug}`);
        if (!container) return;

        if (!articles.length) {
            container.innerHTML = '<p class="text-muted col-12">No articles assigned to this section yet.</p>';
            return;
        }

        container.innerHTML = articles.map(art => articleCardHTML(art, linkPrefix)).join('');
    });
}

// ---------------------------------------------------------------------------
// Category pages
// ---------------------------------------------------------------------------

async function fetchCategoryArticles(categorySlug) {
    if (!categorySlug) return [];

    const { data, error } = await supabase
        .from('articles')
        .select(`
            *,
            categories!inner(name, slug),
            profiles(full_name),
            article_tags(tags(name))
        `)
        .eq('status', 'published')
        .eq('categories.slug', categorySlug)
        .order('published_at', { ascending: false });

    if (error) {
        console.error('Category article query error:', error);
        return [];
    }

    return data || [];
}

async function fetchCategoryLayoutData(categorySlug) {
    try {
        const slug = categorySlug?.toLowerCase?.().trim();
        if (!slug) return { articles: [], breaking: [], featured: [], trending: [] };

        const articles = await fetchCategoryArticles(slug);

        const breaking = articles.filter(a => a.breaking_news).slice(0, 5);
        const featured = articles.filter(a => a.featured).slice(0, 4);
        const trending = articles.slice(0, 5);

        return { articles, breaking, featured, trending };
    } catch (err) {
        console.error('Error loading category data layout:', err);
        return { articles: [], breaking: [], featured: [], trending: [] };
    }
}

// ---------------------------------------------------------------------------
// Single article + comments
// ---------------------------------------------------------------------------

async function fetchSingleArticleDetails() {
    const slug = getQueryParam('slug');
    if (!slug) return null;

    try {
        const { data: article, error: artErr } = await supabase
            .from('articles')
            .select(`
                *,
                profiles(full_name),
                categories(name, slug),
                article_tags(tags(name, slug))
            `)
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (artErr) throw artErr;

        const { data: comments, error: commErr } = await supabase
            .from('comments')
            .select('id, name, email, comment, created_at')
            .eq('article_id', article.id)
            .eq('approved', true)
            .order('created_at', { ascending: true });

        if (commErr) console.warn('Comments load warning:', commErr);

        return { article, comments: comments || [] };
    } catch (err) {
        console.error('Error loading article or comments payload:', err);
        return null;
    }
}

async function submitComment(articleId, userName, userEmail, commentBody) {
    try {
        const payload = {
            article_id: articleId,
            name: userName,
            email: userEmail,
            comment: commentBody
        };

        const { error } = await supabase.from('comments').insert([payload]);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Database comment insertion error:', error.message);
        return { success: false, error: error.message };
    }
}
