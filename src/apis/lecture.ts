import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { getFileExtension, getImageDimensions, getVideoDurationSec } from "@/utils/media";
import { putFileToPresignedUrl } from "@/apis/media";

// 백엔드 lecture 모듈 응답 (LectureResponseDto)
export type LectureStatus = "PENDING" | "APPROVED" | "REJECTED" | "CLOSED";
export type LectureOperationType = "ALWAYS" | "SEASON";
export type LectureGenre = "VOCAL" | "DANCE" | "RAP";
export type LectureLevel = "INTRO" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export const GENRE_LABEL: Record<LectureGenre, string> = {
  VOCAL: "보컬",
  DANCE: "댄스",
  RAP: "랩",
};

export const LEVEL_LABEL: Record<LectureLevel, string> = {
  INTRO: "입문",
  BEGINNER: "초급",
  INTERMEDIATE: "중급",
  ADVANCED: "고급",
};

export const MAX_LECTURE_IMAGES = 5;
export const MAX_LECTURE_VIDEOS = 2;

export interface LectureImage {
  imageId: number;
  url: string;
}

export interface LectureVideo {
  videoId: number;
  url: string;
  thumbnailUrl: string | null;
  duration: string; // 초
}

export interface Lecture {
  lectureId: number;
  trainerId: number;
  trainerEmail: string | null;
  title: string;
  description: string;
  genre: LectureGenre;
  level: LectureLevel;
  capacity: number | null; // null = 제한 없음
  price: number;
  thumbnailImageUrl: string | null;
  images: LectureImage[];
  introVideos: LectureVideo[];
  operationType: LectureOperationType;
  startDate: string | null; // yyyy-MM-dd
  endDate: string | null;
  status: LectureStatus;
  rejectReason: string | null;
  createAt: string;
}

export interface LectureRequest {
  title: string;
  description: string;
  genre: LectureGenre;
  level: LectureLevel;
  capacity: number | null;
  price: number;
  operationType: LectureOperationType;
  startDate: string | null;
  endDate: string | null;
  imageIds: number[];
  videoIds: number[];
}

/* ===== 트레이너 — 내 클래스 ===== */

// 관리자용 /admin/v0/contents 는 @AdminOnly 라 트레이너는 앱 공용 /api/v0/contents 사용
const appApiBaseUrl = () => getApiBaseUrl().replace(/\/admin\/v0\/?$/, "/api/v0");

// 클래스 이미지 업로드 → contentId 반환
export async function uploadLectureImage(file: File): Promise<number> {
  try {
    const { width, height } = await getImageDimensions(file);
    const body = { extension: getFileExtension(file), width, height };
    const { data } = await apiClient.post<{ contentId: number; url: string }>(
      "/contents/image",
      body,
      { baseURL: appApiBaseUrl(), params: { purpose: "LECTURE_IMAGE" } }
    );
    await putFileToPresignedUrl(data.url, file);
    return data.contentId;
  } catch (error) {
    throw handleApiError(error);
  }
}

// 소개 영상 업로드 → contentId 반환
export async function uploadLectureVideo(file: File): Promise<number> {
  try {
    const sec = await getVideoDurationSec(file);
    const body = { videoDuration: String(sec), videoExtension: getFileExtension(file) };
    const { data } = await apiClient.post<{ contentId: number; url: string }>(
      "/contents/video",
      body,
      { baseURL: appApiBaseUrl(), params: { purpose: "LECTURE_VIDEO" } }
    );
    await putFileToPresignedUrl(data.url, file);
    return data.contentId;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function getMyLectures(): Promise<Lecture[]> {
  try {
    const { data } = await apiClient.get<Lecture[]>("/trainer/lectures");
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function getMyLecture(lectureId: number): Promise<Lecture> {
  try {
    const { data } = await apiClient.get<Lecture>(`/trainer/lectures/${lectureId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function createLecture(req: LectureRequest): Promise<Lecture> {
  try {
    const { data } = await apiClient.post<Lecture>("/trainer/lectures", req);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// 대기·반려 건 수정 → 승인 대기로 재신청
export async function updateLecture(
  lectureId: number,
  req: LectureRequest
): Promise<Lecture> {
  try {
    const { data } = await apiClient.put<Lecture>(`/trainer/lectures/${lectureId}`, req);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/* ===== 관리자 — 클래스 관리 ===== */

export async function getLectures(status?: LectureStatus): Promise<Lecture[]> {
  try {
    const { data } = await apiClient.get<Lecture[]>("/lectures", {
      params: status ? { status } : {},
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function getLecture(lectureId: number): Promise<Lecture> {
  try {
    const { data } = await apiClient.get<Lecture>(`/lectures/${lectureId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// 관리자 최종 편집값. 노출 이미지·영상은 신청 항목 중에서만 선택
export interface LectureApproveRequest {
  price: number;
  operationType: LectureOperationType;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  imageIds: number[];
  thumbnailImageId: number | null;
  videoIds: number[];
}

// 최종값 확정 후 공개
export async function approveLecture(
  lectureId: number,
  req: LectureApproveRequest
): Promise<Lecture> {
  try {
    const { data } = await apiClient.post<Lecture>(`/lectures/${lectureId}/approve`, req);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function rejectLecture(
  lectureId: number,
  reason?: string
): Promise<Lecture> {
  try {
    const { data } = await apiClient.post<Lecture>(`/lectures/${lectureId}/reject`, {
      reason,
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}
