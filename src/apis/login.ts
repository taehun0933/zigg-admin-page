import { handleApiError } from "@/utils/apiError";
import { getApiBaseUrl } from "@/utils/apiConfig";
import axios from "axios";

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
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
