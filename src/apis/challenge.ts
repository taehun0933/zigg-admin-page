import apiClient from "@/utils/apiClient";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { handleApiError } from "@/utils/apiError";

export interface ChallengeImage {
  id?: number;
  url: string;
  width?: number | null;
  height?: number | null;
  uploadState?: string;
}

export interface Challenge {
  id: number;
  title: string;
  howTo?: string | null;
  winnerPrizes?: ChallengePrize[];
  originalYoutubeUrls?: string[];
  startAt: string;
  endAt: string;
  bannerImage?: ChallengeImage | null;
  challengeDetailImage?: ChallengeImage | null;
  isActive: boolean;
  reelCount: number;
  likeWeight: number | string;
  viewWeight: number | string;
  dDay: number;
  createdAt: string;
}

export interface ChallengePrize {
  rank: number;
  prize: string;
}

export interface ChallengePayload {
  title: string;
  startAt: string;
  endAt: string;
  bannerImageId?: number | null;
  challengeDetailImageId?: number | null;
  howTo?: string | null;
  winnerPrizes?: ChallengePrize[] | null;
  originalYoutubeUrls?: string[] | null;
  likeWeight: string;
  viewWeight: string;
}

export interface ChallengeReelImage {
  id?: number;
  url: string;
  uploadState?: string;
}

export interface ChallengeReelVideo {
  id: number;
  url: string;
  duration?: string | null;
  thumbnail?: ChallengeReelImage | null;
  uploadState?: string;
}

export interface ChallengeReelCreator {
  id: number;
  name?: string | null;
  nickname?: string | null;
  profileImage?: ChallengeReelImage | null;
}

export interface ChallengeRankingReel {
  id: number;
  challenge?: { id: number; title: string } | null;
  creator?: ChallengeReelCreator | null;
  video: ChallengeReelVideo;
  description?: string | null;
  tags?: string[];
  likeCount: number;
  viewCount: number;
  commentCount: number;
  completionCount?: number;
  createdAt: string;
}

export interface ChallengeRewardStatus {
  rank: number;
  amount: number;
  rewardedAt: string;
}

export interface ChallengeRankingEntry {
  rank: number;
  score: number | string;
  reward?: ChallengeRewardStatus | null;
  reel: ChallengeRankingReel;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface ChallengeRewardGrant {
  reelId: number;
  rank: number;
  amount: number;
}

export interface ChallengeRewardResult {
  challengeId: number;
  grantedCount: number;
  totalAmount: number;
  grants: {
    reelId: number;
    userId: number;
    nickname?: string | null;
    rank: number;
    amount: number;
  }[];
}

const replaceApiSegment = (segment: "/admin/v1" | "/api/v1") =>
  getApiBaseUrl().replace("/admin/v0", segment);

const adminV1BaseUrl = () => replaceApiSegment("/admin/v1");
const apiV1BaseUrl = () => replaceApiSegment("/api/v1");

export const getChallenges = async (): Promise<Challenge[]> => {
  try {
    const response = await apiClient.get<Challenge[]>("/challenges", {
      baseURL: apiV1BaseUrl(),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createChallenge = async (
  payload: ChallengePayload
): Promise<Challenge> => {
  try {
    const response = await apiClient.post<Challenge>("/challenges", payload, {
      baseURL: adminV1BaseUrl(),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateChallenge = async (
  challengeId: number,
  payload: ChallengePayload
): Promise<Challenge> => {
  try {
    const response = await apiClient.patch<Challenge>(
      `/challenges/${challengeId}`,
      payload,
      { baseURL: adminV1BaseUrl() }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteChallenge = async (
  challengeId: number
): Promise<Challenge> => {
  try {
    const response = await apiClient.delete<Challenge>(
      `/challenges/${challengeId}`,
      { baseURL: adminV1BaseUrl() }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getChallengeRanking = async (
  challengeId: number,
  page: number,
  size: number
): Promise<PageResponse<ChallengeRankingEntry>> => {
  try {
    const response = await apiClient.get<PageResponse<ChallengeRankingEntry>>(
      `/challenges/${challengeId}/reels/ranking`,
      { baseURL: adminV1BaseUrl(), params: { page, size } }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const distributeChallengeRewards = async (
  challengeId: number,
  grants: ChallengeRewardGrant[]
): Promise<ChallengeRewardResult> => {
  try {
    const response = await apiClient.post<ChallengeRewardResult>(
      `/challenges/${challengeId}/rewards`,
      { grants },
      { baseURL: adminV1BaseUrl() }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
