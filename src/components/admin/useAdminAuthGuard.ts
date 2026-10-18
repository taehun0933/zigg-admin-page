"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * SSR/CSR hydration mismatch를 피하면서 로그인 가드.
 * 반환값으로 `ready`가 true가 되면 페이지 컨텐츠를 렌더해도 안전.
 */
export function useAdminAuthGuard() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
      return;
    }
    // 트레이너는 관리자 화면 접근 불가 (트레이너 전용 메뉴 기획 중)
    if (localStorage.getItem("role") === "TRAINER") {
      return;
    }
    setReady(true);
  }, [isLoggedIn, router]);

  return ready;
}
