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
import { requestImagePresignedUrl, putFileToPresignedUrl } from "@/apis/media";
import { getAuditions } from "@/apis/audition";
import { getApiMode } from "@/utils/apiConfig";

const MAX_IMAGES = 5;

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
  // 일반 알림 첨부 이미지 (최대 5장) — 발송 시 presigned 업로드 후 imageIds 로 전송
  const [generalImages, setGeneralImages] = useState<File[]>([]);

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
        const imageIds: number[] = [];
        for (const img of generalImages) {
          const { url, contentId } = await requestImagePresignedUrl(img, "NOTIFICATION_IMAGE");
          await putFileToPresignedUrl(url, img);
          imageIds.push(contentId);
        }
        await broadcastNotification({
          title: generalTitle.trim(),
          body: generalBody.trim(),
          imageIds,
        });
        setGeneralTitle("");
        setGeneralBody("");
        setGeneralImages([]);
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
        <div className="zg-split" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
          <div style={{ ...adminCardStyle, padding: 22 }}>
            {/* mode segmented */}
            <Field label="발송 종류">
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
                        whiteSpace: "nowrap",
                        flexShrink: 0,
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

            {mode === "general" && (
              <Field label={`이미지 첨부 (선택, 최대 ${MAX_IMAGES}장)`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    if (picked.length === 0) return;
                    setGeneralImages((prev) => {
                      const combined = [...prev, ...picked];
                      if (combined.length > MAX_IMAGES) {
                        alert(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
                      }
                      return combined.slice(0, MAX_IMAGES);
                    });
                    e.target.value = "";
                  }}
                  style={{ fontSize: 13 }}
                />
                {generalImages.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {generalImages.map((file, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          style={{
                            width: 84,
                            height: 84,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid var(--admin-border)",
                            display: "block",
                          }}
                        />
                        <button
                          onClick={() =>
                            setGeneralImages((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            background: "rgba(0,0,0,.65)",
                            color: "#fff",
                            fontSize: 11,
                            lineHeight: "20px",
                            textAlign: "center",
                            cursor: "pointer",
                          }}
                          aria-label="이미지 제거"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <span style={{ fontSize: 12, color: "var(--admin-ink-3)", alignSelf: "flex-end" }}>
                      {generalImages.length}/{MAX_IMAGES}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--admin-ink-3)", marginTop: 6 }}>
                  이미지는 푸시 배너에는 표시되지 않고, 앱 알림함에서 알림을 눌렀을 때 상세 모달에 표시됩니다.
                </div>
              </Field>
            )}

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
                발송 요청이 접수되었습니다. 전체 유저 발송이 백그라운드에서 진행되며 완료까지 다소 시간이 걸릴 수 있습니다.
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
                전체 유저에게 순차 발송되어 완료까지 다소 시간이 걸립니다. 발송 후 취소 불가.
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
            className="zg-modal-card"
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              width: 420,
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
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
                padding: "10px 12px",
                fontSize: 12,
                borderRadius: 8,
                background: "var(--admin-blue-tint)",
                color: "var(--admin-blue)",
                lineHeight: 1.5,
              }}
            >
              모든 유저에게 알림을 발송하므로 완료까지 다소 시간이 걸립니다. 발송 요청 후 백그라운드에서 처리됩니다.
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
              {mode === "general" && generalImages.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "var(--admin-ink-3)", margin: "8px 0 2px" }}>
                    첨부 이미지
                  </div>
                  <div>{generalImages.length}장</div>
                </>
              )}
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
