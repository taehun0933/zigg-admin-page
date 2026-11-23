export type AiEnvironment = "dev" | "prod";

export interface AiJob {
  id: string;
  conversationId: string;
  environment: AiEnvironment;
  prompt: string;
  status: "queued" | "running" | "completed" | "failed";
  messages: { text: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export const isAiJobPending = (job: AiJob) =>
  job.status === "queued" || job.status === "running";
