import { AuditionFeedbackList } from "@/types/feedback";
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
