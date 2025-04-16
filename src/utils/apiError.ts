import { ApiErrorType } from "@/types/apiResponse";
import { AxiosError } from "axios";

export const handleApiError = (error: unknown): ApiErrorType => {
  const axiosError = error as AxiosError;
  if (axiosError.response) {
    return {
      message: axiosError.response.data as string,
      status: axiosError.response.status,
    };
  }
  return {
    message: axiosError.message || "알 수 없는 에러가 발생했습니다.",
  };
};
