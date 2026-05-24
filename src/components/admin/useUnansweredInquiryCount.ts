"use client";

import { useEffect, useState } from "react";
import { getCustomerInquiryMessages } from "@/apis/customerInquiry";

/**
 * 미응답 고객 문의 건수.
 * 마운트(=새로고침) 시 한 번만 호출. 별도 count API 없어서 한 페이지(size 200) 받아 답장 0개 항목 카운트.
 */
export function useUnansweredInquiryCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getCustomerInquiryMessages({ page: 0, size: 200 });
        if (cancelled) return;
        const n = (res.content ?? []).filter((c) => (c.replies?.length ?? 0) === 0).length;
        setCount(n);
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
