import type { ArticleFormState, SlashCommand } from './types';

export const initialState: ArticleFormState = {
    title: '',
    content: '',
    comunityId: '',
    articleStatus: 'Published',
    attachments: [],
};

export const starterMarkdown = `# Tieu de chinh

Mo ta ngan cho bai viet tech cua ban.

## Y chinh

- Diem 1
- Diem 2
- Diem 3

\`\`\`ts
export function example() {
    return 'Social Tech';
}
\`\`\`
`;

export const slashCommands: SlashCommand[] = [
    { id: 'h1', label: 'Heading 1', description: 'Chen tieu de cap 1', searchTerms: ['heading', 'title', 'h1'] },
    { id: 'h2', label: 'Heading 2', description: 'Chen tieu de cap 2', searchTerms: ['heading', 'title', 'h2'] },
    { id: 'h3', label: 'Heading 3', description: 'Chen tieu de cap 3', searchTerms: ['heading', 'title', 'h3'] },
    { id: 'bullet', label: 'Bullet List', description: 'Chen dau dong danh sach', searchTerms: ['list', 'bullet', 'ul'] },
    { id: 'checklist', label: 'Checklist', description: 'Chen task list markdown', searchTerms: ['todo', 'task', 'checklist'] },
    { id: 'quote', label: 'Quote', description: 'Chen blockquote', searchTerms: ['quote', 'blockquote'] },
    { id: 'code', label: 'Code Block', description: 'Chen code block co san', searchTerms: ['code', 'snippet', 'ts'] },
    { id: 'table', label: 'Table', description: 'Chen markdown table', searchTerms: ['table', 'grid'] },
    { id: 'image', label: 'Image Upload', description: 'Mo hop chon anh chen vao noi dung', searchTerms: ['image', 'photo', 'upload', 'anh'] },
];
