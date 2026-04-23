// 런타임에 dev/prod API 서버 전환 (localStorage에 저장)
// NEXT_PUBLIC_API_URL_DEV, NEXT_PUBLIC_API_URL_PROD가 둘 다 있어야 전환 가능

const STORAGE_KEY = "admin_api_mode";
const DEFAULT = process.env.NEXT_PUBLIC_BASE_URL_FOR_ADMIN ?? "";
const DEV_URL = process.env.NEXT_PUBLIC_API_URL_DEV ?? DEFAULT;
const PROD_URL = process.env.NEXT_PUBLIC_API_URL_PROD ?? DEFAULT;

export type ApiMode = "dev" | "prod";

export function getApiMode(): ApiMode {
  if (typeof window === "undefined") return "prod";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dev" || stored === "prod") return stored;
  return "prod";
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
