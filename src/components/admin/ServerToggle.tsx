"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getApiMode, setApiMode, type ApiMode } from "@/utils/apiConfig";

interface ServerToggleProps {
  /** true면 라벨("서버") 숨김 — 좁은 자리용 */
  compact?: boolean;
}

const ServerToggle: React.FC<ServerToggleProps> = ({ compact = false }) => {
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();
  const [mode, setMode] = useState<ApiMode>("prod");
  const [pending, setPending] = useState<ApiMode | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMode(getApiMode());
    const handler = () => setMode(getApiMode());
    window.addEventListener("api-mode-change", handler);
    return () => window.removeEventListener("api-mode-change", handler);
  }, []);

  if (!mounted) return null;

  const requestSwitch = (next: ApiMode) => {
    if (next === mode) return;
    setPending(next);
  };

  const confirm = () => {
    if (!pending) return;
    setApiMode(pending);
    setMode(pending);
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setPending(null);
    router.push("/signin");
  };

  return (
    <>
      <div
        role="group"
        aria-label="서버 전환"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: 3,
          gap: 2,
          background: "#f3f3f6",
          border: "1px solid var(--admin-border)",
          borderRadius: 999,
        }}
      >
        {!compact && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--admin-ink-3)",
              letterSpacing: 0.3,
              padding: "0 8px 0 10px",
              textTransform: "uppercase",
            }}
          >
            서버
          </span>
        )}
        {(["dev", "prod"] as const).map((m) => {
          const active = mode === m;
          const label = m === "prod" ? "Prod" : "Dev";
          const activeBg = m === "prod" ? "var(--admin-good)" : "var(--admin-warn)";
          return (
            <button
              key={m}
              onClick={() => requestSwitch(m)}
              title={active ? `현재 ${label} 서버` : `${label} 서버로 전환`}
              style={{
                height: 28,
                padding: "0 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: active ? activeBg : "transparent",
                color: active ? "#fff" : "var(--admin-ink-2)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: active ? "0 1px 2px rgba(0,0,0,.08)" : "none",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "#e8e8ee";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              {active && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#fff",
                  }}
                />
              )}
              {label}
            </button>
          );
        })}
      </div>

      {pending && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,.4)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              width: 360,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow: "0 12px 32px rgba(0,0,0,.18)",
            }}
          >
            <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--admin-ink)" }}>
              <strong style={{ color: pending === "prod" ? "var(--admin-good)" : "var(--admin-warn)" }}>
                {pending === "prod" ? "Prod" : "Dev"} 서버
              </strong>
              로 전환됩니다.
              <br />
              <span style={{ color: "var(--admin-ink-2)", fontSize: 13 }}>
                로그아웃 후 다시 로그인해주세요.
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPending(null)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid var(--admin-border)",
                  background: "#fff",
                  color: "var(--admin-ink-2)",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                되돌아가기
              </button>
              <button
                onClick={confirm}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  background: pending === "prod" ? "var(--admin-good)" : "var(--admin-warn)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServerToggle;
