import { ApiErrorType } from "@/types/apiResponse";
import { AxiosError } from "axios";

export const handleApiError = (error: unknown): ApiErrorType => {
  const axiosError = error as AxiosError;
  if (axiosError.response) {
    const data = axiosError.response.data;
    // 백엔드 에러 응답은 { errorCode, message, timeStamp } 형태이거나 문자열일 수 있다.
    let message: string;
    if (typeof data === "string") {
      message = data;
    } else if (data && typeof data === "object" && "message" in data) {
      message = String((data as { message: unknown }).message);
    } else {
      message = "요청 처리 중 오류가 발생했습니다.";
    }
    return {
      message,
      status: axiosError.response.status,
    };
  }
  return {
    message: axiosError.message || "알 수 없는 에러가 발생했습니다.",
  };
};
