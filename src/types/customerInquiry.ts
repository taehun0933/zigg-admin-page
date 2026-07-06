import { User } from "@/types/user";
import { PageResponse } from "@/types/common";

/** 문의 답글 (리스트/상세 공통) */
export interface CustomerInquiryReplyType {
  id: number;
  message: string;
  sender: User;
  createdAt: string;
}


/** 문의 첨부 이미지 — imageKey 에 CDN 전체 URL 이 담겨 내려온다 */
export interface CustomerInquiryImageType {
  imageKey: string;
}

/** 문의 상세 (content 한 건) */
export interface CustomerInquiryDetailType {
  id: number;
  user: User;
  title: string;
  message: string;
  images?: CustomerInquiryImageType[];
  replies: CustomerInquiryReplyType[];
  createdAt: string;
}

/** 문의 답장 API 요청 (답장 등록 시 body) */
export interface CustomerInquiryReplyRequest {
  message: string;
}

/** 문의 답장 API 응답 (답장 등록 후 반환) */
export type CustomerInquiryReplyResponse = CustomerInquiryReplyType;

/** 문의 목록 API 응답 (Spring Page) */
export type CustomerInquiryPageResponse = PageResponse<CustomerInquiryDetailType>;
