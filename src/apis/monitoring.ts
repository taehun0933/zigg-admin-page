import apiClient from "@/utils/apiClient";

// 백엔드 /admin/v0/monitoring/* — 지표 저장소는 Oracle dev VM 의 Prometheus 하나(dev+prod).
// 어느 서버(ServerToggle)로 붙든 같은 데이터가 나온다.

export type MonitoringEnv = "DEV" | "PROD";
export type MonitoringRange = "H1" | "H6" | "H24" | "D7" | "D30";
export type MonitoringUnit =
  | "PERCENT"
  | "BYTES"
  | "BYTES_PER_SECOND"
  | "REQUESTS_PER_SECOND";

export interface MetricPoint {
  t: number; // epoch seconds
  v: number;
}

export interface MetricSeries {
  instanceId: string;
  points: MetricPoint[];
}

export interface MetricPanel {
  key: string;
  title: string;
  unit: MonitoringUnit;
  series: MetricSeries[];
}

export interface MonitoringInstance {
  instanceId: string;
  firstSeen: number;
  lastSeen: number;
}

export interface ResourceMonitoring {
  env: MonitoringEnv;
  range: MonitoringRange;
  start: number;
  end: number;
  stepSeconds: number;
  instances: MonitoringInstance[];
  panels: MetricPanel[];
}

export const RANGE_LABEL: Record<MonitoringRange, string> = {
  H1: "1시간",
  H6: "6시간",
  H24: "24시간",
  D7: "7일",
  D30: "30일",
};

export const ENV_LABEL: Record<MonitoringEnv, string> = {
  DEV: "Dev · Oracle",
  PROD: "Prod · AWS",
};

export async function getResourceMonitoring(
  env: MonitoringEnv,
  range: MonitoringRange
): Promise<ResourceMonitoring> {
  const res = await apiClient.get<ResourceMonitoring>("/monitoring/resources", {
    params: { env, range },
  });
  return res.data;
}

/* ───────────── 앱 에러 로그 (client_error_log) ───────────── */

export interface ClientErrorLog {
  id: number;
  userId: number | null;
  userNickname: string | null;
  context: string; // reel_upload, post_upload, space_video_upload ...
  step: string; // s3_put_video, VIDEO_CONTENT_FAILED ...
  errorMessage: string;
  errorCode: string | null;
  httpStatus: number | null;
  platform: string | null;
  appVersion: string | null;
  extra: string | null; // JSON 문자열
  createdAt: string; // UTC LocalDateTime ("Z" 없음)
}

export interface ClientErrorContextCount {
  context: string;
  count: number;
}

export interface ClientErrorStepCount {
  step: string;
  count: number;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const CLIENT_ERROR_CONTEXT_LABEL: Record<string, string> = {
  reel_upload: "릴스 업로드",
  post_upload: "게시글 업로드",
  space_video_upload: "스페이스 영상",
  chat_video_upload: "채팅 영상",
  inquiry_video_upload: "문의 영상",
  audition_video_upload: "오디션 영상",
  s3_upload: "기타 업로드",
  ticket_payment: "티켓 결제",
};

export async function getClientErrors(params: {
  context?: string;
  platform?: string;
  step?: string;
  days: number;
  page: number;
  size?: number;
}): Promise<SpringPage<ClientErrorLog>> {
  const res = await apiClient.get<SpringPage<ClientErrorLog>>("/client-errors", {
    params: { size: 30, ...params },
  });
  return res.data;
}

export async function getClientErrorSummary(days: number): Promise<ClientErrorContextCount[]> {
  const res = await apiClient.get<ClientErrorContextCount[]>("/client-errors/summary", {
    params: { days },
  });
  return res.data;
}

/** step(pick, upload, s3_put_video …) 별 건수. context 를 주면 그 화면 안에서만 센다. */
export async function getClientErrorStepSummary(
  days: number,
  context?: string
): Promise<ClientErrorStepCount[]> {
  const res = await apiClient.get<ClientErrorStepCount[]>("/client-errors/summary/steps", {
    params: { days, context },
  });
  return res.data;
}

/* ───────────── 서버 로그 (CloudWatch, VM 별) ───────────── */

export interface LogInstance {
  instanceId: string;
  firstEventAt: number | null; // epoch millis
  lastEventAt: number | null;
}

export interface LogInstances {
  supported: boolean; // false = 수집 미연동(dev)
  instances: LogInstance[];
}

export interface LogEvent {
  timestamp: number; // epoch millis
  message: string;
}

export interface LogEvents {
  events: LogEvent[]; // 시간 오름차순
  nextToken: string | null; // 검색 없음 = 더 이전 로그, 검색 중 = 다음 결과
  searching: boolean;
}

export async function getLogInstances(env: MonitoringEnv, range: MonitoringRange): Promise<LogInstances> {
  const res = await apiClient.get<LogInstances>("/monitoring/logs/instances", { params: { env, range } });
  return res.data;
}

export async function getLogEvents(params: {
  env: MonitoringEnv;
  instanceId: string;
  range: MonitoringRange;
  query?: string;
  nextToken?: string;
}): Promise<LogEvents> {
  const res = await apiClient.get<LogEvents>("/monitoring/logs", { params });
  return res.data;
}

/* ───────────── 통합 로그 (prod CloudWatch + dev Loki 한 타임라인) ───────────── */

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";

export interface LogSource {
  env: MonitoringEnv;
  instanceId: string; // prod = EC2 인스턴스 ID, dev = oracle-dev
  firstEventAt: number | null; // epoch millis
  lastEventAt: number | null;
  containers: string[];
}

export interface LogSourceError {
  env: MonitoringEnv;
  instanceId: string | null;
  message: string;
}

export interface LogSources {
  sources: LogSource[];
  errors: LogSourceError[];
}

export interface UnifiedLogEvent {
  id: string; // 중복 제거 키
  timestamp: number; // epoch millis
  env: MonitoringEnv;
  instanceId: string;
  container: string;
  level: LogLevel | null;
  requestId: string | null;
  actionId: string | null;
  userId: number | null;
  message: string;
}

export interface UnifiedLogEvents {
  events: UnifiedLogEvent[]; // 시간 오름차순
  cursor: number | null; // 더 이전 로그 볼 때 before 로
  errors: LogSourceError[];
}

export const sourceKey = (s: { env: MonitoringEnv; instanceId: string }) => `${s.env}:${s.instanceId}`;

export async function getLogSources(range: MonitoringRange): Promise<LogSources> {
  const res = await apiClient.get<LogSources>("/monitoring/logs/sources", { params: { range } });
  return res.data;
}

// 배열은 콤마로 (axios 기본 sources[]= 형식은 Spring 이 못 받는다)
export async function getUnifiedLogs(params: {
  sources: string[];
  containers?: string[];
  levels?: LogLevel[];
  query?: string;
  range: MonitoringRange;
  before?: number;
  after?: number;
}): Promise<UnifiedLogEvents> {
  const { sources, containers, levels, ...rest } = params;
  const res = await apiClient.get<UnifiedLogEvents>("/monitoring/logs/unified", {
    params: {
      ...rest,
      sources: sources.join(","),
      containers: containers?.join(","),
      levels: levels?.join(","),
    },
  });
  return res.data;
}

/* ───────────── 유저 추적 (userId → actionId → requestId) ───────────── */

// USER = 유저의 API 호출 목록, ACTION = 한 행동(오디션 지원·결제 등)의 모든 로그, REQUEST = API 호출 1번의 모든 로그
export type TraceType = "USER" | "ACTION" | "REQUEST";

export const TRACE_TYPE_LABEL: Record<TraceType, string> = {
  USER: "유저",
  ACTION: "행동 ID",
  REQUEST: "요청 ID",
};

export interface TraceAccess {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export interface TraceEvent {
  timestamp: number; // epoch millis
  instanceId: string;
  level: string | null;
  requestId: string | null;
  actionId: string | null;
  userId: number | null;
  nickname: string | null;
  access: TraceAccess | null; // access log 줄일 때만
  message: string;
}

export interface TraceEvents {
  supported: boolean; // false = 수집 미연동(dev)
  events: TraceEvent[]; // 시간 오름차순
  nextToken: string | null;
}

export async function getTraceEvents(params: {
  env: MonitoringEnv;
  type: TraceType;
  value: string;
  range: MonitoringRange;
  nextToken?: string;
}): Promise<TraceEvents> {
  const res = await apiClient.get<TraceEvents>("/monitoring/logs/trace", { params });
  return res.data;
}
