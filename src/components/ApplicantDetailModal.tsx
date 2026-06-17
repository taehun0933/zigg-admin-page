"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getAuditionFeedbacks,
  sendApplicationFeedback,
  updateAuditionFeedback,
  deleteAuditionFeedback,
} from "@/apis/feedback";
import { AuditionFeedback, AuditionProfileType } from "@/types/audition";
import { countryNameKo } from "@/utils/countryName";
import AdminIcon from "@/components/admin/AdminIcon";

interface Props {
  applicant: AuditionProfileType | null;
  /** 1-based index — 헤더 "지원자 #N" 에 표시 */
  idx?: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleScrap?: () => void;
  onToggleLike?: () => void;
  /** 피드백이 추가/삭제되어 "피드백 완료" 여부가 바뀌면 목록 카드 갱신용으로 호출 */
  onFeedbackChange?: (applicantId: number, hasFeedback: boolean) => void;
}

const TYPE_TONE: Record<string, { tint: string; fg: string }> = {
  Vocal: { tint: "#ecf3ff", fg: "#007aff" },
  보컬: { tint: "#ecf3ff", fg: "#007aff" },
  Dance: { tint: "#fff4e0", fg: "#cc7a00" },
  댄스: { tint: "#fff4e0", fg: "#cc7a00" },
  Rap: { tint: "#f0ecff", fg: "#6b3ec9" },
  랩: { tint: "#f0ecff", fg: "#6b3ec9" },
};
const defaultTone = { tint: "var(--admin-blue-tint)", fg: "var(--admin-blue)" };

// 입력값에 이미 단위가 붙어있으면 그대로, 숫자만 있으면 단위 부착.
const fmtMeasurement = (v: string | number | undefined | null, unit: string): string => {
  if (v === undefined || v === null || v === "") return "—";
  const s = String(v).trim();
  if (!s) return "—";
  if (/[a-zA-Z'"]\s*$/.test(s)) return s;
  return `${s}${unit}`;
};

const ApplicantDetailModal: React.FC<Props> = ({
  applicant,
  onClose,
  onPrev,
  onNext,
  onToggleScrap,
  onToggleLike,
  onFeedbackChange,
  idx,
}) => {
  const [feedbackText, setFeedbackText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [feedbacks, setFeedbacks] = useState<AuditionFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const refreshFeedbacks = useCallback(async () => {
    if (!applicant) return;
    setLoadingFeedbacks(true);
    try {
      const data = await getAuditionFeedbacks(applicant.auditionId, applicant.id);
      const list = Array.isArray(data) ? data : [];
      setFeedbacks(list);
      // 목록 카드의 "피드백 완료/대기" 뱃지를 즉시 반영
      onFeedbackChange?.(applicant.id, list.length > 0);
    } catch (e: any) {
      setError(e?.message ?? "피드백 목록을 불러오지 못했어요.");
    } finally {
      setLoadingFeedbacks(false);
    }
  }, [applicant, onFeedbackChange]);

  // 지원자가 바뀔 때(다른 사람 선택)만 초기화/포커스.
  // 같은 지원자의 isScrap/isLiked 토글로 객체 참조만 새로 생긴 경우엔 실행 안 함.
  useEffect(() => {
    if (!applicant) return;
    setError(null);
    setSuccess(null);
    setFeedbackText("");
    setEditingId(null);
    setEditingText("");
    refreshFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicant?.id]);

  // 지원자 바뀔 때 스크롤 맨 위로. paint 전에 한 번, 다음 프레임에 또 한 번(컨텐츠 늘어나도 보정).
  useLayoutEffect(() => {
    if (!applicant) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    const r1 = requestAnimationFrame(() => {
      el.scrollTop = 0;
      const r2 = requestAnimationFrame(() => {
        el.scrollTop = 0;
      });
      (el as any).__r2 = r2;
    });
    return () => {
      cancelAnimationFrame(r1);
      if ((el as any).__r2) cancelAnimationFrame((el as any).__r2);
    };
  }, [applicant?.id]);

  useEffect(() => {
    if (!applicant) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [applicant]);

  useEffect(() => {
    if (!applicant) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && onNext) onNext();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [applicant, onClose, onNext, onPrev]);

  if (!applicant) return null;
  const a = applicant;
  const initials = (a.name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const type = a.desiredPosition || "";
  const tone = TYPE_TONE[type] ?? defaultTone;
  const photo = a.images?.[0]?.imageKey;
  const video = a.videos?.[0];

  const canSend = feedbackText.trim().length > 0 && !isSending;

  const handleSend = async () => {
    if (!canSend) return;
    const ok = window.confirm(
      "유저에게 피드백을 보내시겠습니까?\n유저의 기기에 알림이 전송됩니다.",
    );
    if (!ok) return;
    setError(null);
    setSuccess(null);
    setIsSending(true);
    try {
      const status = await sendApplicationFeedback({
        auditionId: a.auditionId,
        applicationId: a.id,
        textReview: feedbackText.trim(),
      });
      if (status >= 200 && status < 300) {
        setSuccess("피드백을 전송했어요.");
        setFeedbackText("");
        await refreshFeedbacks();
      } else {
        setError("피드백 전송에 실패했어요. 다시 시도해 주세요.");
      }
    } catch (e: any) {
      setError(e?.message ?? "피드백 전송 중 오류가 발생했어요.");
    } finally {
      setIsSending(false);
    }
  };

  const onClickEdit = (fb: any) => {
    setError(null);
    setSuccess(null);
    setEditingId(fb.id);
    setEditingText(fb.textReview ?? "");
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const onSaveEdit = async (feedbackId: number) => {
    if (!editingText.trim() || isSavingEdit) return;
    setError(null);
    setSuccess(null);
    setIsSavingEdit(true);
    try {
      await updateAuditionFeedback({
        auditionId: a.auditionId,
        applicationId: a.id,
        feedbackId,
        textReview: editingText.trim(),
      });
      setSuccess("피드백을 수정했어요.");
      setEditingId(null);
      setEditingText("");
      await refreshFeedbacks();
    } catch (e: any) {
      setError(e?.message ?? "피드백 수정 중 오류가 발생했어요.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const onDeleteFeedback = async (feedbackId: number) => {
    const ok = window.confirm(
      "이 피드백을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.",
    );
    if (!ok) return;
    setError(null);
    setSuccess(null);
    try {
      const status = await deleteAuditionFeedback(a.auditionId, a.id, feedbackId);
      if (status >= 200 && status < 300) {
        setSuccess("피드백을 삭제했어요.");
        if (editingId === feedbackId) onCancelEdit();
        await refreshFeedbacks();
      } else {
        setError("피드백 삭제에 실패했어요. 다시 시도해 주세요.");
      }
    } catch (e: any) {
      setError(e?.message ?? "피드백 삭제 중 오류가 발생했어요.");
    }
  };

  return (
    <div
      ref={scrollRef}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="ad-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15, 18, 25, 0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 24px",
        overflowY: "auto",
        animation: "detailFadeIn .15s ease",
      }}
    >
      <style>{`
        @keyframes detailFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes detailSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (max-width: 768px) {
          .ad-overlay { padding: 16px 10px !important; }
          .ad-body { padding: 14px !important; gap: 12px !important; }
          .ad-row1 { grid-template-columns: 1fr !important; }
          .ad-profile-card { max-width: 460px; margin-left: auto; margin-right: auto; width: 100%; }
          .ad-profile-photo { width: 62% !important; max-width: 240px; }
        }
        @media (max-width: 420px) {
          .ad-profile-card { padding: 18px !important; }
          .ad-meta-row { grid-template-columns: 18px 74px 1fr !important; gap: 8px !important; }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 1080,
          background: "var(--admin-bg)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 24px 48px -16px rgba(0,0,0,.3)",
          animation: "detailSlideUp .2s ease",
        }}
      >
        {/* Sticky header */}
        <header
          style={{
            padding: "16px 22px",
            background: "#fff",
            borderBottom: "1px solid var(--admin-border)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--admin-ink-3)",
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              지원자{typeof idx === "number" ? ` #${idx}` : ""}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: -0.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.name} · 세부정보
            </div>
          </div>
          {(onToggleScrap || onToggleLike) && (
            <div style={{ display: "flex", gap: 4 }}>
              {onToggleScrap && (
                <button
                  onClick={onToggleScrap}
                  title={a.isScrap ? "북마크 해제" : "북마크"}
                  style={{
                    ...navBtn,
                    background: a.isScrap ? "#faf7ee" : "#fff",
                  }}
                >
                  <AdminIcon
                    name={a.isScrap ? "bookmark_activated" : "bookmark"}
                    size={14}
                  />
                </button>
              )}
              {onToggleLike && (
                <button
                  onClick={onToggleLike}
                  title={a.isLiked ? "합격 해제" : "합격 처리"}
                  style={{
                    ...navBtn,
                    background: a.isLiked ? "#ffeef2" : "#fff",
                  }}
                >
                  <AdminIcon
                    name={a.isLiked ? "award" : "heart"}
                    size={14}
                  />
                </button>
              )}
            </div>
          )}
          {(onPrev || onNext) && (
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={onPrev}
                disabled={!onPrev}
                title="이전 지원자 (←)"
                style={{ ...navBtn, opacity: onPrev ? 1 : 0.4 }}
              >
                ←
              </button>
              <button
                onClick={onNext}
                disabled={!onNext}
                title="다음 지원자 (→)"
                style={{ ...navBtn, opacity: onNext ? 1 : 0.4 }}
              >
                →
              </button>
            </div>
          )}
          <button
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

        {/* Body */}
        <div className="ad-body" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Row 1: profile + intro/video */}
          <div className="ad-row1" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 14 }}>
            {/* Profile Card */}
            <div
              className="ad-profile-card"
              style={{
                background: "#fff",
                border: "1px solid var(--admin-border)",
                borderRadius: 14,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                className="ad-profile-photo"
                style={{
                  width: 140,
                  aspectRatio: "1 / 1.1",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: photo
                    ? "#f3f3f6"
                    : "linear-gradient(140deg, #c2c8d6 0%, #3f4c6b 100%)",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={a.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: 800,
                      color: "rgba(255,255,255,.55)",
                      letterSpacing: -1,
                      marginBottom: 20,
                    }}
                  >
                    {initials}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
                  {a.name}
                </h3>
                {type && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: tone.tint,
                      color: tone.fg,
                    }}
                  >
                    {type}
                  </span>
                )}
              </div>

              {/* Stat row */}
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  width: "100%",
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                <Stat label="키" value={fmtMeasurement(a.height, "cm")} />
                <Divider />
                <Stat label="몸무게" value={fmtMeasurement(a.weight, "kg")} />
                <Divider />
                <Stat label="출생연도" value={a.ageOrYear || "—"} />
              </div>

              {/* Meta list */}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  marginTop: 8,
                }}
              >
                <MetaRow icon="instagram" label="Instagram">
                  {a.instagramId ? (
                    <a
                      href={`https://www.instagram.com/${a.instagramId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--admin-blue)",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      @{a.instagramId}
                    </a>
                  ) : (
                    <span style={{ color: "var(--admin-ink-3)", fontSize: 13 }}>미연동</span>
                  )}
                </MetaRow>
                <MetaRow icon="mail" label="연락처">
                  <span
                    style={{
                      fontSize: 13,
                      fontVariantNumeric: "tabular-nums",
                      color: a.contactInfo ? "var(--admin-ink)" : "var(--admin-ink-3)",
                    }}
                  >
                    {a.contactInfo || "정보 없음"}
                  </span>
                </MetaRow>
                <MetaRow icon="people" label="국적">
                  <span style={{ fontSize: 13 }}>
                    {countryNameKo(a.nation)} {a.gender && `· ${a.gender}`}
                  </span>
                </MetaRow>
                {type && (
                  <MetaRow icon="award" label="지원 카테고리">
                    <span style={{ fontSize: 13 }}>{type}</span>
                  </MetaRow>
                )}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Section title="자기소개">
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--admin-ink)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {a.introduction || (
                    <span style={{ color: "var(--admin-ink-3)" }}>
                      등록된 자기소개가 없습니다.
                    </span>
                  )}
                </p>
              </Section>

              <Section
                title="자기 소개 영상"
                action={
                  video?.videoDuration ? (
                    <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
                      {formatDuration(video.videoDuration)}
                    </span>
                  ) : null
                }
              >
                {video ? (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 10",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#1a1a1f",
                    }}
                  >
                    <video
                      controls
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        background: "#000",
                      }}
                    >
                      <source src={video.videoUrl} />
                      동영상을 지원하지 않는 브라우저입니다.
                    </video>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "36px 0",
                      textAlign: "center",
                      color: "var(--admin-ink-3)",
                      fontSize: 13,
                    }}
                  >
                    등록된 영상이 없습니다.
                  </div>
                )}
              </Section>
            </div>
          </div>

          {/* Photos */}
          <Section
            title="사진"
            action={
              <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
                {a.images.length}장
              </span>
            }
          >
            {a.images.length === 0 ? (
              <div
                style={{
                  padding: "36px 0",
                  textAlign: "center",
                  color: "var(--admin-ink-3)",
                  fontSize: 13,
                }}
              >
                등록된 사진이 없습니다.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 10,
                }}
              >
                {a.images.map((img, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: "1 / 1.2",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#f3f3f6",
                      position: "relative",
                    }}
                  >
                    <img
                      src={img.imageKey}
                      alt={`${a.name} ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        color: "rgba(255,255,255,.92)",
                        letterSpacing: 0.3,
                        textShadow: "0 1px 2px rgba(0,0,0,.45)",
                      }}
                    >
                      PHOTO {(i + 1).toString().padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Feedback */}
          <Section
            title="피드백"
            action={
              <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
                {feedbacks.length}건
              </span>
            }
          >
            {/* Send box */}
            <div
              style={{
                background: "#fafafc",
                border: "1px solid var(--admin-border)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--admin-ink-2)",
                  marginBottom: 8,
                }}
              >
                피드백 보내기
              </div>
              <textarea
                ref={textareaRef}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="지원자에게 전달할 피드백을 작성해주세요."
                rows={4}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid var(--admin-border)",
                  padding: 12,
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "vertical",
                  lineHeight: 1.5,
                  outline: "none",
                  background: "#fff",
                  color: "var(--admin-ink)",
                  minHeight: 96,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
                  {feedbackText.length}자 · 지원자 앱으로 푸시 알림과 함께 전송됩니다.
                </span>
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{
                    height: 40,
                    padding: "0 18px",
                    borderRadius: 10,
                    background: canSend ? "var(--admin-blue)" : "#c8d6f0",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: canSend ? "pointer" : "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "background .15s",
                    flexShrink: 0,
                  }}
                >
                  {isSending ? (
                    "전송 중…"
                  ) : (
                    <>
                      <AdminIcon name="speaker" size={14} />
                      피드백 전송
                    </>
                  )}
                </button>
              </div>
              {error && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#ffeaea",
                    color: "#cc3333",
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}
              {success && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--admin-good-tint)",
                    color: "#1f8a52",
                    fontSize: 12,
                  }}
                >
                  {success}
                </div>
              )}
            </div>

            {/* Sent feedback list */}
            {loadingFeedbacks ? (
              <div
                style={{
                  padding: "36px 0",
                  textAlign: "center",
                  color: "var(--admin-ink-3)",
                  fontSize: 13,
                }}
              >
                불러오는 중…
              </div>
            ) : feedbacks.length === 0 ? (
              <div
                style={{
                  padding: "36px 0",
                  textAlign: "center",
                  color: "var(--admin-ink-3)",
                  fontSize: 13,
                }}
              >
                아직 피드백이 없어요.
                <br />
                <span style={{ fontSize: 12 }}>첫 피드백을 보내보세요.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {feedbacks.map((fb: any) => {
                  const isEditing = editingId === fb.id;
                  return (
                  <div
                    key={fb.id}
                    style={{
                      border: "1px solid var(--admin-border)",
                      borderRadius: 12,
                      padding: "14px 16px",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {fb.reviewer?.userNickname ?? fb.reviewer?.userName ?? "관리자"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {fb.createdAt && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--admin-ink-3)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatDate(fb.createdAt)}
                          </span>
                        )}
                        {!isEditing && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => onClickEdit(fb)}
                              title="수정"
                              style={cardActionBtn}
                            >
                              <AdminIcon name="edit" size={13} opacity={0.6} />
                            </button>
                            <button
                              onClick={() => onDeleteFeedback(fb.id)}
                              title="삭제"
                              style={cardActionBtn}
                            >
                              <AdminIcon name="trashcan" size={13} opacity={0.6} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={4}
                          autoFocus
                          style={{
                            width: "100%",
                            borderRadius: 10,
                            border: "1px solid var(--admin-border)",
                            padding: 12,
                            fontSize: 13.5,
                            fontFamily: "inherit",
                            resize: "vertical",
                            lineHeight: 1.55,
                            outline: "none",
                            background: "#fff",
                            color: "var(--admin-ink)",
                            minHeight: 80,
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          <button
                            onClick={onCancelEdit}
                            style={{
                              height: 34,
                              padding: "0 14px",
                              borderRadius: 8,
                              background: "#f3f3f6",
                              color: "var(--admin-ink-2)",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            취소
                          </button>
                          <button
                            onClick={() => onSaveEdit(fb.id)}
                            disabled={!editingText.trim() || isSavingEdit}
                            style={{
                              height: 34,
                              padding: "0 14px",
                              borderRadius: 8,
                              background:
                                editingText.trim() && !isSavingEdit
                                  ? "var(--admin-blue)"
                                  : "#c8d6f0",
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: 12,
                              cursor:
                                editingText.trim() && !isSavingEdit
                                  ? "pointer"
                                  : "not-allowed",
                            }}
                          >
                            {isSavingEdit ? "저장 중…" : "저장"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13.5,
                          lineHeight: 1.55,
                          color: "var(--admin-ink)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {fb.textReview}
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

const cardActionBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "#f7f7fa",
  border: "1px solid var(--admin-border)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const navBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "#fff",
  border: "1px solid var(--admin-border)",
  fontWeight: 600,
  fontSize: 13,
  color: "var(--admin-ink)",
  display: "grid",
  placeItems: "center",
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
    <span
      style={{
        fontSize: 11,
        color: "var(--admin-ink-3)",
        fontWeight: 600,
        letterSpacing: 0.3,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 16,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        color: "var(--admin-ink)",
      }}
    >
      {value}
    </span>
  </div>
);

const Divider: React.FC = () => (
  <div style={{ width: 1, background: "var(--admin-border)", margin: "4px 0" }} />
);

const MetaRow: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <div
    className="ad-meta-row"
    style={{
      display: "grid",
      gridTemplateColumns: "20px 90px 1fr",
      alignItems: "center",
      gap: 10,
      padding: "10px 2px",
      borderTop: "1px solid var(--admin-border)",
    }}
  >
    <AdminIcon name={icon} size={16} opacity={0.55} />
    <span style={{ fontSize: 12, color: "var(--admin-ink-2)", fontWeight: 500 }}>{label}</span>
    <span
      style={{
        textAlign: "right",
        minWidth: 0,
        wordBreak: "break-all",
        lineHeight: 1.35,
      }}
    >
      {children}
    </span>
  </div>
);

const Section: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <section
    style={{
      background: "#fff",
      border: "1px solid var(--admin-border)",
      borderRadius: 14,
      padding: 22,
    }}
  >
    <header
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 14,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{title}</h3>
      {action}
    </header>
    {children}
  </section>
);

function formatDuration(input: string | number): string {
  // backend returns "HH:mm:ss" or seconds as string/number
  if (!input) return "";
  const s = String(input);
  if (s.includes(":")) return s.replace(/^00:/, ""); // "00:00:47" → "00:47"
  const total = Number(s);
  if (!Number.isFinite(total)) return s;
  const mm = Math.floor(total / 60);
  const ss = Math.floor(total % 60);
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export default ApplicantDetailModal;
