"use client";

import React from "react";
import ServerToggle from "@/components/admin/ServerToggle";
import s from "./auth.module.css";

// 랜딩 히어로와 같은 연습 사진 16장 (public/auth/rehearsal)
const PHOTOS = Array.from(
  { length: 16 },
  (_, i) => `/auth/rehearsal/${String(i + 1).padStart(2, "0")}.jpg`
);

// 레인별 순서 고정 회전 (SSR/CSR 동일 → hydration 불일치 없음)
const LANES = Array.from({ length: 5 }, (_, lane) => {
  const shift = (lane * 5) % PHOTOS.length;
  const order = [...PHOTOS.slice(shift), ...PHOTOS.slice(0, shift)];
  return {
    photos: [...order, ...order],
    duration: 96 + lane * 13,
    delay: -lane * 17,
    reverse: lane % 2 === 1,
  };
});

function PhotoWall() {
  return (
    <div className={s.wall} aria-hidden="true">
      {LANES.map((l, i) => (
        <div
          key={i}
          className={s.lane}
          style={{
            animationDuration: `${l.duration}s`,
            animationDelay: `${l.delay}s`,
            animationDirection: l.reverse ? "reverse" : "normal",
          }}
        >
          {l.photos.map((src, j) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={j} className={s.tile} src={src} alt="" loading={i < 3 ? "eager" : "lazy"} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 로그인 화면 공용 레이아웃 — 사진벽 배경 + 상단 브랜드 + 가운데 글래스 카드 */
export default function AuthShell({
  badge,
  children,
  bare = false,
}: {
  badge: string;
  children: React.ReactNode;
  /** true 면 카드 없이 가운데 내용만 (콜백 로딩 화면 등) */
  bare?: boolean;
}) {
  return (
    <div className={s.page}>
      <PhotoWall />
      <div className={s.shade} />
      <header className={s.header}>
        <div className={s.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/auth/zigg-icon.webp" alt="ZIGG" />
          <b>ZIGG</b>
        </div>
        <span className={s.badge}>{badge}</span>
        <div className={s.spacer} />
        <ServerToggle compact />
      </header>
      <main className={s.main}>{bare ? children : <div className={s.card}>{children}</div>}</main>
    </div>
  );
}

export const authStyles = s;

export const KakaoSymbol = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#000"
      d="M12 3C6.48 3 2 6.48 2 10.77c0 2.77 1.86 5.2 4.66 6.57-.2.75-.74 2.72-.85 3.14-.13.52.19.51.4.37.17-.11 2.66-1.8 3.74-2.53.66.1 1.34.15 2.05.15 5.52 0 10-3.48 10-7.7C22 6.48 17.52 3 12 3z"
    />
  </svg>
);

export const AppleSymbol = () => (
  <svg width="17" height="20" viewBox="0 0 384 470" aria-hidden>
    <path
      fill="#000"
      d="M318.7 251.2c-.6-56.7 46.3-84 48.4-85.3-26.4-38.6-67.4-43.9-82-44.5-34.9-3.5-68.1 20.6-85.8 20.6-17.7 0-45-20.1-74-19.5-38 .6-73.1 22.1-92.7 56.2-39.5 68.5-10.1 170 28.4 225.6 18.8 27.2 41.2 57.8 70.6 56.7 28.4-1.1 39.1-18.4 73.4-18.4s43.9 18.4 74 17.8c30.5-.6 49.9-27.8 68.6-55.1 21.6-31.6 30.5-62.2 31-63.8-.7-.3-59.4-22.8-59.9-90.3zM262.4 85.1c15.6-19 26.2-45.3 23.3-71.6-22.6.9-50 15.1-66.2 34-14.5 16.8-27.3 43.6-23.9 69.4 25.2 2 50.9-12.8 66.8-31.8z"
    />
  </svg>
);

export const GoogleSymbol = () => (
  <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
