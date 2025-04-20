import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

export type ImageUploadPurposeType =
  | "HISTORY_THUMBNAIL"
  | "HISTORY_VIDEO"
  | "SPACE_IMAGE"
  | "USER_BANNER_IMAGE"
  | "USER_PROFILE_IMAGE"
  | "POST_IMAGE"
  | "POST_VIDEO"
  | "POST_THUMBNAIL"
  | "POST_REPORT"
  | "COMMENT_REPORT"
  | "USER_REPORT"
  | "HOME_BANNER"
  | "AUDITION_THUMBNAIL"
  | "APPLICATION_VIDEO"
  | "APPLICATION_IMAGE"
  | "AUDITION_IMAGE"
  | "AUDITION_VIDEO";

interface UploadUrlResponse {
  contentId: number;
  url: string;
}

export const getUrlForUploadImage = async ({
  uploadPurposeQuery,
  body,
}: {
  uploadPurposeQuery: ImageUploadPurposeType;
  body: {
    extension: string;
    width: number;
    height: number;
    onClickUrl?: string;
  };
}): Promise<UploadUrlResponse> => {
  try {
    const response = await apiClient.post<UploadUrlResponse>(
      `/contents/image?purpose=${uploadPurposeQuery}`,
      {
        ...body,
        extension: body.extension.toUpperCase(),
      }
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// presigned url에 이미지 업로드하는 함수
export const putImageToPresignedUrl = async ({
  presignedUrl,
  file,
  contentType,
}: {
  presignedUrl: string;
  file: File | Blob;
  contentType: string;
}): Promise<boolean> => {
  try {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });

    return response.ok;
  } catch (error) {
    console.error("이미지 업로드 중 오류 발생:", error);
    return false;
  }
};
