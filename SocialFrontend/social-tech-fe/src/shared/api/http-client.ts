import { appConfig } from '@/common/config/env';
import { ApiError, type ApiErrorPayload } from '@/common/types/api';
import { tokenStorage } from '@/shared/api/token-storage';
import { resolveApiAuthentication } from '@/shared/security/security-resolver';
import { globalLoadingStore } from '@/shared/ui/global-loading-store';

type RequestOptions = RequestInit & {
    // Leave `auth` undefined for the central API security config to decide.
    // Pass true/false only when a call intentionally overrides the shared rule.
    auth?: boolean;
    retryOnUnauthorized?: boolean;
    showGlobalLoading?: boolean;
};

type RequestBody = BodyInit | object | number | boolean | null | undefined;

async function parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';
    const canParseJson = contentType.includes('application/json');
    const payload = canParseJson ? ((await response.json()) as T | ApiErrorPayload) : null;

    if (!response.ok) {
        const errorPayload = (payload ?? {}) as ApiErrorPayload;
        throw new ApiError(response.status, errorPayload.message ?? 'Request failed', errorPayload.errors ?? []);
    }

    return payload as T;
}

async function refreshAccessToken(accessToken?: string | null) {
    if (!accessToken) {
        tokenStorage.clear();
        return null;
    }

    const response = await fetch(`${appConfig.apiBaseUrl}/api/Auth/accessToken-generate`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(accessToken),
    });

    if (!response.ok) {
        tokenStorage.clear();
        return null;
    }

    const payload = (await response.json()) as {
        success?: boolean;
        data?: string | { accessToken?: string };
        accessToken?: string;
    };

    const nextToken =
        typeof payload.data === 'string' ? payload.data : (payload.data?.accessToken ?? payload.accessToken ?? null);

    if (nextToken) {
        tokenStorage.set(nextToken);
    }

    return nextToken;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { auth, retryOnUnauthorized = true, showGlobalLoading = true, headers, ...rest } = options;
    const apiPolicy = resolveApiAuthentication(path);
    const shouldAttachAuth = auth ?? apiPolicy.auth;
    const nextHeaders = new Headers(headers);
    const isFormData = rest.body instanceof FormData;

    if (!isFormData && !nextHeaders.has('Content-Type')) {
        nextHeaders.set('Content-Type', 'application/json');
    }

    if (shouldAttachAuth) {
        const token = tokenStorage.get();

        if (token) {
            nextHeaders.set('Authorization', `Bearer ${token}`);
        }
    }

    if (showGlobalLoading) {
        globalLoadingStore.start();
    }

    try {
        const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
            ...rest,
            headers: nextHeaders,
            credentials: 'include',
            cache: 'no-store',
        });

        if (response.status === 401 && shouldAttachAuth && retryOnUnauthorized) {
            const accessToken = tokenStorage.get();
            const nextToken = await refreshAccessToken(accessToken);

            if (nextToken) {
                return request<T>(path, {
                    ...options,
                    retryOnUnauthorized: false,
                });
            }
        }

        return parseResponse<T>(response);
    } finally {
        if (showGlobalLoading) {
            globalLoadingStore.stop();
        }
    }
}

export const httpClient = {
    get<T>(path: string, options?: RequestOptions) {
        return request<T>(path, { ...options, method: 'GET' });
    },
    post<T>(path: string, body?: RequestBody, options?: RequestOptions) {
        return request<T>(path, {
            ...options,
            method: 'POST',
            body: body instanceof FormData || typeof body === 'string' ? body : JSON.stringify(body),
        });
    },
    put<T>(path: string, body?: RequestBody, options?: RequestOptions) {
        return request<T>(path, {
            ...options,
            method: 'PUT',
            body: body instanceof FormData || typeof body === 'string' ? body : JSON.stringify(body),
        });
    },
    delete<T>(path: string, options?: RequestOptions) {
        return request<T>(path, {
            ...options,
            method: 'DELETE',
        });
    },
};
