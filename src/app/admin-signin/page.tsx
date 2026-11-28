"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/apis/login";
import { getStoredRole, homePathOf } from "@/components/admin/useAdminAuthGuard";
import AuthShell, { authStyles as s } from "@/components/auth/AuthShell";

// 관리자 로그인 — 이메일·비밀번호 (이메일로 가입한 강사 계정도 여기서 로그인)
export default function AdminSignInPage() {
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

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
        setPending(serverMsg ?? "현재 승인 중입니다. 관리자 승인 후 로그인할 수 있어요.");
      } else if (status === 403) {
        setError(serverMsg ?? "관리자 페이지 이용 권한이 없는 계정입니다.");
      } else {
        setError("아이디 또는 비밀번호가 잘못되었습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell badge="ADMIN CONSOLE">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.zmark} src="/auth/zigg-icon.webp" alt="" />
      <div className={s.kick}>ZIGG ADMIN</div>
      <h1 className={s.title}>
        <span className={s.accent}>관리자</span> 로그인
      </h1>
      <p className={s.sub}>제공받은 이메일과 비밀번호로 로그인하세요.</p>

      <form className={s.stack} onSubmit={handleLogin}>
        <label className={s.field}>
          <span>이메일</span>
          <input
            className={s.input}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="admin@achoom-zigg.com"
            autoComplete="email"
            required
          />
        </label>
        <label className={s.field}>
          <span>비밀번호</span>
          <input
            className={s.input}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="비밀번호"
            autoComplete="current-password"
            required
          />
        </label>

        {error && <div className={`${s.notice} ${s.error}`}>{error}</div>}
        {pending && <div className={`${s.notice} ${s.warn}`}>{pending}</div>}

        <button type="submit" className={s.primary} disabled={submitting}>
          {submitting ? "로그인 중…" : "로그인"}
        </button>
      </form>

      <div className={s.foot}>
        <div>
          강사이신가요?{" "}
          <button type="button" className={s.link} onClick={() => router.push("/signin")}>
            강사 로그인 ›
          </button>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>
          상단 우측 토글로 Dev / Prod 서버를 전환할 수 있어요.
        </div>
      </div>
    </AuthShell>
  );
}
