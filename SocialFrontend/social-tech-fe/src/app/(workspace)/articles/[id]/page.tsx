import { ArticleDetailCard } from '@/features/articles/components/article-detail-card';

export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return <ArticleDetailCard articleId={Number(id)} />;
}
