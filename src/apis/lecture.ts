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

// 주차 (신청서에 포함, 관리자 승인 시 확정 후 변경 불가)
export interface LectureWeek {
  weekId: number;
  weekNo: number; // 1부터
  title: string;
  description: string | null;
}

// 주차 입력값. 순서 = 리스트 순서 (첫 번째가 1주차)
export interface LectureWeekInput {
  title: string;
  description: string | null;
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
  weeks: LectureWeek[];
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
  weeks: LectureWeekInput[];
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

// 소개 영상(LECTURE_VIDEO) / 주차 레퍼런스(LECTURE_REFERENCE) 업로드 → contentId 반환
export async function uploadLectureVideo(
  file: File,
  purpose: "LECTURE_VIDEO" | "LECTURE_REFERENCE" = "LECTURE_VIDEO"
): Promise<number> {
  try {
    const sec = await getVideoDurationSec(file);
    const body = { videoDuration: String(sec), videoExtension: getFileExtension(file) };
    const { data } = await apiClient.post<{ contentId: number; url: string }>(
      "/contents/video",
      body,
      { baseURL: appApiBaseUrl(), params: { purpose } }
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

/* ===== 트레이너 — 주차별 레퍼런스 ===== */

export interface LectureReference {
  referenceId: number;
  title: string;
  video: LectureVideo;
  createAt: string;
}

export interface LectureWeekDetail extends LectureWeek {
  references: LectureReference[];
}

export async function getLectureWeeks(lectureId: number): Promise<LectureWeekDetail[]> {
  try {
    const { data } = await apiClient.get<LectureWeekDetail[]>(`/trainer/lectures/${lectureId}/weeks`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// 운영 중(APPROVED) 클래스만 가능. 갱신된 주차 반환
export async function addLectureReference(
  lectureId: number,
  weekId: number,
  req: { title: string; videoId: number }
): Promise<LectureWeekDetail> {
  try {
    const { data } = await apiClient.post<LectureWeekDetail>(
      `/trainer/lectures/${lectureId}/weeks/${weekId}/references`,
      req
    );
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function deleteLectureReference(
  lectureId: number,
  weekId: number,
  referenceId: number
): Promise<LectureWeekDetail> {
  try {
    const { data } = await apiClient.delete<LectureWeekDetail>(
      `/trainer/lectures/${lectureId}/weeks/${weekId}/references/${referenceId}`
    );
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/* ===== 수강생 · 과제 · 피드백 ===== */

// 주차별 제출 현황 (제출한 주차만)
export interface LectureSubmissionSummary {
  submissionId: number;
  weekId: number;
  weekNo: number;
  submittedAt: string;
  feedbackCount: number;
}

export interface LectureStudent {
  userId: number;
  name: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
  enrolledAt: string;
  submissions: LectureSubmissionSummary[];
}

export interface LectureFeedback {
  feedbackId: number;
  timeline: string | null; // "mm:ss"
  message: string;
  authorId: number;
  authorNickname: string | null;
  authorProfileImageUrl: string | null;
  createAt: string;
}

export interface LectureSubmission {
  submissionId: number;
  weekId: number;
  weekNo: number;
  studentId: number;
  studentNickname: string | null;
  video: LectureVideo;
  submittedAt: string;
  feedbacks: LectureFeedback[];
}

// 트레이너 — 내 클래스 수강생 + 주차별 제출 현황
export async function getMyLectureStudents(lectureId: number): Promise<LectureStudent[]> {
  try {
    const { data } = await apiClient.get<LectureStudent[]>(`/trainer/lectures/${lectureId}/students`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function getLectureSubmission(
  lectureId: number,
  submissionId: number
): Promise<LectureSubmission> {
  try {
    const { data } = await apiClient.get<LectureSubmission>(
      `/trainer/lectures/${lectureId}/submissions/${submissionId}`
    );
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// 트레이너 — 주차별 제출 영상 전체 (주차 → 제출 순)
export async function getLectureSubmissions(lectureId: number): Promise<LectureSubmission[]> {
  try {
    const { data } = await apiClient.get<LectureSubmission[]>(`/trainer/lectures/${lectureId}/submissions`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// 관리자 — 주차별 제출 영상 전체 (조회 전용)
export async function getLectureSubmissionsForAdmin(lectureId: number): Promise<LectureSubmission[]> {
  try {
    const { data } = await apiClient.get<LectureSubmission[]>(`/lectures/${lectureId}/submissions`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// 피드백 작성 → 수강생에게 알림. 갱신된 제출물 반환
export async function addLectureFeedback(
  lectureId: number,
  submissionId: number,
  req: { timeline: string | null; message: string }
): Promise<LectureSubmission> {
  try {
    const { data } = await apiClient.post<LectureSubmission>(
      `/trainer/lectures/${lectureId}/submissions/${submissionId}/feedbacks`,
      req
    );
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function deleteLectureFeedback(
  lectureId: number,
  submissionId: number,
  feedbackId: number
): Promise<LectureSubmission> {
  try {
    const { data } = await apiClient.delete<LectureSubmission>(
      `/trainer/lectures/${lectureId}/submissions/${submissionId}/feedbacks/${feedbackId}`
    );
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
  weeks: LectureWeekInput[];
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

/* ===== 관리자 — 수강생 (결제 연동 전까지 관리자가 등록) ===== */

export async function getLectureStudents(lectureId: number): Promise<LectureStudent[]> {
  try {
    const { data } = await apiClient.get<LectureStudent[]>(`/lectures/${lectureId}/students`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// 운영 중 클래스에 일반 유저만, 정원 안에서. 갱신된 수강생 목록 반환
// 관리자 — 주차별 레퍼런스 영상 (조회만)
export async function getLectureWeeksForAdmin(lectureId: number): Promise<LectureWeekDetail[]> {
  try {
    const { data } = await apiClient.get<LectureWeekDetail[]>(`/lectures/${lectureId}/weeks`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function enrollLectureStudent(lectureId: number, userId: number): Promise<LectureStudent[]> {
  try {
    const { data } = await apiClient.post<LectureStudent[]>(`/lectures/${lectureId}/students`, { userId });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// 수강 해제 (제출 과제·피드백은 보존)
export async function unenrollLectureStudent(lectureId: number, userId: number): Promise<LectureStudent[]> {
  try {
    const { data } = await apiClient.delete<LectureStudent[]>(`/lectures/${lectureId}/students/${userId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}
