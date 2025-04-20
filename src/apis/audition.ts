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
