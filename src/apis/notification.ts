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

/**
 * 특정 오디션 알림(AUDITION_REMINDER) 전체 유저에게 발송.
 * 백엔드가 오디션 정보로 title/body 자동 생성 — 추가 입력 없음.
 */
export const sendAuditionNotification = async (
  auditionId: number
): Promise<void> => {
  try {
    await apiClient.post(`/auditions/${auditionId}/notifications`);
  } catch (error) {
    throw handleApiError(error);
  }
};
