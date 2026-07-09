'use client';

import { useRef } from 'react';
import { FeatureHandControls } from '@/features/hand-gesture/components/feature-hand-controls';
import { useFeatureHandGallery } from '@/features/hand-gesture/hooks/use-feature-hand-gallery';

export function FeatureHandExperience() {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const gallery = useFeatureHandGallery({ mountRef, videoRef });

    // tạm thời tắt bảo mật cho api này
    // Auth/role guard was intentionally disabled for this test screen; re-enable it in the hook/page boundary when needed.

    return (
        <section className="relative left-1/2 min-h-[calc(100vh-3rem)] w-screen -translate-x-1/2 overflow-hidden bg-[linear-gradient(180deg,#05070d_0%,#09111e_52%,#06080f_100%)] text-white">
            {/* Three.js owns this node after mount; React should only provide the host element. */}
            <div ref={mountRef} className="absolute inset-0" />

            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(5,7,13,0.88),rgba(5,7,13,0))]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(0deg,rgba(5,7,13,0.92),rgba(5,7,13,0))]" />

            <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/75 backdrop-blur md:left-8 md:top-8">
                Feature Hand
            </div>

            <video
                ref={videoRef}
                playsInline
                muted
                className="absolute bottom-28 right-4 h-28 w-20 scale-x-[-1] rounded-[1.5rem] border border-white/15 object-cover opacity-85 shadow-2xl shadow-black/45 backdrop-blur sm:bottom-24 sm:right-6 sm:h-32 sm:w-24"
            />

            <FeatureHandControls
                cameraError={gallery.cameraError}
                experienceReady={gallery.experienceReady}
                galleryError={gallery.galleryError}
                isUploading={gallery.isUploading}
                layout={gallery.layout}
                mediaCount={gallery.mediaCount}
                onLayoutChange={gallery.selectLayout}
                onUpload={gallery.handleUpload}
                trackingState={gallery.trackingState}
                uploadStatus={gallery.uploadStatus}
            />
        </section>
    );
}
