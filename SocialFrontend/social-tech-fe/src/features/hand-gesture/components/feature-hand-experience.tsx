'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { APP_ROUTES } from '@/common/constants/app-routes';
import { handGestureApi } from '@/features/hand-gesture/hand-gesture-api';
import type { LoverMediaItem } from '@/features/hand-gesture/contracts';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/shared/ui/button';

type LayoutMode = 'circle' | 'heart' | 'stack';

type GestureState = {
    focusIndex: number | null;
    galleryScale: number;
    handDetected: boolean;
    layout: LayoutMode;
    pinchActive: boolean;
    rotationY: number;
    tiltX: number;
};

type GalleryCard = {
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    baseScale: THREE.Vector3;
    dispose: () => void;
};

const REQUIRED_ROLE_Lover = 'Role_Lover';
const FALLBACK_GALLERY_SIZE = 7;
const MEDIA_PIPE_VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const HAND_LANDMARKER_MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(start: number, end: number, alpha: number) {
    return start + (end - start) * alpha;
}

function createFallbackGalleryTexture(index: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const context = canvas.getContext('2d');

    if (!context) {
        return new THREE.CanvasTexture(canvas);
    }

    const palettes = [
        ['#f97316', '#fb7185'],
        ['#3b82f6', '#22d3ee'],
        ['#22c55e', '#84cc16'],
        ['#8b5cf6', '#ec4899'],
        ['#f59e0b', '#ef4444'],
        ['#14b8a6', '#0ea5e9'],
        ['#a855f7', '#6366f1'],
    ];
    const [start, end] = palettes[index % palettes.length];

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'rgba(255, 255, 255, 0.15)';
    context.beginPath();
    context.arc(canvas.width * 0.75, canvas.height * 0.22, 150, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.font = '700 84px Arial';
    context.fillText(`LOVER ${index + 1}`, 72, 140);
    context.font = '600 40px Arial';
    context.fillText('Gesture Gallery', 72, 210);

    context.fillStyle = 'rgba(255, 255, 255, 0.88)';
    context.fillRect(72, 290, 756, 520);

    const imageGradient = context.createLinearGradient(72, 290, 828, 810);
    imageGradient.addColorStop(0, 'rgba(15, 23, 42, 0.12)');
    imageGradient.addColorStop(1, 'rgba(15, 23, 42, 0.38)');
    context.fillStyle = imageGradient;
    context.fillRect(72, 290, 756, 520);

    context.strokeStyle = 'rgba(255,255,255,0.55)';
    context.lineWidth = 8;
    context.strokeRect(100, 320, 700, 464);

    context.fillStyle = 'rgba(255,255,255,0.9)';
    context.font = '600 54px Arial';
    context.fillText('Move hand to orbit', 120, 920);
    context.font = '500 34px Arial';
    context.fillText('Open palm: circle', 120, 992);
    context.fillText('Peace sign: heart', 120, 1044);
    context.fillText('Fist: stack', 120, 1096);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function loadImageTexture(url: string) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    return new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
            url,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                resolve(texture);
            },
            undefined,
            reject,
        );
    });
}

function loadVideoTexture(url: string) {
    return new Promise<{ texture: THREE.VideoTexture; video: HTMLVideoElement }>((resolve, reject) => {
        const video = document.createElement('video');
        video.src = url;
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        const cleanup = () => {
            video.oncanplay = null;
            video.onerror = null;
        };

        video.oncanplay = async () => {
            cleanup();

            try {
                await video.play();
            } catch {
                // Muted inline videos may still be blocked on some devices; texture can still render first frame.
            }

            const texture = new THREE.VideoTexture(video);
            texture.colorSpace = THREE.SRGBColorSpace;
            resolve({ texture, video });
        };

        video.onerror = () => {
            cleanup();
            reject(new Error(`Unable to load video texture from ${url}`));
        };

        video.load();
    });
}

async function createMediaCard(scene: THREE.Group, asset: LoverMediaItem, index: number): Promise<GalleryCard> {
    let texture: THREE.Texture;
    let video: HTMLVideoElement | null = null;

    if (asset.type === 'video') {
        const loadedVideo = await loadVideoTexture(asset.url);
        texture = loadedVideo.texture;
        video = loadedVideo.video;
    } else {
        texture = await loadImageTexture(asset.url);
    }

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), material);
    mesh.userData = {
        title: asset.title,
        type: asset.type,
        index,
    };
    scene.add(mesh);

    return {
        mesh,
        baseScale: new THREE.Vector3(1, 1, 1),
        dispose: () => {
            mesh.geometry.dispose();
            material.map?.dispose();
            material.dispose();

            if (video) {
                video.pause();
                video.removeAttribute('src');
                video.load();
            }
        },
    };
}

function createFallbackCard(scene: THREE.Group, index: number): GalleryCard {
    const material = new THREE.MeshBasicMaterial({
        map: createFallbackGalleryTexture(index),
        transparent: true,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), material);
    scene.add(mesh);

    return {
        mesh,
        baseScale: new THREE.Vector3(1, 1, 1),
        dispose: () => {
            mesh.geometry.dispose();
            material.map?.dispose();
            material.dispose();
        },
    };
}

function buildLayoutPosition(layout: LayoutMode, index: number, count: number, time: number) {
    if (layout === 'stack') {
        const middle = (count - 1) / 2;
        return {
            position: new THREE.Vector3((index - middle) * 0.28, (middle - index) * 0.18, -index * 0.22),
            rotation: new THREE.Euler(0.12, (index - middle) * 0.06, (index - middle) * 0.08),
        };
    }

    if (layout === 'heart') {
        const angle = (index / count) * Math.PI * 2 + time * 0.12;
        const x = 16 * Math.sin(angle) ** 3;
        const y =
            13 * Math.cos(angle) -
            5 * Math.cos(2 * angle) -
            2 * Math.cos(3 * angle) -
            Math.cos(4 * angle);

        return {
            position: new THREE.Vector3(x * 0.18, y * 0.12 + 0.35, Math.cos(angle * 1.6) * 0.7),
            rotation: new THREE.Euler(-0.06, x * 0.02, -x * 0.015),
        };
    }

    const angle = (index / count) * Math.PI * 2 + time * 0.2;
    return {
        position: new THREE.Vector3(
            Math.cos(angle) * 3.4,
            Math.sin(angle) * 1.25,
            Math.sin(angle * 2) * 0.95,
        ),
        rotation: new THREE.Euler(Math.sin(angle) * 0.08, -angle + Math.PI / 2, Math.cos(angle) * 0.06),
    };
}

function normalizeFingerState(landmarks: Array<{ x: number; y: number }>) {
    const wrist = landmarks[0];
    const fingerPairs = [
        [8, 6],
        [12, 10],
        [16, 14],
        [20, 18],
    ] as const;
    const fingersExtended = fingerPairs.map(([tipIndex, pipIndex]) => {
        const tipDistance = distance(landmarks[tipIndex], wrist);
        const pipDistance = distance(landmarks[pipIndex], wrist);
        return tipDistance > pipDistance + 0.03;
    });

    const thumbExtended = distance(landmarks[4], wrist) > distance(landmarks[3], wrist) + 0.02;
    return {
        fingersExtended,
        extendedCount: fingersExtended.filter(Boolean).length + (thumbExtended ? 1 : 0),
    };
}

function detectGestureState(
    landmarks: Array<{ x: number; y: number }>,
    previousLayout: LayoutMode,
    gallerySize: number,
): GestureState {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const pinchDistance = distance(thumbTip, indexTip);
    const spread =
        (distance(wrist, indexTip) +
            distance(wrist, middleTip) +
            distance(wrist, ringTip) +
            distance(wrist, pinkyTip)) /
        4;
    const centerX = clamp(1 - (wrist.x + indexTip.x + pinkyTip.x) / 3, 0, 1);
    const centerY = clamp((wrist.y + middleTip.y) / 2, 0, 1);
    const { fingersExtended, extendedCount } = normalizeFingerState(landmarks);
    const isOpenPalm = extendedCount >= 4 && spread > 0.34;
    const isFist = extendedCount <= 1 && spread < 0.28;
    const isPeace = fingersExtended[0] && fingersExtended[1] && !fingersExtended[2] && !fingersExtended[3];
    const focusIndex = clamp(Math.round(centerX * Math.max(gallerySize - 1, 0)), 0, Math.max(gallerySize - 1, 0));

    let layout = previousLayout;

    if (isPeace) {
        layout = 'heart';
    } else if (isFist) {
        layout = 'stack';
    } else if (isOpenPalm) {
        layout = 'circle';
    }

    return {
        focusIndex,
        galleryScale: clamp(0.75 + spread * 1.65, 0.82, 1.7),
        handDetected: true,
        layout,
        pinchActive: pinchDistance < 0.055,
        rotationY: lerp(-0.95, 0.95, centerX),
        tiltX: lerp(0.38, -0.42, centerY),
    };
}

// Animation timing constants (lerp factors per frame)
// Lower values make the transitions slower and smoother (e.g. longer flight duration)
// Higher values make them faster and snappier
const CARD_POSITION_SPEED = 0.05; // Fly to position speed (default: 0.1)
const CARD_ROTATION_SPEED = 0.06; // Rotate speed (default: 0.12)
const CARD_SCALE_SPEED = 0.06;    // Zoom/scale speed (default: 0.12)
const CARD_OPACITY_SPEED = 0.06;  // Opacity fade speed (default: 0.12)

export function FeatureHandExperience() {
    const router = useRouter();
    const { hasRole, isAuthenticated, isHydrated } = useAuth();
    const isAuthorized = isAuthenticated && hasRole(REQUIRED_ROLE_Lover);
    const mountRef = useRef<HTMLDivElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [galleryError, setGalleryError] = useState<string | null>(null);
    const [experienceReady, setExperienceReady] = useState(false);
    const [layout, setLayout] = useState<LayoutMode>('circle');
    const [mediaCount, setMediaCount] = useState(0);
    const [trackingState, setTrackingState] = useState('Dang cho camera va mo hinh ban tay...');

    useEffect(() => {
        if (!isHydrated) {
            return;
        }

        if (!isAuthenticated) {
            router.replace(APP_ROUTES.login);
            return;
        }

        if (!hasRole(REQUIRED_ROLE_Lover)) {
            router.replace(APP_ROUTES.dashboard);
        }
    }, [hasRole, isAuthenticated, isHydrated, router]);

    useEffect(() => {
        if (!isAuthorized || !mountRef.current || !videoRef.current) {
            return;
        }

        let cancelled = false;
        let stream: MediaStream | null = null;
        let handLandmarker: HandLandmarker | null = null;
        let renderer: THREE.WebGLRenderer | null = null;
        let frameId = 0;
        let lastVideoTime = -1;
        let gallerySize = FALLBACK_GALLERY_SIZE;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#050816');

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0.15, 12.5);

        const galleryRoot = new THREE.Group();
        scene.add(galleryRoot);

        const ambientLight = new THREE.AmbientLight('#ffffff', 1.8);
        const rimLight = new THREE.PointLight('#f472b6', 42, 30);
        rimLight.position.set(3, 4, 8);
        scene.add(ambientLight, rimLight);

        const cards: GalleryCard[] = [];

        const targetState: GestureState = {
            focusIndex: Math.floor(FALLBACK_GALLERY_SIZE / 2),
            galleryScale: 1,
            handDetected: false,
            layout: 'circle',
            pinchActive: false,
            rotationY: 0,
            tiltX: -0.1,
        };

        const updateSize = () => {
            if (!mountRef.current || !renderer) {
                return;
            }

            const { clientHeight, clientWidth } = mountRef.current;
            renderer.setSize(clientWidth, clientHeight, false);
            camera.aspect = clientWidth / clientHeight;
            camera.updateProjectionMatrix();
        };

        const animate = (time: number) => {
            if (cancelled || !renderer || !videoRef.current) {
                return;
            }

            const video = videoRef.current;

            if (handLandmarker && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
                lastVideoTime = video.currentTime;
                const result = handLandmarker.detectForVideo(video, performance.now());
                const firstHand = result.landmarks[0];

                if (firstHand) {
                    const nextState = detectGestureState(firstHand, targetState.layout, gallerySize);
                    Object.assign(targetState, nextState);
                    setTrackingState(
                        nextState.pinchActive
                            ? 'Pinch de zoom vao tam diem anh dang focus.'
                            : nextState.layout === 'heart'
                              ? 'Dang xep bo cuc trai tim.'
                              : nextState.layout === 'stack'
                                ? 'Dang xep theo lop xep chong.'
                                : 'Dang xoay gallery theo ban tay.',
                    );
                    setLayout(nextState.layout);
                } else {
                    targetState.handDetected = false;
                    targetState.pinchActive = false;
                    setTrackingState('Khong thay ban tay. Dua ban tay vao khung camera de tiep tuc.');
                }
            }

            galleryRoot.rotation.y = lerp(galleryRoot.rotation.y, targetState.rotationY, 0.07);
            galleryRoot.rotation.x = lerp(galleryRoot.rotation.x, targetState.tiltX, 0.07);
            galleryRoot.scale.setScalar(lerp(galleryRoot.scale.x, targetState.galleryScale, 0.08));

            cards.forEach((card, index) => {
                const { position, rotation } = buildLayoutPosition(targetState.layout, index, cards.length, time / 1000);
                const focusBoost = targetState.pinchActive && targetState.focusIndex === index ? 1.28 : 1;
                const softFade = targetState.pinchActive && targetState.focusIndex !== index ? 0.78 : 1;

                card.mesh.position.lerp(position, CARD_POSITION_SPEED);
                card.mesh.rotation.x = lerp(card.mesh.rotation.x, rotation.x, CARD_ROTATION_SPEED);
                card.mesh.rotation.y = lerp(card.mesh.rotation.y, rotation.y, CARD_ROTATION_SPEED);
                card.mesh.rotation.z = lerp(card.mesh.rotation.z, rotation.z, CARD_ROTATION_SPEED);
                card.mesh.scale.lerp(card.baseScale.clone().multiplyScalar(focusBoost), CARD_SCALE_SPEED);
                card.mesh.material.opacity = lerp(card.mesh.material.opacity, softFade, CARD_OPACITY_SPEED);
            });

            renderer.render(scene, camera);
            frameId = window.requestAnimationFrame(animate);
        };

        const setup = async () => {
            try {
                renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                mountRef.current?.appendChild(renderer.domElement);
                updateSize();

                const [mediaAssets, vision, nextStream] = await Promise.all([
                    handGestureApi.listLoverMedia().catch((error) => {
                        console.error(error);
                        setGalleryError('Khong goi duoc GET /api/lover, tam thoi dung gallery mau de giu trai nghiem.');
                        return [];
                    }),
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
                stream = nextStream;

                const normalizedMedia = mediaAssets.length
                    ? mediaAssets
                    : Array.from({ length: FALLBACK_GALLERY_SIZE }, (_, index) => ({
                          id: `fallback-${index}`,
                          title: `Fallback media ${index + 1}`,
                          type: 'image' as const,
                          url: '',
                          rawType: 'fallback',
                      }));

                gallerySize = normalizedMedia.length;
                targetState.focusIndex = Math.floor(gallerySize / 2);
                setMediaCount(mediaAssets.length);

                if (!mediaAssets.length) {
                    setGalleryError((currentError) => currentError ?? 'API /api/lover chua tra ve media hop le, tam thoi dung gallery mau de giu trai nghiem.');
                } else {
                    setGalleryError(null);
                }

                for (let index = 0; index < normalizedMedia.length; index += 1) {
                    const asset = normalizedMedia[index];

                    if (!asset.url) {
                        cards.push(createFallbackCard(galleryRoot, index));
                        continue;
                    }

                    try {
                        cards.push(await createMediaCard(galleryRoot, asset, index));
                    } catch (error) {
                        console.error(error);
                        cards.push(createFallbackCard(galleryRoot, index));
                    }
                }

                handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: HAND_LANDMARKER_MODEL_URL,
                    },
                    numHands: 1,
                    runningMode: 'VIDEO',
                });

                if (!videoRef.current) {
                    return;
                }

                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setExperienceReady(true);
                setTrackingState(
                    mediaAssets.length
                        ? `Camera san sang. Da nap ${mediaAssets.length} media tu API lover.`
                        : 'Camera san sang. Dang dung gallery mau vi chua co media hop le tu API lover.',
                );
                frameId = window.requestAnimationFrame(animate);
                window.addEventListener('resize', updateSize);
            } catch (error) {
                console.error(error);
                setCameraError('Khong the khoi tao camera hoac MediaPipe Hands tren trinh duyet nay.');
            }
        };

        setup();

        return () => {
            cancelled = true;
            window.removeEventListener('resize', updateSize);
            window.cancelAnimationFrame(frameId);
            stream?.getTracks().forEach((track) => track.stop());
            handLandmarker?.close();
            cards.forEach((card) => card.dispose());
            renderer?.dispose();
            renderer?.domElement.remove();
        };
    }, [isAuthorized]);

    if (!isHydrated) {
        return null;
    }

    if (!isAuthenticated || !isAuthorized) {
        return (
            <div className="glass-panel rounded-[2rem] border border-[var(--line)] p-10 text-center">
                <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Feature Hand</p>
                <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">Khu vuc danh rieng cho ROLE_lover</h1>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                    Tinh nang nay chi hoat dong tren duong dan `feature-hand` va chi mo cho tai khoan co role `ROLE_lover`.
                </p>
                <div className="mt-6 flex justify-center">
                    <Button type="button" variant="secondary" onClick={() => router.push(APP_ROUTES.dashboard)}>
                        Quay ve dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050816] text-white shadow-[0_32px_80px_rgba(2,6,23,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_32%)]" />
            <div className="relative grid min-h-[78vh] gap-6 p-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:p-8">
                <aside className="glass-panel rounded-[1.75rem] border border-white/10 bg-white/6 p-5 text-sm text-slate-100">
                    <p className="text-xs uppercase tracking-[0.35em] text-rose-200/85">ROLE_lover only</p>
                    <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight">Gesture-driven image gallery</h1>
                    <p className="mt-4 leading-7 text-slate-300">
                        Danh sach media duoc lay tu `GET /api/lover`, render bang Three.js va doi bo cuc theo cu dong tay qua MediaPipe Hands.
                    </p>

                    <div className="mt-6 space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                            <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Gesture map</p>
                            <ul className="mt-3 space-y-2 text-sm text-slate-200">
                                <li>Open palm: doi gallery sang vong tron quay.</li>
                                <li>Peace sign: chuyen bo cuc trai tim.</li>
                                <li>Fist: xep anh thanh tung lop.</li>
                                <li>Pinch: focus va zoom anh gan vi tri tay.</li>
                            </ul>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">Live state</p>
                            <p className="mt-3 text-lg font-semibold text-white">{layout}</p>
                            <p className="mt-2 leading-6 text-slate-300">{trackingState}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs">
                                    {experienceReady ? 'Camera ready' : 'Preparing camera'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs">
                                    {mediaCount > 0 ? `${mediaCount} API media` : 'Fallback gallery'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs">
                                    Path locked: /feature-hand
                                </span>
                            </div>
                        </div>
                    </div>

                    {galleryError ? (
                        <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-amber-100">
                            <p className="font-semibold">Gallery API status</p>
                            <p className="mt-2 text-sm leading-6">{galleryError}</p>
                        </div>
                    ) : null}

                    {cameraError ? (
                        <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-rose-100">
                            <p className="font-semibold">Khong the bat hand tracking</p>
                            <p className="mt-2 text-sm leading-6">{cameraError}</p>
                        </div>
                    ) : null}
                </aside>

                <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,34,0.94),rgba(5,8,22,0.98))]">
                    <div ref={mountRef} className="absolute inset-0" />
                    <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 backdrop-blur">
                        Hand orbit theater
                    </div>
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="absolute bottom-5 right-5 h-36 w-28 scale-x-[-1] rounded-3xl border border-white/10 object-cover shadow-2xl shadow-black/35"
                    />
                </div>
            </div>
        </section>
    );
}
