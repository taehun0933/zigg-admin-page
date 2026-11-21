import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Compile the server boundary in memory: no extra test runner or generated files.
const source = await readFile(new URL("../src/server/aiAssistantProxy.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { proxyAiJobs } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const settings = {
  NANOCLAW_ADMIN_API_URL: "http://127.0.0.1:3010",
  NANOCLAW_ADMIN_API_TOKEN: "test-bridge-secret-never-browser-123456",
};
const jwt = (claims = {}) => `Bearer e30.${Buffer.from(JSON.stringify({ auth: "ADMIN", sub: "admin@zigg.test", provider: "EMAIL", ...claims })).toString("base64url")}.signature`;
const request = (env = "dev", token = jwt()) => new Request(`https://admin.test/api/ai/jobs?environment=${env}`, { headers: token ? { Authorization: token } : {} });
const jobId = "9eef871d-b174-445a-bb58-50d369dcb247";
const post = (body, token = jwt()) => new Request("https://admin.test/api/ai/jobs", {
  method: "POST", headers: { Authorization: token, "Content-Type": "application/json" }, body: JSON.stringify(body),
});

test("rejects unauthenticated requests before any backend calls", async () => {
  const response = await proxyAiJobs(request("dev", ""), undefined, settings, () => { throw Error("must not fetch"); });
  assert.equal(response.status, 401);
});

test("requires actual backend ADMIN verification, regardless of JWT claims", async () => {
  let calls = 0;
  const response = await proxyAiJobs(request(), undefined, settings, async () => { calls++; return new Response(null, { status: 403 }); });
  assert.equal(response.status, 403);
  assert.equal(calls, 1);
});

test("forwards verified scope, strips user credentials and caller identity", async () => {
  const calls = [];
  const req = request("prod");
  req.headers.set("x-zigg-principal", "forged-owner");
  req.headers.set("x-zigg-environment", "dev");
  const response = await proxyAiJobs(req, undefined, settings, async (url, options) => {
    calls.push([String(url), options]);
    return calls.length === 1 ? new Response(null, { status: 204 }) : Response.json({ jobs: [] });
  });
  assert.equal(response.status, 200);
  assert.equal(calls[0][0], "https://prod.achoom-zigg.com/admin/v0/stats/overview");
  assert.equal(calls[0][1].redirect, "error");
  assert.equal(calls[1][0], "http://127.0.0.1:3010/jobs?environment=prod");
  assert.equal(calls[1][1].headers["x-zigg-environment"], "prod");
  assert.match(calls[1][1].headers["x-zigg-principal"], /^[a-f0-9]{64}$/);
  assert.equal(calls[1][1].headers.Authorization, `Bearer ${settings.NANOCLAW_ADMIN_API_TOKEN}`);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("validates identities and separates administrator/environment scopes", async () => {
  const principals = [];
  for (const [env, sub] of [["dev", "one"], ["prod", "one"], ["dev", "two"]]) {
    let calls = 0;
    await proxyAiJobs(request(env, jwt({ sub })), undefined, settings, async (_url, options) => {
      if (++calls === 1) return new Response(null, { status: 204 });
      principals.push(options.headers["x-zigg-principal"]);
      return Response.json({ jobs: [] });
    });
  }
  assert.equal(new Set(principals).size, 3);
  const trainer = await proxyAiJobs(request("dev", jwt({ auth: "TRAINER" })), undefined, settings, async () => new Response(null, { status: 204 }));
  assert.equal(trainer.status, 403);
});

test("validates environment, IDs, prompt lengths and malformed bodies", async () => {
  const noFetch = () => { throw Error("unexpected network"); };
  assert.equal((await proxyAiJobs(request("staging"), undefined, settings, noFetch)).status, 400);
  assert.equal((await proxyAiJobs(request(), "../../secrets", settings, noFetch)).status, 400);
  for (const body of [null, [], { environment: "dev", prompt: " " }, { environment: "dev", prompt: "a".repeat(6001) }, { environment: "dev", prompt: "test", conversationId: "other-admin" }]) {
    assert.equal((await proxyAiJobs(post(body), undefined, settings, noFetch)).status, 400);
  }
  assert.equal((await proxyAiJobs(post({ environment: "dev", prompt: "a".repeat(40_000) }), undefined, settings, noFetch)).status, 413);
});

test("POST enqueues only permitted fields; credentials stay out of JSON", async () => {
  let calls = 0;
  const response = await proxyAiJobs(post({ environment: "dev", prompt: " test ", conversationId: jobId, principal: "owner", token: "steal-me" }), undefined, settings, async (_url, options) => {
    if (++calls === 1) return new Response(null, { status: 204 });
    assert.deepEqual(JSON.parse(options.body), { environment: "dev", prompt: "test", conversationId: jobId });
    return Response.json({ id: jobId, status: "queued" }, { status: 202 });
  });
  assert.equal(response.status, 202);
});

test("upstream failures are sanitized; missing configuration fails closed", async () => {
  let calls = 0;
  const response = await proxyAiJobs(request(), undefined, settings, async () => {
    if (++calls === 1) return new Response(null, { status: 204 });
    return new Response("secret /home/ops token=foo", { status: 500 });
  });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /secret|token=|\/home/);
  assert.equal((await proxyAiJobs(request(), undefined, {}, async () => new Response(null, { status: 204 }))).status, 503);
  assert.equal((await proxyAiJobs(request(), undefined, { ...settings, NANOCLAW_ADMIN_API_URL: "http://public.test" }, async () => new Response(null, { status: 204 }))).status, 503);
});

test("auth network failures never reach NanoClaw and JSON parse failures are bounded", async () => {
  assert.equal((await proxyAiJobs(request(), undefined, settings, async () => { throw Error("network"); })).status, 503);
  let calls = 0;
  const response = await proxyAiJobs(request(), undefined, settings, async () => ++calls === 1 ? new Response(null, { status: 204 }) : new Response("not-json"));
  assert.equal(response.status, 502);
});
