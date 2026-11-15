// admin-page 카카오·애플 로그인 (앱과 같은 ZIGG 계정)
//  - 카카오: 인가 코드 리다이렉트 → /signin/kakao 에서 code 를 백엔드로 전달 (SDK 불필요)
//  - 애플: Sign in with Apple JS 팝업 → id_token 을 백엔드로 전달
// 필요 env: NEXT_PUBLIC_KAKAO_REST_API_KEY, NEXT_PUBLIC_APPLE_SERVICES_ID

const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ?? "";
const APPLE_SERVICES_ID = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID ?? "";
const APPLE_SDK_URL =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/ko_KR/appleid.auth.js";

export const kakaoRedirectUri = () => `${window.location.origin}/signin/kakao`;

export function startKakaoLogin(): void {
  if (!KAKAO_REST_API_KEY) {
    throw new Error("카카오 로그인 설정이 아직 완료되지 않았어요.");
  }
  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: kakaoRedirectUri(),
    response_type: "code",
  });
  window.location.href = `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

interface AppleIDAuth {
  init: (config: Record<string, unknown>) => void;
  signIn: () => Promise<{ authorization: { id_token: string } }>;
}

function loadAppleSdk(): Promise<AppleIDAuth> {
  const w = window as Window & { AppleID?: { auth: AppleIDAuth } };
  if (w.AppleID) return Promise.resolve(w.AppleID.auth);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = APPLE_SDK_URL;
    script.async = true;
    script.onload = () =>
      w.AppleID ? resolve(w.AppleID.auth) : reject(new Error("Apple 로그인을 불러오지 못했어요."));
    script.onerror = () => reject(new Error("Apple 로그인을 불러오지 못했어요."));
    document.head.appendChild(script);
  });
}

// 팝업 취소 시 null
export async function getAppleIdToken(): Promise<string | null> {
  if (!APPLE_SERVICES_ID) {
    throw new Error("Apple 로그인 설정이 아직 완료되지 않았어요.");
  }
  const auth = await loadAppleSdk();
  auth.init({
    clientId: APPLE_SERVICES_ID,
    scope: "",
    redirectURI: `${window.location.origin}/signin`,
    usePopup: true,
  });
  try {
    const res = await auth.signIn();
    return res.authorization.id_token;
  } catch (e) {
    const code = (e as { error?: string })?.error;
    if (code === "popup_closed_by_user" || code === "user_cancelled_authorize") return null;
    throw new Error("Apple 로그인에 실패했어요.");
  }
}
