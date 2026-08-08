import { useRef, useState } from 'react';
import type { ArticleMode, MarkdownTab, SlashMenuState } from '../types';
import { buildSlashCommandSnippet, getMatchingSlashCommands, getSlashCommandMatch, getTextareaCaretPosition } from '../utils/slash-command.utils';

type UseSlashCommandOptions = {
    articleMode: ArticleMode;
    markdownTab: MarkdownTab;
    content: string;
    updateContent: (content: string) => void;
    onRequestImageUpload: () => void;
};

export function useSlashCommand({ articleMode, markdownTab, content, updateContent, onRequestImageUpload }: UseSlashCommandOptions) {
    const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const editorSurfaceRef = useRef<HTMLDivElement | null>(null);
    const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);

    function closeSlashMenu() { setSlashMenu(null); }

    function syncSlashMenu(textarea: HTMLTextAreaElement, contentOverride?: string) {
        if (articleMode !== 'tech' || markdownTab !== 'write' || textarea.selectionStart !== textarea.selectionEnd) {
            closeSlashMenu();
            return;
        }
        const match = getSlashCommandMatch(contentOverride ?? textarea.value, textarea.selectionStart);
        const surface = editorSurfaceRef.current;
        if (!match || !surface) { closeSlashMenu(); return; }
        const items = getMatchingSlashCommands(match.query);
        if (!items.length) { closeSlashMenu(); return; }

        const textareaRect = textarea.getBoundingClientRect();
        const surfaceRect = surface.getBoundingClientRect();
        const caret = getTextareaCaretPosition(textarea, textarea.selectionStart);
        setSlashMenu((previous) => ({
            query: match.query,
            selectedIndex: previous?.query === match.query ? Math.min(previous.selectedIndex, items.length - 1) : 0,
            position: {
                left: Math.min(Math.max(textareaRect.left - surfaceRect.left + caret.left, 16), Math.max(surface.clientWidth - 304, 16)),
                top: textareaRect.top - surfaceRect.top + caret.top + caret.height + 10,
            },
            match,
            items,
        }));
    }

    function applySlashCommand(commandId: SlashMenuState['items'][number]['id']) {
        const textarea = editorTextareaRef.current;
        if (!textarea || !slashMenu) return;
        if (commandId === 'image') {
            closeSlashMenu();
            onRequestImageUpload();
            return;
        }
        const snippet = buildSlashCommandSnippet(commandId);
        const nextContent = `${content.slice(0, slashMenu.match.from)}${snippet.text}${content.slice(slashMenu.match.to)}`;
        const nextCaretPosition = slashMenu.match.from + snippet.caretOffset;
        updateContent(nextContent);
        closeSlashMenu();
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
            syncSlashMenu(textarea, nextContent);
        });
    }

    return { editorTextareaRef, editorSurfaceRef, slashMenu, setSlashMenu, syncSlashMenu, closeSlashMenu, applySlashCommand };
}
