import { handleApiError } from "@/utils/apiError";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const authService = {
  register: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, {
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
      const response = await axios.post(`${API_BASE_URL}/login`, {
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
