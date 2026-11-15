import type { OAuthLoginResult } from "@/apis/login";
import { homePathOf } from "@/components/admin/useAdminAuthGuard";

// 소셜 로그인 결과 → 다음 화면
//  - 관리자·트레이너: 각자 첫 화면
//  - 승인 대기: 로그인 화면에 대기 안내
//  - 신청 이력 없음·반려: 기존 계정으로 강사 전환 신청 화면
export function nextPathAfterOAuth(r: OAuthLoginResult): { path: string; loggedIn: boolean } {
  if (r.role === "ADMIN" || r.role === "TRAINER") {
    return { path: homePathOf(r.role), loggedIn: true };
  }
  if (r.trainerStatus === "PENDING") {
    return { path: "/signin?oauth=pending", loggedIn: false };
  }
  if (r.trainerStatus === "REJECTED") {
    const reason = encodeURIComponent(r.rejectReason ?? "");
    return { path: `/trainer/apply?social=1&rejected=1&reason=${reason}`, loggedIn: false };
  }
  return { path: "/trainer/apply?social=1", loggedIn: false };
}

export const errorMessageOf = (err: unknown, fallback: string): string => {
  const m = (err as { message?: unknown })?.message;
  return typeof m === "string" && m ? m : fallback;
};
