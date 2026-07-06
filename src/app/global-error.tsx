"use client";

/**
 * 루트 레이아웃까지 죽는 최상위 예외용 폴백. error.tsx와 동일하게
 * 실제 에러 내용을 노출한다. (global-error는 자체 <html>/<body>가 필요)
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
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
              아래 내용을 캡처해서 개발팀에 공유해 주세요.
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
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16,
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
              새로고침
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
