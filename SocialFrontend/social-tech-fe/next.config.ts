import type { NextConfig } from 'next';

const apiBaseUrl = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5019');
const apiImageProtocol = apiBaseUrl.protocol.replace(':', '') as 'http' | 'https';

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            // Fallback article data uses Unsplash; keep this host explicit instead of allowing every domain.
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '/**',
            },
            // Backend-hosted media should follow the same API base URL used by the FE.
            {
                protocol: apiImageProtocol,
                hostname: apiBaseUrl.hostname,
                port: apiBaseUrl.port,
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
