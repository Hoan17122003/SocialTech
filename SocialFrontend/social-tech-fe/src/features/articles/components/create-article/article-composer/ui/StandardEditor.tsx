import { Textarea } from '@/shared/ui/field';

type Props = { value: string; onChange: (value: string) => void };

export function StandardEditor({ value, onChange }: Props) {
    return <Textarea placeholder="Hãy bắt đầu biên soạn câu chuyện của bạn..." value={value} onChange={(event) => onChange(event.target.value)} className="min-h-[400px] flex-grow resize-y rounded-2xl" required />;
}
