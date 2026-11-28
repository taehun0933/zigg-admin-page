"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/apis/login";
import AuthShell, {
  AppleSymbol,
  GoogleSymbol,
  KakaoSymbol,
  authStyles as s,
} from "@/components/auth/AuthShell";
import { getAppleIdToken, startKakaoLogin } from "@/utils/socialLogin";
import {
  errorMessageOf,
  nextPathAfterOAuth,
  oauthNoticeFromQuery,
  type OAuthNotice,
} from "@/utils/oauthRouting";

// 강사 로그인 — ZIGG 앱 계정(카카오·Apple·Google) 소셜 로그인. 강사(TRAINER) 권한만 통과.
export default function TrainerSignInPage() {
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();
  const [notice, setNotice] = useState<OAuthNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 카카오 콜백 결과 안내 (?oauth=... / ?oauthError=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNotice(oauthNoticeFromQuery(params));
    const oauthError = params.get("oauthError");
    if (oauthError) setError(oauthError);
  }, []);

  const reset = () => {
    setNotice(null);
    setError(null);
    setInfo(null);
  };

  const handleKakao = () => {
    reset();
    try {
      setBusy(true);
      startKakaoLogin();
    } catch (err) {
      setBusy(false);
      setError(errorMessageOf(err, "카카오 로그인에 실패했어요."));
    }
  };

  const handleApple = async () => {
    reset();
    setBusy(true);
    try {
      const idToken = await getAppleIdToken();
      if (!idToken) return; // 팝업 닫음
      const result = await authService.oauthLogin({ platform: "APPLE", idToken });
      const next = nextPathAfterOAuth(result);
      if (next.loggedIn) {
        setIsLoggedIn(true);
        router.push(next.path);
      } else {
        setNotice(oauthNoticeFromQuery(new URL(next.path, window.location.origin).searchParams));
      }
    } catch (err) {
      setError(errorMessageOf(err, "Apple 로그인에 실패했어요."));
    } finally {
      setBusy(false);
    }
  };

  // TODO: 백엔드 /trainer/oauth/login 에 GOOGLE 추가 후 연동
  const handleGoogle = () => {
    reset();
    setInfo("Google 로그인은 준비 중이에요. 카카오 또는 Apple로 로그인해주세요.");
  };

  return (
    <AuthShell badge="FOR TRAINERS">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.zmark} src="/auth/zigg-icon.webp" alt="" />
      <div className={s.kick}>ZIGG TRAINER STUDIO</div>
      <h1 className={s.title}>
        <span className={s.accent}>강사</span> 로그인
      </h1>
      <p className={s.sub}>
        ZIGG 앱에서 쓰던 계정으로 바로 시작하세요.
        <br />
        강사 권한이 있는 계정만 로그인할 수 있어요.
      </p>

      <div className={s.stack}>
        <button type="button" className={`${s.social} ${s.kakao}`} onClick={handleKakao} disabled={busy}>
          <KakaoSymbol />
          카카오로 계속하기
        </button>
        <button type="button" className={`${s.social} ${s.apple}`} onClick={handleApple} disabled={busy}>
          <AppleSymbol />
          Apple로 계속하기
        </button>
        <button type="button" className={`${s.social} ${s.google}`} onClick={handleGoogle} disabled={busy}>
          <GoogleSymbol />
          Google로 계속하기
          <span className={s.soon}>준비 중</span>
        </button>

        {error && <div className={`${s.notice} ${s.error}`}>{error}</div>}
        {info && <div className={`${s.notice} ${s.info}`}>{info}</div>}
        {notice && <NoticeBox notice={notice} onGo={(path) => router.push(path)} />}
      </div>

      <div className={s.foot}>
        <div>
          아직 강사가 아니신가요?{" "}
          <button type="button" className={s.link} onClick={() => router.push("/trainer/apply")}>
            이메일로 강사 신청하기 ›
          </button>
        </div>
        <div>
          <button type="button" className={s.subtle} onClick={() => router.push("/admin-signin")}>
            관리자 · 이메일 계정 로그인
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

function NoticeBox({ notice, onGo }: { notice: OAuthNotice; onGo: (path: string) => void }) {
  switch (notice.kind) {
    case "pending":
      return (
        <div className={`${s.notice} ${s.warn}`}>
          강사 승인 대기 중이에요.
          <small>관리자 승인이 끝나면 같은 계정으로 로그인할 수 있어요.</small>
        </div>
      );
    case "rejected":
      return (
        <div className={`${s.notice} ${s.error}`}>
          <div>
            강사 신청이 반려되었어요.
            {notice.reason && <small>사유: {notice.reason}</small>}
          </div>
          <button
            type="button"
            className={s.noticeBtn}
            onClick={() =>
              onGo(`/trainer/apply?social=1&rejected=1&reason=${encodeURIComponent(notice.reason)}`)
            }
          >
            다시 신청하기 ›
          </button>
        </div>
      );
    case "none":
      return (
        <div className={`${s.notice} ${s.info}`}>
          <div>
            강사 권한이 없는 계정이에요.
            <small>지금 쓰는 ZIGG 계정 그대로 강사 전환을 신청할 수 있어요.</small>
          </div>
          <button type="button" className={s.noticeBtn} onClick={() => onGo("/trainer/apply?social=1")}>
            이 계정으로 강사 신청하기 ›
          </button>
        </div>
      );
    case "admin":
      return (
        <div className={`${s.notice} ${s.info}`}>
          <div>
            관리자 계정은 소셜 로그인을 쓸 수 없어요.
            <small>관리자 로그인에서 이메일로 로그인해주세요.</small>
          </div>
          <button type="button" className={s.noticeBtn} onClick={() => onGo("/admin-signin")}>
            관리자 로그인으로 ›
          </button>
        </div>
      );
  }
}
