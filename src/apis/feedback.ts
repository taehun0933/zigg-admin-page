import { AuditionFeedbackList } from "@/types/audition";
import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

export const sendApplicationFeedback = async (body: {
    auditionId: number;
    applicationId: number;
    textReview: string;
  }) => {
    try {
      const res = await apiClient.post(
        `/auditions/${body.auditionId}/applications/${body.applicationId}/feedbacks`,
        { textReview: body.textReview }
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
// 같은 지원자에게 내가(현재 강사) 이전 오디션에서 남긴 피드백 (현재 지원서 제외)
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