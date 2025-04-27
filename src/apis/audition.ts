import { AuditionInfoType } from "@/types/audition";
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

export const getAuditionInfo = async (body: {
  auditionId: number;
  pageNum: number;
}): Promise<AuditionInfoType> => {
  try {
    const response = await apiClient.get<AuditionInfoType>(
      `/auditions/${body.auditionId}`,
      {
        params: {
          page: body.pageNum,
        },
      }
    );

    console.log(response.data);

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const scrapApplicant = async (body: {
  applicationId: number;
  auditionId: number;
}) => {
  try {
    const response = await apiClient.post(
      `/auditions/${body.auditionId}/applications/${body.applicationId}/scrap`
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const likeApplicant = async (body: {
  applicationId: number;
  auditionId: number;
}) => {
  try {
    const response = await apiClient.post(
      `/auditions/${body.auditionId}/applications/${body.applicationId}/like`
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
