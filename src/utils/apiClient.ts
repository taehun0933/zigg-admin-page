// apiClient.ts
import axios from "axios";
import { getApiBaseUrl } from "./apiConfig";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL_FOR_ADMIN, // fallback (SSR 등)
});

// 요청 인터셉터: 런타임 서버 전환 + 토큰
apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
