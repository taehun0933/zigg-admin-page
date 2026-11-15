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
