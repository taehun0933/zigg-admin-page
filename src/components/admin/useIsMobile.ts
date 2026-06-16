"use client";

import { useEffect, useState } from "react";

/**
 * 뷰포트 폭이 breakpoint 미만이면 true.
 * 관리자 레이아웃(인라인 스타일 기반)에서 모바일 분기를 위해 사용.
 * SSR/최초 렌더에서는 false → hydration mismatch 방지를 위해 mounted 후에만 반영.
 */
export function useIsMobile(breakpoint = 820): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
