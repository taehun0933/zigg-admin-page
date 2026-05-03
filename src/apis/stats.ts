import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

export interface PlatformStats {
  statDate: string;
  totalUsers: number;
  totalAuditions: number;
  totalApplications: number;
  countryBreakdown: Record<string, number> | null;
}

export async function fetchStatsOverview(): Promise<PlatformStats | null> {
  try {
    const res = await apiClient.get<PlatformStats>("/stats/overview");
    if (!res.data || typeof res.data !== "object") return null;
    return res.data;
  } catch (e) {
    handleApiError(e);
    return null;
  }
}

export async function fetchStatsTimeseries(
  from: string,
  to: string,
): Promise<PlatformStats[]> {
  try {
    const res = await apiClient.get<PlatformStats[]>(
      "/stats/timeseries",
      { params: { from, to } },
    );
    return res.data ?? [];
  } catch (e) {
    handleApiError(e);
    return [];
  }
}
