"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ServerToggle from "@/components/admin/ServerToggle";
import AdminIcon from "@/components/admin/AdminIcon";
import {
  applyTrainer,
  uploadTrainerProfileImage,
} from "@/apis/trainer";

// 백엔드(trainer 모듈) 미배포 환경에서도 신청 흐름을 확인할 수 있게 하는 데모 폴백.
// dev/prod 에 배포되면 false 로 바꾸세요.
const DEMO_FALLBACK = false;

type Stage = "form" | "pending";

interface Photo {
  file: File;
  url: string;
}

export default function TrainerApplyPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const next = files
      .slice(0, 5 - photos.length)
      .map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos((p) => [...p, ...next]);
    e.target.value = "";
  };
  const removePhoto = (i: number) =>
    setPhotos((p) => p.filter((_, k) => k !== i));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwMismatch = pw2.length > 0 && pw !== pw2;
  const canSubmit = emailValid && pw.length >= 8 && pw === pw2 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const profileImageIds: number[] = [];
      for (const p of photos) {
        profileImageIds.push(await uploadTrainerProfileImage(p.file));
      }
      await applyTrainer({
        email,
        password: pw,
        passwordConfirm: pw2,
        profileImageIds,
      });
      setStage("pending");
    } catch (err) {
      if (DEMO_FALLBACK) {
        // 백엔드 미배포 — 데모로 승인 대기 화면까지 보여준다.
        console.warn("[trainer-apply] API 미연결, 데모 폴백:", err);
        setStage("pending");
      } else {
        const msg =
          err instanceof Error ? err.message : "신청에 실패했습니다.";
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicShell>
      <Card>
        {stage === "pending" ? (
          <TrainerStatus
            tone="pending"
            onBack={() => router.push("/signin")}
            backLabel="로그인 화면으로"
          />
        ) : (
          <>
            <CardHeader
              eyebrow="트레이너 발급 신청"
              title="트레이너로 활동하기"
              sub="로그인에 사용할 이메일과 비밀번호를 등록하면 관리자 승인 후 활동을 시작할 수 있어요."
            />
            <form
              onSubmit={submit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <Field label="이메일 (로그인 아이디)">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trainer@example.com"
                  style={inputStyle}
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="비밀번호">
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="비밀번호 (8자 이상)"
                  style={inputStyle}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <div>
                <Field label="비밀번호 확인">
                  <input
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    placeholder="비밀번호 다시 입력"
                    style={{
                      ...inputStyle,
                      borderColor: pwMismatch
                        ? "#cc3333"
                        : "var(--admin-border)",
                    }}
                    autoComplete="new-password"
                    required
                  />
                </Field>
                {pwMismatch && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "#cc3333",
                      fontWeight: 600,
                      marginTop: 6,
                    }}
                  >
                    비밀번호가 일치하지 않아요.
                  </div>
                )}
              </div>

              {/* 프로필 사진 (선택, 0~5장) */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--admin-ink-2)",
                    }}
                  >
                    프로필 사진 <span style={{ color: "var(--admin-ink-3)", fontWeight: 500 }}>(선택)</span>
                  </span>
                  <span style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>
                    0~5장
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                  }}
                >
                  {photos.map((p, i) => (
                    <PhotoTile
                      key={i}
                      src={p.url}
                      idx={i}
                      onRemove={removePhoto}
                    />
                  ))}
                  {photos.length < 5 && (
                    <AddTile onPick={pickPhotos} count={photos.length} />
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "var(--admin-ink-3)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--admin-ink-3)",
                    }}
                  />
                  {photos.length > 0
                    ? `${photos.length}장 등록됨`
                    : "등록하지 않으면 기본 프로필이 적용돼요"}
                </div>
              </div>

              {error && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#ffeaea",
                    color: "#cc3333",
                    border: "1px solid #f9d3d3",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                style={primaryBtn(!canSubmit)}
              >
                <AdminIcon name="award" size={16} opacity={0.95} />
                {submitting ? "신청 중…" : "신청하기"}
              </button>
            </form>

            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid var(--admin-border)",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--admin-ink-2)" }}>
                이미 발급받으셨나요?{" "}
              </span>
              <button
                type="button"
                onClick={() => router.push("/signin")}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--admin-blue)",
                  background: "transparent",
                }}
              >
                로그인하기
              </button>
            </div>
          </>
        )}
      </Card>
    </PublicShell>
  );
}

/* ── 승인 대기/결과 상태 ── */
function TrainerStatus({
  tone = "pending",
  onBack,
  backLabel,
}: {
  tone?: "pending" | "approved" | "rejected";
  onBack: () => void;
  backLabel?: string;
}) {
  const cfg = {
    pending: {
      icon: "contact_support",
      tint: "var(--admin-warn-tint)",
      ring: "var(--admin-warn)",
      title: "현재 승인 중입니다!",
      sub: "관리자 승인 후 등록한 이메일로 로그인할 수 있어요.",
    },
    approved: {
      icon: "gradient_check",
      tint: "var(--admin-good-tint)",
      ring: "var(--admin-good)",
      title: "발급이 승인되었어요!",
      sub: "이제 등록한 이메일·비밀번호로 로그인할 수 있어요.",
    },
    rejected: {
      icon: "contact_support",
      tint: "var(--admin-warn-tint)",
      ring: "var(--admin-warn)",
      title: "신청이 반려되었어요",
      sub: "관리자 검토 결과 보완이 필요해요. 다시 신청해주세요.",
    },
  }[tone];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: cfg.tint,
          display: "grid",
          placeItems: "center",
          marginBottom: 22,
        }}
      >
        <AdminIcon name={cfg.icon} size={48} />
      </div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: -0.4,
          margin: 0,
        }}
      >
        {cfg.title}
      </h1>
      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--admin-ink-2)",
          margin: "10px 0 0",
          maxWidth: 300,
        }}
      >
        {cfg.sub}
      </p>
      {tone === "pending" && (
        <div
          style={{
            marginTop: 22,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 10,
            background: cfg.tint,
            color: "#b06a00",
            fontSize: 12.5,
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: cfg.ring,
              flexShrink: 0,
            }}
          />
          심사는 보통 1~2 영업일 이내에 완료돼요.
        </div>
      )}
      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: 24,
          height: 44,
          width: "100%",
          borderRadius: 10,
          background: "#fff",
          border: "1px solid var(--admin-border)",
          color: "var(--admin-ink)",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {backLabel ?? "로그인 화면으로"}
      </button>
    </div>
  );
}

/* ── 공통 프리미티브 (signin/page.tsx 토큰 그대로) ── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid var(--admin-border)",
  background: "#fff",
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
  color: "var(--admin-ink)",
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  marginTop: 6,
  height: 44,
  borderRadius: 10,
  background: disabled ? "#c4c4cc" : "var(--admin-blue)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "background .15s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
});

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-2)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function CardHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 12,
          color: "var(--admin-ink-3)",
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: "8px 0 0",
          letterSpacing: -0.4,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "var(--admin-ink-2)",
          margin: "6px 0 0",
        }}
      >
        {sub}
      </p>
    </div>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--admin-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          height: "var(--admin-topbar-h)",
          padding: "0 24px",
          background: "#fff",
          borderBottom: "1px solid var(--admin-border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          src="/zigg-logo.png"
          alt="ZIGG"
          width={32}
          height={32}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            objectFit: "cover",
            boxShadow: "0 1px 2px rgba(0,0,0,.08)",
          }}
        />
        <div
          style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}
        >
          <span style={{ fontWeight: 700, fontSize: 14 }}>ZIGG Admin</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--admin-ink-3)",
              fontWeight: 500,
            }}
          >
            X GODITION
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <ServerToggle />
      </header>
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "56px 24px 80px",
        }}
      >
        {children}
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 380,
        background: "#fff",
        border: "1px solid var(--admin-border)",
        borderRadius: 16,
        padding: 32,
        boxShadow: "0 4px 12px rgba(0,0,0,.04)",
      }}
    >
      {children}
    </div>
  );
}

function PhotoTile({
  src,
  idx,
  onRemove,
}: {
  src: string;
  idx: number;
  onRemove: (i: number) => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--admin-border)",
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      <span
        style={{
          position: "absolute",
          bottom: 6,
          left: 6,
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          background: "rgba(0,0,0,.5)",
          padding: "2px 7px",
          borderRadius: 999,
        }}
      >
        {idx + 1}
      </span>
      <button
        type="button"
        onClick={() => onRemove(idx)}
        title="삭제"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "rgba(0,0,0,.55)",
          color: "#fff",
          fontSize: 13,
          lineHeight: 1,
          display: "grid",
          placeItems: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}

function AddTile({
  onPick,
  count,
}: {
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  count: number;
}) {
  return (
    <label
      style={{
        aspectRatio: "1 / 1",
        borderRadius: 12,
        border: "1.5px dashed #d7d7dc",
        background: "#fafafc",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        color: "var(--admin-ink-3)",
      }}
    >
      <AdminIcon name="camera" size={24} opacity={0.5} />
      <span style={{ fontSize: 11, fontWeight: 700 }}>사진 추가</span>
      <span style={{ fontSize: 10, fontWeight: 600 }}>{count}/5</span>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={onPick}
        style={{ display: "none" }}
      />
    </label>
  );
}
