// Category page loader — use on testcat.html or any category template.
// Reads ?view=<category-slug> from the URL, then renders articles for that category.

async function loadCategory(slug) {
  return fetchCategoryArticles(slug);
}

async function initCategoryPage(options = {}) {
  const categorySlug = getCategorySlugFromUrl(options.fallbackSlug);
  if (!categorySlug) {
    console.warn('initCategoryPage: no category slug. Pass ?view=sports in the URL.');
    return { articles: [], breaking: [], featured: [], trending: [] };
  }

  return fetchCategoryLayoutData(categorySlug);
}
