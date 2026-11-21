import type { AiEnvironment, AiJob } from "@/types/aiAssistant";

async function request<T>(path: string, signal?: AbortSignal, body?: unknown): Promise<T> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("로그인이 필요합니다. 다시 로그인해 주세요.");
  const response = await fetch(`/api/ai/jobs${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: token,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const fallback = response.status === 401 || response.status === 403
      ? "관리자 인증을 확인해 주세요. 다시 로그인해야 할 수 있습니다."
      : response.status === 503
      ? "AI 운영 도우미가 아직 연결되지 않았거나 일시적으로 사용할 수 없습니다."
      : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    const data = await response.json().catch(() => null);
    throw new Error(typeof data?.error === "string" ? data.error : fallback);
  }
  return response.json() as Promise<T>;
}

export function listAiJobs(environment: AiEnvironment, signal?: AbortSignal) {
  return request<{ jobs: AiJob[] }>(`?environment=${environment}`, signal);
}

export function getAiJob(id: string, environment: AiEnvironment, signal?: AbortSignal) {
  return request<AiJob>(`/${encodeURIComponent(id)}?environment=${environment}`, signal);
}

export function createAiJob(
  input: { environment: AiEnvironment; prompt: string; conversationId?: string },
  signal?: AbortSignal,
) {
  return request<AiJob>("", signal, input);
}
