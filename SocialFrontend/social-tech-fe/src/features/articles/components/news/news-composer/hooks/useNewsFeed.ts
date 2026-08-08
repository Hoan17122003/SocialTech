import { useEffect, useState } from 'react';
import { articlesApi } from '@/features/articles/articles-api';
import type { BasicArticle } from '@/features/articles/contracts';
import { FALLBACK_ARTICLES } from '../constants';

export function useNewsFeed() {
    const [articles, setArticles] = useState<BasicArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function fetchNews() {
            try {
                setLoading(true);
                const response = await articlesApi.news({ page: 1, limit: 20 });
                if (!isMounted) return;

                if (response?.success && response.data?.length) {
                    setArticles(response.data);
                    setIsDemoMode(false);
                } else {
                    setArticles(FALLBACK_ARTICLES);
                    setIsDemoMode(true);
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('API Error, switching to mock database:', err);
                setArticles(FALLBACK_ARTICLES);
                setIsDemoMode(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        void fetchNews();
        return () => {
            isMounted = false;
        };
    }, []);

    return { articles, setArticles, loading, isDemoMode };
}
