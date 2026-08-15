import { useEffect, useRef, useState } from 'react';
import { articlesApi } from '@/features/articles/articles-api';
import type { BasicArticle } from '@/features/articles/contracts';
import { getArticleCategory } from '../utils/article.utils';

type Options = {
    isDemoMode: boolean;
    setArticles: React.Dispatch<React.SetStateAction<BasicArticle[]>>;
};

export function useNewsInteractions({ isDemoMode, setArticles }: Options) {
    const [openMenuArticleId, setOpenMenuArticleId] = useState<number | null>(null);
    const [savedArticleIds, setSavedArticleIds] = useState<number[]>([]);
    const [hiddenArticleIds, setHiddenArticleIds] = useState<number[]>([]);
    const [reactionByArticleId, setReactionByArticleId] = useState<Record<number, string>>({});
    const [commentArticleId, setCommentArticleId] = useState<number | null>(null);
    const [commentDraftByArticleId, setCommentDraftByArticleId] = useState<Record<number, string>>({});
    const [commentingArticleId, setCommentingArticleId] = useState<number | null>(null);
    const [deletingArticleId, setDeletingArticleId] = useState<number | null>(null);
    const [openReactionArticleId, setOpenReactionArticleId] = useState<number | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const noticeTimerRef = useRef<number | null>(null);
    const reactionCloseTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!openMenuArticleId) return;
        const closeMenu = (event: PointerEvent) => {
            if (!(event.target instanceof Element) || !event.target.closest('[data-news-actions]')) setOpenMenuArticleId(null);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpenMenuArticleId(null);
        };
        document.addEventListener('pointerdown', closeMenu);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeMenu);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [openMenuArticleId]);

    useEffect(() => () => {
        if (reactionCloseTimerRef.current) window.clearTimeout(reactionCloseTimerRef.current);
        if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    }, []);

    const openReactionPicker = (articleId: number) => {
        /*
            Hover reaction UX:
            - Mở bằng hover/focus, không mở bằng click.
            - Clear timeout cũ để khi rê chuột từ nút lên list, picker không bị đóng giữa chừng.
        */
        if (reactionCloseTimerRef.current) window.clearTimeout(reactionCloseTimerRef.current);
        setOpenReactionArticleId(articleId);
    };

    const scheduleCloseReactionPicker = () => {
        /*
            Delay đóng tạo cảm giác mượt và tha thứ cho đường rê chuột.
            Nếu user lỡ đi qua khoảng nhỏ giữa nút và list, popover vẫn còn sống thêm 260ms.
        */
        if (reactionCloseTimerRef.current) window.clearTimeout(reactionCloseTimerRef.current);
        reactionCloseTimerRef.current = window.setTimeout(() => setOpenReactionArticleId(null), 260);
    };

    const clearArticleReaction = (articleId: number) => {
        /*
            Click nút chính không dùng để mở list nữa.
            Nó chỉ reset reaction của bài về trạng thái Like mặc định/inactive đúng theo yêu cầu.
        */
        setReactionByArticleId((current) => {
            const next = { ...current };
            delete next[articleId];
            return next;
        });
    };

    const showNotice = (message: string) => {
        setNotice(message);
        if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2600);
    };

    const toggleSaveArticle = (articleId: number) => {
        setSavedArticleIds((current) => current.includes(articleId) ? current.filter((id) => id !== articleId) : [...current, articleId]);
        setOpenMenuArticleId(null);
        showNotice(savedArticleIds.includes(articleId) ? 'Đã bỏ lưu bài viết.' : 'Đã lưu bài viết vào danh sách.');
    };

    const hideSimilarArticle = (article: BasicArticle) => {
        setHiddenArticleIds((current) => [...current, article.id]);
        setOpenMenuArticleId(null);
        showNotice(`Đã ẩn bớt bài tương tự "${getArticleCategory(article)}".`);
    };

    const deleteArticle = async (article: BasicArticle) => {
        setOpenMenuArticleId(null);
        if (!article.isPermissionEdit || !window.confirm('Bạn có chắc muốn xóa bài viết này?')) return;
        setDeletingArticleId(article.id);
        try {
            if (!isDemoMode) await articlesApi.remove(article.id);
            setArticles((current) => current.filter((item) => item.id !== article.id));
            showNotice('Đã xóa bài viết.');
        } catch (err) {
            console.error('Failed to delete article:', err);
            showNotice('Không thể xóa bài viết. Vui lòng thử lại.');
        } finally {
            setDeletingArticleId(null);
        }
    };

    const submitComment = async (event: React.FormEvent<HTMLFormElement>, article: BasicArticle) => {
        event.preventDefault();
        const draft = (commentDraftByArticleId[article.id] || '').trim();
        if (!draft || commentingArticleId) return;
        setCommentingArticleId(article.id);
        try {
            if (!isDemoMode) {
                await articlesApi.comment(article.id, {
                    body: draft,
                    status: 1,
                    depth: 0,
                    attachments: [],
                });
            }
            setCommentDraftByArticleId((current) => ({ ...current, [article.id]: '' }));
            showNotice('Đã gửi bình luận.');
        } catch (err) {
            console.error('Failed to comment article:', err);
            showNotice('Không thể gửi bình luận. Vui lòng thử lại.');
        } finally {
            setCommentingArticleId(null);
        }
    };

    return { openMenuArticleId, savedArticleIds, hiddenArticleIds, reactionByArticleId, commentArticleId, commentDraftByArticleId, commentingArticleId, deletingArticleId, openReactionArticleId, notice, setOpenMenuArticleId, setReactionByArticleId, setOpenReactionArticleId, setCommentArticleId, setCommentDraftByArticleId, openReactionPicker, scheduleCloseReactionPicker, clearArticleReaction, toggleSaveArticle, hideSimilarArticle, deleteArticle, submitComment };
}
