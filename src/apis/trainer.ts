import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { getFileExtension, getImageDimensions } from "@/utils/media";
import axios from "axios";

// 백엔드 trainer 모듈 응답 (TrainerApplicationResponseDto)
export type TrainerApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TrainerApplication {
  trainerApplicationId: number;
  userId: number;
  email: string | null;
  status: TrainerApplicationStatus;
  rejectReason: string | null;
  profileImageUrls: string[];
  createAt: string;
}

export interface TrainerApplyRequest {
  email: string;
  password: string;
  passwordConfirm: string;
  profileImageIds: number[];
}

/* ===== 공개(비로그인) — 신청 ===== */

// 프로필 이미지 presigned PUT 발급 + 업로드 → contentId 반환 (0~5장, 선택)
export async function uploadTrainerProfileImage(file: File): Promise<number> {
  try {
    const { width, height } = await getImageDimensions(file);
    const body = { extension: getFileExtension(file), width, height };
    // @Public 엔드포인트라 토큰 없이 호출 (apiClient 는 토큰 있으면만 첨부)
    const { data } = await axios.post<{ contentId: number; url: string }>(
      `${getApiBaseUrl()}/trainer/profile-images`,
      body
    );
    const put = await fetch(data.url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) throw new Error(`이미지 업로드 실패: ${put.status}`);
    return data.contentId;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function applyTrainer(
  req: TrainerApplyRequest
): Promise<TrainerApplication> {
  try {
    const { data } = await axios.post<TrainerApplication>(
      `${getApiBaseUrl()}/trainer/apply`,
      req
    );
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/* ===== 관리자 — 트레이너 관리 ===== */

export async function getTrainerApplications(
  status?: TrainerApplicationStatus
): Promise<TrainerApplication[]> {
  try {
    const { data } = await apiClient.get<TrainerApplication[]>(
      "/trainer-applications",
      { params: status ? { status } : {} }
    );
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function approveTrainerApplication(
  applicationId: number
): Promise<TrainerApplication> {
  try {
    const { data } = await apiClient.post<TrainerApplication>(
      `/trainer-applications/${applicationId}/approve`
    );
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function rejectTrainerApplication(
  applicationId: number,
  reason?: string
): Promise<TrainerApplication> {
  try {
    const { data } = await apiClient.post<TrainerApplication>(
      `/trainer-applications/${applicationId}/reject`,
      { reason }
    );
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
}
