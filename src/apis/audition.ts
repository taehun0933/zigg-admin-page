import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

export const getAuditions = async () => {
  try {
    const response = await apiClient.get("/auditions");
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const postNewAudition = async (body: {
  title: string;
  company: string;
  qualification: string;
  thumbnailId: number;
  startDate: string;
  endDate: string;
}) => {
  try {
    const response = await apiClient.post("/auditions", body);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getAuditionInfo = async (auditionId: number) => {
  try {
    const response = await apiClient.get(`/auditions/${auditionId}`, {
      params: {
        page: 0,
        size: 6,
        // sort: ["test"], // 예시: createdAt 기준 내림차순
      },
    });
    console.log(response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const scrapApplicant = async (applicationId: number) => {
  try {
    const response = await apiClient.post(
      `/auditions/applications/${applicationId}/scrap`
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const likeApplicant = async (applicationId: number) => {
  try {
    const response = await apiClient.post(
      `/auditions/applications/${applicationId}/like`
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
