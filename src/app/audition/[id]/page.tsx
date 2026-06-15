"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import AdminIcon from "@/components/admin/AdminIcon";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { adminCardStyle, btnPrimary, btnSecondary } from "@/components/admin/PageShell";
import ApplicantDetailModal from "@/components/ApplicantDetailModal";
import {
  AuditionFilterType,
  getAuditionInfo,
  getAuditions,
  scrapApplicant,
  deleteScrapApplicant,
  likeApplicant,
  deleteLikeApplicant,
} from "@/apis/audition";
import { AuditionProfileType } from "@/types/audition";
import { countryNameKo } from "@/utils/countryName";
import { Audition } from "@/app/audition/page";

const nfmt = (n: number) => n.toLocaleString("ko-KR");
const GROUP_SIZE = 10;
// Sticky 영역 합산(탑바 60 + 칩/필터 sticky 약 132). 스크롤 점프·인덱스 계산 시 사용.
const STICKY_OFFSET = 200;

interface FilterOpt {
  id: AuditionFilterType;
  label: string;
}
const FILTERS: FilterOpt[] = [
  { id: "all", label: "모두" },
  { id: "scrap", label: "북마크" },
  { id: "like", label: "합격자" },
  { id: "acceptFeedback", label: "피드백 수락" },
];

const CHIP_COLORS = ["#007aff", "#2dbd6f", "#cc7a00", "#c0337a", "#6b3ec9", "#1a1a1f"];

// 포지션 필터 — 지원서(client-reactNative AuditionApplicationScreen)에서
// desiredPosition 은 Vocal/Dance/Rap 3개 고정 영문값만 전송된다. 서버에서 필터링.
type PosKey = "all" | "Vocal" | "Dance" | "Rap";
const POSITIONS: { id: PosKey; label: string }[] = [
  { id: "all", label: "전체 포지션" },
  { id: "Vocal", label: "보컬" },
  { id: "Dance", label: "댄스" },
  { id: "Rap", label: "랩" },
];

type RailTab = "scrap" | "like";

const AuditionDetailPage: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const ready = useAdminAuthGuard();

  // chip selector
  const [auditions, setAuditions] = useState<Audition[]>([]);

  // list state
  const [content, setContent] = useState<AuditionProfileType[]>([]);
  const [pageNum, setPageNum] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AuditionFilterType>("all");
  const [posFilter, setPosFilter] = useState<PosKey>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [scrollPct, setScrollPct] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(1);

  // rail: DB-backed lists
  const [scrapList, setScrapList] = useState<AuditionProfileType[]>([]);
  const [likeList, setLikeList] = useState<AuditionProfileType[]>([]);
  const [railTab, setRailTab] = useState<RailTab>("scrap");

  const [selected, setSelected] = useState<AuditionProfileType | null>(null);

  // 북마크 클릭 시 스크롤할 대상(아직 로드 안 됐을 수 있어 effect로 처리)
  const [scrollTarget, setScrollTarget] = useState<number | null>(null);

  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const fetchingRef = useRef(false);
  const lastReqRef = useRef(0);
  const loadingTargetRef = useRef(false);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // load audition list once for chips
  useEffect(() => {
    if (!ready) return;
    getAuditions()
      .then((list) => setAuditions(list ?? []))
      .catch(() => setAuditions([]));
  }, [ready]);

  const auditionsWithColor = useMemo(
    () =>
      auditions.map((a, i) => ({ ...a, color: CHIP_COLORS[i % CHIP_COLORS.length] })),
    [auditions],
  );
  const currentAudition = auditionsWithColor.find((a) => a.id === id);

  const fetchPage = useCallback(
    async (page: number, replace: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      const reqId = ++lastReqRef.current;
      setLoading(true);
      try {
        const data = await getAuditionInfo({
          auditionId: id,
          pageNum: page,
          filter,
          name: debouncedQuery || undefined,
          desiredPosition: posFilter === "all" ? undefined : posFilter,
        });
        if (reqId !== lastReqRef.current) return;
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        setContent((prev) => (replace ? data.content : [...prev, ...data.content]));
        setPageNum(page);
      } catch (e) {
        console.error("오디션 지원자 조회 실패", e);
      } finally {
        if (reqId === lastReqRef.current) setLoading(false);
        fetchingRef.current = false;
      }
    },
    [id, filter, debouncedQuery, posFilter],
  );

  // reset + fetch on filter/query/id change
  useEffect(() => {
    if (!ready || !id) return;
    setContent([]);
    setPageNum(0);
    setTotalPages(1);
    setTotalElements(0);
    window.scrollTo({ top: 0, behavior: "auto" });
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, id, filter, debouncedQuery, posFilter]);

  // rail data fetch (DB)
  const fetchRailLists = useCallback(async () => {
    if (!id) return;
    try {
      const [s, l] = await Promise.all([
        getAuditionInfo({ auditionId: id, pageNum: 0, filter: "scrap" }),
        getAuditionInfo({ auditionId: id, pageNum: 0, filter: "like" }),
      ]);
      setScrapList(s.content ?? []);
      setLikeList(l.content ?? []);
    } catch (e) {
      console.error("rail fetch 실패", e);
    }
  }, [id]);

  useEffect(() => {
    if (ready && id) fetchRailLists();
  }, [ready, id, fetchRailLists]);

  // 결과가 짧아서 페이지가 스크롤되지 않을 때도 다음 페이지를 자동으로 받아온다.
  // (필터 결과가 한 페이지에 다 들어가서 onScroll이 안 잡히는 케이스 보정)
  useEffect(() => {
    if (!ready || !id) return;
    if (loading || fetchingRef.current) return;
    if (pageNum + 1 >= totalPages) return;
    const doc = document.documentElement;
    if (doc.scrollHeight <= doc.clientHeight + 200) {
      fetchPage(pageNum + 1, false);
    }
  }, [content, loading, pageNum, totalPages, ready, id, fetchPage]);

  // window scroll: tracking + infinite load
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const sTop = window.scrollY || doc.scrollTop;
        const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
        setScrollPct(sTop / max);

        if (
          !fetchingRef.current &&
          pageNum + 1 < totalPages &&
          sTop + doc.clientHeight > doc.scrollHeight - 600
        ) {
          fetchPage(pageNum + 1, false);
        }

        const probe = sTop + STICKY_OFFSET + 20;
        let cur = 1;
        const keys = Object.keys(cardRefs.current)
          .map((k) => Number(k))
          .sort((a, b) => a - b);
        for (const k of keys) {
          const ref = cardRefs.current[k];
          if (!ref) continue;
          const top = ref.getBoundingClientRect().top + window.scrollY;
          if (top <= probe) cur = k;
          else break;
        }
        setCurrentIdx(cur);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pageNum, totalPages, fetchPage]);

  const groups = useMemo(() => {
    const out: { start: number; end: number; items: AuditionProfileType[] }[] = [];
    for (let i = 0; i < content.length; i += GROUP_SIZE) {
      out.push({
        start: i + 1,
        end: Math.min(i + GROUP_SIZE, content.length),
        items: content.slice(i, i + GROUP_SIZE),
      });
    }
    return out;
  }, [content]);

  const patchContent = (appId: number, patch: Partial<AuditionProfileType>) => {
    setContent((prev) => prev.map((p) => (p.id === appId ? { ...p, ...patch } : p)));
  };

  const setScrap = async (a: AuditionProfileType, next: boolean) => {
    try {
      const status = next
        ? await scrapApplicant({ applicationId: a.id, auditionId: a.auditionId })
        : await deleteScrapApplicant({ applicationId: a.id, auditionId: a.auditionId });
      if (status === 200) {
        patchContent(a.id, { isScrap: next });
        setSelected((prev) => (prev && prev.id === a.id ? { ...prev, isScrap: next } : prev));
        setScrapList((prev) =>
          next ? (prev.some((x) => x.id === a.id) ? prev : [{ ...a, isScrap: true }, ...prev]) : prev.filter((x) => x.id !== a.id),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };
  const toggleScrap = (a: AuditionProfileType) => setScrap(a, !a.isScrap);

  const setLikeState = async (a: AuditionProfileType, next: boolean) => {
    try {
      const status = next
        ? await likeApplicant({ applicationId: a.id, auditionId: a.auditionId })
        : await deleteLikeApplicant({ applicationId: a.id, auditionId: a.auditionId });
      if (status === 200) {
        patchContent(a.id, { isLiked: next });
        setSelected((prev) => (prev && prev.id === a.id ? { ...prev, isLiked: next } : prev));
        setLikeList((prev) =>
          next ? (prev.some((x) => x.id === a.id) ? prev : [{ ...a, isLiked: true }, ...prev]) : prev.filter((x) => x.id !== a.id),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };
  const toggleLike = (a: AuditionProfileType) => setLikeState(a, !a.isLiked);

  const bookmarkCurrent = () => {
    const target = content[currentIdx - 1];
    if (!target) return;
    if (target.isScrap) {
      setRailTab("scrap");
      return;
    }
    setScrap(target, true);
    setRailTab("scrap");
  };

  const jumpToCard = (appId: number) => {
    const idx = content.findIndex((c) => c.id === appId);
    if (idx >= 0) {
      const ref = cardRefs.current[idx + 1];
      if (ref) {
        const top = ref.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET;
        window.scrollTo({ top, behavior: "smooth" });
        return true;
      }
    }
    return false;
  };

  // 북마크 대상이 아직 로드 안 됐으면 나올 때까지 다음 페이지를 받아온 뒤 스크롤한다.
  const ensureLoadedAndScroll = useCallback(
    async (appId: number) => {
      if (jumpToCard(appId)) return;
      setScrollTarget(appId); // 아래 effect가 content에 등장하면 스크롤
      if (loadingTargetRef.current) return;
      loadingTargetRef.current = true;
      try {
        let page = pageNum;
        let pages = totalPages;
        let guard = 0;
        while (page + 1 < pages && guard < 100) {
          page += 1;
          guard += 1;
          const data = await getAuditionInfo({
            auditionId: id,
            pageNum: page,
            filter,
            name: debouncedQuery || undefined,
            desiredPosition: posFilter === "all" ? undefined : posFilter,
          });
          pages = data.totalPages;
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
          setContent((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...data.content.filter((c) => !seen.has(c.id))];
          });
          setPageNum(page);
          if (data.content.some((c) => c.id === appId)) break;
        }
      } catch (e) {
        console.error("책갈피 위치 로드 실패", e);
      } finally {
        loadingTargetRef.current = false;
      }
    },
    [pageNum, totalPages, id, filter, debouncedQuery, posFilter],
  );

  // scrollTarget이 content에 등장하면 스크롤하고 타깃 해제
  useEffect(() => {
    if (scrollTarget == null) return;
    if (jumpToCard(scrollTarget)) setScrollTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, scrollTarget]);

  const handleRailEntryClick = (a: AuditionProfileType) => {
    // 합격자 탭: 항상 상세 프로필 모달.
    // 북마크 탭: 책갈피처럼 해당 카드 위치로 이동(필요하면 로드 후 스크롤).
    if (railTab === "like") {
      setSelected(a);
      return;
    }
    ensureLoadedAndScroll(a.id);
  };

  if (!ready) return null;

  const railList = railTab === "scrap" ? scrapList : likeList;

  return (
    <AdminShell>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", minHeight: "100%" }}>
        <div style={{ minWidth: 0 }}>
          {/* Page header */}
          <div style={{ padding: "24px 32px 0", maxWidth: 1320, margin: "0 auto", width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--admin-ink-3)",
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  오디션 관리
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 0", letterSpacing: -0.6 }}>
                  {currentAudition?.title ?? "오디션"}
                </h1>
                <p style={{ fontSize: 13, color: "var(--admin-ink-2)", margin: "6px 0 0" }}>
                  <strong style={{ color: "var(--admin-ink)" }}>{nfmt(totalElements)}명</strong> 지원
                  {currentAudition && (
                    <>
                      {" · "}
                      {currentAudition.company}
                      {" · "}
                      {currentAudition.isAlwaysOn
                        ? "상시"
                        : `${currentAudition.startDate} ~ ${currentAudition.endDate}`}
                    </>
                  )}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btnSecondary} onClick={() => router.push("/audition")}>
                  ← 목록
                </button>
                <button
                  style={btnPrimary}
                  onClick={() => router.push(`/audition/${id}/edit`)}
                >
                  <AdminIcon name="edit" size={14} /> 오디션 수정
                </button>
              </div>
            </div>
          </div>

          {/* Sticky 영역 */}
          <div
            style={{
              position: "sticky",
              top: "var(--admin-topbar-h)",
              zIndex: 15,
              background: "var(--admin-bg)",
              paddingTop: 4,
            }}
          >
            <div style={{ padding: "0 32px", maxWidth: 1320, margin: "0 auto", width: "100%" }}>
              {auditionsWithColor.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 12,
                    overflowX: "auto",
                    paddingBottom: 4,
                  }}
                >
                  {auditionsWithColor.map((a) => {
                    const active = a.id === id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => router.push(`/audition/${a.id}`)}
                        style={{
                          height: 36,
                          padding: "0 14px",
                          borderRadius: 999,
                          background: active ? "#1a1a1f" : "#fff",
                          color: active ? "#fff" : "var(--admin-ink)",
                          border: active ? "none" : "1px solid var(--admin-border)",
                          fontWeight: 600,
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: a.color,
                          }}
                        />
                        {a.title}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: active ? "rgba(255,255,255,.7)" : "var(--admin-ink-3)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {nfmt(a.applicationCount)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  background: "#fff",
                  border: "1px solid var(--admin-border)",
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                    minWidth: 240,
                    height: 34,
                    padding: "0 12px",
                    background: "#f3f3f6",
                    borderRadius: 8,
                  }}
                >
                  <AdminIcon name="search" size={14} opacity={0.5} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="이름 또는 닉네임으로 검색"
                    style={{
                      flex: 1,
                      border: 0,
                      background: "transparent",
                      outline: "none",
                      fontSize: 13,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    padding: 3,
                    background: "#f3f3f6",
                    borderRadius: 9,
                  }}
                >
                  {FILTERS.map((o) => {
                    const active = filter === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setFilter(o.id)}
                        style={{
                          height: 28,
                          padding: "0 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: active ? "#fff" : "transparent",
                          color: active ? "var(--admin-ink)" : "var(--admin-ink-2)",
                          boxShadow: active ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                        }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ width: 1, height: 22, background: "var(--admin-border)" }} />
                {/* 포지션 필터 (보컬/댄스/랩) — 로드된 목록 기준 클라이언트 필터 */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    padding: 3,
                    background: "#f3f3f6",
                    borderRadius: 9,
                  }}
                >
                  {POSITIONS.map((o) => {
                    const active = posFilter === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setPosFilter(o.id)}
                        style={{
                          height: 28,
                          padding: "0 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: active ? "#fff" : "transparent",
                          color: active ? "var(--admin-ink)" : "var(--admin-ink-2)",
                          boxShadow: active ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                        }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ width: 1, height: 22, background: "var(--admin-border)" }} />
                <span style={{ fontSize: 12, color: "var(--admin-ink-2)" }}>
                  <strong
                    style={{ color: "var(--admin-ink)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {nfmt(totalElements)}
                  </strong>{" "}
                  명 표시
                </span>
              </div>
            </div>
          </div>

          {/* Applicant list */}
          <div style={{ padding: "0 32px 80px", maxWidth: 1320, margin: "0 auto", width: "100%" }}>
            {groups.map((g) => (
              <div key={g.start}>
                <div style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      background: "#1a1a1f",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    #{g.start} – #{g.end}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--admin-ink-2)" }}>{g.items.length}명</span>
                  <div style={{ flex: 1, height: 1, background: "var(--admin-border)" }} />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 14,
                    paddingBottom: 16,
                  }}
                >
                  {g.items.map((a, i) => {
                    const idx = g.start + i;
                    return (
                      <div
                        key={a.id}
                        ref={(el) => {
                          if (el) cardRefs.current[idx] = el;
                        }}
                        style={{ scrollMarginTop: STICKY_OFFSET }}
                      >
                        <ApplicantCard
                          applicant={a}
                          idx={idx}
                          onClick={() => setSelected(a)}
                          onScrap={() => toggleScrap(a)}
                          onLike={() => toggleLike(a)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "center", padding: 40, color: "var(--admin-ink-3)", fontSize: 13 }}>
                불러오는 중…
              </div>
            )}
            {!loading && pageNum + 1 >= totalPages && content.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", padding: 40, color: "var(--admin-ink-3)", fontSize: 13 }}>
                {posFilter === "all"
                  ? `마지막 지원자입니다 · 총 ${nfmt(totalElements)}명`
                  : `${POSITIONS.find((p) => p.id === posFilter)?.label} ${nfmt(totalElements)}명`}
              </div>
            )}
            {!loading && content.length === 0 && (
              <div style={{ padding: 80, textAlign: "center", color: "var(--admin-ink-3)" }}>
                조건에 맞는 지원자가 없어요.
              </div>
            )}
          </div>
        </div>

        {/* Rail (북마크 / 합격자) */}
        <BookmarkRail
          tab={railTab}
          onTabChange={setRailTab}
          scrapCount={scrapList.length}
          likeCount={likeList.length}
          list={railList}
          scrollPct={scrollPct}
          currentIdx={currentIdx}
          total={totalElements}
          onBookmarkCurrent={bookmarkCurrent}
          onPickEntry={handleRailEntryClick}
          onRemoveScrap={(a) => setScrap(a, false)}
          onRemoveLike={(a) => setLikeState(a, false)}
        />
      </div>

      <ApplicantDetailModal
        applicant={selected}
        idx={
          selected ? content.findIndex((c) => c.id === selected.id) + 1 || undefined : undefined
        }
        onClose={() => setSelected(null)}
        onPrev={(() => {
          if (!selected) return undefined;
          const i = content.findIndex((c) => c.id === selected.id);
          return i > 0 ? () => setSelected(content[i - 1]) : undefined;
        })()}
        onNext={(() => {
          if (!selected) return undefined;
          const i = content.findIndex((c) => c.id === selected.id);
          return i >= 0 && i < content.length - 1
            ? () => setSelected(content[i + 1])
            : undefined;
        })()}
        onToggleScrap={selected ? () => toggleScrap(selected) : undefined}
        onToggleLike={selected ? () => toggleLike(selected) : undefined}
      />
    </AdminShell>
  );
};

interface ApplicantCardProps {
  applicant: AuditionProfileType;
  idx: number;
  onClick: () => void;
  onScrap: () => void;
  onLike: () => void;
}

const ApplicantCard: React.FC<ApplicantCardProps> = ({ applicant, idx, onClick, onScrap, onLike }) => {
  const photo = applicant.images?.[0]?.imageKey;
  // 합격(분홍) > 북마크(노랑) 우선순위로 카드 톤 결정
  const tint = applicant.isLiked
    ? { bg: "#ffeef2", border: "#f5c2cb", hoverBorder: "#eda6b3" }
    : applicant.isScrap
    ? { bg: "#faf7ee", border: "#ebd9a0", hoverBorder: "#d8c075" }
    : { bg: "#fff", border: "var(--admin-border)", hoverBorder: "#d0d0d8" };
  return (
    <div
      onClick={onClick}
      role="button"
      style={{
        ...adminCardStyle,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "pointer",
        background: tint.bg,
        borderColor: tint.border,
        transition: "border-color .15s, box-shadow .15s, background .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tint.hoverBorder;
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tint.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1.05",
            borderRadius: 10,
            overflow: "hidden",
            background: photo
              ? "#f3f3f6"
              : "linear-gradient(140deg, #c2c8d6 0%, #3f4c6b 100%)",
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt={applicant.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
                color: "rgba(255,255,255,.55)",
                fontWeight: 800,
                fontSize: 32,
              }}
            >
              {(applicant.name || "?").slice(0, 1)}
            </div>
          )}
        </div>
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: 999,
            background: "rgba(0,0,0,.55)",
            color: "#fff",
            backdropFilter: "blur(8px)",
          }}
        >
          #{idx}
        </span>
        {!applicant.acceptFeedback && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 7px",
              borderRadius: 999,
              background: "#ffe9e9",
              color: "#cc3333",
            }}
          >
            피드백 X
          </span>
        )}
        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onScrap();
            }}
            title="북마크"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(255,255,255,.92)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <AdminIcon
              name={applicant.isScrap ? "bookmark_activated" : "bookmark"}
              size={14}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
            title={applicant.isLiked ? "합격 해제" : "합격 처리"}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(255,255,255,.92)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <AdminIcon name={applicant.isLiked ? "award" : "heart"} size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: -0.3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {applicant.name}
          </span>
          {applicant.desiredPosition && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 999,
                background: "#ecf3ff",
                color: "#007aff",
                flexShrink: 0,
              }}
            >
              {applicant.desiredPosition}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>
          {countryNameKo(applicant.nation)} · {applicant.gender}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--admin-ink-2)",
            fontVariantNumeric: "tabular-nums",
            marginTop: 2,
          }}
        >
          {applicant.height}cm · {applicant.weight}kg · {applicant.ageOrYear}년생
        </div>
        {applicant.instagramId && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--admin-blue)",
              fontWeight: 600,
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://www.instagram.com/${applicant.instagramId}`, "_blank");
            }}
          >
            <AdminIcon name="instagram" size={12} /> Instagram
          </div>
        )}
      </div>
    </div>
  );
};

interface BookmarkRailProps {
  tab: RailTab;
  onTabChange: (t: RailTab) => void;
  scrapCount: number;
  likeCount: number;
  list: AuditionProfileType[];
  scrollPct: number;
  currentIdx: number;
  total: number;
  onBookmarkCurrent: () => void;
  onPickEntry: (a: AuditionProfileType) => void;
  onRemoveScrap: (a: AuditionProfileType) => void;
  onRemoveLike: (a: AuditionProfileType) => void;
}

const RAIL_TABS: { id: RailTab; label: string; icon: string }[] = [
  { id: "scrap", label: "북마크", icon: "bookmark_activated" },
  { id: "like", label: "합격자", icon: "award" },
];

const BookmarkRail: React.FC<BookmarkRailProps> = ({
  tab,
  onTabChange,
  scrapCount,
  likeCount,
  list,
  scrollPct,
  currentIdx,
  total,
  onBookmarkCurrent,
  onPickEntry,
  onRemoveScrap,
  onRemoveLike,
}) => {
  const counts: Record<RailTab, number> = {
    scrap: scrapCount,
    like: likeCount,
  };

  return (
    <aside
      style={{
        borderLeft: "1px solid var(--admin-border)",
        background: "#fff",
        position: "sticky",
        top: "var(--admin-topbar-h)",
        height: "calc(100vh - var(--admin-topbar-h))",
        display: "flex",
        flexDirection: "column",
        alignSelf: "start",
      }}
    >
      {/* 현재 위치 + 책갈피 끼우기 */}
      <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid var(--admin-border)" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--admin-ink-3)",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          현재 위치
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            #{currentIdx}
          </span>
          <span style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>
            / {nfmt(total)} · {total > 0 ? Math.round((currentIdx / total) * 100) : 0}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "#f1f1f5",
            borderRadius: 999,
            marginTop: 10,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${total > 0 ? Math.min(100, (currentIdx / total) * 100) : 0}%`,
              background: "var(--admin-blue)",
              borderRadius: 999,
              transition: "width .15s",
            }}
          />
        </div>
        <button
          onClick={onBookmarkCurrent}
          style={{
            marginTop: 12,
            width: "100%",
            height: 36,
            borderRadius: 8,
            background: "var(--admin-blue)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <AdminIcon name="bookmark_activated" size={12} /> 여기에 책갈피 끼우기
        </button>
        <div style={{ fontSize: 11, color: "var(--admin-ink-3)", marginTop: 6, lineHeight: 1.45 }}>
          여기까지 봤다는 책갈피를 남깁니다. (북마크 탭에 저장)
        </div>
      </div>

      {/* 탭 */}
      <div
        style={{
          padding: "12px 14px 0",
          display: "flex",
          gap: 4,
        }}
      >
        {RAIL_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: active ? "var(--admin-blue-tint)" : "transparent",
                color: active ? "var(--admin-blue)" : "var(--admin-ink-2)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "#f4f5f8";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              {t.label}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: active ? "#fff" : "#f1f1f5",
                  color: active ? "var(--admin-blue)" : "var(--admin-ink-3)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* 리스트 */}
      <div
        style={{
          padding: "10px 12px 18px",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {list.length === 0 ? (
          <div
            style={{
              padding: "24px 8px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--admin-ink-3)",
              lineHeight: 1.5,
            }}
          >
            {tab === "scrap"
              ? "아직 표시한 책갈피가 없습니다.\n카드의 책갈피 아이콘 또는 위 버튼으로 \"여기까지 봤다\"는 표시를 남길 수 있어요."
              : "아직 합격 처리한 지원자가 없습니다."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {list.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 8px",
                  borderRadius: 8,
                  transition: "background .15s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f8fa")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => onPickEntry(a)}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#e8e8ee",
                    flexShrink: 0,
                  }}
                >
                  {a.images?.[0]?.imageKey ? (
                    <img
                      src={a.images[0].imageKey}
                      alt={a.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--admin-ink-2)",
                      }}
                    >
                      {(a.name || "?").slice(0, 1)}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--admin-ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.name || "(이름 없음)"}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--admin-ink-3)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {[
                      a.desiredPosition,
                      countryNameKo(a.nation),
                      a.ageOrYear && `${a.ageOrYear}년생`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                {(tab === "scrap" || tab === "like") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (tab === "scrap") onRemoveScrap(a);
                      else onRemoveLike(a);
                    }}
                    title="해제"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      color: "var(--admin-ink-3)",
                      fontSize: 14,
                      lineHeight: 1,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f1f5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default AuditionDetailPage;
