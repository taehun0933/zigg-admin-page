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

// localStorage 는 탭끼리 공유되지만 api-mode-change 이벤트는 같은 탭에만 전달된다.
// 다른 탭에서 dev/prod 를 바꾸면 이 탭은 옛 서버 데이터를 보여준 채 새 서버로 요청을 보내게 되므로
// (예: prod 지원서 화면에서 dev 로 피드백 전송 → 404) 모드가 바뀌면 즉시 새로고침해 화면과 요청 서버를 맞춘다.
if (typeof window !== "undefined") {
  const w = window as Window & { __adminApiModeSyncBound?: boolean };
  if (!w.__adminApiModeSyncBound) {
    w.__adminApiModeSyncBound = true;
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY && e.newValue !== e.oldValue) {
        window.location.reload();
      }
    });
  }
}

export const API_URLS = {
  dev: DEV_URL,
  prod: PROD_URL,
} as const;
