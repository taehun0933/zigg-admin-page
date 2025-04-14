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
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
