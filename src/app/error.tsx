"use client";

import React, { useEffect } from "react";

/**
 * 페이지 렌더링 중 발생한 클라이언트 예외를 잡아 실제 에러 내용을 화면에 보여준다.
 * (기본 Next.js 크래시 페이지는 "클라이언트 측 예외가 발생했습니다"만 떠서
 * 심사위원 등 외부 사용자가 겪은 오류의 원인을 알 수 없었음 — 스크린샷만으로 진단 가능하게)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin error boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f7f7fa",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          background: "#fff",
          border: "1px solid #e4e4ec",
          borderRadius: 14,
          padding: 28,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          ⚠️ 화면 처리 중 오류가 발생했어요
        </h1>
        <p style={{ fontSize: 13, color: "#6b6b76", margin: "10px 0 14px", lineHeight: 1.5 }}>
          아래 내용을 캡처해서 개발팀에 공유해 주시면 원인 파악에 큰 도움이 됩니다.
          {"\n"}작성 중이던 내용은 새로고침 시 사라질 수 있어요.
        </p>
        <pre
          style={{
            margin: 0,
            padding: 14,
            background: "#1a1a1f",
            color: "#ffd7d7",
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {error.name}: {error.message}
          {error.digest ? `\ndigest: ${error.digest}` : ""}
          {error.stack ? `\n\n${error.stack.split("\n").slice(0, 8).join("\n")}` : ""}
        </pre>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={reset}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 9,
              background: "#007aff",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 9,
              background: "#f3f3f6",
              color: "#3a3a44",
              fontWeight: 600,
              fontSize: 13,
              border: "1px solid #e4e4ec",
              cursor: "pointer",
            }}
          >
            새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
