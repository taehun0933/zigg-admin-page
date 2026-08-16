"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/Modal";
import AdminIcon from "@/components/admin/AdminIcon";
import {
  adminCardStyle,
  btnPrimary,
  btnSecondary,
  inputStyle,
} from "@/components/admin/PageShell";
import {
  Challenge,
  ChallengeRankingEntry,
  ChallengeRewardGrant,
  distributeChallengeRewards,
  getChallengeRanking,
} from "@/apis/challenge";

const PAGE_SIZE = 20;
const REWARD_RANKS = [1, 2, 3] as const;

const mutedText: React.CSSProperties = {
  color: "var(--admin-ink-3)",
  fontSize: 12,
  lineHeight: 1.5,
};

const medalStyles: Record<number, React.CSSProperties> = {
  1: {
    background: "linear-gradient(145deg, rgba(196,158,76,0.92), rgba(126,98,44,0.92))",
    color: "#f8edd2",
    border: "1px solid rgba(246,218,146,0.28)",
  },
  2: {
    background: "linear-gradient(145deg, rgba(166,173,184,0.9), rgba(93,101,116,0.92))",
    color: "#f0f3f7",
    border: "1px solid rgba(230,234,240,0.24)",
  },
  3: {
    background: "linear-gradient(145deg, rgba(165,108,73,0.9), rgba(93,58,42,0.92))",
    color: "#f2ded0",
    border: "1px solid rgba(224,169,126,0.22)",
  },
};

const rankingTableColumns =
  "52px minmax(220px, 1fr) 150px 64px 64px 56px 84px 118px 96px 88px";

// 서버 LocalDateTime 은 UTC 벽시계 기준의 존 없는 문자열 → UTC 로 파싱해야 KST 표시가 맞는다
const parseServerDate = (value: string) =>
  new Date(/(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`);

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = parseServerDate(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatScore = (score: number | string) => {
  const n = Number(score);
  return Number.isFinite(n) ? n.toFixed(2) : String(score);
};

const creatorLabel = (entry: ChallengeRankingEntry) =>
  entry.reel.creator?.nickname || entry.reel.creator?.name || "탈퇴한 유저";

// "피드백 티켓 5장" 처럼 티켓 보상이 명시된 문구에서만 티켓 수 프리필 (일반 숫자는 무시)
const guessTicketAmount = (prize?: string) => {
  const match = prize?.match(/티켓\s*(\d+)\s*장?/);
  return match ? match[1] : "";
};

const MedalBadge: React.FC<{ rank: number; size?: number }> = ({ rank, size = 26 }) => {
  if (rank >= 1 && rank <= 3) {
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          display: "inline-grid",
          placeItems: "center",
          fontWeight: 900,
          fontSize: size * 0.5,
          flexShrink: 0,
          ...medalStyles[rank],
        }}
      >
        {rank}
      </span>
    );
  }
  return (
    <span style={{ fontWeight: 800, fontSize: 13, color: "var(--admin-ink-2)" }}>
      {rank}
    </span>
  );
};

const Thumbnail: React.FC<{ entry: ChallengeRankingEntry; width: number; height: number; radius?: number }> = ({
  entry,
  width,
  height,
  radius = 10,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: radius,
      background: "#101322",
      overflow: "hidden",
      flexShrink: 0,
      display: "grid",
      placeItems: "center",
    }}
  >
    {entry.reel.video.thumbnail?.url ? (
      <img
        src={entry.reel.video.thumbnail.url}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    ) : (
      <AdminIcon name="play" size={Math.min(width, height) * 0.4} opacity={0.5} />
    )}
  </div>
);

const RewardedBadge: React.FC<{ amount: number }> = ({ amount }) => (
  <span
    style={{
      padding: "4px 8px",
      borderRadius: 999,
      background: "var(--admin-good-tint)",
      color: "var(--admin-good)",
      fontSize: 11,
      fontWeight: 800,
      whiteSpace: "nowrap",
    }}
  >
    지급완료 · {amount}장
  </span>
);

interface ChallengeRankingTabProps {
  challenges: Challenge[];
  challengesLoading: boolean;
  challengesError: string | null;
}

export default function ChallengeRankingTab({
  challenges,
  challengesLoading,
  challengesError,
}: ChallengeRankingTabProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [entries, setEntries] = useState<ChallengeRankingEntry[]>([]);
  const [topEntries, setTopEntries] = useState<ChallengeRankingEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<number, string>>({ 1: "", 2: "", 3: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [granting, setGranting] = useState(false);
  const [videoEntry, setVideoEntry] = useState<ChallengeRankingEntry | null>(null);
  const reqSeq = useRef(0);

  const selected = useMemo(
    () => challenges.find((c) => c.id === selectedId) ?? null,
    [challenges, selectedId]
  );
  // 진행중인 챌린지는 순위가 계속 바뀌므로 종료 전 보상 지급을 막는다
  const isOngoing = Boolean(selected?.isActive);

  useEffect(() => {
    if (challenges.length === 0) return;
    // 최초 진입 또는 선택했던 챌린지가 목록에서 사라진 경우(삭제) 첫 챌린지로 폴백
    if (selectedId === null || !challenges.some((c) => c.id === selectedId)) {
      setSelectedId(challenges[0].id);
      setPage(0);
      setTopEntries([]);
    }
  }, [challenges, selectedId]);

  const loadRanking = useCallback(
    async (challengeId: number, targetPage: number) => {
      const seq = ++reqSeq.current;
      setLoading(true);
      setError(null);
      try {
        const data = await getChallengeRanking(challengeId, targetPage, PAGE_SIZE);
        if (seq !== reqSeq.current) return; // 늦게 도착한 이전 요청 응답은 버린다
        setEntries(data.content ?? []);
        setTotalPages(data.totalPages ?? 0);
        setTotalElements(data.totalElements ?? 0);
        if (targetPage === 0) {
          setTopEntries((data.content ?? []).filter((entry) => entry.rank <= 3));
        }
      } catch (e: any) {
        if (seq !== reqSeq.current) return;
        setError(e?.message ?? "랭킹을 불러오지 못했어요.");
        setEntries([]);
        if (targetPage === 0) setTopEntries([]);
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedId !== null) {
      loadRanking(selectedId, page);
    }
  }, [selectedId, page, loadRanking]);

  const selectChallenge = (challengeId: number) => {
    if (challengeId === selectedId) return;
    const challenge = challenges.find((c) => c.id === challengeId);
    setSelectedId(challengeId);
    setPage(0);
    setTopEntries([]);
    setAmounts({
      1: guessTicketAmount(challenge?.winnerPrizes?.find((p) => p.rank === 1)?.prize),
      2: guessTicketAmount(challenge?.winnerPrizes?.find((p) => p.rank === 2)?.prize),
      3: guessTicketAmount(challenge?.winnerPrizes?.find((p) => p.rank === 3)?.prize),
    });
  };

  // 첫 진입 시 기본 선택 챌린지에도 보상 문구 프리필 적용
  useEffect(() => {
    if (selected) {
      setAmounts((prev) => ({
        1: prev[1] || guessTicketAmount(selected.winnerPrizes?.find((p) => p.rank === 1)?.prize),
        2: prev[2] || guessTicketAmount(selected.winnerPrizes?.find((p) => p.rank === 2)?.prize),
        3: prev[3] || guessTicketAmount(selected.winnerPrizes?.find((p) => p.rank === 3)?.prize),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const winnerOf = useCallback(
    (rank: number) => topEntries.find((entry) => entry.rank === rank) ?? null,
    [topEntries]
  );

  const pendingGrants = useMemo(() => {
    const grants: (ChallengeRewardGrant & { entry: ChallengeRankingEntry })[] = [];
    for (const rank of REWARD_RANKS) {
      const entry = winnerOf(rank);
      if (!entry || entry.reward || !entry.reel.creator) continue;
      const amount = Number(amounts[rank]);
      if (!Number.isInteger(amount) || amount < 1) continue;
      grants.push({ reelId: entry.reel.id, rank, amount, entry });
    }
    return grants;
  }, [amounts, winnerOf]);

  // 빈칸이 아닌데 1 이상의 정수가 아닌 입력 (지급 버튼 차단 + 빨간 테두리)
  const invalidRanks = useMemo(
    () =>
      REWARD_RANKS.filter((rank) => {
        const entry = winnerOf(rank);
        if (!entry || entry.reward || !entry.reel.creator) return false;
        const raw = amounts[rank].trim();
        if (raw === "") return false;
        const n = Number(raw);
        return !Number.isInteger(n) || n < 1;
      }),
    [amounts, winnerOf]
  );

  const handleGrant = async () => {
    if (!selected || pendingGrants.length === 0) return;
    setGranting(true);
    try {
      const result = await distributeChallengeRewards(
        selected.id,
        pendingGrants.map(({ reelId, rank, amount }) => ({ reelId, rank, amount }))
      );
      setConfirmOpen(false);
      alert(
        [
          "티켓 보상 지급 완료!",
          ...result.grants.map(
            (g) => `${g.rank}등 ${g.nickname ?? `유저 #${g.userId}`} — 티켓 ${g.amount}장`
          ),
          `총 ${result.totalAmount}장 지급`,
        ].join("\n")
      );
      if (page === 0) {
        await loadRanking(selected.id, 0);
      } else {
        setPage(0); // [selectedId, page] effect 가 0페이지를 다시 불러온다
      }
    } catch (e: any) {
      alert(e?.message ?? "티켓 지급에 실패했어요.");
    } finally {
      setGranting(false);
    }
  };

  if (challengesLoading) {
    return (
      <div style={{ ...adminCardStyle, padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
        챌린지 목록을 불러오는 중…
      </div>
    );
  }

  if (challengesError) {
    return (
      <div style={{ ...adminCardStyle, padding: 40, textAlign: "center", color: "var(--admin-red)", fontSize: 13 }}>
        {challengesError}
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div style={{ ...adminCardStyle, padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
        등록된 챌린지가 없습니다. 먼저 챌린지를 생성해주세요.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 챌린지 선택 칩 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {challenges.map((challenge) => {
          const on = challenge.id === selectedId;
          return (
            <button
              key={challenge.id}
              onClick={() => selectChallenge(challenge.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: on ? "1px solid var(--admin-blue)" : "1px solid var(--admin-border)",
                background: on ? "var(--admin-blue-tint)" : "#fff",
                color: on ? "var(--admin-blue)" : "var(--admin-ink-2)",
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {challenge.title}
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, opacity: 0.75 }}>
                {challenge.isActive ? "진행중" : parseServerDate(challenge.startAt).getTime() > Date.now() ? "예정" : "종료"}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ ...adminCardStyle, padding: "12px 16px", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{selected.title}</span>
          <span style={mutedText}>
            {formatDateTime(selected.startAt)} ~ {formatDateTime(selected.endAt)}
          </span>
          <span style={mutedText}>참여 릴스 {totalElements.toLocaleString()}개</span>
          <span style={mutedText}>
            점수 = 좋아요×{selected.likeWeight} + 조회수×{selected.viewWeight}
          </span>
          {selected.isActive && (
            <span
              style={{
                padding: "4px 9px",
                borderRadius: 999,
                background: "rgba(255,149,0,0.12)",
                color: "#c77700",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              진행중 — 순위가 계속 바뀔 수 있어요
            </span>
          )}
        </div>
      )}

      {/* TOP 3 + 보상 지급 */}
      <div className="zg-split" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 1fr)", gap: 14 }}>
        {/* 포디움 */}
        <div style={{ ...adminCardStyle, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>TOP 3</div>
          {topEntries.length === 0 && !loading ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
              아직 참여 영상이 없습니다.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {REWARD_RANKS.map((rank) => {
                const entry = winnerOf(rank);
                if (!entry) {
                  return (
                    <div
                      key={rank}
                      style={{
                        border: "1px dashed var(--admin-border)",
                        borderRadius: 14,
                        minHeight: 220,
                        display: "grid",
                        placeItems: "center",
                        color: "var(--admin-ink-3)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {rank}등 없음
                    </div>
                  );
                }
                return (
                  <div
                    key={rank}
                    style={{
                      border: "1px solid var(--admin-border)",
                      borderRadius: 14,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      background: "#fff",
                    }}
                  >
                    <button
                      onClick={() => setVideoEntry(entry)}
                      style={{ position: "relative", display: "block", width: "100%", padding: 0 }}
                      title="영상 보기"
                    >
                      <div style={{ width: "100%", aspectRatio: "3 / 4", background: "#101322", overflow: "hidden", display: "grid", placeItems: "center" }}>
                        {entry.reel.video.thumbnail?.url ? (
                          <img
                            src={entry.reel.video.thumbnail.url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <AdminIcon name="play" size={30} opacity={0.5} />
                        )}
                      </div>
                      <span style={{ position: "absolute", top: 8, left: 8 }}>
                        <MedalBadge rank={rank} size={28} />
                      </span>
                      <span
                        style={{
                          position: "absolute",
                          right: 8,
                          bottom: 8,
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "rgba(0,0,0,0.62)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        ▶ 재생
                      </span>
                    </button>
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        {entry.reel.creator?.profileImage?.url ? (
                          <img
                            src={entry.reel.creator.profileImage.url}
                            alt=""
                            style={{ width: 20, height: 20, borderRadius: 999, objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              background: "var(--admin-blue-tint)",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 10,
                              fontWeight: 800,
                              color: "var(--admin-blue)",
                              flexShrink: 0,
                            }}
                          >
                            {creatorLabel(entry).slice(0, 1)}
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {creatorLabel(entry)}
                        </span>
                      </div>
                      <div style={{ ...mutedText, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span>♥ {entry.reel.likeCount.toLocaleString()}</span>
                        <span>조회 {entry.reel.viewCount.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--admin-blue)" }}>
                          {formatScore(entry.score)}점
                        </span>
                        {entry.reward && <RewardedBadge amount={entry.reward.amount} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 티켓 보상 지급 */}
        <div style={{ ...adminCardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>티켓 보상 지급</div>
            <div style={mutedText}>순위별 티켓 수를 입력하고 지급하면 유저에게 실제 티켓이 지급됩니다.</div>
          </div>

          {REWARD_RANKS.map((rank) => {
            const entry = winnerOf(rank);
            const prizeText = selected?.winnerPrizes?.find((p) => p.rank === rank)?.prize;
            const disabled = isOngoing || !entry || Boolean(entry.reward) || !entry.reel.creator;
            return (
              <div
                key={rank}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px solid var(--admin-border)",
                  borderRadius: 12,
                  background: entry?.reward ? "var(--admin-bg)" : "#fff",
                }}
              >
                <MedalBadge rank={rank} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {entry ? creatorLabel(entry) : "해당 순위 없음"}
                  </div>
                  <div style={{ ...mutedText, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {entry?.reward
                      ? `지급완료 · ${formatDateTime(entry.reward.rewardedAt)}`
                      : prizeText || "설정된 보상 없음"}
                  </div>
                </div>
                {entry?.reward ? (
                  <RewardedBadge amount={entry.reward.amount} />
                ) : (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--admin-ink-2)" }}>
                    티켓
                    <input
                      type="number"
                      min={1}
                      step={1}
                      max={100000}
                      value={amounts[rank]}
                      disabled={disabled}
                      onChange={(e) => setAmounts((prev) => ({ ...prev, [rank]: e.target.value }))}
                      style={{
                        ...inputStyle,
                        width: 72,
                        textAlign: "right",
                        ...(invalidRanks.includes(rank)
                          ? { border: "1px solid var(--admin-red)" }
                          : {}),
                      }}
                    />
                    장
                  </label>
                )}
              </div>
            );
          })}

          <button
            style={{
              ...btnPrimary,
              opacity: isOngoing || pendingGrants.length === 0 || invalidRanks.length > 0 ? 0.5 : 1,
            }}
            disabled={isOngoing || pendingGrants.length === 0 || invalidRanks.length > 0 || granting}
            onClick={() => setConfirmOpen(true)}
          >
            {isOngoing ? "진행중 — 종료 후 지급 가능" : "티켓 보상 지급하기"}
          </button>
          {isOngoing && (
            <div
              style={{
                border: "1px solid rgba(255,149,0,0.3)",
                borderRadius: 10,
                background: "rgba(255,149,0,0.08)",
                color: "#c77700",
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.55,
              }}
            >
              진행중인 챌린지는 순위가 계속 바뀔 수 있어서, 챌린지가 종료된 뒤에 보상을 지급할 수 있어요.
            </div>
          )}
          {!isOngoing && invalidRanks.length > 0 && (
            <div style={{ ...mutedText, color: "var(--admin-red)" }}>
              티켓 수는 1 이상의 정수만 입력할 수 있어요.
            </div>
          )}
          <div style={mutedText}>
            이미 지급된 순위는 다시 지급되지 않습니다. 지급 시 유저에게 푸시 알림이 발송됩니다.
          </div>
        </div>
      </div>

      {/* 전체 랭킹 테이블 */}
      <div style={{ ...adminCardStyle, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>전체 랭킹</div>
            <div style={mutedText}>4등 이하 포함, 랭킹 점수순 전체 참여 영상입니다.</div>
          </div>
          <button
            style={btnSecondary}
            onClick={() => selectedId !== null && loadRanking(selectedId, page)}
            disabled={loading}
          >
            새로고침
          </button>
        </div>

        <div className="zg-table-scroll">
          <div className="zg-table-inner" style={{ minWidth: 1064 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: rankingTableColumns,
                gap: 8,
                padding: "10px 0",
                borderBottom: "1px solid var(--admin-border)",
                color: "var(--admin-ink-3)",
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              <span>순위</span>
              <span>영상</span>
              <span>크리에이터</span>
              <span>좋아요</span>
              <span>조회수</span>
              <span>댓글</span>
              <span>점수</span>
              <span>업로드</span>
              <span>보상</span>
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
            {!loading && !error && entries.length === 0 && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
                참여 영상이 없습니다.
              </div>
            )}

            {!loading &&
              !error &&
              entries.map((entry) => (
                <div
                  key={entry.reel.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: rankingTableColumns,
                    gap: 8,
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--admin-border)",
                    fontSize: 13,
                  }}
                >
                  <span>
                    <MedalBadge rank={entry.rank} />
                  </span>
                  <div style={{ display: "flex", gap: 10, minWidth: 0, alignItems: "center" }}>
                    <Thumbnail entry={entry} width={42} height={56} />
                    <span style={{ ...mutedText, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {entry.reel.description || "설명 없음"}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {creatorLabel(entry)}
                  </span>
                  <span>{entry.reel.likeCount.toLocaleString()}</span>
                  <span>{entry.reel.viewCount.toLocaleString()}</span>
                  <span>{entry.reel.commentCount.toLocaleString()}</span>
                  <span style={{ fontWeight: 800, color: "var(--admin-blue)" }}>{formatScore(entry.score)}</span>
                  <span style={{ color: "var(--admin-ink-2)", fontSize: 12 }}>{formatDateTime(entry.reel.createdAt)}</span>
                  <span>{entry.reward ? <RewardedBadge amount={entry.reward.amount} /> : <span style={mutedText}>-</span>}</span>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={btnSecondary} onClick={() => setVideoEntry(entry)}>
                      영상 보기
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 14 }}>
            <button
              style={btnSecondary}
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              이전
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--admin-ink-2)" }}>
              {page + 1} / {totalPages}
            </span>
            <button
              style={btnSecondary}
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 영상 미리보기 모달 */}
      {videoEntry && (
        <Modal
          isOpen={Boolean(videoEntry)}
          onClose={() => setVideoEntry(null)}
          title={`${videoEntry.rank}위 · ${creatorLabel(videoEntry)}`}
          sizeMode="MIDDLE"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                width: "100%",
                height: 480,
                background: "#000",
                borderRadius: 12,
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
              }}
            >
              <video
                key={videoEntry.reel.id}
                src={videoEntry.reel.video.url}
                controls
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              >
                동영상을 지원하지 않는 브라우저입니다.
              </video>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--admin-blue)" }}>
                {formatScore(videoEntry.score)}점
              </span>
              <span style={mutedText}>♥ {videoEntry.reel.likeCount.toLocaleString()}</span>
              <span style={mutedText}>조회 {videoEntry.reel.viewCount.toLocaleString()}</span>
              <span style={mutedText}>댓글 {videoEntry.reel.commentCount.toLocaleString()}</span>
              <span style={mutedText}>{formatDateTime(videoEntry.reel.createdAt)}</span>
              {videoEntry.reward && <RewardedBadge amount={videoEntry.reward.amount} />}
            </div>
            {videoEntry.reel.description && (
              <div style={{ fontSize: 13, color: "var(--admin-ink-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {videoEntry.reel.description}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 지급 확인 모달 */}
      {confirmOpen && selected && (
        <Modal
          isOpen={confirmOpen}
          onClose={() => !granting && setConfirmOpen(false)}
          title="티켓 보상 지급 확인"
          sizeMode="SMALL"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "var(--admin-ink-2)", lineHeight: 1.6 }}>
              <strong>{selected.title}</strong> 챌린지의 아래 유저에게 티켓이{" "}
              <strong style={{ color: "var(--admin-red-ink, #d92d20)" }}>실제로 지급</strong>됩니다.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingGrants.map((grant) => (
                <div
                  key={grant.rank}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    border: "1px solid var(--admin-border)",
                    borderRadius: 10,
                  }}
                >
                  <MedalBadge rank={grant.rank} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 800, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {creatorLabel(grant.entry)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--admin-blue)" }}>
                    티켓 {grant.amount}장
                  </span>
                </div>
              ))}
            </div>
            {selected.isActive && (
              <div
                style={{
                  border: "1px solid rgba(255,149,0,0.3)",
                  borderRadius: 10,
                  background: "rgba(255,149,0,0.08)",
                  color: "#c77700",
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.55,
                }}
              >
                아직 진행중인 챌린지입니다. 종료 전 지급하면 이후 순위가 바뀔 수 있어요.
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btnSecondary} onClick={() => setConfirmOpen(false)} disabled={granting}>
                취소
              </button>
              <button style={btnPrimary} onClick={handleGrant} disabled={granting}>
                {granting ? "지급 중…" : `총 ${pendingGrants.reduce((sum, g) => sum + g.amount, 0)}장 지급 확정`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
