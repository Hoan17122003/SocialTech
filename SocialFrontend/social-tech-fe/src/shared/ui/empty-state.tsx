import { Card } from '@/shared/ui/card';

export function EmptyState({ title, description }: { title: string; description: string }) {
    return (
        <Card className="text-center">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{description}</p>
        </Card>
    );
}
