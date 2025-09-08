// lib/api/notice.ts
import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

/* ========= 타입 ========= */
export type NoticeLayout = "BANNER_ONLY" | "COMMON";

// 배너 리스트용
export interface AdminNoticeBanner {
  noticeId: number;
  bannerImage: {
    imageKey: string;
    onClickUrl: string | null;
  };
}

// 상세 조회 응답 (백엔드 스키마에 맞춰 필드명 작성)
export interface AdminNoticeDetail {
  noticeId: number;
  layout: NoticeLayout;
  title: string | null;
  textContent: string | null;
  priority: number;
  banner: { imageKey: string; onClickUrl: string | null } | null;
  imageContents: { imageKey: string; onClickUrl: string | null }[];
  videoContent:
    | { videoUrl?: string; videoKey?: string; videoDuration: number | string }
    | null;
  videoThumbnail:
    | { imageKey: string; onClickUrl: string | null }
    | null;
  createdAt?: string;
}

/* ========= 생성 요청 바디 ========= */

// 1) BANNER_ONLY
export interface CreateBannerOnlyNoticeBody {
  layout: "BANNER_ONLY";
  priority: number;                 // 예: 10
  bannerImageContent: number;       // 예: "s3://zigg/notice/banner/2025/08/31/banner_hero.jpg"
  onClickUrl?: string | null;       // 옵션
}

// 2) COMMON
export interface CreateCommonNoticeBody {
  layout: "COMMON";
  title: string;
  textContent: string;
  bannerImageContent?: string;      // 옵션
  noticeVideoContent?: number;
  noticeVideoThumbnail?: number;    // "s3://zigg/notice/videos/2025/08/31/teaser_thumb.jpg"
  noticeImageContent?: number[];      // ["s3://zigg/notice/images/2025/08/31/img_001.jpg"]
  priority?: number;                // 옵션
  onClickUrl?: string | null;       // 옵션(배너 클릭 외부 이동)
}

/* ========= 수정 요청 바디 ========= */
export interface UpdateNoticeBody {
  // 필요한 필드만 부분 갱신
  title?: string | null;
  textContent?: string | null;
  priority?: number;
  bannerImageContent?: string | null;
  noticeVideoContent?: {
    videoKey: string;
    videoDuration: number | string;
  } | null;
  noticeVideoThumbnail?: string | null;
  postImageContent?: string[] | null;
  onClickUrl?: string | null;
  layout?: NoticeLayout; // 필요 시
}

/* ========= 조회 API ========= */

// 배너 리스트
export const getAdminNoticeBanners = async (): Promise<AdminNoticeBanner[]> => {
  try {
    const res = await apiClient.get(`/notices/banners`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// 특정 공지 상세
export const getAdminNoticeDetail = async (
  noticeId: number
): Promise<AdminNoticeDetail> => {
  try {
    const res = await apiClient.get(`/notices/${noticeId}`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/* ========= 생성 API ========= */

// 1) BANNER_ONLY 생성
export const createBannerOnlyNotice = async (
  payload: Omit<CreateBannerOnlyNoticeBody, "layout"> & { layout?: "BANNER_ONLY" }
) => {
  try {
    const body: CreateBannerOnlyNoticeBody = {
      layout: "BANNER_ONLY",
      priority: payload.priority,
      bannerImageContent: payload.bannerImageContent,
    };
    const res = await apiClient.post(`/notices`, body);
    return res.data as AdminNoticeDetail;
  } catch (error) {
    throw handleApiError(error);
  }
};

// 2) COMMON 생성
export const createCommonNotice = async (
  payload: Omit<CreateCommonNoticeBody, "layout"> & { layout?: "COMMON" }
) => {
  try {
    const body: CreateCommonNoticeBody = {
      layout: "COMMON",
      title: payload.title,
      textContent: payload.textContent,
      bannerImageContent: payload.bannerImageContent,
      noticeVideoContent: payload.noticeVideoContent,
      noticeVideoThumbnail: payload.noticeVideoThumbnail,
      noticeImageContent: payload.noticeImageContent,
      priority: payload.priority,
      onClickUrl: payload.onClickUrl ?? null,
    };
    const res = await apiClient.post(`/notices`, body);
    return res.data as AdminNoticeDetail;
  } catch (error) {
    throw handleApiError(error);
  }
};

/* ========= 수정/삭제 API ========= */

// 4) 특정 공지 수정 (PATCH)
export const updateAdminNotice = async (
  noticeId: number,
  payload: UpdateNoticeBody
) => {
  try {
    const res = await apiClient.patch(`/notices/${noticeId}`, payload);
    return res.data as AdminNoticeDetail;
  } catch (error) {
    throw handleApiError(error);
  }
};

// 3) 특정 공지 삭제 (DELETE)
export const deleteAdminNotice = async (noticeId: number) => {
  try {
    const res = await apiClient.delete(`/notices/${noticeId}`);
    return res.data as AdminNoticeDetail;
  } catch (error) {
    throw handleApiError(error);
  }
};
