// lib/api/board.ts
import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

/* ====== 타입 ====== */
export interface AdminBoardPost {
  boardId: number;
  postId: number;
  postTitle: string;
  postMessage: string;
  createdAt: string;
  postCreator: {
    userId: number;
    userName: string;
    profileImageUrl: string;
  };
  postImageContents: string[];
  isAnonymous: boolean;
  likeCnt: number;
  commentCnt: number;
  scrapCnt: number;
  isScraped: boolean;
  isLiked: boolean;
}

// 타입(가볍게)
export interface AdminBoardPostDetail {
  boardId: number;
  postId: number;
  postTitle: string;
  postMessage: string;
  postCreator: { userId: number; userName: string };
  postImageContents: { imageKey: string; onClickUrl: string | null }[];
  postVideoContent?: { videoUrl: string; videoDuration: string };
  postThumbnailImage?: { imageKey: string; onClickUrl: string | null };
  createdAt: string;
  isAnonymous: boolean;
  likeCnt: number;
  commentCnt: number;
  scrapCnt: number;
  isScraped: boolean;
  isLiked: boolean;
}

export type CreatePostBody = {
  postTitle: string;
  postMessage: string;
  postImageContent: string[];
  postVideoThumbnail?: string;
  postVideoContent?: {
    videoKey: string;       // presigned URL로 PUT한 최종 비디오 URL
    videoDuration: string;  // "HH:mm:ss"
  };
};

type VideoExtension = "MP4" | "MOV" | "WEBM";

/* ====== 조회 API ====== */
export const getAdminPosts = async (boardId: number): Promise<AdminBoardPost[]> => {
  try {
    const response = await apiClient.get(`/boards/posts/${boardId}`, {
      params: { page: 0, writtenByAdmin: true },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ✅ 상세 조회
export const getAdminPostDetail = async (
  boardId: number,
  postId: number
): Promise<AdminBoardPostDetail> => {
  try {
    const res = await apiClient.get(`/boards/posts/${boardId}/${postId}`, {
      params: { page: 0, writtenByAdmin: true },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/* ====== 이미지 presigned 발급 + 유틸 ====== */
export function toImageExt(file: File): "JPG" | "PNG" | "WEBP" | "GIF" {
  if (file.type.includes("png")) return "PNG";
  if (file.type.includes("webp")) return "WEBP";
  if (file.type.includes("gif")) return "GIF";
  return "JPG";
}

export function getImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => reject(new Error("이미지 크기 읽기 실패"));
    img.src = url;
  });
}

export async function requestImagePresignedUrl(
  file: File
): Promise<{ contentId: number; url: string }> {
  try {
    const { width, height } = await getImageSize(file);
    const body = { extension: toImageExt(file), width, height };
    const res = await apiClient.post(`/contents/image`, body, {
      params: { purpose: "POST_IMAGE" },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/** (옵션) 예전 멀티파트 방식 – 지금 플로우에서는 미사용 */
export async function uploadImageForPost(
  file: File
): Promise<{ contentId: number; url: string }> {
  try {
    const fd = new FormData();
    fd.append("imageFile", file); // 서버 필드명에 맞추세요
    const res = await apiClient.post(`/contents/image`, fd, {
      params: { purpose: "POST_IMAGE" },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/* ====== 비디오 presigned 발급 + 유틸 ====== */
export function toVideoExt(file: File): VideoExtension {
  if (file.type.includes("mp4")) return "MP4";
  if (file.type.includes("quicktime")) return "MOV";
  return "WEBM";
}

export function formatHms(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export async function requestVideoPresignedUrl(
  durationSec: number,
  extension: VideoExtension
): Promise<{ contentId: number; url: string }> {
  try {
    const body = { videoDuration: String(durationSec), videoExtension: extension };
    const res = await apiClient.post(`/contents/video`, body, {
      params: { purpose: "POST_VIDEO" },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/* ====== presigned PUT 공용 ====== */
export async function putFileToPresignedUrl(url: string, file: File): Promise<void> {
  const r = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!r.ok) throw new Error(`프리사인드 업로드 실패: ${r.status}`);
}

/* ====== 게시글 생성 ====== */
export async function createPost(boardId: number, payload: CreatePostBody) {
  try {
    const res = await apiClient.post(`/boards/posts/${boardId}`, payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// (옵션) 수정/삭제 API도 바로 쓸 수 있게 추가
export async function updatePost(
  boardId: number,
  postId: number,
  payload: CreatePostBody
) {
  try {
    const res = await apiClient.patch(`/boards/posts/${boardId}/${postId}`, payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function deletePost(boardId: number, postId: number) {
  try {
    const res = await apiClient.delete(`/boards/posts/${boardId}/${postId}`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
