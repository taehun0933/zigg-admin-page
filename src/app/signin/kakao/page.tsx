"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/apis/login";
import { kakaoRedirectUri } from "@/utils/socialLogin";
import { errorMessageOf, nextPathAfterOAuth } from "@/utils/oauthRouting";

// 카카오 인가 코드 리다이렉트 수신 → 백엔드 로그인 → 결과별 화면 이동
export default function KakaoCallbackPage() {
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();
  const started = useRef(false); // StrictMode 이중 실행 방지 (인가 코드는 1회용)

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      const msg = params.get("error") === "access_denied" ? "" : "카카오 로그인에 실패했어요.";
      router.replace(msg ? `/signin?oauthError=${encodeURIComponent(msg)}` : "/signin");
      return;
    }

    authService
      .oauthLogin({ platform: "KAKAO", code, redirectUri: kakaoRedirectUri() })
      .then((result) => {
        const next = nextPathAfterOAuth(result);
        if (next.loggedIn) setIsLoggedIn(true);
        router.replace(next.path);
      })
      .catch((err) => {
        const msg = errorMessageOf(err, "카카오 로그인에 실패했어요.");
        router.replace(`/signin?oauthError=${encodeURIComponent(msg)}`);
      });
  }, [router, setIsLoggedIn]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--admin-bg)",
        display: "grid",
        placeItems: "center",
        fontSize: 13,
        color: "var(--admin-ink-2)",
      }}
    >
      카카오 로그인 중…
    </div>
  );
}
