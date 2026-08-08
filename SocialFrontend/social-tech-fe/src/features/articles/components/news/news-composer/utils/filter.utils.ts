import type { BasicArticle } from '@/features/articles/contracts';
import { getArticleCategory } from './article.utils';

export function filterNewsArticles(articles: BasicArticle[], activeTab: string, searchQuery: string, hiddenArticleIds: number[]) {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return articles.filter((article) => {
        if (hiddenArticleIds.includes(article.id)) return false;
        const categoryMatch = activeTab === 'All' || getArticleCategory(article) === activeTab;
        const searchMatch = !normalizedSearch || article.title.toLowerCase().includes(normalizedSearch) || (article.content || '').toLowerCase().includes(normalizedSearch) || article.nameAuthor.toLowerCase().includes(normalizedSearch);
        return categoryMatch && searchMatch;
    });
}
