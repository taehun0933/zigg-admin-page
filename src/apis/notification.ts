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
 * title/body 미지정(or 빈 문자열) 시 백엔드가 오디션 정보로 자동 생성.
 */
export const sendAuditionNotification = async (
  auditionId: number,
  payload?: { title?: string; body?: string }
): Promise<void> => {
  try {
    await apiClient.post(
      `/auditions/${auditionId}/notifications`,
      payload ?? {}
    );
  } catch (error) {
    throw handleApiError(error);
  }
};
