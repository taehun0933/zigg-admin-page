import type { OAuthLoginResult } from "@/apis/login";
import { homePathOf } from "@/components/admin/useAdminAuthGuard";

// 소셜 로그인은 강사(TRAINER) 권한만 통과한다.
//  - TRAINER: 강사 첫 화면
//  - 그 외: 로그인 화면(/signin?oauth=...)에 사유 안내
//    · admin   : 관리자 계정 → 관리자 로그인(이메일) 안내
//    · pending : 강사 승인 대기
//    · rejected: 강사 신청 반려 (재신청 버튼)
//    · none    : 강사 권한 없음 (강사 신청 버튼)
export type OAuthNotice =
  | { kind: "admin" }
  | { kind: "pending" }
  | { kind: "rejected"; reason: string }
  | { kind: "none" };

export function nextPathAfterOAuth(r: OAuthLoginResult): { path: string; loggedIn: boolean } {
  if (r.role === "TRAINER") {
    return { path: homePathOf("TRAINER"), loggedIn: true };
  }
  if (r.role === "ADMIN") return { path: "/signin?oauth=admin", loggedIn: false };
  if (r.trainerStatus === "PENDING") return { path: "/signin?oauth=pending", loggedIn: false };
  if (r.trainerStatus === "REJECTED") {
    const reason = encodeURIComponent(r.rejectReason ?? "");
    return { path: `/signin?oauth=rejected&reason=${reason}`, loggedIn: false };
  }
  return { path: "/signin?oauth=none", loggedIn: false };
}

export function oauthNoticeFromQuery(params: URLSearchParams): OAuthNotice | null {
  switch (params.get("oauth")) {
    case "admin":
      return { kind: "admin" };
    case "pending":
      return { kind: "pending" };
    case "rejected":
      return { kind: "rejected", reason: params.get("reason") ?? "" };
    case "none":
      return { kind: "none" };
    default:
      return null;
  }
}

export const errorMessageOf = (err: unknown, fallback: string): string => {
  const m = (err as { message?: unknown })?.message;
  return typeof m === "string" && m ? m : fallback;
};
