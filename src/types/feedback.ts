// src/types/feedback.ts
import type { AuditionProfileType } from "@/types/audition";

export interface FeedbackReviewer {
  userId: number;
  userName: string;
  userNickname: string;
  profileImageUrl: string;
  userTags: string;
  userDescription: string;
  createdAt: string; // ISO string
}

export interface AuditionFeedback {
  id: number;
  textReview: string;
  reviewer: FeedbackReviewer;
  application: AuditionProfileType; // ✅ 서버가 application을 이 구조로 내려주니까 재사용
}

export type AuditionFeedbackList = AuditionFeedback[];