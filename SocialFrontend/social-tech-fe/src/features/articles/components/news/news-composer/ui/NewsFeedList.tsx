import type { BasicArticle } from '@/features/articles/contracts';
import type { ArticleCardProps } from '../types';
import { ArticleCard } from './ArticleCard';

type Props = { articles: BasicArticle[]; cardProps: Omit<ArticleCardProps, 'article' | 'index'> };

export function NewsFeedList({ articles, cardProps }: Props) {
    return (
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-6">
            {articles.map((article, index) => {
                return <ArticleCard key={article.id} article={article} index={index} {...cardProps} />;
            })}
        </div>
    );
}
