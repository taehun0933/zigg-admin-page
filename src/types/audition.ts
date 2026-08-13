import { MediaImageType, MediaVideoType } from "./media";
import { User } from "@/types/user";
import { PageResponse } from "@/types/common";

export interface AuditionProfileType {
  id: number;
  name: string;
  ageOrYear: string;
  height: string;
  weight: string;
  gender: string;
  nation: string;
  desiredPosition: string;
  introduction: string;
  images: MediaImageType[];
  videos: MediaVideoType[];
  instagramId: string;
  contactInfo: string;
  isLiked: boolean;
  isScrap: boolean;
  userId: number;
  auditionId: number;
  createdAt: string; // ISO string
  acceptFeedback: boolean;
  hasFeedback?: boolean; // 트레이너 피드백이 1건 이상 작성됐는지 ("피드백 완료" 표시용)
}

/** 오디션 프로필 목록 API 응답 (Spring Page) */
export type AuditionInfoType = PageResponse<AuditionProfileType>;

export interface AuditionDetailType {
  id: number;
  title: string;
  company: string;
  qualification: string;
  startDate: string;   // "YYYY-MM-DD"
  endDate: string;     // "YYYY-MM-DD"
  thumbnail?: {
    imageKey: string;        // https://...png
    onClickUrl: string | null;
  };
  likeCount: number;
  scrapCount: number;
  applicationCount: number;
  /** 피드백 마무리(일괄 공개) 시각 — null 이면 마무리 전 */
  feedbackFinalizedAt?: string | null;
}

/** 피드백에 저장된 항목별 점수 (name 은 채점 당시 항목명 스냅샷) */
export interface FeedbackItemScore {
  feedbackItemId: number;
  name: string;
  score: number; // 1..5
}

export interface AuditionFeedback {
  id: number;
  textReview: string;
  reviewer: User;
  application: AuditionProfileType;
  auditionTitle?: string | null;
  createdAt: string; // ISO string
  itemScores?: FeedbackItemScore[];
  /** 지원자에게 공개된 시각 — null 이면 마무리 전 초안 */
  publishedAt?: string | null;
}

export type AuditionFeedbackList = AuditionFeedback[];