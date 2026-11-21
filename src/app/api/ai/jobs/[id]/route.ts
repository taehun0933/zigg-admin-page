import { proxyAiJobs } from "@/server/aiAssistantProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyAiJobs(request, id);
}
