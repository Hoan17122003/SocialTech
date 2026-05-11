const fallbackApiBaseUrl = "http://localhost:5019";

export const appConfig = {
  appName: "Social Tech",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? fallbackApiBaseUrl,
  accessTokenStorageKey: "social-tech.access-token",
};
