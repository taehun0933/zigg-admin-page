import { proxyAiJobs } from "@/server/aiAssistantProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyAiJobs(request);
}

export async function POST(request: Request) {
  return proxyAiJobs(request);
}
