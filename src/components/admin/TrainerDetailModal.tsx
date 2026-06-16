"use client";

import React, { useEffect, useState } from "react";
import AdminIcon from "./AdminIcon";
import {
  TrainerApplication,
  TrainerApplicationStatus,
} from "@/apis/trainer";

const STATUS: Record<
  TrainerApplicationStatus,
  { label: string; bg: string; fg: string; dot: string }
> = {
  PENDING: {
    label: "대기",
    bg: "var(--admin-warn-tint)",
    fg: "#b06a00",
    dot: "var(--admin-warn)",
  },
  APPROVED: {
    label: "승인",
    bg: "var(--admin-good-tint)",
    fg: "#1f8a52",
    dot: "var(--admin-good)",
  },
  REJECTED: {
    label: "거절",
    bg: "#f3f3f6",
    fg: "var(--admin-ink-3)",
    dot: "var(--admin-ink-3)",
  },
};

export function StatusChip({
  status,
  size = "sm",
}: {
  status: TrainerApplicationStatus;
  size?: "sm" | "lg";
}) {
  const s = STATUS[status];
  const big = size === "lg";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: big ? 12 : 11,
        fontWeight: 700,
        padding: big ? "4px 11px" : "3px 9px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
        }}
      />
      {s.label}
    </span>
  );
}

interface Props {
  application: TrainerApplication;
  formatDate: (iso: string) => string;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
}

const TrainerDetailModal: React.FC<Props> = ({
  application,
  formatDate,
  onClose,
  onApprove,
  onReject,
  busy,
}) => {
  const [active, setActive] = useState(0);
  const images = application.profileImageUrls ?? [];
  const n = images.length;
  const decided = application.status !== "PENDING";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, a + 1));
      if (e.key === "ArrowLeft") setActive((a) => Math.max(0, a - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, n]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15,18,25,.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 24px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 760,
          background: "var(--admin-bg)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 24px 48px -16px rgba(0,0,0,.3)",
        }}
      >
        {/* header */}
        <header
          style={{
            padding: "16px 22px",
            background: "#fff",
            borderBottom: "1px solid var(--admin-border)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--admin-ink-3)",
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              트레이너 발급 신청
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: -0.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {application.email ?? `#${application.userId}`}
              </span>
              <StatusChip status={application.status} size="lg" />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="닫기 (Esc)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#f3f3f6",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              color: "var(--admin-ink-2)",
            }}
          >
            ×
          </button>
        </header>

        {/* body */}
        <div
          style={{
            padding: 22,
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: 18,
          }}
        >
          {/* gallery */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1.15",
                borderRadius: 14,
                position: "relative",
                overflow: "hidden",
                background: "#eceef2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {n > 0 ? (
                <>
                  <img
                    src={images[active]}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 14,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: 0.3,
                      textShadow: "0 1px 2px rgba(0,0,0,.4)",
                    }}
                  >
                    PHOTO {String(active + 1).padStart(2, "0")} / {n}
                  </span>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--admin-ink-3)",
                  }}
                >
                  <AdminIcon name="person" size={40} opacity={0.45} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    기본 프로필
                  </span>
                </div>
              )}
            </div>
            {n > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 2,
                }}
              >
                {images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    style={{
                      width: 52,
                      height: 52,
                      flexShrink: 0,
                      borderRadius: 9,
                      overflow: "hidden",
                      padding: 0,
                      border:
                        active === i
                          ? "2px solid var(--admin-blue)"
                          : "2px solid transparent",
                      boxShadow:
                        active === i
                          ? "0 0 0 2px var(--admin-blue-tint)"
                          : "none",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={src}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--admin-border)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <InfoRow label="이메일" value={application.email ?? "-"} mono />
              <InfoRow label="신청일" value={formatDate(application.createAt)} mono />
              <InfoRow label="프로필 사진" value={`${n}장`} />
              {application.status === "REJECTED" && application.rejectReason && (
                <InfoRow label="반려 사유" value={application.rejectReason} />
              )}
              <InfoRow
                label="발급 권한"
                value="TRAINER · 관리자 페이지 열람"
                last
              />
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "flex-start",
                gap: 9,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--admin-blue-tint)",
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "#2b6fd6",
                fontWeight: 500,
              }}
            >
              <AdminIcon name="award" size={16} opacity={0.9} />
              <span>
                승인하면 이 이메일·비밀번호로 로그인해 관리자 페이지 전체를
                열람할 수 있어요.
              </span>
            </div>

            <div style={{ flex: 1 }} />

            {decided ? (
              <div
                style={{
                  marginTop: 16,
                  height: 44,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 13.5,
                  fontWeight: 700,
                  background:
                    application.status === "APPROVED"
                      ? "var(--admin-good-tint)"
                      : "#f3f3f6",
                  color:
                    application.status === "APPROVED"
                      ? "#1f8a52"
                      : "var(--admin-ink-2)",
                }}
              >
                {application.status === "APPROVED"
                  ? "승인 완료된 신청이에요"
                  : "거절된 신청이에요"}
              </div>
            ) : (
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={busy}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    background: "#fff",
                    border: "1px solid var(--admin-warn)",
                    color: "#b06a00",
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  거절
                </button>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={busy}
                  style={{
                    flex: 2,
                    height: 44,
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    background: busy ? "#9fcfb4" : "var(--admin-good)",
                    color: "#fff",
                    cursor: busy ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                >
                  <AdminIcon name="gradient_check" size={16} />
                  {busy ? "처리 중…" : "승인"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function InfoRow({
  label,
  value,
  mono,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "92px 1fr",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        borderBottom: last ? "none" : "1px solid var(--admin-border)",
      }}
    >
      <span
        style={{ fontSize: 12, color: "var(--admin-ink-2)", fontWeight: 600 }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: "var(--admin-ink)",
          textAlign: "right",
          fontVariantNumeric: mono ? "tabular-nums" : "normal",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default TrainerDetailModal;
