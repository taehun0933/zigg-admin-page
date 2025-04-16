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
