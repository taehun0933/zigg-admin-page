"use client";

import { useEffect, useState } from "react";
import { getLectures } from "@/apis/lecture";

/**
 * 승인 대기중(PENDING) 클래스 신청 건수.
 * 마운트(=새로고침) 시 한 번만 호출. 트레이너 승인 대기 뱃지와 동일 패턴.
 */
export function usePendingLectureCount(enabled = true): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getLectures("PENDING");
        if (cancelled) return;
        setCount(res.length);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return count;
}
