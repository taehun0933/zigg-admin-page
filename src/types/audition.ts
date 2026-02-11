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
}

export interface AuditionFeedback {
  id: number;
  textReview: string;
  reviewer: User;
  application: AuditionProfileType; 
}

export type AuditionFeedbackList = AuditionFeedback[];