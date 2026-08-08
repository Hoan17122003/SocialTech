import { slashCommands } from '../constants';
import type { SlashCommand, SlashCommandId, SlashCommandMatch } from '../types';

export function getSlashCommandMatch(content: string, caretPosition: number): SlashCommandMatch | null {
    const lineStart = content.lastIndexOf('\n', Math.max(0, caretPosition - 1)) + 1;
    const textBeforeCaret = content.slice(lineStart, caretPosition);
    const match = textBeforeCaret.match(/(?:^|\s)\/([a-z0-9-]*)$/i);
    if (!match) return null;

    const slashOffset = match.index ?? 0;
    return {
        from: lineStart + (match[0].startsWith('/') ? slashOffset : slashOffset + 1),
        to: caretPosition,
        query: match[1]?.toLowerCase() ?? '',
    };
}

export function getMatchingSlashCommands(query: string): SlashCommand[] {
    if (!query) return slashCommands;

    return slashCommands.filter((command) =>
        [command.label, command.description, ...command.searchTerms]
            .map((value) => value.toLowerCase())
            .some((value) => value.includes(query)),
    );
}

export function getTextareaCaretPosition(textarea: HTMLTextAreaElement, caretPosition: number) {
    const mirror = document.createElement('div');
    const mirrorStyle = window.getComputedStyle(textarea);
    const propertiesToCopy = ['boxSizing', 'width', 'height', 'overflowX', 'overflowY', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize'] as const;

    Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', wordWrap: 'break-word', top: '0', left: '-9999px' });
    for (const property of propertiesToCopy) mirror.style[property] = mirrorStyle[property];

    mirror.textContent = textarea.value.slice(0, caretPosition);
    const marker = document.createElement('span');
    marker.textContent = textarea.value.slice(caretPosition) || '.';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const lineHeight = Number.parseFloat(mirrorStyle.lineHeight) || Number.parseFloat(mirrorStyle.fontSize) * 1.4 || 20;
    const position = { left: marker.offsetLeft - textarea.scrollLeft, top: marker.offsetTop - textarea.scrollTop, height: lineHeight };
    document.body.removeChild(mirror);
    return position;
}

export function buildSlashCommandSnippet(commandId: Exclude<SlashCommandId, 'image'>) {
    const snippets = {
        h1: { text: '# ', caretOffset: 2 }, h2: { text: '## ', caretOffset: 3 }, h3: { text: '### ', caretOffset: 4 },
        bullet: { text: '- ', caretOffset: 2 }, checklist: { text: '- [ ] ', caretOffset: 6 }, quote: { text: '> ', caretOffset: 2 },
        code: { text: '```ts\n\n```', caretOffset: 6 }, table: { text: '| Cot 1 | Cot 2 |\n| --- | --- |\n| Gia tri 1 | Gia tri 2 |', caretOffset: 2 },
    } satisfies Record<Exclude<SlashCommandId, 'image'>, { text: string; caretOffset: number }>;
    return snippets[commandId];
}
