"use client";

import { useEffect, useRef, useState } from "react";
import type { AuditionFeedback, AuditionProfileType, FeedbackPin } from "@/types/audition";
import { deleteAdvancedFeedback, getAuditionFeedbacks, saveAdvancedFeedback, submitAdvancedFeedback } from "@/apis/feedback";
import { AdminFeedbackItem, getAdminFeedbackItems, FeedbackItemCategory } from "@/apis/asset";
import apiClient from "@/utils/apiClient";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { chronologicalFeedbackPins, newestFeedbackPins, feedbackTimestampToMs, formatFeedbackTimestamp, storedVideoDurationMs, validateFeedbackPins } from "@/utils/advancedFeedback";
import AdminIcon from "@/components/admin/AdminIcon";
import FeedbackRatingRadar from "@/components/FeedbackRatingRadar";
import styles from "./AdvancedAuditionFeedback.module.css";
import { advancedFeedbackContentMatches, completeAdvancedFeedback, FeedbackSaveOutcomeUnknownError } from "@/utils/completeAdvancedFeedback";

const box: React.CSSProperties = { border: "1px solid var(--admin-border)", borderRadius: 12, padding: 14, display: "grid", gap: 12, marginBottom: 14 };
const input: React.CSSProperties = { width: "100%", padding: 10, border: "1px solid var(--admin-border)", borderRadius: 8, background: "var(--admin-bg)", color: "var(--admin-ink)", font: "inherit" };
const row: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const button: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--admin-border)", color: "var(--admin-ink)", background: "var(--admin-blue-tint)", cursor: "pointer" };
const timeLabel = formatFeedbackTimestamp;
const categoryOf = (position: string): FeedbackItemCategory | null => ({ vocal: "VOCAL", 보컬: "VOCAL", dance: "DANCE", 댄스: "DANCE", rap: "RAP", 랩: "RAP" } as Record<string, FeedbackItemCategory>)[position.trim().toLowerCase()] ?? null;

export default function AdvancedAuditionFeedback({ applicant, finalized, onChange }: { applicant: AuditionProfileType; finalized: boolean; onChange?: (id: number, hasFeedback: boolean) => void }) {
  const [feedbacks, setFeedbacks] = useState<AuditionFeedback[]>([]);
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState<boolean | "uncertain-create">(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<(AuditionFeedback & { submissionPending?: boolean }) | null>(null);
  const [text, setText] = useState("");
  const [scores, setScores] = useState<Record<number, number>>({});
  const [pins, setPins] = useState<FeedbackPin[]>([]);
  const videos = applicant.videos ?? [];
  const [videoId, setVideoId] = useState<number>(videos.find(v => v.videoId != null)?.videoId ?? 0);
  const [timestamp, setTimestamp] = useState("0:00");
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const editingTimestamp = useRef(false);
  const alive = useRef(true);
  const selectedVideo = videos.find(v => v.videoId === videoId);
  const selectedPins = newestFeedbackPins(pins, videoId);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    const category = categoryOf(applicant.desiredPosition ?? "");
    void Promise.all([
      getAuditionFeedbacks(applicant.auditionId, applicant.id).then(list => { if (!cancelled) { setFeedbacks(list); changeRef.current?.(applicant.id, list.length > 0); } }),
      apiClient.get<{ id: number }>("/users/me", { baseURL: getApiBaseUrl().replace(/\/admin\/v0\/?$/, "/api/v1") }).then(res => { if (!cancelled) setUserId(res.data.id); }),
    ]).then(() => { if (!cancelled) setReady(true); }).catch(e => { if (!cancelled) setError(e?.message ?? "피드백을 불러오지 못했어요."); }).finally(() => { if (!cancelled) setLoading(false); });
    if (category) void getAdminFeedbackItems(category).then(list => { if (!cancelled) setItems([...list].sort((a,b) => a.displayOrder - b.displayOrder)); }).catch(() => { if (!cancelled) setNotice("평가 항목을 불러오지 못했어요. 종합평과 영상 피드백은 작성할 수 있어요."); });
    return () => { cancelled = true; alive.current = false; };
  }, [applicant.id, applicant.auditionId, applicant.desiredPosition]);

  const replace = (feedback: AuditionFeedback) => {
    setFeedbacks(list => { const next = list.some(f => f.id === feedback.id) ? list.map(f => f.id === feedback.id ? feedback : f) : [...list, feedback]; return next; });
    changeRef.current?.(applicant.id, true);
  };
  const reset = () => { if (ready === "uncertain-create") setReady(true); setEditing(null); setText(""); setScores({}); setPins([]); setMessage(""); };
  const syncPlaybackTime = (video: HTMLVideoElement) => {
    if (!editingTimestamp.current) setTimestamp(timeLabel(video.currentTime * 1000));
  };
  const seek = (id: number, ms: number) => {
    if (id !== videoId) { pendingSeek.current = ms / 1000; setVideoId(id); }
    else if (videoRef.current?.readyState) videoRef.current.currentTime = ms / 1000;
    else pendingSeek.current = ms / 1000;
    videoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimestamp(timeLabel(ms));
  };
  const mutate = async (work: () => Promise<void>) => {
    if (busy || loading) return;
    setBusy(true); setError(null); setNotice(null);
    try { await work(); } catch (e: unknown) { if (alive.current) { if (e instanceof FeedbackSaveOutcomeUnknownError) setReady("uncertain-create"); const message = typeof e === "object" && e !== null && "message" in e ? String(e.message) : "저장하지 못했어요. 최신 목록을 다시 불러온 후 시도해 주세요."; setError(message.includes("Published advanced feedback cannot be changed") ? "현재 연결된 서버는 공개 피드백의 수정·삭제를 아직 지원하지 않아요. 서버 업데이트가 필요합니다. 작성 중인 내용은 유지됩니다." : message);
      try { const latest = await getAuditionFeedbacks(applicant.auditionId, applicant.id); if (alive.current) { setFeedbacks(latest); setNotice("최신 목록을 다시 불러왔어요. 작성 중인 내용은 유지됩니다. 버전 충돌이면 수정 취소 후 최신 카드를 다시 수정해 주세요."); } } catch { /* 최초 오류를 유지 */ }
    } }
    finally { if (alive.current) setBusy(false); }
  };
  const own = (f: AuditionFeedback) => userId !== null && f.reviewer?.userId === userId && Number.isSafeInteger(f.version);
  const completionIssue = ready === "uncertain-create" ? "저장 결과 확인이 필요해요. 아래 목록에서 저장된 카드를 확인해 주세요." : !text.trim() ? "종합평을 입력해 주세요."
    : pins.length === 0 ? "영상 피드백을 한 개 이상 추가해 주세요."
    : validateFeedbackPins(pins, videos)
      ?? (Object.keys(scores).length > 0 && items.some(item => !scores[item.feedbackItemId]) ? "시작한 항목 평가를 모두 완료해 주세요." : null);
  const complete = () => mutate(async () => {
    if (completionIssue) throw new Error(completionIssue);
    const submitted = await completeAdvancedFeedback({
      existing: editing ?? undefined,
      pendingSubmission: editing?.submissionPending,
      createBlocked: ready === "uncertain-create",
      hasUnsavedChanges: saved => !advancedFeedbackContentMatches({ textReview: text, itemScores: Object.entries(scores).map(([id, score]) => ({ feedbackItemId: Number(id), score })), pins }, saved),
      save: current => saveAdvancedFeedback(applicant.auditionId, applicant.id, { textReview: text.trim(), itemScores: Object.entries(scores).map(([id, score]) => ({ feedbackItemId: Number(id), score })), pins: newestFeedbackPins(pins).reverse().map(({ pin: { videoId, positionMs, message } }) => ({ videoId, positionMs, message: message.trim() })), ...(current ? { version: current.version } : {}) }, current?.id),
      submit: saved => {
        if (!Number.isSafeInteger(saved.version)) throw new Error("피드백 버전을 확인하지 못했어요.");
        return submitAdvancedFeedback(applicant.auditionId, applicant.id, saved.id, saved.version!);
      },
      recover: async id => (await getAuditionFeedbacks(applicant.auditionId, applicant.id)).find(feedback => feedback.id === id),
      onSaved: saved => { if (alive.current) { replace(saved); setEditing({ ...saved, submissionPending: true }); } },
    });
    if (!alive.current) return;
    replace(submitted); reset(); setNotice(editing?.publishedAt ? "피드백을 수정했어요. 공개된 내용에 바로 반영됩니다." : submitted.publishedAt ? "작성 완료했어요. 지원자에게 공개하고 알림을 보냈어요." : "작성 완료했어요. 오디션 피드백 마무리 시 지원자에게 공개됩니다.");
  });

  return <div data-feedback-composer style={{ fontSize: 13 }}>
    <p style={{ color: "var(--admin-ink-2)" }}>고급 피드백 {feedbacks.length}건 · 종합평, 항목 평가와 영상 시점별 피드백을 작성합니다. 작성 완료를 누르면 저장과 제출이 함께 진행됩니다.</p>
    {loading ? <p role="status">피드백 불러오는 중…</p> : <>
      <fieldset disabled={busy || !ready || userId === null} style={{ ...box, minWidth: 0 }}>
        <legend>{editing ? "고급 피드백 수정" : "고급 피드백 작성"}</legend>
        <label>종합평<textarea aria-label="고급 피드백 종합평" style={{ ...input, minHeight: 110 }} value={text} onChange={e => setText(e.target.value)} /></label>
        {items.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16, alignItems: "start", minWidth: 0 }}><div style={{ display: "grid", gap: 8 }}><b>항목 평가 (선택)</b>{items.map(item => <div key={item.feedbackItemId} style={{ display: "grid", gap: 6 }}>
          <span>{item.name}</span>
          <div role="group" aria-label={`${item.name} 점수`} style={{ ...row, gap: 4 }}>
            {[1, 2, 3, 4, 5].map(score => <button key={score} type="button" aria-label={`${item.name} ${score}점`} aria-pressed={scores[item.feedbackItemId] === score} style={{ ...button, minWidth: 34, padding: "8px 10px", borderColor: scores[item.feedbackItemId] === score ? "var(--admin-blue)" : "var(--admin-border)", background: scores[item.feedbackItemId] === score ? "var(--admin-blue-tint)" : "var(--admin-bg)", color: scores[item.feedbackItemId] === score ? "var(--admin-blue)" : "var(--admin-ink)", fontWeight: scores[item.feedbackItemId] === score ? 700 : 400 }} onClick={() => setScores(current => ({ ...current, [item.feedbackItemId]: score }))}>{score}</button>)}
            <button type="button" aria-label={`${item.name} 미평가`} aria-pressed={!scores[item.feedbackItemId]} style={{ ...button, padding: "8px", background: "transparent", color: "var(--admin-ink-3)" }} onClick={() => setScores(current => { const next = { ...current }; delete next[item.feedbackItemId]; return next; })}>미평가</button>
          </div>
        </div>)}</div>
        <FeedbackRatingRadar expectedCount={items.length} scores={items.map(item => ({ feedbackItemId: item.feedbackItemId, name: item.name, score: scores[item.feedbackItemId] ?? null }))} /></div>}
        <div style={row}><b>영상 피드백 ({pins.length}개)</b><span style={{ fontSize: 11, fontWeight: 400, color: "var(--admin-ink-3)" }}>(최대 100개)</span></div>
        {videos.length === 0 ? <p>등록된 영상이 없어 고급 피드백을 제출할 수 없어요.</p> : <>
          <label>영상 선택<select style={input} value={videoId} onChange={e => { pendingSeek.current = null; setVideoId(Number(e.target.value)); setTimestamp("0:00"); }}>{videos.map((v,i) => <option key={v.videoId ?? i} disabled={v.videoId == null} value={v.videoId ?? ""}>영상 {i+1} · {v.videoDuration}{v.videoId == null ? " (영상 ID 없음)" : ""}</option>)}</select></label>
          <div className={styles.workspaceContainer}>
            <div className={styles.workspace}>
              <div className={styles.videoPane}>
                {selectedVideo && <video key={videoId} ref={videoRef} src={selectedVideo.videoUrl} controls preload="metadata" className={styles.video} onLoadedMetadata={e => { if (pendingSeek.current !== null) { e.currentTarget.currentTime = pendingSeek.current; pendingSeek.current = null; } syncPlaybackTime(e.currentTarget); }} onTimeUpdate={e => syncPlaybackTime(e.currentTarget)} onSeeked={e => syncPlaybackTime(e.currentTarget)} onPause={e => syncPlaybackTime(e.currentTarget)} />}
              </div>
              <section className={styles.timelinePane} aria-label="선택 영상 피드백 타임라인">
                <div className={styles.timelineHeading}><b>타임라인 · {selectedPins.length}개</b><span>최신 등록순</span></div>
                <div data-feedback-timeline className={styles.timelineList}>
                  {selectedPins.length === 0 ? <p className={styles.empty}>영상의 시점을 선택하고 피드백을 추가해 주세요.</p> : selectedPins.map(({ pin, index }) => <div key={index} className={styles.timelineEntry}>
                    <button type="button" className={styles.timestamp} aria-label={`${timeLabel(pin.positionMs)} 시점으로 이동`} onClick={() => seek(pin.videoId, pin.positionMs)}>{timeLabel(pin.positionMs)}</button>
                    <textarea aria-label={`영상 피드백 ${index+1} 내용`} className={styles.pinMessage} rows={2} value={pin.message} maxLength={2000} onChange={e => setPins(list => list.map((current, currentIndex) => currentIndex === index ? { ...current, message: e.target.value } : current))} />
                    <button type="button" className={styles.deletePin} aria-label={`${timeLabel(pin.positionMs)} 피드백 삭제`} title="피드백 삭제" onClick={() => setPins(list => list.filter((_, currentIndex) => currentIndex !== index))}><AdminIcon name="trashcan" size={14} /></button>
                  </div>)}
                </div>
                <div className={styles.pinComposer}>
                  <div className={styles.timeControls}>
                    <label>시점<input aria-label="영상 피드백 시점 (분:초)" type="text" inputMode="text" placeholder="0:00" value={timestamp} onFocus={() => { editingTimestamp.current = true; videoRef.current?.pause(); }} onBlur={() => { editingTimestamp.current = false; const ms = feedbackTimestampToMs(timestamp); if (ms !== null) setTimestamp(timeLabel(ms)); }} onChange={e => setTimestamp(e.target.value)} style={{ ...input, width: 74, padding: 7, marginLeft: 6 }} /></label>
                    <button type="button" style={{ ...button, padding: "7px 8px" }} onClick={() => setTimestamp(timeLabel((videoRef.current?.currentTime ?? 0) * 1000))}>현재 시점</button>
                    <button type="button" style={{ ...button, padding: "7px 8px" }} onClick={() => { const ms = feedbackTimestampToMs(timestamp); if (ms !== null && selectedVideo && ms < (storedVideoDurationMs(selectedVideo.videoDuration) ?? 0)) seek(videoId, ms); else setError("영상 길이 안의 시점을 분:초(예: 1:05)로 입력해 주세요."); }}>이동</button>
                  </div>
                  <textarea aria-label="새 영상 피드백 내용" placeholder="이 시점의 피드백을 입력해 주세요." style={{ ...input, resize: "vertical" }} rows={2} maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} />
                  <button type="button" style={button} disabled={pins.length >= 100} onClick={e => { const pin = { videoId, positionMs: feedbackTimestampToMs(timestamp) ?? NaN, message }; const invalid = !timestamp.trim() ? "시점을 입력해 주세요." : validateFeedbackPins([...pins, pin], videos); if (invalid) setError(invalid); else { setPins(current => [...current, pin]); setMessage(""); setError(null); e.currentTarget.closest("section")?.querySelector("[data-feedback-timeline]")?.scrollTo({ top: 0 }); } }}>영상 피드백 추가</button>
                </div>
              </section>
            </div>
          </div>
        </>}
        <div className={styles.draftActions}>
          <div className={styles.draftExplanation}><b>작성 완료를 누르면 저장하고 제출합니다.</b><span>{editing?.publishedAt ? "이미 공개된 피드백입니다. 작성 완료를 누르면 수정한 내용이 지원자에게 바로 반영됩니다." : finalized ? "이 오디션은 피드백이 마무리되어, 작성 완료 즉시 지원자에게 공개되고 알림이 발송됩니다." : "제출한 피드백은 오디션 피드백 마무리 시 지원자에게 공개됩니다."}</span>{completionIssue && <span>{completionIssue}</span>}</div>
          <div style={row}>{(editing || ready === "uncertain-create") && <button type="button" style={button} onClick={() => { if (ready !== "uncertain-create" || window.confirm("저장 결과를 확인했나요? 작성 중인 내용을 비우고 새 작성을 시작합니다.")) reset(); }}>{editing ? "수정 취소" : "작성 취소"}</button>}<button type="button" className={styles.registerDraft} disabled={busy || !!completionIssue} onClick={complete}>{busy ? "완료 중…" : "작성 완료"}</button></div>
        </div>
      </fieldset>
      {feedbacks.length === 0 && <p>저장된 고급 피드백이 없어요.</p>}
      {feedbacks.map(f => <article key={f.id} style={box}>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <div style={row}><b>{f.reviewer?.userNickname ?? f.reviewer?.userName ?? "관리자"}</b><span>{f.publishedAt ? "공개 완료" : f.submittedAt ? "작성 완료 · 공개 대기" : "초안"}</span></div>
          {own(f) && <div style={row}>
            <button type="button" aria-label={`피드백 ${f.id} 수정`} style={{ ...button, display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 8px" }} disabled={busy} onClick={event => { setReady(true); setEditing(f); setText(f.textReview ?? ""); setPins(f.pins ?? []); setScores(Object.fromEntries((f.itemScores ?? []).map(score => [score.feedbackItemId, score.score]))); setNotice(f.publishedAt ? "공개된 피드백을 수정 중입니다. 작성 완료를 누르면 변경 내용이 바로 반영됩니다." : "피드백을 수정 중입니다. 작성 완료를 누르면 저장하고 다시 제출합니다."); event.currentTarget.closest("[data-feedback-composer]")?.querySelector("fieldset")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><AdminIcon name="edit" size={13} />수정</button>
            <button type="button" aria-label={`피드백 ${f.id} 삭제`} style={{ ...button, display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 8px" }} disabled={busy} onClick={() => { if (window.confirm(f.publishedAt ? "공개된 피드백을 삭제하시겠습니까? 삭제하면 지원자가 더 이상 이 피드백을 볼 수 없습니다." : "이 고급 피드백을 삭제하시겠습니까?")) void mutate(async () => { await deleteAdvancedFeedback(applicant.auditionId, applicant.id, f.id, f.version!); if (!alive.current) return; const next = feedbacks.filter(feedback => feedback.id !== f.id); setFeedbacks(next); changeRef.current?.(applicant.id, next.length > 0); if (editing?.id === f.id) reset(); setNotice("피드백을 삭제했어요."); }); }}><AdminIcon name="trashcan" size={13} />삭제</button>
          </div>}
        </div>
        <p style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{f.textReview}</p>
        {!!f.itemScores?.length && <FeedbackRatingRadar scores={f.itemScores} />}
        {!!f.pins?.length && <div className={styles.savedTimeline}>{chronologicalFeedbackPins(f.pins).map(({ pin, index }) => <div key={pin.id ?? index} className={styles.savedEntry}><button type="button" className={styles.timestamp} disabled={!videos.some(v => v.videoId === pin.videoId)} onClick={() => seek(pin.videoId,pin.positionMs)}>영상 {videos.findIndex(v => v.videoId === pin.videoId)+1}<br />{timeLabel(pin.positionMs)}</button><span className={styles.savedMessage}>{pin.message}</span></div>)}</div>}
        {own(f) && !f.submittedAt && !f.publishedAt && <div style={row}>
          <small style={{ flexBasis: "100%", color: "var(--admin-ink-2)" }}>{finalized ? "작성 완료 즉시 지원자에게 공개되고 알림이 발송됩니다." : "작성 완료 후 오디션 피드백 마무리 시 지원자에게 공개됩니다."}</small>
          <button type="button" className={styles.registerDraft} disabled={busy || editing?.id === f.id || !f.textReview?.trim() || !(f.pins?.length) || !!validateFeedbackPins(f.pins ?? [], videos)} onClick={() => { void mutate(async () => { const saved = await submitAdvancedFeedback(applicant.auditionId,applicant.id,f.id,f.version!); if (alive.current) { replace(saved); setNotice(saved.publishedAt ? "지원자에게 공개했어요." : "작성 완료했어요. 오디션 마무리 시 공개됩니다."); } }); }}>작성 완료</button>
        </div>}
      </article>)}
    </>}
    {error && <p role="alert" style={{ color: "var(--admin-warn)" }}>{error} <button type="button" style={button} disabled={busy} onClick={() => window.location.reload()}>새로고침</button></p>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
