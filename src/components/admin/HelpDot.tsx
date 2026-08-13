"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * 버튼 옆에 붙이는 작은 ? 도움말. 클릭하면 설명 팝오버가 뜨고
 * 바깥을 클릭하거나 다시 누르면 닫힌다.
 */
const HelpDot: React.FC<{
  children: React.ReactNode;
  /** 팝오버가 열리는 방향 — 화면 하단 요소는 "top" 권장 */
  placement?: "top" | "bottom";
  width?: number;
}> = ({ children, placement = "bottom", width = 280 }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}
    >
      <button
        type="button"
        aria-label="도움말"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          border: "1px solid var(--admin-border)",
          background: open ? "var(--admin-blue-tint)" : "#fff",
          color: open ? "var(--admin-blue)" : "var(--admin-ink-3)",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all .12s",
        }}
      >
        ?
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            ...(placement === "top"
              ? { bottom: "calc(100% + 8px)" }
              : { top: "calc(100% + 8px)" }),
            width,
            background: "#fff",
            border: "1px solid var(--admin-border)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.65,
            color: "var(--admin-ink-2)",
            textAlign: "left",
            boxShadow: "0 8px 24px rgba(17,17,26,.14)",
            zIndex: 60,
            whiteSpace: "normal",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default HelpDot;
