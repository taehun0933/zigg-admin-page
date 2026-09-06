import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

/**
 * 관리자 유저 검색 결과.
 *
 * 백엔드가 `UserResponseDto`(@JsonInclude(NON_NULL)) 를 그대로 재사용하므로
 * null 필드는 응답 JSON 에서 아예 빠진다 → userId 외에는 optional 로 취급한다.
 * `profileImageUrl` 은 CDN(CloudFront) URL 이다.
 */
export interface AdminUserSearchResult {
  userId: number;
  userNickname?: string | null;
  userName?: string | null;
  profileImageUrl?: string | null;
}

/**
 * 닉네임 또는 이름 부분일치로 유저를 검색한다. (admin 전용)
 *
 * - keyword 가 공백이면 백엔드가 빈 배열을 돌려준다.
 * - size 기본 20, 서버 상한 50.
 * - 티켓 화면의 `searchUsersByNickname` 과 달리 에러를 삼키지 않고 던진다.
 *   (호출부에서 실패 배너를 띄우기 위함)
 */
export async function searchAdminUsers(
  keyword: string,
  size = 20
): Promise<AdminUserSearchResult[]> {
  try {
    const res = await apiClient.get<AdminUserSearchResult[]>("/users/search", {
      params: { keyword, size },
    });
    return res.data ?? [];
  } catch (error) {
    throw handleApiError(error);
  }
}
