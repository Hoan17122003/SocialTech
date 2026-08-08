import { useState } from 'react';
import { ApiError } from '@/common/types/api';
import { articlesApi } from '@/features/articles/articles-api';
import { initialState } from '../constants';
import type { ArticleFormState, AttachmentPreview } from '../types';
import { getSubmissionAttachments } from '../utils/attachment.utils';

type UseArticleFormOptions = {
    attachmentPreviews: AttachmentPreview[];
    resetAttachments: () => void;
    onReset?: () => void;
    onSubmitted?: () => void;
};

export function useArticleForm({ attachmentPreviews, resetAttachments, onReset, onSubmitted }: UseArticleFormOptions) {
    const [form, setForm] = useState<ArticleFormState>(initialState);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function updateContent(content: string) {
        setForm((previous) => ({ ...previous, content }));
    }

    function resetForm() {
        resetAttachments();
        setForm(initialState);
        setStatus(null);
        setError(null);
        onReset?.();
    }

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
                attachments: getSubmissionAttachments(attachmentPreviews, form.content),
            });
            setStatus('Da goi tao bai viet thanh cong. Noi dung markdown duoc gui nhu text thong thuong.');
            resetAttachments();
            setForm(initialState);
            onSubmitted?.();
        } catch (cause) {
            setError(cause instanceof ApiError ? cause.message : 'Khong the tao bai viet luc nay.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return { form, setForm, updateContent, status, error, isSubmitting, handleSubmit, resetForm };
}
