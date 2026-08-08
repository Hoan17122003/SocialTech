import dynamic from 'next/dynamic';
import { useRef } from 'react';
import type { AttachmentPreview } from '../types';
import { buildAttachmentId } from '../utils/attachment.utils';
import { useSlashCommand } from '../hooks/useSlashCommand';

const MarkdownEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false, loading: () => <div className="px-4 py-6 text-sm text-[var(--muted)]">Đang tải Markdown editor...</div> });

type Props = { content: string; onChange: (content: string) => void; appendAttachments: (files: File[]) => void; attachments: AttachmentPreview[] };

export function WriteMode({ content, onChange, appendAttachments }: Props) {
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const { editorTextareaRef, editorSurfaceRef, slashMenu, setSlashMenu, syncSlashMenu, closeSlashMenu, applySlashCommand } = useSlashCommand({ articleMode: 'tech', markdownTab: 'write', content, updateContent: onChange, onRequestImageUpload: () => imageInputRef.current?.click() });

    function handleImageUpload(files: File[]) {
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));
        if (!imageFiles.length) return;
        appendAttachments(imageFiles);
        const markdownImages = imageFiles.map((file) => `![${file.name}](upload://${buildAttachmentId(file)})`).join('\n\n');
        onChange(content.trim() ? `${content.replace(/\s+$/, '')}\n\n${markdownImages}` : markdownImages);
        closeSlashMenu();
    }

    function syncFromEditorEvent(event: { target: EventTarget | null }, contentOverride?: string) {
        if (!(event.target instanceof HTMLTextAreaElement)) return;
        editorTextareaRef.current = event.target;
        syncSlashMenu(event.target, contentOverride);
    }

    return <div ref={editorSurfaceRef} className="relative">
        <MarkdownEditor value={content} preview="edit" visibleDragbar={false} height={400} 
        textareaProps={{ placeholder: 'Gõ nội dung markdown, sử dụng phím / để kích hoạt danh sách lệnh nhanh...', 
            onFocus: syncFromEditorEvent, 
            onClick: syncFromEditorEvent, 
            onSelect: syncFromEditorEvent, 
            onKeyUp: syncFromEditorEvent, 
            onScroll: syncFromEditorEvent, 
            onBlur: () => window.setTimeout(closeSlashMenu, 120), 
            onChange: (event) => syncFromEditorEvent(event, event.target instanceof HTMLTextAreaElement ? event.target.value : undefined), 
            onKeyDownCapture: (event) => 
            {
            if (!slashMenu) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setSlashMenu((previous) => previous ? { ...previous, selectedIndex: (previous.selectedIndex + (event.key === 'ArrowDown' ? 1 : -1) + previous.items.length) % previous.items.length } : previous); return; }
            if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); applySlashCommand(slashMenu.items[slashMenu.selectedIndex].id); return; }
            if (event.key === 'Escape') { event.preventDefault(); closeSlashMenu(); }
        } }} onChange={(value) => onChange(value ?? '')} />
        {slashMenu ? <div className="absolute z-20 w-72 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow)]" style={{ left: slashMenu.position.left, top: slashMenu.position.top }}>
            <div className="border-b border-[var(--line)] bg-[var(--background-soft)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Lệnh nhanh (Slash command)</div>
            <div className="max-h-72 overflow-y-auto p-1.5">{slashMenu.items.map((command, index) => <button key={command.id} type="button" className={`flex w-full flex-col rounded-xl px-3 py-2 text-left ${index === slashMenu.selectedIndex ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--background-soft)]'}`} onMouseDown={(event) => { event.preventDefault(); applySlashCommand(command.id); }}><span className="text-sm font-bold text-[var(--foreground)]">/{command.id}</span><span className="text-xs text-[var(--muted)]">{command.description}</span></button>)}</div>
        </div> : null}
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { handleImageUpload(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
    </div>;
}
