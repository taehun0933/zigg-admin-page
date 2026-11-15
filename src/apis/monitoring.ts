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
