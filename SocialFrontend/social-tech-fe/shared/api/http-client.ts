import { appConfig } from "@/common/config/env";
import { ApiError, type ApiErrorPayload } from "@/common/types/api";
import { tokenStorage } from "@/shared/api/token-storage";

type RequestOptions = RequestInit & {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

type RequestBody = BodyInit | object | number | boolean | null | undefined;

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const canParseJson = contentType.includes("application/json");
  const payload = canParseJson ? ((await response.json()) as T | ApiErrorPayload) : null;

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as ApiErrorPayload;
    throw new ApiError(
      response.status,
      errorPayload.message ?? "Request failed",
      errorPayload.errors ?? [],
    );
  }

  return payload as T;
}

async function refreshAccessToken() {
  const existingToken = tokenStorage.get();
  const response = await fetch(`${appConfig.apiBaseUrl}/api/Auth/accessToken-generate`, {
    method: "POST",
    credentials: "include",
    headers: existingToken
      ? {
          Authorization: `Bearer ${existingToken}`,
        }
      : undefined,
  });

  if (!response.ok) {
    tokenStorage.clear();
    return null;
  }

  const payload = (await response.json()) as {
    success?: boolean;
    data?: { accessToken?: string };
    accessToken?: string;
  };

  const nextToken = payload.data?.accessToken ?? payload.accessToken ?? null;

  if (nextToken) {
    tokenStorage.set(nextToken);
  }

  return nextToken;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = false, retryOnUnauthorized = true, headers, ...rest } = options;
  const nextHeaders = new Headers(headers);
  const isFormData = rest.body instanceof FormData;

  if (!isFormData && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = tokenStorage.get();

    if (token) {
      nextHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...rest,
    headers: nextHeaders,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const nextToken = await refreshAccessToken();

    if (nextToken) {
      return request<T>(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
  }

  return parseResponse<T>(response);
}

export const httpClient = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: RequestBody, options?: RequestOptions) {
    return request<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData || typeof body === "string" ? body : JSON.stringify(body),
    });
  },
  put<T>(path: string, body?: RequestBody, options?: RequestOptions) {
    return request<T>(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData || typeof body === "string" ? body : JSON.stringify(body),
    });
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>(path, {
      ...options,
      method: "DELETE",
    });
  },
};
