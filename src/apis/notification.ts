import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

export interface AdminBroadcastNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** 전체 유저 대상 알림(FCM push + 인앱 기록) 발송 */
export const broadcastNotification = async (
  payload: AdminBroadcastNotificationRequest
): Promise<void> => {
  try {
    await apiClient.post("/notifications/broadcast", payload);
  } catch (error) {
    throw handleApiError(error);
  }
};
