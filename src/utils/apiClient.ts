// apiClient.ts
import axios from "axios";
import { getApiBaseUrl } from "./apiConfig";

const fallbackBaseUrl = process.env.NEXT_PUBLIC_BASE_URL_FOR_ADMIN;

const apiClient = axios.create({
  baseURL: fallbackBaseUrl, // fallback (SSR 등)
});

// 요청 인터셉터: 런타임 서버 전환 + 토큰
apiClient.interceptors.request.use(
  (config) => {
    const explicitBaseUrl =
      config.baseURL && config.baseURL !== fallbackBaseUrl
        ? config.baseURL
        : null;
    config.baseURL = explicitBaseUrl ?? getApiBaseUrl();
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
