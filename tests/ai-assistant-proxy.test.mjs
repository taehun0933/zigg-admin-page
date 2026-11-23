import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Compile the transport in memory: no extra test runner or generated files.
const source = await readFile(new URL("../src/server/aiAssistantProxy.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { proxyAiJobs } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const settings = { NANOCLAW_ADMIN_API_URL: "http://127.0.0.1:3180" };
const jwt = (claims = {}) => `Bearer e30.${Buffer.from(JSON.stringify({ auth: "ADMIN", sub: "admin@zigg.test", provider: "EMAIL", ...claims })).toString("base64url")}.signature`;
const request = (env = "dev", token = jwt()) => new Request(`https://admin.test/api/ai/jobs?environment=${env}`, { headers: token ? { Authorization: token } : {} });
const jobId = "9eef871d-b174-445a-bb58-50d369dcb247";
const post = (body, token = jwt()) => new Request("https://admin.test/api/ai/jobs", {
  method: "POST", headers: { Authorization: token, "Content-Type": "application/json" }, body: JSON.stringify(body),
});

test("rejects missing or malformed bearer headers before reading a body or contacting upstream", async () => {
  const noFetch = () => { throw Error("must not fetch"); };
  for (const token of ["", "Basic abc", "Bearer not-a-jwt", `Bearer ${"a".repeat(8192)}.b.c`]) {
    assert.equal((await proxyAiJobs(request("dev", token), undefined, settings, noFetch)).status, 401);
  }
  const req = new Request("https://admin.test/api/ai/jobs", { method: "POST", body: "invalid-json" });
  assert.equal((await proxyAiJobs(req, undefined, settings, noFetch)).status, 401);
});

test("makes exactly one NanoClaw request with the unchanged ZIGG bearer and validated environment", async () => {
  const calls = [];
  const token = jwt();
  const req = request("prod", token);
  req.headers.set("x-zigg-principal", "forged-owner");
  req.headers.set("x-zigg-environment", "dev");
  req.headers.set("cookie", "private-session");
  const response = await proxyAiJobs(req, undefined, settings, async (url, options) => {
    calls.push([String(url), options]);
    return Response.json({ jobs: [] });
  });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "http://127.0.0.1:3180/jobs?environment=prod");
  assert.deepEqual(calls[0][1].headers, {
    Authorization: token,
    "Content-Type": "application/json",
    "x-zigg-environment": "prod",
  });
  assert.equal(calls[0][1].cache, "no-store");
  assert.equal(calls[0][1].redirect, "error");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Authorization");
});

test("does not authenticate locally or trust decoded claims; NanoClaw owns authorization", async () => {
  for (const auth of ["ADMIN", "TRAINER", "USER"]) {
    let calls = 0;
    const token = jwt({ auth });
    const response = await proxyAiJobs(request("dev", token), undefined, settings, async (_url, options) => {
      calls++;
      assert.equal(options.headers.Authorization, token);
      return new Response("private ZIGG rejection details", { status: 403 });
    });
    assert.equal(calls, 1);
    assert.equal(response.status, 403);
    assert.doesNotMatch(await response.text(), /private ZIGG/);
  }
});

test("preserves NanoClaw 401/403 as safe authentication errors for list, detail and creation", async () => {
  for (const status of [401, 403]) {
    for (const [req, id] of [[request(), undefined], [request(), jobId], [post({ environment: "dev", prompt: "check" }), undefined]]) {
      const response = await proxyAiJobs(req, id, settings, async () => new Response("token=secret", { status }));
      assert.equal(response.status, status);
      assert.doesNotMatch(await response.text(), /token=secret/);
    }
  }
});

test("validates environment, IDs, prompt lengths and malformed bodies before contacting NanoClaw", async () => {
  const noFetch = () => { throw Error("unexpected network"); };
  assert.equal((await proxyAiJobs(request("staging"), undefined, settings, noFetch)).status, 400);
  assert.equal((await proxyAiJobs(request(), "../../secrets", settings, noFetch)).status, 400);
  for (const body of [null, [], { environment: "dev", prompt: " " }, { environment: "dev", prompt: "a".repeat(6001) }, { environment: "dev", prompt: "test", conversationId: "other-admin" }]) {
    assert.equal((await proxyAiJobs(post(body), undefined, settings, noFetch)).status, 400);
  }
  assert.equal((await proxyAiJobs(post({ environment: "dev", prompt: "a".repeat(40_000) }), undefined, settings, noFetch)).status, 413);
});

test("POST sends only allowed JSON fields and never places credentials or caller identity in the body", async () => {
  let calls = 0;
  const token = jwt();
  const response = await proxyAiJobs(post({ environment: "dev", prompt: " test ", conversationId: jobId, principal: "owner", token: "steal-me", url: "http://attacker.test" }, token), undefined, settings, async (url, options) => {
    calls++;
    assert.equal(String(url), "http://127.0.0.1:3180/jobs?environment=dev");
    assert.equal(options.headers.Authorization, token);
    assert.deepEqual(JSON.parse(options.body), { environment: "dev", prompt: "test", conversationId: jobId });
    return Response.json({ id: jobId, status: "queued" }, { status: 202 });
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 202);
});

test("forwards detail IDs only to the configured server and ignores client-selected destinations", async () => {
  const req = new Request("https://admin.test/api/ai/jobs?environment=dev&url=https://attacker.test", { headers: { Authorization: jwt(), "x-target-url": "https://attacker.test" } });
  const response = await proxyAiJobs(req, jobId, settings, async (url) => {
    assert.equal(String(url), `http://127.0.0.1:3180/jobs/${jobId}?environment=dev`);
    return Response.json({ id: jobId });
  });
  assert.equal(response.status, 200);
});

test("missing or unsafe NanoClaw configuration fails closed without sending the token", async () => {
  const noFetch = () => { throw Error("unexpected token transmission"); };
  for (const config of [{}, { NANOCLAW_ADMIN_API_URL: "http://public.test" }, { NANOCLAW_ADMIN_API_URL: "https://user:secret@private.test" }, { NANOCLAW_ADMIN_API_URL: "https://private.test?token=secret" }]) {
    assert.equal((await proxyAiJobs(request(), undefined, config, noFetch)).status, 503);
  }
});

test("upstream internal errors are sanitized and network failures return 503", async () => {
  const response = await proxyAiJobs(request(), undefined, settings, async () => new Response("secret /home/ops token=foo", { status: 500 }));
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /secret|token=|\/home/);
  assert.equal((await proxyAiJobs(request(), undefined, settings, async () => { throw Error("network"); })).status, 503);
  assert.equal((await proxyAiJobs(request(), undefined, settings, async () => new Response("not-json"))).status, 502);
});

test("bounds NanoClaw response size", async () => {
  const response = await proxyAiJobs(request(), undefined, settings, async () => new Response("x".repeat(2_000_001)));
  assert.equal(response.status, 413);
});
