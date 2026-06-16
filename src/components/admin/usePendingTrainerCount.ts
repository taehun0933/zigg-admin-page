"use client";

import { useEffect, useState } from "react";
import { getTrainerApplications } from "@/apis/trainer";

/**
 * 승인 대기중(PENDING) 트레이너 신청 건수.
 * 마운트(=새로고침) 시 한 번만 호출. 미응답 고객문의 뱃지와 동일 패턴.
 */
export function usePendingTrainerCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getTrainerApplications("PENDING");
        if (cancelled) return;
        setCount(res.length);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
