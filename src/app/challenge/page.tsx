"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Modal from "@/components/Modal";
import PageShell, {
  adminCardStyle,
  btnPrimary,
  btnSecondary,
  inputStyle,
} from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import AdminIcon from "@/components/admin/AdminIcon";
import {
  Challenge,
  ChallengePayload,
  createChallenge,
  deleteChallenge,
  getChallenges,
  updateChallenge,
} from "@/apis/challenge";
import { getUrlForUploadImage, putImageToPresignedUrl } from "@/apis/media";
import { getApiMode, type ApiMode } from "@/utils/apiConfig";
import { getFileExtension, getImageDimensions } from "@/utils/media";

interface ChallengeFormState {
  id: number | null;
  title: string;
  startAt: string;
  endAt: string;
  bannerImageId: number | null;
  bannerImagePreviewUrl: string;
  likeWeight: string;
  viewWeight: string;
  challengeDetailImageId: number | null;
  challengeDetailImagePreviewUrl: string;
  howTo: string;
  firstReward: string;
  secondReward: string;
  thirdReward: string;
  originalVideoUrl: string;
}

const createEmptyForm = (): ChallengeFormState => ({
  id: null,
  title: "",
  startAt: "",
  endAt: "",
  bannerImageId: null,
  bannerImagePreviewUrl: "",
  likeWeight: "1.00",
  viewWeight: "0.10",
  challengeDetailImageId: null,
  challengeDetailImagePreviewUrl: "",
  howTo: "",
  firstReward: "",
  secondReward: "",
  thirdReward: "",
  originalVideoUrl: "",
});

const brandRibbonItems = ["GODITION", "ZIGG", "GODITION", "ZIGG", "GODITION", "ZIGG"];

const toDatetimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const fromDatetimeLocal = (value: string) => {
  const date = new Date(value);
  return date.toISOString().slice(0, 19);
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const challengeStatus = (challenge: Challenge) => {
  const now = Date.now();
  const start = new Date(challenge.startAt).getTime();
  const end = new Date(challenge.endAt).getTime();
  if (challenge.isActive) {
    return { label: "진행중", color: "var(--admin-good)", tint: "var(--admin-good-tint)" };
  }
  if (Number.isFinite(start) && now < start) {
    return { label: "예정", color: "var(--admin-blue)", tint: "var(--admin-blue-tint)" };
  }
  if (Number.isFinite(end) && now > end) {
    return { label: "종료", color: "var(--admin-ink-3)", tint: "#f1f1f5" };
  }
  return { label: "비활성", color: "var(--admin-ink-2)", tint: "#f4f5f8" };
};

const normalizeDecimal = (value: string, fallback: string) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n.toFixed(2);
};

const getYoutubeVideoId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
};

const isValidYoutubeUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") return url.pathname.replaceAll("/", "").length > 0;
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
      return false;
    }
    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/").filter(Boolean).length >= 2;
    }
    return url.pathname === "/watch" && Boolean(url.searchParams.get("v"));
  } catch {
    return false;
  }
};

const isDateRangeOverlapping = (
  startAt: string,
  endAt: string,
  challenge: Challenge
) => {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const challengeStart = new Date(challenge.startAt).getTime();
  const challengeEnd = new Date(challenge.endAt).getTime();
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isFinite(challengeStart) ||
    !Number.isFinite(challengeEnd)
  ) {
    return false;
  }
  return start < challengeEnd && end > challengeStart;
};

const toForm = (challenge: Challenge): ChallengeFormState => ({
  id: challenge.id,
  title: challenge.title,
  startAt: toDatetimeLocal(challenge.startAt),
  endAt: toDatetimeLocal(challenge.endAt),
  bannerImageId: challenge.bannerImage?.id ?? null,
  bannerImagePreviewUrl: challenge.bannerImage?.url ?? "",
  likeWeight: String(challenge.likeWeight ?? "1.00"),
  viewWeight: String(challenge.viewWeight ?? "0.10"),
  challengeDetailImageId: challenge.challengeDetailImage?.id ?? null,
  challengeDetailImagePreviewUrl: challenge.challengeDetailImage?.url ?? "",
  howTo: challenge.howTo ?? "",
  firstReward: challenge.winnerPrizes?.find((prize) => prize.rank === 1)?.prize ?? "",
  secondReward: challenge.winnerPrizes?.find((prize) => prize.rank === 2)?.prize ?? "",
  thirdReward: challenge.winnerPrizes?.find((prize) => prize.rank === 3)?.prize ?? "",
  originalVideoUrl: challenge.originalYoutubeUrls?.[0] ?? "",
});

const buildPayload = (form: ChallengeFormState): ChallengePayload => ({
  title: form.title.trim(),
  startAt: fromDatetimeLocal(form.startAt),
  endAt: fromDatetimeLocal(form.endAt),
  bannerImageId: form.bannerImageId,
  challengeDetailImageId: form.challengeDetailImageId,
  likeWeight: normalizeDecimal(form.likeWeight, "1.00"),
  viewWeight: normalizeDecimal(form.viewWeight, "0.10"),
  howTo: form.howTo.trim(),
  winnerPrizes: [
    { rank: 1, prize: form.firstReward.trim() },
    { rank: 2, prize: form.secondReward.trim() },
    { rank: 3, prize: form.thirdReward.trim() },
  ].filter((prize) => prize.prize.length > 0),
  originalYoutubeUrls: form.originalVideoUrl.trim()
    ? [form.originalVideoUrl.trim()]
    : [],
});

const fieldLabel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 7,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--admin-ink-2)",
};

const mutedText: React.CSSProperties = {
  color: "var(--admin-ink-3)",
  fontSize: 12,
  lineHeight: 1.5,
};

const challengeTableColumns = "minmax(260px, 1fr) 72px 132px 92px 42px 104px";

const PreviewBlock: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div>
    <div style={{ textAlign: "center", fontSize: 13, marginBottom: 10, color: "rgba(255,255,255,0.88)", fontWeight: 500 }}>
      {title}
    </div>
    <div
      style={{
        minHeight: 96,
        borderRadius: 9,
        border: "1px solid rgba(101,200,245,0.68)",
        background: "linear-gradient(145deg, #101322 0%, #172132 58%, #236b86 100%)",
        display: "grid",
        placeItems: "center",
        color: "rgba(255,255,255,0.88)",
        fontSize: 12,
        fontWeight: 800,
        textAlign: "center",
        padding: 12,
        whiteSpace: "pre-wrap",
        lineHeight: 1.45,
        boxShadow: "inset 0 0 34px rgba(255,255,255,0.035), 0 8px 24px rgba(0,0,0,0.18)",
      }}
    >
      {children}
    </div>
  </div>
);

const rewardBadgeStyles: Record<string, React.CSSProperties> = {
  "1": {
    background: "linear-gradient(145deg, rgba(196,158,76,0.92), rgba(126,98,44,0.92))",
    color: "#f8edd2",
    border: "1px solid rgba(246,218,146,0.28)",
  },
  "2": {
    background: "linear-gradient(145deg, rgba(166,173,184,0.9), rgba(93,101,116,0.92))",
    color: "#f0f3f7",
    border: "1px solid rgba(230,234,240,0.24)",
  },
  "3": {
    background: "linear-gradient(145deg, rgba(165,108,73,0.9), rgba(93,58,42,0.92))",
    color: "#f2ded0",
    border: "1px solid rgba(224,169,126,0.22)",
  },
};

const PreviewReward: React.FC<{ rank: string; text: string }> = ({ rank, text }) => (
  <div
    style={{
      minHeight: 84,
      borderRadius: 9,
      border: "1px solid rgba(101,200,245,0.68)",
      background: "linear-gradient(145deg, #111226 0%, #17182c 56%, #53457f 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 8,
      color: "rgba(255,255,255,0.88)",
      fontSize: 11,
      fontWeight: 800,
      textAlign: "center",
      padding: 10,
      boxShadow: "inset 0 0 34px rgba(255,255,255,0.035), 0 8px 24px rgba(0,0,0,0.18)",
    }}
  >
    <span
      style={{
        width: 24,
        height: 24,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        fontWeight: 900,
        boxShadow: "none",
        ...rewardBadgeStyles[rank],
      }}
    >
      {rank}
    </span>
    <span style={{ lineHeight: 1.35 }}>{text.trim() || `${rank}등 보상`}</span>
  </div>
);

export default function ChallengePage() {
  const ready = useAdminAuthGuard();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const challengeDetailImageInputRef = useRef<HTMLInputElement | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingChallengeDetailImage, setUploadingChallengeDetailImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ChallengeFormState | null>(null);
  const [apiMode, setApiModeState] = useState<ApiMode>("dev");
  const [allowOverlapInDev, setAllowOverlapInDev] = useState(false);

  useEffect(() => {
    setApiModeState(getApiMode());
    const handleApiModeChange = (event: Event) => {
      const nextMode = (event as CustomEvent<ApiMode>).detail;
      if (nextMode === "dev" || nextMode === "prod") {
        setApiModeState(nextMode);
      }
    };
    window.addEventListener("api-mode-change", handleApiModeChange);
    return () => window.removeEventListener("api-mode-change", handleApiModeChange);
  }, []);

  useEffect(() => {
    setAllowOverlapInDev(false);
  }, [form?.id, apiMode]);

  const loadChallenges = useCallback(() => {
    setLoading(true);
    setError(null);
    getChallenges()
      .then((list) => setChallenges(list ?? []))
      .catch((e) => setError(e?.message ?? "챌린지 목록을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (ready) loadChallenges();
  }, [loadChallenges, ready]);

  const counts = useMemo(() => {
    const active = challenges.filter((c) => c.isActive).length;
    const upcoming = challenges.filter((c) => {
      const start = new Date(c.startAt).getTime();
      return Number.isFinite(start) && Date.now() < start;
    }).length;
    return { active, upcoming, total: challenges.length };
  }, [challenges]);

  const sortedChallenges = useMemo(
    () =>
      [...challenges].sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
      ),
    [challenges]
  );

  const overlappingChallenge = useMemo(() => {
    if (!form?.startAt || !form.endAt) return null;
    if (new Date(form.endAt) <= new Date(form.startAt)) return null;
    return (
      challenges.find((challenge) =>
        challenge.id !== form.id &&
        isDateRangeOverlapping(form.startAt, form.endAt, challenge)
      ) ?? null
    );
  }, [challenges, form]);

  const canSaveOverlappingChallenge = apiMode === "dev" && allowOverlapInDev;

  const uploadImageContent = async (file: File, purpose: "POST_THUMBNAIL" | "POST_IMAGE") => {
    const { width, height } = await getImageDimensions(file);
    const extension = getFileExtension(file);
    const { contentId, url } = await getUrlForUploadImage({
      uploadPurposeQuery: purpose,
      body: { extension, width, height },
    });
    const ok = await putImageToPresignedUrl({
      presignedUrl: url,
      file,
      contentType: file.type || `image/${extension.toLowerCase()}`,
    });
    if (!ok) throw new Error("이미지 업로드에 실패했어요.");
    return { contentId, previewUrl: URL.createObjectURL(file), width, height };
  };

  const handleThumbnailSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !form) return;

    setUploadingThumbnail(true);
    try {
      const { contentId, previewUrl } = await uploadImageContent(file, "POST_THUMBNAIL");
      setForm((current) => current && {
        ...current,
        bannerImageId: contentId,
        bannerImagePreviewUrl: previewUrl,
      });
    } catch (e: any) {
      alert(e?.message ?? "배너 이미지 업로드에 실패했어요.");
    } finally {
      setUploadingThumbnail(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleChallengeDetailImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !form) return;

    setUploadingChallengeDetailImage(true);
    try {
      const { contentId, previewUrl, width, height } = await uploadImageContent(file, "POST_IMAGE");
      setForm((current) => current && {
        ...current,
        challengeDetailImageId: contentId,
        challengeDetailImagePreviewUrl: previewUrl,
      });
      if (width / height > 1.4) {
        alert("가로형 이미지입니다. 앱 상세 화면에서는 세로형 또는 정방형에 가까운 메인 이미지가 더 자연스럽습니다.");
      }
    } catch (e: any) {
      alert(e?.message ?? "메인 이미지 업로드에 실패했어요.");
    } finally {
      setUploadingChallengeDetailImage(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.startAt || !form.endAt) {
      alert("챌린지명, 시작일, 종료일은 필수입니다.");
      return;
    }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      alert("종료일은 시작일보다 뒤여야 합니다.");
      return;
    }
    if (overlappingChallenge && !canSaveOverlappingChallenge) {
      alert(
        [
          "이 기간으로 저장하면 동시에 활성화되는 챌린지가 2개 이상 생깁니다.",
          "",
          `겹치는 챌린지: ${overlappingChallenge.title}`,
          `기간: ${formatDateTime(overlappingChallenge.startAt)} ~ ${formatDateTime(overlappingChallenge.endAt)}`,
        ].join("\n")
      );
      return;
    }
    if (form.originalVideoUrl.trim() && !isValidYoutubeUrl(form.originalVideoUrl)) {
      alert("Original Video는 유효한 YouTube 링크로 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (form.id === null) {
        const created = await createChallenge(payload);
        setChallenges((prev) => [created, ...prev]);
      } else {
        const updated = await updateChallenge(form.id, payload);
        setChallenges((prev) =>
          prev.map((challenge) => (challenge.id === updated.id ? updated : challenge))
        );
      }
      setForm(null);
    } catch (e: any) {
      alert(e?.message ?? "챌린지 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (challenge: Challenge) => {
    if (
      !window.confirm(
        `'${challenge.title}' 챌린지를 삭제할까요?\n앱에서는 더 이상 활성 챌린지로 노출되지 않습니다.`
      )
    ) {
      return;
    }

    try {
      const deleted = await deleteChallenge(challenge.id);
      setChallenges((prev) =>
        prev.map((item) => (item.id === deleted.id ? deleted : item))
      );
      if (form?.id === challenge.id) setForm(null);
    } catch (e: any) {
      alert(e?.message ?? "챌린지 삭제에 실패했어요.");
    }
  };

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="챌린지 관리"
        title="챌린지 운영 설정"
        subtitle={
          <>
            총 <strong style={{ color: "var(--admin-ink)" }}>{counts.total}</strong>개 ·
            진행중 {counts.active} · 예정 {counts.upcoming}
          </>
        }
        action={
          <button style={btnPrimary} onClick={() => setForm(createEmptyForm())}>
            + 새 챌린지 생성
          </button>
        }
      >
        <div className="zg-split" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18 }}>
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ ...adminCardStyle, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>챌린지 목록</div>
                  <div style={mutedText}>릴스는 앱에서만 보여주고, 여기서는 챌린지 운영 정보를 관리합니다.</div>
                </div>
                <button style={btnSecondary} onClick={loadChallenges} disabled={loading}>
                  새로고침
                </button>
              </div>

              <div className="zg-table-scroll">
                <div className="zg-table-inner" style={{ minWidth: 0, width: "100%" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: challengeTableColumns,
                      gap: 8,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--admin-border)",
                      color: "var(--admin-ink-3)",
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    <span>챌린지</span>
                    <span>상태</span>
                    <span>기간</span>
                    <span>랭킹 가중치</span>
                    <span>릴스</span>
                    <span style={{ textAlign: "right" }}>액션</span>
                  </div>

                  {loading && (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
                      불러오는 중…
                    </div>
                  )}
                  {!loading && error && (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--admin-red)", fontSize: 13 }}>
                      {error}
                    </div>
                  )}
                  {!loading && !error && sortedChallenges.length === 0 && (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
                      등록된 챌린지가 없습니다.
                    </div>
                  )}

                  {!loading &&
                    !error &&
                    sortedChallenges.map((challenge) => {
                      const status = challengeStatus(challenge);
                      return (
                        <div
                          key={challenge.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: challengeTableColumns,
                            gap: 8,
                            alignItems: "center",
                            padding: "14px 0",
                            borderBottom: "1px solid var(--admin-border)",
                            fontSize: 13,
                          }}
                        >
                          <div style={{ display: "flex", gap: 10, minWidth: 0, alignItems: "center" }}>
                            <div
                              style={{
                                width: 46,
                                height: 46,
                                borderRadius: 12,
                                background: "var(--admin-blue-tint)",
                                overflow: "hidden",
                                flexShrink: 0,
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              {challenge.bannerImage?.url ? (
                                <img
                                  src={challenge.bannerImage.url}
                                  alt=""
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <AdminIcon name="award" size={22} opacity={0.65} />
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                {challenge.title}
                              </div>
                              <div style={{ ...mutedText, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                {challenge.howTo || "참여 방법 없음"}
                              </div>
                            </div>
                          </div>
                          <span
                            style={{
                              justifySelf: "start",
                              padding: "5px 9px",
                              borderRadius: 999,
                              background: status.tint,
                              color: status.color,
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {status.label}
                          </span>
                          <div style={{ color: "var(--admin-ink-2)", lineHeight: 1.5 }}>
                            <div>{formatDateTime(challenge.startAt)}</div>
                            <div>{formatDateTime(challenge.endAt)}</div>
                          </div>
                          <div style={{ color: "var(--admin-ink-2)", lineHeight: 1.5 }}>
                            <div>좋아요 {challenge.likeWeight}</div>
                            <div>조회 {challenge.viewWeight}</div>
                          </div>
                          <span style={{ fontWeight: 800 }}>{challenge.reelCount}</span>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button style={btnSecondary} onClick={() => setForm(toForm(challenge))}>
                              수정
                            </button>
                            <button
                              style={{
                                ...btnSecondary,
                                color: "var(--admin-red-ink)",
                                borderColor: "var(--admin-red-tint)",
                              }}
                              onClick={() => handleDelete(challenge)}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </section>

          <div style={{ ...adminCardStyle, padding: 18, background: "#fffdf8" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <AdminIcon name="flag" size={18} opacity={0.72} />
              <div style={{ fontSize: 14, fontWeight: 800 }}>챌린지 상세 정보 항목</div>
            </div>
            <div style={{ ...mutedText }}>
              메인 이미지, 참여 방법, 1/2/3등 보상, Original Video 링크를 고정 입력 구조로 관리합니다.
              백엔드 반영 후 이 값들이 앱 상세 화면에 함께 노출됩니다.
            </div>
          </div>
        </div>
      </PageShell>

      {form && (
        <Modal
          isOpen={Boolean(form)}
          onClose={() => setForm(null)}
          title={form.id === null ? "새 챌린지 생성" : `챌린지 수정 #${form.id}`}
          sizeMode="LARGE"
        >
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 20, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
              <section style={{ ...adminCardStyle, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>기본 정보</div>
                <label style={fieldLabel}>
                  챌린지명
                  <input
                    style={inputStyle}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="예: 7월 댄스 챌린지"
                  />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, marginTop: 12 }}>
                  <label style={fieldLabel}>
                    시작일
                    <input
                      type="datetime-local"
                      style={inputStyle}
                      value={form.startAt}
                      onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                    />
                  </label>
                  <label style={fieldLabel}>
                    종료일
                    <input
                      type="datetime-local"
                      style={inputStyle}
                      value={form.endAt}
                      onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                    />
                  </label>
                </div>
                {overlappingChallenge && (
                  <div
                    style={{
                      marginTop: 10,
                      border: "1px solid rgba(255,59,48,0.22)",
                      borderRadius: 10,
                      background: "rgba(255,59,48,0.06)",
                      color: "#d92d20",
                      padding: "10px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.55,
                    }}
                  >
                    <div>이 기간으로 저장하면 동시에 활성화되는 챌린지가 2개 이상 생깁니다.</div>
                    <div style={{ color: "var(--admin-ink-2)", fontWeight: 600 }}>
                      겹치는 챌린지: {overlappingChallenge.title} · {formatDateTime(overlappingChallenge.startAt)} ~ {formatDateTime(overlappingChallenge.endAt)}
                    </div>
                    {apiMode === "dev" ? (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 10,
                          color: "var(--admin-ink-1)",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allowOverlapInDev}
                          onChange={(e) => setAllowOverlapInDev(e.target.checked)}
                        />
                        개발 환경 테스트용으로 겹침 허용
                      </label>
                    ) : (
                      <div style={{ marginTop: 8, color: "#d92d20" }}>
                        Prod 서버에서는 겹치는 기간으로 저장할 수 없습니다.
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, marginTop: 12 }}>
                  <label style={fieldLabel}>
                    좋아요 가중치
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      style={inputStyle}
                      value={form.likeWeight}
                      onChange={(e) => setForm({ ...form, likeWeight: e.target.value })}
                    />
                    <span style={mutedText}>랭킹 점수 계산 시 좋아요 1개에 곱해지는 값입니다.</span>
                  </label>
                  <label style={fieldLabel}>
                    조회수 가중치
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      style={inputStyle}
                      value={form.viewWeight}
                      onChange={(e) => setForm({ ...form, viewWeight: e.target.value })}
                    />
                    <span style={mutedText}>랭킹 점수 계산 시 조회수 1회에 곱해지는 값입니다.</span>
                  </label>
                </div>
              </section>

              <section style={{ ...adminCardStyle, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>배너 이미지</div>
                <button
                  type="button"
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 5",
                    border: "1px dashed var(--admin-border)",
                    borderRadius: 14,
                    background: "#fafbfc",
                    overflow: "hidden",
                    display: "grid",
                    placeItems: "center",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingThumbnail}
                >
                  {form.bannerImagePreviewUrl ? (
                    <img
                      src={form.bannerImagePreviewUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }}
                    />
                  ) : (
                    <span style={{ color: "var(--admin-ink-3)", fontSize: 13, fontWeight: 700 }}>
                      {uploadingThumbnail ? "업로드 중…" : "16:5 배너 이미지 선택"}
                    </span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleThumbnailSelect}
                />
                <div style={{ ...mutedText, marginTop: 8 }}>
                  앱 챌린지 목록 상단 배너에 노출될 이미지입니다.
                </div>
              </section>

              <section style={{ ...adminCardStyle, padding: 16, borderColor: "rgba(0,122,255,0.22)", background: "#f8fbff" }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>챌린지 상세 정보</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ ...fieldLabel, gap: 0 }}>메인 이미지</div>
                    <button
                      type="button"
                      style={{
                        width: "100%",
                        minHeight: 220,
                        border: "1px dashed rgba(0,122,255,0.34)",
                        borderRadius: 14,
                        background: "#fff",
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                      }}
                      onClick={() => challengeDetailImageInputRef.current?.click()}
                      disabled={uploadingChallengeDetailImage}
                    >
                      {form.challengeDetailImagePreviewUrl ? (
                        <img
                          src={form.challengeDetailImagePreviewUrl}
                          alt=""
                          style={{ width: "100%", maxHeight: 360, objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ color: "var(--admin-ink-3)", fontSize: 13, fontWeight: 700 }}>
                          {uploadingChallengeDetailImage ? "업로드 중…" : "메인 이미지 선택"}
                        </span>
                      )}
                    </button>
                    <input
                      ref={challengeDetailImageInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleChallengeDetailImageSelect}
                    />
                    <div style={mutedText}>앱 챌린지 상세 화면 상단에 크게 노출될 이미지입니다.</div>
                  </div>

                  <label style={fieldLabel}>
                    How to
                    <textarea
                      style={{ ...inputStyle, minHeight: 96, height: 96, padding: 12, resize: "vertical", lineHeight: 1.5 }}
                      value={form.howTo}
                      onChange={(e) => setForm({ ...form, howTo: e.target.value })}
                      placeholder="참여 방법을 입력하세요"
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    <label style={fieldLabel}>
                      1등 보상
                      <input
                        style={inputStyle}
                        value={form.firstReward}
                        onChange={(e) => setForm({ ...form, firstReward: e.target.value })}
                        placeholder="예: 피드백 티켓 5장"
                      />
                    </label>
                    <label style={fieldLabel}>
                      2등 보상
                      <input
                        style={inputStyle}
                        value={form.secondReward}
                        onChange={(e) => setForm({ ...form, secondReward: e.target.value })}
                        placeholder="예: 피드백 티켓 3장"
                      />
                    </label>
                    <label style={fieldLabel}>
                      3등 보상
                      <input
                        style={inputStyle}
                        value={form.thirdReward}
                        onChange={(e) => setForm({ ...form, thirdReward: e.target.value })}
                        placeholder="예: 피드백 티켓 1장"
                      />
                    </label>
                  </div>

                  <label style={fieldLabel}>
                    Original Video
                    <input
                      style={inputStyle}
                      value={form.originalVideoUrl}
                      onChange={(e) => setForm({ ...form, originalVideoUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <span style={mutedText}>유튜브 링크 1개를 입력합니다.</span>
                  </label>
                </div>
              </section>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingBottom: 8 }}>
                <button style={btnSecondary} onClick={() => setForm(null)} disabled={saving}>
                  취소
                </button>
                <button style={btnPrimary} onClick={handleSave} disabled={saving || uploadingThumbnail || uploadingChallengeDetailImage}>
                  {saving ? "저장 중…" : "저장"}
                </button>
              </div>
            </div>

            <aside style={{ position: "sticky", top: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                앱 상세 미리보기
              </div>
              <div
                style={{
                  borderRadius: 22,
                  background:
                    "radial-gradient(circle at 72% 18%, rgba(96,196,242,0.12), transparent 30%), radial-gradient(circle at 32% 42%, rgba(255,255,255,0.08), transparent 22%), #050606",
                  color: "#fff",
                  padding: 18,
                  minHeight: 640,
                  overflow: "hidden",
                  boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
                }}
              >
                <div style={{ border: "1px solid rgba(255,255,255,0.58)", borderRadius: 12, padding: "18px 12px 24px" }}>
                  <div
                    style={{
                      borderRadius: 10,
                      padding: "26px 16px 28px",
                      marginBottom: 0,
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 18%, rgba(0,0,0,0.82) 42%, rgba(255,255,255,0.08) 58%, rgba(0,0,0,0.92)), repeating-linear-gradient(112deg, rgba(255,255,255,0.22) 0 1px, rgba(255,255,255,0.03) 1px 42px, rgba(0,0,0,0) 42px 84px)",
                      boxShadow: "inset 0 0 44px rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                      <img
                        src="/images/godition_logo.png"
                        alt="GODITION"
                        style={{ width: 86, height: "auto", objectFit: "contain" }}
                      />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "7px 16px 8px",
                          background: "rgba(0,0,0,0.72)",
                          color: "#fff",
                          fontSize: 27,
                          lineHeight: 1,
                          fontWeight: 300,
                          letterSpacing: 0,
                          boxShadow: "0 12px 26px rgba(0,0,0,0.26)",
                        }}
                      >
                        Monthly Challenge
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      margin: "0 -12px 16px",
                      height: 38,
                      background: "#65c8f5",
                      borderTop: "1px solid rgba(255,255,255,0.62)",
                      borderBottom: "1px solid rgba(0,0,0,0.38)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      gap: 24,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {brandRibbonItems.map((item, index) => (
                      <span
                        key={`${item}-${index}`}
                        style={{
                          color: "#fff",
                          fontSize: 21,
                          lineHeight: 1,
                          fontWeight: item === "ZIGG" ? 900 : 400,
                          letterSpacing: 0,
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      position: "relative",
                      borderRadius: 0,
                      overflow: "hidden",
                      minHeight: 270,
                      background: "linear-gradient(145deg, #111322, #17211f 58%, #243430)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {form.challengeDetailImagePreviewUrl ? (
                      <img
                        src={form.challengeDetailImagePreviewUrl}
                        alt=""
                        style={{ width: "100%", height: 300, objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ color: "rgba(255,255,255,0.56)", fontSize: 13, fontWeight: 700 }}>
                        메인 이미지
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 26 }}>
                    <PreviewBlock title="How to">
                      {form.howTo.trim() || "참여 방법을 입력하세요"}
                    </PreviewBlock>
                    <div>
                      <div style={{ textAlign: "center", fontSize: 13, marginBottom: 10, color: "rgba(255,255,255,0.88)", fontWeight: 500 }}>
                        Reward
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                        <PreviewReward rank="1" text={form.firstReward} />
                        <PreviewReward rank="2" text={form.secondReward} />
                        <PreviewReward rank="3" text={form.thirdReward} />
                      </div>
                    </div>
                    <PreviewBlock title="Original Video">
                      {getYoutubeVideoId(form.originalVideoUrl)
                        ? "YouTube 링크 입력됨"
                        : "유튜브 링크를 입력하세요"}
                    </PreviewBlock>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}
