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
  ClientErrorLog,
  ENV_LABEL,
  getClientErrors,
  getClientErrorSummary,
  getResourceMonitoring,
  MetricPanel,
  MonitoringEnv,
  MonitoringRange,
  MonitoringUnit,
  RANGE_LABEL,
  ResourceMonitoring,
  SpringPage,
} from "@/apis/monitoring";
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
      setError(handleApiError(e).message);
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

      {error ? (
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

type LogSection = "appErrors" | "server";
const LOG_SECTIONS: LogSection[] = ["appErrors", "server"];
const LOG_SECTION_LABEL: Record<LogSection, string> = { appErrors: "앱 에러", server: "서버 로그" };

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

function AppErrorsPanel() {
  const isMobile = useIsMobile();
  const [days, setDays] = useState<ErrorDays>("7");
  const [context, setContext] = useState<string>("");
  const [platform, setPlatform] = useState<PlatformFilter>("");
  const [page, setPage] = useState(0);
  const [summary, setSummary] = useState<ClientErrorContextCount[]>([]);
  const [data, setData] = useState<SpringPage<ClientErrorLog> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, counts] = await Promise.all([
        getClientErrors({ context: context || undefined, platform: platform || undefined, days: Number(days), page }),
        getClientErrorSummary(Number(days)),
      ]);
      setData(list);
      setSummary(counts);
    } catch (e) {
      setData(null);
      setError(handleApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [context, platform, days, page]);

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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {contextOptions.map((c) => {
          const on = c === context;
          return (
            <button
              key={c || "all"}
              onClick={() => changeFilter(setContext)(c)}
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
              {c ? contextLabel(c) : "전체"}
              <span style={{ marginLeft: 5, fontVariantNumeric: "tabular-nums", opacity: 0.8 }}>
                {countOf(c).toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ ...adminCardStyle, overflow: "hidden" }}>
        {error ? (
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

// 서버 로그 — CloudWatch 연동(dev 수집 방식 확정) 후 API 연결
function ServerLogsPanel() {
  const isMobile = useIsMobile();
  const [env, setEnv] = useState<MonitoringEnv>("PROD");
  const [range, setRange] = useState<MonitoringRange>("H24");

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <Chips options={ENVS} value={env} label={(v) => ENV_LABEL[v]} onChange={setEnv} />
        <Chips options={RANGES} value={range} label={(v) => RANGE_LABEL[v]} onChange={setRange} />
        <div style={{ flex: 1 }} />
        <input
          disabled
          placeholder="로그 검색 (예: ERROR, userId)"
          style={{
            height: 38,
            width: isMobile ? "100%" : 260,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid var(--admin-border)",
            fontSize: 13,
            background: "#fafafb",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "260px minmax(0, 1fr)",
          gap: 14,
        }}
      >
        <div style={{ ...adminCardStyle, padding: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>VM 목록</div>
          <div style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>
            {RANGE_LABEL[range]} 동안 떠 있던 {env === "PROD" ? "EC2 인스턴스" : "백엔드 컨테이너(배포)"}
          </div>
          <EmptyBox height={200}>로그 수집 연동 후 표시됩니다</EmptyBox>
        </div>
        <div style={{ ...adminCardStyle, padding: 14, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>로그</div>
          <div
            style={{
              background: "#16161a",
              borderRadius: 10,
              color: "#a1a1aa",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
            }}
          >
            <EmptyBox height={360}>VM 을 선택하면 해당 기간의 로그가 여기에 표시됩니다</EmptyBox>
          </div>
        </div>
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
      {section === "appErrors" ? <AppErrorsPanel /> : <ServerLogsPanel />}
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
