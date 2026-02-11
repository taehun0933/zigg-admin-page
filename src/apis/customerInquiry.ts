import {
  CustomerInquiryPageResponse,
  CustomerInquiryReplyRequest,
  CustomerInquiryReplyResponse,
} from "@/types/customerInquiry";

import apiClient from "@/utils/apiClient";

import { handleApiError } from "@/utils/apiError";

const CUSTOMER_INQUIRY_PATH = "/communication-channels/messages";

/** 문의 목록 조회 (페이지네이션) */
export const getCustomerInquiryMessages = async (params?: {
  page?: number;
  size?: number;
  sort?: string;
}): Promise<CustomerInquiryPageResponse> => {
  try {
    const page = params?.page ?? 0;
    const size = params?.size ?? 20;
    const sort = params?.sort ?? "createAt,desc";
    const res = await apiClient.get<CustomerInquiryPageResponse>(
      `${CUSTOMER_INQUIRY_PATH}?page=${page}&size=${size}&sort=${sort}`
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/** 문의에 답장 등록 */
export const postCustomerInquiryReply = async (
  channelMessageId: number,
  body: CustomerInquiryReplyRequest
): Promise<CustomerInquiryReplyResponse> => {
  try {
    const res = await apiClient.post<CustomerInquiryReplyResponse>(
      `${CUSTOMER_INQUIRY_PATH}/${channelMessageId}/replies`,
      body
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
