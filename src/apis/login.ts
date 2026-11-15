import { handleApiError } from "@/utils/apiError";
import { getApiBaseUrl } from "@/utils/apiConfig";
import axios from "axios";

// JWT payload 의 auth 클레임 (ADMIN / TRAINER)
const getRoleFromToken = (token: string): string => {
  try {
    const payload = token.replace(/^Bearer\s+/i, "").split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).auth ?? "";
  } catch {
    return "";
  }
};

export const authService = {
  register: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${getApiBaseUrl()}/register`, {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${getApiBaseUrl()}/login`, {
        email,
        password,
      });

      const tokenValue = response.headers["authorization"];
      if (!tokenValue) {
        throw new Error("로그인 응답에 토큰이 없습니다.");
      }

      localStorage.setItem("token", tokenValue);
      localStorage.setItem("role", getRoleFromToken(tokenValue));
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // 카카오·애플 로그인. ADMIN/TRAINER 면 바로 로그인 처리,
  // 아직 강사가 아니면 토큰을 sessionStorage 에만 두고(관리자 화면 진입 차단) 전환 신청에 사용한다.
  oauthLogin: async (
    payload:
      | { platform: "KAKAO"; code: string; redirectUri: string }
      | { platform: "APPLE"; idToken: string }
  ): Promise<OAuthLoginResult> => {
    try {
      const response = await axios.post<OAuthLoginResult>(
        `${getApiBaseUrl()}/trainer/oauth/login`,
        payload
      );
      const tokenValue = response.headers["authorization"];
      if (!tokenValue) {
        throw new Error("로그인 응답에 토큰이 없습니다.");
      }
      const result = response.data;
      if (result.role === "ADMIN" || result.role === "TRAINER") {
        localStorage.setItem("token", tokenValue);
        localStorage.setItem("role", result.role);
        sessionStorage.removeItem(TRAINER_APPLY_TOKEN_KEY);
      } else {
        sessionStorage.setItem(TRAINER_APPLY_TOKEN_KEY, tokenValue);
      }
      return result;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// 소셜 로그인했지만 아직 강사가 아닌 유저의 토큰 (전환 신청 전용)
export const TRAINER_APPLY_TOKEN_KEY = "trainerApplyToken";

export interface OAuthLoginResult {
  role: "USER" | "ADMIN" | "TRAINER" | "GUEST";
  trainerStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  rejectReason: string | null;
}

