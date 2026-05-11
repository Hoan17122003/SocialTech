"use client";

import { useState } from "react";
import { ApiError } from "@/common/types/api";
import { articlesApi } from "@/features/articles/articles-api";
import { Button } from "@/shared/ui/button";
import { Input, Textarea } from "@/shared/ui/field";
import { FormMessage } from "@/shared/ui/form-message";
import { SectionShell } from "@/shared/ui/section-shell";

type ArticleFormState = {
  title: string;
  content: string;
  comunityId: string;
  articleStatus: "Draft" | "Published";
  attachments: File[];
};

const initialState: ArticleFormState = {
  title: "",
  content: "",
  comunityId: "",
  articleStatus: "Published",
  attachments: [],
};

export function ArticleComposer() {
  const [form, setForm] = useState<ArticleFormState>(initialState);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setIsSubmitting(true);

    try {
      await articlesApi.create({
        title: form.title,
        content: form.content,
        comunityId: form.comunityId ? Number(form.comunityId) : undefined,
        articleStatus: form.articleStatus,
        attachments: form.attachments,
      });

      setStatus("Da goi tao bai viet thanh cong. Backend se tra ve article id.");
      setForm(initialState);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Khong the tao bai viet luc nay.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SectionShell
      eyebrow="Article"
      title="Composer cho bai viet moi"
      description="Form nay duoc dung de map truc tiep toi endpoint multipart `POST /api/Article/create` va san sang cho viec them rich editor sau nay."
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Input
          placeholder="Tieu de bai viet"
          value={form.title}
          onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
        />
        <Textarea
          placeholder="Noi dung bai viet"
          value={form.content}
          onChange={(event) =>
            setForm((previous) => ({ ...previous, content: event.target.value }))
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Community Id"
            value={form.comunityId}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, comunityId: event.target.value }))
            }
          />
          <select
            value={form.articleStatus}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                articleStatus: event.target.value as "Draft" | "Published",
              }))
            }
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm outline-none"
          >
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
        <Input
          type="file"
          multiple
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              attachments: Array.from(event.target.files ?? []),
            }))
          }
        />
        {error ? <FormMessage type="error" message={error} /> : null}
        {status ? <FormMessage type="success" message={status} /> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Dang gui..." : "Dang bai"}
          </Button>
        </div>
      </form>
    </SectionShell>
  );
}
