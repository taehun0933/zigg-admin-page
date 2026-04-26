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
    const res = await apiClient.get("/admin/v0/tickets/users/search", {
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
    const res = await apiClient.post("/admin/v0/tickets/grant", {
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
