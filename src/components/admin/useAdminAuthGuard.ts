"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export type AdminRole = "ADMIN" | "TRAINER";

// 로그인 시 저장한 JWT auth 클레임. 값이 없으면(구버전 로그인) ADMIN 으로 취급 — 실제 권한은 백엔드가 막는다.
export function getStoredRole(): AdminRole {
  if (typeof window === "undefined") return "ADMIN";
  return localStorage.getItem("role") === "TRAINER" ? "TRAINER" : "ADMIN";
}

// role 별 첫 화면
export const homePathOf = (role: AdminRole) =>
  role === "TRAINER" ? "/my-class" : "/dashboard";

/**
 * SSR/CSR hydration mismatch를 피하면서 로그인 + role 가드.
 * 다른 role 의 페이지에 들어오면 그 role 의 첫 화면으로 보낸다.
 * 반환값으로 `ready`가 true가 되면 페이지 컨텐츠를 렌더해도 안전.
 */
export function useAdminAuthGuard(allow: AdminRole = "ADMIN") {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
      return;
    }
    const role = getStoredRole();
    if (role !== allow) {
      router.replace(homePathOf(role));
      return;
    }
    setReady(true);
  }, [isLoggedIn, router, allow]);

  return ready;
}
