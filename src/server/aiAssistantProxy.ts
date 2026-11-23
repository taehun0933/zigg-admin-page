type Environment = "dev" | "prod";
type Settings = Record<string, string | undefined>;
type Fetcher = typeof fetch;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 32_768;
const MAX_RESPONSE_BYTES = 2_000_000;

class ProxyError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Authorization" },
  });
}

function environment(value: unknown): Environment {
  if (value !== "dev" && value !== "prod") {
    throw new ProxyError(400, "조회할 서버를 선택해 주세요.");
  }
  return value;
}

function trustedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ProxyError(503, "AI 서버 연결 설정을 확인해 주세요.");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username || url.password || url.search || url.hash
  ) {
    throw new ProxyError(503, "AI 서버 연결에는 HTTPS가 필요합니다.");
  }
  return url;
}

async function boundedText(body: ReadableStream<Uint8Array> | null, limit: number): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new ProxyError(413, "요청 또는 응답이 너무 큽니다.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Check only header shape; NanoClaw verifies this token with ZIGG on every operation. */
function forwardedAuthorization(request: Request): string {
  const token = request.headers.get("authorization") ?? "";
  if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(token) || token.length > 8192) {
    throw new ProxyError(401, "관리자 계정으로 다시 로그인해 주세요.");
  }
  return token;
}

/** Same-origin transport only. Forward the original ZIGG token; never trust caller identity headers. */
export async function proxyAiJobs(
  request: Request,
  jobId?: string,
  settings: Settings = process.env,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  try {
    const authorization = forwardedAuthorization(request);
    if (jobId && !UUID.test(jobId)) throw new ProxyError(400, "작업 번호가 올바르지 않습니다.");
    const method = request.method;
    if (method !== "GET" && method !== "POST") throw new ProxyError(405, "지원하지 않는 요청입니다.");
    if (method === "POST" && jobId) throw new ProxyError(405, "지원하지 않는 요청입니다.");

    let payload: { environment: Environment; prompt: string; conversationId?: string } | undefined;
    let env: Environment;
    if (method === "POST") {
      if (!request.headers.get("content-type")?.startsWith("application/json")) {
        throw new ProxyError(415, "JSON 형식으로 요청해 주세요.");
      }
      const length = Number(request.headers.get("content-length"));
      if (length > MAX_BODY_BYTES) throw new ProxyError(413, "질문이 너무 깁니다.");
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(await boundedText(request.body, MAX_BODY_BYTES));
      } catch (error) {
        if (error instanceof ProxyError) throw error;
        throw new ProxyError(400, "요청 내용을 확인해 주세요.");
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new ProxyError(400, "요청 내용을 확인해 주세요.");
      }
      env = environment(body.environment);
      if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 6000) {
        throw new ProxyError(400, "질문을 6,000자 이내로 입력해 주세요.");
      }
      if (body.conversationId !== undefined && (typeof body.conversationId !== "string" || !UUID.test(body.conversationId))) {
        throw new ProxyError(400, "대화 번호가 올바르지 않습니다.");
      }
      payload = { environment: env, prompt: body.prompt.trim(), ...(body.conversationId ? { conversationId: body.conversationId as string } : {}) };
    } else {
      env = environment(new URL(request.url).searchParams.get("environment"));
    }

    if (!settings.NANOCLAW_ADMIN_API_URL) {
      throw new ProxyError(503, "AI 운영 도우미 서버가 아직 연결되지 않았습니다.");
    }
    const url = trustedUrl(settings.NANOCLAW_ADMIN_API_URL);
    url.pathname = `${url.pathname.replace(/\/$/, "")}/jobs${jobId ? `/${jobId}` : ""}`;
    url.searchParams.set("environment", env);

    let upstream: Response;
    try {
      upstream = await fetcher(url, {
        method,
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          "x-zigg-environment": env,
        },
        body: payload ? JSON.stringify(payload) : undefined,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      throw new ProxyError(503, "AI 서버에 연결할 수 없습니다. 잠시 후 작업 목록을 확인해 주세요.");
    }
    // Do not expose upstream configuration, stack traces, credentials or arbitrary errors.
    if (!upstream.ok) {
      await upstream.body?.cancel();
      const errors: Record<number, string> = {
        400: "질문 또는 대화 정보를 확인해 주세요.",
        401: "관리자 계정으로 다시 로그인해 주세요.",
        403: "이 서버의 관리자 권한이 필요합니다.",
        404: "작업을 찾을 수 없습니다.",
        409: "이 대화에서 조사가 진행 중입니다. 완료 후 다시 질문해 주세요.",
        413: "질문이 너무 깁니다.",
        429: "조사 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
        503: "이 환경의 AI 조사 에이전트가 아직 준비되지 않았습니다.",
      };
      throw new ProxyError(errors[upstream.status] ? upstream.status : 502, errors[upstream.status] ?? "AI 서버 응답을 확인할 수 없습니다.");
    }
    const data = JSON.parse(await boundedText(upstream.body, MAX_RESPONSE_BYTES));
    return json(data, method === "POST" ? 202 : 200);
  } catch (error) {
    if (error instanceof ProxyError) return json({ error: error.message }, error.status);
    return json({ error: "AI 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
