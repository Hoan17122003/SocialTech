const ROLE_CLAIM_KEYS = [
    'role',
    'roles',
    'authorities',
    'authority',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
] as const;

type JwtPayload = Record<string, unknown>;

function decodeBase64Url(value: string) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

    if (typeof window === 'undefined') {
        return '';
    }

    return window.atob(padded);
}

function readPayload(accessToken: string): JwtPayload | null {
    const parts = accessToken.split('.');

    if (parts.length < 2) {
        return null;
    }

    try {
        return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
    } catch {
        return null;
    }
}

function normalizeClaimValue(value: unknown) {
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((role) => role.trim())
            .filter(Boolean);
    }

    if (Array.isArray(value)) {
        return value
            .filter((role): role is string => typeof role === 'string')
            .map((role) => role.trim())
            .filter(Boolean);
    }

    return [];
}

export function getRolesFromAccessToken(accessToken: string | null | undefined) {
    if (!accessToken) {
        return [] as string[];
    }

    const payload = readPayload(accessToken);

    if (!payload) {
        return [] as string[];
    }

    return Array.from(new Set(ROLE_CLAIM_KEYS.flatMap((key) => normalizeClaimValue(payload[key]))));
}
