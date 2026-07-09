'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { httpClient } from '@/shared/api/http-client';
import { toQueryString } from '@/common/utils/query-string';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { cn } from '@/common/utils/cn';

export type SearchItem = {
    id: string | number;
    label: string;
    href?: string;
    description?: string;
};

type SearchProps = {
    className?: string;
    placeholder?: string;
    minLength?: number;
    debounceMs?: number;
    auth?: boolean;
    searchFn?: (query: string) => Promise<SearchItem[]>;
    endpoint?: string;
    onResults?: (items: SearchItem[]) => void;
};

async function defaultSearch(endpoint: string, query: string, auth?: boolean) {
    const qs = toQueryString({ q: query });
    return httpClient.get<SearchItem[]>(`${endpoint}${qs}`, {
        ...(typeof auth === 'boolean' ? { auth } : {}),
        showGlobalLoading: false,
    });
}

export function Search({
    className,
    placeholder = 'Search…',
    minLength = 2,
    debounceMs = 300,
    auth,
    searchFn,
    endpoint,
    onResults,
}: SearchProps) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedValue(query, debounceMs);
    const [items, setItems] = useState<SearchItem[]>([]);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const requestIdRef = useRef(0);

    const canSearch = useMemo(() => debouncedQuery.trim().length >= minLength, [debouncedQuery, minLength]);

    useEffect(() => {
        const q = debouncedQuery.trim();
        const currentRequestId = ++requestIdRef.current;

        if (!canSearch) return;
        if (!searchFn && !endpoint) return;

        let active = true;

        (async () => {
            setIsPending(true);
            setError(null);
            try {
                const result = searchFn ? await searchFn(q) : await defaultSearch(endpoint as string, q, auth);
                if (!active || currentRequestId !== requestIdRef.current) return;
                setItems(Array.isArray(result) ? result : []);
                onResults?.(Array.isArray(result) ? result : []);
            } catch {
                if (!active || currentRequestId !== requestIdRef.current) return;
                setError('Search failed.');
                setItems([]);
            } finally {
                if (!active || currentRequestId !== requestIdRef.current) return;
                setIsPending(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [auth, canSearch, debouncedQuery, endpoint, onResults, searchFn]);

    return (
        <div className={cn('relative w-full max-w-sm', className)}>
            <div className="relative">
                <input
                    value={query}
                    onChange={(e) => {
                        const nextValue = e.target.value;
                        setQuery(nextValue);
                        if (nextValue.trim().length < minLength) {
                            setItems([]);
                            setError(null);
                            setIsPending(false);
                        }
                    }}
                    type="search"
                    placeholder={placeholder}
                    className="w-full rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm text-[var(--foreground)] outline-none ring-0 placeholder:text-[var(--muted)] focus:border-[rgba(204,95,61,0.35)]"
                    aria-label="Search"
                />
                {isPending ? (
                    <div className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[rgba(24,35,47,0.2)] border-t-[var(--accent)]" />
                ) : null}
            </div>

            {canSearch && (error || items.length > 0) ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow)]">
                    {error ? (
                        <div className="px-4 py-3 text-sm text-[var(--muted)]">{error}</div>
                    ) : (
                        <ul className="max-h-80 overflow-auto py-2">
                            {items.map((item) => {
                                const content = (
                                    <div className="space-y-0.5 px-4 py-2">
                                        <div className="text-sm font-semibold text-[var(--foreground)]">
                                            {item.label}
                                        </div>
                                        {item.description ? (
                                            <div className="text-xs text-[var(--muted)]">{item.description}</div>
                                        ) : null}
                                    </div>
                                );

                                return (
                                    <li key={String(item.id)} className="hover:bg-[rgba(24,35,47,0.04)]">
                                        {item.href ? (
                                            <Link href={item.href} className="block">
                                                {content}
                                            </Link>
                                        ) : (
                                            content
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}
