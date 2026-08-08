'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { cn } from '@/common/utils/cn';
import { toRenderableImageSrc } from '@/common/utils/image-source';

type AvatarImageProps = {
    src?: string | null;
    alt: string;
    fallback: ReactNode;
    sizes?: string;
    loading?: 'eager' | 'lazy';
    className?: string;
    imageClassName?: string;
    fallbackClassName?: string;
};

export function AvatarImage({
    src,
    alt,
    fallback,
    sizes = '48px',
    loading = 'lazy',
    className,
    imageClassName,
    fallbackClassName,
}: AvatarImageProps) {
    const normalizedSrc = toRenderableImageSrc(src);

    return (
        <div className={cn('relative flex h-full w-full items-center justify-center overflow-hidden', className)}>
            {normalizedSrc ? (
                <Image
                    src={normalizedSrc}
                    alt={alt}
                    fill
                    sizes={sizes}
                    loading={loading}
                    unoptimized
                    className={cn('object-cover', imageClassName)}
                />
            ) : (
                // Avatar fallback is centralized so every feature handles missing images the same way.
                <div className={cn('flex h-full w-full items-center justify-center', fallbackClassName)}>
                    {fallback}
                </div>
            )}
        </div>
    );
}
