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

/** 인앱 결제 플랫폼. 결제 건이 연결되지 않은 로그(무료 지급 · V1.7.3 이전 결제)는 null */
export type PaymentPlatform = "IOS" | "ANDROID";

export interface TicketPurchase {
  logId: number;
  userId: number;
  nickname: string | null;
  userName: string | null;
  profileImageUrl: string | null;
  productName: string;
  amount: number;
  /** 실제 인앱 결제인지 (false = 가입 축하 티켓 등 무료 지급) */
  paid: boolean;
  platform: PaymentPlatform | null;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // 현재 페이지 (0-based)
  size: number;
}

/**
 * @param paidOnly true 면 실결제만 (가입 축하 티켓 등 무료 지급 제외). 백엔드 기본은 false(전체).
 */
export async function getTicketPurchases(
  page: number,
  nickname?: string,
  size = 20,
  paidOnly = false
): Promise<Page<TicketPurchase>> {
  try {
    const res = await apiClient.get("/tickets/purchases", {
      params: {
        page,
        size,
        paidOnly,
        ...(nickname?.trim() ? { nickname: nickname.trim() } : {}),
      },
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
  | "ADMIN_ADJUSTMENT"
  | "CHALLENGE_REWARD";

export interface TicketLogItem {
  logId: number;
  type: TicketLogType;
  amount: number;
  productName: string;
  paid: boolean;
  platform: PaymentPlatform | null;
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
