"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary, btnSecondary } from "@/components/admin/PageShell";
import AdminIcon from "@/components/admin/AdminIcon";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { useUnansweredInquiryCount } from "@/components/admin/useUnansweredInquiryCount";
import { fetchStatsOverview, fetchStatsTimeseries, PlatformStats } from "@/apis/stats";
import { countryNameKo } from "@/utils/countryName";

const STATS_RANGE_DAYS = 60;

function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function nfmt(n: number) {
  return n.toLocaleString("ko-KR");
}

interface KpiCardProps {
  label: string;
  value: number;
  delta?: number;
  trendLabel?: string;
  tone?: "blue" | "good" | "warn";
}

const TONE = {
  blue: { tint: "var(--admin-blue-tint)", fg: "var(--admin-blue)" },
  good: { tint: "var(--admin-good-tint)", fg: "var(--admin-good)" },
  warn: { tint: "var(--admin-warn-tint)", fg: "#cc7a00" },
} as const;

const KpiCard: React.FC<KpiCardProps> = ({ label, value, delta, trendLabel, tone = "blue" }) => {
  const t = TONE[tone];
  const deltaSign = typeof delta === "number" ? (delta >= 0 ? "+" : "") : "";
  return (
    <div
      style={{
        ...adminCardStyle,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 138,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, color: "var(--admin-ink-2)", fontWeight: 500 }}>{label}</span>
        {typeof delta === "number" && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
              background: t.tint,
              color: t.fg,
            }}
          >
            {deltaSign}
            {nfmt(delta)}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1 }}>
          {nfmt(value)}
        </span>
      </div>
      {trendLabel && (
        <div style={{ fontSize: 12, color: "var(--admin-ink-3)", marginTop: -4 }}>{trendLabel}</div>
      )}
    </div>
  );
};

interface QuickActionProps {
  label: string;
  desc: string;
  icon: string;
  tint: string;
  onClick: () => void;
  badge?: number;
}

const QuickAction: React.FC<QuickActionProps> = ({ label, desc, icon, tint, onClick, badge }) => (
  <button
    onClick={onClick}
    style={{
      textAlign: "left",
      ...adminCardStyle,
      padding: 18,
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      transition: "border-color .15s, box-shadow .15s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "#d0d0d8";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.04)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "var(--admin-border)";
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    <div
      style={{
        position: "relative",
        width: 40,
        height: 40,
        borderRadius: 10,
        background: tint,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <AdminIcon name={icon} size={20} />
      {typeof badge === "number" && badge > 0 && (
        <span
          title={`미응답 ${badge}건`}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: "#ff453a",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
            border: "1.5px solid #fff",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--admin-ink-3)", lineHeight: 1.4 }}>{desc}</span>
    </div>
  </button>
);

interface GrowthChartProps {
  series: PlatformStats[];
}

const GrowthChart: React.FC<GrowthChartProps> = ({ series }) => {
  const W = 720;
  const H = 240;
  const P = 36;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (series.length < 2) {
    return (
      <div
        style={{
          height: H,
          display: "grid",
          placeItems: "center",
          color: "var(--admin-ink-3)",
          fontSize: 13,
        }}
      >
        표시할 데이터가 부족합니다.
      </div>
    );
  }

  const totals = series.map((s) => s.totalUsers);
  const dailies = series.map((s, i) => (i === 0 ? 0 : Math.max(0, s.totalUsers - series[i - 1].totalUsers)));
  const maxTotal = Math.max(...totals);
  const minTotal = Math.min(...totals);
  const maxDaily = Math.max(1, ...dailies);

  const x = (i: number) => P + (i / (series.length - 1)) * (W - P - P);
  const yT = (v: number) =>
    H - P - ((v - minTotal) / Math.max(1, maxTotal - minTotal)) * (H - P - P);
  const yD = (v: number) => H - P - (v / maxDaily) * (H - P - P);

  const pathTotal = totals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yT(v).toFixed(1)}`).join(" ");
  const pathDaily = dailies.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yD(v).toFixed(1)}`).join(" ");
  const fillTotal = `${pathTotal} L${x(series.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;

  const tickIdx = [0, Math.floor(series.length / 4), Math.floor(series.length / 2), Math.floor((3 * series.length) / 4), series.length - 1];

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    // map svg-x back to data index
    const usable = W - P - P;
    let idx = Math.round(((relX - P) / usable) * (series.length - 1));
    if (idx < 0) idx = 0;
    if (idx > series.length - 1) idx = series.length - 1;
    setHoverIdx(idx);
  };

  const hovered = hoverIdx != null ? series[hoverIdx] : null;
  const hoveredDaily = hoverIdx != null ? dailies[hoverIdx] : 0;
  const hx = hoverIdx != null ? x(hoverIdx) : 0;
  // tooltip position (in % of width for the wrapping div)
  const tooltipLeftPct = hoverIdx != null ? (hx / W) * 100 : 0;
  const placeRight = tooltipLeftPct < 55;

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", width: "100%" }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
        <defs>
          <linearGradient id="zg-growth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#007aff" stopOpacity=".18" />
            <stop offset="100%" stopColor="#007aff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line
            key={i}
            x1={P}
            x2={W - P}
            y1={P + f * (H - P - P)}
            y2={P + f * (H - P - P)}
            stroke="#eef0f4"
            strokeDasharray="3 4"
          />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const v = Math.round(maxTotal - f * (maxTotal - minTotal));
          return (
            <text key={i} x={4} y={P + f * (H - P - P) + 4} fontSize="10" fill="#a1a1aa">
              {nfmt(v)}
            </text>
          );
        })}
        <path d={fillTotal} fill="url(#zg-growth)" />
        <path d={pathTotal} fill="none" stroke="#007aff" strokeWidth={2} strokeLinejoin="round" />
        <path d={pathDaily} fill="none" stroke="#2dbd6f" strokeWidth={1.8} strokeLinejoin="round" opacity={0.9} />
        {tickIdx.map((idx, n) => {
          const date = series[idx]?.statDate ?? "";
          const label = date ? date.slice(5) : `Day ${idx + 1}`;
          return (
            <text key={n} x={x(idx)} y={H - 10} fontSize="10" fill="#a1a1aa" textAnchor="middle">
              {label}
            </text>
          );
        })}
        {hoverIdx != null && hovered && (
          <>
            <line
              x1={hx}
              x2={hx}
              y1={P}
              y2={H - P}
              stroke="#1a1a1f"
              strokeOpacity={0.15}
              strokeDasharray="2 3"
            />
            <circle cx={hx} cy={yT(hovered.totalUsers)} r={4} fill="#fff" stroke="#007aff" strokeWidth={2} />
            <circle cx={hx} cy={yD(hoveredDaily)} r={4} fill="#fff" stroke="#2dbd6f" strokeWidth={2} />
          </>
        )}
      </svg>

      {hoverIdx != null && hovered && (
        <div
          style={{
            position: "absolute",
            top: 8,
            [placeRight ? "left" : "right"]: `${placeRight ? tooltipLeftPct + 1 : 100 - tooltipLeftPct + 1}%`,
            background: "#1a1a1f",
            color: "#fff",
            padding: "8px 10px",
            borderRadius: 8,
            fontSize: 11,
            pointerEvents: "none",
            minWidth: 140,
            boxShadow: "0 4px 12px rgba(0,0,0,.18)",
            lineHeight: 1.5,
          } as React.CSSProperties}
        >
          <div style={{ color: "rgba(255,255,255,.65)", marginBottom: 4 }}>
            {hovered.statDate}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#007aff" }} />
              누적
            </span>
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>
              {nfmt(hovered.totalUsers)}명
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 2 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2dbd6f" }} />
              일별 신규
            </span>
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>
              +{nfmt(hoveredDaily)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const ready = useAdminAuthGuard();
  const unansweredCount = useUnansweredInquiryCount();
  const [overview, setOverview] = useState<PlatformStats | null>(null);
  const [series, setSeries] = useState<PlatformStats[]>([]);

  useEffect(() => {
    if (!ready) return;
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (STATS_RANGE_DAYS - 1));
    Promise.all([fetchStatsOverview(), fetchStatsTimeseries(toIsoDate(from), toIsoDate(to))]).then(
      ([ov, ts]) => {
        setOverview(ov);
        setSeries(ts);
      },
    );
  }, [ready]);

  const todayDelta = useMemo(() => {
    if (series.length < 2) return undefined;
    const last = series[series.length - 1].totalUsers;
    const prev = series[series.length - 2].totalUsers;
    return last - prev;
  }, [series]);

  const weekDelta = useMemo(() => {
    if (series.length < 8) return undefined;
    const last = series[series.length - 1].totalUsers;
    const prev = series[series.length - 8].totalUsers;
    return last - prev;
  }, [series]);

  const countries = useMemo(() => {
    const breakdown = overview?.countryBreakdown ?? {};
    const all = Object.entries(breakdown).map(([code, count]) => ({ code, count }));
    const isUnknown = (c: string) => !c || c.trim().toUpperCase() === "UNKNOWN";
    const known = all.filter((c) => !isUnknown(c.code)).sort((a, b) => b.count - a.count);
    const unknown = all.filter((c) => isUnknown(c.code));
    return [...known, ...unknown];
  }, [overview]);

  // 비율 계산은 UNKNOWN 제외한 1위 기준 (UNKNOWN이 압도적으로 큰 케이스 방지)
  const knownMax = countries.find((c) => c.code && c.code.toUpperCase() !== "UNKNOWN")?.count ?? 1;

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        title="관리자 대시보드"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnSecondary} disabled>
              <AdminIcon name="chevron_down" size={14} /> 최근 {STATS_RANGE_DAYS}일
            </button>
          </div>
        }
      >
        {/* KPI grid */}
        <div
          className="zg-grid-4"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <KpiCard
            label="전체 유저 수"
            value={overview?.totalUsers ?? 0}
            delta={weekDelta}
            trendLabel="지난 7일 대비"
            tone="blue"
          />
          <KpiCard
            label="오늘 가입"
            value={todayDelta ?? 0}
            delta={todayDelta}
            trendLabel="어제 대비"
            tone="good"
          />
          <KpiCard
            label="진행중 오디션"
            value={overview?.totalAuditions ?? 0}
            trendLabel="누적"
            tone="warn"
          />
          <KpiCard
            label="누적 지원자"
            value={overview?.totalApplications ?? 0}
            trendLabel="누적"
            tone="blue"
          />
        </div>

        {/* Charts row */}
        <div
          className="zg-split-2-1"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div style={{ ...adminCardStyle, padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>날짜별 유저 수</h3>
                <p style={{ fontSize: 12, color: "var(--admin-ink-3)", margin: "4px 0 0" }}>
                  최근 {STATS_RANGE_DAYS}일 · 누적 + 일일 신규
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#007aff",
                    }}
                  />{" "}
                  누적 유저
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#2dbd6f",
                    }}
                  />{" "}
                  일별 신규
                </span>
              </div>
            </div>
            <GrowthChart series={series} />
          </div>

          <div style={{ ...adminCardStyle, padding: 22, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ marginBottom: 14, flexShrink: 0 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>국가별 유저 분포</h3>
              <p style={{ fontSize: 12, color: "var(--admin-ink-3)", margin: "4px 0 0" }}>
                전체 {countries.length || 0}개 · 스크롤하여 확인
              </p>
            </div>
            {countries.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--admin-ink-3)",
                  fontSize: 13,
                }}
              >
                국가별 데이터가 없습니다.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  maxHeight: 240,
                  overflowY: "auto",
                  paddingRight: 6,
                }}
              >
                {countries.map((c) => {
                  const isUnknown = !c.code || c.code.toUpperCase() === "UNKNOWN";
                  const pct = isUnknown ? 0 : c.count / knownMax;
                  return (
                    <div
                      key={c.code || "UNKNOWN"}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "100px 1fr 56px",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: isUnknown ? "var(--admin-ink-3)" : "var(--admin-ink-2)",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isUnknown ? "UNKNOWN" : countryNameKo(c.code)}{" "}
                        <span style={{ color: "var(--admin-ink-3)" }}>
                          ({c.code || "—"})
                        </span>
                      </span>
                      <div
                        style={{
                          height: 8,
                          background: "#f1f1f5",
                          borderRadius: 99,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: `${Math.min(100, pct * 100)}%`,
                            background: isUnknown
                              ? "#d4d4dc"
                              : pct >= 0.95
                              ? "linear-gradient(90deg, #007aff, #5d8bff)"
                              : "#c8d4ea",
                            borderRadius: 99,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: isUnknown ? "var(--admin-ink-3)" : "var(--admin-ink)",
                        }}
                      >
                        {nfmt(c.count)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>바로가기</h2>
          <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>자주 쓰는 운영 메뉴</span>
        </div>
        <div
          className="zg-grid-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          <QuickAction
            label="오디션 관리"
            desc="진행 중인 오디션·지원자 관리"
            icon="star"
            tint="#fff4e0"
            onClick={() => router.push("/audition")}
          />
          <QuickAction
            label="공지사항"
            desc="ZIGG의 공지를 작성합니다"
            icon="speaker"
            tint="#ecf3ff"
            onClick={() => router.push("/notice")}
          />
          <QuickAction
            label="게시판 관리"
            desc="카테고리별 최상단 공지 관리"
            icon="community"
            tint="#e6f7ee"
            onClick={() => router.push("/board")}
          />
          <QuickAction
            label="알림 발송"
            desc="전체 유저 푸시·인앱 알림"
            icon="bell"
            tint="#ffeaea"
            onClick={() => router.push("/notification")}
          />
          <QuickAction
            label="티켓 수동 지급"
            desc="결제 오류 유저에게 직접 티켓 지급"
            icon="ticket"
            tint="#fff4e0"
            onClick={() => router.push("/ticket")}
          />
          <QuickAction
            label="고객 목소리함"
            desc={
              unansweredCount > 0
                ? `미응답 ${unansweredCount}건 · 응답 대기`
                : "유저 의견·문의 응답"
            }
            icon="mail"
            tint="#ecf3ff"
            badge={unansweredCount}
            onClick={() => router.push("/customerInquiry")}
          />
        </div>
      </PageShell>
    </AdminShell>
  );
};

export default DashboardPage;
