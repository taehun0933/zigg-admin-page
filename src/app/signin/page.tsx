"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/apis/login";
import ServerToggle from "@/components/admin/ServerToggle";
import { getStoredRole, homePathOf } from "@/components/admin/useAdminAuthGuard";
import { getAppleIdToken, startKakaoLogin } from "@/utils/socialLogin";
import { errorMessageOf, nextPathAfterOAuth } from "@/utils/oauthRouting";

export default function SignInPage() {
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [socialBusy, setSocialBusy] = useState(false);

  // 카카오 콜백·소셜 로그인 결과 안내 (?oauth=pending / ?oauthError=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "pending") {
      setPending("현재 승인 중입니다. 관리자 승인 후 로그인할 수 있어요.");
    }
    const oauthError = params.get("oauthError");
    if (oauthError) setError(oauthError);
  }, []);

  const handleKakao = () => {
    setError(null);
    setPending(null);
    try {
      setSocialBusy(true);
      startKakaoLogin();
    } catch (err) {
      setSocialBusy(false);
      setError(errorMessageOf(err, "카카오 로그인에 실패했어요."));
    }
  };

  const handleApple = async () => {
    setError(null);
    setPending(null);
    setSocialBusy(true);
    try {
      const idToken = await getAppleIdToken();
      if (!idToken) return; // 팝업 닫음
      const result = await authService.oauthLogin({ platform: "APPLE", idToken });
      const next = nextPathAfterOAuth(result);
      if (next.loggedIn) {
        setIsLoggedIn(true);
        router.push(next.path);
      } else if (result.trainerStatus === "PENDING") {
        setPending("현재 승인 중입니다. 관리자 승인 후 로그인할 수 있어요.");
      } else {
        router.push(next.path);
      }
    } catch (err) {
      setError(errorMessageOf(err, "Apple 로그인에 실패했어요."));
    } finally {
      setSocialBusy(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(null);
    setSubmitting(true);
    try {
      await authService.login(form.email, form.password);
      setIsLoggedIn(true);
      router.push(homePathOf(getStoredRole()));
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const data = (err as { message?: unknown })?.message;
      const serverMsg =
        typeof data === "object" && data !== null
          ? (data as { message?: string }).message
          : typeof data === "string"
          ? data
          : undefined;
      if (status === 409) {
        // 트레이너 승인 대기
        setPending(serverMsg ?? "현재 승인 중입니다. 관리자 승인 후 로그인할 수 있어요.");
      } else if (status === 403) {
        // 트레이너 신청 반려
        setError(serverMsg ?? "트레이너 신청이 반려되었습니다. 다시 신청해주세요.");
      } else {
        setError("아이디 또는 비밀번호가 잘못되었습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--admin-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Topbar */}
      <header
        style={{
          height: "var(--admin-topbar-h)",
          padding: "0 24px",
          background: "#fff",
          borderBottom: "1px solid var(--admin-border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          src="/zigg-logo.png"
          alt="ZIGG"
          width={32}
          height={32}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            objectFit: "cover",
            boxShadow: "0 1px 2px rgba(0,0,0,.08)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>ZIGG Admin</span>
          <span style={{ fontSize: 11, color: "var(--admin-ink-3)", fontWeight: 500 }}>
            X GODITION
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <ServerToggle />
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 380,
            background: "#fff",
            border: "1px solid var(--admin-border)",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 4px 12px rgba(0,0,0,.04)",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--admin-ink-3)",
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              관리자 로그인
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: "8px 0 0",
                letterSpacing: -0.4,
              }}
            >
              ZIGG 관리자 페이지
            </h1>
            <p style={{ fontSize: 13, color: "var(--admin-ink-2)", margin: "6px 0 0" }}>
              ZIGG 앱 계정(카카오·Apple) 또는 이메일·비밀번호로 로그인하세요.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <Field label="이메일">
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="제공받은 이메일"
                style={inputStyle}
                autoComplete="email"
                required
              />
            </Field>
            <Field label="비밀번호">
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="제공받은 비밀번호"
                style={inputStyle}
                autoComplete="current-password"
                required
              />
            </Field>

            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "#ffeaea",
                  color: "#cc3333",
                  border: "1px solid #f9d3d3",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

            {pending && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--admin-warn-tint)",
                  color: "#b06a00",
                  border: "1px solid #f4dcae",
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--admin-warn)",
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                />
                <span>{pending}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 6,
                height: 44,
                borderRadius: 10,
                background: submitting ? "#c4c4cc" : "var(--admin-blue)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                transition: "background .15s",
              }}
            >
              {submitting ? "로그인 중…" : "로그인"}
            </button>
          </form>

          {/* 소셜 로그인 — ZIGG 앱과 같은 계정 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "20px 0 14px",
              fontSize: 11.5,
              color: "var(--admin-ink-3)",
              fontWeight: 600,
            }}
          >
            <span style={{ flex: 1, height: 1, background: "var(--admin-border)" }} />
            ZIGG 앱 계정으로 로그인
            <span style={{ flex: 1, height: 1, background: "var(--admin-border)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={handleKakao}
              disabled={socialBusy}
              style={socialBtn("#FEE500", "rgba(0,0,0,.85)", socialBusy)}
            >
              <KakaoSymbol />
              카카오로 로그인
            </button>
            <button
              type="button"
              onClick={handleApple}
              disabled={socialBusy}
              style={socialBtn("#000", "#fff", socialBusy)}
            >
              <AppleSymbol />
              Apple로 로그인
            </button>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--admin-border)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--admin-ink-2)" }}>
              트레이너로 활동하시려면?{" "}
            </span>
            <button
              type="button"
              onClick={() => router.push("/trainer/apply")}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--admin-blue)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              이메일로 트레이너 신청하기 ›
            </button>
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 11,
              color: "var(--admin-ink-3)",
              lineHeight: 1.5,
            }}
          >
            ZIGG 앱 계정으로 로그인하면 같은 계정 그대로 트레이너 전환을 신청할 수 있어요. 트레이너 권한은 관리자 승인 후 열려요. 상단 우측 토글로 Dev / Prod 서버를 전환할 수 있습니다.
          </div>
        </div>
      </main>
    </div>
  );
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-2)" }}>{label}</span>
    {children}
  </label>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid var(--admin-border)",
  background: "#fff",
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
  color: "var(--admin-ink)",
};

const socialBtn = (bg: string, color: string, disabled: boolean): React.CSSProperties => ({
  height: 44,
  borderRadius: 10,
  background: bg,
  color,
  fontWeight: 700,
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
  transition: "opacity .15s",
});

const KakaoSymbol = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#000"
      d="M12 3C6.48 3 2 6.48 2 10.77c0 2.77 1.86 5.2 4.66 6.57-.2.75-.74 2.72-.85 3.14-.13.52.19.51.4.37.17-.11 2.66-1.8 3.74-2.53.66.1 1.34.15 2.05.15 5.52 0 10-3.48 10-7.7C22 6.48 17.52 3 12 3z"
    />
  </svg>
);

const AppleSymbol = () => (
  <svg width="16" height="18" viewBox="0 0 384 470" aria-hidden>
    <path
      fill="#fff"
      d="M318.7 251.2c-.6-56.7 46.3-84 48.4-85.3-26.4-38.6-67.4-43.9-82-44.5-34.9-3.5-68.1 20.6-85.8 20.6-17.7 0-45-20.1-74-19.5-38 .6-73.1 22.1-92.7 56.2-39.5 68.5-10.1 170 28.4 225.6 18.8 27.2 41.2 57.8 70.6 56.7 28.4-1.1 39.1-18.4 73.4-18.4s43.9 18.4 74 17.8c30.5-.6 49.9-27.8 68.6-55.1 21.6-31.6 30.5-62.2 31-63.8-.7-.3-59.4-22.8-59.9-90.3zM262.4 85.1c15.6-19 26.2-45.3 23.3-71.6-22.6.9-50 15.1-66.2 34-14.5 16.8-27.3 43.6-23.9 69.4 25.2 2 50.9-12.8 66.8-31.8z"
    />
  </svg>
);

