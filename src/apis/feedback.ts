import { AuditionFeedbackList } from "@/types/audition";
import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

export const sendApplicationFeedback = async (body: {
    auditionId: number;
    applicationId: number;
    textReview: string;
    /** 항목 평가 점수 (없으면 텍스트만 전송) */
    itemScores?: { feedbackItemId: number; score: number }[];
  }) => {
    try {
      const res = await apiClient.post(
        `/auditions/${body.auditionId}/applications/${body.applicationId}/feedbacks`,
        {
          textReview: body.textReview,
          ...(body.itemScores && body.itemScores.length > 0
            ? { itemScores: body.itemScores }
            : {}),
        }
      );
      return res.status;
    } catch (error) {
      throw handleApiError(error);
    }
  };

// {{API_URL}}/admin/v0/auditions/{{auditionId}}/applications/{{applicationId}}/feedbacks
export const getAuditionFeedbacks = async (
  auditionId: number,
  applicationId: number
): Promise<AuditionFeedbackList> => {
  try {
    const res = await apiClient.get<AuditionFeedbackList>(
      `/auditions/${auditionId}/applications/${applicationId}/feedbacks`
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// {{API_URL}}/admin/v0/auditions/{{auditionId}}/applications/{{applicationId}}/feedbacks/history
// 이 지원자가 이전 오디션들에서 받은 모든 피드백 (심사위원 무관, 현재 지원서 제외)
export const getApplicantFeedbackHistory = async (
  auditionId: number,
  applicationId: number
): Promise<AuditionFeedbackList> => {
  try {
    const res = await apiClient.get<AuditionFeedbackList>(
      `/auditions/${auditionId}/applications/${applicationId}/feedbacks/history`
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// 오디션 피드백 마무리하기 — 대기(초안) 피드백 일괄 공개 + 지원자들에게 푸시 알림 발송
export interface FinalizeAuditionFeedbacksResult {
  publishedCount: number;
  notifiedUserCount: number;
  finalizedAt: string;
}

export const finalizeAuditionFeedbacks = async (
  auditionId: number
): Promise<FinalizeAuditionFeedbacksResult> => {
  try {
    const res = await apiClient.post<FinalizeAuditionFeedbacksResult>(
      `/auditions/${auditionId}/feedbacks/finalize`
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteAuditionFeedback = async (
  auditionId: number,
  applicationId: number,
  feedbackId: number
) => {
  const res = await apiClient.delete(
    `/auditions/${auditionId}/applications/${applicationId}/feedbacks/${feedbackId}`
  );
  return res.status;
}

export const updateAuditionFeedback = async (body: {
  auditionId: number;
  applicationId: number;
  feedbackId: number;
  textReview: string;
}) => {
  try {
    const res = await apiClient.patch(
      `/auditions/${body.auditionId}/applications/${body.applicationId}/feedbacks/${body.feedbackId}`,
      { textReview: body.textReview }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};