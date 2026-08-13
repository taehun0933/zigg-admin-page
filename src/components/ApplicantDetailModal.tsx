"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getAuditionFeedbacks,
  getApplicantFeedbackHistory,
  sendApplicationFeedback,
  updateAuditionFeedback,
  deleteAuditionFeedback,
} from "@/apis/feedback";
import { AuditionFeedback, AuditionProfileType, FeedbackItemScore } from "@/types/audition";
import {
  getAdminFeedbackItems,
  AdminFeedbackItem,
  FeedbackItemCategory,
} from "@/apis/asset";
import { countryNameKo } from "@/utils/countryName";
import { cdnImage, cdnImgError } from "@/utils/cdnImage";
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
  /** 오디션 피드백 마무리(일괄 공개) 여부 — false 면 새 피드백은 초안으로 저장됨 */
  feedbackFinalized?: boolean;
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

/* ---------- 피드백 항목 평가 (1~5) ---------- */

// 채점을 "시작했다면" 전체 항목을 채워야 전송 가능. 텍스트만 쓸 땐 채점 없이도 전송된다.
// (부분 채점까지 허용하려면 false — 서버는 부분 배열도 수용)
const REQUIRE_ALL_RATINGS = true;
const SCORE_LABELS: Record<number, string> = {
  1: "미흡",
  2: "보완 필요",
  3: "보통",
  4: "우수",
  5: "탁월",
};

type FeedbackTab = "text" | "rating";

// desiredPosition(자유 문자열) → 자산관리 피드백 항목 카테고리
const toFeedbackCategory = (
  desiredPosition: string | null | undefined
): FeedbackItemCategory | null => {
  switch ((desiredPosition ?? "").trim().toLowerCase()) {
    case "vocal":
    case "보컬":
      return "VOCAL";
    case "rap":
    case "랩":
      return "RAP";
    case "dance":
    case "댄스":
      return "DANCE";
    default:
      return null;
  }
};

// 항목 마스터는 지원자와 무관하므로 모달을 여닫을 때마다 재요청하지 않도록 카테고리별 캐시
const feedbackItemsCache = new Map<FeedbackItemCategory, AdminFeedbackItem[]>();

const ratingTabBtn = (on: boolean): React.CSSProperties => ({
  height: 30,
  padding: "0 12px",
  borderRadius: 7,
  fontSize: 12.5,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: on ? "#fff" : "transparent",
  color: on ? "var(--admin-ink)" : "var(--admin-ink-2)",
  boxShadow: on ? "0 1px 2px rgba(17,17,26,.08)" : "none",
  transition: "all .12s",
  cursor: "pointer",
});

const ratingTabBadge = (on: boolean): React.CSSProperties => ({
  fontSize: 10.5,
  fontWeight: 700,
  padding: "1px 6px",
  borderRadius: 999,
  background: on ? "var(--admin-blue-tint)" : "#e6e6ec",
  color: on ? "var(--admin-blue)" : "var(--admin-ink-3)",
  fontVariantNumeric: "tabular-nums",
});

const ratingEmptyState: React.CSSProperties = {
  fontSize: 13,
  color: "var(--admin-ink-3)",
  padding: "36px 0",
  textAlign: "center",
};

// 전송된 피드백 카드의 점수 칩 줄 (점수 없는 구 데이터면 렌더하지 않음)
const FeedbackScoreChips: React.FC<{
  scores?: FeedbackItemScore[] | null;
  toneFg: string;
}> = ({ scores, toneFg }) => {
  if (!Array.isArray(scores) || scores.length === 0) return null;
  const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
      {scores.map((s) => (
        <span
          key={s.feedbackItemId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--admin-ink-2)",
            background: "#fafafc",
            boxShadow: "inset 0 0 0 1px var(--admin-border)",
            padding: "4px 9px",
            borderRadius: 8,
          }}
        >
          {s.name}
          <span
            style={{
              fontWeight: 700,
              color: toneFg,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {s.score}
          </span>
        </span>
      ))}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#fff",
          background: toneFg,
          padding: "4px 10px",
          borderRadius: 8,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        평균 {avg.toFixed(1)}
      </span>
    </div>
  );
};

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
  feedbackFinalized = false,
  idx,
}) => {
  const [feedbackText, setFeedbackText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [feedbacks, setFeedbacks] = useState<AuditionFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  // 이 지원자가 이전 오디션들에서 받은 피드백 (현재 지원서 제외)
  const [history, setHistory] = useState<AuditionFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // 사진 확대 뷰어 — 열려 있으면 해당 사진 인덱스, 닫혀 있으면 null
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  // 항목 평가 탭 상태
  const [feedbackTab, setFeedbackTab] = useState<FeedbackTab>("text");
  const [ratingItems, setRatingItems] = useState<AdminFeedbackItem[]>([]);
  const [ratingItemsLoading, setRatingItemsLoading] = useState(false);
  const [ratingItemsError, setRatingItemsError] = useState<string | null>(null);
  // feedbackItemId -> 1..5
  const [ratingScores, setRatingScores] = useState<Record<number, number>>({});
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

  // 이전 오디션 피드백은 보조 정보이므로 실패해도 본문 흐름을 막지 않음
  const refreshHistory = useCallback(async () => {
    if (!applicant) return;
    try {
      const data = await getApplicantFeedbackHistory(applicant.auditionId, applicant.id);
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  }, [applicant]);

  // 지원자가 바뀔 때(다른 사람 선택)만 초기화/포커스.
  // 같은 지원자의 isScrap/isLiked 토글로 객체 참조만 새로 생긴 경우엔 실행 안 함.
  useEffect(() => {
    if (!applicant) return;
    setError(null);
    setSuccess(null);
    setFeedbackText("");
    setEditingId(null);
    setEditingText("");
    setHistory([]);
    setViewerIdx(null);
    refreshFeedbacks();
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicant?.id]);

  // 지원자가 바뀌면 평가 상태 초기화 + 지원 카테고리의 평가 항목 로드 (카테고리별 캐시)
  useEffect(() => {
    if (!applicant) return;
    setFeedbackTab("text");
    setRatingScores({});
    setRatingItemsError(null);
    const category = toFeedbackCategory(applicant.desiredPosition);
    if (!category) {
      setRatingItems([]);
      return;
    }
    const cached = feedbackItemsCache.get(category);
    if (cached) {
      setRatingItems(cached);
      return;
    }
    // 이전 지원자의 다른 카테고리 항목이 로딩 중에 남지 않도록 비우고,
    // 빠르게 지원자를 넘길 때 늦게 도착한 응답이 최신 상태를 덮지 않도록 가드
    setRatingItems([]);
    setRatingItemsLoading(true);
    let cancelled = false;
    getAdminFeedbackItems(category)
      .then((list) => {
        const sorted = [...(list ?? [])].sort(
          (x, y) => x.displayOrder - y.displayOrder
        );
        feedbackItemsCache.set(category, sorted);
        if (!cancelled) setRatingItems(sorted);
      })
      .catch(() => {
        if (!cancelled) setRatingItemsError("평가 항목을 불러오지 못했어요.");
      })
      .finally(() => {
        if (!cancelled) setRatingItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      // 피드백 textarea 등에서 커서 이동(←/→) 중 지원자가 넘어가며
      // 작성 중이던 내용이 날아가는 사고 방지
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable);
      // 사진 확대 뷰어가 열려 있으면 키는 뷰어 조작(닫기/사진 이동)에만 사용
      if (viewerIdx !== null) {
        const count = applicant.images?.length ?? 0;
        if (e.key === "Escape") setViewerIdx(null);
        if (e.key === "ArrowRight")
          setViewerIdx((i) => (i === null ? null : Math.min(count - 1, i + 1)));
        if (e.key === "ArrowLeft")
          setViewerIdx((i) => (i === null ? null : Math.max(0, i - 1)));
        return;
      }
      if (e.key === "Escape") onClose();
      // 평가 셀 버튼 등 피드백 작성 영역에 포커스가 있을 때 ←/→ 로 지원자가
      // 넘어가면서 작성 중이던 점수·텍스트가 날아가는 사고 방지
      const inComposer = !!t?.closest?.("[data-feedback-composer]");
      if (typing || inComposer) return;
      if (e.key === "ArrowRight" && onNext) onNext();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [applicant, onClose, onNext, onPrev, viewerIdx]);

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
  const images = a.images ?? [];
  const photo = images[0]?.imageKey;
  const videos = a.videos ?? [];

  // 항목 평가: 카테고리는 지원자 데이터로 자동 결정 (관리자가 고를 수 없음)
  const ratingCategory = toFeedbackCategory(a.desiredPosition);
  const ratingTotal = ratingItems.length;
  const ratingRated = ratingItems.filter(
    (it) => ratingScores[it.feedbackItemId]
  ).length;
  const ratingMissing = ratingTotal - ratingRated;
  const ratingAvg = ratingRated
    ? ratingItems.reduce(
        (sum, it) => sum + (ratingScores[it.feedbackItemId] ?? 0),
        0
      ) / ratingRated
    : 0;
  // 항목 로딩 실패/빈 배열이면 텍스트만으로 전송 가능해야 하므로 전송 조건에서 제외
  const ratingReady = !!ratingCategory && ratingTotal > 0 && !ratingItemsError;
  // 채점을 아예 안 했으면 텍스트만 전송 OK, 시작했으면 전 항목 완료 필요 (부분 채점 방지)
  const ratingComplete =
    !ratingReady || ratingRated === 0 || ratingMissing === 0;

  const canSend =
    feedbackText.trim().length > 0 &&
    !isSending &&
    (!REQUIRE_ALL_RATINGS || ratingComplete);

  const toggleRatingScore = (feedbackItemId: number, value: number) => {
    setSuccess(null);
    setRatingScores((prev) => {
      const next = { ...prev };
      // 이미 선택된 같은 숫자를 다시 누르면 해제 (미평가로 되돌림)
      if (next[feedbackItemId] === value) delete next[feedbackItemId];
      else next[feedbackItemId] = value;
      return next;
    });
  };

  const handleSend = async () => {
    if (!canSend) return;
    const ok = window.confirm(
      feedbackFinalized
        ? "유저에게 피드백을 보내시겠습니까?\n유저의 기기에 알림이 전송됩니다."
        : "피드백을 저장하시겠습니까?\n'피드백 마무리하기' 시점에 지원자에게 일괄 공개되고 알림이 발송됩니다.",
    );
    if (!ok) return;
    setError(null);
    setSuccess(null);
    setIsSending(true);
    const itemScores = ratingReady
      ? ratingItems
          .filter((it) => ratingScores[it.feedbackItemId])
          .map((it) => ({
            feedbackItemId: it.feedbackItemId,
            score: ratingScores[it.feedbackItemId],
          }))
      : [];
    try {
      const status = await sendApplicationFeedback({
        auditionId: a.auditionId,
        applicationId: a.id,
        textReview: feedbackText.trim(),
        itemScores,
      });
      if (status >= 200 && status < 300) {
        setSuccess(
          feedbackFinalized
            ? itemScores.length > 0
              ? "피드백과 항목 평가를 전송했어요."
              : "피드백을 전송했어요."
            : itemScores.length > 0
              ? "피드백과 항목 평가를 저장했어요. '피드백 마무리하기' 시 지원자에게 공개됩니다."
              : "피드백을 저장했어요. '피드백 마무리하기' 시 지원자에게 공개됩니다."
        );
        setFeedbackText("");
        setRatingScores({});
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
        // 지원자가 바뀌면 카드 전체를 리마운트 — <img>/<video> DOM 재사용으로
        // 새 사진이 로드될 때까지 이전 지원자의 사진·영상이 남아 보이던 문제 방지
        key={a.id}
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
                onClick={() => photo && setViewerIdx(0)}
                title={photo ? "클릭해서 크게 보기" : undefined}
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
                  cursor: photo ? "zoom-in" : "default",
                }}
              >
                {photo ? (
                  <img
                    // 목록 카드와 같은 w400 을 재사용 — 다른 폭을 쓰면 리사이즈 CDN
                    // 캐시 미스로 모달 열 때마다 변환(1~2초)이 새로 돈다
                    src={cdnImage(photo, { width: 400 })}
                    onError={cdnImgError(photo)}
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
                    (() => {
                      const handle = normalizeInstagramHandle(a.instagramId);
                      return (
                        <a
                          href={`https://www.instagram.com/${handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--admin-blue)",
                            fontWeight: 600,
                            fontSize: 13,
                          }}
                        >
                          @{handle}
                        </a>
                      );
                    })()
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
                title="지원 영상"
                action={
                  videos.length > 0 ? (
                    <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
                      {videos.length}개
                    </span>
                  ) : null
                }
              >
                {videos.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {videos.map((video, i) => (
                      <div key={video.videoUrl ?? i} style={{ position: "relative" }}>
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
                            src={video.videoUrl}
                            controls
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              background: "#000",
                            }}
                          >
                            동영상을 지원하지 않는 브라우저입니다.
                          </video>
                        </div>
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
                            pointerEvents: "none",
                          }}
                        >
                          VIDEO {(i + 1).toString().padStart(2, "0")}
                          {video.videoDuration
                            ? ` · ${formatDuration(video.videoDuration)}`
                            : ""}
                        </span>
                      </div>
                    ))}
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
                {images.length}장
              </span>
            }
          >
            {images.length === 0 ? (
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
                {images.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setViewerIdx(i)}
                    title="클릭해서 크게 보기"
                    style={{
                      aspectRatio: "1 / 1.2",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#f3f3f6",
                      position: "relative",
                      cursor: "zoom-in",
                    }}
                  >
                    <img
                      src={cdnImage(img.imageKey, { width: 500 })}
                      onError={cdnImgError(img.imageKey)}
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
              data-feedback-composer
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
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--admin-ink-2)",
                  }}
                >
                  피드백 보내기
                </span>
                {/* 카테고리를 판별할 수 없으면 세그먼트 자체를 렌더하지 않음 (텍스트만) */}
                {ratingCategory && (
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      gap: 4,
                      background: "#f0f0f4",
                      padding: 3,
                      borderRadius: 9,
                    }}
                  >
                    <button
                      onClick={() => setFeedbackTab("text")}
                      style={ratingTabBtn(feedbackTab === "text")}
                    >
                      텍스트
                      <span style={ratingTabBadge(feedbackTab === "text")}>
                        {feedbackText.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setFeedbackTab("rating")}
                      style={ratingTabBtn(feedbackTab === "rating")}
                    >
                      항목 평가
                      <span style={ratingTabBadge(feedbackTab === "rating")}>
                        {ratingRated}/{ratingTotal}
                      </span>
                    </button>
                  </div>
                )}
              </div>
              {!ratingCategory || feedbackTab === "text" ? (
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
                    lineHeight: 1.55,
                    outline: "none",
                    background: "#fff",
                    color: "var(--admin-ink)",
                    minHeight: 150,
                  }}
                />
              ) : (
                <div>
                  {ratingItemsLoading ? (
                    <div style={ratingEmptyState}>평가 항목을 불러오는 중…</div>
                  ) : ratingItemsError ? (
                    <div style={ratingEmptyState}>{ratingItemsError}</div>
                  ) : ratingTotal === 0 ? (
                    <div style={ratingEmptyState}>등록된 평가 항목이 없습니다.</div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
                          자산관리 &gt; 피드백 항목의{" "}
                          <span style={{ fontWeight: 700, color: tone.fg }}>
                            {type}
                          </span>{" "}
                          항목 {ratingTotal}개
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 12,
                            color: "var(--admin-ink-3)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          1 미흡 → 5 탁월
                        </span>
                      </div>
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid var(--admin-border)",
                          borderRadius: 10,
                          overflow: "hidden",
                        }}
                      >
                        {ratingItems.map((it, i) => {
                          const cur = ratingScores[it.feedbackItemId] ?? 0;
                          return (
                            <div
                              key={it.feedbackItemId}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 12px",
                                borderTop:
                                  i === 0
                                    ? "1px solid transparent"
                                    : "1px solid #f2f2f7",
                                background: cur ? "#fff" : "#fdfdfe",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  flex: 1,
                                  minWidth: 88,
                                  fontSize: 13.5,
                                  fontWeight: 600,
                                  color: "var(--admin-ink)",
                                }}
                              >
                                {it.name}
                              </span>
                              <div style={{ display: "flex", gap: 5 }}>
                                {[1, 2, 3, 4, 5].map((v) => {
                                  const sel = cur === v;
                                  return (
                                    <button
                                      key={v}
                                      onClick={() =>
                                        toggleRatingScore(it.feedbackItemId, v)
                                      }
                                      aria-label={`${it.name} ${v}점`}
                                      style={{
                                        width: 38,
                                        height: 32,
                                        borderRadius: 8,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 13,
                                        fontVariantNumeric: "tabular-nums",
                                        fontWeight: sel ? 700 : 600,
                                        background: sel ? tone.fg : "#fff",
                                        color: sel ? "#fff" : "var(--admin-ink-3)",
                                        boxShadow: sel
                                          ? `inset 0 0 0 1px ${tone.fg}`
                                          : "inset 0 0 0 1px var(--admin-border)",
                                        transition: "all .12s",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {v}
                                    </button>
                                  );
                                })}
                              </div>
                              <span
                                style={{
                                  width: 58,
                                  textAlign: "right",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: cur ? tone.fg : "#c9c9d1",
                                }}
                              >
                                {cur ? SCORE_LABELS[cur] : "미평가"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          marginTop: 10,
                          padding: "12px 14px",
                          background: "#fff",
                          border: "1px solid var(--admin-border)",
                          borderRadius: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--admin-ink-2)",
                            }}
                          >
                            평균
                          </span>
                          <span
                            style={{
                              fontSize: 23,
                              fontWeight: 700,
                              letterSpacing: -0.7,
                              fontVariantNumeric: "tabular-nums",
                              color: tone.fg,
                            }}
                          >
                            {ratingRated ? ratingAvg.toFixed(1) : "—"}
                          </span>
                          <span
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "var(--admin-ink-3)",
                            }}
                          >
                            / 5.0
                          </span>
                        </div>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 130,
                            display: "flex",
                            flexDirection: "column",
                            gap: 5,
                          }}
                        >
                          <div
                            style={{
                              height: 5,
                              borderRadius: 999,
                              background: "#f0f0f4",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${
                                  ratingTotal
                                    ? (ratingRated / ratingTotal) * 100
                                    : 0
                                }%`,
                                borderRadius: 999,
                                background: tone.fg,
                                transition: "width .18s ease-out",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 11.5,
                              color: "var(--admin-ink-3)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {ratingTotal}항목 중 {ratingRated}개 평가
                          </span>
                        </div>
                        <button
                          onClick={() => setRatingScores({})}
                          style={{
                            height: 30,
                            padding: "0 11px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--admin-ink-2)",
                            background: "#f3f3f6",
                            cursor: "pointer",
                          }}
                        >
                          평가 초기화
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
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
                  {`${feedbackText.length}자`}
                  {ratingReady &&
                    ` · 평가 ${ratingRated}/${ratingTotal}${
                      REQUIRE_ALL_RATINGS && ratingRated > 0 && ratingMissing > 0
                        ? ` · 미평가 ${ratingMissing}개`
                        : ""
                    }`}
                  {feedbackFinalized
                    ? " · 지원자 앱으로 푸시 알림과 함께 전송됩니다."
                    : " · '피드백 마무리하기' 시점에 지원자에게 일괄 공개됩니다."}
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
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {fb.reviewer?.userNickname ?? fb.reviewer?.userName ?? "관리자"}
                        {!fb.publishedAt && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 999,
                              background: "var(--admin-warn-tint)",
                              color: "var(--admin-warn)",
                            }}
                          >
                            공개 전
                          </span>
                        )}
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
                    {!isEditing && (
                      <FeedbackScoreChips scores={fb.itemScores} toneFg={tone.fg} />
                    )}
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

          {/* 이전 오디션에서 받은 피드백 */}
          {history.length > 0 && (
            <Section
              title="이전 오디션에서 받은 피드백"
              action={
                <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
                  {history.length}건
                </span>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((fb: any, idx: number) => (
                  <div
                    key={fb.id ?? idx}
                    style={{
                      border: "1px solid var(--admin-border)",
                      borderRadius: 12,
                      padding: "14px 16px",
                      background: "#fafafc",
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          minWidth: 0,
                        }}
                      >
                        {fb.auditionTitle && (
                          <span
                            style={{
                              flexShrink: 0,
                              maxWidth: 180,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: "var(--admin-blue-tint)",
                              color: "var(--admin-blue)",
                              fontSize: 11,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {fb.auditionTitle}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {fb.reviewer?.userNickname ?? fb.reviewer?.userName ?? "관리자"}
                        </span>
                      </div>
                      {fb.createdAt && (
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            color: "var(--admin-ink-3)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatDate(fb.createdAt)}
                        </span>
                      )}
                    </div>
                    <FeedbackScoreChips
                      scores={fb.itemScores}
                      toneFg={
                        (TYPE_TONE[fb.application?.desiredPosition ?? ""] ?? defaultTone).fg
                      }
                    />
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
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* 사진 확대 뷰어 */}
      {viewerIdx !== null && images[viewerIdx] && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setViewerIdx(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(10, 12, 18, 0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            animation: "detailFadeIn .12s ease",
            cursor: "zoom-out",
          }}
        >
          <ViewerImage
            imageKey={images[viewerIdx].imageKey}
            alt={`${a.name} 사진 ${viewerIdx + 1}`}
          />
          <span
            style={{
              position: "absolute",
              top: 22,
              left: 24,
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(255,255,255,.85)",
              letterSpacing: 0.4,
            }}
          >
            PHOTO {String(viewerIdx + 1).padStart(2, "0")} /{" "}
            {String(images.length).padStart(2, "0")}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewerIdx(null);
            }}
            title="닫기 (Esc)"
            style={{
              position: "absolute",
              top: 14,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "rgba(255,255,255,.12)",
              color: "#fff",
              fontSize: 20,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            ×
          </button>
          {viewerIdx > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerIdx(viewerIdx - 1);
              }}
              title="이전 사진 (←)"
              style={{ ...viewerNavBtn, left: 18 }}
            >
              ←
            </button>
          )}
          {viewerIdx < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerIdx(viewerIdx + 1);
              }}
              title="다음 사진 (→)"
              style={{ ...viewerNavBtn, right: 18 }}
            >
              →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// 확대 뷰어 이미지 — 그리드에서 이미 캐시된 w500 을 즉시 보여주고,
// 원본(콘텐츠 CloudFront)이 로드되면 교체한다. 리사이즈 CDN 을 거치면
// 첫 변환에 수 초 걸리므로 확대는 변환 없이 원본을 그대로 쓴다.
const ViewerImage: React.FC<{ imageKey: string; alt: string }> = ({ imageKey, alt }) => {
  const [hiLoaded, setHiLoaded] = useState(false);
  const lowSrc = cdnImage(imageKey, { width: 500 });
  const hiSrc = imageKey; // 원본 URL

  useEffect(() => {
    setHiLoaded(false);
    const im = new window.Image();
    im.src = hiSrc;
    im.onload = () => setHiLoaded(true);
    return () => {
      im.onload = null;
    };
  }, [hiSrc]);

  return (
    <img
      src={hiLoaded ? hiSrc : lowSrc}
      onError={cdnImgError(imageKey)}
      alt={alt}
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: "92vw",
        maxHeight: "88vh",
        objectFit: "contain",
        borderRadius: 12,
        boxShadow: "0 24px 64px rgba(0,0,0,.5)",
        cursor: "default",
      }}
    />
  );
};

const viewerNavBtn: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 44,
  height: 44,
  borderRadius: 12,
  background: "rgba(255,255,255,.12)",
  color: "#fff",
  fontSize: 18,
  fontWeight: 600,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
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

// 지원자가 핸들 대신 전체 URL(쿼리스트링 포함)이나 @아이디를 입력하는 경우가 있어
// 인스타그램 아이디만 추출한다. (예: https://www.instagram.com/foo?igsh=...&utm_source=... → foo)
const normalizeInstagramHandle = (raw: string): string => {
  let v = raw.trim();
  v = v.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  v = v.replace(/^instagram\.com\//i, "");
  v = v.replace(/^@+/, "");
  // 첫 경로 세그먼트만 사용하고 쿼리스트링·해시·끝 슬래시는 제거
  v = v.split(/[/?#]/)[0];
  return v;
};

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
