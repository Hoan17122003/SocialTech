'use client';

import type { ChangeEvent } from 'react';
import { LAYOUT_OPTIONS } from '@/features/hand-gesture/feature-hand.constants';
import type { LayoutMode } from '@/features/hand-gesture/feature-hand.types';

type FeatureHandControlsProps = {
    cameraError: string | null;
    experienceReady: boolean;
    galleryError: string | null;
    isUploading: boolean;
    layout: LayoutMode;
    mediaCount: number;
    onLayoutChange: (layout: LayoutMode) => void;
    onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
    trackingState: string;
    uploadStatus: string | null;
};

export function FeatureHandControls({
    cameraError,
    experienceReady,
    galleryError,
    isUploading,
    layout,
    mediaCount,
    onLayoutChange,
    onUpload,
    trackingState,
    uploadStatus,
}: FeatureHandControlsProps) {
    return (
        <div className="absolute inset-x-3 bottom-4 z-10 flex flex-col items-center gap-3 sm:inset-x-6">
            <div className="flex max-w-5xl flex-wrap items-center justify-center gap-2 text-xs text-white/86">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md">
                    Mo tay: vong tron
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md">
                    Hai ngon: trai tim
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md">
                    Nam tay: xep lop
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md">
                    Pinch: phong anh
                </span>
            </div>

            <div className="flex max-w-6xl flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
                <span
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/82"
                    aria-live="polite"
                >
                    {experienceReady ? 'Camera ready' : 'Dang mo camera'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/82">
                    {mediaCount > 0 ? `${mediaCount} anh API` : 'Gallery mau'}
                </span>

                <div className="flex flex-wrap items-center justify-center gap-1">
                    {LAYOUT_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onLayoutChange(option.value)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition hover:scale-105 active:scale-95 ${
                                layout === option.value
                                    ? 'border-white/45 bg-white text-slate-950'
                                    : 'border-white/10 bg-white/10 text-white/82 hover:bg-white/16'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <label
                    className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition hover:scale-105 active:scale-95 ${
                        isUploading
                            ? 'border-white/10 bg-white/10 text-white/45'
                            : 'border-cyan-200/30 bg-cyan-300/15 text-cyan-50 hover:bg-cyan-300/20'
                    }`}
                >
                    {isUploading ? 'Dang upload' : 'Upload anh'}
                    <input
                        type="file"
                        accept="image/*,video/*"
                        className="sr-only"
                        disabled={isUploading}
                        onChange={onUpload}
                    />
                </label>
            </div>

            <div className="max-w-4xl text-center text-xs leading-5 text-white/72" aria-live="polite">
                {uploadStatus ?? trackingState}
                {galleryError ? <span className="ml-2 text-amber-200">{galleryError}</span> : null}
                {cameraError ? <span className="ml-2 text-rose-200">{cameraError}</span> : null}
            </div>
        </div>
    );
}
