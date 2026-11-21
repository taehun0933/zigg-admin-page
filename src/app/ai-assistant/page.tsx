"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminIcon from "@/components/admin/AdminIcon";
import PageShell, { btnPrimary, btnSecondary } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { createAiJob, getAiJob, listAiJobs } from "@/apis/aiAssistant";
import { isAiJobPending, type AiJob } from "@/types/aiAssistant";
import { getApiMode, type ApiMode } from "@/utils/apiConfig";
import styles from "./page.module.css";

const examples = [
  "최근 1시간 결제 실패 원인을 확인해 줘",
  "최근 배포 이후 발생한 서버 오류를 조사해 줘",
  "티켓 지급 내역을 확인하려면 어떤 정보가 필요해?",
];
const statusLabels: Record<AiJob["status"], string> = {
  queued: "조사 대기 중", running: "조사 중", completed: "답변 완료", failed: "조사 실패",
};
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
const dateLabel = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Assistant({ environment }: { environment: ApiMode }) {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const active = useRef(true);
  const sendController = useRef<AbortController | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; sendController.current?.abort(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHistoryError(null);
    listAiJobs(environment, controller.signal).then(({ jobs: rows }) => {
      if (controller.signal.aborted) return;
      setJobs(rows);
      setConversationId((selected) => selected ?? rows[0]?.conversationId ?? null);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setHistoryError(errorMessage(error));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [environment, retry]);

  const pendingKey = jobs.filter(isAiJobPending).map((job) => job.id).sort().join(",");
  useEffect(() => {
    if (!pendingKey) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const updates = await Promise.all(pendingKey.split(",").map((id) => getAiJob(id, environment, controller.signal)));
        if (controller.signal.aborted) return;
        setJobs((current) => current.map((job) => updates.find((update) => update.id === job.id) ?? job));
        setPollError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setPollError(errorMessage(error));
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 2000);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [environment, pendingKey, retry]);

  const conversations = useMemo(() => {
    const grouped = new Map<string, AiJob[]>();
    for (const job of jobs) grouped.set(job.conversationId, [...(grouped.get(job.conversationId) ?? []), job]);
    return [...grouped.entries()].map(([id, entries]) => {
      entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { id, first: entries[0], latest: entries[entries.length - 1], pending: entries.some(isAiJobPending) };
    }).sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
  }, [jobs]);
  const turns = useMemo(() => jobs.filter((job) => job.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [jobs, conversationId]);
  const pending = turns.some(isAiJobPending);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [turns]);

  const send = useCallback(async () => {
    const text = prompt.trim();
    if (!text || sending || pending || loading || historyError) return;
    const controller = new AbortController();
    sendController.current = controller;
    setSending(true);
    setSendError(null);
    try {
      const job = await createAiJob({ environment, prompt: text, ...(conversationId ? { conversationId } : {}) }, controller.signal);
      if (!active.current || controller.signal.aborted) return;
      setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
      setConversationId(job.conversationId);
      setPrompt("");
    } catch (error) {
      if (!controller.signal.aborted) setSendError(errorMessage(error));
    } finally {
      if (active.current && !controller.signal.aborted) setSending(false);
    }
  }, [prompt, sending, pending, loading, historyError, environment, conversationId]);

  return (
    <PageShell title="AI 운영 도우미" subtitle="DB와 서버 로그를 조사하고, 확인한 근거와 함께 답변합니다." action={<span className={styles.environment} data-environment={environment}>{environment === "prod" ? "Prod · 운영 서버" : "Dev · 테스트 서버"}</span>}>
      <div className={styles.layout}>
        <aside className={styles.history} aria-label="대화 이력">
          <h2>대화 이력</h2>
          <button type="button" style={{ ...btnSecondary, width: "100%" }} disabled={sending} onClick={() => { setConversationId(null); setPrompt(""); setSendError(null); }}>새 대화</button>
          <p className={styles.muted}>현재 계정과 선택한 서버의 대화만 표시합니다.</p>
          {loading && <p className={styles.muted} role="status">대화를 불러오는 중이에요.</p>}
          {historyError && <div className={styles.error} role="alert">{historyError}<button type="button" onClick={() => setRetry((value) => value + 1)}>다시 불러오기</button></div>}
          {!loading && !historyError && conversations.length === 0 && <p className={styles.muted}>아직 대화가 없습니다.</p>}
          <div className={styles.historyList}>
            {conversations.map((conversation) => <button type="button" key={conversation.id} className={styles.historyItem} aria-current={conversation.id === conversationId} disabled={sending} onClick={() => { setConversationId(conversation.id); setSendError(null); }}>
              <span className={styles.historyTitle}>{conversation.first.prompt}</span>
              <span className={styles.muted}>{dateLabel(conversation.latest.createdAt)} · {conversation.pending ? "조사 중" : statusLabels[conversation.latest.status]}</span>
            </button>)}
          </div>
        </aside>
        <section className={styles.chat} aria-label="AI 질문과 답변">
          <div className={styles.chatHeader}><AdminIcon name="comment_accent" size={18} /><strong>ZIGG AI</strong><span className={styles.muted}>조회 전용 · 서버 변경은 수행하지 않습니다.</span></div>
          <div className={styles.messages} aria-live="polite" aria-busy={pending || sending}>
            {turns.length === 0 && <div className={styles.empty}>
              <h2>어떤 내용을 확인할까요?</h2>
              <p className={styles.muted}>조사할 시간 범위, 유저 ID, 오류 메시지를 함께 입력하면 더 정확하게 확인할 수 있어요.</p>
              <div className={styles.examples}>{examples.map((example) => <button type="button" key={example} className={styles.example} onClick={() => setPrompt(example)} disabled={sending}>{example}</button>)}</div>
            </div>}
            {turns.map((job) => <article key={job.id} className={styles.turn}>
              <div className={styles.question}>{job.prompt}</div>
              {job.messages.map((message, index) => <div className={styles.answer} key={`${job.id}-${index}`}><div className={styles.answerLabel}>ZIGG AI · {dateLabel(message.createdAt)}</div><div className={styles.answerText}>{message.text}</div></div>)}
              {isAiJobPending(job) && <p className={styles.status} role="status">{statusLabels[job.status]} · 결과를 기다리고 있어요. 페이지를 나가도 이력에서 확인할 수 있습니다.</p>}
              {job.status === "failed" && <div className={styles.error} role="alert">{job.error || "조사를 완료하지 못했습니다. 질문을 다시 전송해 주세요."}</div>}
              <span className={styles.muted}>작업 {job.id.slice(0, 8)} · {dateLabel(job.createdAt)}</span>
            </article>)}
            {pollError && <div className={styles.error} role="alert">결과를 갱신하지 못했습니다. {pollError} 자동으로 다시 확인합니다.<button type="button" onClick={() => setRetry((value) => value + 1)}>지금 확인</button></div>}
            <div ref={messagesEnd} />
          </div>
          <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void send(); }}>
            {sendError && <div className={styles.error} role="alert">{sendError}<br />접수 여부가 불확실하면 대화 이력을 다시 불러온 후 재전송해 주세요.<button type="button" onClick={() => setRetry((value) => value + 1)}>이력 확인</button></div>}
            <label htmlFor="ai-prompt" className={styles.muted}>운영 질문</label>
            <textarea id="ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={6000} placeholder="예: 최근 1시간 결제 실패 로그를 확인하고 원인을 알려줘" disabled={sending} />
            <div className={styles.composerFooter}><span className={styles.muted}>조사 대상: {environment === "prod" ? "Prod" : "Dev"} · 민감한 정보는 필요한 범위만 입력해 주세요.</span><button type="submit" style={btnPrimary} disabled={!prompt.trim() || sending || pending || loading || !!historyError}>{sending ? "질문 접수 중" : pending ? "조사 진행 중" : "질문하기"}</button></div>
          </form>
        </section>
      </div>
    </PageShell>
  );
}

export default function AiAssistantPage() {
  const ready = useAdminAuthGuard();
  const [environment, setEnvironment] = useState<ApiMode | null>(null);
  useEffect(() => {
    const sync = () => setEnvironment(getApiMode());
    sync();
    window.addEventListener("api-mode-change", sync);
    return () => window.removeEventListener("api-mode-change", sync);
  }, []);
  if (!ready || !environment) return null;
  return <AdminShell><Assistant key={environment} environment={environment} /></AdminShell>;
}
