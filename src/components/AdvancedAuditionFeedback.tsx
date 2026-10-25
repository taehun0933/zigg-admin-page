"use client";

import { useEffect, useRef, useState } from "react";
import type { AuditionFeedback, AuditionProfileType, FeedbackPin } from "@/types/audition";
import { deleteAdvancedFeedback, getAuditionFeedbacks, saveAdvancedFeedback, submitAdvancedFeedback } from "@/apis/feedback";
import { AdminFeedbackItem, getAdminFeedbackItems, FeedbackItemCategory } from "@/apis/asset";
import apiClient from "@/utils/apiClient";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { feedbackSecondsToMs, storedVideoDurationMs, validateFeedbackPins } from "@/utils/advancedFeedback";
import AdminIcon from "@/components/admin/AdminIcon";
import FeedbackRatingRadar from "@/components/FeedbackRatingRadar";

const box: React.CSSProperties = { border: "1px solid var(--admin-border)", borderRadius: 12, padding: 14, display: "grid", gap: 12, marginBottom: 14 };
const input: React.CSSProperties = { width: "100%", padding: 10, border: "1px solid var(--admin-border)", borderRadius: 8, background: "var(--admin-bg)", color: "var(--admin-ink)", font: "inherit" };
const row: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const button: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--admin-border)", color: "var(--admin-ink)", background: "var(--admin-blue-tint)", cursor: "pointer" };
const timeLabel = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, "0")}`;
const categoryOf = (position: string): FeedbackItemCategory | null => ({ vocal: "VOCAL", 보컬: "VOCAL", dance: "DANCE", 댄스: "DANCE", rap: "RAP", 랩: "RAP" } as Record<string, FeedbackItemCategory>)[position.trim().toLowerCase()] ?? null;

export default function AdvancedAuditionFeedback({ applicant, finalized, onChange }: { applicant: AuditionProfileType; finalized: boolean; onChange?: (id: number, hasFeedback: boolean) => void }) {
  const [feedbacks, setFeedbacks] = useState<AuditionFeedback[]>([]);
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<AuditionFeedback | null>(null);
  const [text, setText] = useState("");
  const [scores, setScores] = useState<Record<number, number>>({});
  const [pins, setPins] = useState<FeedbackPin[]>([]);
  const videos = applicant.videos ?? [];
  const [videoId, setVideoId] = useState<number>(videos.find(v => v.videoId != null)?.videoId ?? 0);
  const [seconds, setSeconds] = useState("0");
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const editingTimestamp = useRef(false);
  const alive = useRef(true);
  const selectedVideo = videos.find(v => v.videoId === videoId);
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
  const reset = () => { setEditing(null); setText(""); setScores({}); setPins([]); setMessage(""); };
  const syncPlaybackTime = (video: HTMLVideoElement) => {
    if (!editingTimestamp.current) setSeconds(String(Math.floor(video.currentTime)));
  };
  const seek = (id: number, ms: number) => {
    if (id !== videoId) { pendingSeek.current = ms / 1000; setVideoId(id); }
    else if (videoRef.current?.readyState) videoRef.current.currentTime = ms / 1000;
    else pendingSeek.current = ms / 1000;
    videoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setSeconds(String(Math.floor(ms / 1000)));
  };
  const mutate = async (work: () => Promise<void>) => {
    if (busy || loading) return;
    setBusy(true); setError(null); setNotice(null);
    try { await work(); } catch (e: unknown) { if (alive.current) { setError(typeof e === "object" && e !== null && "message" in e ? String(e.message) : "저장하지 못했어요. 최신 목록을 다시 불러온 후 시도해 주세요.");
      try { const latest = await getAuditionFeedbacks(applicant.auditionId, applicant.id); if (alive.current) { setFeedbacks(latest); setNotice("최신 목록을 다시 불러왔어요. 작성 중인 내용은 유지됩니다. 버전 충돌이면 수정 취소 후 최신 카드를 다시 수정해 주세요."); } } catch { /* 최초 오류를 유지 */ }
    } }
    finally { if (alive.current) setBusy(false); }
  };
  const own = (f: AuditionFeedback) => userId !== null && f.reviewer?.userId === userId && !f.publishedAt && Number.isSafeInteger(f.version);
  const save = () => mutate(async () => {
    const validation = validateFeedbackPins(pins, videos);
    if (validation) throw new Error(validation);
    const rated = Object.keys(scores).length;
    if (rated > 0 && items.some(item => !scores[item.feedbackItemId])) throw new Error("시작한 항목 평가를 모두 완료해 주세요.");
    const saved = await saveAdvancedFeedback(applicant.auditionId, applicant.id, { textReview: text.trim(), itemScores: Object.entries(scores).map(([id,score]) => ({ feedbackItemId: Number(id), score })), pins: pins.map(({ videoId, positionMs, message }) => ({ videoId, positionMs, message: message.trim() })), ...(editing ? { version: editing.version } : {}) }, editing?.id);
    if (!alive.current) return;
    replace(saved); reset(); setNotice("비공개 초안을 저장했어요. 아래 카드에서 '작성 완료'를 눌러 제출해 주세요.");
  });

  return <div data-feedback-composer style={{ fontSize: 13 }}>
    <p style={{ color: "var(--admin-ink-2)" }}>고급 피드백 {feedbacks.length}건 · 종합평, 항목 평가와 영상 시점별 피드백을 작성합니다. 초안 저장 후 작성 완료를 눌러 주세요.</p>
    {loading ? <p role="status">피드백 불러오는 중…</p> : <>
      <fieldset disabled={busy || !ready || userId === null} style={{ ...box, minWidth: 0 }}>
        <legend>{editing ? "고급 피드백 초안 수정" : "고급 피드백 작성"}</legend>
        <label>종합평<textarea aria-label="고급 피드백 종합평" style={{ ...input, minHeight: 110 }} value={text} onChange={e => setText(e.target.value)} /></label>
        {items.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16, alignItems: "start", minWidth: 0 }}><div style={{ display: "grid", gap: 8 }}><b>항목 평가 (선택)</b>{items.map(item => <label key={item.feedbackItemId} style={row}>{item.name}<select aria-label={`${item.name} 점수`} style={{ ...input, width: "auto" }} value={scores[item.feedbackItemId] ?? ""} onChange={e => setScores(s => { const next = { ...s }; if (e.target.value) next[item.feedbackItemId] = Number(e.target.value); else delete next[item.feedbackItemId]; return next; })}><option value="">미평가</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}점</option>)}</select></label>)}</div>
        <FeedbackRatingRadar expectedCount={items.length} scores={items.map(item => ({ feedbackItemId: item.feedbackItemId, name: item.name, score: scores[item.feedbackItemId] ?? null }))} /></div>}
        <div style={row}><b>영상 피드백 ({pins.length}개)</b><span style={{ fontSize: 11, fontWeight: 400, color: "var(--admin-ink-3)" }}>(최대 100개)</span></div>
        {videos.length === 0 ? <p>등록된 영상이 없어 고급 피드백을 제출할 수 없어요.</p> : <>
          <label>영상 선택<select style={input} value={videoId} onChange={e => { pendingSeek.current = null; setVideoId(Number(e.target.value)); setSeconds("0"); }}>{videos.map((v,i) => <option key={v.videoId ?? i} disabled={v.videoId == null} value={v.videoId ?? ""}>영상 {i+1} · {v.videoDuration}{v.videoId == null ? " (영상 ID 없음)" : ""}</option>)}</select></label>
          {selectedVideo && <video key={videoId} ref={videoRef} src={selectedVideo.videoUrl} controls preload="metadata" style={{ width: "100%", maxHeight: 320, borderRadius: 8 }} onLoadedMetadata={e => { if (pendingSeek.current !== null) { e.currentTarget.currentTime = pendingSeek.current; pendingSeek.current = null; } syncPlaybackTime(e.currentTarget); }} onTimeUpdate={e => syncPlaybackTime(e.currentTarget)} onSeeked={e => syncPlaybackTime(e.currentTarget)} onPause={e => syncPlaybackTime(e.currentTarget)} />}
          <div style={row}><label>시점 (초)<input aria-label="영상 피드백 시점 (초)" type="number" min="0" step="1" value={seconds} onFocus={() => { editingTimestamp.current = true; }} onBlur={() => { editingTimestamp.current = false; const ms = feedbackSecondsToMs(seconds); if (ms !== null) setSeconds(String(Math.floor(ms / 1000))); }} onChange={e => setSeconds(e.target.value)} style={{ ...input, width: 120, marginLeft: 8 }} /></label><button type="button" style={button} onClick={() => setSeconds(String(Math.floor(videoRef.current?.currentTime ?? 0)))}>현재 재생 시점</button><button type="button" style={button} onClick={() => { const ms = feedbackSecondsToMs(seconds); if (ms !== null && ms >= 0 && selectedVideo && ms < (storedVideoDurationMs(selectedVideo.videoDuration) ?? 0)) seek(videoId, ms); else setError("영상 길이 안의 시점을 입력해 주세요."); }}>해당 시점 이동</button></div>
          <label>시점별 피드백<textarea style={input} rows={3} maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} /></label>
          <button type="button" style={button} disabled={pins.length >= 100} onClick={() => { const pin = { videoId, positionMs: feedbackSecondsToMs(seconds) ?? NaN, message }; const invalid = !seconds.trim() ? "시점을 입력해 주세요." : validateFeedbackPins([...pins, pin], videos); if (invalid) setError(invalid); else { setPins(p => [...p, pin]); setMessage(""); setError(null); } }}>영상 피드백 추가</button>
        </>}
        {pins.map((p,i) => <div key={i} style={box}><button type="button" style={button} onClick={() => seek(p.videoId,p.positionMs)}>영상 {videos.findIndex(v => v.videoId === p.videoId)+1} · {timeLabel(p.positionMs)}</button><textarea aria-label={`영상 피드백 ${i+1} 내용`} style={input} value={p.message} maxLength={2000} onChange={e => setPins(list => list.map((pin,index) => index === i ? { ...pin, message: e.target.value } : pin))} /><button type="button" style={button} onClick={() => setPins(list => list.filter((_,index) => index !== i))}><AdminIcon name="trashcan" size={13} /> 삭제</button></div>)}
        <div style={row}><button type="button" style={button} disabled={!text.trim() && pins.length === 0} onClick={save}>{busy ? "저장 중…" : "비공개 초안 저장"}</button>{editing && <button type="button" style={button} onClick={reset}>수정 취소</button>}</div>
        <small>수정하면 작성 완료 상태가 해제됩니다. 다시 작성 완료를 눌러야 공개할 수 있어요.</small>
      </fieldset>
      {feedbacks.length === 0 && <p>저장된 고급 피드백이 없어요.</p>}
      {feedbacks.map(f => <article key={f.id} style={box}>
        <div style={row}><b>{f.reviewer?.userNickname ?? f.reviewer?.userName ?? "관리자"}</b><span>{f.publishedAt ? "공개 완료" : f.submittedAt ? "작성 완료 · 공개 대기" : "비공개 초안"}</span></div>
        <p style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{f.textReview}</p>
        {!!f.itemScores?.length && <FeedbackRatingRadar scores={f.itemScores} />}
        {(f.pins ?? []).map((pin,i) => <div key={pin.id ?? i} style={{ ...box, marginBottom: 0 }}><button type="button" style={button} disabled={!videos.some(v => v.videoId === pin.videoId)} onClick={() => seek(pin.videoId,pin.positionMs)}>영상 {videos.findIndex(v => v.videoId === pin.videoId)+1} · {timeLabel(pin.positionMs)} 이동</button><span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{pin.message}</span></div>)}
        {own(f) && <div style={row}>
          <button type="button" style={button} disabled={busy} onClick={() => { setEditing(f); setText(f.textReview ?? ""); setPins(f.pins ?? []); setScores(Object.fromEntries((f.itemScores ?? []).map(s => [s.feedbackItemId,s.score]))); setNotice("초안을 수정 중입니다. 저장 후 다시 작성 완료를 눌러 주세요."); }}>수정</button>
          <button type="button" style={button} disabled={busy} onClick={() => { if (window.confirm("이 비공개 고급 피드백을 삭제하시겠습니까?")) void mutate(async () => { await deleteAdvancedFeedback(applicant.auditionId, applicant.id,f.id,f.version!); if (!alive.current) return; const next = feedbacks.filter(x => x.id !== f.id); setFeedbacks(next); changeRef.current?.(applicant.id,next.length > 0); if (editing?.id === f.id) reset(); setNotice("초안을 삭제했어요."); }); }}>삭제</button>
          {!f.submittedAt && <button type="button" style={button} disabled={busy || editing?.id === f.id || !f.textReview?.trim() || !(f.pins?.length) || !!validateFeedbackPins(f.pins ?? [], videos)} onClick={() => { if (window.confirm(finalized ? "작성 완료 후 지원자에게 즉시 공개되고 알림이 발송됩니다. 제출하시겠습니까?" : "작성 완료로 제출하시겠습니까? 오디션 피드백 마무리 시 공개됩니다.")) void mutate(async () => { const saved = await submitAdvancedFeedback(applicant.auditionId,applicant.id,f.id,f.version!); if (alive.current) { replace(saved); setNotice(saved.publishedAt ? "지원자에게 공개했어요." : "작성 완료했어요. 오디션 마무리 시 공개됩니다."); } }); }}>작성 완료{finalized ? " · 공개" : ""}</button>}
        </div>}
      </article>)}
    </>}
    {error && <p role="alert" style={{ color: "var(--admin-warn)" }}>{error} <button type="button" style={button} disabled={busy} onClick={() => window.location.reload()}>새로고침</button></p>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
