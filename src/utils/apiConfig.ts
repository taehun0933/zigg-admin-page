// 런타임에 dev/prod API 서버 전환 (localStorage에 저장)
// NEXT_PUBLIC_API_URL_DEV, NEXT_PUBLIC_API_URL_PROD가 둘 다 있어야 전환 가능

const STORAGE_KEY = "admin_api_mode";
const DEV_URL = process.env.NEXT_PUBLIC_API_URL_DEV ?? "https://dev.achoom-zigg.com/admin/v0";
const PROD_URL = process.env.NEXT_PUBLIC_API_URL_PROD ?? "https://prod.achoom-zigg.com/admin/v0";

export type ApiMode = "dev" | "prod";

export function getApiMode(): ApiMode {
  if (typeof window === "undefined") return "dev";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dev" || stored === "prod") return stored;
  return "dev";
}

export function setApiMode(mode: ApiMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent("api-mode-change", { detail: mode }));
}

export function getApiBaseUrl(): string {
  const mode = getApiMode();
  return mode === "dev" ? DEV_URL : PROD_URL;
}

export const API_URLS = {
  dev: DEV_URL,
  prod: PROD_URL,
} as const;
