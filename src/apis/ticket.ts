import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

export interface UserSearchResult {
  userId: number;
  userNickname: string;
  userName: string | null;
  profileImageUrl: string | null;
}

export interface TicketGrantResponse {
  userId: number;
  nickname: string;
  grantedAmount: number;
  message: string;
}

export async function searchUsersByNickname(nickname: string): Promise<UserSearchResult[]> {
  try {
    const res = await apiClient.get("/tickets/users/search", {
      params: { nickname },
    });
    return res.data;
  } catch (e) {
    handleApiError(e);
    return [];
  }
}

export async function grantTickets(
  nickname: string,
  amount: number,
  reason?: string
): Promise<TicketGrantResponse> {
  try {
    const res = await apiClient.post("/tickets/grant", {
      nickname,
      amount,
      reason,
    });
    return res.data;
  } catch (e) {
    handleApiError(e);
    throw e;
  }
}

// ─── 결제내역 (구매 로그 기준) ────────────────────────────────────────────────

export interface TicketPurchase {
  logId: number;
  userId: number;
  nickname: string | null;
  userName: string | null;
  profileImageUrl: string | null;
  productName: string;
  amount: number;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // 현재 페이지 (0-based)
  size: number;
}

export async function getTicketPurchases(
  page: number,
  nickname?: string,
  size = 20
): Promise<Page<TicketPurchase>> {
  try {
    const res = await apiClient.get("/tickets/purchases", {
      params: { page, size, ...(nickname?.trim() ? { nickname: nickname.trim() } : {}) },
    });
    return res.data;
  } catch (e) {
    handleApiError(e);
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size };
  }
}

// ─── 유저 티켓 요약 (지급 화면에서 선택 시) ────────────────────────────────────

export type TicketLogType =
  | "USE"
  | "PURCHASE"
  | "AUDITION_CANCEL"
  | "REFUND"
  | "ADMIN_ADJUSTMENT";

export interface TicketLogItem {
  logId: number;
  type: TicketLogType;
  amount: number;
  productName: string;
  createdAt: string;
}

export interface UserTicketSummary {
  userId: number;
  nickname: string | null;
  userName: string | null;
  profileImageUrl: string | null;
  remainAmount: number;
  purchasedTotal: number;
  usedTotal: number;
  logs: TicketLogItem[];
}

export async function getUserTicketSummary(
  userId: number
): Promise<UserTicketSummary | null> {
  try {
    const res = await apiClient.get(`/tickets/users/${userId}/summary`);
    return res.data;
  } catch (e) {
    handleApiError(e);
    return null;
  }
}
