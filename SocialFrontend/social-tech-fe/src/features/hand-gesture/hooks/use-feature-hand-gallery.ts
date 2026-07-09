'use client';

import type { ChangeEvent, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import {
    FALLBACK_GALLERY_SIZE,
    FALLBACK_MEDIA_ASSETS,
    HAND_LANDMARKER_MODEL_URL,
    MEDIA_PIPE_VISION_URL,
} from '@/features/hand-gesture/feature-hand.constants';
import type { LayoutMode } from '@/features/hand-gesture/feature-hand.types';
import { handGestureApi } from '@/features/hand-gesture/hand-gesture-api';
import { createInitialGestureState, detectGestureState } from '@/features/hand-gesture/lib/gesture-recognition';
import {
    createFallbackCard,
    createGalleryRenderer,
    createGalleryScene,
    createMediaCard,
    renderGalleryFrame,
    resizeGalleryRenderer,
    type GalleryCard,
} from '@/features/hand-gesture/lib/three-gallery';

type UseFeatureHandGalleryOptions = {
    mountRef: RefObject<HTMLDivElement | null>;
    videoRef: RefObject<HTMLVideoElement | null>;
};

export function useFeatureHandGallery({ mountRef, videoRef }: UseFeatureHandGalleryOptions) {
    // Keep the latest requested layout outside React state so the render loop can read it without re-subscribing.
    const requestedLayoutRef = useRef<LayoutMode>('circle');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [galleryError, setGalleryError] = useState<string | null>(null);
    const [experienceReady, setExperienceReady] = useState(false);
    const [layout, setLayout] = useState<LayoutMode>('circle');
    const [mediaVersion, setMediaVersion] = useState(0);
    const [mediaCount, setMediaCount] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [trackingState, setTrackingState] = useState('Dang cho camera va mo hinh ban tay...');

    const selectLayout = useCallback((nextLayout: LayoutMode) => {
        requestedLayoutRef.current = nextLayout;
        setLayout(nextLayout);
        setTrackingState(`Dang chuyen sang bo cuc ${nextLayout}.`);
    }, []);

    const handleUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        setIsUploading(true);
        setUploadStatus('Dang upload media...');

        try {
            await handGestureApi.uploadLoverMedia(file);
            setUploadStatus('Upload xong. Dang nap lai gallery...');
            setMediaVersion((version) => version + 1);
        } catch (error) {
            console.error(error);
            setUploadStatus('Upload that bai. Kiem tra API /api/lover/features-hand.');
        } finally {
            setIsUploading(false);
        }
    }, []);

    useEffect(() => {
        const mountElement = mountRef.current;
        const videoElement = videoRef.current;

        if (!mountElement || !videoElement) {
            return;
        }

        const activeMountElement: HTMLDivElement = mountElement;
        const activeVideoElement: HTMLVideoElement = videoElement;
        let cancelled = false;
        let frameId = 0;
        let gallerySize = FALLBACK_GALLERY_SIZE;
        let handLandmarker: HandLandmarker | null = null;
        let lastVideoTime = -1;
        let stream: MediaStream | null = null;
        const cards: GalleryCard[] = [];
        const { camera, galleryRoot, scene } = createGalleryScene();
        const renderer = createGalleryRenderer(activeMountElement);
        const targetState = createInitialGestureState(requestedLayoutRef.current, FALLBACK_GALLERY_SIZE);

        setCameraError(null);
        setExperienceReady(false);

        const updateSize = () => resizeGalleryRenderer(activeMountElement, renderer, camera);

        const animate = (time: number) => {
            if (cancelled) {
                return;
            }

            targetState.layout = requestedLayoutRef.current;

            if (
                handLandmarker &&
                activeVideoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
                activeVideoElement.currentTime !== lastVideoTime
            ) {
                lastVideoTime = activeVideoElement.currentTime;
                const result = handLandmarker.detectForVideo(activeVideoElement, performance.now());
                const firstHand = result.landmarks[0];

                if (firstHand) {
                    const nextState = detectGestureState(firstHand, targetState.layout, gallerySize);
                    Object.assign(targetState, nextState);
                    requestedLayoutRef.current = nextState.layout;
                    setLayout(nextState.layout);
                    setTrackingState(
                        nextState.pinchActive
                            ? 'Pinch de zoom vao tam diem anh dang focus.'
                            : nextState.layout === 'heart'
                              ? 'Dang xep bo cuc trai tim.'
                              : nextState.layout === 'stack'
                                ? 'Dang xep theo lop xep chong.'
                                : 'Dang xoay gallery theo ban tay.',
                    );
                } else {
                    targetState.handDetected = false;
                    targetState.pinchActive = false;
                    setTrackingState('Khong thay ban tay. Dua ban tay vao khung camera de tiep tuc.');
                }
            }

            renderGalleryFrame({
                camera,
                cards,
                galleryRoot,
                renderer,
                scene,
                state: targetState,
                time,
            });
            frameId = window.requestAnimationFrame(animate);
        };

        async function loadGalleryCards() {
            // API data wins; local assets are only a stable test path for offline backend/dev camera checks.
            const mediaAssets = await handGestureApi.listLoverMedia().catch((error) => {
                console.error(error);
                setGalleryError('Khong goi duoc GET /api/lover/features-hand, dang dung anh test local.');
                return [];
            });
            const normalizedMedia = mediaAssets.length ? mediaAssets : FALLBACK_MEDIA_ASSETS;

            gallerySize = normalizedMedia.length;
            targetState.focusIndex = Math.floor(gallerySize / 2);
            setMediaCount(mediaAssets.length);

            if (!mediaAssets.length) {
                setGalleryError(
                    (currentError) =>
                        currentError ??
                        'API /api/lover/features-hand chua tra ve media hop le, dang dung anh test local.',
                );
            } else {
                setGalleryError(null);
            }

            for (let index = 0; index < normalizedMedia.length; index += 1) {
                if (cancelled) {
                    return mediaAssets;
                }

                const asset = normalizedMedia[index];

                try {
                    cards.push(
                        asset.url
                            ? await createMediaCard(galleryRoot, asset, index)
                            : createFallbackCard(galleryRoot, index),
                    );
                } catch (error) {
                    console.error(error);
                    cards.push(createFallbackCard(galleryRoot, index));
                }
            }

            return mediaAssets;
        }

        async function startHandTracking() {
            try {
                // Camera/MediaPipe is optional: failing here should never prevent the gallery from rendering.
                const [vision, nextStream] = await Promise.all([
                    FilesetResolver.forVisionTasks(MEDIA_PIPE_VISION_URL),
                    navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: {
                            facingMode: 'user',
                            height: { ideal: 720 },
                            width: { ideal: 1280 },
                        },
                    }),
                ]);

                if (cancelled) {
                    nextStream.getTracks().forEach((track) => track.stop());
                    return false;
                }

                stream = nextStream;
                handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: HAND_LANDMARKER_MODEL_URL,
                    },
                    numHands: 1,
                    runningMode: 'VIDEO',
                });

                activeVideoElement.srcObject = stream;
                await activeVideoElement.play();
                setCameraError(null);
                return true;
            } catch (error) {
                console.error(error);
                setCameraError('Khong the khoi tao camera hoac MediaPipe Hands. Gallery van hien anh test local.');
                return false;
            }
        }

        async function setup() {
            try {
                updateSize();

                // The gallery is useful even without camera, so media loads before optional hand tracking.
                const mediaAssets = await loadGalleryCards();
                const cameraReady = await startHandTracking();

                if (cancelled) {
                    return;
                }

                setExperienceReady(true);
                setTrackingState(
                    mediaAssets.length
                        ? `${cameraReady ? 'Camera san sang.' : 'Camera chua san sang.'} Da nap ${mediaAssets.length} media tu features-hand.`
                        : `${cameraReady ? 'Camera san sang.' : 'Camera chua san sang.'} Dang dung anh test local vi chua co media hop le tu features-hand.`,
                );
                setUploadStatus(null);
                frameId = window.requestAnimationFrame(animate);
                window.addEventListener('resize', updateSize);
            } catch (error) {
                console.error(error);
                setGalleryError('Khong the khoi tao gallery hien thi anh.');
            }
        }

        setup();

        return () => {
            cancelled = true;
            window.removeEventListener('resize', updateSize);
            window.cancelAnimationFrame(frameId);
            stream?.getTracks().forEach((track) => track.stop());
            handLandmarker?.close();
            cards.forEach((card) => card.dispose());
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, [mediaVersion, mountRef, videoRef]);

    return {
        cameraError,
        experienceReady,
        galleryError,
        handleUpload,
        isUploading,
        layout,
        mediaCount,
        selectLayout,
        trackingState,
        uploadStatus,
    };
}
