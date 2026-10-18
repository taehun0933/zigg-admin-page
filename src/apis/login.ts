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
};
