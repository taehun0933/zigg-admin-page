"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/apis/login";
import ServerToggle from "@/components/admin/ServerToggle";

export default function SignInPage() {
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authService.login(form.email, form.password);
      setIsLoggedIn(true);
      router.push("/dashboard");
    } catch {
      setError("아이디 또는 비밀번호가 잘못되었습니다.");
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
              운영자 계정으로 로그인하세요.
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

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--admin-border)",
              fontSize: 11,
              color: "var(--admin-ink-3)",
              lineHeight: 1.5,
            }}
          >
            상단 우측 토글로 Dev / Prod 서버를 전환할 수 있습니다. 환경에 맞는 계정으로 로그인해주세요.
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
