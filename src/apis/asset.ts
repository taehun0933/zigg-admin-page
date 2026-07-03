import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

/* ========= 타입 ========= */

export type FeedbackItemCategory = "RAP" | "VOCAL" | "DANCE";

export interface AdminTerms {
  termsId: number;
  title: string;
  content: string;
  isRequired: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTermsBody {
  title: string;
  content: string;
  isRequired?: boolean;
  displayOrder?: number;
}

export interface UpdateTermsBody {
  title?: string;
  content?: string;
  isRequired?: boolean;
  displayOrder?: number;
}

export interface AdminFeedbackItem {
  feedbackItemId: number;
  category: FeedbackItemCategory;
  name: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFeedbackItemBody {
  category: FeedbackItemCategory;
  name: string;
  displayOrder?: number;
}

export interface UpdateFeedbackItemBody {
  category?: FeedbackItemCategory;
  name?: string;
  displayOrder?: number;
}

/* ========= 약관 API ========= */

export const getAdminTermsList = async (): Promise<AdminTerms[]> => {
  try {
    const res = await apiClient.get(`/assets/terms`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createAdminTerms = async (body: CreateTermsBody): Promise<AdminTerms> => {
  try {
    const res = await apiClient.post(`/assets/terms`, body);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateAdminTerms = async (
  termsId: number,
  body: UpdateTermsBody
): Promise<AdminTerms> => {
  try {
    const res = await apiClient.patch(`/assets/terms/${termsId}`, body);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteAdminTerms = async (termsId: number): Promise<AdminTerms> => {
  try {
    const res = await apiClient.delete(`/assets/terms/${termsId}`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/* ========= 피드백 항목 API ========= */

export const getAdminFeedbackItems = async (
  category?: FeedbackItemCategory
): Promise<AdminFeedbackItem[]> => {
  try {
    const res = await apiClient.get(`/assets/feedback-items`, {
      params: category ? { category } : undefined,
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createAdminFeedbackItem = async (
  body: CreateFeedbackItemBody
): Promise<AdminFeedbackItem> => {
  try {
    const res = await apiClient.post(`/assets/feedback-items`, body);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateAdminFeedbackItem = async (
  itemId: number,
  body: UpdateFeedbackItemBody
): Promise<AdminFeedbackItem> => {
  try {
    const res = await apiClient.patch(`/assets/feedback-items/${itemId}`, body);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteAdminFeedbackItem = async (
  itemId: number
): Promise<AdminFeedbackItem> => {
  try {
    const res = await apiClient.delete(`/assets/feedback-items/${itemId}`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
