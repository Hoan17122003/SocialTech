import * as THREE from 'three';
import {
    CARD_OPACITY_SPEED,
    CARD_POSITION_SPEED,
    CARD_ROTATION_SPEED,
    CARD_SCALE_SPEED,
} from '@/features/hand-gesture/feature-hand.constants';
import type { LoverMediaItem } from '@/features/hand-gesture/contracts';
import type { GestureState, LayoutMode } from '@/features/hand-gesture/feature-hand.types';
import { lerp } from '@/features/hand-gesture/lib/feature-hand-math';

export type GalleryCard = {
    baseScale: THREE.Vector3;
    dispose: () => void;
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
};

type GalleryFrameInput = {
    camera: THREE.PerspectiveCamera;
    cards: GalleryCard[];
    galleryRoot: THREE.Group;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    state: GestureState;
    time: number;
};

export function createGalleryScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070d');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.05, 8.8);

    const galleryRoot = new THREE.Group();
    scene.add(galleryRoot);

    const ambientLight = new THREE.AmbientLight('#ffffff', 1.8);
    const rimLight = new THREE.PointLight('#f472b6', 42, 30);
    rimLight.position.set(3, 4, 8);
    scene.add(ambientLight, rimLight);

    return {
        camera,
        galleryRoot,
        scene,
    };
}

export function createGalleryRenderer(container: HTMLDivElement) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    return renderer;
}

export function resizeGalleryRenderer(
    container: HTMLDivElement,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
) {
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
}

function createMediaScale(width: number, height: number) {
    const aspect = width > 0 && height > 0 ? width / height : 0.75;
    const maxWidth = 2.35;
    const maxHeight = 3.05;

    if (aspect >= maxWidth / maxHeight) {
        return new THREE.Vector3(maxWidth, maxWidth / aspect, 1);
    }

    return new THREE.Vector3(maxHeight * aspect, maxHeight, 1);
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

    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.font = '700 84px Arial';
    context.fillText(`LOCAL ${index + 1}`, 72, 140);
    context.font = '600 40px Arial';
    context.fillText('Fallback texture', 72, 210);

    context.fillStyle = 'rgba(255, 255, 255, 0.18)';
    context.beginPath();
    context.arc(canvas.width * 0.72, canvas.height * 0.48, 240, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = 'rgba(255,255,255,0.72)';
    context.lineWidth = 16;
    context.strokeRect(120, 330, 660, 520);

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
                // Some browsers block autoplay anyway; the first decoded frame can still be used as a texture.
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

export async function createMediaCard(scene: THREE.Group, asset: LoverMediaItem, index: number): Promise<GalleryCard> {
    let texture: THREE.Texture;
    let video: HTMLVideoElement | null = null;
    let baseScale = new THREE.Vector3(1.75, 2.55, 1);

    if (asset.type === 'video') {
        const loadedVideo = await loadVideoTexture(asset.url);
        texture = loadedVideo.texture;
        video = loadedVideo.video;
        baseScale = createMediaScale(video.videoWidth, video.videoHeight);
    } else {
        texture = await loadImageTexture(asset.url);
        const image = texture.image as HTMLImageElement | undefined;
        baseScale = createMediaScale(
            image?.naturalWidth ?? image?.width ?? 0,
            image?.naturalHeight ?? image?.height ?? 0,
        );
    }

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.userData = {
        index,
        title: asset.title,
        type: asset.type,
    };
    scene.add(mesh);

    return {
        baseScale,
        mesh,
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

export function createFallbackCard(scene: THREE.Group, index: number): GalleryCard {
    const material = new THREE.MeshBasicMaterial({
        map: createFallbackGalleryTexture(index),
        transparent: true,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    scene.add(mesh);

    return {
        baseScale: new THREE.Vector3(1.8, 2.45, 1),
        mesh,
        dispose: () => {
            mesh.geometry.dispose();
            material.map?.dispose();
            material.dispose();
        },
    };
}

function buildLayoutPosition(
    layout: LayoutMode,
    index: number,
    count: number,
    focusIndex: number | null,
    time: number,
) {
    const normalizedFocus = focusIndex ?? Math.floor(count / 2);

    // The focused media stays large and centered; layouts below only move supporting images.
    if (index === normalizedFocus) {
        return {
            opacity: 1,
            position: new THREE.Vector3(0, 0.18, 1.4),
            rotation: new THREE.Euler(0, 0, Math.sin(time * 0.5) * 0.012),
            scale: 1.58,
        };
    }

    const sideCount = Math.max(count - 1, 1);
    const order = index < normalizedFocus ? index : index - 1;

    if (layout === 'stack') {
        const middle = (sideCount - 1) / 2;
        const offset = order - middle;

        return {
            opacity: 0.76,
            position: new THREE.Vector3(offset * 0.32, 1.95 - Math.abs(offset) * 0.05, -1.45 - Math.abs(offset) * 0.16),
            rotation: new THREE.Euler(0.02, 0, offset * 0.08),
            scale: 0.48,
        };
    }

    if (layout === 'ribbon') {
        const progress = sideCount === 1 ? 0.5 : order / (sideCount - 1);
        const x = lerp(-4.9, 4.9, progress);
        const y = -1.9 + Math.sin(progress * Math.PI * 2 + time * 0.8) * 0.32;

        return {
            opacity: 0.84,
            position: new THREE.Vector3(x, y, -1.1 + Math.cos(progress * Math.PI * 2 + time * 0.5) * 0.28),
            rotation: new THREE.Euler(0.03, 0, Math.sin(progress * Math.PI * 2) * 0.08),
            scale: 0.5,
        };
    }

    if (layout === 'heart') {
        const angle = (order / sideCount) * Math.PI * 2 + time * 0.1;
        const x = 16 * Math.sin(angle) ** 3;
        const y = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);

        return {
            opacity: 0.86,
            position: new THREE.Vector3(x * 0.22, y * 0.13 + 0.15, -1.25 + Math.cos(angle * 1.6) * 0.34),
            rotation: new THREE.Euler(0.03, 0, -x * 0.012),
            scale: 0.52,
        };
    }

    const angle = (order / sideCount) * Math.PI * 2 + time * 0.22;

    return {
        opacity: 0.86,
        position: new THREE.Vector3(
            Math.cos(angle) * 4.4,
            Math.sin(angle) * 1.55 - 0.12,
            -1.2 + Math.sin(angle * 2) * 0.42,
        ),
        rotation: new THREE.Euler(Math.sin(angle) * 0.025, 0, Math.cos(angle) * 0.06),
        scale: 0.54,
    };
}

export function renderGalleryFrame({ camera, cards, galleryRoot, renderer, scene, state, time }: GalleryFrameInput) {
    galleryRoot.rotation.y = lerp(galleryRoot.rotation.y, state.rotationY, 0.07);
    galleryRoot.rotation.x = lerp(galleryRoot.rotation.x, state.tiltX, 0.07);
    galleryRoot.scale.setScalar(lerp(galleryRoot.scale.x, state.galleryScale, 0.08));

    cards.forEach((card, index) => {
        const { opacity, position, rotation, scale } = buildLayoutPosition(
            state.layout,
            index,
            cards.length,
            state.focusIndex,
            time / 1000,
        );
        const focusBoost = state.pinchActive && state.focusIndex === index ? 1.18 : 1;
        const softFade = state.pinchActive && state.focusIndex !== index ? 0.58 : opacity;

        card.mesh.position.lerp(position, CARD_POSITION_SPEED);
        card.mesh.rotation.x = lerp(card.mesh.rotation.x, rotation.x, CARD_ROTATION_SPEED);
        card.mesh.rotation.y = lerp(card.mesh.rotation.y, rotation.y, CARD_ROTATION_SPEED);
        card.mesh.rotation.z = lerp(card.mesh.rotation.z, rotation.z, CARD_ROTATION_SPEED);
        card.mesh.scale.lerp(card.baseScale.clone().multiplyScalar(scale * focusBoost), CARD_SCALE_SPEED);
        card.mesh.material.opacity = lerp(card.mesh.material.opacity, softFade, CARD_OPACITY_SPEED);
    });

    renderer.render(scene, camera);
}
