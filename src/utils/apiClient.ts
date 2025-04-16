// apiClient.ts
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// 요청 인터셉터 추가: 모든 요청에 토큰 헤더를 추가합니다.
apiClient.interceptors.request.use(
  (config) => {
    // localStorage에서 토큰을 가져옵니다.
    const token = localStorage.getItem("token");
    if (token) {
      // Authorization 헤더를 "Bearer [토큰]" 형태로 설정합니다.
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
