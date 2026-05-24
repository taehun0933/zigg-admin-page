"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary, btnSecondary, inputStyle } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import {
  broadcastNotification,
  broadcastInquiryPromptNotification,
  sendAuditionNotification,
} from "@/apis/notification";
import { getAuditions } from "@/apis/audition";
import { getApiMode } from "@/utils/apiConfig";

type Mode = "general" | "audition" | "inquiry_prompt";

interface AuditionOption {
  id: number;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
}

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: "general", label: "일반 알림", desc: "전체 유저 대상 푸시·인앱" },
  { id: "audition", label: "오디션 알림", desc: "특정 오디션 정보로 발송" },
  { id: "inquiry_prompt", label: "문의하기 안내", desc: "마이 > 문의하기로 유도" },
];

const NotificationPage: React.FC = () => {
  const ready = useAdminAuthGuard();
  const [mode, setMode] = useState<Mode>("general");

  const [generalTitle, setGeneralTitle] = useState("");
  const [generalBody, setGeneralBody] = useState("");

  const [auditions, setAuditions] = useState<AuditionOption[]>([]);
  const [auditionsLoading, setAuditionsLoading] = useState(false);
  const [selectedAuditionId, setSelectedAuditionId] = useState<number | null>(null);
  const [auditionTitle, setAuditionTitle] = useState("");
  const [auditionBody, setAuditionBody] = useState("");

  const [inquiryTitle, setInquiryTitle] = useState("");
  const [inquiryBody, setInquiryBody] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [serverMode, setServerMode] = useState<"prod" | "dev">("prod");
  useEffect(() => {
    if (!ready) return;
    setServerMode(getApiMode());
    const handler = () => setServerMode(getApiMode());
    window.addEventListener("api-mode-change", handler);
    return () => window.removeEventListener("api-mode-change", handler);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    setAuditionsLoading(true);
    getAuditions()
      .then((list: AuditionOption[] | undefined) => setAuditions(list ?? []))
      .catch(() => setAuditions([]))
      .finally(() => setAuditionsLoading(false));
  }, [ready]);

  const currentTitle = mode === "general" ? generalTitle : mode === "audition" ? auditionTitle : inquiryTitle;
  const currentBody = mode === "general" ? generalBody : mode === "audition" ? auditionBody : inquiryBody;
  const setCurrentTitle = (v: string) => {
    if (mode === "general") setGeneralTitle(v);
    else if (mode === "audition") setAuditionTitle(v);
    else setInquiryTitle(v);
  };
  const setCurrentBody = (v: string) => {
    if (mode === "general") setGeneralBody(v);
    else if (mode === "audition") setAuditionBody(v);
    else setInquiryBody(v);
  };

  const canSubmit = useMemo(() => {
    const titleOk = currentTitle.trim().length > 0;
    const bodyOk = currentBody.trim().length > 0;
    if (mode === "audition")
      return selectedAuditionId !== null && titleOk && bodyOk && !submitting;
    return titleOk && bodyOk && !submitting;
  }, [mode, currentTitle, currentBody, selectedAuditionId, submitting]);

  const selectedAudition = auditions.find((a) => a.id === selectedAuditionId);
  const isProd = serverMode === "prod";

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setSuccess(false);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "general") {
        await broadcastNotification({ title: generalTitle.trim(), body: generalBody.trim() });
        setGeneralTitle("");
        setGeneralBody("");
      } else if (mode === "audition" && selectedAuditionId !== null) {
        await sendAuditionNotification(selectedAuditionId, {
          title: auditionTitle.trim(),
          body: auditionBody.trim(),
        });
        setAuditionTitle("");
        setAuditionBody("");
      } else if (mode === "inquiry_prompt") {
        await broadcastInquiryPromptNotification({
          title: inquiryTitle.trim(),
          body: inquiryBody.trim(),
        });
        setInquiryTitle("");
        setInquiryBody("");
      }
      setSuccess(true);
      setConfirmOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "발송 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="알림 발송"
        title="유저 알림 발송"
        subtitle="전체 유저에게 푸시 + 인앱 알림을 동시에 발송합니다."
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
          <div style={{ ...adminCardStyle, padding: 22 }}>
            {/* mode segmented */}
            <Field label="발송 종류">
              <div
                style={{
                  display: "inline-flex",
                  gap: 4,
                  padding: 3,
                  background: "#f3f3f6",
                  borderRadius: 9,
                }}
              >
                {MODES.map((m) => {
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => switchMode(m.id)}
                      style={{
                        height: 30,
                        padding: "0 14px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        background: active ? "#fff" : "transparent",
                        color: active ? "var(--admin-ink)" : "var(--admin-ink-2)",
                        boxShadow: active ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: "var(--admin-ink-3)", marginTop: 8 }}>
                {MODES.find((m) => m.id === mode)?.desc}
              </div>
            </Field>

            {mode === "audition" && (
              <Field label="오디션 선택">
                <select
                  value={selectedAuditionId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    setSelectedAuditionId(v);
                    const picked = auditions.find((a) => a.id === v);
                    if (picked && auditionTitle.trim().length === 0)
                      setAuditionTitle(picked.title);
                  }}
                  disabled={auditionsLoading}
                  style={{ ...inputStyle, height: 40, paddingRight: 32 }}
                >
                  <option value="">
                    {auditionsLoading
                      ? "오디션 로딩 중…"
                      : auditions.length === 0
                      ? "오디션이 없습니다"
                      : "오디션을 선택하세요"}
                  </option>
                  {auditions.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.id} {a.title} — {a.company} ({a.startDate} ~ {a.endDate})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="제목">
              <input
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                maxLength={100}
                placeholder={mode === "audition" ? "오디션 선택 시 자동 prefill (수정 가능)" : "알림 제목"}
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: "var(--admin-ink-3)", textAlign: "right", marginTop: 4 }}>
                {currentTitle.length}/100
              </div>
            </Field>

            <Field label="본문">
              <textarea
                value={currentBody}
                onChange={(e) => setCurrentBody(e.target.value)}
                maxLength={300}
                rows={6}
                placeholder="알림 본문 내용"
                style={{ ...inputStyle, height: "auto", padding: 12, resize: "vertical", lineHeight: 1.5 }}
              />
              <div style={{ fontSize: 11, color: "var(--admin-ink-3)", textAlign: "right", marginTop: 4 }}>
                {currentBody.length}/300
              </div>
            </Field>

            {error && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#ffeaea",
                  color: "#cc3333",
                  fontSize: 12,
                  border: "1px solid #f9d3d3",
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--admin-good-tint)",
                  color: "#1f8a52",
                  fontSize: 12,
                  border: "1px solid #cce8d7",
                }}
              >
                전체 유저에게 발송 요청을 보냈습니다.
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid var(--admin-border)",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
                전체 유저에게 즉시 발송됩니다. 발송 후 취소 불가.
              </span>
              <button
                style={{
                  ...btnPrimary,
                  background: canSubmit ? "var(--admin-blue)" : "#c4c4cc",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
                disabled={!canSubmit}
                onClick={() => {
                  setError(null);
                  setSuccess(false);
                  setConfirmOpen(true);
                }}
              >
                {mode === "general"
                  ? "전체 발송"
                  : mode === "audition"
                  ? "오디션 알림 발송"
                  : "문의 안내 발송"}
              </button>
            </div>
          </div>

          {/* preview — RN NotificationCard 매칭 (흰 카드, grey50 icon bg, grey900 title, grey500 body) */}
          <div style={{ ...adminCardStyle, padding: 22 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--admin-ink-3)",
                letterSpacing: 0.4,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              미리보기 · 인앱 알림
            </div>

            {/* GradientBackground 흉내: white → #F1F1FF */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                background: "linear-gradient(180deg, #ffffff 0%, #ffffff 70%, #F1F1FF 100%)",
                border: "1px solid #ececf0",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 12,
                  color: "#333333",
                  marginLeft: 4,
                  marginBottom: 8,
                }}
              >
                오늘
              </div>

              {/* unread NotificationCard (#EAF3FF) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  background: "#EAF3FF",
                  borderRadius: 12,
                  padding: 14,
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    background: "#F5F5F5",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="/icons/admin/bell.svg"
                    width={22}
                    height={22}
                    alt=""
                    style={{ display: "block" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: "#FF3B30",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#333333",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentTitle || "알림 제목 자리"}
                  </div>
                  {(currentBody || true) && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#9E9E9E",
                        lineHeight: 1.45,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        // 2줄 클램프 (RN numberOfLines=2)
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {currentBody || "여기에 본문 내용 미리보기가 표시됩니다."}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#AEAEB2", marginTop: 2 }}>지금</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "var(--admin-ink-2)", marginTop: 14, lineHeight: 1.5 }}>
              현재 환경:{" "}
              <strong style={{ color: isProd ? "#cc3333" : "#cc7a00" }}>
                {isProd ? "Prod 서버" : "Dev 서버"}
              </strong>
            </div>
            {mode === "inquiry_prompt" && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  fontSize: 11,
                  borderRadius: 8,
                  background: "var(--admin-blue-tint)",
                  color: "var(--admin-blue)",
                  lineHeight: 1.5,
                }}
              >
                유저가 알림을 누르면 마이 &gt; 문의하기 화면으로 이동합니다.
              </div>
            )}
          </div>
        </div>
      </PageShell>

      {confirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
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
              width: 420,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
              {mode === "general"
                ? "전체 유저에게 발송하시겠습니까?"
                : mode === "audition"
                ? "오디션 알림을 전체 유저에게 발송하시겠습니까?"
                : "문의하기 안내 알림을 전체 유저에게 발송하시겠습니까?"}
            </h2>
            <div style={{ fontSize: 12, fontWeight: 600, color: isProd ? "#cc3333" : "#cc7a00" }}>
              현재 환경: {isProd ? "Prod 서버" : "Dev 서버"}
            </div>
            <div
              style={{
                background: "var(--admin-bg)",
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
                border: "1px solid var(--admin-border)",
              }}
            >
              {mode === "audition" && selectedAudition && (
                <>
                  <div style={{ fontSize: 11, color: "var(--admin-ink-3)", marginBottom: 2 }}>오디션</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    #{selectedAudition.id} {selectedAudition.title}
                  </div>
                </>
              )}
              <div style={{ fontSize: 11, color: "var(--admin-ink-3)", marginBottom: 2 }}>제목</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{currentTitle}</div>
              <div style={{ fontSize: 11, color: "var(--admin-ink-3)", marginBottom: 2 }}>본문</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{currentBody}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...btnSecondary, flex: 1, justifyContent: "center" }}
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
              >
                되돌아가기
              </button>
              <button
                style={{
                  ...btnPrimary,
                  flex: 1,
                  justifyContent: "center",
                  background: isProd ? "#cc3333" : "var(--admin-blue)",
                }}
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? "발송 중…" : "발송"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-2)", marginBottom: 8 }}>{label}</div>
    {children}
  </div>
);

export default NotificationPage;
