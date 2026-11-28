"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnSecondary } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { useIsMobile } from "@/components/admin/useIsMobile";
import { Pagination } from "@mui/material";
import {
  CLIENT_ERROR_CONTEXT_LABEL,
  ClientErrorContextCount,
  ClientErrorStepCount,
  ClientErrorLog,
  ENV_LABEL,
  getClientErrors,
  getClientErrorSummary,
  getClientErrorStepSummary,
  getLogSources,
  getUnifiedLogs,
  getResourceMonitoring,
  getTraceEvents,
  LogLevel,
  LogSource,
  LogSourceError,
  LogSources,
  MetricPanel,
  MonitoringEnv,
  MonitoringRange,
  MonitoringUnit,
  RANGE_LABEL,
  ResourceMonitoring,
  SpringPage,
  TRACE_TYPE_LABEL,
  TraceEvent,
  TraceEvents,
  TraceType,
  sourceKey,
  UnifiedLogEvent,
} from "@/apis/monitoring";
import { AdminUserSearchResult, searchAdminUsers } from "@/apis/user";
import { handleApiError } from "@/utils/apiError";

type Tab = "resources" | "logs";

const ENVS: MonitoringEnv[] = ["PROD", "DEV"];
const RANGES: MonitoringRange[] = ["H1", "H6", "H24", "D7", "D30"];
// VM(instance_id) 별 선 색 — admin 토큰 계열
const SERIES_COLORS = ["#007aff", "#2dbd6f", "#ff9f0a", "#ff3b30", "#6b6b76", "#af52de"];

/* ───────────────────────── 포맷 ───────────────────────── */

const formatBytes = (n: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (Math.abs(v) >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)}${units[i]}`;
};

const formatValue = (unit: MonitoringUnit, v: number) => {
  switch (unit) {
    case "PERCENT":
      return `${v.toFixed(1)}%`;
    case "BYTES":
      return formatBytes(v);
    case "BYTES_PER_SECOND":
      return `${formatBytes(v)}/s`;
    case "REQUESTS_PER_SECOND":
      return `${v >= 10 ? v.toFixed(0) : v.toFixed(2)}/s`;
  }
};

const pad = (n: number) => String(n).padStart(2, "0");
const formatTime = (epochSec: number, withDate: boolean) => {
  const d = new Date(epochSec * 1000);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withDate ? `${d.getMonth() + 1}/${d.getDate()} ${hm}` : hm;
};

const shortId = (id: string) => (id.startsWith("i-") ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

// 404 처럼 본문 없는 에러도 메시지가 비지 않게 (빈 문자열이면 "불러오는 중" 에 갇힌다)
const errorText = (e: unknown) => {
  const { message, status } = handleApiError(e);
  if (status === 404) return "이 서버에는 아직 모니터링 API 가 없습니다. 상단 서버 스위치를 Dev 로 바꿔 보세요.";
  return message || `요청 실패${status ? ` (${status})` : ""}`;
};

/* ───────────────────────── 공통 UI ───────────────────────── */

function Chips<T extends string>({
  options,
  value,
  label,
  onChange,
  disabled,
}: {
  options: T[];
  value: T;
  label: (v: T) => string;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        gap: 2,
        borderRadius: 10,
        background: "#f0f1f4",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            disabled={disabled}
            onClick={() => onChange(o)}
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              background: on ? "#fff" : "transparent",
              color: on ? "var(--admin-ink)" : "var(--admin-ink-2)",
              boxShadow: on ? "0 1px 2px rgba(0,0,0,.08)" : "none",
              whiteSpace: "nowrap",
            }}
          >
            {label(o)}
          </button>
        );
      })}
    </div>
  );
}

function EmptyBox({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        height,
        display: "grid",
        placeItems: "center",
        fontSize: 13,
        color: "var(--admin-ink-3)",
        textAlign: "center",
        padding: "0 16px",
      }}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── 리소스 탭 ───────────────────────── */

function PanelChart({
  panel,
  colorOf,
  withDate,
}: {
  panel: MetricPanel;
  colorOf: (id: string) => string;
  withDate: boolean;
}) {
  // recharts 는 행 단위 데이터 → { t, [instanceId]: v } 로 펼친다
  const rows = useMemo(() => {
    const byT = new Map<number, Record<string, number>>();
    panel.series.forEach((s) =>
      s.points.forEach((p) => {
        const row = byT.get(p.t) ?? { t: p.t };
        row[s.instanceId] = p.v;
        byT.set(p.t, row);
      })
    );
    return Array.from(byT.values()).sort((a, b) => a.t - b.t);
  }, [panel]);

  const latest = panel.series
    .map((s) => s.points[s.points.length - 1])
    .filter(Boolean)
    .sort((a, b) => b.t - a.t)[0];

  return (
    <div style={{ ...adminCardStyle, padding: "16px 16px 8px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{panel.title}</span>
        <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
          {latest ? formatValue(panel.unit, latest.v) : "-"}
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyBox height={170}>수집된 지표가 없습니다</EmptyBox>
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={rows} margin={{ top: 12, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#f0f1f4" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(t: number) => formatTime(t, withDate)}
              tick={{ fontSize: 10.5, fill: "#a1a1aa" }}
              minTickGap={40}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width={54}
              domain={panel.unit === "PERCENT" ? [0, 100] : [0, "auto"]}
              tickFormatter={(v: number) => formatValue(panel.unit, v)}
              tick={{ fontSize: 10.5, fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(t) => formatTime(Number(t), true)}
              formatter={(v, name) => [formatValue(panel.unit, Number(v)), shortId(String(name))]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--admin-border)" }}
            />
            {panel.series.map((s) => (
              <Line
                key={s.instanceId}
                dataKey={s.instanceId}
                stroke={colorOf(s.instanceId)}
                strokeWidth={1.8}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ResourcesTab() {
  const isMobile = useIsMobile();
  const [env, setEnv] = useState<MonitoringEnv>("PROD");
  const [range, setRange] = useState<MonitoringRange>("H6");
  const [data, setData] = useState<ResourceMonitoring | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getResourceMonitoring(env, range));
    } catch (e) {
      setData(null);
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [env, range]);

  useEffect(() => {
    load();
  }, [load]);

  // 인스턴스 색은 목록 순서(최근 VM 먼저)로 고정 → 패널 간 같은 VM 같은 색
  const colorOf = useCallback(
    (id: string) => {
      const idx = data?.instances.findIndex((i) => i.instanceId === id) ?? -1;
      return SERIES_COLORS[(idx < 0 ? 0 : idx) % SERIES_COLORS.length];
    },
    [data]
  );
  const withDate = range !== "H1" && range !== "H6";
  const nowSec = Date.now() / 1000;

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <Chips options={ENVS} value={env} label={(v) => ENV_LABEL[v]} onChange={setEnv} />
        <Chips options={RANGES} value={range} label={(v) => RANGE_LABEL[v]} onChange={setRange} />
        <div style={{ flex: 1 }} />
        <button style={btnSecondary} onClick={load} disabled={loading}>
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>

      {/* 기간 내 VM 목록 */}
      {data && data.instances.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {data.instances.map((inst) => {
            const live = nowSec - inst.lastSeen < 5 * 60;
            return (
              <div
                key={inst.instanceId}
                title={inst.instanceId}
                style={{
                  ...adminCardStyle,
                  borderRadius: 10,
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 4, background: colorOf(inst.instanceId) }} />
                <span style={{ fontWeight: 700 }}>{shortId(inst.instanceId)}</span>
                <span style={{ color: "var(--admin-ink-3)", fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(inst.firstSeen, true)} ~ {live ? "현재" : formatTime(inst.lastSeen, true)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: live ? "var(--admin-good-tint)" : "#f0f1f4",
                    color: live ? "var(--admin-good)" : "var(--admin-ink-3)",
                  }}
                >
                  {live ? "가동 중" : "종료"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {error !== null ? (
        <div style={{ ...adminCardStyle }}>
          <EmptyBox height={220}>
            지표를 불러오지 못했습니다.
            <br />
            {error}
          </EmptyBox>
        </div>
      ) : !data ? (
        <div style={{ ...adminCardStyle }}>
          <EmptyBox height={220}>불러오는 중…</EmptyBox>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {data.panels.map((p) => (
            <PanelChart key={p.key} panel={p} colorOf={colorOf} withDate={withDate} />
          ))}
        </div>
      )}
    </>
  );
}

/* ───────────────────────── 로그 탭 ───────────────────────── */

type LogSection = "appErrors" | "server" | "trace";
const LOG_SECTIONS: LogSection[] = ["appErrors", "server", "trace"];
const LOG_SECTION_LABEL: Record<LogSection, string> = { appErrors: "앱 에러", server: "서버 로그", trace: "유저 추적" };

const ERROR_DAYS = ["1", "7", "30"] as const;
type ErrorDays = (typeof ERROR_DAYS)[number];
const PLATFORMS = ["", "ios", "android"] as const;
type PlatformFilter = (typeof PLATFORMS)[number];

const contextLabel = (c: string) => CLIENT_ERROR_CONTEXT_LABEL[c] ?? c;

// 서버는 UTC LocalDateTime 을 준다 → "Z" 붙여 로컬(KST)로 표시
const formatServerTime = (s: string) => {
  const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : s + "Z");
  if (isNaN(d.getTime())) return s;
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const prettyJson = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

/** 필터 칩 (라벨 + 건수) — 화면·단계 필터 공용 */
function CountPill({
  on,
  label,
  count,
  onClick,
}: {
  on: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 30,
        padding: "0 11px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        border: `1px solid ${on ? "var(--admin-blue)" : "var(--admin-border)"}`,
        background: on ? "var(--admin-blue-tint)" : "#fff",
        color: on ? "var(--admin-blue)" : "var(--admin-ink-2)",
      }}
    >
      {label}
      <span style={{ marginLeft: 5, fontVariantNumeric: "tabular-nums", opacity: 0.8 }}>
        {count.toLocaleString()}
      </span>
    </button>
  );
}

function AppErrorsPanel() {
  const isMobile = useIsMobile();
  const [days, setDays] = useState<ErrorDays>("7");
  const [context, setContext] = useState<string>("");
  const [platform, setPlatform] = useState<PlatformFilter>("");
  const [step, setStep] = useState<string>("");
  const [page, setPage] = useState(0);
  const [summary, setSummary] = useState<ClientErrorContextCount[]>([]);
  const [stepSummary, setStepSummary] = useState<ClientErrorStepCount[]>([]);
  const [data, setData] = useState<SpringPage<ClientErrorLog> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, counts, stepCounts] = await Promise.all([
        getClientErrors({
          context: context || undefined,
          platform: platform || undefined,
          step: step || undefined,
          days: Number(days),
          page,
        }),
        getClientErrorSummary(Number(days)),
        // 단계 건수 API 가 없는 서버(배포 전 prod)여도 목록은 보여준다
        getClientErrorStepSummary(Number(days), context || undefined).catch(() => []),
      ]);
      setData(list);
      setSummary(counts);
      setStepSummary(stepCounts);
    } catch (e) {
      setData(null);
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [context, platform, step, days, page]);

  useEffect(() => {
    load();
  }, [load]);

  // 필터가 바뀌면 첫 페이지부터
  const changeFilter = <T,>(setter: (v: T) => void) => (v: T) => {
    setPage(0);
    setOpenId(null);
    setter(v);
  };

  const total = summary.reduce((sum, c) => sum + c.count, 0);
  const contextOptions = ["", ...summary.map((c) => c.context)];
  if (context && !contextOptions.includes(context)) contextOptions.push(context);
  const countOf = (c: string) => (c ? summary.find((s) => s.context === c)?.count ?? 0 : total);

  const stepTotal = stepSummary.reduce((sum, c) => sum + c.count, 0);
  const stepOptions = ["", ...stepSummary.map((c) => c.step)];
  if (step && !stepOptions.includes(step)) stepOptions.push(step);
  const stepCountOf = (st: string) =>
    st ? stepSummary.find((s) => s.step === st)?.count ?? 0 : stepTotal;

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <Chips
          options={[...ERROR_DAYS]}
          value={days}
          label={(d) => (d === "1" ? "24시간" : `${d}일`)}
          onChange={changeFilter(setDays)}
        />
        <Chips
          options={[...PLATFORMS]}
          value={platform}
          label={(p) => (p === "" ? "전체 OS" : p === "ios" ? "iOS" : "Android")}
          onChange={changeFilter(setPlatform)}
        />
        <div style={{ flex: 1 }} />
        <button style={btnSecondary} onClick={load} disabled={loading}>
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>

      {/* context(어느 화면) 필터 — 건수 포함 */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {contextOptions.map((c) => (
          <CountPill
            key={c || "all"}
            on={c === context}
            label={c ? contextLabel(c) : "전체"}
            count={countOf(c)}
            onClick={() => {
              setStep("");
              changeFilter(setContext)(c);
            }}
          />
        ))}
      </div>

      {/* step(단계) 필터 — 선택한 화면 안에서의 건수 */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: "var(--admin-ink-3)", marginRight: 2 }}>단계</span>
        {stepOptions.map((st) => (
          <CountPill
            key={st || "all"}
            on={st === step}
            label={st || "전체"}
            count={stepCountOf(st)}
            onClick={() => changeFilter(setStep)(st)}
          />
        ))}
      </div>

      <div style={{ ...adminCardStyle, overflow: "hidden" }}>
        {error !== null ? (
          <EmptyBox height={220}>
            에러 로그를 불러오지 못했습니다.
            <br />
            {error}
          </EmptyBox>
        ) : !data ? (
          <EmptyBox height={220}>불러오는 중…</EmptyBox>
        ) : data.content.length === 0 ? (
          <EmptyBox height={220}>기간 내 앱 에러가 없습니다</EmptyBox>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 820 }}>
              <thead>
                <tr style={{ background: "#fafafb", color: "var(--admin-ink-3)", textAlign: "left" }}>
                  {["시간", "화면", "단계", "에러", "유저", "OS · 버전", "HTTP"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.content.map((row) => {
                  const open = openId === row.id;
                  const extra = prettyJson(row.extra);
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => setOpenId(open ? null : row.id)}
                        style={{
                          borderTop: "1px solid var(--admin-border)",
                          cursor: "pointer",
                          background: open ? "#f7f9ff" : "transparent",
                        }}
                      >
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: "var(--admin-ink-2)" }}>
                          {formatServerTime(row.createdAt)}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontWeight: 600 }}>
                          {contextLabel(row.context)}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          <code style={{ fontSize: 11.5, background: "#f0f1f4", padding: "2px 6px", borderRadius: 6 }}>
                            {row.step}
                          </code>
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            maxWidth: isMobile ? 220 : 380,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "var(--admin-red-ink)",
                          }}
                          title={row.errorMessage}
                        >
                          {row.errorMessage}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          {row.userId ? `${row.userNickname ?? "-"} (#${row.userId})` : <span style={{ color: "var(--admin-ink-3)" }}>익명</span>}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: "var(--admin-ink-2)" }}>
                          {row.platform ?? "-"} · {row.appVersion ?? "-"}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {row.httpStatus ?? "-"}
                        </td>
                      </tr>
                      {open && (
                        <tr style={{ background: "#f7f9ff" }}>
                          <td colSpan={7} style={{ padding: "4px 12px 14px" }}>
                            <pre
                              style={{
                                margin: 0,
                                padding: 12,
                                borderRadius: 10,
                                background: "#16161a",
                                color: "#e4e4e7",
                                fontSize: 12,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                              }}
                            >
                              {row.errorMessage}
                              {row.errorCode ? `\n\nerrorCode: ${row.errorCode}` : ""}
                              {extra ? `\n\nextra:\n${extra}` : ""}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <Pagination
            count={data.totalPages}
            page={page + 1}
            onChange={(_, p) => {
              setOpenId(null);
              setPage(p - 1);
            }}
            size={isMobile ? "small" : "medium"}
          />
        </div>
      )}
    </>
  );
}


const levelColor = (line: string) =>
  /\bERROR\b|Exception/.test(line) ? "#ff6b63" : /\bWARN\b/.test(line) ? "#ffb340" : "#d4d4d8";

const formatMillis = (ms: number | null, withSec = false) => {
  if (ms == null) return "-";
  const d = new Date(ms);
  const base = `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withSec ? `${base}:${pad(d.getSeconds())}` : base;
};

// 서버 로그 (통합) — prod EC2(CloudWatch) + dev Oracle(Loki) 의 모든 컨테이너 로그를 한 타임라인으로.
// 왼쪽 리소스 트리에서 VM·컨테이너를 고르면 오른쪽에 시간순으로 합쳐 보인다 (ArgoCD 로그 뷰 방식).

const LOG_LEVELS: LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG"];
const LIVE_INTERVAL_MS = 3000;
// CloudWatch 는 수집이 몇 초 늦다 → 실시간 조회는 마지막 줄보다 조금 앞부터 다시 받고 id 로 중복 제거
const LIVE_OVERLAP_MS = 15000;
const MAX_EVENTS = 3000;

const ENV_COLOR: Record<MonitoringEnv, { fg: string; bg: string }> = {
  PROD: { fg: "#5ea8ff", bg: "rgba(0,122,255,.18)" },
  DEV: { fg: "#4cd68a", bg: "rgba(45,189,111,.18)" },
};
// 컨테이너별 색 (어두운 콘솔 배경용)
const CONTAINER_COLORS = ["#c084fc", "#f472b6", "#fbbf24", "#22d3ee", "#a3e635", "#fb923c", "#93c5fd"];
const containerColor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CONTAINER_COLORS[h % CONTAINER_COLORS.length];
};
const LEVEL_COLOR: Record<LogLevel, string> = {
  ERROR: "#ff6b63",
  WARN: "#ffb340",
  INFO: "#d4d4d8",
  DEBUG: "#8e8e96",
  TRACE: "#6b6b76",
};
const LEVEL_CHIP: Record<LogLevel, { on: string; tint: string }> = {
  ERROR: { on: "var(--admin-red-ink)", tint: "var(--admin-red-tint)" },
  WARN: { on: "var(--admin-warn)", tint: "var(--admin-warn-tint)" },
  INFO: { on: "var(--admin-blue)", tint: "var(--admin-blue-tint)" },
  DEBUG: { on: "var(--admin-ink-2)", tint: "#f0f1f4" },
  TRACE: { on: "var(--admin-ink-2)", tint: "#f0f1f4" },
};

const formatLogTime = (ms: number) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(
    d.getMilliseconds()
  ).padStart(3, "0")}`;
};

const mergeEvents = (a: UnifiedLogEvent[], b: UnifiedLogEvent[]) => {
  const seen = new Set<string>();
  const out: UnifiedLogEvent[] = [];
  for (const e of [...a, ...b]) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out.sort((x, y) => x.timestamp - y.timestamp);
};

const isLive = (s: LogSource) => s.env === "DEV" || (s.lastEventAt != null && Date.now() - s.lastEventAt < 15 * 60 * 1000);

function CheckRow({
  checked,
  onChange,
  children,
  dot,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 8,
        cursor: "pointer",
        background: checked ? "var(--admin-blue-tint)" : "transparent",
        fontSize: 12.5,
      }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: "var(--admin-blue)" }} />
      {dot && <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, flexShrink: 0 }} />}
      <span style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 6 }}>{children}</span>
    </label>
  );
}

function ServerLogsPanel() {
  const isMobile = useIsMobile();
  const [range, setRange] = useState<MonitoringRange>("H24");
  const [sources, setSources] = useState<LogSources | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  // 끈 컨테이너만 기억 → 새 컨테이너가 생기면 기본으로 보인다
  const [hiddenContainers, setHiddenContainers] = useState<Set<string>>(new Set());
  const [levels, setLevels] = useState<Set<LogLevel>>(new Set());
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(false);

  const [events, setEvents] = useState<UnifiedLogEvent[] | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [logErrors, setLogErrors] = useState<LogSourceError[]>([]);
  const [logError, setLogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const consoleRef = React.useRef<HTMLDivElement>(null);
  const stickToBottom = React.useRef(true);
  const eventsRef = React.useRef<UnifiedLogEvent[] | null>(null);
  eventsRef.current = events;

  // 리소스 트리 — 기간이 바뀌면 다시. 처음엔 가동 중인 VM 전부 선택
  const loadSources = useCallback(() => {
    let cancelled = false;
    setSourcesError(null);
    getLogSources(range)
      .then((res) => {
        if (cancelled) return;
        setSources(res);
        setSelectedSources((cur) => {
          const keys = new Set(res.sources.map(sourceKey));
          const kept = new Set([...cur].filter((k) => keys.has(k)));
          if (kept.size > 0) return kept;
          const live = res.sources.filter(isLive);
          return new Set((live.length > 0 ? live : res.sources.slice(0, 1)).map(sourceKey));
        });
      })
      .catch((e) => !cancelled && setSourcesError(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => loadSources(), [loadSources]);

  const allContainers = useMemo(() => {
    const set = new Set<string>();
    sources?.sources.filter((s) => selectedSources.has(sourceKey(s))).forEach((s) => s.containers.forEach((c) => set.add(c)));
    return [...set].sort((a, b) => (a === "backend" ? -1 : b === "backend" ? 1 : a.localeCompare(b)));
  }, [sources, selectedSources]);

  const visibleContainers = useMemo(() => allContainers.filter((c) => !hiddenContainers.has(c)), [allContainers, hiddenContainers]);

  const request = useMemo(
    () => ({
      sources: [...selectedSources].sort(),
      // 전부 켜져 있으면 필터 생략
      containers: visibleContainers.length === allContainers.length ? undefined : visibleContainers,
      levels: levels.size > 0 ? [...levels] : undefined,
      query: query || undefined,
      range,
    }),
    [selectedSources, visibleContainers, allContainers, levels, query, range]
  );
  const requestKey = JSON.stringify(request);
  const nothingSelected = request.sources.length === 0 || (allContainers.length > 0 && visibleContainers.length === 0);

  // 처음 / 조건 변경 → 최신 로그부터
  const loadLatest = useCallback(async () => {
    if (nothingSelected) {
      setEvents([]);
      setCursor(null);
      return;
    }
    setLoading(true);
    setLogError(null);
    try {
      const res = await getUnifiedLogs(request);
      stickToBottom.current = true;
      setEvents(res.events);
      setCursor(res.cursor);
      setLogErrors(res.errors);
    } catch (e) {
      setLogError(errorText(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, nothingSelected]);

  useEffect(() => {
    if (!sources) return;
    setEvents(null);
    loadLatest();
  }, [loadLatest, sources]);

  const loadOlder = async () => {
    if (cursor == null) return;
    const el = consoleRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    setLoading(true);
    try {
      const res = await getUnifiedLogs({ ...request, before: cursor });
      stickToBottom.current = false;
      setEvents((prev) => mergeEvents(res.events, prev ?? []));
      setCursor(res.cursor);
      setLogErrors(res.errors);
      // 위에 붙여도 보던 줄이 그대로 보이게
      requestAnimationFrame(() => {
        if (el) el.scrollTop += el.scrollHeight - prevHeight;
      });
    } catch (e) {
      setLogError(errorText(e));
    } finally {
      setLoading(false);
    }
  };

  // 실시간 — 3초마다 마지막 줄 이후를 받아 아래에 붙인다
  useEffect(() => {
    if (!live || nothingSelected) return;
    let stopped = false;
    let busy = false;
    const tick = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const cur = eventsRef.current ?? [];
        const last = cur.length > 0 ? cur[cur.length - 1].timestamp : Date.now() - 60_000;
        const res = await getUnifiedLogs({ ...request, after: last - LIVE_OVERLAP_MS });
        if (stopped) return;
        if (res.events.length > 0) {
          setEvents((prev) => {
            const merged = mergeEvents(prev ?? [], res.events);
            if (merged.length <= MAX_EVENTS) return merged;
            const trimmed = merged.slice(merged.length - MAX_EVENTS);
            setCursor(trimmed[0].timestamp); // 잘라낸 앞부분은 "이전 로그 더 보기"로 다시
            return trimmed;
          });
        }
        setLogErrors(res.errors);
      } catch {
        // 일시 오류는 다음 틱에 다시
      } finally {
        busy = false;
      }
    };
    const id = setInterval(tick, LIVE_INTERVAL_MS);
    tick();
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, requestKey, nothingSelected]);

  // 맨 아래를 보고 있으면 새 줄이 와도 따라 내려간다
  useEffect(() => {
    const el = consoleRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [events]);

  const toggle = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const counts = useMemo(() => {
    const c: Partial<Record<LogLevel, number>> = {};
    events?.forEach((e) => e.level && (c[e.level] = (c[e.level] ?? 0) + 1));
    return c;
  }, [events]);

  const groups: { env: MonitoringEnv; title: string; list: LogSource[] }[] = sources
    ? [
        { env: "PROD", title: "PROD · AWS EC2", list: sources.sources.filter((s) => s.env === "PROD") },
        { env: "DEV", title: "DEV · Oracle", list: sources.sources.filter((s) => s.env === "DEV") },
      ]
    : [];

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <Chips options={RANGES} value={range} label={(v) => RANGE_LABEL[v]} onChange={setRange} />
        <div style={{ display: "inline-flex", gap: 4 }}>
          {LOG_LEVELS.map((lv) => {
            const on = levels.has(lv);
            return (
              <button
                key={lv}
                onClick={() => setLevels((s) => toggle(s, lv))}
                style={{
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  border: `1px solid ${on ? LEVEL_CHIP[lv].on : "var(--admin-border)"}`,
                  background: on ? LEVEL_CHIP[lv].tint : "#fff",
                  color: on ? LEVEL_CHIP[lv].on : "var(--admin-ink-2)",
                }}
              >
                {lv}
                {counts[lv] ? <span style={{ marginLeft: 5, fontWeight: 600, opacity: 0.75 }}>{counts[lv]}</span> : null}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(queryInput.trim());
          }}
          style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto" }}
        >
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="로그 검색 (대소문자 무시, 예: Exception, uid=12])"
            style={{
              height: 38,
              flex: 1,
              width: isMobile ? "auto" : 260,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid var(--admin-border)",
              fontSize: 13,
              background: "#fff",
            }}
          />
          <button type="submit" style={btnSecondary}>
            검색
          </button>
          {query && (
            <button
              type="button"
              style={btnSecondary}
              onClick={() => {
                setQueryInput("");
                setQuery("");
              }}
            >
              초기화
            </button>
          )}
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "270px minmax(0, 1fr)", gap: 14 }}>
        {/* ── 리소스 트리 ── */}
        <div style={{ ...adminCardStyle, padding: 14, alignSelf: "start" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>리소스</span>
            <button
              onClick={loadSources}
              style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--admin-ink-3)" }}
              title="VM 목록 새로고침"
            >
              ↻
            </button>
          </div>
          {sourcesError !== null ? (
            <EmptyBox height={160}>{sourcesError}</EmptyBox>
          ) : !sources ? (
            <EmptyBox height={160}>불러오는 중…</EmptyBox>
          ) : (
            <>
              {groups.map((g) => {
                const err = sources.errors.find((e) => e.env === g.env);
                return (
                  <div key={g.env} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--admin-ink-2)",
                        margin: "4px 0 4px 2px",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: g.env === "PROD" ? "var(--admin-blue)" : "var(--admin-good)" }} />
                      {g.title}
                    </div>
                    {err ? (
                      <div style={{ fontSize: 11.5, color: "var(--admin-red-ink)", padding: "4px 8px", wordBreak: "break-all" }}>
                        {err.message}
                      </div>
                    ) : g.list.length === 0 ? (
                      <div style={{ fontSize: 11.5, color: "var(--admin-ink-3)", padding: "4px 8px" }}>기간 내 로그 없음</div>
                    ) : (
                      g.list.map((s) => {
                        const key = sourceKey(s);
                        const on = selectedSources.has(key);
                        const alive = isLive(s);
                        return (
                          <CheckRow key={key} checked={on} onChange={() => setSelectedSources((cur) => toggle(cur, key))}>
                            <span title={s.instanceId} style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                              {shortId(s.instanceId)}
                            </span>
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 999,
                                background: alive ? "var(--admin-good-tint)" : "#f0f1f4",
                                color: alive ? "var(--admin-good)" : "var(--admin-ink-3)",
                              }}
                            >
                              {alive ? "가동 중" : `종료 ${formatMillis(s.lastEventAt)}`}
                            </span>
                          </CheckRow>
                        );
                      })
                    )}
                  </div>
                );
              })}

              <div style={{ borderTop: "1px solid var(--admin-border)", paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--admin-ink-2)", marginLeft: 2 }}>컨테이너</span>
                  {allContainers.length > 0 && (
                    <button
                      onClick={() => setHiddenContainers(visibleContainers.length === allContainers.length ? new Set(allContainers) : new Set())}
                      style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--admin-blue)", fontWeight: 600 }}
                    >
                      {visibleContainers.length === allContainers.length ? "모두 끄기" : "모두 켜기"}
                    </button>
                  )}
                </div>
                {allContainers.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: "var(--admin-ink-3)", padding: "4px 8px" }}>VM 을 선택하세요</div>
                ) : (
                  allContainers.map((c) => (
                    <CheckRow
                      key={c}
                      checked={!hiddenContainers.has(c)}
                      onChange={() => setHiddenContainers((cur) => toggle(cur, c))}
                      dot={containerColor(c)}
                    >
                      {c}
                    </CheckRow>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* ── 통합 로그 콘솔 ── */}
        <div style={{ ...adminCardStyle, padding: 14, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>통합 로그</span>
            <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
              VM {request.sources.length}개 · 컨테이너 {visibleContainers.length}개{events ? ` · ${events.length.toLocaleString()}줄` : ""}
            </span>
            {query && (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--admin-blue)", background: "var(--admin-blue-tint)", padding: "2px 8px", borderRadius: 999 }}>
                검색: {query}
              </span>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setLive((v) => !v)}
              disabled={nothingSelected}
              style={{
                ...btnSecondary,
                height: 30,
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderColor: live ? "var(--admin-good)" : undefined,
                color: live ? "var(--admin-good)" : undefined,
                background: live ? "var(--admin-good-tint)" : undefined,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: live ? "var(--admin-good)" : "var(--admin-ink-3)" }} />
              {live ? "실시간 켜짐" : "실시간"}
            </button>
            <button style={{ ...btnSecondary, height: 30, fontSize: 12 }} onClick={() => loadLatest()} disabled={loading || nothingSelected}>
              새로고침
            </button>
          </div>

          {logErrors.length > 0 && (
            <div
              style={{
                fontSize: 12,
                color: "var(--admin-red-ink)",
                background: "var(--admin-red-tint)",
                borderRadius: 8,
                padding: "6px 10px",
                marginBottom: 8,
                wordBreak: "break-all",
              }}
            >
              {logErrors.map((e) => `${ENV_LABEL[e.env]}${e.instanceId ? ` ${shortId(e.instanceId)}` : ""}: ${e.message}`).join(" / ")}
            </div>
          )}

          <div
            ref={consoleRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            }}
            style={{
              background: "#16161a",
              borderRadius: 10,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              lineHeight: 1.55,
              height: isMobile ? 520 : 660,
              overflow: "auto",
              padding: events && events.length > 0 ? "8px 12px" : 0,
            }}
          >
            {nothingSelected ? (
              <EmptyBox height={360}>왼쪽에서 VM 과 컨테이너를 선택하세요</EmptyBox>
            ) : logError !== null ? (
              <EmptyBox height={360}>{logError}</EmptyBox>
            ) : !events ? (
              <EmptyBox height={360}>불러오는 중…</EmptyBox>
            ) : events.length === 0 ? (
              <EmptyBox height={360}>{query || levels.size > 0 ? "조건에 맞는 로그가 없습니다" : "기간 내 로그가 없습니다"}</EmptyBox>
            ) : (
              <>
                {cursor != null && (
                  <button
                    onClick={loadOlder}
                    disabled={loading}
                    style={{ width: "100%", padding: "8px 0", fontSize: 12, color: "#a1a1aa", background: "#1f1f24", borderRadius: 6, margin: "4px 0" }}
                  >
                    {loading ? "불러오는 중…" : `이전 로그 더 보기 (${formatMillis(cursor, true)} 이전)`}
                  </button>
                )}
                {events.map((ev) => {
                  const env = ENV_COLOR[ev.env];
                  return (
                    <div key={ev.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "1px 0" }}>
                      <span style={{ color: "#6b6b76", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{formatLogTime(ev.timestamp)}</span>
                      <span
                        title={`${ev.env} ${ev.instanceId}`}
                        style={{ flexShrink: 0, color: env.fg, background: env.bg, borderRadius: 4, padding: "0 5px", fontSize: 11 }}
                      >
                        {ev.env === "PROD" ? `P·${ev.instanceId.slice(-4)}` : "DEV"}
                      </span>
                      <span style={{ flexShrink: 0, color: containerColor(ev.container), width: isMobile ? "auto" : 118, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ev.container}>
                        {ev.container}
                      </span>
                      <span style={{ color: ev.level ? LEVEL_COLOR[ev.level] : "#d4d4d8", whiteSpace: "pre-wrap", wordBreak: "break-all", minWidth: 0 }}>
                        {ev.message}
                      </span>
                    </div>
                  );
                })}
                {live && <div style={{ color: "#4cd68a", fontSize: 11.5, padding: "4px 0" }}>● 실시간 수신 중… (3초 간격)</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// 유저 추적 — 로그 줄의 uid / aid / rid 로 CloudWatch 검색 (모든 VM).
// 유저 → 행동(actionId: 오디션 지원·결제처럼 여러 API 묶음) → 요청(requestId: API 1번) 순서로 파고든다.

const TRACE_TYPES: TraceType[] = ["USER", "ACTION", "REQUEST"];

const shortTraceId = (id: string) => (id.length > 12 ? `${id.slice(0, 8)}…` : id);

const statusColor = (status: number) =>
  status >= 500
    ? { color: "var(--admin-red-ink)", background: "var(--admin-red-tint)" }
    : status >= 400
      ? { color: "var(--admin-warn)", background: "var(--admin-warn-tint)" }
      : { color: "var(--admin-good)", background: "var(--admin-good-tint)" };

function StatusBadge({ status }: { status: number }) {
  return (
    <span
      style={{
        ...statusColor(status),
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 999,
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
      }}
    >
      {status}
    </span>
  );
}

function IdChip({ kind, id, onClick }: { kind: string; id: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      title={`${kind} ${id}`}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 6,
        background: "#f0f1f4",
        color: onClick ? "var(--admin-blue)" : "var(--admin-ink-2)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {kind} {shortTraceId(id)}
    </button>
  );
}

/** API 호출 1줄 — 시간 · 메서드 경로 · 상태 · 소요시간 · (행동/요청 ID) */
function AccessRow({
  ev,
  onAction,
  onRequest,
}: {
  ev: TraceEvent;
  onAction?: (id: string) => void;
  onRequest?: (id: string) => void;
}) {
  const a = ev.access!;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 0",
        borderTop: "1px solid var(--admin-border)",
        fontSize: 12.5,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "var(--admin-ink-3)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
        {formatMillis(ev.timestamp, true)}
      </span>
      <StatusBadge status={a.status} />
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{a.method}</span>
      <span style={{ wordBreak: "break-all", flex: 1, minWidth: 160 }}>{a.path}</span>
      <span style={{ color: "var(--admin-ink-3)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{a.durationMs}ms</span>
      {onAction && ev.actionId && <IdChip kind="행동" id={ev.actionId} onClick={() => onAction(ev.actionId!)} />}
      {ev.requestId && <IdChip kind="요청" id={ev.requestId} onClick={onRequest ? () => onRequest(ev.requestId!) : undefined} />}
    </div>
  );
}

function LogLines({ events }: { events: TraceEvent[] }) {
  return (
    <div
      style={{
        background: "#16161a",
        borderRadius: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.55,
        padding: "8px 12px",
        overflow: "auto",
      }}
    >
      {events.map((ev, i) => (
        <div key={`${ev.timestamp}-${i}`} style={{ display: "flex", gap: 10, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          <span style={{ color: "#6b6b76", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{formatMillis(ev.timestamp, true)}</span>
          <span style={{ color: levelColor(ev.message) }}>{ev.message}</span>
        </div>
      ))}
    </div>
  );
}

/** 유저 검색 결과 — actionId 로 묶고 최근 행동이 위로 */
function UserTraceView({
  events,
  onAction,
  onRequest,
}: {
  events: TraceEvent[];
  onAction: (id: string) => void;
  onRequest: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, TraceEvent[]>();
    events.forEach((ev, i) => {
      const key = ev.actionId ? `a:${ev.actionId}` : `r:${ev.requestId ?? i}`;
      map.set(key, [...(map.get(key) ?? []), ev]);
    });
    return Array.from(map.entries())
      .map(([key, evs]) => ({ key, actionId: evs[0].actionId, events: [...evs].sort((a, b) => b.timestamp - a.timestamp) }))
      .sort((a, b) => b.events[0].timestamp - a.events[0].timestamp);
  }, [events]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {groups.map((g) =>
        g.actionId ? (
          <div key={g.key} style={{ border: "1px solid var(--admin-border)", borderRadius: 10, padding: "8px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>행동</span>
              <IdChip kind="" id={g.actionId} onClick={() => onAction(g.actionId!)} />
              <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>API {g.events.length}회</span>
              {g.events.some((e) => (e.access?.status ?? 0) >= 400) && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--admin-red-ink)", background: "var(--admin-red-tint)", padding: "2px 7px", borderRadius: 999 }}>
                  실패 포함
                </span>
              )}
            </div>
            {g.events.map((ev, i) => (
              <AccessRow key={`${ev.timestamp}-${i}`} ev={ev} onRequest={onRequest} />
            ))}
          </div>
        ) : (
          <div key={g.key} style={{ padding: "0 12px" }}>
            {g.events.map((ev, i) => (
              <AccessRow key={`${ev.timestamp}-${i}`} ev={ev} onAction={onAction} onRequest={onRequest} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

/** 행동 검색 결과 — 요청(requestId) 단위로 시간순, 각 요청의 에러 등 로그 줄을 아래에 */
function ActionTraceView({ events, onRequest }: { events: TraceEvent[]; onRequest: (id: string) => void }) {
  const requests = useMemo(() => {
    const map = new Map<string, TraceEvent[]>();
    events.forEach((ev, i) => {
      const key = ev.requestId ?? `none-${i}`;
      map.set(key, [...(map.get(key) ?? []), ev]);
    });
    return Array.from(map.entries()).sort((a, b) => a[1][0].timestamp - b[1][0].timestamp);
  }, [events]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {requests.map(([key, evs]) => {
        const access = evs.find((e) => e.access);
        const others = evs.filter((e) => !e.access);
        return (
          <div key={key} style={{ border: "1px solid var(--admin-border)", borderRadius: 10, padding: "4px 12px 10px" }}>
            {access ? (
              <AccessRow ev={access} onRequest={onRequest} />
            ) : (
              <div style={{ padding: "7px 0", fontSize: 12, color: "var(--admin-ink-3)" }}>요청 기록 없음 (진행 중이거나 기간 밖)</div>
            )}
            {others.length > 0 && <LogLines events={others} />}
          </div>
        );
      })}
    </div>
  );
}

function TracePanel() {
  const isMobile = useIsMobile();
  const [env, setEnv] = useState<MonitoringEnv>("PROD");
  const [range, setRange] = useState<MonitoringRange>("H24");
  const [type, setType] = useState<TraceType>("USER");
  const [input, setInput] = useState("");
  // 파고든 경로: 유저 → 행동 → 요청. 마지막이 현재 검색
  const [stack, setStack] = useState<{ type: TraceType; value: string; label: string }[]>([]);
  const [result, setResult] = useState<TraceEvents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<AdminUserSearchResult[] | null>(null);

  const current = stack[stack.length - 1];

  const load = useCallback(
    async (nextToken?: string) => {
      if (!current) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getTraceEvents({ env, type: current.type, value: current.value, range, nextToken });
        setResult((prev) => (nextToken && prev ? { ...res, events: [...prev.events, ...res.events] } : res));
      } catch (e) {
        setError(errorText(e));
      } finally {
        setLoading(false);
      }
    },
    [env, range, current]
  );

  useEffect(() => {
    setResult(null);
    load();
  }, [load]);

  const startSearch = async () => {
    const v = input.trim();
    if (!v) return;
    setCandidates(null);
    // 유저는 닉네임으로도 찾게 — 숫자가 아니면 관리자 유저 검색으로 후보를 띄운다
    if (type === "USER" && !/^\d+$/.test(v)) {
      try {
        setCandidates(await searchAdminUsers(v, 10));
      } catch (e) {
        setError(errorText(e));
      }
      return;
    }
    setStack([{ type, value: v, label: `${TRACE_TYPE_LABEL[type]} ${type === "USER" ? v : shortTraceId(v)}` }]);
  };

  const drill = (t: TraceType, v: string) =>
    setStack((prev) => [...prev, { type: t, value: v, label: `${TRACE_TYPE_LABEL[t]} ${shortTraceId(v)}` }]);

  const nickname = current?.type === "USER" ? result?.events.find((e) => e.nickname)?.nickname : null;

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <Chips options={ENVS} value={env} label={(v) => ENV_LABEL[v]} onChange={setEnv} />
        <Chips options={RANGES} value={range} label={(v) => RANGE_LABEL[v]} onChange={setRange} />
        <div style={{ flex: 1 }} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startSearch();
          }}
          style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}
        >
          <Chips options={TRACE_TYPES} value={type} label={(v) => TRACE_TYPE_LABEL[v]} onChange={setType} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={type === "USER" ? "유저 ID 또는 닉네임" : type === "ACTION" ? "행동 ID (X-Action-Id)" : "요청 ID (X-Request-Id)"}
            style={{
              height: 38,
              flex: 1,
              width: isMobile ? "auto" : 240,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid var(--admin-border)",
              fontSize: 13,
              background: "#fff",
            }}
          />
          <button type="submit" style={btnSecondary}>
            검색
          </button>
        </form>
      </div>

      {candidates && (
        <div style={{ ...adminCardStyle, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
            {candidates.length === 0 ? "일치하는 유저가 없습니다" : "유저를 선택하세요"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {candidates.map((u) => (
              <button
                key={u.userId}
                onClick={() => {
                  setCandidates(null);
                  setStack([{ type: "USER", value: String(u.userId), label: `유저 ${u.userNickname ?? u.userId}` }]);
                }}
                style={{ ...btnSecondary, height: 32, fontSize: 12.5 }}
              >
                {u.userNickname ?? "(닉네임 없음)"} · #{u.userId}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...adminCardStyle, padding: 14, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {stack.length === 0 ? (
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>유저 추적</span>
          ) : (
            stack.map((s, i) => {
              const last = i === stack.length - 1;
              return (
                <React.Fragment key={`${s.type}-${s.value}`}>
                  {i > 0 && <span style={{ color: "var(--admin-ink-3)" }}>›</span>}
                  <button
                    onClick={() => !last && setStack((prev) => prev.slice(0, i + 1))}
                    disabled={last}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: last ? "var(--admin-ink)" : "var(--admin-blue)",
                      cursor: last ? "default" : "pointer",
                    }}
                  >
                    {s.label}
                    {last && nickname && s.type === "USER" && !s.label.includes(nickname) ? ` (${nickname})` : ""}
                  </button>
                </React.Fragment>
              );
            })
          )}
          <div style={{ flex: 1 }} />
          <button style={{ ...btnSecondary, height: 30, fontSize: 12 }} onClick={() => load()} disabled={!current || loading}>
            새로고침
          </button>
        </div>

        {!current ? (
          <EmptyBox height={240}>
            유저 ID·닉네임, 행동 ID, 요청 ID 로 서버 로그를 찾습니다
            <br />
            유저 → 행동(오디션 지원·결제) → 요청 순서로 눌러서 파고들 수 있어요
          </EmptyBox>
        ) : error !== null ? (
          <EmptyBox height={240}>{error}</EmptyBox>
        ) : !result ? (
          <EmptyBox height={240}>불러오는 중…</EmptyBox>
        ) : !result.supported ? (
          <EmptyBox height={240}>Dev 서버 로그는 아직 수집하지 않습니다</EmptyBox>
        ) : result.events.length === 0 ? (
          <EmptyBox height={240}>
            {RANGE_LABEL[range]} 동안 기록이 없습니다
            {result.nextToken ? " (더 찾아보기를 눌러 계속 검색)" : ""}
          </EmptyBox>
        ) : current.type === "USER" ? (
          <UserTraceView
            events={result.events}
            onAction={(id) => drill("ACTION", id)}
            onRequest={(id) => drill("REQUEST", id)}
          />
        ) : current.type === "ACTION" ? (
          <ActionTraceView events={result.events} onRequest={(id) => drill("REQUEST", id)} />
        ) : (
          <LogLines events={result.events} />
        )}

        {current && result?.nextToken && (
          <button
            onClick={() => load(result.nextToken ?? undefined)}
            disabled={loading}
            style={{ ...btnSecondary, width: "100%", marginTop: 10, height: 34, fontSize: 12.5 }}
          >
            {loading ? "불러오는 중…" : result.events.length === 0 ? "더 찾아보기" : "다음 결과 더 보기"}
          </button>
        )}
      </div>
    </>
  );
}

function LogsTab() {
  const [section, setSection] = useState<LogSection>("appErrors");
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Chips options={LOG_SECTIONS} value={section} label={(v) => LOG_SECTION_LABEL[v]} onChange={setSection} />
      </div>
      {section === "appErrors" ? <AppErrorsPanel /> : section === "server" ? <ServerLogsPanel /> : <TracePanel />}
    </>
  );
}

/* ───────────────────────── 페이지 ───────────────────────── */

export default function MonitoringPage() {
  const ready = useAdminAuthGuard();
  const [tab, setTab] = useState<Tab>("resources");

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="시스템"
        title="시스템 모니터링"
        subtitle="Dev(Oracle) · Prod(AWS) 서버 리소스와 VM 별 로그"
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            margin: "0 0 16px",
            borderBottom: "1px solid var(--admin-border)",
          }}
        >
          {[
            { key: "resources" as const, label: "리소스" },
            { key: "logs" as const, label: "로그" },
          ].map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  position: "relative",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: on ? "var(--admin-ink)" : "var(--admin-ink-3)",
                  padding: "11px 2px",
                }}
              >
                {t.label}
                {on && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: -1,
                      height: 2,
                      background: "var(--admin-blue)",
                      borderRadius: 2,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {tab === "resources" ? <ResourcesTab /> : <LogsTab />}
      </PageShell>
    </AdminShell>
  );
}
