"use client";

import React, { useEffect } from "react";
import { GENRE_LABEL, LEVEL_LABEL, Lecture, LectureStatus } from "@/apis/lecture";

/* ===== 공용 포맷 ===== */

export const formatPrice = (price: number) =>
  price === 0 ? "무료" : `${price.toLocaleString("ko-KR")}원`;

export const formatYmd = (iso: string) => {
  try {
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(iso.endsWith("Z") ? iso : iso + "Z")); // 서버 LocalDateTime = UTC
    const get = (t: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return iso;
  }
};

// 시즌제 D-day (KST 기준). 시작 전이면 "시작 D-n", 진행 중이면 "종료 D-n"
const todayKst = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const dayDiff = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

export const capacityText = (l: Lecture) =>
  l.capacity === null ? "제한 없음" : `${l.capacity}명`;

export const periodText = (l: Lecture) => {
  if (l.operationType === "ALWAYS") return "상시 운영";
  return `${l.startDate} ~ ${l.endDate}`;
};

export const dDayText = (l: Lecture): string | null => {
  if (l.operationType !== "SEASON" || !l.startDate || !l.endDate) return null;
  if (l.status === "CLOSED") return "마감";
  const today = todayKst();
  if (today < l.startDate) return `시작 D-${dayDiff(today, l.startDate)}`;
  const left = dayDiff(today, l.endDate);
  return left === 0 ? "종료 D-day" : `종료 D-${left}`;
};

/* ===== 상태 칩 ===== */

const STATUS: Record<
  LectureStatus,
  { label: string; bg: string; fg: string; dot: string }
> = {
  PENDING: { label: "승인 대기", bg: "var(--admin-warn-tint)", fg: "#b06a00", dot: "var(--admin-warn)" },
  APPROVED: { label: "운영 중", bg: "var(--admin-good-tint)", fg: "#1f8a52", dot: "var(--admin-good)" },
  REJECTED: { label: "반려", bg: "var(--admin-red-tint)", fg: "var(--admin-red-ink)", dot: "var(--admin-red)" },
  CLOSED: { label: "마감", bg: "#f3f3f6", fg: "var(--admin-ink-3)", dot: "var(--admin-ink-3)" },
};

export function LectureStatusChip({ status }: { status: LectureStatus }) {
  const s = STATUS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

/* ===== 상단 탭 (트레이너 관리 페이지와 동일 톤) ===== */

export function SegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexWrap: "nowrap",
        maxWidth: "100%",
        overflowX: "auto",
        gap: 4,
        padding: 3,
        background: "#f3f3f6",
        borderRadius: 9,
      }}
    >
      {tabs.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "none",
              cursor: "pointer",
              background: active ? "#fff" : "transparent",
              color: active ? "var(--admin-ink)" : "var(--admin-ink-2)",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,.06)" : "none",
            }}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: active ? "#eceef2" : "#e7e8ee",
                  color: active ? "var(--admin-ink-2)" : "var(--admin-ink-3)",
                }}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 80, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
      {children}
    </div>
  );
}

/* ===== 클래스 카드 ===== */

export function LectureCard({
  lecture,
  onOpen,
  footer,
}: {
  lecture: Lecture;
  onOpen?: () => void;
  footer?: React.ReactNode;
}) {
  const dDay = dDayText(lecture);
  const dimmed = lecture.status === "CLOSED";
  return (
    <div
      onClick={onOpen}
      style={{
        background: "#fff",
        border: "1px solid var(--admin-border)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: onOpen ? "pointer" : "default",
        opacity: dimmed ? 0.6 : 1,
      }}
    >
      <div style={{ aspectRatio: "16 / 9", background: "#f3f3f6", position: "relative" }}>
        {lecture.thumbnailImageUrl ? (
          <img
            src={lecture.thumbnailImageUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "var(--admin-ink-3)",
              fontSize: 12,
            }}
          >
            썸네일 없음
          </div>
        )}
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <LectureStatusChip status={lecture.status} />
        </div>
      </div>
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={lecture.title}
        >
          {lecture.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--admin-ink-2)" }}>
          {GENRE_LABEL[lecture.genre]} · {LEVEL_LABEL[lecture.level]} · 모집 {capacityText(lecture)}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-blue)" }}>
          {formatPrice(lecture.price)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--admin-ink-2)" }}>
          <span>{periodText(lecture)}</span>
          {dDay && (
            <span style={{ fontWeight: 700, color: "var(--admin-ink)" }}>· {dDay}</span>
          )}
        </div>
        {lecture.trainerEmail && (
          <div style={{ fontSize: 11.5, color: "var(--admin-ink-3)" }}>{lecture.trainerEmail}</div>
        )}
        {lecture.status === "REJECTED" && lecture.rejectReason && (
          <div
            style={{
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              background: "var(--admin-red-tint)",
              color: "var(--admin-red-ink)",
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            반려 사유: {lecture.rejectReason}
          </div>
        )}
        {footer && <div style={{ marginTop: "auto", paddingTop: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function LectureGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="zg-grid-4"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

function MediaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-3)", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
    </div>
  );
}

/* ===== 상세 모달 (읽기 전용) ===== */

export function LectureDetailModal({
  lecture,
  onClose,
}: {
  lecture: Lecture;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", gap: 12, fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--admin-border)" }}>
      <span style={{ width: 84, flexShrink: 0, color: "var(--admin-ink-3)", fontWeight: 600 }}>{label}</span>
      <span style={{ minWidth: 0, wordBreak: "break-word" }}>{value}</span>
    </div>
  );

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
          maxWidth: 640,
          background: "#fff",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 24px 48px -16px rgba(0,0,0,.3)",
        }}
      >
        {lecture.thumbnailImageUrl && (
          <img
            src={lecture.thumbnailImageUrl}
            alt=""
            style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }}
          />
        )}
        <div style={{ padding: "18px 22px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <LectureStatusChip status={lecture.status} />
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={onClose}
              style={{ fontSize: 13, color: "var(--admin-ink-2)", fontWeight: 600 }}
            >
              닫기
            </button>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px", letterSpacing: -0.4 }}>
            {lecture.title}
          </h2>
          {row("트레이너", lecture.trainerEmail ?? "-")}
          {row("장르 / 난이도", `${GENRE_LABEL[lecture.genre]} · ${LEVEL_LABEL[lecture.level]}`)}
          {row("모집 인원", capacityText(lecture))}
          {row("수강료", formatPrice(lecture.price))}
          {row("운영 방식", lecture.operationType === "ALWAYS" ? "상시 운영" : `시즌제 (${periodText(lecture)})`)}
          {row("신청일", formatYmd(lecture.createAt))}
          {lecture.rejectReason && row("반려 사유", lecture.rejectReason)}
          <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "14px 0" }}>
            {lecture.description}
          </div>
          {lecture.weeks.length > 0 && (
            <div style={{ paddingBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-3)", marginBottom: 4 }}>
                주차 구성 ({lecture.weeks.length}주)
              </div>
              {lecture.weeks.map((w) => row(`${w.weekNo}주차`, w.title))}
            </div>
          )}
          {lecture.images.length > 0 && (
            <MediaSection title={`이미지 (${lecture.images.length})`}>
              {lecture.images.map((img) => (
                <a key={img.imageId} href={img.url} target="_blank" rel="noreferrer">
                  <img
                    src={img.url}
                    alt=""
                    style={{ width: 120, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 8, display: "block" }}
                  />
                </a>
              ))}
            </MediaSection>
          )}
          {lecture.introVideos.length > 0 && (
            <MediaSection title={`소개 영상 (${lecture.introVideos.length})`}>
              {lecture.introVideos.map((v) => (
                <video
                  key={v.videoId}
                  src={v.url}
                  poster={v.thumbnailUrl ?? undefined}
                  controls
                  playsInline
                  style={{ width: 260, maxHeight: 240, borderRadius: 8, background: "#000" }}
                />
              ))}
            </MediaSection>
          )}
        </div>
      </div>
    </div>
  );
}
