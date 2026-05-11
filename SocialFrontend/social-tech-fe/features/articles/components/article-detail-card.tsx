"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/common/utils/format-date";
import { ApiError } from "@/common/types/api";
import { articlesApi } from "@/features/articles/articles-api";
import type { ArticleDetail } from "@/features/articles/contracts";
import { EmptyState } from "@/shared/ui/empty-state";
import { SectionShell } from "@/shared/ui/section-shell";

export function ArticleDetailCard({ articleId }: { articleId: number }) {
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const response = await articlesApi.getDetail(articleId);

        if (isMounted) {
          setArticle(response.data);
          setError(null);
        }
      } catch (cause) {
        if (isMounted) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Khong the tai chi tiet bai viet.",
          );
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [articleId]);

  if (error) {
    return <EmptyState title="Khong tai duoc bai viet" description={error} />;
  }

  if (!article) {
    return (
      <EmptyState
        title="Dang tai bai viet"
        description="Component nay dang goi `GET /api/Article/detail/{id}` de dong bo voi backend."
      />
    );
  }

  return (
    <SectionShell
      eyebrow="Article Detail"
      title={article.title}
      description={`Tac gia ${article.nameAuthor} • Tao luc ${formatDateTime(article.createDate)}`}
    >
      <div className="grid gap-5">
        <p className="text-sm leading-8 text-[var(--foreground)]">{article.content}</p>
        <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/70 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Attachments
          </h3>
          <div className="mt-4 grid gap-3">
            {article.attachments?.length ? (
              article.attachments.map((attachment) => (
                <a
                  key={attachment}
                  href={attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-medium"
                >
                  {attachment}
                </a>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Bai viet chua co tep dinh kem.</p>
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
